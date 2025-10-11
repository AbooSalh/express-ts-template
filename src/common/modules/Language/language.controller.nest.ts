import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard, Roles } from '@/common/guards/auth.guard';
import LanguageC from './controller';

@Controller('languages')
export class LanguageController {
  @Get()
  async getAll(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      LanguageC.getAll(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles('admin')
  async create(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      LanguageC.create(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      LanguageC.update(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async delete(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      LanguageC.delete(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }
}
