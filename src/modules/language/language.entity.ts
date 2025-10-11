import { Entity, ObjectIdColumn, ObjectId, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, Index } from 'typeorm';

@Entity('languages')
@Index(['code'], { unique: true })
export class Language {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ unique: true })
  code: string; // "en", "ar", "fr"

  @Column()
  name: string; // "English", "العربية"

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  validateCode() {
    if (!/^[a-z]{2}$/.test(this.code)) {
      throw new Error(`${this.code} is not a valid language code!`);
    }
  }
}
