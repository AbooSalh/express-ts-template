import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller.nest';

@Module({
  controllers: [MonitoringController],
})
export class MonitoringModule {}
