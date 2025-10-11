import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import archiver from "archiver";
import mongoose from "mongoose";
import cron from "node-cron";
import env from "@/common/config/env.config";
import logger from "@/common/utils/logger";
import sendEmail from "@/common/utils/sendEmail";
import {
  HealthCheck,
  DiskUsage,
  BackupLog,
  Alert,
  IDiskUsage,
  IAlert,
} from "./model";

const execAsync = promisify(exec);

export class MonitoringService {
  private static instance: MonitoringService;
  private isInitialized = false;

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Initialize monitoring services
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info("Initializing monitoring services...");

    // Start scheduled tasks
    if (env.ENABLE_MONITORING) {
      this.startDiskMonitoring();
      this.startBackupService();
      this.startHealthCheckScheduler();
      this.startDailyReportScheduler();
    }

    this.isInitialized = true;
    logger.info("Monitoring services initialized");
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(readiness = false): Promise<{
    status: "healthy" | "warning" | "critical";
    components: Record<string, any>;
    timestamp: Date;
  }> {
    const startTime = Date.now();
    const components: Record<string, any> = {};
    let overallStatus: "healthy" | "warning" | "critical" = "healthy";

    try {
      // Database health check
      const dbHealth = await this.checkDatabaseHealth();
      components.database = dbHealth;
      if (dbHealth.status === "critical") overallStatus = "critical";
      else if (dbHealth.status === "warning" && overallStatus === "healthy")
        overallStatus = "warning";

      // Disk space check
      const diskHealth = await this.checkDiskHealth();
      components.disk = diskHealth;
      if (diskHealth.status === "critical") overallStatus = "critical";
      else if (diskHealth.status === "warning" && overallStatus === "healthy")
        overallStatus = "warning";

      // Memory usage check
      const memoryHealth = this.checkMemoryHealth();
      components.memory = memoryHealth;
      if (memoryHealth.status === "critical") overallStatus = "critical";
      else if (memoryHealth.status === "warning" && overallStatus === "healthy")
        overallStatus = "warning";

      // Uploads directory check
      const uploadsHealth = await this.checkUploadsHealth();
      components.uploads = uploadsHealth;
      if (uploadsHealth.status === "critical") overallStatus = "critical";
      else if (
        uploadsHealth.status === "warning" &&
        overallStatus === "healthy"
      )
        overallStatus = "warning";

      const responseTime = Date.now() - startTime;

      // Log health check result
      await HealthCheck.create({
        timestamp: new Date(),
        status: overallStatus,
        component: readiness ? "readiness" : "liveness",
        responseTime,
        details: components,
      });

      return {
        status: overallStatus,
        components,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error("Health check failed:", error);

      await HealthCheck.create({
        timestamp: new Date(),
        status: "critical",
        component: readiness ? "readiness" : "liveness",
        error: error instanceof Error ? error.message : "Unknown error",
        details: components,
      });

      return {
        status: "critical",
        components,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabaseHealth(): Promise<{
    status: "healthy" | "warning" | "critical";
    responseTime: number;
    details: Record<string, any>;
  }> {
    const startTime = Date.now();

    try {
      // Check connection state
      const connectionState = mongoose.connection.readyState;
      const isConnected = connectionState === 1;

      if (!isConnected) {
        return {
          status: "critical",
          responseTime: Date.now() - startTime,
          details: { connectionState, error: "Database not connected" },
        };
      }

      // Perform a simple query to test responsiveness
      const db = mongoose.connection.db;
      if (!db) {
        return {
          status: "critical",
          responseTime: Date.now() - startTime,
          details: { connectionState, error: "Database handle not available" },
        };
      }

      const pingStart = Date.now();
      await db.admin().ping();
      const pingTime = Date.now() - pingStart;

      // Check connection pool stats (best-effort)
      let poolInfo: Record<string, any> = {};
      try {
        const serverStatus = await db.admin().serverStatus();
        poolInfo = serverStatus.connections || {};
      } catch {
        // ignore serverStatus errors; not critical for readiness
      }

      const responseTime = Date.now() - startTime;
      let status: "healthy" | "warning" | "critical" = "healthy";

      // Determine status based on ping time
      if (pingTime > 1000) status = "critical";
      else if (pingTime > 500) status = "warning";

      return {
        status,
        responseTime,
        details: {
          connectionState,
          pingTime,
          poolInfo,
          database: mongoose.connection.name,
        },
      };
    } catch (error) {
      return {
        status: "critical",
        responseTime: Date.now() - startTime,
        details: {
          error:
            error instanceof Error ? error.message : "Database check failed",
        },
      };
    }
  }

  /**
   * Check disk space and usage
   */
  private async checkDiskHealth(): Promise<{
    status: "normal" | "warning" | "critical";
    details: Record<string, any>;
  }> {
    try {
      const stats = await this.getDiskStats();

      let status: "normal" | "warning" | "critical" = "normal";

      if (stats.usagePercentage >= env.DISK_CRIT_PCT) {
        status = "critical";
      } else if (stats.usagePercentage >= env.DISK_WARN_PCT) {
        status = "warning";
      }

      // Check uploads directory size
      const uploadsSizeGB = stats.uploadsSize / (1024 * 1024 * 1024);
      if (uploadsSizeGB >= env.UPLOADS_WARN_GB) {
        if (status === "normal") status = "warning";
      }

      return {
        status,
        details: {
          totalSpace: stats.totalSpace,
          usedSpace: stats.usedSpace,
          freeSpace: stats.freeSpace,
          usagePercentage: stats.usagePercentage,
          uploadsSize: stats.uploadsSize,
          uploadsSizeGB: Math.round(uploadsSizeGB * 100) / 100,
        },
      };
    } catch (error) {
      return {
        status: "critical",
        details: {
          error: error instanceof Error ? error.message : "Disk check failed",
        },
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemoryHealth(): {
    status: "healthy" | "warning" | "critical";
    details: Record<string, any>;
  } {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsagePercent = Math.round(
      (memUsage.heapUsed / memUsage.heapTotal) * 100
    );

    let status: "healthy" | "warning" | "critical" = "healthy";

    // Determine status based on memory usage
    if (heapUsagePercent > 90 || rssMB > 1000) {
      status = "critical";
    } else if (heapUsagePercent > 75 || rssMB > 500) {
      status = "warning";
    }

    return {
      status,
      details: {
        heapUsedMB,
        heapTotalMB,
        rssMB,
        heapUsagePercent,
        externalMB: Math.round(memUsage.external / 1024 / 1024),
      },
    };
  }

  /**
   * Check uploads directory health
   */
  private async checkUploadsHealth(): Promise<{
    status: "healthy" | "warning" | "critical";
    details: Record<string, any>;
  }> {
    try {
      const uploadsPath = path.resolve(env.UPLOADS_PATH);

      if (!fs.existsSync(uploadsPath)) {
        return {
          status: "critical",
          details: { error: "Uploads directory does not exist" },
        };
      }

      const stats = fs.statSync(uploadsPath);
      const isDirectory = stats.isDirectory();
      const isReadable =
        fs.accessSync(uploadsPath, fs.constants.R_OK) === undefined;
      const isWritable =
        fs.accessSync(uploadsPath, fs.constants.W_OK) === undefined;

      if (!isDirectory || !isReadable || !isWritable) {
        return {
          status: "critical",
          details: {
            isDirectory,
            isReadable,
            isWritable,
            error: "Uploads directory permissions issue",
          },
        };
      }

      return {
        status: "healthy",
        details: {
          path: uploadsPath,
          isDirectory,
          isReadable,
          isWritable,
          permissions: stats.mode.toString(8),
        },
      };
    } catch (error) {
      return {
        status: "critical",
        details: {
          error:
            error instanceof Error ? error.message : "Uploads check failed",
        },
      };
    }
  }

  /**
   * Get disk statistics
   */
  private async getDiskStats(): Promise<{
    totalSpace: number;
    usedSpace: number;
    freeSpace: number;
    usagePercentage: number;
    uploadsSize: number;
  }> {
    const uploadsPath = path.resolve(env.UPLOADS_PATH);
    const uploadsDir = path.dirname(uploadsPath);

    // Get disk stats using Node.js fs.statfs (available in Node 18+)
    const stats = fs.statfsSync(uploadsDir);

    const totalSpace = stats.blocks * stats.bsize;
    const freeSpace = stats.bavail * stats.bsize;
    const usedSpace = totalSpace - freeSpace;
    const usagePercentage = Math.round((usedSpace / totalSpace) * 100);

    // Calculate uploads directory size
    const uploadsSize = await this.calculateDirectorySize(uploadsPath);

    return {
      totalSpace,
      usedSpace,
      freeSpace,
      usagePercentage,
      uploadsSize,
    };
  }

  /**
   * Calculate directory size recursively
   */
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    try {
      if (!fs.existsSync(dirPath)) return 0;

      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) return stats.size;

      const files = fs.readdirSync(dirPath);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const fileStats = fs.statSync(filePath);

        if (fileStats.isDirectory()) {
          totalSize += await this.calculateDirectorySize(filePath);
        } else {
          totalSize += fileStats.size;
        }
      }

      return totalSize;
    } catch (error) {
      logger.error("Error calculating directory size:", error);
      return 0;
    }
  }

  /**
   * Start disk monitoring cron job
   */
  private startDiskMonitoring(): void {
    cron.schedule(env.DISK_CHECK_CRON, async () => {
      try {
        const stats = await this.getDiskStats();
        const uploadsSizeGB = stats.uploadsSize / (1024 * 1024 * 1024);

        let status: "normal" | "warning" | "critical" = "normal";

        if (stats.usagePercentage >= env.DISK_CRIT_PCT) {
          status = "critical";
        } else if (stats.usagePercentage >= env.DISK_WARN_PCT) {
          status = "warning";
        }

        // Log disk usage
        await DiskUsage.create({
          timestamp: new Date(),
          totalSpace: stats.totalSpace,
          usedSpace: stats.usedSpace,
          freeSpace: stats.freeSpace,
          usagePercentage: stats.usagePercentage,
          uploadsSize: stats.uploadsSize,
          status,
        });

        // Create alerts if thresholds exceeded
        if (status === "critical") {
          await this.createAlert({
            level: "critical",
            category: "disk",
            title: "Critical Disk Usage",
            message: `Disk usage is at ${stats.usagePercentage}% (${
              Math.round(uploadsSizeGB * 100) / 100
            }GB uploads)`,
            metadata: { stats },
          });
        } else if (status === "warning") {
          await this.createAlert({
            level: "warning",
            category: "disk",
            title: "High Disk Usage",
            message: `Disk usage is at ${stats.usagePercentage}% (${
              Math.round(uploadsSizeGB * 100) / 100
            }GB uploads)`,
            metadata: { stats },
          });
        }
      } catch (error) {
        logger.error("Disk monitoring failed:", error);
      }
    });

    logger.info(`Disk monitoring started with cron: ${env.DISK_CHECK_CRON}`);
  }

  /**
   * Start backup service
   */
  private startBackupService(): void {
    cron.schedule(env.BACKUP_CRON, async () => {
      try {
        await this.createUploadsBackup();
      } catch (error) {
        logger.error("Backup service failed:", error);
      }
    });

    logger.info(`Backup service started with cron: ${env.BACKUP_CRON}`);
  }

  /**
   * Start health check scheduler
   */
  private startHealthCheckScheduler(): void {
    // Run health check every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error("Scheduled health check failed:", error);
      }
    });

    logger.info("Health check scheduler started");
  }

  /**
   * Start daily report scheduler
   */
  private startDailyReportScheduler(): void {
    // Send daily report based on DAILY_REPORT_CRON (default: every 5 days at 9:00 AM)
    cron.schedule(env.DAILY_REPORT_CRON, async () => {
      try {
        await this.sendDailyReport();
      } catch (error) {
        logger.error("Daily report failed:", error);
      }
    });

    logger.info(
      `Daily report scheduler started with cron: ${env.DAILY_REPORT_CRON}`
    );
  }

  /**
   * Send daily system report
   */
  private async sendDailyReport(): Promise<void> {
    if (!env.ALERT_EMAIL_TO) {
      logger.info("Daily report skipped: ALERT_EMAIL_TO not configured");
      return;
    }

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();

      // Get monitoring stats for the last 24 hours
      const stats = await this.getMonitoringStats();

      // Get critical issues from yesterday
      const criticalIssues = await Alert.find({
        level: "critical",
        timestamp: { $gte: yesterday },
      }).sort({ timestamp: -1 });

      // Get disk usage trends
      const diskTrends = await DiskUsage.find({
        timestamp: { $gte: yesterday },
      }).sort({ timestamp: 1 });

      // Format the report
      const reportHtml = this.formatDailyReport({
        date: today.toISOString().split("T")[0],
        stats,
        criticalIssues,
        diskTrends,
        uptime: process.uptime(),
      });

      // Send the report
      await sendEmail({
        to: env.ALERT_EMAIL_TO,
        subject: `📊 Daily System Report - ${
          today.toISOString().split("T")[0]
        }`,
        html: reportHtml,
      });

      logger.info("Daily system report sent successfully");
    } catch (error) {
      logger.error("Failed to send daily report:", error);
    }
  }

