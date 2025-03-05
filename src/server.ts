import "tsconfig-paths/register"; // Add this at the top

import express from "express";
import dotenv from "dotenv";
import { helloRoutes } from "@/modules/hello/hello.module";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Register Hello Routes
app.use("/", helloRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
