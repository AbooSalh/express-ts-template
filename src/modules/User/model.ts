
import { addSlugMiddleware } from "@/common/middleware/mongoose/addSlugMiddleware";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = new mongoose.Schema(
  {
    deleteAccountCode: {
      type: String,
      select: false,
    },
    deleteAccountCodeExpires: {
      type: Date,
      select: false,
    },
    name: { type: String, trim: true, required: [true, "Name is required"] },
    slug: {
      type: String,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: [true, "Email must be unique"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetCode: {
      type: String,
      select: false,
    },
    passwordResetCodeExpires: {
      type: Date,
      select: false,
    },
    passwordResetVerified: {
      type: Boolean,
      default: undefined,
      select: false,
    },
    emailVerificationCode: {
      type: String,
      select: false,
    },
    emailVerificationCodeExpires: {
      type: Date,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      select: false,
    },
    
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    addresses: [
      {
        id: mongoose.Schema.Types.ObjectId,
        alias: String,
        details: String,
        phone: String,
        city: String,
        postalCode: String,
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);
addSlugMiddleware(userSchema, "name");

// TTL index: auto-remove unverified users after code expires
userSchema.index(
  { emailVerificationCodeExpires: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { emailVerified: false } }
);
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
const UserModel = mongoose.model("User", userSchema);
export default UserModel;

export type UserModel = typeof userSchema;

export interface IUserAddress {
  _id: mongoose.Types.ObjectId;
  alias?: string;
  details?: string;
  phone?: string;
  city?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface IUser {
  _id?: mongoose.Types.ObjectId;
  name: string;
  slug?: string;
  email: string;
  password: string;
  passwordChangedAt?: Date;
  passwordResetCode?: string;
  passwordResetCodeExpires?: Date;
  passwordResetVerified?: boolean;
  role?: "user" | "admin";
  wishlist?: mongoose.Types.ObjectId[];
  addresses?: IUserAddress[];
  usedCoupons?: mongoose.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type IUserDocument = IUser & mongoose.Document;
