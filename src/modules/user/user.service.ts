import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, DeleteAccountVerifyDto } from './dto/user.dto';
import { ObjectId } from 'mongodb';
import { EmailService } from '@/common/services/email.service';
import { CodeGenerator } from '@/common/utils/code-generator.util';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: MongoRepository<User>,
    private emailService: EmailService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(id) } as any,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getProfile(userId: ObjectId): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { _id: userId } as any,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email } as any,
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      emailVerified: true, // Admin-created users are auto-verified
    });

    return this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email } as any,
      });

      if (existingUser && existingUser._id.toString() !== id) {
        throw new BadRequestException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async updateAuthUser(userId: ObjectId, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { _id: userId } as any,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Don't allow role updates from auth user
    delete updateUserDto.role;

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email } as any,
      });

      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        throw new BadRequestException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.userRepository.delete({ _id: new ObjectId(id) } as any);

    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User deleted successfully' };
  }

  async changePassword(
    userId: ObjectId,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { _id: userId } as any,
      select: ['_id', 'email', 'password'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordCorrect = await user.comparePassword(changePasswordDto.currentPassword);

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = changePasswordDto.newPassword;
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async sendDeleteAccountCode(userId: ObjectId): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { _id: userId } as any,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const code = CodeGenerator.generateSecureCode(16);
    const hashedCode = CodeGenerator.hashCode(code);

    await this.userRepository.updateOne(
      { _id: userId } as any,
      {
        $set: {
          deleteAccountCode: hashedCode,
          deleteAccountCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      } as any,
    );

    await this.emailService.sendDeleteAccountEmail(user.email, code);

    return { message: 'Delete account code sent to your email' };
  }

  async deleteAccount(
    userId: ObjectId,
    deleteAccountVerifyDto: DeleteAccountVerifyDto,
  ): Promise<{ message: string }> {
    const { code } = deleteAccountVerifyDto;
    const hashedCode = CodeGenerator.hashCode(code);

    const user = await this.userRepository.findOne({
      where: {
        _id: userId,
      } as any,
      select: ['_id', 'email', 'deleteAccountCode', 'deleteAccountCodeExpires'],
    });

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

    await this.userRepository.delete({ _id: userId } as any);

    return { message: 'Account deleted successfully' };
  }
}
