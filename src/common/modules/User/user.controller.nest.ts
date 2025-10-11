import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { UserService } from './user.service.nest';
import { AuthGuard, Roles } from '@/common/guards/auth.guard';
import UserModel from './model';
import BaseController from '@/common/controllers/handlers/index';

const baseUserController = new BaseController({
  model: UserModel,
  hiddenFields: {
    public: ['password', 'email', 'wishlist'],
    user: ['password'],
    admin: [],
  },
});

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getAll(@Req() req: Request, @Res() res: Response) {
    // Use the base controller's getAll method
    return new Promise((resolve, reject) => {
      baseUserController.getAll(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Req() req: Request, @Res() res: Response) {
    const result = await this.userService.getProfile(req, res, () => {});
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      data: result,
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getOne(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      baseUserController.getOne(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles('admin')
  async create(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      baseUserController.create(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Post('send-delete-account-code')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendDeleteAccountCode(@Req() req: Request, @Res() res: Response) {
    const result = await this.userService.sendDeleteAccountCode(req, res);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      data: result,
    };
  }

  @Delete('delete-account')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Req() req: Request, @Res() res: Response) {
    const result = await this.userService.deleteAccount(req, res);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      data: result,
    };
  }

  @Patch('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: Request, @Res() res: Response) {
    const result = await this.userService.changePassword(req, res);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      data: result,
    };
  }

  @Put('update')
  @UseGuards(AuthGuard)
  async updateAuthUser(@Req() req: Request, @Res() res: Response) {
    const result = await this.userService.updateAuthUser(req, res);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      data: result,
    };
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      baseUserController.update(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async delete(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      baseUserController.delete(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }
}
