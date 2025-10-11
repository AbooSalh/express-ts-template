import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  Res,
  UploadedFiles,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard, Roles } from '@/common/guards/auth.guard';
import { Throttle } from '@nestjs/throttler';
import ImageC from './controller';
import createImageCenter from '@/common/middleware/imageCenter';

const imageCenter = createImageCenter({
  basePath: 'images',
  fieldName: 'files',
  maxCount: 20,
});

@Controller('images')
export class ImageController {
  @Get()
  async list(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.list.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles('admin')
  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // Upload rate limiting
  @UseInterceptors(FilesInterceptor('files', 20))
  async upload(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request, @Res() res: Response) {
    // The multer middleware from Express is already configured
    // We need to manually call the Express upload and process middleware
    return new Promise((resolve, reject) => {
      imageCenter.upload(req, res, (uploadErr: any) => {
        if (uploadErr) return reject(uploadErr);
        imageCenter.processImages(req, res, (processErr: any) => {
          if (processErr) return reject(processErr);
          ImageC.upload.handler(req, res, (err: any) => {
            if (err) reject(err);
          });
        });
      });
    });
  }

  @Get('variant-presets')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getVariantPresets(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.getVariantPresets.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('stats')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getStats(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.getStats.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('folders')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async listFolders(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.listFolders.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Post('folders')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async createFolder(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.createFolder.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get('folders/stats')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getFolderStats(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.getFolderStats.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Put('folders/:oldName')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async renameFolder(@Param('oldName') oldName: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.renameFolder.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Delete('folders/:name')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async deleteFolder(@Param('name') name: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.deleteFolder.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Put('move-to-folder')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async moveImagesToFolder(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.moveImagesToFolder.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Delete('bulk/enhanced')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async bulkDeleteEnhanced(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.bulkDeleteEnhanced.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Put('bulk/move')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async bulkMoveImages(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.bulkMoveImages.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Post('organize')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async organizeImages(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.organizeImages.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Post('bulk-download')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async bulkDownload(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.bulkDownload.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Delete('bulk')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async bulkDelete(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.bulkDelete.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.getOne.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.update.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async delete(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.delete.handler(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Get(':id/translations')
  @UseGuards(AuthGuard)
  async getTranslations(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.getTranslations(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Post(':id/translations')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async createTranslation(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      ImageC.createTranslation(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Put(':id/translations/:language')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async updateTranslation(
    @Param('id') id: string,
    @Param('language') language: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return new Promise((resolve, reject) => {
      ImageC.updateTranslation(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Delete(':id/translations/:language')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async deleteTranslation(
    @Param('id') id: string,
    @Param('language') language: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return new Promise((resolve, reject) => {
      ImageC.deleteTranslation(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }

  @Put(':id/translations/:language/upsert')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async upsertTranslation(
    @Param('id') id: string,
    @Param('language') language: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return new Promise((resolve, reject) => {
      ImageC.upsertTranslation(req, res, (err: any) => {
        if (err) reject(err);
      });
    });
  }
}
