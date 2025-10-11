import { IsString, Matches, IsBoolean, IsOptional } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @Matches(/^[a-z]{2}$/, {
    message: 'Language code must be exactly 2 lowercase letters (e.g., en, ar, fr)',
  })
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateLanguageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