  /**
   * Format daily report as HTML
   */
  private formatDailyReport(data: {
    date: string;
    stats: any;
    criticalIssues: any[];
    diskTrends: any[];
    uptime: number;
  }): string {
    const uptimeHours = Math.round(data.uptime / 3600);
    const criticalCount = data.criticalIssues.length;
    const diskUsage = data.diskTrends[data.diskTrends.length - 1] || {};

    return `
      <h1>📊 Daily System Report</h1>
      <p><strong>Date:</strong> ${data.date}</p>
      <p><strong>System Uptime:</strong> ${uptimeHours} hours</p>
      
      <h2>🚨 Critical Issues (Last 24h)</h2>
      <p><strong>Total:</strong> ${criticalCount}</p>
      ${
        criticalCount > 0
          ? `
        <ul>
          ${data.criticalIssues
            .map(
              (issue) => `
            <li><strong>${issue.category}</strong>: ${issue.title} - ${issue.message}</li>
          `
            )
            .join("")}
        </ul>
      `
          : "<p>✅ No critical issues</p>"
      }
      
      <h2>💾 System Health</h2>
      <p><strong>Health Checks:</strong> ${
        data.stats.healthChecks.total
      } total</p>
      <p><strong>Healthy:</strong> ${data.stats.healthChecks.healthy}</p>
      <p><strong>Warnings:</strong> ${data.stats.healthChecks.warning}</p>
      <p><strong>Critical:</strong> ${data.stats.healthChecks.critical}</p>
      
      <h2>💿 Disk Usage</h2>
      <p><strong>Current Usage:</strong> ${
        diskUsage.usagePercentage || "N/A"
      }%</p>
      <p><strong>Uploads Size:</strong> ${
        Math.round(
          ((diskUsage.uploadsSize || 0) / (1024 * 1024 * 1024)) * 100
        ) / 100
      } GB</p>
      
      <h2>🔔 Alerts Summary</h2>
      <p><strong>Total Alerts:</strong> ${data.stats.alerts.total}</p>
      <p><strong>Unresolved:</strong> ${data.stats.alerts.unresolved}</p>
      
      <h2>💾 Backup Status</h2>
      <p><strong>Successful:</strong> ${data.stats.backups.success}</p>
      <p><strong>Failed:</strong> ${data.stats.backups.failed}</p>
      
      <hr>
      <p><em>Report generated automatically by Paradise Sharm Tours Monitoring System</em></p>
    `;
  }

