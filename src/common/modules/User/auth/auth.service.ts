import { Request } from "express";
import UserModel from "../model";
import ApiError from "@/common/utils/api/ApiError";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import generateSecureCode from "@/common/utils/codeGenerator";
import sendEmail from "@/common/utils/sendEmail";
import {
  resetPasswordTemplate,
  emailVerificationTemplate,
} from "@/common/utils/emailTemplates";
import crypto from "crypto";
import {
  createSecureToken,
  createRefreshToken,
  verifySecureToken,
} from "@/common/utils/jwtConfig";
import logger from "@/common/utils/logger";

// Helper function to save refresh token
const saveRefreshToken = async (
  userId: string,
  refreshToken: string,
  req: Request
) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const deviceInfo = req.headers["user-agent"] || "Unknown Device";
  const ipAddress = req.ip || req.socket.remoteAddress || "Unknown IP";

  await UserModel.findByIdAndUpdate(userId, {
    $push: {
      refreshTokens: {
        token: refreshToken,
        expiresAt,
        deviceInfo,
        ipAddress,
      },
    },
  });
};

// Helper function to remove expired refresh tokens
const cleanupExpiredTokens = async (userId: string) => {
  await UserModel.findByIdAndUpdate(userId, {
    $pull: {
      refreshTokens: {
        expiresAt: { $lt: new Date() },
      },
    },
  });
};

// RESEND EMAIL VERIFICATION CODE
export const resendEmailVerificationCode = async (req: Request) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email }).select(
    "+emailVerified +emailVerificationCode +emailVerificationCodeExpires"
  );
  if (!user) throw new ApiError("Invalid credentials", "UNAUTHORIZED");
  if (user.emailVerified)
    throw new ApiError("Email already verified", "BAD_REQUEST");
  console.log(
    user.emailVerificationCode,
    user.emailVerificationCodeExpires,
    user
  );
  // Only allow resend if user is in a verification flow (code/expiry not null)
  if (!user.emailVerificationCode || !user.emailVerificationCodeExpires) {
    throw new ApiError(
      "No verification in progress. Please register again.",
      "BAD_REQUEST"
    );
  }

  const code = generateSecureCode(16);
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  user.emailVerificationCode = hashedCode;
  user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Verify Your Email",
    html: await emailVerificationTemplate(code),
  });
  return { message: "Verification code resent" };
};

// RESEND PASSWORD RESET CODE
export const resendPasswordResetCode = async (req: Request) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email }).select(
    "+passwordResetCode +passwordResetCodeExpires +passwordResetVerified"
  );
  if (!user) throw new ApiError("Invalid credentials", "UNAUTHORIZED");

  // Only allow resend if user is in a reset flow (code/expiry not null)
  if (!user.passwordResetCode || !user.passwordResetCodeExpires) {
    throw new ApiError(
      "No password reset in progress. Please request a reset first.",
      "BAD_REQUEST"
    );
  }

  const code = generateSecureCode(16);
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  user.passwordResetCode = hashedCode;
  user.passwordResetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.passwordResetVerified = false;
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Reset Password Code",
      html: await resetPasswordTemplate(code),
    });
  } catch {
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpires = undefined;
    user.passwordResetVerified = undefined;
    await user.save();
    throw new ApiError("Failed to send email", "INTERNAL_SERVER_ERROR");
  }
  return { message: "Password reset code resent" }; // Added return statement
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
  return createSecureToken(payload);
};

