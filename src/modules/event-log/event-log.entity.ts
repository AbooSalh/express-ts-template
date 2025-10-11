import { Entity, ObjectIdColumn, ObjectId, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('eventlogs')
@Index(['refModel', 'refId', 'type'])
export class EventLog {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  refModel: string; // e.g., "Tour", "User", "Product"

  @Column()
  refId: string; // The actual document ID

  @Column()
  type: string; // e.g., "view", "click", "like"

  @Column()
  ip: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ default: 1 })
  viewCount: number; // Number of views from this IP/user

  @Column({ default: () => new Date() })
  lastViewedAt: Date; // Last time this IP/user viewed

  @CreateDateColumn()
  createdAt: Date;
}
