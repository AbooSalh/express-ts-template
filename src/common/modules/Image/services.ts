import fs, { promises as fsPromises } from "fs";
import path from "path";
import sharp from "sharp";
import { Types } from "mongoose";
import Image from "./model";
import env from "@/common/config/env.config";

// Helper function to ensure directory exists
async function ensureDirectoryExists(dirPath: string) {
  try {
    await fsPromises.access(dirPath);
  } catch {
    await fsPromises.mkdir(dirPath, { recursive: true });
  }
}

// Helper function to create image directory based on folder structure
function createImageDirectory(
  folder: string | undefined,
  imageId: string
): string {
  if (folder && folder !== "uploads") {
    const cleanFolder = folder.replace(/^\/+/, "");
    return path.join(env.UPLOADS_PATH, cleanFolder, imageId);
  }
  return path.join(env.UPLOADS_PATH, "images", imageId);
}

// Helper function to generate URL for image variant
function generateVariantUrl(
  folder: string | undefined,
  imageId: string,
  fileName: string
): string {
  if (folder && folder !== "uploads") {
    const cleanFolder = folder.replace(/^\/+/, "");
    return `/uploads/${cleanFolder}/${imageId}/${fileName}`;
  }
  return `/uploads/images/${imageId}/${fileName}`;
}

// Helper function to process a single variant file
async function processVariant(
  variant: any,
  meta: any,
  imageDir: string,
  imageId: string
) {
  const originalFilePath = path.join(
    env.UPLOADS_PATH,
    variant.url.replace(/^\/+/, "")
  );
  const fileExt = path.extname(meta.originalName) || ".jpg";
  const newFileName = `${variant.name}${fileExt}`;
  const newFilePath = path.join(imageDir, newFileName);
  const newUrl = generateVariantUrl(meta.folder, imageId, newFileName);

  try {
    if (fs.existsSync(originalFilePath)) {
      await fsPromises.copyFile(originalFilePath, newFilePath);
      await fsPromises.unlink(originalFilePath);
    } else {
      console.warn(`Original file not found: ${originalFilePath}`);
    }

    return {
      ...variant,
      url: newUrl,
    };
  } catch (error) {
    console.error(`Error organizing file for variant ${variant.name}:`, error);
    return variant;
  }
}

// Helper function to organize images by ID with variants
async function organizeImagesByIdStructure(metaList: any[]) {
  const organizedImages = [];

  for (const meta of metaList) {
    const tempImageDoc = new Image({
      originalName: meta.originalName,
      fileName: meta.originalName, // Temporary value, will be set to the ObjectId after save
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      width: meta.width,
      height: meta.height,
      folder: meta.folder,
      variants: [],
    });

    const savedImageDoc = await tempImageDoc.save();
    const imageId = savedImageDoc._id.toString();
    const imageDir = createImageDirectory(meta.folder, imageId);

    await ensureDirectoryExists(imageDir);

    const updatedVariants = [];
    for (const variant of meta.variants || []) {
      const processedVariant = await processVariant(
        variant,
        meta,
        imageDir,
        imageId
      );
      updatedVariants.push(processedVariant);
    }

    savedImageDoc.variants = updatedVariants;
    await savedImageDoc.save();
    organizedImages.push(savedImageDoc);
  }

  return organizedImages;
}

