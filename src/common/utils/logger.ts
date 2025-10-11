import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import env from "@/common/config/env.config";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const isDevelopment = env.NODE_ENV === "development";
  return isDevelopment ? "debug" : env.LOG_LEVEL;
};

// Define format for logs (prints metadata objects for visibility)
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info: any) => {
    const { timestamp, level, message, ...meta } = info;
    const hasMeta = meta && Object.keys(meta).length > 0;
    const metaString = hasMeta ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

// Define format for file logs (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format,
  }),

  // Error log file
  new DailyRotateFile({
    filename: path.join("logs", "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "error",
    format: fileFormat,
    maxSize: "20m",
    maxFiles: "14d",
    zippedArchive: true,
  }),

  // Combined log file
  new DailyRotateFile({
    filename: path.join("logs", "combined-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    format: fileFormat,
    maxSize: "20m",
    maxFiles: "14d",
    zippedArchive: true,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join("logs", "exceptions-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      format: fileFormat,
      maxSize: "20m",
      maxFiles: "14d",
      zippedArchive: true,
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join("logs", "rejections-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      format: fileFormat,
      maxSize: "20m",
      maxFiles: "14d",
      zippedArchive: true,
    }),
  ],
});

// Create logs directory if it doesn't exist
import fs from "fs";
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default logger;
