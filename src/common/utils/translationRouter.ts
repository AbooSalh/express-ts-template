import { Router } from "express";
import authMiddleware from "@/common/middleware/auth";

/**
 * Generic translation router factory that creates standardized translation routes
 * for any module with translation support
 *
 * @param controller - The controller instance that has translation methods
 * @returns Router with translation routes
 */
export function createTranslationRouter(controller: any): Router {
  const translationRouter = Router();

  // POST /:id/translations - Create a new translation for an entity
  translationRouter.post(
    "/:id/translations",
    authMiddleware("admin"),
    controller.createTranslation
  );

  // GET /:id/translations - Get all translations for an entity
  translationRouter.get(
    "/:id/translations",
    authMiddleware(),
    controller.getTranslations
  );

  // PUT /:id/translations/:language - Update a specific translation
  translationRouter.put(
    "/:id/translations/:language",
    authMiddleware("admin"),
    controller.updateTranslation
  );

  // DELETE /:id/translations/:language - Delete a specific translation
  translationRouter.delete(
    "/:id/translations/:language",
    authMiddleware("admin"),
    controller.deleteTranslation
  );

  // PUT /:id/translations/:language/upsert - Create or update a translation
  translationRouter.put(
    "/:id/translations/:language/upsert",
    authMiddleware("admin"),
    controller.upsertTranslation
  );

  return translationRouter;
}

/**
 * Utility function to add translation routes to an existing router
 *
 * @param router - The main router to add translation routes to
 * @param controller - The controller instance that has translation methods
 */
export function addTranslationRoutes(router: Router, controller: any): void {
  const translationRouter = createTranslationRouter(controller);
  router.use(translationRouter);
}

export default { createTranslationRouter, addTranslationRoutes };
