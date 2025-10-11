import type { Application } from "express";
import { Router } from "express";

import eventLogR from "./common/modules/EventLog/router";
import languageR from "./common/modules/Language/router";
import userR from "./common/modules/User/routes";
import imageR from "./common/modules/Image/router";
import monitoringR from "./common/modules/Monitoring/router";
import authR from "./common/modules/User/auth/auth.route";

export const mountRoutes = (app: Application) => {
  const apiRouter = Router();
  apiRouter.use("/auth", authR);
  apiRouter.use("/users", userR);
  apiRouter.use("/events", eventLogR);
  apiRouter.use("/languages", languageR);
  apiRouter.use("/images", imageR);
  apiRouter.use("/monitoring", monitoringR);
  apiRouter.use("/languages", languageR);
  app.use("/api/v1", apiRouter);
};
