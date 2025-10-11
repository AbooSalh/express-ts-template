import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface ImageVariant {
  name: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  sizeBytes?: number;
}

export interface ImageReference {
  model: string;
  field: string;
  docId: string;
  addedAt: Date;
}

@Schema({ collection: 'images', timestamps: true })
export class Image extends Document {
  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  sizeBytes: number;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop({ index: true })
  folder?: string;

  @Prop({ type: Array, default: [] })
  variants: ImageVariant[];

  @Prop()
  createdBy?: string;

  @Prop({ type: Array, default: [] })
  references: ImageReference[];

  @Prop()
  alt?: string;

  @Prop()
  title?: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const ImageSchema = SchemaFactory.createForClass(Image);

// Compound index for faster queries
ImageSchema.index({ folder: 1, createdAt: 1 });
