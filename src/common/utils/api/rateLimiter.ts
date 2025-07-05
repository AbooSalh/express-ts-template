// Exported function to create a rate limiter middleware

import rateLimit from "express-rate-limit";
// import bouncer from "express-bouncer";

/**
 * Create a rate limiter middleware.
 * @param minutes - Time window in minutes
 * @param max - Max requests per window per IP
 */
export default function createRateLimiter({
  minutes,
  max,
}: {
  minutes: number;
  max: number;
}) {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    max,
    message: "Too many requests, please try again later.",
  });
}

/**
 * Create a brute-force protection middleware for login/auth endpoints.
 * @param maxAttempts - Number of allowed failed attempts
 * @param lockMinutes - Lockout duration in minutes
 * @param coolOffMinutes - Cool-off duration in minutes
 */
// export function createBouncer({
//   maxAttempts,
//   lockMinutes,
//   coolOffMinutes,
// }: {
//   maxAttempts: number;
//   lockMinutes: number;
//   coolOffMinutes: number;
// }) {
//   return bouncer(
//     maxAttempts,
//     lockMinutes * 60 * 1000,
//     coolOffMinutes * 60 * 1000
//   );
// }
