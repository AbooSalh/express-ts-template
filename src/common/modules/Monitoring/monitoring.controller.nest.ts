import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard, Roles } from '@/common/guards/auth.guard';
import monitoringController from './controller';

@Controller('monitoring')
export class MonitoringController {
  @Get('health')
  async health(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      monitoringController.health(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('stats')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getStats(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      monitoringController.getStats(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('health-checks')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getHealthChecks(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      monitoringController.getHealthChecks(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('disk-usage')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getDiskUsage(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      monitoringController.getDiskUsage(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('backups')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getBackups(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      monitoringController.getBackups(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Post('backups')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async createBackup(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      monitoringController.createBackup(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('alerts')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getAlerts(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      monitoringController.getAlerts(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Put('alerts/:id/resolve')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async resolveAlert(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      monitoringController.resolveAlert(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('system')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getSystemInfo(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      monitoringController.getSystemInfo(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Post('reports/daily')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async triggerDailyReport(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      monitoringController.triggerDailyReport(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }
}
