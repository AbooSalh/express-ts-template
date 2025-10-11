/**
 * @fileoverview Image module type definitions
 * @description Type definitions for Image and ImageLocalized models
 * @author Paradise Sharm Tours Development Team
 * @version 1.0.0
 */

import { Types } from "mongoose";

export interface IImageVariant {
  name: string; // e.g., thumb, medium, large, original, webp
  url: string; // public URL starting with /uploads/...
  width?: number;
  height?: number;
  format?: string; // jpeg, png, webp
  sizeBytes?: number;
}

export interface IImage {
  _id: Types.ObjectId;

  // Non-localized fields at root
  originalName: string;
  fileName: string; // base name without directories
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  folder?: string; // optional logical folder chosen by admin
  variants: IImageVariant[];
  createdBy?: Types.ObjectId;
  references?: Array<{
    model: string;
    field: string;
    docId: Types.ObjectId;
    addedAt?: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IImageLocalized {
  _id: Types.ObjectId;
  image: Types.ObjectId;
  language: string;
  alt?: string;
  title?: string;
  description?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Extended interface for API responses with developer-friendly variant access
export interface IImageResponse extends Omit<IImage, "_id" | "createdBy"> {
  _id: string;
  createdBy?: string;
  variantsMap?: Record<string, IImageVariant>; // Map for easy variant access
  activeVariant?: IImageVariant; // Single variant when only one requested
  localizedContent?: IImageLocalized; // Attached localized content for the current language
}
