import { Router } from "express";
import EventLogC from "./controller";
import authMiddleware from "@/common/middleware/auth";

const eventLogR = Router();

// Get all events with filtering (admin only)
eventLogR.get("/", authMiddleware("admin"), EventLogC.getAll.handler);

// Get analytics summary
eventLogR.get(
  "/analytics",
  authMiddleware("admin"),
  EventLogC.getAnalytics.handler
);

export default eventLogR;
