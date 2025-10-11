import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Language } from './language.entity';
import { CreateLanguageDto, UpdateLanguageDto } from './dto/language.dto';

@Injectable()
export class LanguageService {
  constructor(
    @InjectModel(Language.name)
    private languageModel: Model<Language>,
  ) {}

  async findAll(): Promise<Language[]> {
    return this.languageModel.find().exec();
  }

  async findOne(id: string): Promise<Language> {
    const language = await this.languageModel.findById(id).exec();

    if (!language) {
      throw new NotFoundException('Language not found');
    }

    return language;
  }

  async create(createLanguageDto: CreateLanguageDto): Promise<Language> {
    const existingLanguage = await this.languageModel.findOne({ code: createLanguageDto.code }).exec();

    if (existingLanguage) {
      throw new BadRequestException('Language code already exists');
    }

    // If setting as default, unset all others
    if (createLanguageDto.isDefault) {
      await this.languageModel.updateMany(
        { _id: { $ne: null } },
        { $set: { isDefault: false } },
      ).exec();
    }

    const language = new this.languageModel(createLanguageDto);
    return language.save();
  }

  async update(id: string, updateLanguageDto: UpdateLanguageDto): Promise<Language> {
    const language = await this.findOne(id);

    // If setting as default, unset all others
    if (updateLanguageDto.isDefault) {
      await this.languageModel.updateMany(
        { _id: { $ne: id } },
        { $set: { isDefault: false } },
      ).exec();
    }

    Object.assign(language, updateLanguageDto);
    return language.save();
  }

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.languageModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Language not found');
    }

    return { message: 'Language deleted successfully' };
  }
}
