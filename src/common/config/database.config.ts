/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import logger from "@/common/utils/logger";
import env from "./env.config";

const dbConnection = {
  connect: async () => {
    try {
      // Build connection options
      const connectionOptions: mongoose.ConnectOptions = {
        dbName: env.DB_NAME,
      };

      // Add authentication if credentials are provided
      if (env.DB_USER && env.DB_PASSWORD) {
        connectionOptions.auth = {
          username: env.DB_USER,
          password: env.DB_PASSWORD,
        };
        connectionOptions.authSource = "admin"; // Default auth database
      }

      const conn = await mongoose.connect(env.DB_URL, connectionOptions);
      logger.info(`Database Connected: ${conn.connection.host}`, {
        host: conn.connection.host,
        database: conn.connection.name,
        port: conn.connection.port,
        authenticated: !!(env.DB_USER && env.DB_PASSWORD),
      });
    } catch (err: any) {
      logger.error(`Database Connection Error: ${err.message}`, {
        error: err,
        stack: err.stack,
      });
      // Rethrow so callers (server, seeder) can fail fast instead of continuing disconnected
      throw err;
    }
  },
  close: async () => {
    try {
      await mongoose.connection.close();
      logger.info("Database Disconnected");
    } catch (err: any) {
      logger.error(`Database Disconnection Error: ${err.message}`, {
        error: err,
        stack: err.stack,
      });
    }
  },
};

export default dbConnection;
