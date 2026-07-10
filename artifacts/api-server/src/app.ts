import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./lib/api-response";

const app: Express = express();

const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) {
  app.set("trust proxy", trustProxy === "true" ? 1 : trustProxy);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";
const developmentCorsOrigins = [
  "http://localhost:19006",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8081",
  "http://localhost:8083",
  "http://127.0.0.1:19006",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8083",
];

if (isProduction && corsOrigins.length === 0) {
  throw new Error("CORS_ORIGINS must be set in production");
}

if (isProduction && corsOrigins.includes("*")) {
  throw new Error('CORS_ORIGINS cannot include "*" in production');
}

app.use(
  cors({
    origin: corsOrigins.length === 0 ? developmentCorsOrigins : corsOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
