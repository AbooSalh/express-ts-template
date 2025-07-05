import { Document, ObjectId } from "mongoose";

export interface UserDocument extends Document {
  _id: ObjectId | string;
  name: string;
  email: string;
  role: "user" | "admin";
  phone: string;
  image: string;
  password: string;
  passwordChangedAt: Date;
  slug?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}
