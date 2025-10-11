import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import * as authServiceExpress from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendEmailVerificationDto,
  RefreshTokenDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  async register(dto: RegisterDto, req: Request) {
    // Create a mock request object for the Express service
    const mockReq = { ...req, body: dto } as Request;
    return authServiceExpress.register(mockReq);
  }

  async login(dto: LoginDto, req: Request) {
    const mockReq = { ...req, body: dto } as Request;
    return authServiceExpress.login(mockReq);
  }

  async forgotPassword(dto: ForgotPasswordDto, req: Request) {
    const mockReq = { ...req, body: dto } as Request;
    return authServiceExpress.forgotPassword(mockReq);
  }

  async verifyResetCode(dto: VerifyResetCodeDto, req: Request) {
    const mockReq = { ...req, body: dto } as Request;
    return authServiceExpress.verifyResetCode(mockReq);
  }

  async resetPassword(dto: ResetPasswordDto, req: Request) {
    const mockReq = { ...req, body: dto } as Request;
    return authServiceExpress.resetPassword(mockReq);
  }

  async verifyEmail(dto: VerifyEmailDto, req: Request) {
    const mockReq = { ...req, body: dto } as Request;
    return authServiceExpress.verifyEmail(mockReq);
  }

  async resendEmailVerificationCode(dto: ResendEmailVerificationDto, req: Request) {
    const mockReq = { ...req, body: dto } as Request;
    return authServiceExpress.resendEmailVerificationCode(mockReq);
  }

  async resendPasswordResetCode(dto: { email: string }, req: Request) {
    const mockReq = { ...req, body: dto } as Request;
    return authServiceExpress.resendPasswordResetCode(mockReq);
  }

  async refreshToken(dto: RefreshTokenDto, req: Request) {
    const mockReq = { ...req, body: dto } as Request;
    return authServiceExpress.refreshToken(mockReq);
  }

  async logout(req: Request) {
    return authServiceExpress.logout(req);
  }

  async getUserSessions(req: Request) {
    return authServiceExpress.getUserSessions(req);
  }

  async revokeSession(sessionId: string, req: Request) {
    const mockReq = { ...req, params: { sessionId } } as any;
    return authServiceExpress.revokeSession(mockReq);
  }
}
