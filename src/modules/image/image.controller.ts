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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FilesInterceptor('files', 10)) // Allow up to 10 files
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() metadata: any,
    @CurrentUser('_id') userId: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

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
