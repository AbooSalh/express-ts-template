import ApiError from "@/common/utils/api/ApiError";
import UserModel from "@/common/modules/User/model";
import { RequestHandler } from "express";
import expressAsyncHandler from "express-async-handler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { UserDocument, UserRole } from "@/common/types/express";
import { verifySecureToken } from "@/common/utils/jwtConfig";


const authMiddleware = (...roles: UserRole[]): RequestHandler => {
  // 👇 If no roles passed → allow all roles
  const allowedRoles: UserRole[] =
    roles.length > 0 ? roles : ["public", "user", "admin"];

  return expressAsyncHandler(async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      let currentUser: UserDocument | null = null;
      let role: UserRole = "public"; // default role

      // 🔑 Try token if exists
      if (authHeader?.startsWith("Bearer")) {
        const token = authHeader.split(" ")[1];
        if (token) {
          try {
            const decoded = verifySecureToken(token) as JwtPayload & {
              id: string;
              iat: number;
            };

            currentUser = await UserModel.findById(decoded.id).select(
              "+emailVerified"
            );

            if (!currentUser) {
              throw new ApiError("User not found", "UNAUTHORIZED");
            }

            // check if password changed after token issue
            if (
              currentUser.passwordChangedAt &&
              currentUser.passwordChangedAt instanceof Date
            ) {
              const passwordChangedAt = currentUser.passwordChangedAt.getTime();
              const tokenIssuedAt = decoded.iat * 1000;
              if (passwordChangedAt > tokenIssuedAt) {
                throw new ApiError(
                  "Password changed - please login",
                  "UNAUTHORIZED"
                );
              }
            }

            // check email verification
            if (!currentUser.emailVerified) {
              throw new ApiError(
                "Please verify your email to access this resource",
                "FORBIDDEN"
              );
            }

            req.user = currentUser as unknown as UserDocument;
            role = currentUser.role as UserRole;
          } catch (err) {
            if (!allowedRoles.includes("public")) {
              throw err; // fail if public not allowed
            }
          }
        }
      }

      // Guest but public allowed → inject req.user with role public
      if (!currentUser && allowedRoles.includes("public")) {
        req.user = { role: "public" } as unknown as UserDocument;
      }

      // Final role check
      if (!allowedRoles.includes(role)) {
        throw new ApiError(
          "You do not have permission to perform this action",
          "FORBIDDEN"
        );
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
