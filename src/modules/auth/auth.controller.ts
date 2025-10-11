import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
  RefreshTokenDto,
  LogoutDto,
  ResendCodeDto,
} from './dto/auth.dto';
import { Request } from 'express';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getDeviceInfo(req: Request): string {
    return req.headers['user-agent'] || 'Unknown Device';
  }

  private getIpAddress(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'Unknown IP';
  }

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Public()
  @Post('resend-email-verification-code')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resendEmailVerificationCode(@Body() resendCodeDto: ResendCodeDto) {
    return this.authService.resendEmailVerificationCode(resendCodeDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(
      loginDto,
      this.getDeviceInfo(req),
      this.getIpAddress(req),
    );
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('resend-password-reset-code')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resendPasswordResetCode(@Body() resendCodeDto: ResendCodeDto) {
    return this.authService.resendPasswordResetCode(resendCodeDto);
  }

  @Public()
  @Post('verify-reset-code')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(verifyResetCodeDto);
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.resetPassword(
      resetPasswordDto,
      this.getDeviceInfo(req),
      this.getIpAddress(req),
    );
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    return this.authService.refreshToken(
      refreshTokenDto,
      this.getDeviceInfo(req),
      this.getIpAddress(req),
    );
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(logoutDto);
  }

  @Get('sessions')
  async getUserSessions(@CurrentUser('_id') userId: any) {
    return this.authService.getUserSessions(userId);
  }

  @Delete('sessions/:sessionId')
  async revokeSession(
    @CurrentUser('_id') userId: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(userId, sessionId);
  }
}
