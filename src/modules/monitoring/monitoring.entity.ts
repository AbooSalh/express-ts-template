import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'healthchecks', timestamps: false })
export class HealthCheck extends Document {
  @Prop({ default: () => new Date(), index: true })
  timestamp: Date;

  @Prop({ required: true, enum: ['healthy', 'warning', 'critical'] })
  status: 'healthy' | 'warning' | 'critical';

  @Prop({ required: true, index: true })
  component: string;

  @Prop()
  responseTime?: number;

  @Prop()
  error?: string;

  @Prop({ type: Object })
  details?: Record<string, any>;
}

export const HealthCheckSchema = SchemaFactory.createForClass(HealthCheck);
HealthCheckSchema.index({ component: 1, timestamp: 1 });

@Schema({ collection: 'diskusages', timestamps: false })
export class DiskUsage extends Document {
  @Prop({ default: () => new Date() })
  timestamp: Date;

  @Prop({ required: true })
  totalSpace: number;

  @Prop({ required: true })
  usedSpace: number;

  @Prop({ required: true })
  freeSpace: number;

  @Prop({ required: true })
  usagePercentage: number;

  @Prop({ required: true })
  uploadsSize: number;

  @Prop({ required: true, enum: ['normal', 'warning', 'critical'] })
  status: 'normal' | 'warning' | 'critical';
}

export const DiskUsageSchema = SchemaFactory.createForClass(DiskUsage);

@Schema({ collection: 'backuplogs', timestamps: false })
export class BackupLog extends Document {
  @Prop({ default: () => new Date() })
  timestamp: Date;

  @Prop({ required: true, enum: ['uploads', 'database'] })
  type: 'uploads' | 'database';

  @Prop({ required: true, enum: ['success', 'failed'] })
  status: 'success' | 'failed';

  @Prop()
  filePath?: string;

  @Prop()
  size?: number;

  @Prop()
  duration?: number;

  @Prop()
  error?: string;
}

export const BackupLogSchema = SchemaFactory.createForClass(BackupLog);

@Schema({ collection: 'alerts', timestamps: false })
export class Alert extends Document {
  @Prop({ default: () => new Date(), index: true })
  timestamp: Date;

  @Prop({ required: true, enum: ['info', 'warning', 'critical'] })
  level: 'info' | 'warning' | 'critical';

  @Prop({ required: true, enum: ['disk', 'database', 'uploads', 'system', 'security'] })
  category: 'disk' | 'database' | 'uploads' | 'system' | 'security';

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false, index: true })
  resolved: boolean;

  @Prop()
  resolvedAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
AlertSchema.index({ timestamp: 1, resolved: 1 });
