import * as userService from "./user.service";
import UserModel from "./model";
import sendEmail from "@/common/utils/sendEmail";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import ApiError from "@/common/utils/api/ApiError";
import ApiSuccess from "@/common/utils/api/ApiSuccess";
import { Request, Response } from "express";

jest.mock("./model");
jest.mock("@/common/utils/sendEmail");
jest.mock("bcryptjs");
jest.mock("crypto");

import { UserDocument } from "@/common/types/express";

describe("User Service", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockUser: any; // This is the general mock for UserModel responses
  let mockUserDocument: Partial<UserDocument>; // This is for req.user

  beforeEach(() => {
    // Mock for req.user
    mockUserDocument = {
      _id: "userId",
      name: "Test User",
      email: "test@example.com",
      role: "user",
      phone: "1234567890",
      image: "test.jpg",
      password: "hashedPassword", // This is the user's actual password, should be selected if needed
      passwordChangedAt: new Date(),
      // other fields from UserDocument as needed by tests, or keep as Partial
      save: jest.fn().mockResolvedValue(true) as unknown as UserDocument['save'], // Mock save if called on req.user
    };

    mockRequest = {
      user: mockUserDocument as UserDocument, // Cast to UserDocument
      body: {},
    };
    mockResponse = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    ApiSuccess.send = jest.fn(); // Mock ApiSuccess.send

    mockUser = {
      _id: "userId",
      email: "test@example.com",
      emailVerified: true,
      save: jest.fn().mockResolvedValue(true),
      password: "hashedPassword",
      deleteAccountCode: "hashedCode",
      deleteAccountCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
    };
    (UserModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
    (UserModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    // Refined mock for findByIdAndUpdate to be thenable and support .select()
    const mockQuery = {
      select: jest.fn().mockReturnThis(), // Allows chaining .select()
      // Make it "thenable" so await works directly or after .select()
      then: jest.fn(function(onFulfilled, onRejected) {
        return Promise.resolve(onFulfilled(mockUser));
      }),
      // Jest's mockClear needs to be available if we clear it
      mockClear: jest.fn(),
    };
    (UserModel.findByIdAndUpdate as jest.Mock).mockImplementation(() => mockQuery);

    (UserModel.findByIdAndDelete as jest.Mock).mockResolvedValue(true);
    (crypto.createHash as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue("hashedCode"),
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue("newHashedPassword");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("sendDeleteAccountCode", () => {
    it("should send a delete account code if user is found and email is verified", async () => {
      await userService.sendDeleteAccountCode(
        mockRequest as Request,
        mockResponse as Response
      );
      expect(UserModel.findById).toHaveBeenCalledWith("userId");
      expect(mockUser.save).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
      expect(ApiSuccess.send).toHaveBeenCalledWith(
        mockResponse,
        "OK",
        "Verification code sent to your email"
      );
    });

    it("should throw an error if user is not found or email not verified", async () => {
      (UserModel.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      await expect(
        userService.sendDeleteAccountCode(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow(new ApiError("Unauthorized", "UNAUTHORIZED"));
    });
  });

  describe("deleteAccount", () => {
    beforeEach(() => {
      mockRequest.body = {
        code: "123456",
        email: "test@example.com",
        password: "password",
      };
    });

    it("should delete the account if code, email, and password are correct", async () => {
      await userService.deleteAccount(
        mockRequest as Request,
        mockResponse as Response
      );
      expect(UserModel.findById).toHaveBeenCalledWith("userId");
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password",
        "hashedPassword"
      );
      expect(crypto.createHash).toHaveBeenCalledWith("sha256");
      expect(UserModel.findByIdAndDelete).toHaveBeenCalledWith("userId");
      expect(ApiSuccess.send).toHaveBeenCalledWith(
        mockResponse,
        "OK",
        "Account deleted successfully"
      );
    });

    it("should throw an error if user not found", async () => {
      (UserModel.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      await expect(
        userService.deleteAccount(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow(new ApiError("User not found", "UNAUTHORIZED"));
    });

    it("should throw an error if email does not match", async () => {
      mockRequest.body.email = "wrong@example.com";
      await expect(
        userService.deleteAccount(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow(
        new ApiError("Email does not match authenticated user", "UNAUTHORIZED")
      );
    });

    it("should throw an error if password does not match", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        userService.deleteAccount(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow(new ApiError("Incorrect password", "UNAUTHORIZED"));
    });
     it("should throw an error if no verification code found", async () => {
      mockUser.deleteAccountCode = null;
      await expect(
        userService.deleteAccount(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(new ApiError("No verification code found", "BAD_REQUEST"));
    });

    it("should throw an error if verification code expired", async () => {
      mockUser.deleteAccountCodeExpires = new Date(Date.now() - 10 * 60 * 1000); // Expired
      await expect(
        userService.deleteAccount(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(new ApiError("Verification code expired", "BAD_REQUEST"));
    });

    it("should throw an error if verification code is invalid", async () => {
      (crypto.createHash as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue("wrongHashedCode"),
      });
      await expect(
        userService.deleteAccount(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(new ApiError("Invalid verification code", "BAD_REQUEST"));
    });
  });

  describe("changePassword", () => {
    beforeEach(() => {
      mockRequest.body = { newPassword: "newPassword123" };
    });

    it("should change the password successfully", async () => {
      await userService.changePassword(
        mockRequest as Request,
        mockResponse as Response
      );
      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId",
        {
          $set: {
            password: "newHashedPassword",
            passwordChangedAt: expect.any(Number),
          },
        },
        { new: true, runValidators: true }
      );
      expect(ApiSuccess.send).toHaveBeenCalledWith(
        mockResponse,
        "OK",
        "Password updated successfully",
        mockUser
      );
    });

    it("should throw an error if user not found", async () => {
      mockRequest.user = undefined; // Simulate user not found in request
      await expect(
        userService.changePassword(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow(new ApiError("User not found", "UNAUTHORIZED"));
    });

    it("should throw an error if findByIdAndUpdate fails", async () => {
      (UserModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      await expect(
        userService.changePassword(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow(new ApiError("Not found", "NOT_FOUND"));
    });
  });

  describe("getProfile", () => {
    let mockNext: jest.Mock;
    beforeEach(()=> {
      mockNext = jest.fn();
      mockRequest.params = {};
    })
    it("should set req.params.id and call next", async () => {
      await userService.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockRequest.params!.id).toBe("userId");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should throw an error if user not found in request", async () => {
      mockRequest.user = undefined;
       await expect(
        userService.getProfile(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow(new ApiError("User not found", "UNAUTHORIZED"));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("updateAuthUser", () => {
    beforeEach(() => {
      mockRequest.body = { name: "New Name" };
    });

    it("should update authenticated user successfully", async () => {
      await userService.updateAuthUser(
        mockRequest as Request,
        mockResponse as Response
      );
      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId",
        { name: "New Name" },
        { new: true }
      );
      expect(ApiSuccess.send).toHaveBeenCalledWith(
        mockResponse,
        "OK",
        "User updated successfully",
        mockUser
      );
    });

    it("should throw an error if findByIdAndUpdate fails", async () => {
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
      await expect(
        userService.updateAuthUser(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow(new ApiError("User not found", "NOT_FOUND"));
    });
  });
});
