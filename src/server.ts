import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config());

import env from "@/common/config/env.config";
import type { NextFunction, Request, Response } from "express";
import type { Server } from "http";
// Internal modules
import dbConnection from "./common/config/database.config";
import globalError from "./common/middleware/globalError";
import ApiError from "./common/utils/api/ApiError";
import logger from "./common/utils/logger";
import monitoringService from "./common/modules/Monitoring/services";
import createApp from "@/common/config/app";

// App initialization
const app = createApp();
const PORT = env.PORT;

// Public health endpoint for container/orchestrator checks
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// --- Bootstrapping Orchestration ---
let server: Server | undefined;

function initializeMonitoringServices(): void {
  monitoringService.initialize().catch((error) => {
    logger.error("Failed to initialize monitoring services:", error);
  });
}

function registerFallbackHandlers(appInstance: typeof app): void {
  appInstance.all("*", (_req: Request, _res: Response, next: NextFunction) => {
    next(new ApiError("Route not found", "NOT_FOUND"));
  });
  appInstance.use(globalError);
}

async function connectDatabaseOrExit(): Promise<void> {
  try {
    await dbConnection.connect();
  } catch (error) {
    logger.error("Database connection failed on startup. Exiting.", { error });
    process.exit(1);
  }
}

function attachServerLifecycleHandlers(srv: Server): void {
  srv.on("error", (error: NodeJS.ErrnoException) => {
    switch (error.code) {
      case "EADDRINUSE":
        logger.error(`Port ${PORT} is already in use`, {
          code: error.code,
          port: PORT,
        });
        break;
      case "EACCES":
        logger.error(`Port ${PORT} requires elevated privileges`, {
          code: error.code,
          port: PORT,
        });
        break;
      default:
        logger.error("HTTP server encountered an error", {
          error,
          code: error.code,
        });
    }
    try {
      gracefulShutdown("SERVER_ERROR");
    } catch {
      process.exit(1);
    }
  });

  srv.on("listening", () => {
    logger.info(`HTTP server is listening on port ${PORT}`);
  });
}

function registerCrashHandlers(): void {
  process.on("uncaughtException", (err: Error) => {
    logger.error(`Uncaught Exception: ${err.name} | ${err.message}`, {
      error: err,
      stack: err.stack,
    });
    logger.error("Shutting down server due to uncaught exception");
    if (server) server.close(() => process.exit(1));
    else process.exit(1);
  });

  process.on("unhandledRejection", (err: Error) => {
    logger.error(`Unhandled Promise Rejection: ${err.name} | ${err.message}`, {
      error: err,
      stack: err.stack,
    });
    logger.error("Shutting down server due to unhandled promise rejection");
    if (server) server.close(() => process.exit(1));
    else process.exit(1);
  });
}

function registerTerminationSignals(): void {
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

async function startHttpServer(): Promise<void> {
  // 5.1) Connect to the database (fail fast if connection cannot be established)
  await connectDatabaseOrExit();

  // 5.2) Start the HTTP server
  server = app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`, {
      port: PORT,
      environment: env.NODE_ENV,
    });

    // 5.3) Log a detailed startup summary (env, version, DB state, etc.)
    logStartupSummary();
  });

  // 5.4) Attach server lifecycle handlers (error/listening)
  attachServerLifecycleHandlers(server);
}

async function bootstrap(): Promise<void> {
  // 1) Initialize monitoring services and schedulers
  initializeMonitoringServices();

  // 2) Register route fallbacks (404) and the global error handler
  registerFallbackHandlers(app);

  // 3) Register process-level crash handlers (uncaughtException/unhandledRejection)
  registerCrashHandlers();

  // 4) Register termination signal handlers for graceful shutdown (SIGINT/SIGTERM)
  registerTerminationSignals();

  // 5) Connect to the database and start the HTTP server
  await startHttpServer();
}

bootstrap().catch((error) => {
  logger.error("Fatal error during startup", { error });
  process.exit(1);
});

// --- Graceful Shutdown ---
function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully`);

  const closeDbAndExit = () =>
    dbConnection
      .close()
      .then(() => {
        logger.info("Database connection closed");
        logger.info("Process terminated");
        process.exit(0);
      })
      .catch((error: Error) => {
        logger.error("Error closing database connection:", error);
        process.exit(1);
      });

  // Close the HTTP server first, then the DB
  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
      closeDbAndExit();
    });
  } else {
    closeDbAndExit();
  }
}

// --- Startup Summary ---
function logStartupSummary() {
  const isProduction = env.NODE_ENV === "production";
  const pkgName = process.env.npm_package_name || "App";
  const pkgVersion = process.env.npm_package_version || "N/A";
  const commit =
    process.env.GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "N/A";

  const mongooseConn = require("mongoose").connection;
  const dbName = mongooseConn?.name ?? "N/A";
  const dbHost = mongooseConn?.host ?? "N/A";
  const dbPort = mongooseConn?.port ?? "N/A";
  const dbStateCode = mongooseConn?.readyState ?? -1;
  const dbStateMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const dbState = dbStateMap[dbStateCode] || "unknown";

  const rows: Array<[string, string]> = [
    ["Environment", String(env.NODE_ENV)],
    ["Port", String(PORT)],
    ["PID", String(process.pid)],
    ["Node", String(process.version)],
    ["Log Level", String(env.LOG_LEVEL)],
    ["CORS Origin", String(env.CORS_ORIGIN)],
    ["Version", String(pkgVersion)],
    ["Commit", String(commit)],
    ["DB Name", String(dbName)],
    ["DB Host", String(dbHost)],
    ["DB Port", String(dbPort)],
    ["DB State", String(dbState)],
  ];

  const labelWidth = Math.max(...rows.map(([k]) => k.length));
  const formatRow = (k: string, v: string) =>
    `  ${k.padEnd(labelWidth)} : ${v}`;

  const bannerTop =
    "┌───────────────────────────── Application Startup ─────────────────────────────┐";
  const bannerBottom =
    "└──────────────────────────────────────────────────────────────────────────────┘";
  const header = `  ${pkgName} (${pkgVersion})`;
  const body = rows.map(([k, v]) => formatRow(k, v)).join("\n");

  const message = `\n${bannerTop}\n${header}\n${body}\n${bannerBottom}`;
  logger.info(message);

  if (isProduction && /localhost|127\.0\.0\.1/i.test(env.CORS_ORIGIN)) {
    logger.warn("CORS origin points to localhost while in production");
  }
}
export default app;
