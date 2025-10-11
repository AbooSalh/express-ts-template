import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.nest';
import { AuthGuard, Roles } from '@/common/guards/auth.guard';
import { Throttle } from '@nestjs/throttler';
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

@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60000 } }) // Auth rate limiting: 10 requests per minute
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const result = await this.authService.register(registerDto, req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: 'Confirmation code sent to your email',
      data: result,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(loginDto, req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: 'User logged in successfully',
      data: result,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto, @Req() req: Request) {
    await this.authService.forgotPassword(forgotPasswordDto, req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: 'Reset code has been sent to your email',
    };
  }

  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto, @Req() req: Request) {
    await this.authService.verifyResetCode(verifyResetCodeDto, req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: 'Reset code verified successfully',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto, @Req() req: Request) {
    const result = await this.authService.resetPassword(resetPasswordDto, req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: 'Password reset successfully',
      data: result,
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto, @Req() req: Request) {
    const result = await this.authService.verifyEmail(verifyEmailDto, req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: result.message,
    };
  }

  @Post('resend-email-verification')
  @HttpCode(HttpStatus.OK)
  async resendEmailVerification(
    @Body() resendEmailVerificationDto: ResendEmailVerificationDto,
    @Req() req: Request
  ) {
    const result = await this.authService.resendEmailVerificationCode(
      resendEmailVerificationDto,
      req
    );
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: result.message,
    };
  }

  @Post('resend-password-reset')
  @HttpCode(HttpStatus.OK)
  async resendPasswordReset(@Body() body: { email: string }, @Req() req: Request) {
    const result = await this.authService.resendPasswordResetCode(body, req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: result.message,
    };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    const result = await this.authService.refreshToken(refreshTokenDto, req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: 'Token refreshed successfully',
      data: result,
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    const result = await this.authService.logout(req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: result.message,
    };
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  async getUserSessions(@Req() req: Request) {
    const result = await this.authService.getUserSessions(req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: 'Sessions retrieved successfully',
      data: result,
    };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Param('sessionId') sessionId: string, @Req() req: Request) {
    const result = await this.authService.revokeSession(sessionId, req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: result.message,
    };
  }
}
