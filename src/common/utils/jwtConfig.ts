import jwt, { SignOptions } from "jsonwebtoken";
import env from "@/common/config/env.config";

/**
 * JWT Configuration with enhanced security
 */
export const JWT_CONFIG = {
  // Use HS512 for stronger security (512-bit hash vs 256-bit)
  algorithm: "HS512" as jwt.Algorithm,

  // Token expiration times
  accessTokenExpiry: "15m", // Shorter expiry for better security
  refreshTokenExpiry: "7d", // Longer expiry for refresh tokens

  // Issuer and audience for additional security
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,

  // Additional security headers
  header: {
    typ: "JWT",
    alg: "HS512",
  },
} as const;

/**
 * Create a secure JWT token with explicit algorithm and security settings
 * @param payload - The JWT payload
 * @returns JWT token string
 */
const signOptions: SignOptions = {
  algorithm: JWT_CONFIG.algorithm,
  expiresIn: JWT_CONFIG.accessTokenExpiry,
  issuer: JWT_CONFIG.issuer,
  audience: JWT_CONFIG.audience,
  header: JWT_CONFIG.header,
};
export const createSecureToken = (payload: jwt.JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, signOptions);
};

/**
 * Verify a JWT token with explicit algorithm and security settings
 * @param token - The JWT token to verify
 * @returns Decoded JWT payload
 */
export const verifySecureToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: [JWT_CONFIG.algorithm],
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
  }) as jwt.JwtPayload;
};

/**
 * Create a refresh token with longer expiry
 * @param payload - The JWT payload
 * @returns JWT refresh token string
 */
export const createRefreshToken = (payload: jwt.JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: JWT_CONFIG.algorithm,
    expiresIn: JWT_CONFIG.refreshTokenExpiry,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    header: JWT_CONFIG.header,
  });
};

/**
 * Get JWT configuration for external use
 */
export const getJwtConfig = () => JWT_CONFIG;
