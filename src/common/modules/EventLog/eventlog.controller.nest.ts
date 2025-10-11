import { Controller, Get, Req, Res, UseGuards, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard, Roles } from '@/common/guards/auth.guard';
import EventLogC from './controller';

@Controller('events')
export class EventLogController {
  @Get()
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getAll(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      EventLogC.getAll.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('analytics')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getAnalytics(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      EventLogC.getAnalytics.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }
}
