import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Image, ImageVariant } from './image.entity';
import { UpdateImageDto } from './dto/image.dto';
import { ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(Image)
    private imageRepository: MongoRepository<Image>,
    private configService: ConfigService,
  ) {}

  async findAll(query: any): Promise<{ images: any[]; total: number }> {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.folder) filter.folder = query.folder;

    const [images, total] = await Promise.all([
      this.imageRepository.find({
        where: filter,
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      }),
      this.imageRepository.count(filter),
    ]);

    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:5050');
    const imagesWithUrls = images.map((img) => ({
      ...img,
      url: `${baseUrl}/uploads/${img.folder ? img.folder + '/' : ''}${img.fileName}`,
      variants: img.variants.map((v) => ({
        ...v,
        fullUrl: `${baseUrl}${v.url}`,
      })),
    }));

    return { images: imagesWithUrls, total };
  }

  async findOne(id: string): Promise<any> {
    const image = await this.imageRepository.findOne({
      where: { _id: new ObjectId(id) } as any,
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:5050');
    return {
      ...image,
      url: `${baseUrl}/uploads/${image.folder ? image.folder + '/' : ''}${image.fileName}`,
      variants: image.variants.map((v) => ({
        ...v,
        fullUrl: `${baseUrl}${v.url}`,
      })),
    };
  }

  async upload(
    file: Express.Multer.File,
    metadata: any,
    userId: string,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uploadsPath = this.configService.get('UPLOADS_PATH', 'public/uploads');
    const folder = metadata.folder || 'general';
    const folderPath = path.join(uploadsPath, folder);

    // Ensure directory exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(folderPath, fileName);

    // Save original file
    fs.writeFileSync(filePath, file.buffer);

    // Get image dimensions
    let width: number | undefined;
    let height: number | undefined;
    try {
      const imageInfo = await sharp(file.buffer).metadata();
      width = imageInfo.width;
      height = imageInfo.height;
    } catch (error) {
      // Not an image or error reading metadata
    }

    // Create variants (thumbnail, medium)
    const variants: ImageVariant[] = [];
    if (file.mimetype.startsWith('image/')) {
      try {
        // Thumbnail
        const thumbPath = path.join(folderPath, `thumb-${fileName}`);
        await sharp(file.buffer).resize(200, 200, { fit: 'cover' }).toFile(thumbPath);
        variants.push({
          name: 'thumbnail',
          url: `/uploads/${folder}/thumb-${fileName}`,
          width: 200,
          height: 200,
          format: 'jpeg',
          sizeBytes: fs.statSync(thumbPath).size,
        });

        // Medium
        const mediumPath = path.join(folderPath, `medium-${fileName}`);
        await sharp(file.buffer).resize(800, 800, { fit: 'inside' }).toFile(mediumPath);
        variants.push({
          name: 'medium',
          url: `/uploads/${folder}/medium-${fileName}`,
          width: 800,
          height: 800,
          format: 'jpeg',
          sizeBytes: fs.statSync(mediumPath).size,
        });
      } catch (error) {
        console.error('Error creating image variants:', error);
      }
    }

    const image = this.imageRepository.create({
      originalName: file.originalname,
      fileName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      width,
      height,
      folder,
      variants,
      createdBy: userId,
      alt: metadata.alt,
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags || [],
    });

    const saved = await this.imageRepository.save(image);
    return this.findOne(saved._id.toString());
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    metadata: any,
    userId: string,
  ): Promise<{ images: any[]; count: number }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const uploadPromises = files.map((file, index) => {
      // Create individual metadata for each file if needed
      const fileMetadata = {
        ...metadata,
        // You can customize metadata per file here
        title: metadata.title ? `${metadata.title} ${index + 1}` : undefined,
      };
      return this.upload(file, fileMetadata, userId);
    });

    try {
      const uploadedImages = await Promise.all(uploadPromises);
      return {
        images: uploadedImages,
        count: uploadedImages.length,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload one or more files: ${error.message}`,
      );
    }
  }

  async update(id: string, updateImageDto: UpdateImageDto): Promise<any> {
    const image = await this.imageRepository.findOne({
      where: { _id: new ObjectId(id) } as any,
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    Object.assign(image, updateImageDto);
    await this.imageRepository.save(image);

    return this.findOne(id);
  }

  async delete(id: string): Promise<{ message: string }> {
    const image = await this.imageRepository.findOne({
      where: { _id: new ObjectId(id) } as any,
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Delete physical files
    const uploadsPath = this.configService.get('UPLOADS_PATH', 'public/uploads');
    const folder = image.folder || 'general';
    const filePath = path.join(uploadsPath, folder, image.fileName);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete variants
      for (const variant of image.variants) {
        const variantPath = path.join(uploadsPath, folder, path.basename(variant.url));
        if (fs.existsSync(variantPath)) {
          fs.unlinkSync(variantPath);
        }
      }
    } catch (error) {
      console.error('Error deleting files:', error);
    }

    await this.imageRepository.delete({ _id: new ObjectId(id) } as any);

    return { message: 'Image deleted successfully' };
  }
}
