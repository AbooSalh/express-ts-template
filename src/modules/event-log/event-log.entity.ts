import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'eventlogs', timestamps: { createdAt: true, updatedAt: false } })
export class EventLog extends Document {
  @Prop({ required: true, index: true })
  refModel: string; // e.g., "Tour", "User", "Product"

  @Prop({ required: true, index: true })
  refId: string; // The actual document ID

  @Prop({ required: true, index: true })
  type: string; // e.g., "view", "click", "like"

  @Prop({ required: true })
  ip: string;

  @Prop()
  country?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  userId?: string;

  @Prop({ default: 1 })
  viewCount: number; // Number of views from this IP/user

  @Prop({ default: () => new Date() })
  lastViewedAt: Date; // Last time this IP/user viewed

  createdAt: Date;
}

export const EventLogSchema = SchemaFactory.createForClass(EventLog);

// Compound index for faster queries
EventLogSchema.index({ refModel: 1, refId: 1, type: 1 });
