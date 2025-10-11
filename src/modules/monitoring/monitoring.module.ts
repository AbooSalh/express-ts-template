import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import {
  HealthCheck,
  HealthCheckSchema,
  DiskUsage,
  DiskUsageSchema,
  BackupLog,
  BackupLogSchema,
  Alert,
  AlertSchema,
} from './monitoring.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HealthCheck.name, schema: HealthCheckSchema },
      { name: DiskUsage.name, schema: DiskUsageSchema },
      { name: BackupLog.name, schema: BackupLogSchema },
      { name: Alert.name, schema: AlertSchema },
    ]),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