  /**
   * Create uploads backup
   */
  public async createUploadsBackup(): Promise<string> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `uploads-backup-${timestamp}.zip`;
    const backupPath = path.join(env.BACKUP_DIR, backupFileName);

    try {
      // Ensure backup directory exists
      if (!fs.existsSync(env.BACKUP_DIR)) {
        fs.mkdirSync(env.BACKUP_DIR, { recursive: true });
      }

      // Create zip archive
      const output = fs.createWriteStream(backupPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        const size = archive.pointer();
        logger.info(`Backup created: ${backupFileName} (${size} bytes)`);
      });

      archive.on("error", (err) => {
        throw err;
      });

      archive.pipe(output);
      archive.directory(env.UPLOADS_PATH, false);
      await archive.finalize();

      const duration = Date.now() - startTime;
      const stats = fs.statSync(backupPath);

      // Log backup success
      await BackupLog.create({
        timestamp: new Date(),
        type: "uploads",
        status: "success",
        filePath: backupPath,
        size: stats.size,
        duration,
      });

      // Clean up old backups
      await this.cleanupOldBackups();

      return backupPath;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log backup failure
      await BackupLog.create({
        timestamp: new Date(),
        type: "uploads",
        status: "failed",
        duration,
        error: error instanceof Error ? error.message : "Backup failed",
      });

