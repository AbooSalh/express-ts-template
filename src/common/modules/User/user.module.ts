import { Module } from '@nestjs/common';
import { UserController } from './user.controller.nest';
import { UserService } from './user.service.nest';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
