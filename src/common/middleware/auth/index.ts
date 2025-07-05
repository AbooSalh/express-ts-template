import ApiError from "@/common/utils/api/ApiError";
import UserModel from "@/modules/User/model";
import { RequestHandler } from "express";
import expressAsyncHandler from "express-async-handler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { UserDocument } from "@/common/types/express";

type UserRole = "user" | "admin";

/**
 * Authentication middleware to protect routes
 * @param roles - Optional role(s) that are allowed to access the route. Can be passed as array or rest parameters
 * @returns Express middleware function
 */
const authMiddleware = (...roles: UserRole[]): RequestHandler => {
  return expressAsyncHandler(async (req, res, next) => {
    try {
      // 1. Check for Bearer token in Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer")) {
        throw new ApiError("No token provided - please login", "UNAUTHORIZED");
      }

      // 2. Extract token from header
      const token = authHeader.split(" ")[1];
      if (!token) {
        throw new ApiError("No token provided - please login", "UNAUTHORIZED");
      }

      // 3. Verify token and get payload
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as JwtPayload & { id: string; iat: number };

      // 4. Find user and check if exists (explicitly select emailVerified)
      const currentUser = await UserModel.findById(decoded.id).select(
        "+emailVerified"
      );
      if (!currentUser) {
        throw new ApiError("User not found", "UNAUTHORIZED");
      }

      // 5. Check if password was changed after token was issued
      if (
        currentUser.passwordChangedAt &&
        currentUser.passwordChangedAt instanceof Date
      ) {
        const passwordChangedAt = currentUser.passwordChangedAt.getTime();
        const tokenIssuedAt = decoded.iat * 1000;

        if (passwordChangedAt > tokenIssuedAt) {
          throw new ApiError("Password changed - please login", "UNAUTHORIZED");
        }
      }

      // 6. Check if email is verified
      if (!currentUser.emailVerified) {
        throw new ApiError(
          "Please verify your email to access this resource",
          "FORBIDDEN"
        );
      }

      // 7. Attach user to request object
      req.user = currentUser as unknown as UserDocument;

      // 8. Check role if roles are specified
      if (roles.length > 0) {
        if (!roles.includes(currentUser.role as UserRole)) {
          throw new ApiError(
            "You do not have permission to perform this action",
            "FORBIDDEN"
          );
        }
      }

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        next(new ApiError("Invalid token", "UNAUTHORIZED"));
      } else {
        next(error);
      }
    }
  });
};

export default authMiddleware;
