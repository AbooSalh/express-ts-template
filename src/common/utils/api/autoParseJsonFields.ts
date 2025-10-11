import { Request, Response, NextFunction } from "express";

/**
 * Express middleware to automatically parse any fields in req.body that are JSON objects or arrays (sent as strings).
 *
 * This is especially useful when handling multipart/form-data requests (e.g., file uploads),
 * where non-file fields are always received as strings, even if they represent objects or arrays.
 *
 * The middleware will attempt to parse any string field in req.body that starts with '{' or '['.
 * If parsing fails, the field is left as the original string.
 *
 * Usage:
 *   app.post('/api/tours', upload.any(), autoParseJsonFields, handler)
 *
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export function autoParseJsonFields(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const contentType = req.headers["content-type"] || "";
  if (contentType.startsWith("multipart/form-data")) {
    if (req.body && typeof req.body === "object") {
      for (const key in req.body) {
        const value = req.body[key];
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
          ) {
            try {
              req.body[key] = JSON.parse(trimmed);
            } catch {
              // Leave as string if parsing fails
            }
          }
        }
      }
    }
  }
  next();
}
