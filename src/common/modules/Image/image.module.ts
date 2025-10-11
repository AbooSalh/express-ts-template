import { Module } from '@nestjs/common';
import { ImageController } from './image.controller.nest';

@Module({
  controllers: [ImageController],
})
export class ImageModule {}
