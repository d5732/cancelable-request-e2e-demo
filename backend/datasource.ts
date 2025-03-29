import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({ path: './config/database.env' });

export const appDataSourceOptions = {
  type: 'postgres' as const,
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true, // TODO(d5732): Remove synchronize: true and use migrations instead
  // entities: [__dirname + '/src/modules/**/*.entity{.ts, .js}'], // TODO(d5732): May need this once using migrations instead of synchronize: true
  // migrations: [__dirname + '/migrations/*.ts'],
  logging: true,
};

export const appDataSource = new DataSource(appDataSourceOptions);
