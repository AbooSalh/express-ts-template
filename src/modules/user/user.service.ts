import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, DeleteAccountVerifyDto } from './dto/user.dto';
import { EmailService } from '@/common/services/email.service';
import { CodeGenerator } from '@/common/utils/code-generator.util';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private emailService: EmailService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userModel.findOne({ email: createUserDto.email }).exec();

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const user = new this.userModel({
      ...createUserDto,
      emailVerified: true, // Admin-created users are auto-verified
    });

    return user.save();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({ email: updateUserDto.email }).exec();

      if (existingUser && String(existingUser._id) !== id) {
        throw new BadRequestException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return user.save();
  }

  async updateAuthUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Don't allow role updates from auth user
    delete updateUserDto.role;

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({ email: updateUserDto.email }).exec();

      if (existingUser && String(existingUser._id) !== userId.toString()) {
        throw new BadRequestException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return user.save();
  }

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User deleted successfully' };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).select('+password').exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordCorrect = await user.comparePassword(changePasswordDto.currentPassword);

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = changePasswordDto.newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  async sendDeleteAccountCode(userId: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const code = CodeGenerator.generateSecureCode(16);
    const hashedCode = CodeGenerator.hashCode(code);

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          deleteAccountCode: hashedCode,
          deleteAccountCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      },
    ).exec();

    await this.emailService.sendDeleteAccountEmail(user.email, code);

    return { message: 'Delete account code sent to your email' };
  }

  async deleteAccount(
    userId: string,
    deleteAccountVerifyDto: DeleteAccountVerifyDto,
  ): Promise<{ message: string }> {
    const { code } = deleteAccountVerifyDto;
    const hashedCode = CodeGenerator.hashCode(code);

    const user = await this.userModel
      .findById(userId)
      .select('+deleteAccountCode +deleteAccountCodeExpires')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !(user as any).deleteAccountCode ||
      (user as any).deleteAccountCode !== hashedCode ||
      !(user as any).deleteAccountCodeExpires ||
      (user as any).deleteAccountCodeExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired delete account code');
    }

    await this.userModel.deleteOne({ _id: userId }).exec();

    return { message: 'Account deleted successfully' };
  }
}
