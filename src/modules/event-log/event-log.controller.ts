import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { EventLogService } from './event-log.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class EventLogController {
  constructor(private readonly eventLogService: EventLogService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.eventLogService.findAll(query);
  }

  @Get('analytics')
  async getAnalytics(@Query() query: any) {
    return this.eventLogService.getAnalytics(query);
  }
}
