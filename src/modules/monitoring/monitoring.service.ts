import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { HealthCheck, DiskUsage, BackupLog, Alert } from './monitoring.entity';
import { ObjectId } from 'mongodb';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectModel(HealthCheck.name)
    private healthCheckModel: Model<HealthCheck>,
    @InjectModel(DiskUsage.name)
    private diskUsageModel: Model<DiskUsage>,
    @InjectModel(BackupLog.name)
    private backupLogModel: Model<BackupLog>,
    @InjectModel(Alert.name)
    private alertModel: Model<Alert>,
    private configService: ConfigService,
  ) {}

  async getHealth(): Promise<{ status: string; uptime: number; timestamp: Date }> {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  async getStats(): Promise<any> {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: os.platform(),
      nodeVersion: process.version,
      timestamp: new Date(),
    };
  }

  async getSystemInfo(): Promise<any> {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      hostname: os.hostname(),
      nodeVersion: process.version,
    };
  }

  async getHealthChecks(limit: number = 50): Promise<HealthCheck[]> {
    return this.healthCheckModel.find({
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getDiskUsage(): Promise<DiskUsage[]> {
    return this.diskUsageModel.find({
      order: { timestamp: 'DESC' },
      take: 50,
    });
  }

  async getBackups(): Promise<BackupLog[]> {
    return this.backupLogModel.find({
      order: { timestamp: 'DESC' },
      take: 50,
    });
  }

  async createBackup(): Promise<{ message: string; backup: BackupLog }> {
    const startTime = Date.now();
    const backupDir = this.configService.get('BACKUP_DIR', 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    try {
      // For now, just create a simple marker file
      // In production, you'd integrate with mongodump or similar
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const fileName = `backup-${timestamp}.marker`;
      const filePath = path.join(backupDir, fileName);

      fs.writeFileSync(filePath, JSON.stringify({
        timestamp: new Date(),
        type: 'database',
      }));

      const duration = Date.now() - startTime;
      const size = fs.statSync(filePath).size;

      const backup = new this.backupLogModel({
        type: 'database',
        status: 'success',
        filePath,
        size,
        duration,
      });

      await backup.save();

      return { message: 'Backup created successfully', backup };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const backup = new this.backupLogModel({
        type: 'database',
        status: 'failed',
        duration,
        error: error.message,
      });

      await backup.save();

      throw error;
    }
  }

  async getAlerts(resolved?: boolean): Promise<Alert[]> {
    const filter: any = {};
    if (resolved !== undefined) {
      filter.resolved = resolved;
    }

    return this.alertModel.find({
      where: filter,
      order: { timestamp: 'DESC' },
      take: 100,
    });
  }

  async resolveAlert(id: string): Promise<{ message: string }> {
    await this.alertModel.updateOne(
      { _id: id },
      {
        $set: {
          resolved: true,
          resolvedAt: new Date(),
        },
      },
    );

    return { message: 'Alert resolved successfully' };
  }

  async triggerDailyReport(): Promise<{ message: string }> {
    this.logger.log('Triggering daily report...');
    
    // Get system stats
    const stats = await this.getStats();
    const alerts = await this.getAlerts(false);
    const recentBackups = await this.backupLogModel.find({
      order: { timestamp: 'DESC' },
      take: 5,
    });

    // Log summary
    this.logger.log(`Daily Report Summary:
- Uptime: ${stats.uptime}s
- Unresolved Alerts: ${alerts.length}
- Recent Backups: ${recentBackups.length}
    `);

    return { message: 'Daily report triggered successfully' };
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorDiskSpace() {
    try {
      const uploadsPath = this.configService.get('UPLOADS_PATH', 'public/uploads');
      
      // Get disk space info
      const totalSpace = 1000000000000; // Mock value - in production, use a library
      const freeSpace = 500000000000; // Mock value
      const usedSpace = totalSpace - freeSpace;
      const usagePercentage = (usedSpace / totalSpace) * 100;

      // Calculate uploads size
      let uploadsSize = 0;
      if (fs.existsSync(uploadsPath)) {
        const getDirectorySize = (dir: string): number => {
          let size = 0;
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              size += getDirectorySize(filePath);
            } else {
              size += stats.size;
            }
          }
          return size;
        };
        uploadsSize = getDirectorySize(uploadsPath);
      }

      const warnPct = this.configService.get('DISK_WARN_PCT', 80);
      const critPct = this.configService.get('DISK_CRIT_PCT', 90);

      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (usagePercentage >= critPct) {
        status = 'critical';
      } else if (usagePercentage >= warnPct) {
        status = 'warning';
      }

      const diskUsage = new this.diskUsageModel({
        totalSpace,
        usedSpace,
        freeSpace,
        usagePercentage,
        uploadsSize,
        status,
      });

      await diskUsage.save();

      if (status !== 'normal') {
        this.logger.warn(`Disk usage ${status}: ${usagePercentage.toFixed(2)}%`);
      }
    } catch (error: any) {
      this.logger.error('Error monitoring disk space:', error.stack);
    }
  }
}
