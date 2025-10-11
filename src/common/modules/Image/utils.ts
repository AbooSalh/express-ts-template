/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import ApiError from "@/common/utils/api/ApiError";
import env from "@/common/config/env.config";

/**
 * Returns true when a delete request should force unlink all references
 * before deleting the Image document. It accepts any query object
 * (e.g., Express req.query) and safely parses the `force` flag.
 *
 * Example: `?force=true` → true, otherwise false.
 */
export function isForceDelete(query: any): boolean {
  return String(query?.force ?? "false").toLowerCase() === "true";
}

/**
 * Produces a concise list of where an image is referenced.
 * Helpful for error messages or logging.
 *
 * Input: Image.references[] array
 * Output: Array of { model, field, docId }
 */
export function summarizeReferences(refs: any[]) {
  return (refs || []).map((r) => ({
    model: r.model,
    field: r.field,
    docId: r.docId,
  }));
}

/**
 * Unlinks an image from all provided references. For each reference, this
 * attempts two strategies:
 * 1) $pull the image id from an array field
 * 2) $unset the field if it equals the image id (scalar field)
 *
 * If any unlink operation fails (e.g., model not found, permission issue),
 * this function throws an ApiError with 409 CONFLICT status to prevent a
 * partial delete.
 */
export async function unlinkAllReferences(refs: any[], imageId: any) {
  const errors: Array<{
    model: string;
    field: string;
    docId: string;
    error: string;
  }> = [];
  for (const r of refs || []) {
    try {
      const Model = mongoose.model(r.model);
      const pull = await Model.updateOne(
        { _id: r.docId },
        { $pull: { [r.field]: imageId } }
      );
      if (pull.modifiedCount === 0) {
        await Model.updateOne(
          { _id: r.docId, [r.field]: imageId },
          { $unset: { [r.field]: 1 } }
        );
      }
    } catch (e: any) {
      errors.push({
        model: r.model,
        field: r.field,
        docId: String(r.docId),
        error: e?.message || "unlink failed",
      });
    }
  }
  if (errors.length > 0) {
    throw new ApiError(
      [{ message: "Failed to unlink image from some references" }],
      "CONFLICT"
    );
  }
}

/**
 * Deletes all generated variant files for the given Image document from disk.
 * With the new structure, this removes the entire image directory.
 * It is safe to call even if files were previously removed.
 */
export function removeVariantFiles(img: any) {
  const uploadsRoot = path.resolve(env.UPLOADS_PATH);

  if (img._id) {
    // Remove the entire image directory for the new structure
    const imageDir = path.join(env.UPLOADS_PATH, "images", img._id.toString());
    const resolvedImageDir = path.resolve(imageDir);

    // Ensure the resolved path is within the uploads directory
    if (resolvedImageDir.startsWith(uploadsRoot + path.sep)) {
      try {
        if (fs.existsSync(resolvedImageDir)) {
          fs.rmSync(resolvedImageDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn(
          `Could not remove image directory ${resolvedImageDir}:`,
          error
        );
      }
    }
  }

  // Fallback: remove individual variant files (for backward compatibility)
  for (const v of img?.variants || []) {
    const unsafePath = String(v.url || "").replace(/^\/+/, "");
    const filePath = path.join(env.UPLOADS_PATH, unsafePath);
    const resolvedPath = path.resolve(filePath);

    // Ensure the resolved path is within the uploads directory
    if (!resolvedPath.startsWith(uploadsRoot + path.sep)) {
      continue;
    }

    try {
      if (fs.existsSync(resolvedPath)) fs.unlinkSync(resolvedPath);
    } catch (error) {
      console.warn(`Could not remove variant file ${resolvedPath}:`, error);
    }
  }
}
