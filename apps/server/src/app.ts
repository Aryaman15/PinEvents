import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter } from "./routes/auth";
import { eventsRouter } from "./routes/events";
import { meRouter } from "./routes/me";
import { getAllowedOrigins } from "./config/cors";

export const createApp = () => {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.use(
    helmet({
      referrerPolicy: { policy: "no-referrer" },
      crossOriginResourcePolicy: false,
    })
  );
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/events", eventsRouter);
  app.use("/me", meRouter);

  return { app, allowedOrigins };
};