// Helper function to create organized image structure from uploaded files
export async function createOrganizedImageStructure(
  uploadedFilePath: string,
  originalName: string,
  mimeType: string,
  sizeBytes: number,
  width?: number,
  height?: number,
  customFolder?: string // Custom folder path like "/home/landing"
) {
  // Create a new image document to get the ID
  const tempImageDoc = new Image({
    originalName,
    fileName: path.basename(originalName, path.extname(originalName)),
    mimeType,
    sizeBytes,
    width,
    height,
    folder: customFolder || "uploads",
    variants: [],
  });

  // Save to get the actual MongoDB ObjectId
  const savedImageDoc = await tempImageDoc.save();
  const imageId = savedImageDoc._id.toString();

  // Create the image directory structure based on custom folder
  // If customFolder is "/home/landing", final path will be "uploads/home/landing/imageId"
  let imageDir: string;
  if (customFolder) {
    // Remove leading slash if present and join with uploads path
    const cleanFolder = customFolder.replace(/^\/+/, "");
    imageDir = path.join(env.UPLOADS_PATH, cleanFolder, imageId);
  } else {
    // Default structure: uploads/images/imageId
    imageDir = path.join(env.UPLOADS_PATH, "images", imageId);
  }

  await ensureDirectoryExists(imageDir);

  // Get file extension
  const fileExt = path.extname(originalName) || ".jpg";

  // Define standard variants
  const variantDefinitions = [
    { name: "original", width: width, height: height },
    {
      name: "large",
      width: width ? Math.floor(width * 0.8) : 1200,
      height: height ? Math.floor(height * 0.8) : 800,
    },
    {
      name: "medium",
      width: width ? Math.floor(width * 0.5) : 600,
      height: height ? Math.floor(height * 0.5) : 400,
    },
    { name: "thumb", width: 300, height: 200 },
  ];

  // Create variants
  const variants = [];
  for (const variantDef of variantDefinitions) {
    const variantFileName = `${variantDef.name}${fileExt}`;
    const variantFilePath = path.join(imageDir, variantFileName);

    // Generate URL based on custom folder structure
    let variantUrl: string;
    if (customFolder) {
      const cleanFolder = customFolder.replace(/^\/+/, "");
      variantUrl = `/uploads/${cleanFolder}/${imageId}/${variantFileName}`;
    } else {
      variantUrl = `/uploads/images/${imageId}/${variantFileName}`;
    }

    try {
      // Copy the original file to create the variant
      // In a production environment, you'd use image processing library like Sharp here
      await fsPromises.copyFile(uploadedFilePath, variantFilePath);

      variants.push({
        name: variantDef.name,
        url: variantUrl,
        width: variantDef.width,
        height: variantDef.height,
        format: fileExt.substring(1), // Remove the dot
        sizeBytes:
          variantDef.name === "original"
            ? sizeBytes
            : Math.floor(sizeBytes * 0.7), // Estimate
      });
    } catch (error) {
      console.error(`Error creating variant ${variantDef.name}:`, error);
    }
  }

  // Update the document with variants
  savedImageDoc.variants = variants;
  await savedImageDoc.save();

  // Clean up the original uploaded file
  try {
    await fsPromises.unlink(uploadedFilePath);
  } catch (error) {
    console.warn(
      `Could not remove original uploaded file ${uploadedFilePath}:`,
      error
    );
  }

  return savedImageDoc;
}

//          Helper function to determine output directory
function getOutputDirectory(folder: string, imageId: string): string {
  if (folder && folder !== "images") {
    return path.join(env.UPLOADS_PATH, folder, imageId);
  }
  return path.join(env.UPLOADS_PATH, "images", imageId);
}

// Helper function to apply image format settings
function applyImageFormat(
  pipeline: sharp.Sharp,
  format: string,
  quality?: number
): sharp.Sharp {
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({
        quality: quality ?? 85,
        mozjpeg: true,
      });
    case "png":
      return pipeline.png({ quality: quality ?? 85 });
    case "webp":
      return pipeline.webp({ quality: quality ?? 80 });
    case "gif":
      return pipeline.gif();
    case "ico":
      // ICO files should be kept as-is, convert to PNG for variants
      return pipeline.png({ quality: quality ?? 85 });
    default:
      return pipeline;
  }
}

// Helper function to generate public URL
function generatePublicUrl(
  folder: string,
  imageId: string,
  fileName: string
): string {
  if (folder && folder !== "images") {
    return `/uploads/${folder}/${imageId}/${fileName}`;
  }
  return `/uploads/images/${imageId}/${fileName}`;
}

