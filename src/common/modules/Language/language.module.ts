import { Module } from '@nestjs/common';
import { LanguageController } from './language.controller.nest';

@Module({
  controllers: [LanguageController],
})
export class LanguageModule {}
