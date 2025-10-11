/* eslint-disable @typescript-eslint/no-explicit-any */
import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Image, { ImageLocalized } from "./model";
import BaseController from "@/common/controllers/handlers";
import ApiSuccess from "@/common/utils/api/ApiSuccess";
import ApiError from "@/common/utils/api/ApiError";
import { languageService } from "@/common/controllers/services/languageService";
import { ApiFeatures, IRequestQuery } from "@/common/utils/api/ApiFeatures";
import {
  isForceDelete,
  summarizeReferences,
  unlinkAllReferences,
  removeVariantFiles,
} from "./utils";
import {
  uploadValidator,
  updateValidator,
  getOneValidator,
  deleteValidator,
  listValidator,
  bulkDeleteValidator,
  getLocalizedContentValidator,
  upsertLocalizedContentValidator,
  deleteLocalizedContentValidator,
} from "./validator";
import {
  insertImages,
  collectVariantFilePaths,
  deleteFilesWithConcurrency,
  validateVariants,
  getVariantsByPreset,
} from "./services";

// ============= HELPER FUNCTIONS =============

/**
 * Check if an image exists by ID and throw error if not found
 */
async function ensureImageExists(id: string): Promise<any> {
  const image = await Image.findById(id);
  if (!image) {
    throw new ApiError("Image not found", "NOT_FOUND");
  }
  return image;
}

/**
 * Extract language from request query or headers with fallback
 */
function getRequestedLanguage(queryParams: any, req: Request): string {
  return (
    queryParams.language ||
    queryParams.lang ||
    req.headers["accept-language"]?.split(",")[0]?.split("-")[0] ||
    "en"
  );
}

/**
 * Get localized content with fallback logic
 */
async function getLocalizedContentWithFallback(
  imageId: string,
  requestedLanguage: string
) {
  const availableLanguages = await ImageLocalized.distinct("language", {
    image: imageId,
  });

  // Try requested language first
  let localizedContent = await ImageLocalized.findOne({
    image: imageId,
    language: requestedLanguage,
  });
  let actualLanguage = requestedLanguage;

  // Fallback to English if requested language not found
  if (!localizedContent && requestedLanguage !== "en") {
    localizedContent = await ImageLocalized.findOne({
      image: imageId,
      language: "en",
    });
    if (localizedContent) {
      actualLanguage = "en";
    }
  }

  // Final fallback to first available language
  if (!localizedContent && availableLanguages.length > 0) {
    localizedContent = await ImageLocalized.findOne({
      image: imageId,
      language: availableLanguages[0],
    });
    if (localizedContent) {
      actualLanguage = availableLanguages[0];
    }
  }

  return {
    localizedContent,
    actualLanguage,
    availableLanguages,
  };
}

/**
 * Upsert localized content for an image
 */
async function upsertLocalizedContent(
  imageId: string,
  language: string,
  data: {
    alt?: string;
    title?: string;
    description?: string;
    tags?: string[];
  }
) {
  let localizedContent = await ImageLocalized.findOne({
    image: imageId,
    language,
  });

  if (localizedContent) {
    // Update existing
    return await ImageLocalized.findByIdAndUpdate(
      localizedContent._id,
      { ...data },
      { new: true }
    );
  } else {
    // Create new
    localizedContent = new ImageLocalized({
      image: imageId,
      language,
      ...data,
      tags: data.tags || [],
    });
    return await localizedContent.save();
  }
}

/**
 * Add localized content to multiple images
 */
async function addLocalizedContentToImages(
  images: any[],
  requestedLanguage: string
) {
  const imageIds = images.map((img) => img._id);

  // Get all localized content for these images
  const localizedContents = await ImageLocalized.find({
    image: { $in: imageIds },
  });

  // Create a map for quick lookup
  const localizedMap = new Map();
  localizedContents.forEach((content) => {
    if (!localizedMap.has(content.image.toString())) {
      localizedMap.set(content.image.toString(), []);
    }
    localizedMap.get(content.image.toString()).push(content);
  });

  // Process each image
  return images.map((imageObj) => {
    const imageId = imageObj._id.toString();
    const imageLocalizations = localizedMap.get(imageId) || [];

    // Find best localization using fallback logic
    let bestLocalization = null;
    let actualLanguage = requestedLanguage;

    // Try requested language first
    bestLocalization = imageLocalizations.find(
      (loc: any) => loc.language === requestedLanguage
    );

    // Fallback to English if not found
    if (!bestLocalization && requestedLanguage !== "en") {
      bestLocalization = imageLocalizations.find(
        (loc: any) => loc.language === "en"
      );
      if (bestLocalization) actualLanguage = "en";
    }

    // Final fallback to first available language
    if (!bestLocalization && imageLocalizations.length > 0) {
      bestLocalization = imageLocalizations[0];
      actualLanguage = bestLocalization.language;
    }

    return {
      ...imageObj,
      _language: actualLanguage,
      _availableLanguages: imageLocalizations.map((loc: any) => loc.language),
      localized: bestLocalization?.toObject() ?? null,
    };
  });
}

