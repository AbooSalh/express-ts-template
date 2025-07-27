import { Request } from "express";
import UserModel from "../model";
import ApiError from "@/common/utils/api/ApiError";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import generateCode from "@/common/utils/codeGenerator";
import sendEmail from "@/common/utils/sendEmail";
import {
  resetPasswordTemplate,
  emailVerificationTemplate,
} from "@/common/utils/emailTemplates";
import crypto from "crypto";
// RESEND EMAIL VERIFICATION CODE
export const resendEmailVerificationCode = async (req: Request) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email }).select("+emailVerified");
  if (!user) throw new ApiError("User not found", "NOT_FOUND");
  if (user.emailVerified)
    throw new ApiError("Email already verified", "BAD_REQUEST");

  // Only allow resend if user is in a verification flow (code/expiry not null)
  if (!user.emailVerificationCode || !user.emailVerificationCodeExpires) {
    throw new ApiError(
      "No verification in progress. Please register again.",
      "BAD_REQUEST"
    );
  }

  const code = generateCode(6);
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  user.emailVerificationCode = hashedCode;
  user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Verify Your Email",
    html: emailVerificationTemplate(code),
  });
  return { message: "Verification code resent" };
};

// RESEND PASSWORD RESET CODE
export const resendPasswordResetCode = async (req: Request) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email }).select(
    "+passwordResetCode +passwordResetCodeExpires +passwordResetVerified"
  );
  if (!user) throw new ApiError("User not found", "NOT_FOUND");

  // Only allow resend if user is in a reset flow (code/expiry not null)
  if (!user.passwordResetCode || !user.passwordResetCodeExpires) {
    throw new ApiError(
      "No password reset in progress. Please request a reset first.",
      "BAD_REQUEST"
    );
  }

  const code = generateCode(6);
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  user.passwordResetCode = hashedCode;
  user.passwordResetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.passwordResetVerified = false;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Reset Password Code",
    html: resetPasswordTemplate(code),
  });
  return { message: "Password reset code resent" };
};
export const verifyEmail = async (req: Request) => {
  const { email, code } = req.body;
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  // Select hidden fields for verification
  const user = await UserModel.findOne({
    email,
    emailVerificationCode: hashedCode,
    emailVerificationCodeExpires: { $gt: new Date() },
  }).select(
    "+emailVerificationCode +emailVerificationCodeExpires +emailVerified"
  );
  if (!user)
    throw new ApiError("Invalid or expired verification code", "UNAUTHORIZED");
  user.emailVerified = true;
  user.emailVerificationCode = undefined;
  user.emailVerificationCodeExpires = undefined;
  await user.save();
  return { message: "Email verified successfully" };
};

const createToken = (payload: jwt.JwtPayload) => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "1d",
  });
};

export const register = async (req: Request) => {
  const { name, email, password, phone } = req.body;

  // Generate email verification code
  const code = generateCode(6);
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  const newUser = await UserModel.create({
    name,
    email,
    password,
    phone,
    emailVerificationCode: hashedCode,
    emailVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    emailVerified: false,
  });
  if (!newUser) throw new ApiError("User not created", "INTERNAL_SERVER_ERROR");

  // Send verification email
  try {
    await sendEmail({
      to: newUser.email,
      subject: "Verify Your Email",
      html: emailVerificationTemplate(code),
    });
  } catch {
    // If email fails, clean up user
    await UserModel.findByIdAndDelete(newUser._id);
    throw new ApiError(
      "Failed to send verification email",
      "INTERNAL_SERVER_ERROR"
    );
  }

  // Do NOT return user or token, just a message
  return "Verification code sent to your email. Please verify to activate your account.";
};

export const login = async (req: Request) => {
  const { email, password } = req.body;
  // Explicitly select password and emailVerified for authentication
  const userWithPassword = await UserModel.findOne({ email }).select(
    "+password +emailVerified"
  );
  if (!userWithPassword) throw new ApiError("User not found", "NOT_FOUND");

  const isPasswordCorrect = await bcrypt.compare(
    password,
    userWithPassword.password
  );
  if (!isPasswordCorrect)
    throw new ApiError("Invalid Credentials", "UNAUTHORIZED");

  // Check if email is verified
  if (!userWithPassword.emailVerified) {
    throw new ApiError(
      "Email must be verified before login - go check your mailbox",
      "FORBIDDEN"
    );
  }

  const user = await UserModel.findById(userWithPassword._id).select(
    "-password"
  );
  if (!user) throw new ApiError("User not found", "INTERNAL_SERVER_ERROR");

  const token = createToken({ id: user._id });
  return { user, token };
};

export const forgotPassword = async (req: Request) => {
  const { email } = req.body;
  // Select all password reset fields for update
  const user = await UserModel.findOne({ email }).select(
    "+passwordResetCode +passwordResetCodeExpires +passwordResetVerified"
  );
  if (!user) throw new ApiError("User not found", "NOT_FOUND");

  const code = generateCode(6);
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  user.passwordResetCode = hashedCode;
  user.passwordResetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  user.passwordResetVerified = false;
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Reset Password Code",
      html: resetPasswordTemplate(code),
    });
  } catch {
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpires = undefined;
    user.passwordResetVerified = undefined;
    await user.save();
    throw new ApiError("Failed to send email", "INTERNAL_SERVER_ERROR");
  }
};

export const verifyResetCode = async (req: Request) => {
  const hashedCode = crypto
    .createHash("sha256")
    .update(req.body.code)
    .digest("hex");
  // Select all password reset fields for update
  const user = await UserModel.findOne({
    email: req.body.email,
    passwordResetCode: hashedCode,
    passwordResetCodeExpires: { $gt: new Date() },
  }).select(
    "+passwordResetCode +passwordResetCodeExpires +passwordResetVerified"
  );

  if (!user)
    throw new ApiError("Invalid reset code or expired", "UNAUTHORIZED");

  user.passwordResetVerified = true;
  await user.save();
};

export const resetPassword = async (req: Request) => {
  // Select all password reset fields for validation and update
  const user = await UserModel.findOne({ email: req.body.email }).select(
    "+passwordResetCode +passwordResetCodeExpires +passwordResetVerified"
  );
  if (!user) throw new ApiError("User not found", "NOT_FOUND");

  if (!user.passwordResetVerified) {
    throw new ApiError("Reset code not verified", "UNAUTHORIZED");
  }

  user.password = req.body.newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetCodeExpires = undefined;
  user.passwordResetVerified = undefined;
  await user.save();

  const token = createToken({ id: user._id });
  return { token };
};
