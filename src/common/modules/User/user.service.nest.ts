import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as userService from './user.service';

@Injectable()
export class UserService {
  async sendDeleteAccountCode(req: Request, res: Response) {
    return userService.sendDeleteAccountCode(req, res);
  }

  async deleteAccount(req: Request, res: Response) {
    return userService.deleteAccount(req, res);
  }

  async changePassword(req: Request, res: Response) {
    return userService.changePassword(req, res);
  }

  async getProfile(req: Request, res: Response, next: any) {
    return userService.getProfile(req, res, next);
  }

  async updateAuthUser(req: Request, res: Response) {
    return userService.updateAuthUser(req, res);
  }
}
