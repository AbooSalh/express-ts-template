import { Router } from "express";
import monitoringController from "./controller";
import authMiddleware from "@/common/middleware/auth";

const router = Router();

// Public health endpoint (no auth required)
router.get("/health", monitoringController.health);

// Protected admin endpoints
router.use(authMiddleware("admin"));

router.get("/stats", monitoringController.getStats);
router.get("/health-checks", monitoringController.getHealthChecks);
router.get("/disk-usage", monitoringController.getDiskUsage);
router.get("/backups", monitoringController.getBackups);
router.post("/backups", monitoringController.createBackup);
router.get("/alerts", monitoringController.getAlerts);
router.put("/alerts/:id/resolve", monitoringController.resolveAlert);
router.get("/system", monitoringController.getSystemInfo);
router.post("/reports/daily", monitoringController.triggerDailyReport);

const monitoringR = router;
export default monitoringR;