// Helper function to create physical files using the image ID with parallel processing
async function createPhysicalVariants(
  buffer: Buffer,
  imageId: string,
  folder: string,
  originalName: string,
  variants: any[]
) {
  const outputDir = getOutputDirectory(folder, imageId);
  await ensureDirectoryExists(outputDir);

  // Process all variants in parallel instead of sequentially
  const variantPromises = variants.map(async (v) => {
    // Determine target format - preserve original format for certain file types
    const originalExt = path.extname(originalName).toLowerCase();
    let targetFormat = v.format ?? "jpeg";
    
    // For GIF files, preserve format for 'original' variant to maintain animations
    if (originalExt === '.gif' && v.name === 'original') {
      targetFormat = 'gif';
    }
    // For ICO files, preserve format for 'original' variant
    else if (originalExt === '.ico' && v.name === 'original') {
      targetFormat = 'ico';
    }
    
    const fileName = `${v.name}.${
      targetFormat === "jpeg" ? "jpg" : targetFormat
    }`;
    const outputPath = path.join(outputDir, fileName);

    // Check if this is an SVG file - handle differently
    if (originalExt === '.svg') {
      // For SVG files, just copy the original without processing
      await fsPromises.writeFile(outputPath, buffer);
      const stats = await fsPromises.stat(outputPath);
      const publicUrl = generatePublicUrl(folder, imageId, fileName);
      
      return {
        name: v.name,
        url: publicUrl,
        width: v.width || null,
        height: v.height || null,
        format: 'svg',
        sizeBytes: stats.size,
      };
    }

    // For GIF/ICO originals, copy without processing to preserve format
    if ((originalExt === '.gif' || originalExt === '.ico') && v.name === 'original') {
      await fsPromises.writeFile(outputPath, buffer);
      const stats = await fsPromises.stat(outputPath);
      const publicUrl = generatePublicUrl(folder, imageId, fileName);
      
      return {
        name: v.name,
        url: publicUrl,
        width: v.width || null,
        height: v.height || null,
        format: targetFormat,
        sizeBytes: stats.size,
      };
    }

    let pipeline = sharp(buffer).rotate();

    if (v.width || v.height) {
      pipeline = pipeline.resize({
        width: v.width,
        height: v.height,
        fit: v.fit ?? "inside",
      });
    }

    pipeline = applyImageFormat(pipeline, targetFormat, v.quality);
    const info = await pipeline.toFile(outputPath);
    const publicUrl = generatePublicUrl(folder, imageId, fileName);

    return {
      name: v.name,
      url: publicUrl,
      width: info.width,
      height: info.height,
      format: info.format,
      sizeBytes: info.size,
    };
  });

  // Wait for all variants to complete in parallel
  const variantResults = await Promise.all(variantPromises);
  return variantResults;
}

