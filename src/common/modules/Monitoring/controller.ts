import { Request, Response, NextFunction } from "express";

import monitoringService from "./services";
import { HealthCheck, DiskUsage, BackupLog, Alert } from "./model";
import { ApiFeatures } from "@/common/utils/api/ApiFeatures";
import ApiError from "@/common/utils/api/ApiError";
import ApiSuccess from "@/common/utils/api/ApiSuccess";

export class MonitoringController {
  /**
   * Health check endpoint
   * GET /health
   */
  public health = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const readiness = req.query.readiness === "true";
      const health = await monitoringService.performHealthCheck(readiness);

      // Add version header
      res.setHeader(
        "X-App-Version",
        process.env.npm_package_version || "1.0.0"
      );
      // Add commit header if available
      if (process.env.GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA) {
        res.setHeader(
          "X-Commit-SHA",
          process.env.GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || ""
        );
      }
      // Prevent caching for health responses
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Health-Status", health.status);

      // For health checks, we always return 200 OK but include the status in the response
      // This is the standard approach for health check endpoints
      return ApiSuccess.send(res, "OK", "Health check completed", {
        status: health.status,
        timestamp: health.timestamp,
        components: health.components,
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || "1.0.0",
        commit: process.env.GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA,
      });
    } catch {
      next(new ApiError("Health check failed", "INTERNAL_SERVER_ERROR"));
    }
  };

  /**
   * Get monitoring statistics
   * GET /monitoring/stats
   */
  public getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await monitoringService.getMonitoringStats();

      return ApiSuccess.send(
        res,
        "OK",
        "Monitoring statistics retrieved",
        stats
      );
    } catch {
      next(
        new ApiError("Failed to get monitoring stats", "INTERNAL_SERVER_ERROR")
      );
    }
  };

  /**
   * Get health check history
   * GET /monitoring/health-checks
   */
  public getHealthChecks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const features = new ApiFeatures(HealthCheck.find(), req.query as any);
      features.filter();
      features.sort().limitFields().paginate();

      const { mongooseQuery, pagination } = features;
      const healthChecks = await mongooseQuery;

      return ApiSuccess.send(res, "OK", "Health checks retrieved", {
        healthChecks,
        pagination,
      });
    } catch {
      next(
        new ApiError("Failed to get health checks", "INTERNAL_SERVER_ERROR")
      );
    }
  };

  /**
   * Get disk usage history
   * GET /monitoring/disk-usage
   */
  public getDiskUsage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const features = new ApiFeatures(DiskUsage.find(), req.query as any);
      features.filter();
      features.sort().limitFields().paginate();

      const { mongooseQuery, pagination } = features;
      const diskUsage = await mongooseQuery;

      return ApiSuccess.send(res, "OK", "Disk usage history retrieved", {
        diskUsage,
        pagination,
      });
    } catch {
      next(new ApiError("Failed to get disk usage", "INTERNAL_SERVER_ERROR"));
    }
  };

  /**
   * Get backup logs
   * GET /monitoring/backups
   */
  public getBackups = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const features = new ApiFeatures(BackupLog.find(), req.query as any);
      features.filter();
      features.sort().limitFields().paginate();

      const { mongooseQuery, pagination } = features;
      const backups = await mongooseQuery;

      return ApiSuccess.send(res, "OK", "Backup logs retrieved", {
        backups,
        pagination,
      });
    } catch {
      next(new ApiError("Failed to get backup logs", "INTERNAL_SERVER_ERROR"));
    }
  };

  /**
   * Get alerts
   * GET /monitoring/alerts
   */
  public getAlerts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const features = new ApiFeatures(Alert.find(), req.query as any);
      features.filter();
      features.sort().limitFields().paginate();

      const { mongooseQuery, pagination } = features;
      const alerts = await mongooseQuery;

      return ApiSuccess.send(res, "OK", "Alerts retrieved", {
        alerts,
        pagination,
      });
    } catch {
      next(new ApiError("Failed to get alerts", "INTERNAL_SERVER_ERROR"));
    }
  };

  /**
   * Resolve an alert
   * PUT /monitoring/alerts/:id/resolve
   */
  public resolveAlert = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const alert = await monitoringService.resolveAlert(id);

      if (!alert) {
        return next(new ApiError("Alert not found", "NOT_FOUND"));
      }

      return ApiSuccess.send(res, "OK", "Alert resolved successfully", alert);
    } catch {
      next(new ApiError("Failed to resolve alert", "INTERNAL_SERVER_ERROR"));
    }
  };

  /**
   * Create manual backup
   * POST /monitoring/backups
   */
  public createBackup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const backupPath = await monitoringService.createUploadsBackup();

      return ApiSuccess.send(res, "CREATED", "Backup created successfully", {
        backupPath,
      });
    } catch  {
      next(new ApiError("Failed to create backup", "INTERNAL_SERVER_ERROR"));
    }
  };

  /**
   * Get system information
   * GET /monitoring/system
   */
  public getSystemInfo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        pid: process.pid,
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || "1.0.0",
      };

      return ApiSuccess.send(
        res,
        "OK",
        "System information retrieved",
        systemInfo
      );
    } catch {
      next(new ApiError("Failed to get system info", "INTERNAL_SERVER_ERROR"));
    }
  };

  /**
   * Manually trigger daily report
   * POST /monitoring/reports/daily
   */
  public triggerDailyReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Access the private method through the service instance
      const monitoringServiceInstance = monitoringService as any;
      await monitoringServiceInstance.sendDailyReport();

      return ApiSuccess.send(res, "OK", "Daily report triggered manually", {
        message: "Report sent to configured email address",
      });
    } catch {
      next(
        new ApiError("Failed to trigger daily report", "INTERNAL_SERVER_ERROR")
      );
    }
  };
}

export default new MonitoringController();
