import "tsconfig-paths/register"; // Add this at the top
import "module-alias/register";
import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
// Internal modules
import dbConnection from "./common/config/database.config";
import globalError from "./common/middleware/globalError";
import ApiError from "./common/utils/api/ApiError";
import createRateLimiter from "./common/utils/api/rateLimiter";
import { mountRoutes } from ".";
// Load environment variables
dotenvExpand.expand(dotenv.config());
// App initialization
const app = express();
const PORT = process.env.PORT || 5000;

// --- Body Parsing & Static Files ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(compression());

// --- Security Middlewares ---
app.use(helmet()); // Set security-related HTTP headers
app.use(
  mongoSanitize({
    replaceWith: "_", // Replace prohibited characters in keys with _
    allowDots: true, // Allow dots in values (e.g., emails)
  })
); // Prevent NoSQL injection

app.use(hpp()); // Prevent HTTP Parameter Pollution

app.use(createRateLimiter({ minutes: 15, max: 1000 })); // Rate limiting

// --- CORS ---
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  })
);

// --- Special Routes ---
// app.post(
//   "/api/stripe/webhook-checkout",
//   express.raw({ type: "application/json" }),
//   webHookCheckout
// );

// --- App Routes ---
dbConnection.connect();
mountRoutes(app);

// --- 404 Handler ---
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError("Route not found", "NOT_FOUND"));
});

// --- Global Error Handler ---
app.use(globalError);

// --- Start Server ---
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// --- Unhandled Promise Rejection Handler ---
process.on("unhandledRejection", (err: Error) => {
  console.error(`Internal Server Error: ${err.name} | ${err.message}`);
  console.error("shutting down...");
  server.close(() => process.exit(1));
});
