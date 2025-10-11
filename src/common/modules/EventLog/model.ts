import { Schema, model, Types } from "mongoose";

export interface IEventLog {
  refModel: string; // e.g., "Tour", "User", "Product"
  refId: Types.ObjectId; // The actual document ID
  type: string; // e.g., "view", "click", "like"
  ip: string;
  country?: string;
  userAgent?: string;
  userId?: Types.ObjectId;
  viewCount?: number; // Number of views from this IP/user
  lastViewedAt?: Date; // Last time this IP/user viewed
  createdAt?: Date;
}

const eventLogSchema = new Schema<IEventLog>(
  {
    refModel: { type: String, required: true }, // Model name as string
    refId: { type: Schema.Types.ObjectId, required: true }, // Document ID
    type: { type: String, required: true },
    ip: { type: String, required: true },
    country: { type: String },
    userAgent: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    viewCount: { type: Number, default: 1 }, // Default to 1 for first view
    lastViewedAt: { type: Date, default: Date.now }, // Default to now
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const EventLog = model<IEventLog>("EventLog", eventLogSchema);
export default EventLog;
