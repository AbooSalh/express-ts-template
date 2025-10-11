import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { HealthCheck, DiskUsage, BackupLog, Alert } from './monitoring.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthCheck, DiskUsage, BackupLog, Alert]),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
