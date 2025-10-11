import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, DeleteAccountVerifyDto } from './dto/user.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles('admin')
  async findAll() {
    return this.userService.findAll();
  }

  @Get('profile')
  async getProfile(@CurrentUser('_id') userId: any) {
    return this.userService.getProfile(userId);
  }

  @Post()
  @Roles('admin')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Put('update')
  async updateAuthUser(
    @CurrentUser('_id') userId: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateAuthUser(userId, updateUserDto);
  }

  @Patch('change-password')
  async changePassword(
    @CurrentUser('_id') userId: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(userId, changePasswordDto);
  }

  @Post('send-delete-account-code')
  async sendDeleteAccountCode(@CurrentUser('_id') userId: any) {
    return this.userService.sendDeleteAccountCode(userId);
  }

  @Delete('delete-account')
  async deleteAccount(
    @CurrentUser('_id') userId: any,
    @Body() deleteAccountVerifyDto: DeleteAccountVerifyDto,
  ) {
    return this.userService.deleteAccount(userId, deleteAccountVerifyDto);
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}
