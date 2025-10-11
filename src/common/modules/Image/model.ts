import { Schema, model } from "mongoose";
import { languageField } from "@/common/schemas/translationFields";
import {
  IImage,
  IImageLocalized,
  IImageVariant,
  IImageResponse,
} from "./types";
import env from "@/common/config/env.config";

// Re-export types for convenience
export type { IImage, IImageLocalized, IImageVariant, IImageResponse };

const imageVariantSchema = new Schema<IImageVariant>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    width: { type: Number },
    height: { type: Number },
    format: { type: String },
    sizeBytes: { type: Number },
  },
  { _id: false }
);

// Transform function to add full URLs to variants
const transformImageResponse = function (doc: any, ret: any) {
  const baseUrl = env.BASE_URL || "http://localhost:5050";

  if (ret.variants && Array.isArray(ret.variants)) {
    ret.variants = ret.variants.map((variant: any) => ({
      ...variant,
      fullUrl: `${baseUrl}${variant.url}`,
    }));
  }

  return ret;
};

const imageSchema = new Schema<IImage>(
  {
    // Non-localized fields at root
    originalName: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    folder: { type: String, trim: true },
    variants: { type: [imageVariantSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    references: {
      type: [
        new Schema(
          {
            model: { type: String, required: true, trim: true },
            field: { type: String, required: true, trim: true },
            docId: { type: Schema.Types.ObjectId, required: true },
            addedAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { transform: transformImageResponse },
    toObject: { transform: transformImageResponse },
  }
);

// Useful indexes for filtering/searching
imageSchema.index({ folder: 1, createdAt: -1 });
imageSchema.index({ "references.model": 1, "references.docId": 1 });

// Text indexes for content searching (non-localized fields only)
imageSchema.index({
  originalName: "text",
  fileName: "text",
});

// Image Localized Schema for translatable content
const imageLocalizedSchema = new Schema<IImageLocalized>(
  {
    image: { type: Schema.Types.ObjectId, ref: "Image", required: true },
    language: languageField,
    alt: { type: String, trim: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  }
);

// Essential indexes for ImageLocalized
imageLocalizedSchema.index({ image: 1, language: 1 }, { unique: true }); // Compound unique index
imageLocalizedSchema.index({ language: 1 }); // Language queries

// Text search index for localized content - disable language processing for multilingual support
imageLocalizedSchema.index(
  { alt: "text", title: "text", description: "text", tags: "text" },
  { 
    default_language: "none",
    language_override: "language",
    textIndexVersion: 3
  }
);

const Image = model<IImage>("Image", imageSchema);
const ImageLocalized = model<IImageLocalized>(
  "ImageLocalized",
  imageLocalizedSchema
);

export { Image, ImageLocalized };
export default Image;
