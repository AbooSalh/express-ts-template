// models/Language.ts
import { Schema, model } from "mongoose";

const languageSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v: string) => /^[a-z]{2}$/.test(v),
      message: (props: { value: string }) =>
        `${props.value} is not a valid language code!`,
    },
  }, // "en", "ar", "fr"
  name: { type: String, required: true }, // "English", "العربية"
  isDefault: {
    type: Boolean,
    default: false,
  },
});

// Pre-save hook to ensure only one default language
languageSchema.pre('save', async function (next) {
  if (this.isDefault) {
    const Model = this.constructor as typeof import('mongoose').Model<any>;
    await Model.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Helper to unset isDefault on all other documents
async function unsetOtherDefaults(this: any, next: any) {
  // 'this' is the query
  const update = this.getUpdate();
  // Support both direct and $set updates
  const isDefault = update?.isDefault ?? update?.$set?.isDefault;
  if (isDefault) {
    const Model = this.model;
    const filter = this.getQuery();
    let excludeId = filter._id;
    // If _id is not present in filter, try to get from update
    if (!excludeId && update._id) excludeId = update._id;
    await Model.updateMany(
      { _id: { $ne: excludeId } },
      { $set: { isDefault: false } }
    );
  }
  next();
}

languageSchema.pre('findOneAndUpdate', unsetOtherDefaults);
languageSchema.pre('updateOne', unsetOtherDefaults);

export default model("Language", languageSchema);