/**
 * Utility function to process variants for developer-friendly API responses
 *
 * @param imgObj - The image object to process
 * @param variantQuery - Optional comma-separated variant names (e.g., "large" or "large,thumb")
 *
 * @returns Enhanced image object with:
 * - variantsMap: Object map for easy variant access
 * - activeVariant: Single variant object (when only one variant requested)
 * - variants: Filtered variants array (existing behavior)
 *
 * @example
 * // Single variant request (?variant=large)
 * const result = processImageVariants(imgObj, "large");
 * // result.activeVariant = { name: "large", url: "...", fullUrl: "..." }
 * // result.variantsMap = { large: { name: "large", ... } }
 *
 * // Multiple variants (?variant=large,thumb)
 * const result = processImageVariants(imgObj, "large,thumb");
 * // result.variantsMap = { large: {...}, thumb: {...} }
 *
 * // No variant specified
 * const result = processImageVariants(imgObj);
 * // result.variantsMap = { original: {...}, large: {...}, thumb: {...} }
 */
const processImageVariants = (imgObj: any, variantQuery?: string) => {
  // Safety check: ensure variants exists
  if (!imgObj.variants || !Array.isArray(imgObj.variants)) {
    imgObj.variantsMap = {};
    return imgObj;
  }

  if (!variantQuery) {
    // If no specific variant requested, create a variants map for all
    imgObj.variantsMap = imgObj.variants.reduce((map: any, variant: any) => {
      map[variant.name] = variant;
      return map;
    }, {});
    return imgObj;
  }

  const requestedVariants = variantQuery
    .split(",")
    .map((v: string) => v.trim());

  const filteredVariants = imgObj.variants.filter((variant: any) =>
    requestedVariants.includes(variant.name)
  );

  // If only ONE variant requested, make it developer-friendly
  if (requestedVariants.length === 1 && filteredVariants.length === 1) {
    imgObj.activeVariant = filteredVariants[0];
    imgObj.variantsMap = {
      [filteredVariants[0].name]: filteredVariants[0],
    };
  } else if (filteredVariants.length > 0) {
    // Multiple variants requested, create map for all filtered variants
    imgObj.variantsMap = filteredVariants.reduce((map: any, variant: any) => {
      map[variant.name] = variant;
      return map;
    }, {});
  }

  imgObj.variants = filteredVariants;
  return imgObj;
};

// Create BaseController instance for translation management
const imageBaseController = new BaseController({
  model: Image,
  localization: {
    enabled: true,
    model: ImageLocalized,
    foreignKey: "image",
    languageField: "language",
    fallbackLanguage: "en",
    languageParam: "lang",
    languageHeader: "Accept-Language",
  },
  search: {
    // Search base model fields (when no localization needed)
    baseFields: ["originalName", "fileName", "folder"],
    // Search translation fields (for localized content)
    localizedFields: ["alt", "title", "description", "tags"],
    // Fallback for backward compatibility
    fields: ["originalName", "fileName", "alt", "title"],
    allowDynamicFields: true,
    fieldsParam: "searchFields",
    caseSensitive: false,
  },
  validation: {
    enabled: false,
  },
});

