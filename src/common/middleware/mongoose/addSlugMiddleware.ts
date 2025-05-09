/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from "mongoose";
import slugify from "slugify";

export const addSlugMiddleware = (schema: Schema, field: string) => {
  // Middleware for "save"
  schema.pre("save", function (next) {
    const doc = this as Record<string, any>; // Explicitly cast `this` to a generic object
    if (doc.isModified(field)) {
      doc.slug = slugify(doc[field] as string, { lower: true, strict: true }); // Ensure `field` is treated as a string
    }
    next();
  });

  // Middleware for "findOneAndUpdate"
  schema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate() as {
      $set?: Record<string, any>; // Define `$set` as a generic object
    };

    if (update.$set?.[field]) {
      update.$set.slug = slugify(update.$set[field] as string, {
        lower: true,
        strict: true,
      });
    }
    next();
  });
};
