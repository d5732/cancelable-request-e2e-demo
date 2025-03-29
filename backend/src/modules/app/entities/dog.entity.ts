import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'dogs' }) // Table name: dogs
export class Dog {
  @ApiProperty({ description: 'Unique identifier of the dog' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Name of the dog' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ description: 'Timestamp when the dog was created' })
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @ApiProperty({ description: 'Timestamp when the dog was last updated' })
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
