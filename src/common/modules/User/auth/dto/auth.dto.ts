import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  password!: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class VerifyResetCodeDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  code!: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}

export class VerifyEmailDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  code!: string;
}

export class ResendEmailVerificationDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}
