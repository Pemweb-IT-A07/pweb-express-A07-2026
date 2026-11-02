import express from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { logger } from "./middlewares/logger.js";
import { notFound } from "./middlewares/notFound.js";
import { sendSuccess } from "./utils/response.js";

const app = express();

app.use(express.json());
app.use(logger);

app.get("/health", (_req, res) => {
  sendSuccess(res, 200, "Server MLBB Shop berjalan dengan baik");
});

app.use(notFound);
app.use(errorHandler);

export default app;