// Helper function to process with concurrency limit
async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrencyLimit: number = 5
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrencyLimit) {
    const batch = items.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map(processor);
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

// Utility function to validate variant configuration
export function validateVariants(variants: any[]): boolean {
  if (!Array.isArray(variants)) return false;

  return variants.every((variant) => {
    // Required fields
    if (!variant.name || typeof variant.name !== "string") return false;

    // Optional but validated fields
    if (
      variant.width &&
      (typeof variant.width !== "number" || variant.width <= 0)
    )
      return false;
    if (
      variant.height &&
      (typeof variant.height !== "number" || variant.height <= 0)
    )
      return false;
    if (
      variant.quality &&
      (typeof variant.quality !== "number" ||
        variant.quality < 1 ||
        variant.quality > 100)
    )
      return false;
    if (variant.format && !["jpeg", "png", "webp"].includes(variant.format))
      return false;
    if (
      variant.fit &&
      !["cover", "contain", "fill", "inside", "outside"].includes(variant.fit)
    )
      return false;

    return true;
  });
}

// Utility function to get variants by preset name
export function getVariantsByPreset(presetName: string): any[] {
  return (
    VARIANT_PRESETS[presetName as keyof typeof VARIANT_PRESETS] ||
    DEFAULT_VARIANTS
  );
}

// Define default variant configurations
export const DEFAULT_VARIANTS = [
  {
    name: "original",
    format: "jpeg",
    quality: 90,
  },
  {
    name: "thumb",
    width: 300,
    height: 300,
    fit: "cover",
    format: "jpeg",
    quality: 75,
  },
  {
    name: "large",
    width: 1200,
    height: 1200,
    fit: "inside",
    format: "jpeg",
    quality: 80,
  },
];

// Define preset configurations for common use cases
export const VARIANT_PRESETS = {
  fast: [
    {
      name: "thumb",
      width: 300,
      height: 300,
      fit: "cover",
      format: "jpeg",
      quality: 70,
    },
    {
      name: "large",
      width: 800,
      height: 800,
      fit: "inside",
      format: "jpeg",
      quality: 75,
    },
  ],
  balanced: DEFAULT_VARIANTS,
  quality: [
    { name: "original", format: "jpeg", quality: 95 },
    {
      name: "thumb",
      width: 300,
      height: 300,
      fit: "cover",
      format: "jpeg",
      quality: 85,
    },
    {
      name: "medium",
      width: 800,
      height: 800,
      fit: "inside",
      format: "jpeg",
      quality: 90,
    },
    {
      name: "large",
      width: 1600,
      height: 1600,
      fit: "inside",
      format: "jpeg",
      quality: 90,
    },
    {
      name: "webp",
      width: 800,
      height: 800,
      fit: "inside",
      format: "webp",
      quality: 85,
    },
  ],
  minimal: [
    {
      name: "thumb",
      width: 300,
      height: 300,
      fit: "cover",
      format: "jpeg",
      quality: 70,
    },
  ],
};

// Service to optimize existing images by regenerating variants
export async function optimizeExistingImages(
  imageIds: string[],
  newVariants: any[]
): Promise<{ success: string[]; errors: any[] }> {
  const success: string[] = [];
  const errors: any[] = [];

  for (const imageId of imageIds) {
    try {
      const image = await Image.findById(imageId);
      if (!image) {
        errors.push({ imageId, error: "Image not found" });
        continue;
      }

      // Get the original file path
      const originalVariant = image.variants.find((v) => v.name === "original");
      if (!originalVariant) {
        errors.push({ imageId, error: "Original variant not found" });
        continue;
      }

      const originalPath = path.join(
        env.UPLOADS_PATH,
        originalVariant.url.replace(/^\/+/, "")
      );
      if (!fs.existsSync(originalPath)) {
        errors.push({ imageId, error: "Original file not found on disk" });
        continue;
      }

      // Read the original file
      const buffer = await fsPromises.readFile(originalPath);

      // Create new variants
      const newVariantResults = await createPhysicalVariants(
        buffer,
        imageId,
        image.folder || "images",
        image.originalName,
        newVariants
      );

      // Update the image document
      image.variants = newVariantResults;
      await image.save();

      success.push(imageId);
    } catch (error) {
      errors.push({
        imageId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { success, errors };
}

// Service to clean up orphaned files (files that exist on disk but not in database)
export async function cleanupOrphanedFiles(): Promise<{
  deletedFiles: string[];
  errors: string[];
  totalScanned: number;
  totalDeleted: number;
}> {
  const deletedFiles: string[] = [];
  const errors: string[] = [];
  let totalScanned = 0;

  try {
    // Get all image records from database
    const allImages = await Image.find({}, { variants: 1, folder: 1 });
    const dbFilePaths = new Set<string>();

    // Collect all file paths that should exist
    for (const image of allImages) {
      for (const variant of image.variants) {
        if (variant.url) {
          const filePath = path.join(
            env.UPLOADS_PATH,
            variant.url.replace(/^\/+/, "")
          );
          dbFilePaths.add(path.normalize(filePath));
        }
      }
    }

    // Scan uploads directory
    const scanDirectory = async (dirPath: string): Promise<void> => {
      try {
        const items = await fsPromises.readdir(dirPath, {
          withFileTypes: true,
        });

        for (const item of items) {
          const fullPath = path.join(dirPath, item.name);
          totalScanned++;

          if (item.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (item.isFile()) {
            const normalizedPath = path.normalize(fullPath);

            // If file is not in database, mark for deletion
            if (!dbFilePaths.has(normalizedPath)) {
              try {
                await fsPromises.unlink(fullPath);
                deletedFiles.push(fullPath);
              } catch (error) {
                errors.push(`Failed to delete ${fullPath}: ${error}`);
              }
            }
          }
        }
      } catch (error) {
        errors.push(`Failed to scan directory ${dirPath}: ${error}`);
      }
    };

    await scanDirectory(env.UPLOADS_PATH);

    return {
      deletedFiles,
      errors,
      totalScanned,
      totalDeleted: deletedFiles.length,
    };
  } catch (error) {
    errors.push(`Cleanup failed: ${error}`);
    return {
      deletedFiles,
      errors,
      totalScanned,
      totalDeleted: 0,
    };
  }
}

export async function insertImages(
  metaList: any[],
  userId: any,
  customFolder?: string,
  customVariants?: any[] // Add custom variants parameter
) {
  // Process images with concurrency limit of 5 to prevent overwhelming the system
  const createdImages = await processWithConcurrency(
    metaList,
    async (meta) => {
      // Create image document with ObjectId as fileName from the start
      const tempId = new Types.ObjectId();
      const imageDoc = new Image({
        _id: tempId, // Set the ID explicitly
        originalName: meta.originalName,
        fileName: tempId.toString(), // Use the ObjectId as fileName from the start
        mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
        width: meta.width,
        height: meta.height,
        folder: customFolder || meta.folder,
        variants: [], // Will be populated after file creation
        createdBy: userId,
      });

      // Save to get the actual MongoDB ObjectId
      const savedImage = await imageDoc.save();
      const imageId = savedImage._id.toString();

      // No need to update fileName again since it's already set correctly

      // Create physical files using the actual image ID
      if (meta.buffer) {
        try {
          // Use custom variants if provided, otherwise use the variants from meta or default
          const variantsToUse =
            customVariants || meta.variants || DEFAULT_VARIANTS;

          const variantResults = await createPhysicalVariants(
            meta.buffer,
            imageId,
            customFolder || meta.folder,
            meta.originalName,
            variantsToUse
          );

          savedImage.variants = variantResults;
        } catch (error) {
          console.error(
            `Error creating physical files for image ${imageId}:`,
            error
          );
          // If file creation fails, we still keep the database record but without variants
        }
      }

      // Save the final image with variants
      await savedImage.save();
      return savedImage;
    },
    5 // Process max 5 images concurrently
  );

  return createdImages;
}

// New function to create image with custom folder structure for seeder
export async function createImageWithCustomFolder(
  originalName: string,
  mimeType: string,
  sizeBytes: number,
  customFolder: string, // e.g., "home/landing"
  width?: number,
  height?: number,
  localizedData?: Map<string, any>
) {
  // Create a new image document to get the MongoDB ObjectId
  const imageDoc = new Image({
    originalName,
    fileName: originalName, // Temporary value, will be set to ObjectId after save
    mimeType,
    sizeBytes,
    width,
    height,
    folder: customFolder,
    variants: [],
    localized: localizedData,
    supportedLanguages: localizedData
      ? Array.from(localizedData.keys())
      : ["en"],
    defaultLanguage: "en",
  });

  // Save to get the actual MongoDB ObjectId
  const savedImage = await imageDoc.save();
  const imageId = savedImage._id.toString();

  // Update fileName to match the ObjectId
  savedImage.fileName = imageId;

  // Get file extension
  const fileExt = path.extname(originalName) || ".jpg";

  // Define standard variants with URLs pointing to the correct folder structure
  const variants = [
    {
      name: "original",
      url: `/uploads/${customFolder}/${imageId}/original${fileExt}`,
      width: width || 1200,
      height: height || 800,
      format: fileExt.substring(1),
      sizeBytes: sizeBytes,
    },
    {
      name: "large",
      url: `/uploads/${customFolder}/${imageId}/large${fileExt}`,
      width: width ? Math.floor(width * 0.8) : 960,
      height: height ? Math.floor(height * 0.8) : 640,
      format: fileExt.substring(1),
      sizeBytes: Math.floor(sizeBytes * 0.8),
    },
    {
      name: "medium",
      url: `/uploads/${customFolder}/${imageId}/medium${fileExt}`,
      width: width ? Math.floor(width * 0.5) : 600,
      height: height ? Math.floor(height * 0.5) : 400,
      format: fileExt.substring(1),
      sizeBytes: Math.floor(sizeBytes * 0.5),
    },
    {
      name: "thumb",
      url: `/uploads/${customFolder}/${imageId}/thumb${fileExt}`,
      width: 300,
      height: 200,
      format: fileExt.substring(1),
      sizeBytes: Math.floor(sizeBytes * 0.2),
    },
  ];

  // Update the document with variants
  savedImage.variants = variants;
  await savedImage.save();

  return savedImage;
}

export function collectVariantFilePaths(images: any[]): string[] {
  const filesToDelete: string[] = [];

  for (const img of images) {
    // For the new structure, we can delete the entire image directory
    if (img._id) {
      let imageDir: string;

      if (img.folder && img.folder !== "uploads") {
        // Custom folder structure: uploads/folder/imageId
        const cleanFolder = img.folder.replace(/^\/+/, "");
        imageDir = path.join(env.UPLOADS_PATH, cleanFolder, img._id.toString());
      } else {
        // Default structure: uploads/images/imageId
        imageDir = path.join(env.UPLOADS_PATH, "images", img._id.toString());
      }

      filesToDelete.push(imageDir);
    }

    // Also collect individual variant files as fallback
    for (const variant of img.variants || []) {
      if (variant && typeof variant.url === "string") {
        const filePath = path.join(
          env.UPLOADS_PATH,
          variant.url.replace(/^\/+/, "")
        );
        filesToDelete.push(filePath);
      }
    }
  }

  return filesToDelete;
}

export async function deleteFilesWithConcurrency(
  filePaths: string[],
  concurrencyLimit = 10
) {
  const deleteFileOrDirectory = async (filePath: string) => {
    try {
      const stats = await fsPromises.stat(filePath);

      if (stats.isDirectory()) {
        // Remove directory and all its contents
        await fsPromises.rm(filePath, { recursive: true, force: true });
      } else if (stats.isFile()) {
        // Remove individual file
        await fsPromises.unlink(filePath);
      }
    } catch (error: any) {
      // Only log if it's not a "file not found" error
      if (error.code !== 'ENOENT') {
        console.warn(`Could not delete ${filePath}:`, error);
      }
      // Silently ignore ENOENT errors (file already deleted/doesn't exist)
    }
  };

  let idx = 0;
  const runNext = async () => {
    if (idx >= filePaths.length) return;
    const current = idx++;
    await deleteFileOrDirectory(filePaths[current]);
    await runNext();
  };

  const runners = Array.from(
    { length: Math.min(concurrencyLimit, filePaths.length) },
    runNext
  );

  await Promise.allSettled(runners);
}
