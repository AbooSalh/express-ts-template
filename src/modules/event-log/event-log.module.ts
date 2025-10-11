import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLogService } from './event-log.service';
import { EventLogController } from './event-log.controller';
import { EventLog } from './event-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventLog])],
  controllers: [EventLogController],
  providers: [EventLogService],
  exports: [EventLogService],
})
export class EventLogModule {}
