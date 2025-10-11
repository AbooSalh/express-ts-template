import { Entity, ObjectIdColumn, ObjectId, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, Index } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export interface RefreshToken {
  token: string;
  expiresAt: Date;
  deviceInfo: string;
  ipAddress: string;
  createdAt: Date;
}

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  passwordChangedAt: Date;

  @Column({ nullable: true, select: false })
  passwordResetCode: string;

  @Column({ nullable: true, select: false })
  passwordResetCodeExpires: Date;

  @Column({ nullable: true, select: false, default: undefined })
  passwordResetVerified: boolean;

  @Column({ nullable: true, select: false })
  emailVerificationCode: string;

  @Column({ nullable: true, select: false })
  emailVerificationCodeExpires: Date;

  @Column({ default: false, select: false })
  emailVerified: boolean;

  @Column({ nullable: true, select: false })
  deleteAccountCode: string;

  @Column({ nullable: true, select: false })
  deleteAccountCodeExpires: Date;

  @Column({ default: [] })
  refreshTokens: RefreshToken[];

  @Column({ default: 'user' })
  role: 'user' | 'admin';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  @BeforeInsert()
  async generateSlug() {
    if (this.name && !this.slug) {
      this.slug = this.name
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}
