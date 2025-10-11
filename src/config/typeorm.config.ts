import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig = (): TypeOrmModuleOptions => {
  const config: any = {
    type: 'mongodb',
    url: process.env.DB_URL,
    database: process.env.DB_NAME,
    synchronize: false, // Don't auto-create schema in production
    logging: process.env.NODE_ENV === 'development',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  };

  // Add authentication if credentials are provided
  if (process.env.DB_USER && process.env.DB_PASSWORD) {
    config.username = process.env.DB_USER;
    config.password = process.env.DB_PASSWORD;
    config.authSource = 'admin';
  }

  return config;
};
