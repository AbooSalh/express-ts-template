import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongooseConfig = (): MongooseModuleOptions => {
  const config: MongooseModuleOptions = {
    uri: process.env.DB_URL || 'mongodb://localhost:27017',
    dbName: process.env.DB_NAME,
  };

  // Add authentication if credentials are provided
  if (process.env.DB_USER && process.env.DB_PASSWORD) {
    config.auth = {
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
    config.authSource = 'admin';
  }

  return config;
};
