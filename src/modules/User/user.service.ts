import crypto from "crypto";
import sendEmail from "@/common/utils/sendEmail";
import { emailVerificationTemplate } from "@/common/utils/emailTemplates";
import { Request, Response, NextFunction } from "express";
import UserModel from "./model";
import ApiError from "@/common/utils/api/ApiError";
import bcrypt from "bcryptjs";
import ApiSuccess from "@/common/utils/api/ApiSuccess";
// Step 1: Send code for account deletion
export const sendDeleteAccountCode = async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.user?._id).select(
    "email emailVerified"
  );
  if (!user || !user.emailVerified)
    throw new ApiError("Unauthorized", "UNAUTHORIZED");
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  user.deleteAccountCode = hashedCode;
  user.deleteAccountCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendEmail({
    to: user.email,
    subject: "Delete Account Verification Code",
    html: emailVerificationTemplate(code),
  });
  return ApiSuccess.send(res, "OK", "Verification code sent to your email");
};

// Step 2: Verify code and delete account
export const deleteAccount = async (req: Request, res: Response) => {
  const { code, email, password } = req.body;
  // Find user by id and select password and deleteAccountCode fields
  const user = await UserModel.findById(req.user?._id).select(
    "+password +deleteAccountCode +deleteAccountCodeExpires email"
  );
  if (!user) throw new ApiError("User not found", "UNAUTHORIZED");
  if (user.email !== email)
    throw new ApiError(
      "Email does not match authenticated user",
      "UNAUTHORIZED"
    );
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError("Incorrect password", "UNAUTHORIZED");
  if (!user.deleteAccountCode || !user.deleteAccountCodeExpires)
    throw new ApiError("No verification code found", "BAD_REQUEST");
  if (user.deleteAccountCodeExpires < new Date())
    throw new ApiError("Verification code expired", "BAD_REQUEST");
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  if (hashedCode !== user.deleteAccountCode)
    throw new ApiError("Invalid verification code", "BAD_REQUEST");
  await UserModel.findByIdAndDelete(user._id);
  return ApiSuccess.send(res, "OK", "Account deleted successfully");
};


export const changePassword = async (req: Request, res: Response) => {
  const id = req.user?._id;
  if (!id) {
    throw new ApiError("User not found", "UNAUTHORIZED");
  }
  const { newPassword } = req.body;
  const result = await UserModel.findByIdAndUpdate(
    id,
    {
      $set: {
        password: await bcrypt.hash(newPassword, 10),
        passwordChangedAt: Date.now(),
      },
    },
    { new: true, runValidators: true }
  ).select("-password");

  if (!result) {
    throw new ApiError("Not found", "NOT_FOUND");
  }
  return ApiSuccess.send(res, "OK", "Password updated successfully", result);
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?._id) {
    throw new ApiError("User not found", "UNAUTHORIZED");
  }
  req.params.id = req.user._id.toString();
  next();
};

export const updateAuthUser = async (req: Request, res: Response) => {
  const updatedUser = await UserModel.findByIdAndUpdate(
    req.user?._id,
    {
      name: req.body.name,
    },
    { new: true }
  );

  if (!updatedUser) {
    throw new ApiError("User not found", "NOT_FOUND");
  }
  return ApiSuccess.send(res, "OK", "User updated successfully", updatedUser);
};
