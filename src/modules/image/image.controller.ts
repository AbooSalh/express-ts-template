import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ImageService } from './image.service';
import { UpdateImageDto } from './dto/image.dto';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('images')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Get()
  @Public()
  async findAll(@Query() query: any) {
    return this.imageService.findAll(query);
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.imageService.findOne(id);
  }

  @Post('upload')
  @Roles('admin')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async upload(
    @Req() req: FastifyRequest,
    @Body() metadata: any,
    @CurrentUser('_id') userId: any,
  ) {
    // Handle multipart upload with Fastify
    const data = await req.file();
    
    if (!data) {
      throw new BadRequestException('No files uploaded');
    }

    const files: any[] = [];
    
    // Fastify multipart handles files differently
    // Convert to buffer for processing
    const buffer = await data.toBuffer();
    files.push({
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
    });

    return this.imageService.uploadMultiple(files, metadata, userId?.toString());
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() updateImageDto: UpdateImageDto) {
    return this.imageService.update(id, updateImageDto);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.imageService.delete(id);
  }
}
