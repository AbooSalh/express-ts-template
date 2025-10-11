import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
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
import { ObjectId } from 'typeorm';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: MongoRepository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  private createAccessToken(userId: ObjectId): string {
    return this.jwtService.sign(
      { id: userId.toString() },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '1d'),
        issuer: this.configService.get('JWT_ISSUER'),
        audience: this.configService.get('JWT_AUDIENCE'),
      },
    );
  }

  private createRefreshToken(userId: ObjectId): string {
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
    userId: ObjectId,
    refreshToken: string,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.userRepository.updateOne(
      { _id: userId } as any,
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
      } as any,
    );
  }

  private async cleanupExpiredTokens(userId: ObjectId): Promise<void> {
    await this.userRepository.updateOne(
      { _id: userId } as any,
      {
        $pull: {
          refreshTokens: {
            expiresAt: { $lt: new Date() },
          },
        },
      } as any,
    );
  }

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { name, email, password } = registerDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email } as any,
      select: ['_id', 'email', 'emailVerified', 'emailVerificationCode', 'emailVerificationCodeExpires'],
    });

    if (existingUser && (existingUser as any).emailVerified) {
      throw new BadRequestException('Registration failed. Please try again later.');
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
      user = await this.userRepository.save(existingUser);
    } else {
      user = this.userRepository.create(userData);
      user = await this.userRepository.save(user);
    }

    try {
      await this.emailService.sendVerificationEmail(user.email, code);
    } catch (error: any) {
      if (!existingUser) {
        await this.userRepository.delete(user._id);
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

    const user = await this.userRepository.findOne({
      where: {
        email,
        emailVerificationCode: hashedCode,
      } as any,
      select: ['_id', 'email', 'emailVerificationCode', 'emailVerificationCodeExpires', 'emailVerified'],
    });

    if (!user || !(user as any).emailVerificationCodeExpires || (user as any).emailVerificationCodeExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    await this.userRepository.updateOne(
      { _id: user._id } as any,
      {
        $set: {
          emailVerified: true,
          emailVerificationCode: null,
          emailVerificationCodeExpires: null,
        },
      } as any,
    );

    return { message: 'Email verified successfully' };
  }

  async resendEmailVerificationCode(resendCodeDto: ResendCodeDto): Promise<{ message: string }> {
    const { email } = resendCodeDto;
    
    const user = await this.userRepository.findOne({
      where: { email } as any,
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

    await this.userRepository.updateOne(
      { _id: user._id } as any,
      {
        $set: {
          emailVerificationCode: hashedCode,
          emailVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
        },
      } as any,
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

    const userWithPassword = await this.userRepository.findOne({
      where: { email } as any,
      select: ['_id', 'email', 'password', 'emailVerified', 'name', 'role', 'slug'],
    });

    if (!userWithPassword || !(await userWithPassword.comparePassword(password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(userWithPassword as any).emailVerified) {
      throw new ForbiddenException('Email must be verified before login - go check your mailbox');
    }

    const user = await this.userRepository.findOne({
      where: { _id: userWithPassword._id } as any,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.createAccessToken(user._id);
    const refreshToken = this.createRefreshToken(user._id);

    await this.saveRefreshToken(user._id, refreshToken, deviceInfo, ipAddress);
    await this.cleanupExpiredTokens(user._id);

    return { user, accessToken, refreshToken };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    
    const user = await this.userRepository.findOne({
      where: { email } as any,
      select: ['_id', 'email', 'passwordResetCode', 'passwordResetCodeExpires', 'passwordResetVerified'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const code = CodeGenerator.generateSecureCode(16);
    const hashedCode = CodeGenerator.hashCode(code);

    await this.userRepository.updateOne(
      { _id: user._id } as any,
      {
        $set: {
          passwordResetCode: hashedCode,
          passwordResetCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
          passwordResetVerified: false,
        },
      } as any,
    );

    try {
      await this.emailService.sendPasswordResetEmail(user.email, code);
    } catch (error) {
      await this.userRepository.updateOne(
        { _id: user._id } as any,
        {
          $set: {
            passwordResetCode: null,
            passwordResetCodeExpires: null,
            passwordResetVerified: null,
          },
        } as any,
      );
      throw new BadRequestException('Failed to send email');
    }

    return { message: 'Reset code has been sent to your email' };
  }

  async resendPasswordResetCode(resendCodeDto: ResendCodeDto): Promise<{ message: string }> {
    const { email } = resendCodeDto;
    
    const user = await this.userRepository.findOne({
      where: { email } as any,
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

    await this.userRepository.updateOne(
      { _id: user._id } as any,
      {
        $set: {
          passwordResetCode: hashedCode,
          passwordResetCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
          passwordResetVerified: false,
        },
      } as any,
    );

    try {
      await this.emailService.sendPasswordResetEmail(user.email, code);
    } catch (error) {
      await this.userRepository.updateOne(
        { _id: user._id } as any,
        {
          $set: {
            passwordResetCode: null,
            passwordResetCodeExpires: null,
            passwordResetVerified: null,
          },
        } as any,
      );
      throw new BadRequestException('Failed to send email');
    }

    return { message: 'Password reset code resent' };
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{ message: string }> {
    const { email, code } = verifyResetCodeDto;
    const hashedCode = CodeGenerator.hashCode(code);

    const user = await this.userRepository.findOne({
      where: {
        email,
        passwordResetCode: hashedCode,
      } as any,
      select: ['_id', 'email', 'passwordResetCode', 'passwordResetCodeExpires', 'passwordResetVerified'],
    });

    if (!user || !(user as any).passwordResetCodeExpires || (user as any).passwordResetCodeExpires < new Date()) {
      throw new UnauthorizedException('Invalid reset code or expired');
    }

    await this.userRepository.updateOne(
      { _id: user._id } as any,
      {
        $set: {
          passwordResetVerified: true,
        },
      } as any,
    );

    return { message: 'Reset code verified successfully' };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email } as any,
      select: ['_id', 'email', 'passwordResetCode', 'passwordResetCodeExpires', 'passwordResetVerified'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(user as any).passwordResetVerified) {
      throw new UnauthorizedException('Reset code not verified');
    }

    user.password = newPassword;
    await this.userRepository.save(user);

    await this.userRepository.updateOne(
      { _id: user._id } as any,
      {
        $set: {
          passwordResetCode: null,
          passwordResetCodeExpires: null,
          passwordResetVerified: null,
        },
      } as any,
    );

    const accessToken = this.createAccessToken(user._id);
    const refreshToken = this.createRefreshToken(user._id);

    await this.saveRefreshToken(user._id, refreshToken, deviceInfo, ipAddress);

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
      const user = await this.userRepository.findOne({
        where: { _id: userId } as any,
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

      const newAccessToken = this.createAccessToken(user._id);
      const newRefreshToken = this.createRefreshToken(user._id);

      // Remove old token
      await this.userRepository.updateOne(
        { _id: user._id } as any,
        {
          $pull: { refreshTokens: { token } },
        } as any,
      );

      // Add new token
      await this.saveRefreshToken(user._id, newRefreshToken, deviceInfo, ipAddress);
      await this.cleanupExpiredTokens(user._id);

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
      await this.userRepository.updateOne(
        { _id: userId } as any,
        {
          $pull: { refreshTokens: { token } },
        } as any,
      );
    } catch (error) {
      // Even if invalid, return success to prevent token enumeration
    }

    return { message: 'Logged out successfully' };
  }

  async getUserSessions(userId: ObjectId): Promise<{ sessions: any[] }> {
    await this.cleanupExpiredTokens(userId);

    const user = await this.userRepository.findOne({
      where: { _id: userId } as any,
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

  async revokeSession(userId: ObjectId, sessionId: string): Promise<{ message: string }> {
    const result = await this.userRepository.updateOne(
      { _id: userId } as any,
      {
        $pull: { refreshTokens: { _id: new ObjectId(sessionId) } },
      } as any,
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException('Session not found');
    }

    return { message: 'Session revoked successfully' };
  }
}