      throw error;
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      if (!fs.existsSync(env.BACKUP_DIR)) return;

      const files = fs.readdirSync(env.BACKUP_DIR);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - env.BACKUP_RETENTION_DAYS);

      for (const file of files) {
        if (!file.endsWith(".zip")) continue;

        const filePath = path.join(env.BACKUP_DIR, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          logger.info(`Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      logger.error("Backup cleanup failed:", error);
    }
  }

  /**
   * Check if we should send a critical alert email (prevents spam)
   */
  private async shouldSendCriticalAlert(category: string): Promise<boolean> {
    if (!env.ALERT_EMAIL_TO) return false;

    const cooldownMinutes = env.CRITICAL_ALERT_COOLDOWN_MINUTES;
    const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000);

    // Check if we sent a critical alert for this category recently
    const recentAlert = await Alert.findOne({
      category,
      level: "critical",
      timestamp: { $gte: cooldownTime },
    });

    return !recentAlert; // Only send if no recent critical alert
  }

  /**
   * Create an alert
   */
  public async createAlert(alertData: {
    level: "info" | "warning" | "critical";
    category: "disk" | "database" | "uploads" | "system" | "security";
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<IAlert> {
    const alert = await Alert.create({
      timestamp: new Date(),
      ...alertData,
    });

    // Send email for critical alerts (with cooldown)
    if (
      alertData.level === "critical" &&
      (await this.shouldSendCriticalAlert(alertData.category))
    ) {
      try {
        await sendEmail({
          to: env.ALERT_EMAIL_TO,
          subject: `[CRITICAL] ${alertData.title}`,
          html: `
            <h2>Critical Alert</h2>
            <p><strong>Category:</strong> ${alertData.category}</p>
            <p><strong>Message:</strong> ${alertData.message}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <p><strong>Note:</strong> You won't receive more alerts for this issue for ${
              env.CRITICAL_ALERT_COOLDOWN_MINUTES
            } minutes</p>
            ${
              alertData.metadata
                ? `<pre>${JSON.stringify(alertData.metadata, null, 2)}</pre>`
                : ""
            }
          `,
        });
      } catch (error) {
        logger.error("Failed to send alert email:", error);
      }
    }

    logger.warn(
      `Alert created: ${alertData.level.toUpperCase()} - ${alertData.title}`
    );
    return alert;
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(alertId: string): Promise<IAlert | null> {
    return await Alert.findByIdAndUpdate(
      alertId,
      {
        resolved: true,
        resolvedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Get monitoring statistics
   */
  public async getMonitoringStats(): Promise<{
    healthChecks: {
      total: number;
      healthy: number;
      warning: number;
      critical: number;
    };
    diskUsage: { latest: IDiskUsage | null; average: number };
    alerts: {
      total: number;
      unresolved: number;
      byLevel: Record<string, number>;
    };
    backups: { total: number; success: number; failed: number };
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Health check stats
    const healthChecks = await HealthCheck.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Disk usage stats
    const latestDiskUsage = await DiskUsage.findOne().sort({ timestamp: -1 });
    const avgDiskUsage = await DiskUsage.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      { $group: { _id: null, average: { $avg: "$usagePercentage" } } },
    ]);

    // Alert stats
    const alerts = await Alert.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      { $group: { _id: "$level", count: { $sum: 1 } } },
    ]);

    const unresolvedAlerts = await Alert.countDocuments({ resolved: false });

    // Backup stats
    const backups = await BackupLog.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return {
      healthChecks: {
        total: healthChecks.reduce((sum, item) => sum + item.count, 0),
        healthy:
          healthChecks.find((item) => item._id === "healthy")?.count || 0,
        warning:
          healthChecks.find((item) => item._id === "warning")?.count || 0,
        critical:
          healthChecks.find((item) => item._id === "critical")?.count || 0,
      },
      diskUsage: {
        latest: latestDiskUsage,
        average: avgDiskUsage[0]?.average || 0,
      },
      alerts: {
        total: alerts.reduce((sum, item) => sum + item.count, 0),
        unresolved: unresolvedAlerts,
        byLevel: alerts.reduce(
          (acc, item) => ({ ...acc, [item._id]: item.count }),
          {}
        ),
      },
      backups: {
        total: backups.reduce((sum, item) => sum + item.count, 0),
        success: backups.find((item) => item._id === "success")?.count || 0,
        failed: backups.find((item) => item._id === "failed")?.count || 0,
      },
    };
  }
}

export default MonitoringService.getInstance();
