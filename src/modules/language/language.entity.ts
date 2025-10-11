import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'languages', timestamps: true })
export class Language extends Document {
  @Prop({ required: true, unique: true, index: true })
  code: string; // "en", "ar", "fr"

  @Prop({ required: true })
  name: string; // "English", "العربية"

  @Prop({ default: false })
  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const LanguageSchema = SchemaFactory.createForClass(Language);

// Validate code before saving
LanguageSchema.pre('save', function (next) {
  if (!/^[a-z]{2}$/.test(this.code)) {
    throw new Error(`${this.code} is not a valid language code!`);
  }
  next();
});
