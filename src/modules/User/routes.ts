import express from "express";
import { UserC as c } from "./controller";
import { imageUploader } from "@/common/middleware/imageHandler";
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

const { upload, processImages } = imageUploader("user", [
  { name: "image", maxCount: 1 },
]);



userR
  .route("/")
  .get(authMiddleware("admin"), c.getAll.validator, c.getAll.handler)
  .post(
    authMiddleware("admin"),
    upload,
    processImages,
    c.create.validator,
    c.create.handler
  );
userR.patch(
  "/change-password",
  authMiddleware(),
  c.changePassword.validator,
  c.changePassword.handler
);
userR.get("/profile", authMiddleware(), c.getProfile.handler, c.getOne.handler);
// update auth user
userR.put(
  "/update",
  authMiddleware(),
  c.updateAuthUser.handler,
  c.update.validator,
  c.update.handler
);

userR
  .route("/:id")
  .get(authMiddleware("admin"), c.getOne.validator, c.getOne.handler)
  .put(
    authMiddleware("admin"),
    upload,
    processImages,
    c.update.validator,
    c.update.handler
  )
  .delete(authMiddleware("admin"), c.deleteOne.validator, c.deleteOne.handler);

export default userR;
