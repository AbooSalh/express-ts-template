import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Language } from './language.entity';
import { CreateLanguageDto, UpdateLanguageDto } from './dto/language.dto';
import { ObjectId } from 'mongodb';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language)
    private languageRepository: MongoRepository<Language>,
  ) {}

  async findAll(): Promise<Language[]> {
    return this.languageRepository.find();
  }

  async findOne(id: string): Promise<Language> {
    const language = await this.languageRepository.findOne({
      where: { _id: new ObjectId(id) } as any,
    });

    if (!language) {
      throw new NotFoundException('Language not found');
    }

    return language;
  }

  async create(createLanguageDto: CreateLanguageDto): Promise<Language> {
    const existingLanguage = await this.languageRepository.findOne({
      where: { code: createLanguageDto.code } as any,
    });

    if (existingLanguage) {
      throw new BadRequestException('Language code already exists');
    }

    // If setting as default, unset all others
    if (createLanguageDto.isDefault) {
      await this.languageRepository.updateMany(
        {},
        { $set: { isDefault: false } } as any,
      );
    }

    const language = this.languageRepository.create(createLanguageDto);
    return this.languageRepository.save(language);
  }

  async update(id: string, updateLanguageDto: UpdateLanguageDto): Promise<Language> {
    const language = await this.findOne(id);

    // If setting as default, unset all others
    if (updateLanguageDto.isDefault) {
      await this.languageRepository.updateMany(
        { _id: { $ne: new ObjectId(id) } } as any,
        { $set: { isDefault: false } } as any,
      );
    }

    Object.assign(language, updateLanguageDto);
    return this.languageRepository.save(language);
  }

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.languageRepository.delete({ _id: new ObjectId(id) } as any);

    if (result.affected === 0) {
      throw new NotFoundException('Language not found');
    }

    return { message: 'Language deleted successfully' };
  }
}
