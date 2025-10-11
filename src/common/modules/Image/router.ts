import { Router } from "express";
import authMiddleware from "@/common/middleware/auth";
import createImageCenter from "@/common/middleware/imageCenter";
import ImageC from "./controller";
import { uploadRateLimiter } from "@/common/utils/api/rateLimiter";

// Centralized image uploads go to /uploads/images/[optionalFolder]
// Admin can choose to group in folders; client can pass ?folder=... or body.folder
const r = Router();

const { upload, processImages } = createImageCenter({
  basePath: "images",
  fieldName: "files",
  maxCount: 20,
});

r.route("/")
  .get(ImageC.list.validator, ImageC.list.handler)
  .post(
    uploadRateLimiter,
    authMiddleware("admin"),
    upload,
    processImages,
    ImageC.upload.validator,
    ImageC.upload.handler
  );

r.get(
  "/variant-presets",
  authMiddleware("admin"),
  ImageC.getVariantPresets.validator,
  ImageC.getVariantPresets.handler
);

r.get(
  "/stats",
  authMiddleware("admin"),
  ImageC.getStats.validator,
  ImageC.getStats.handler
);

r.get(
  "/folders",
  authMiddleware("admin"),
  ImageC.listFolders.validator,
  ImageC.listFolders.handler
);

r.delete(
  "/bulk",
  authMiddleware("admin"),
  ImageC.bulkDelete.validator,
  ImageC.bulkDelete.handler
);

// ============= ENHANCED FOLDER MANAGEMENT ROUTES =============

// Create a new folder
r.post(
  "/folders",
  authMiddleware("admin"),
  ImageC.createFolder.validator,
  ImageC.createFolder.handler
);

// Get enhanced folder statistics
r.get(
  "/folders/stats",
  authMiddleware("admin"),
  ImageC.getFolderStats.validator,
  ImageC.getFolderStats.handler
);

// Rename a folder
r.put(
  "/folders/:oldName",
  authMiddleware("admin"),
  ImageC.renameFolder.validator,
  ImageC.renameFolder.handler
);

// Delete a folder
r.delete(
  "/folders/:name",
  authMiddleware("admin"),
  ImageC.deleteFolder.validator,
  ImageC.deleteFolder.handler
);

// Move images to a folder
r.put(
  "/move-to-folder",
  authMiddleware("admin"),
  ImageC.moveImagesToFolder.validator,
  ImageC.moveImagesToFolder.handler
);

// ============= BULK OPERATIONS ROUTES =============

// Enhanced bulk delete
r.delete(
  "/bulk/enhanced",
  authMiddleware("admin"),
  ImageC.bulkDeleteEnhanced.validator,
  ImageC.bulkDeleteEnhanced.handler
);

// Bulk move images
r.put(
  "/bulk/move",
  authMiddleware("admin"),
  ImageC.bulkMoveImages.validator,
  ImageC.bulkMoveImages.handler
);

// Auto-organize images
r.post(
  "/organize",
  authMiddleware("admin"),
  ImageC.organizeImages.validator,
  ImageC.organizeImages.handler
);

// Bulk download images as zip
r.post(
  "/bulk-download",
  authMiddleware("admin"),
  ImageC.bulkDownload.validator,
  ImageC.bulkDownload.handler
);

r.route("/:id")
  .get(ImageC.getOne.validator, ImageC.getOne.handler)
  .put(authMiddleware("admin"), ImageC.update.validator, ImageC.update.handler)
  .delete(
    authMiddleware("admin"),
    ImageC.delete.validator,
    ImageC.delete.handler
  );

// Translation management routes
r.get(
  "/:id/translations",
  authMiddleware(),
  ImageC.getTranslations
);

r.post(
  "/:id/translations",
  authMiddleware("admin"),
  ImageC.createTranslation
);

r.put(
  "/:id/translations/:language",
  authMiddleware("admin"),
  ImageC.updateTranslation
);

r.delete(
  "/:id/translations/:language",
  authMiddleware("admin"),
  ImageC.deleteTranslation
);

r.put(
  "/:id/translations/:language/upsert",
  authMiddleware("admin"),
  ImageC.upsertTranslation
);

const imageR = r
export default imageR;
