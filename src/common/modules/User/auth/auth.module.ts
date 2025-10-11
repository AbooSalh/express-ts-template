import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.nest';
import { AuthService } from './auth.service.nest';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
