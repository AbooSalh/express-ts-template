import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventLogService } from './event-log.service';
import { EventLogController } from './event-log.controller';
import { EventLog, EventLogSchema } from './event-log.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: EventLog.name, schema: EventLogSchema }])],
  controllers: [EventLogController],
  providers: [EventLogService],
  exports: [EventLogService],
})
export class EventLogModule {}