export const register = async (req: Request) => {
  const { name, email, password, phone } = req.body;

  // Check if user already exists
  const existingUser = await UserModel.findOne({ email }).select(
    "+emailVerified +emailVerificationCode +emailVerificationCodeExpires"
  );

  if (existingUser) {
    // If email is already verified, don't allow registration
    if (existingUser.emailVerified) {
      throw new ApiError(
        "Registration failed. Please try again later.",
        "BAD_REQUEST"
      );
    }

    // If email exists but not verified, allow re-registration
    // This prevents user enumeration while allowing legitimate re-registration
    logger.info("User re-registering with unverified email", {
      email,
      userId: existingUser._id,
    });
  }

  // Generate verification code
  const code = generateSecureCode(16);
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  // Create or update user
  const userData = {
    name,
    email,
    password,
    phone,
    emailVerificationCode: hashedCode,
    emailVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    emailVerified: false,
  };

  let user;
  if (existingUser) {
    // Update existing user with new verification code
    Object.assign(existingUser, userData);
    user = await existingUser.save();
  } else {
    // Create new user
    user = await UserModel.create(userData);
  }

  try {
    await sendEmail({
      to: user.email,
      subject: "Verify Your Email",
      html: await emailVerificationTemplate(code),
    });
  } catch (error) {
    // If email fails, clean up the user
    if (!existingUser) {
      await UserModel.findByIdAndDelete(user._id);
    }
    logger.error("Failed to send verification email", {
      email: user.email,
      error: error,
    });
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

  // Always perform the same operations to prevent timing attacks
  const userWithPassword = await UserModel.findOne({ email }).select(
    "+password +emailVerified"
  );

  // Use a dummy password hash for comparison if user doesn't exist
  const dummyHash = await bcrypt.hash("dummy", 10);
  const actualHash = userWithPassword?.password || dummyHash;

  // Always perform password comparison
  const isPasswordCorrect = await bcrypt.compare(password, actualHash);

  // Check if user exists and password is correct
  if (!userWithPassword || !isPasswordCorrect) {
    throw new ApiError("Invalid credentials", "UNAUTHORIZED");
  }

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
  if (!user)
    throw new ApiError("Internal server error", "INTERNAL_SERVER_ERROR");

  const accessToken = createToken({ id: user._id });
  const refreshToken = createRefreshToken({ id: user._id });

  // Save refresh token to database
  await saveRefreshToken(user._id.toString(), refreshToken, req);

  // Clean up expired tokens
  await cleanupExpiredTokens(user._id.toString());

  return { user, accessToken, refreshToken };
};

export const forgotPassword = async (req: Request) => {
  const { email } = req.body;
  // Select all password reset fields for update
  const user = await UserModel.findOne({ email }).select(
    "+passwordResetCode +passwordResetCodeExpires +passwordResetVerified"
  );
  if (!user) throw new ApiError("Invalid credentials", "UNAUTHORIZED");

  const code = generateSecureCode(16);
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  user.passwordResetCode = hashedCode;
  user.passwordResetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  user.passwordResetVerified = false;
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Reset Password Code",
      html: await resetPasswordTemplate(code),
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
  if (!user) throw new ApiError("Invalid credentials", "UNAUTHORIZED");

  if (!user.passwordResetVerified) {
    throw new ApiError("Reset code not verified", "UNAUTHORIZED");
  }

  user.password = req.body.newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetCodeExpires = undefined;
  user.passwordResetVerified = undefined;
  await user.save();

  const accessToken = createToken({ id: user._id });
  const refreshToken = createRefreshToken({ id: user._id });

  // Save refresh token to database
  await saveRefreshToken(user._id.toString(), refreshToken, req);

  return { accessToken, refreshToken };
};

// REFRESH TOKEN ENDPOINT
export const refreshToken = async (req: Request) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new ApiError("Refresh token is required", "BAD_REQUEST");
  }

  try {
    // Verify the refresh token
    const decoded = verifySecureToken(token) as jwt.JwtPayload & { id: string };

    // Find user and check if refresh token exists in database
    const user = await UserModel.findById(decoded.id).select(
      "+refreshTokens +emailVerified"
    );
    if (!user) {
      throw new ApiError("Invalid refresh token", "UNAUTHORIZED");
    }

    // Check if refresh token exists in user's refresh tokens
    const tokenExists = user.refreshTokens?.some(
      (rt: any) => rt.token === token && rt.expiresAt > new Date()
    );

    if (!tokenExists) {
      throw new ApiError("Invalid or expired refresh token", "UNAUTHORIZED");
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new ApiError("Email must be verified", "FORBIDDEN");
    }

    // Generate new tokens
    const newAccessToken = createToken({ id: user._id });
    const newRefreshToken = createRefreshToken({ id: user._id });

    // Remove old refresh token and add new one in separate operations
    // First remove the old token
    await UserModel.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: { token } },
    });

    // Then add the new token
    await UserModel.findByIdAndUpdate(user._id, {
      $push: {
        refreshTokens: {
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deviceInfo: req.headers["user-agent"] || "Unknown Device",
          ipAddress: req.ip || req.socket.remoteAddress || "Unknown IP",
        },
      },
    });

    // Clean up expired tokens
    await cleanupExpiredTokens(user._id.toString());

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError("Invalid refresh token", "UNAUTHORIZED");
    }
    throw error;
  }
};

// LOGOUT ENDPOINT (revoke refresh token)
export const logout = async (req: Request) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new ApiError("Refresh token is required", "BAD_REQUEST");
  }

  try {
    // Verify the refresh token to get user ID
    const decoded = verifySecureToken(token) as jwt.JwtPayload & { id: string };

    // Remove the refresh token from database
    await UserModel.findByIdAndUpdate(decoded.id, {
      $pull: { refreshTokens: { token } },
    });

    return { message: "Logged out successfully" };
  } catch {
    // Even if token is invalid, return success to prevent token enumeration
    return { message: "Logged out successfully" };
  }
};

// GET USER SESSIONS (list all active refresh tokens)
export const getUserSessions = async (req: Request) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError("User not found", "UNAUTHORIZED");
  }

  const user = await UserModel.findById(userId).select("+refreshTokens");
  if (!user) {
    throw new ApiError("User not found", "UNAUTHORIZED");
  }

  // Clean up expired tokens first
  await cleanupExpiredTokens((userId as string).toString());

  // Get updated user with cleaned tokens
  const updatedUser = await UserModel.findById(userId).select("+refreshTokens");

  const sessions =
    updatedUser?.refreshTokens?.map((rt: any) => ({
      id: rt._id,
      deviceInfo: rt.deviceInfo,
      ipAddress: rt.ipAddress,
      createdAt: rt.createdAt,
      expiresAt: rt.expiresAt,
    })) || [];

  return { sessions };
};

// REVOKE SPECIFIC SESSION
export const revokeSession = async (req: Request) => {
  const userId = req.user?._id;
  const { sessionId } = req.params;

  if (!userId) {
    throw new ApiError("User not found", "UNAUTHORIZED");
  }

  const result = await UserModel.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { _id: sessionId } },
  });

  if (!result) {
    throw new ApiError("Session not found", "NOT_FOUND");
  }

  return { message: "Session revoked successfully" };
};
