import express from "express";
import { UserC as c } from "./controller";
import authMiddleware from "@/common/middleware/auth";

const userR = express.Router();
// Account deletion (code verification required)
userR.post(
  "/send-delete-account-code",
  authMiddleware(),
  c.sendDeleteAccountCode.validator,
  c.sendDeleteAccountCode.handler
);
userR.delete(
  "/delete-account",
  authMiddleware(),
  c.deleteAccount.validator,
  c.deleteAccount.handler
);

userR
  .route("/")
  .get(authMiddleware("admin"), c.getAll)
  .post(authMiddleware("admin"), c.create);
userR.patch(
  "/change-password",
  authMiddleware(),
  c.changePassword.validator,
  c.changePassword.handler
);
userR.get("/profile", authMiddleware(), c.getProfile.handler);
// update auth user
userR.put(
  "/update",
  authMiddleware(),
  c.updateAuthUser.handler
);

userR
  .route("/:id")
  .get(authMiddleware("admin"), c.getOne)
  .put(authMiddleware("admin"), c.update)
  .delete(authMiddleware("admin"), c.delete);

export default userR;
