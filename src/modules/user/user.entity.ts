import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export interface RefreshToken {
  token: string;
  expiresAt: Date;
  deviceInfo: string;
  ipAddress: string;
  createdAt: Date;
}

@Schema({ collection: 'users', timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  slug: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop()
  passwordChangedAt: Date;

  @Prop({ select: false })
  passwordResetCode: string;

  @Prop({ select: false })
  passwordResetCodeExpires: Date;

  @Prop({ select: false })
  passwordResetVerified: boolean;

  @Prop({ select: false })
  emailVerificationCode: string;

  @Prop({ select: false })
  emailVerificationCodeExpires: Date;

  @Prop({ default: false, select: false })
  emailVerified: boolean;

  @Prop({ select: false })
  deleteAccountCode: string;

  @Prop({ select: false })
  deleteAccountCodeExpires: Date;

  @Prop({ type: Array, default: [] })
  refreshTokens: RefreshToken[];

  @Prop({ enum: ['user', 'admin'], default: 'user' })
  role: 'user' | 'admin';

  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const password = this.get('password');
  if (password && !password.startsWith('$2')) {
    this.set('password', await bcrypt.hash(password, 10));
  }
  next();
});

// Generate slug before saving
UserSchema.pre('save', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }
  next();
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
