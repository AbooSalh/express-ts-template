import { Router } from "express";
import { helloController } from "./hello.controller";

const router = Router();

router.get("/", helloController);

export default router;
