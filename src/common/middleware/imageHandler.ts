/* eslint-disable @typescript-eslint/no-explicit-any */
import multer from "multer";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import expressAsyncHandler from "express-async-handler";
import type { Request, Response, NextFunction } from "express";
import ApiError from "@/common/utils/api/ApiError";

interface FieldConfig {
  name: string;
  maxCount?: number;
  resize?: { width: number; height: number };
}

export const imageUploader = (savePath: string, fields: FieldConfig[]) => {
  const storage = multer.memoryStorage();

  const fileFilter = (_req: Request, file: Express.Multer.File, cb: any) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(
        new ApiError("Only image files are allowed", "BAD_REQUEST"),
        false
      );
    }
    cb(null, true);
  };

  const upload = multer({ storage, fileFilter }).fields(
    fields.map((f) => ({ name: f.name, maxCount: f.maxCount || 1 }))
  );

const processImages = expressAsyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;

      if (!files) {
        return next(new ApiError("No files uploaded", "BAD_REQUEST"));
      }

      const outputDir = path.join("public", "uploads", savePath);
      fs.mkdirSync(outputDir, { recursive: true });

      for (const field of fields) {
        const fileArray = files[field.name];
        if (!fileArray || fileArray.length === 0) continue;

        const resize = field.resize || { width: 600, height: 600 };
        const urls: string[] = [];

        for (const file of fileArray) {
          const fileName = `${uuidv4()}.jpeg`;
          const outputPath = path.join(outputDir, fileName);

          await sharp(file.buffer)
            .resize(resize.width, resize.height)
            .toFormat("jpeg")
            .jpeg({ quality: 90 })
            .toFile(outputPath);

          urls.push(`/uploads/${savePath}/${fileName}`);
        }

        // Store result in req.body[fieldName]
        req.body[field.name] = urls.length === 1 ? urls[0] : urls;
      }

      next();
    } catch (error) {
      next(error); // Pass the error to the global error handler
    }
  }
);

  return { upload, processImages };
};

export default imageUploader;
