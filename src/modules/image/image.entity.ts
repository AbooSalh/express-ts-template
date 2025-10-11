import { Entity, ObjectIdColumn, ObjectId, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface ImageVariant {
  name: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  sizeBytes?: number;
}

export interface ImageReference {
  model: string;
  field: string;
  docId: ObjectId;
  addedAt: Date;
}

@Entity('images')
@Index(['folder', 'createdAt'])
export class Image {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  originalName: string;

  @Column()
  fileName: string;

  @Column()
  mimeType: string;

  @Column()
  sizeBytes: number;

  @Column({ nullable: true })
  width?: number;

  @Column({ nullable: true })
  height?: number;

  @Column({ nullable: true })
  folder?: string;

  @Column({ type: 'array', default: [] })
  variants: ImageVariant[];

  @Column({ nullable: true })
  createdBy?: ObjectId;

  @Column({ type: 'array', default: [] })
  references: ImageReference[];

  @Column({ nullable: true })
  alt?: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'array', default: [] })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
