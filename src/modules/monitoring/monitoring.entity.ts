import { Entity, ObjectIdColumn, ObjectId, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('healthchecks')
@Index(['component', 'timestamp'])
export class HealthCheck {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column()
  status: 'healthy' | 'warning' | 'critical';

  @Column()
  component: string;

  @Column({ nullable: true })
  responseTime?: number;

  @Column({ nullable: true })
  error?: string;

  @Column({ type: 'json', nullable: true })
  details?: Record<string, any>;
}

@Entity('diskusages')
export class DiskUsage {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column()
  totalSpace: number;

  @Column()
  usedSpace: number;

  @Column()
  freeSpace: number;

  @Column()
  usagePercentage: number;

  @Column()
  uploadsSize: number;

  @Column()
  status: 'normal' | 'warning' | 'critical';
}

@Entity('backuplogs')
export class BackupLog {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column()
  type: 'uploads' | 'database';

  @Column()
  status: 'success' | 'failed';

  @Column({ nullable: true })
  filePath?: string;

  @Column({ nullable: true })
  size?: number;

  @Column({ nullable: true })
  duration?: number;

  @Column({ nullable: true })
  error?: string;
}

@Entity('alerts')
@Index(['timestamp', 'resolved'])
export class Alert {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column()
  level: 'info' | 'warning' | 'critical';

  @Column()
  category: 'disk' | 'database' | 'uploads' | 'system' | 'security';

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ default: false })
  resolved: boolean;

  @Column({ nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
