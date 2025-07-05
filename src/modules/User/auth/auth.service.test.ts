import * as authService from "./auth.service";
import UserModel from "../model";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendEmail from "@/common/utils/sendEmail";
import generateCode from "@/common/utils/codeGenerator";
import ApiError from "@/common/utils/api/ApiError";
import { Request } from "express";

jest.mock("../model");
jest.mock("jsonwebtoken");
jest.mock("bcryptjs");
jest.mock("crypto");
jest.mock("@/common/utils/sendEmail");
jest.mock("@/common/utils/codeGenerator");

describe("Auth Service", () => {
  let mockRequest: Partial<Request>;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = { body: {} };
    mockUser = {
      _id: "userId",
      name: "Test User",
      email: "test@example.com",
      password: "hashedPassword",
      phone: "1234567890",
      emailVerified: false,
      emailVerificationCode: "hashedEmailCode",
      emailVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      passwordResetCode: "hashedResetCode",
      passwordResetCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      passwordResetVerified: false,
      save: jest.fn().mockResolvedValue(true),
    };

    (UserModel.create as jest.Mock).mockResolvedValue(mockUser);
    (UserModel.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
    (UserModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
    (UserModel.findByIdAndDelete as jest.Mock).mockResolvedValue(true);

    (jwt.sign as jest.Mock).mockReturnValue("testToken");
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue("newHashedPassword");
    (crypto.createHash as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockImplementation((format) => `hashed${format === "hex" ? "Code" : ""}`),
    });
    (generateCode as jest.Mock).mockReturnValue("123456");
    (sendEmail as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    beforeEach(() => {
      mockRequest.body = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
      };
    });

    it("should register a new user and send verification email", async () => {
      const result = await authService.register(mockRequest as Request);
      expect(UserModel.create).toHaveBeenCalledWith(expect.objectContaining({ email: "test@example.com" }));
      expect(sendEmail).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalledWith({ id: "userId" }, process.env.JWT_SECRET, { expiresIn: "1d" });
      expect(result).toEqual({ user: mockUser, token: "testToken" });
    });

    it("should throw error if user creation fails", async () => {
      (UserModel.create as jest.Mock).mockResolvedValue(null);
      await expect(authService.register(mockRequest as Request)).rejects.toThrow(
        new ApiError("User not created", "INTERNAL_SERVER_ERROR")
      );
    });

    it("should throw error and delete user if email sending fails", async () => {
      (sendEmail as jest.Mock).mockRejectedValue(new Error("Email failed"));
      await expect(authService.register(mockRequest as Request)).rejects.toThrow(
        new ApiError("Failed to send verification email", "INTERNAL_SERVER_ERROR")
      );
      expect(UserModel.findByIdAndDelete).toHaveBeenCalledWith("userId");
    });
  });

  describe("login", () => {
    beforeEach(() => {
      mockRequest.body = { email: "test@example.com", password: "password123" };
    });

    it("should login a user and return a token", async () => {
      const result = await authService.login(mockRequest as Request);
      expect(UserModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashedPassword");
      expect(jwt.sign).toHaveBeenCalledWith({ id: "userId" }, process.env.JWT_SECRET, { expiresIn: "1d" });
      expect(result).toEqual({ user: mockUser, token: "testToken" });
    });

    it("should throw error if user not found", async () => {
      (UserModel.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await expect(authService.login(mockRequest as Request)).rejects.toThrow(
        new ApiError("User not found", "NOT_FOUND")
      );
    });

    it("should throw error if password incorrect", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(authService.login(mockRequest as Request)).rejects.toThrow(
        new ApiError("Invalid Credentials", "UNAUTHORIZED")
      );
    });
  });

  describe("verifyEmail", () => {
    beforeEach(() => {
      mockRequest.body = { email: "test@example.com", code: "123456" };
    });

    it("should verify email successfully", async () => {
      const result = await authService.verifyEmail(mockRequest as Request);
      expect(UserModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
        emailVerificationCode: "hashedCode",
        emailVerificationCodeExpires: { $gt: expect.any(Date) },
      });
      expect(mockUser.emailVerified).toBe(true);
      expect(mockUser.emailVerificationCode).toBeUndefined();
      expect(mockUser.emailVerificationCodeExpires).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({ message: "Email verified successfully" });
    });

    it("should throw error for invalid or expired code", async () => {
      (UserModel.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await expect(authService.verifyEmail(mockRequest as Request)).rejects.toThrow(
        new ApiError("Invalid or expired verification code", "UNAUTHORIZED")
      );
    });
  });

  describe("resendEmailVerificationCode", () => {
     beforeEach(() => {
      mockRequest.body = { email: "test@example.com" };
      mockUser.emailVerified = false;
      mockUser.emailVerificationCode = "oldHashedCode";
      mockUser.emailVerificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
    });

    it("should resend email verification code", async () => {
      const result = await authService.resendEmailVerificationCode(mockRequest as Request);
      expect(UserModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(generateCode).toHaveBeenCalledWith(6);
      expect(crypto.createHash).toHaveBeenCalledWith("sha256");
      expect(mockUser.emailVerificationCode).toBe("hashedCode");
      expect(mockUser.emailVerificationCodeExpires).toBeInstanceOf(Date);
      expect(mockUser.save).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
      expect(result).toEqual({ message: "Verification code resent" });
    });

    it("should throw error if user not found", async () => {
      (UserModel.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await expect(authService.resendEmailVerificationCode(mockRequest as Request)).rejects.toThrow(
        new ApiError("User not found", "NOT_FOUND")
      );
    });

    it("should throw error if email already verified", async () => {
      mockUser.emailVerified = true;
      await expect(authService.resendEmailVerificationCode(mockRequest as Request)).rejects.toThrow(
        new ApiError("Email already verified", "BAD_REQUEST")
      );
    });
     it("should throw error if no verification in progress", async () => {
      mockUser.emailVerificationCode = null;
      mockUser.emailVerificationCodeExpires = null;
      await expect(authService.resendEmailVerificationCode(mockRequest as Request)).rejects.toThrow(
        new ApiError("No verification in progress. Please register again.", "BAD_REQUEST")
      );
    });
  });

  describe("forgotPassword", () => {
    beforeEach(() => {
      mockRequest.body = { email: "test@example.com" };
    });

    it("should send password reset code", async () => {
      await authService.forgotPassword(mockRequest as Request);
      expect(UserModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(generateCode).toHaveBeenCalledWith(6);
      expect(crypto.createHash).toHaveBeenCalledWith("sha256");
      expect(mockUser.passwordResetCode).toBe("hashedCode");
      expect(mockUser.passwordResetVerified).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });

    it("should throw error if user not found", async () => {
      (UserModel.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await expect(authService.forgotPassword(mockRequest as Request)).rejects.toThrow(
        new ApiError("User not found", "NOT_FOUND")
      );
    });

    it("should cleanup and throw error if email sending fails", async () => {
      (sendEmail as jest.Mock).mockRejectedValue(new Error("Email failed"));
      await expect(authService.forgotPassword(mockRequest as Request)).rejects.toThrow(
         new ApiError("Failed to send email", "INTERNAL_SERVER_ERROR")
      );
      expect(mockUser.passwordResetCode).toBeUndefined();
      expect(mockUser.passwordResetCodeExpires).toBeUndefined();
      expect(mockUser.passwordResetVerified).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalledTimes(2); // once for setting, once for cleanup
    });
  });

  describe("verifyResetCode", () => {
    beforeEach(() => {
      mockRequest.body = { email: "test@example.com", code: "123456" };
    });

    it("should verify reset code successfully", async () => {
      await authService.verifyResetCode(mockRequest as Request);
      expect(UserModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
        passwordResetCode: "hashedCode",
        passwordResetCodeExpires: { $gt: expect.any(Date) },
      });
      expect(mockUser.passwordResetVerified).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should throw error for invalid or expired code", async () => {
      (UserModel.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await expect(authService.verifyResetCode(mockRequest as Request)).rejects.toThrow(
        new ApiError("Invalid reset code or expired", "UNAUTHORIZED")
      );
    });
  });

  describe("resetPassword", () => {
    beforeEach(() => {
      mockRequest.body = { email: "test@example.com", newPassword: "newPassword123" };
      mockUser.passwordResetVerified = true; // Assume code was verified
    });

    it("should reset password successfully", async () => {
      const result = await authService.resetPassword(mockRequest as Request);
      expect(UserModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(mockUser.password).toBe("newPassword123"); // Assuming direct set, not hash mock for this part
      expect(mockUser.passwordResetCode).toBeUndefined();
      expect(mockUser.passwordResetVerified).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalledWith({ id: "userId" }, process.env.JWT_SECRET, { expiresIn: "1d" });
      expect(result).toEqual({ token: "testToken" });
    });

    it("should throw error if user not found", async () => {
      (UserModel.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await expect(authService.resetPassword(mockRequest as Request)).rejects.toThrow(
        new ApiError("User not found", "NOT_FOUND")
      );
    });

    it("should throw error if reset code not verified", async () => {
      mockUser.passwordResetVerified = false;
      await expect(authService.resetPassword(mockRequest as Request)).rejects.toThrow(
        new ApiError("Reset code not verified", "UNAUTHORIZED")
      );
    });
  });

  describe("resendPasswordResetCode", () => {
    beforeEach(() => {
      mockRequest.body = { email: "test@example.com" };
      mockUser.passwordResetCode = "oldHashedCode";
      mockUser.passwordResetCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
      mockUser.passwordResetVerified = false;
    });

    it("should resend password reset code", async () => {
      const result = await authService.resendPasswordResetCode(mockRequest as Request);
      expect(UserModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(generateCode).toHaveBeenCalledWith(6);
      expect(crypto.createHash).toHaveBeenCalledWith("sha256");
      expect(mockUser.passwordResetCode).toBe("hashedCode");
      expect(mockUser.passwordResetCodeExpires).toBeInstanceOf(Date);
      expect(mockUser.passwordResetVerified).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
      expect(result).toEqual({ message: "Password reset code resent" });
    });

    it("should throw error if user not found", async () => {
        (UserModel.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
        await expect(authService.resendPasswordResetCode(mockRequest as Request)).rejects.toThrow(
            new ApiError("User not found", "NOT_FOUND")
        );
    });

    it("should throw error if no password reset in progress", async () => {
        mockUser.passwordResetCode = null;
        mockUser.passwordResetCodeExpires = null;
        await expect(authService.resendPasswordResetCode(mockRequest as Request)).rejects.toThrow(
            new ApiError("No password reset in progress. Please request a reset first.", "BAD_REQUEST")
        );
    });
  });
});
