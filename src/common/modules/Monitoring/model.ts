import mongoose, { Schema, Document } from "mongoose";

export interface IHealthCheck extends Document {
  timestamp: Date;
  status: "healthy" | "warning" | "critical";
  component: string;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface IDiskUsage extends Document {
  timestamp: Date;
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  usagePercentage: number;
  uploadsSize: number;
  status: "normal" | "warning" | "critical";
}

export interface IBackupLog extends Document {
  timestamp: Date;
  type: "uploads" | "database";
  status: "success" | "failed";
  filePath?: string;
  size?: number;
  duration?: number;
  error?: string;
}

export interface IAlert extends Document {
  timestamp: Date;
  level: "info" | "warning" | "critical";
  category: "disk" | "database" | "uploads" | "system" | "security";
  title: string;
  message: string;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

// Health Check Schema
const healthCheckSchema = new Schema<IHealthCheck>({
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["healthy", "warning", "critical"],
    required: true,
  },
  component: { type: String, required: true, index: true },
  responseTime: { type: Number },
  error: { type: String },
  details: { type: Schema.Types.Mixed },
});

// Disk Usage Schema
const diskUsageSchema = new Schema<IDiskUsage>({
  timestamp: { type: Date, default: Date.now },
  totalSpace: { type: Number, required: true }, // in bytes
  usedSpace: { type: Number, required: true }, // in bytes
  freeSpace: { type: Number, required: true }, // in bytes
  usagePercentage: { type: Number, required: true },
  uploadsSize: { type: Number, required: true }, // in bytes
  status: {
    type: String,
    enum: ["normal", "warning", "critical"],
    required: true,
  },
});

// Backup Log Schema
const backupLogSchema = new Schema<IBackupLog>({
  timestamp: { type: Date, default: Date.now },
  type: {
    type: String,
    enum: ["uploads", "database"],
    required: true,
  },
  status: {
    type: String,
    enum: ["success", "failed"],
    required: true,
  },
  filePath: { type: String },
  size: { type: Number }, // in bytes
  duration: { type: Number }, // in milliseconds
  error: { type: String },
});

// Alert Schema
const alertSchema = new Schema<IAlert>({
  timestamp: { type: Date, default: Date.now },
  level: {
    type: String,
    enum: ["info", "warning", "critical"],
    required: true,
  },
  category: {
    type: String,
    enum: ["disk", "database", "uploads", "system", "security"],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  resolved: { type: Boolean, default: false, index: true },
  resolvedAt: { type: Date },
  metadata: { type: Schema.Types.Mixed },
});

// Indexes for performance
healthCheckSchema.index({ component: 1, timestamp: -1 });
healthCheckSchema.index({ status: 1, timestamp: -1 });
diskUsageSchema.index({ timestamp: -1 });
diskUsageSchema.index({ status: 1, timestamp: -1 });
backupLogSchema.index({ type: 1, timestamp: -1 });
backupLogSchema.index({ status: 1, timestamp: -1 });
alertSchema.index({ category: 1, level: 1, timestamp: -1 });
alertSchema.index({ resolved: 1, timestamp: -1 });

// TTL indexes for automatic cleanup
healthCheckSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
); // 7 days
diskUsageSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
); // 30 days
backupLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
); // 90 days
alertSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year

export const HealthCheck = mongoose.model<IHealthCheck>(
  "HealthCheck",
  healthCheckSchema
);
export const DiskUsage = mongoose.model<IDiskUsage>(
  "DiskUsage",
  diskUsageSchema
);
export const BackupLog = mongoose.model<IBackupLog>(
  "BackupLog",
  backupLogSchema
);
export const Alert = mongoose.model<IAlert>("Alert", alertSchema);
