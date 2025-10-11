import { Module } from '@nestjs/common';
import { EventLogController } from './eventlog.controller.nest';

@Module({
  controllers: [EventLogController],
})
export class EventLogModule {}
