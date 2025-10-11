import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../utils/api/ApiError';
import UserModel from '../modules/User/model';
import { UserDocument, UserRole } from '../types/express';
import { verifySecureToken } from '../utils/jwtConfig';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<UserRole[]>(ROLES_KEY, context.getHandler()) || [];
    const request = context.switchToHttp().getRequest();

    // If no roles specified, allow all roles
    const allowedRoles: UserRole[] = roles.length > 0 ? roles : ['public', 'user', 'admin'];

    try {
      const authHeader = request.headers.authorization;
      let currentUser: UserDocument | null = null;
      let role: UserRole = 'public';

      // Try to extract and verify token
      if (authHeader?.startsWith('Bearer')) {
        const token = authHeader.split(' ')[1];
        if (token) {
          try {
            const decoded = verifySecureToken(token) as JwtPayload & {
              id: string;
              iat: number;
            };

            currentUser = await UserModel.findById(decoded.id).select('+emailVerified');

            if (!currentUser) {
              throw new ApiError('User not found', 'UNAUTHORIZED');
            }

            // Check if password changed after token issue
            if (currentUser.passwordChangedAt && currentUser.passwordChangedAt instanceof Date) {
              const passwordChangedAt = currentUser.passwordChangedAt.getTime();
              const tokenIssuedAt = decoded.iat * 1000;
              if (passwordChangedAt > tokenIssuedAt) {
                throw new ApiError('Password changed - please login', 'UNAUTHORIZED');
              }
            }

            // Check email verification
            if (!currentUser.emailVerified) {
              throw new ApiError(
                'Please verify your email to access this resource',
                'FORBIDDEN'
              );
            }

            request.user = currentUser;
            role = currentUser.role as UserRole;
          } catch (err) {
            if (!allowedRoles.includes('public')) {
              throw err;
            }
          }
        }
      }

      // Guest but public allowed
      if (!currentUser && allowedRoles.includes('public')) {
        request.user = { role: 'public' } as unknown as UserDocument;
      }

      // Final role check
      if (!allowedRoles.includes(role)) {
        throw new ApiError('You do not have permission to perform this action', 'FORBIDDEN');
      }

      return true;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError('Invalid token', 'UNAUTHORIZED');
      }
      throw error;
    }
  }
}
