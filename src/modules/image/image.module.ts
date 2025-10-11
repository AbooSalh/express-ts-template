import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImageService } from './image.service';
import { ImageController } from './image.controller';
import { Image, ImageSchema } from './image.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: Image.name, schema: ImageSchema }])],
  controllers: [ImageController],
  providers: [ImageService],
  exports: [ImageService],
})
export class ImageModule {}
