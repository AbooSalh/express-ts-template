import { Entity, ObjectIdColumn, ObjectId, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('eventlogs')
@Index(['refModel', 'refId', 'type'])
export class EventLog {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  refModel: string; // e.g., "Tour", "User", "Product"

  @Column()
  refId: ObjectId; // The actual document ID

  @Column()
  type: string; // e.g., "view", "click", "like"

  @Column()
  ip: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  userId?: ObjectId;

  @Column({ default: 1 })
  viewCount: number; // Number of views from this IP/user

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  lastViewedAt: Date; // Last time this IP/user viewed

  @CreateDateColumn()
  createdAt: Date;
}
