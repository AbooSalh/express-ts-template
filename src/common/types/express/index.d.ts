import { Document, ObjectId } from "mongoose";
export type UserRole = "public" | "user" | "admin";
export interface UserDocument extends Document {
  _id: ObjectId | string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  image: string;
  password: string;
  passwordChangedAt: Date;
  slug?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}
