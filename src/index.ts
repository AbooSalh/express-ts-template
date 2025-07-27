import { Application } from "express";
import authRouter from "./modules/User/auth/auth.route";
import userR from "./modules/User/routes";
import { helloRoutes } from "./modules/hello/hello.module";


export const mountRoutes = (app: Application) => {
  app.use("/api/users", userR);
  app.use("/api/auth", authRouter);
  app.use("/", helloRoutes);
};
