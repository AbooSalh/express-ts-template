

const languageR = require("express").Router();
import LanguageC from "./controller";
import authMiddleware from "@/common/middleware/auth";

// Get all languages
languageR.get("/", LanguageC.getAll);
// Create a new language (admin only)
languageR.post("/", authMiddleware("admin"), LanguageC.create);
// Update a language by ID (admin only)
languageR.put("/:id", authMiddleware("admin"), LanguageC.update);
languageR.delete("/:id", authMiddleware("admin"), LanguageC.delete);
export default languageR;