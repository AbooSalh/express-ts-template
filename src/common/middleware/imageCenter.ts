/* eslint-disable @typescript-eslint/no-explicit-any */
import multer from "multer";
import sharp from "sharp";
import expressAsyncHandler from "express-async-handler";
import type { Request, Response, NextFunction } from "express";
import ApiError from "@/common/utils/api/ApiError";
import env from "@/common/config/env.config";

/**
 * Sanitize a folder path provided by clients to avoid path traversal
 * and enforce a predictable folder structure. Allows only A-Z, a-z,
 * 0-9, underscore, dash and forward slashes. Removes leading/trailing
 * slashes and collapses duplicate slashes. Throws on any ".." segment.
 */
function sanitizeFolder(input: unknown): string {
  // Only allow string or number, otherwise reject
  if (typeof input !== "string" && typeof input !== "number") {
    throw new ApiError("Invalid folder path", "BAD_REQUEST");
  }
  const asString = String(input);
  // Normalize slashes and remove any characters not in the whitelist
  const cleaned = asString.replace(/\\+/g, "/").replace(/[^a-zA-Z0-9/_-]/g, "");
  // Collapse duplicate slashes and trim leading/trailing slashes
  const normalized = cleaned.replace(/\/+/g, "/").replace(/(^\/+|\/+$)/g, "");
  if (normalized.includes("..")) {
    throw new ApiError("Invalid folder path", "BAD_REQUEST");
  }
  return normalized;
}

type Fit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface VariantConfig {
  name: string; // e.g., thumb, medium, large
  width?: number; // target width
  height?: number; // target height
  fit?: Fit; // cover, contain, inside, outside, fill
  format?: "jpeg" | "png" | "webp";
  quality?: number; // 1-100
}

export interface ImageCenterOptions {
  basePath?: string; // relative under public/uploads
  fieldName?: string; // multipart field name
  maxCount?: number;
  variants?: VariantConfig[];
}

const defaultVariants: VariantConfig[] = [
  {
    name: "original",
    format: "jpeg",
    quality: 90, // Reduced from 95
  },
  {
    name: "thumb",
    width: 300,
    height: 300,
    fit: "cover",
    format: "jpeg",
    quality: 75, // Reduced from 80
  },
  {
    name: "large",
    width: 1200, // Reduced from 1600
    height: 1200,
    fit: "inside",
    format: "jpeg",
    quality: 80, // Reduced from 85
  },
  // Removed medium and webp variants to speed up upload
];

export const createImageCenter = (options: ImageCenterOptions = {}) => {
  const basePath = options.basePath ?? "images";
  const fieldName = options.fieldName ?? "files";
  const maxCount = options.maxCount ?? 20;
  const variants = options.variants ?? defaultVariants;

  const storage = multer.memoryStorage();
  const maxSize = Number(env.MAX_FILE_SIZE ?? 10 * 1024 * 1024);
  const whitelist: string[] = (env.ALLOWED_FILE_TYPES ?? "jpg,jpeg,png,webp")
    .split(",")
    .map((t: string) => t.trim().toLowerCase())
    .filter(Boolean);
  const fileFilter = (_req: Request, file: Express.Multer.File, cb: any) => {
    const isImage = file.mimetype.startsWith("image/");
    const name = (file.originalname || "").toLowerCase();
    const extAllowed = whitelist.some(
      (t) => name.endsWith(`.${t}`) || file.mimetype.includes(t)
    );
    if (!isImage || !extAllowed) {
      return cb(new ApiError("Invalid file type", "BAD_REQUEST"), false);
    }
    cb(null, true);
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSize, files: maxCount },
  }).array(fieldName, maxCount);

  const processImages = expressAsyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        throw new ApiError("No files uploaded", "BAD_REQUEST");
      }

      const folder = sanitizeFolder(
        (req.body.folder || req.query.folder || "") as string
      );

      // Process all files in parallel instead of sequentially
      const filePromises = files.map(async (file) => {
        // Probe original metadata
        const meta = await sharp(file.buffer).metadata();

        return {
          originalName: file.originalname,
          buffer: file.buffer, // Keep the buffer for later file creation
          mimeType: file.mimetype,
          sizeBytes: file.size,
          width: meta.width,
          height: meta.height,
          folder: folder || basePath,
          variants: variants, // Pass variant configs for later processing
        };
      });

      // Wait for all metadata processing to complete in parallel
      const processed = await Promise.all(filePromises);

      (req as any).processedImages = processed;
      next();
    }
  );

  return { upload, processImages };
};

export default createImageCenter;
