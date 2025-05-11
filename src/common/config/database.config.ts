/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";

const dbConnection = {
  connect: async () => {
    try {
      const conn = await mongoose.connect(process.env.DB_URL as string, {
        dbName: process.env.DB_NAME,
      });
      console.log(`Database Connected: ${conn.connection.host}`);
    } catch (err: any) {
      console.error(`Database Connection Error: ${err.message}`);
    }
  },
  close: async () => {
    try {
      await mongoose.connection.close();
      console.log("Database Disconnected");
    } catch (err: any) {
      console.error(`Database Disconnection Error: ${err.message}`);
    }
  },
};

export default dbConnection;
