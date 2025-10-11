import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, RefreshToken } from '../user/user.entity';
import { EmailService } from '@/common/services/email.service';
import { CodeGenerator } from '@/common/utils/code-generator.util';
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  private createAccessToken(userId: string): string {
    return this.jwtService.sign(
      { id: userId },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '1d'),
        issuer: this.configService.get('JWT_ISSUER'),
        audience: this.configService.get('JWT_AUDIENCE'),
      },
    );
  }

  private createRefreshToken(userId: string): string {
    return this.jwtService.sign(
      { id: userId.toString() },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        issuer: this.configService.get('JWT_ISSUER'),
        audience: this.configService.get('JWT_AUDIENCE'),
      },
    );
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.userModel.updateOne(
      { _id: userId },
      {
        $push: {
          refreshTokens: {
            token: refreshToken,
            expiresAt,
            deviceInfo,
            ipAddress,
            createdAt: new Date(),
          },
        },
      },
    );
  }

  private async cleanupExpiredTokens(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $pull: {
          refreshTokens: {
            expiresAt: { $lt: new Date() },
          },
        },
      },
    );
  }

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { name, email, password } = registerDto;

    // Check if user exists
    const existingUser = await this.userModel.findOne({
      where: { email },
      select: ['_id', 'email', 'emailVerified', 'emailVerificationCode', 'emailVerificationCodeExpires'],
    });

    if (existingUser && (existingUser as any).emailVerified) {
      throw new BadRequestException('Email already registered and verified. Please use login instead.');
    }

    // Generate verification code
    const code = CodeGenerator.generateSecureCode(16);
    const hashedCode = CodeGenerator.hashCode(code);

    const userData = {
      name,
      email,
      password,
      emailVerificationCode: hashedCode,
      emailVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      emailVerified: false,
    };

    let user: User;
    if (existingUser) {
      this.logger.log(`User re-registering with unverified email: ${email}`);
      Object.assign(existingUser, userData);
      user = await existingUser.save();
    } else {
      user = new this.userModel(userData);
      user = await user.save();
    }

    try {
      await this.emailService.sendVerificationEmail(user.email, code);
    } catch (error: any) {
      if (!existingUser) {
        await this.userModel.deleteOne({ _id: user._id }).exec();
      }
      this.logger.error(`Failed to send verification email to ${user.email}`, error.stack);
      throw new BadRequestException('Failed to send verification email');
    }

    return {
      message: 'Verification code sent to your email. Please verify to activate your account.',
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    const { email, code } = verifyEmailDto;
    const hashedCode = CodeGenerator.hashCode(code);

    const user = await this.userModel.findOne({
      where: {
        email,
        emailVerificationCode: hashedCode,
      },
      select: ['_id', 'email', 'emailVerificationCode', 'emailVerificationCodeExpires', 'emailVerified'],
    });

    if (!user || !(user as any).emailVerificationCodeExpires || (user as any).emailVerificationCodeExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          emailVerificationCode: null,
          emailVerificationCodeExpires: null,
        },
      },
    );

    return { message: 'Email verified successfully' };
  }

  async resendEmailVerificationCode(resendCodeDto: ResendCodeDto): Promise<{ message: string }> {
    const { email } = resendCodeDto;
    
    const user = await this.userModel.findOne({
      where: { email },
      select: ['_id', 'email', 'emailVerified', 'emailVerificationCode', 'emailVerificationCodeExpires'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if ((user as any).emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (!(user as any).emailVerificationCode || !(user as any).emailVerificationCodeExpires) {
      throw new BadRequestException('No verification in progress. Please register again.');
    }

    const code = CodeGenerator.generateSecureCode(16);
    const hashedCode = CodeGenerator.hashCode(code);

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerificationCode: hashedCode,
          emailVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
        },
      },
    );

    await this.emailService.sendVerificationEmail(user.email, code);

    return { message: 'Verification code resent' };
  }

  async login(
    loginDto: LoginDto,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const { email, password } = loginDto;

    const userWithPassword = await this.userModel.findOne({
      where: { email },
      select: ['_id', 'email', 'password', 'emailVerified', 'name', 'role', 'slug'],
    });

    if (!userWithPassword || !(await userWithPassword.comparePassword(password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(userWithPassword as any).emailVerified) {
      throw new ForbiddenException('Email must be verified before login - go check your mailbox');
    }

    const user = await this.userModel.findOne({
      where: { _id: userWithPassword._id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.createAccessToken(user._id.toString());
    const refreshToken = this.createRefreshToken(user._id.toString());

    await this.saveRefreshToken(user._id.toString(), refreshToken, deviceInfo, ipAddress);
    await this.cleanupExpiredTokens(user._id.toString());

    return { user, accessToken, refreshToken };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    
    const user = await this.userModel.findOne({
      where: { email },
      select: ['_id', 'email', 'passwordResetCode', 'passwordResetCodeExpires', 'passwordResetVerified'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const code = CodeGenerator.generateSecureCode(16);
    const hashedCode = CodeGenerator.hashCode(code);

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetCode: hashedCode,
          passwordResetCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
          passwordResetVerified: false,
        },
      },
    );

    try {
      await this.emailService.sendPasswordResetEmail(user.email, code);
    } catch (error) {
      await this.userModel.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetCode: null,
            passwordResetCodeExpires: null,
            passwordResetVerified: null,
          },
        },
      );
      throw new BadRequestException('Failed to send email');
    }

    return { message: 'Reset code has been sent to your email' };
  }

  async resendPasswordResetCode(resendCodeDto: ResendCodeDto): Promise<{ message: string }> {
    const { email } = resendCodeDto;
    
    const user = await this.userModel.findOne({
      where: { email },
      select: ['_id', 'email', 'passwordResetCode', 'passwordResetCodeExpires', 'passwordResetVerified'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(user as any).passwordResetCode || !(user as any).passwordResetCodeExpires) {
      throw new BadRequestException('No password reset in progress. Please request a reset first.');
    }

    const code = CodeGenerator.generateSecureCode(16);
    const hashedCode = CodeGenerator.hashCode(code);

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetCode: hashedCode,
          passwordResetCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
          passwordResetVerified: false,
        },
      },
    );

    try {
      await this.emailService.sendPasswordResetEmail(user.email, code);
    } catch (error) {
      await this.userModel.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetCode: null,
            passwordResetCodeExpires: null,
            passwordResetVerified: null,
          },
        },
      );
      throw new BadRequestException('Failed to send email');
    }

    return { message: 'Password reset code resent' };
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{ message: string }> {
    const { email, code } = verifyResetCodeDto;
    const hashedCode = CodeGenerator.hashCode(code);

    const user = await this.userModel.findOne({
      where: {
        email,
        passwordResetCode: hashedCode,
      },
      select: ['_id', 'email', 'passwordResetCode', 'passwordResetCodeExpires', 'passwordResetVerified'],
    });

    if (!user || !(user as any).passwordResetCodeExpires || (user as any).passwordResetCodeExpires < new Date()) {
      throw new UnauthorizedException('Invalid reset code or expired');
    }

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetVerified: true,
        },
      },
    );

    return { message: 'Reset code verified successfully' };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, newPassword } = resetPasswordDto;

    const user = await this.userModel.findOne({
      where: { email },
      select: ['_id', 'email', 'passwordResetCode', 'passwordResetCodeExpires', 'passwordResetVerified'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(user as any).passwordResetVerified) {
      throw new UnauthorizedException('Reset code not verified');
    }

    user.password = newPassword;
    await user.save();

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetCode: null,
          passwordResetCodeExpires: null,
          passwordResetVerified: null,
        },
      },
    );

    const accessToken = this.createAccessToken(user._id.toString());
    const refreshToken = this.createRefreshToken(user._id.toString());

    await this.saveRefreshToken(user._id.toString(), refreshToken, deviceInfo, ipAddress);

    return { accessToken, refreshToken };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken: token } = refreshTokenDto;

    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const userId = new ObjectId(decoded.id);
      const user = await this.userModel.findOne({
        where: { _id: userId },
        select: ['_id', 'email', 'refreshTokens', 'emailVerified'],
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokenExists = (user as any).refreshTokens?.some(
        (rt: RefreshToken) => rt.token === token && rt.expiresAt > new Date(),
      );

      if (!tokenExists) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      if (!(user as any).emailVerified) {
        throw new ForbiddenException('Email must be verified');
      }

      const newAccessToken = this.createAccessToken(user._id.toString());
      const newRefreshToken = this.createRefreshToken(user._id.toString());

      // Remove old token
      await this.userModel.updateOne(
        { _id: user._id },
        {
          $pull: { refreshTokens: { token } },
        },
      );

      // Add new token
      await this.saveRefreshToken(user._id.toString(), newRefreshToken, deviceInfo, ipAddress);
      await this.cleanupExpiredTokens(user._id.toString());

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(logoutDto: LogoutDto): Promise<{ message: string }> {
    const { refreshToken: token } = logoutDto;

    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const userId = new ObjectId(decoded.id);
      await this.userModel.updateOne(
        { _id: userId },
        {
          $pull: { refreshTokens: { token } },
        },
      );
    } catch (error) {
      // Even if invalid, return success to prevent token enumeration
    }

    return { message: 'Logged out successfully' };
  }

  async getUserSessions(userId: string): Promise<{ sessions: any[] }> {
    await this.cleanupExpiredTokens(userId);

    const user = await this.userModel.findOne({
      where: { _id: userId },
      select: ['_id', 'refreshTokens'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const sessions =
      (user as any).refreshTokens?.map((rt: RefreshToken) => ({
        id: (rt as any)._id,
        deviceInfo: rt.deviceInfo,
        ipAddress: rt.ipAddress,
        createdAt: rt.createdAt,
        expiresAt: rt.expiresAt,
      })) || [];

    return { sessions };
  }

  async revokeSession(userId: string, sessionId: string): Promise<{ message: string }> {
    const result = await this.userModel.updateOne(
      { _id: userId },
      {
        $pull: { refreshTokens: { _id: new ObjectId(sessionId) } },
      },
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException('Session not found');
    }

    return { message: 'Session revoked successfully' };
  }
}
