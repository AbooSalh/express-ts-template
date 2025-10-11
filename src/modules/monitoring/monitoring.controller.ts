import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  @Public()
  @SkipThrottle()
  async health() {
    return this.monitoringService.getHealth();
  }

  @Get('stats')
  @Roles('admin')
  async getStats() {
    return this.monitoringService.getStats();
  }

  @Get('health-checks')
  @Roles('admin')
  async getHealthChecks(@Query('limit') limit?: string) {
    return this.monitoringService.getHealthChecks(
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('disk-usage')
  @Roles('admin')
  async getDiskUsage() {
    return this.monitoringService.getDiskUsage();
  }

  @Get('backups')
  @Roles('admin')
  async getBackups() {
    return this.monitoringService.getBackups();
  }

  @Post('backups')
  @Roles('admin')
  async createBackup() {
    return this.monitoringService.createBackup();
  }

  @Get('alerts')
  @Roles('admin')
  async getAlerts(@Query('resolved') resolved?: string) {
    const isResolved = resolved === 'true' ? true : resolved === 'false' ? false : undefined;
    return this.monitoringService.getAlerts(isResolved);
  }

  @Put('alerts/:id/resolve')
  @Roles('admin')
  async resolveAlert(@Param('id') id: string) {
    return this.monitoringService.resolveAlert(id);
  }

  @Get('system')
  @Roles('admin')
  async getSystemInfo() {
    return this.monitoringService.getSystemInfo();
  }

  @Post('reports/daily')
  @Roles('admin')
  async triggerDailyReport() {
    return this.monitoringService.triggerDailyReport();
  }
}
