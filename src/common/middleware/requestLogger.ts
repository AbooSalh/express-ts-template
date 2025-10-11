import { Request, Response, NextFunction } from "express";
import logger from "@/common/utils/logger";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Log the incoming request
  logger.http(`Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: (req.user as any)?.id || "anonymous",
  });

  // Override res.end to log the response
  const originalEnd = res.end;
  res.end = function (
    this: Response,
    chunk?: any,
    encoding?: any,
    cb?: () => void
  ): Response {
    const duration = Date.now() - start;

    // Log the response
    const logLevel = res.statusCode >= 400 ? "error" : "http";
    logger[logLevel](
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        userId: (req.user as any)?.id || "anonymous",
      }
    );

    // Call the original end method and return its result
    return (originalEnd as any).call(this, chunk, encoding, cb);
  } as any;

  next();
};

export default requestLogger;