const ImageC = {
  upload: {
    validator: uploadValidator,
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { folder, variants, preset } = req.body as {
        folder?: string;
        variants?: string; // JSON string of variant configurations
        preset?: string; // Preset name (fast, balanced, quality, minimal)
      };

      // Parse custom variants if provided, or use preset
      let customVariants = null;
      if (preset) {
        customVariants = getVariantsByPreset(preset);
      } else if (variants) {
        try {
          customVariants = JSON.parse(variants);
          if (!validateVariants(customVariants)) {
            throw new ApiError("Invalid variant configuration", "BAD_REQUEST");
          }
        } catch (parseError) {
          if (parseError instanceof ApiError) {
            throw parseError;
          }
          throw new ApiError("Invalid variants JSON format", "BAD_REQUEST");
        }
      }

      const metaList = (req as any).processedImages as any[];
      if (!metaList || metaList.length === 0) {
        throw new ApiError("No images processed", "BAD_REQUEST");
      }
      try {
        const created = await insertImages(
          metaList,
          (req.user as any)?._id,
          folder, // custom folder parameter
          customVariants // custom variants configuration
        );
        ApiSuccess.send(
          res,
          "CREATED",
          "Images uploaded successfully",
          created
        );
      } catch (error) {
        // Cleanup files if DB insert fails
        const filesToDelete = collectVariantFilePaths(metaList);
        await deleteFilesWithConcurrency(filesToDelete, 10);
        throw error;
      }
    }),
  },

  list: {
    validator: listValidator,
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      // Handle bulk image fetch by comma-separated IDs
      if (req.query._id && typeof req.query._id === "string") {
        const ids = req.query._id
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);

        if (ids.length > 1) {
          // Bulk fetch by IDs
          const query = Image.find({ _id: { $in: ids } });

          // Apply other query features except filtering (since we're handling _id manually)
          const api = new ApiFeatures(query, {
            ...req.query,
            _id: undefined,
          } as any);
          api.sort().limitFields().paginate();

          const documents = await api.mongooseQuery;

          // Get requested language
          const queryParams = req.query as IRequestQuery & {
            language?: string;
          };
          const requestedLanguage = getRequestedLanguage(queryParams, req);

          // Add localized content to images
          const imagesWithLocalized = await addLocalizedContentToImages(
            documents.map((doc: any) => doc.toObject()),
            requestedLanguage
          );

          // Handle variant processing for each document
          const processedDocuments = imagesWithLocalized.map((imgObj: any) => {
            return processImageVariants(imgObj, queryParams.variant);
          });

          return ApiSuccess.send(res, "OK", "Images fetched", {
            documents: processedDocuments,
            pagination: api.pagination,
          });
        }
      }

      // Handle variant filtering specially for MongoDB array queries
      const modifiedQuery = { ...req.query };
      const variantQuery = req.query.variant as string;

      if (variantQuery) {
        // Remove variant from the query params to prevent ApiFeatures from handling it incorrectly
        delete modifiedQuery.variant;
      }

      // Handle variantsMap dependency: if variantsMap is requested in fields, ensure variants is included
      if (modifiedQuery.fields && typeof modifiedQuery.fields === "string") {
        const requestedFields = modifiedQuery.fields
          .split(",")
          .map((f: string) => f.trim());
        if (
          requestedFields.includes("variantsMap") &&
          !requestedFields.includes("variants")
        ) {
          // Add variants as a dependency for variantsMap
          modifiedQuery.fields = [...requestedFields, "variants"].join(",");
        }
      }

      // Regular filtering for single ID or other filters
      const api = new ApiFeatures(Image.find(), modifiedQuery as any);
      api.filter();
      api.sort().limitFields().paginate();
      const { mongooseQuery, pagination } = api;

      // Add variant filtering manually to the MongoDB query if needed
      if (variantQuery) {
        const variantNames = variantQuery.split(",").map((v) => v.trim());
        mongooseQuery.find({
          "variants.name": { $in: variantNames },
        });
      }

      const documents = await mongooseQuery;

      // Get requested language
      const queryParams = req.query as IRequestQuery & { language?: string };
      const requestedLanguage = getRequestedLanguage(queryParams, req);

      // Add localized content to images
      const imagesWithLocalized = await addLocalizedContentToImages(
        documents.map((doc: any) => doc.toObject()),
        requestedLanguage
      );

      // Handle variant processing for each document
      const processedDocuments = imagesWithLocalized.map((imgObj: any) => {
        return processImageVariants(imgObj, variantQuery);
      });

      return ApiSuccess.send(res, "OK", "Images fetched", {
        documents: processedDocuments,
        pagination,
      });
    }),
  },

  listFolders: {
    validator: listValidator,
    handler: expressAsyncHandler(async (_req: Request, res: Response) => {
      // Group images by folder with count and a latest thumbnail
      const grouped = await Image.aggregate([
        { $addFields: { folderSafe: { $ifNull: ["$folder", ""] } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$folderSafe",
            count: { $sum: 1 },
            latest: { $first: "$$ROOT" },
          },
        },
        {
          $project: {
            _id: 0,
            folder: "$_id",
            count: 1,
            latest: {
              _id: "$latest._id",
              originalName: "$latest.originalName",
              variants: "$latest.variants",
              createdAt: "$latest.createdAt",
            },
          },
        },
        { $sort: { folder: 1 } },
      ]);

      ApiSuccess.send(res, "OK", "Folders fetched", grouped);
    }),
  },

  getOne: {
    validator: getOneValidator,
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      let queryParams = req.query as IRequestQuery & { language?: string };

      // Find the base image
      const image = await ensureImageExists(id);

      // Get requested language and localized content with fallback
      const requestedLanguage = getRequestedLanguage(queryParams, req);
      const { localizedContent, actualLanguage, availableLanguages } =
        await getLocalizedContentWithFallback(id, requestedLanguage);

      // Merge base image with localized content in nested structure
      const result = {
        ...image.toObject(),
        _language: actualLanguage,
        _availableLanguages: availableLanguages,
        localized: localizedContent?.toObject() ?? null,
      };

      // Process variants for enhanced response
      const processedImg = processImageVariants(result, queryParams.variant);

      ApiSuccess.send(res, "OK", "Image fetched", processedImg);
    }),
  },

  update: {
    validator: updateValidator,
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { folder } = req.body as {
        folder?: string;
      };

      // Ensure image exists
      const image = await ensureImageExists(id);

      // Update non-localized fields only
      if (folder !== undefined) {
        await Image.findByIdAndUpdate(id, { folder }, { new: true });
      }

      // Fetch the updated image
      const updatedImage = await Image.findById(id);

      ApiSuccess.send(res, "OK", "Image updated", updatedImage);
    }),
  },

  delete: {
    validator: deleteValidator,
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const force = isForceDelete(req.query);
      const img = await ensureImageExists(id);

      const refs = img.references || [];
      if (refs.length > 0 && !force) {
        const summary = summarizeReferences(refs);
        throw new ApiError(
          [{ message: `Image is in use by ${summary.length} reference(s)` }],
          "CONFLICT"
        );
      }

      if (refs.length > 0 && force) {
        await unlinkAllReferences(refs, img._id);
        await Image.updateOne({ _id: img._id }, { $set: { references: [] } });
      }

      removeVariantFiles(img);
      await img.deleteOne();
      ApiSuccess.send(res, "OK", "Image deleted", { id });
    }),
  },

  // Get available variant presets and configuration options
  getVariantPresets: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const presets = {
        fast: "Minimal variants for fastest upload (thumb + large)",
        balanced: "Default configuration (original + thumb + large)",
        quality:
          "High quality with multiple variants (original + thumb + medium + large + webp)",
        minimal: "Only thumbnail variant for ultra-fast upload",
      };

      const customFormat = {
        description: "Custom variant configuration format",
        example: [
          {
            name: "thumb",
            width: 300,
            height: 300,
            fit: "cover", // cover, contain, fill, inside, outside
            format: "jpeg", // jpeg, png, webp
            quality: 75, // 1-100
          },
        ],
      };

      ApiSuccess.send(res, "OK", "Variant presets retrieved", {
        presets,
        customFormat,
      });
    }),
  },

  // Bulk delete images
  bulkDelete: {
    validator: bulkDeleteValidator,
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { ids, force = false } = req.body;

      const images = await Image.find({ _id: { $in: ids } });
      const deletedIds: string[] = [];
      const errors: any[] = [];

      for (const img of images) {
        try {
          const refs = img.references || [];
          if (refs.length > 0 && !force) {
            errors.push({
              id: img._id,
              message: `Image has ${refs.length} reference(s)`,
            });
            continue;
          }

          if (refs.length > 0 && force) {
            await unlinkAllReferences(refs, img._id);
          }

          // Collect and delete files
          const filesToDelete = collectVariantFilePaths([img]);
          await deleteFilesWithConcurrency(filesToDelete);

          await img.deleteOne();
          deletedIds.push(img._id.toString());
        } catch (error) {
          errors.push({
            id: img._id,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      ApiSuccess.send(res, "OK", "Bulk delete completed", {
        deleted: deletedIds,
        errors,
        total: ids.length,
        successful: deletedIds.length,
        failed: errors.length,
      });
    }),
  },

  // Get image statistics
  getStats: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const stats = await Image.aggregate([
        {
          $group: {
            _id: null,
            totalImages: { $sum: 1 },
            totalSize: { $sum: "$sizeBytes" },
            avgSize: { $avg: "$sizeBytes" },
            formats: {
              $addToSet: {
                $arrayElemAt: [{ $split: ["$mimeType", "/"] }, 1],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalImages: 1,
            totalSizeBytes: "$totalSize",
            totalSizeMB: { $round: [{ $divide: ["$totalSize", 1048576] }, 2] },
            avgSizeBytes: { $round: ["$avgSize", 0] },
            avgSizeMB: { $round: [{ $divide: ["$avgSize", 1048576] }, 2] },
            formats: 1,
          },
        },
      ]);

      const folderStats = await Image.aggregate([
        {
          $group: {
            _id: "$folder",
            count: { $sum: 1 },
            totalSize: { $sum: "$sizeBytes" },
          },
        },
        {
          $project: {
            folder: { $ifNull: ["$_id", "uncategorized"] },
            count: 1,
            sizeMB: { $round: [{ $divide: ["$totalSize", 1048576] }, 2] },
            _id: 0,
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      ApiSuccess.send(res, "OK", "Image statistics retrieved", {
        overview: stats[0] || {
          totalImages: 0,
          totalSizeBytes: 0,
          totalSizeMB: 0,
          avgSizeBytes: 0,
          avgSizeMB: 0,
          formats: [],
        },
        byFolder: folderStats,
      });
    }),
  },

  // Get all localized content for an image
  getLocalizedContent: {
    validator: getLocalizedContentValidator,
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;

      // Ensure image exists
      await ensureImageExists(id);

      // Get all localized content for this image
      const localizedContent = await ImageLocalized.find({ image: id });

      ApiSuccess.send(
        res,
        "OK",
        "Localized content retrieved",
        localizedContent
      );
    }),
  },

  // Create or update localized content for a specific language
  upsertLocalizedContent: {
    validator: upsertLocalizedContentValidator,
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { language, alt, title, description, tags } = req.body;

      // Ensure image exists
      await ensureImageExists(id);

      // Upsert localized content
      const localizedContent = await upsertLocalizedContent(id, language, {
        alt,
        title,
        description,
        tags,
      });

      ApiSuccess.send(res, "OK", "Localized content saved", localizedContent);
    }),
  },

  // Delete localized content for a specific language
  deleteLocalizedContent: {
    validator: deleteLocalizedContentValidator,
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { id, language } = req.params;

      // Ensure image exists
      await ensureImageExists(id);

      // Delete localized content
      const deleted = await ImageLocalized.findOneAndDelete({
        image: id,
        language,
      });

      if (!deleted) {
        throw new ApiError("Localized content not found", "NOT_FOUND");
      }

      ApiSuccess.send(res, "OK", "Localized content deleted", deleted);
    }),
  },

  // ============= ENHANCED FOLDER MANAGEMENT =============

  // Create a new folder
  createFolder: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { name, description } = req.body as {
        name: string;
        description?: string;
      };

      if (!name || name.trim() === '') {
        throw new ApiError("Folder name is required", "BAD_REQUEST");
      }

      const folderName = name.trim();

      // Check if folder already exists
      const existingFolder = await Image.findOne({ folder: folderName });
      if (existingFolder) {
        throw new ApiError("Folder already exists", "CONFLICT");
      }

      // Create folder metadata (you can extend this later)
      const folderInfo = {
        name: folderName,
        description: description || '',
        createdAt: new Date(),
        imageCount: 0
      };

      ApiSuccess.send(res, "CREATED", "Folder created successfully", folderInfo);
    }),
  },

  // Rename a folder
  renameFolder: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { oldName } = req.params;
      const { newName } = req.body as { newName: string };

      if (!newName || newName.trim() === '') {
        throw new ApiError("New folder name is required", "BAD_REQUEST");
      }

      const trimmedNewName = newName.trim();

      // Check if new folder name already exists
      const existingFolder = await Image.findOne({ folder: trimmedNewName });
      if (existingFolder && oldName !== trimmedNewName) {
        throw new ApiError("Folder with new name already exists", "CONFLICT");
      }

      // Update all images in the old folder
      const result = await Image.updateMany(
        { folder: oldName },
        { $set: { folder: trimmedNewName } }
      );

      if (result.matchedCount === 0) {
        throw new ApiError("Folder not found", "NOT_FOUND");
      }

      ApiSuccess.send(res, "OK", "Folder renamed successfully", {
        oldName,
        newName: trimmedNewName,
        updatedImages: result.modifiedCount
      });
    }),
  },

  // Delete a folder (move images to uncategorized)
  deleteFolder: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { name } = req.params;
      const { deleteImages = false } = req.query as { deleteImages?: boolean };

      if (deleteImages) {
        // Delete all images in the folder
        const images = await Image.find({ folder: name });
        const deletedIds: string[] = [];
        const errors: any[] = [];

        for (const img of images) {
          try {
            const refs = img.references || [];
            if (refs.length > 0) {
              await unlinkAllReferences(refs, img._id);
            }
            removeVariantFiles(img);
            await img.deleteOne();
            deletedIds.push(img._id.toString());
          } catch (error) {
            errors.push({
              id: img._id,
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        ApiSuccess.send(res, "OK", "Folder and images deleted", {
          folderName: name,
          deletedImages: deletedIds,
          errors,
          total: images.length,
          successful: deletedIds.length,
          failed: errors.length,
        });
      } else {
        // Move images to uncategorized
        const result = await Image.updateMany(
          { folder: name },
          { $unset: { folder: "" } }
        );

        ApiSuccess.send(res, "OK", "Folder deleted, images moved to uncategorized", {
          folderName: name,
          movedImages: result.modifiedCount
        });
      }
    }),
  },

  // Move images to a folder
  moveImagesToFolder: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { imageIds, targetFolder } = req.body as {
        imageIds: string[];
        targetFolder: string | null;
      };

      if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        throw new ApiError("Image IDs are required", "BAD_REQUEST");
      }

      // Update images
      const updateData = targetFolder 
        ? { folder: targetFolder.trim() }
        : { $unset: { folder: "" } };

      const result = await Image.updateMany(
        { _id: { $in: imageIds } },
        updateData
      );

      ApiSuccess.send(res, "OK", "Images moved successfully", {
        targetFolder: targetFolder || "uncategorized",
        movedImages: result.modifiedCount,
        totalRequested: imageIds.length
      });
    }),
  },

  // Get enhanced folder statistics
  getFolderStats: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const stats = await Image.aggregate([
        {
          $group: {
            _id: "$folder",
            count: { $sum: 1 },
            totalSize: { $sum: "$sizeBytes" },
            avgSize: { $avg: "$sizeBytes" },
            latestImage: { $max: "$createdAt" },
            oldestImage: { $min: "$createdAt" },
            formats: { $addToSet: "$mimeType" },
            // Get a sample image for thumbnail
            sampleImage: { $first: "$$ROOT" }
          },
        },
        {
          $project: {
            folder: { $ifNull: ["$_id", "uncategorized"] },
            count: 1,
            totalSizeBytes: "$totalSize",
            totalSizeMB: { $round: [{ $divide: ["$totalSize", 1048576] }, 2] },
            avgSizeBytes: { $round: ["$avgSize", 0] },
            avgSizeMB: { $round: [{ $divide: ["$avgSize", 1048576] }, 2] },
            latestImage: 1,
            oldestImage: 1,
            formats: 1,
            thumbnail: {
              _id: "$sampleImage._id",
              originalName: "$sampleImage.originalName",
              variants: "$sampleImage.variants"
            },
            _id: 0,
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Get overall statistics
      const overallStats = await Image.aggregate([
        {
          $group: {
            _id: null,
            totalFolders: { $addToSet: "$folder" },
            totalImages: { $sum: 1 },
            totalSize: { $sum: "$sizeBytes" },
          }
        },
        {
          $project: {
            totalFolders: { $size: "$totalFolders" },
            totalImages: 1,
            totalSizeMB: { $round: [{ $divide: ["$totalSize", 1048576] }, 2] },
            _id: 0
          }
        }
      ]);

      ApiSuccess.send(res, "OK", "Enhanced folder statistics retrieved", {
        folders: stats,
        overview: overallStats[0] || {
          totalFolders: 0,
          totalImages: 0,
          totalSizeMB: 0
        }
      });
    }),
  },

  // ============= BULK OPERATIONS =============

  // Enhanced bulk delete with better error handling
  bulkDeleteEnhanced: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { imageIds, force = false, deleteFromFolder } = req.body as {
        imageIds: string[];
        force?: boolean;
        deleteFromFolder?: string;
      };

      let images;
      if (deleteFromFolder) {
        // Delete all images from a specific folder
        images = await Image.find({ folder: deleteFromFolder });
      } else {
        // Delete specific images by IDs
        if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
          throw new ApiError("Image IDs are required", "BAD_REQUEST");
        }
        images = await Image.find({ _id: { $in: imageIds } });
      }

      const deletedIds: string[] = [];
      const errors: any[] = [];
      const skipped: any[] = [];

      for (const img of images) {
        try {
          const refs = img.references || [];
          
          if (refs.length > 0 && !force) {
            skipped.push({
              id: img._id,
              name: img.originalName,
              reason: `Has ${refs.length} reference(s)`,
              references: refs.length
            });
            continue;
          }

          if (refs.length > 0 && force) {
            await unlinkAllReferences(refs, img._id);
          }

          // Delete associated translations
          await ImageLocalized.deleteMany({ image: img._id });

          // Delete variant files
          removeVariantFiles(img);

          // Delete the image document
          await img.deleteOne();
          deletedIds.push(img._id.toString());
        } catch (error) {
          errors.push({
            id: img._id,
            name: img.originalName,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      ApiSuccess.send(res, "OK", "Bulk delete completed", {
        deleted: deletedIds,
        skipped,
        errors,
        summary: {
          total: images.length,
          successful: deletedIds.length,
          skipped: skipped.length,
          failed: errors.length,
        }
      });
    }),
  },

  // Bulk move images between folders
  bulkMoveImages: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { imageIds, sourceFolder, targetFolder } = req.body as {
        imageIds?: string[];
        sourceFolder?: string;
        targetFolder: string | null;
      };

      let filter: any = {};
      
      if (imageIds && imageIds.length > 0) {
        filter._id = { $in: imageIds };
      } else if (sourceFolder !== undefined) {
        filter.folder = sourceFolder || { $exists: false };
      } else {
        throw new ApiError("Either imageIds or sourceFolder must be provided", "BAD_REQUEST");
      }

      // Update images
      const updateData = targetFolder 
        ? { folder: targetFolder.trim() }
        : { $unset: { folder: "" } };

      const result = await Image.updateMany(filter, updateData);

      ApiSuccess.send(res, "OK", "Bulk move completed", {
        sourceFolder: sourceFolder || "uncategorized",
        targetFolder: targetFolder || "uncategorized",
        movedImages: result.modifiedCount,
        matchedImages: result.matchedCount
      });
    }),
  },

  // Organize images (auto-categorize based on content analysis)
  organizeImages: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { strategy = "smart", dryRun = false } = req.body as {
        strategy?: "smart" | "date" | "size" | "format";
        dryRun?: boolean;
      };

      const suggestions: any[] = [];
      let moved = 0;

      switch (strategy) {
        case "date":
          // Organize by creation date (year/month)
          const imagesByDate = await Image.find({ 
            $or: [{ folder: { $exists: false } }, { folder: "" }] 
          });
          
          for (const img of imagesByDate) {
            const date = new Date(img.createdAt!);
            const folderName = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            suggestions.push({
              imageId: img._id,
              imageName: img.originalName,
              currentFolder: img.folder || "uncategorized",
              suggestedFolder: folderName,
              reason: "Organized by creation date"
            });

            if (!dryRun) {
              await Image.findByIdAndUpdate(img._id, { folder: folderName });
              moved++;
            }
          }
          break;

        case "format":
          // Organize by file format
          const imagesByFormat = await Image.find({ 
            $or: [{ folder: { $exists: false } }, { folder: "" }] 
          });
          
          for (const img of imagesByFormat) {
            const format = img.mimeType.split('/')[1];
            const folderName = `formats/${format}`;
            
            suggestions.push({
              imageId: img._id,
              imageName: img.originalName,
              currentFolder: img.folder || "uncategorized",
              suggestedFolder: folderName,
              reason: `Organized by format (${format})`
            });

            if (!dryRun) {
              await Image.findByIdAndUpdate(img._id, { folder: folderName });
              moved++;
            }
          }
          break;

        case "size":
          // Organize by file size
          const imagesBySize = await Image.find({ 
            $or: [{ folder: { $exists: false } }, { folder: "" }] 
          });
          
          for (const img of imagesBySize) {
            let folderName;
            const sizeMB = img.sizeBytes / (1024 * 1024);
            
            if (sizeMB < 1) folderName = "sizes/small";
            else if (sizeMB < 5) folderName = "sizes/medium";
            else folderName = "sizes/large";
            
            suggestions.push({
              imageId: img._id,
              imageName: img.originalName,
              currentFolder: img.folder || "uncategorized",
              suggestedFolder: folderName,
              reason: `Organized by size (${sizeMB.toFixed(2)}MB)`
            });

            if (!dryRun) {
              await Image.findByIdAndUpdate(img._id, { folder: folderName });
              moved++;
            }
          }
          break;

        default: // smart
          // Smart organization based on image names and existing patterns
          const uncategorizedImages = await Image.find({ 
            $or: [{ folder: { $exists: false } }, { folder: "" }] 
          });
          
          for (const img of uncategorizedImages) {
            let suggestedFolder = "misc";
            let reason = "Default categorization";
            
            const name = img.originalName.toLowerCase();
            
            // Smart categorization based on filename patterns
            if (name.includes('tour') || name.includes('trip')) {
              suggestedFolder = "tours";
              reason = "Contains tour-related keywords";
            } else if (name.includes('hotel') || name.includes('room')) {
              suggestedFolder = "hotels";
              reason = "Contains hotel-related keywords";
            } else if (name.includes('beach') || name.includes('sea')) {
              suggestedFolder = "beaches";
              reason = "Contains beach-related keywords";
            } else if (name.includes('food') || name.includes('restaurant')) {
              suggestedFolder = "dining";
              reason = "Contains food-related keywords";
            } else if (name.includes('logo') || name.includes('brand')) {
              suggestedFolder = "branding";
              reason = "Contains branding keywords";
            }
            
            suggestions.push({
              imageId: img._id,
              imageName: img.originalName,
              currentFolder: img.folder || "uncategorized",
              suggestedFolder,
              reason
            });

            if (!dryRun) {
              await Image.findByIdAndUpdate(img._id, { folder: suggestedFolder });
              moved++;
            }
          }
          break;
      }

      ApiSuccess.send(res, "OK", dryRun ? "Organization suggestions generated" : "Images organized", {
        strategy,
        dryRun,
        suggestions,
        totalSuggestions: suggestions.length,
        actuallyMoved: moved
      });
    }),
  },

  // Bulk download images as zip
  bulkDownload: {
    validator: [],
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { ids } = req.body as { ids: string[] };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new ApiError("Image IDs are required", "BAD_REQUEST");
      }

      // Get images
      const images = await Image.find({ _id: { $in: ids } });
      
      if (images.length === 0) {
        throw new ApiError("No images found", "NOT_FOUND");
      }

      // Import required modules
      const archiver = require('archiver');
      const fs = require('fs');
      const path = require('path');

      // Set response headers for zip download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="images-${new Date().toISOString().split('T')[0]}.zip"`);

      // Create zip archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.on('error', (err: any) => {
        throw new ApiError(`Archive creation failed: ${err.message}`, "INTERNAL_SERVER_ERROR");
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add images to archive
      for (const image of images) {
        try {
          // Get the original or best available variant
          const originalVariant = image.variants.find((v: any) => v.name === 'original') || image.variants[0];
          
          if (originalVariant) {
            // Build the file path - handle both old and new path structures
            let filePath;
            const basePath = path.resolve(process.env.UPLOADS_PATH || 'public/uploads');
            
            if (originalVariant.url.startsWith('/uploads/')) {
              // New structure: /uploads/images/[id]/original.jpg
              filePath = path.join(basePath, originalVariant.url.replace(/^\/uploads\//, ''));
            } else {
              // Old structure or direct path
              filePath = path.join(basePath, originalVariant.url.replace(/^\/+/, ''));
            }
            
            if (fs.existsSync(filePath)) {
              // Use original filename or create a unique name
              const fileName = image.originalName || `image-${image._id}.${originalVariant.format || 'jpg'}`;
              archive.file(filePath, { name: fileName });
            }
          }
        } catch (error) {
          console.warn(`Failed to add image ${image._id} to archive:`, error);
        }
      }

      // Finalize the archive
      await archive.finalize();
    }),
  },

  // BaseController translation management methods
  getTranslations: imageBaseController.getTranslations,
  createTranslation: imageBaseController.createTranslation,
  updateTranslation: imageBaseController.updateTranslation,
  deleteTranslation: imageBaseController.deleteTranslation,
  upsertTranslation: imageBaseController.upsertTranslation,
};

export default ImageC;
