/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from "mongoose";
import slugify from "slugify";

export const addSlugMiddleware = (schema: Schema, field: string) => {
  // Helper function to generate unique slug
  const generateUniqueSlug = async (
    model: any,
    baseSlug: string,
    docId?: any
  ): Promise<string> => {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      // Check if slug exists (excluding current document if updating)
      const existingDoc = await model
        .findOne({ slug, ...(docId && { _id: { $ne: docId } }) })
        .lean();
      
      if (!existingDoc) {
        return slug; // Slug is unique
      }
      
      // Generate new slug with counter
      slug = `${baseSlug}-${counter}`;
      counter++;
      
      // Safety check to prevent infinite loop
      if (counter > 100) {
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    return slug;
  };

  // Middleware for "save"
  schema.pre("save", async function (next) {
    const doc = this as Record<string, any>; // Explicitly cast `this` to a generic object
    if (doc.isModified(field)) {
      const baseSlug = slugify(doc[field] as string, { lower: true, strict: true });
      doc.slug = await generateUniqueSlug(this.constructor, baseSlug, doc._id);
    }
    next();
  });

  // Middleware for "findOneAndUpdate"
  schema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate() as {
      $set?: Record<string, any>; // Define `$set` as a generic object
    };

    if (update.$set?.[field]) {
      const baseSlug = slugify(update.$set[field] as string, {
        lower: true,
        strict: true,
      });
      const docId = this.getQuery()._id;
      update.$set.slug = await generateUniqueSlug(this.model, baseSlug, docId);
    }
    next();
  });
};
