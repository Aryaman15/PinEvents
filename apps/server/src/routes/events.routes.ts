import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import {
  createEvent,
  deleteEvent,
  getEventById,
  getEventsNear,
  handleJoinRequest,
  listJoinRequests,
  listMessages,
  requestJoin,
  uploadEventImages,
  sendMessage,
} from "../controllers/eventsController";
import { requireAuth } from "../middleware/requireAuth";

export const eventsRouter = Router();

const uploadsDir = path.join(process.cwd(), "uploads");

// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     fs.mkdirSync(uploadsDir, { recursive: true });
//     cb(null, uploadsDir);
//   },
//   filename: (_req, file, cb) => {
//     const ext = path.extname(file.originalname) || ".jpg";
//     cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
//   },
// });
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 4, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WEBP images are allowed"));
    }
  },
});

// const imageUpload = multer({
//   storage,
//   limits: { files: 4, fileSize: 5 * 1024 * 1024 },
//   fileFilter: (_req, file, cb) => {
//     cb(null, file.mimetype.startsWith("image/"));
//   },
// });

const joinLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});

eventsRouter.post("/", requireAuth, createLimiter, createEvent);

// eventsRouter.post(
//   "/uploads",
//   requireAuth,
//   imageUpload.array("images", 4),
//   uploadEventImages,
// );
eventsRouter.post(
  "/uploads",
  requireAuth,
  imageUpload.array("images", 4),
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("MULTER ERROR:", err);
    return res.status(400).json({ error: err.message });
  },
  uploadEventImages,
);

eventsRouter.get("/near", getEventsNear);

eventsRouter.get("/:id", getEventById);

eventsRouter.delete("/:id", requireAuth, deleteEvent);

eventsRouter.post("/:id/join", requireAuth, joinLimiter, requestJoin);

eventsRouter.get("/:id/requests", requireAuth, listJoinRequests);

eventsRouter.patch(
  "/:id/requests/:requestId",
  requireAuth,
  joinLimiter,
  handleJoinRequest,
);

eventsRouter.get("/:id/messages", requireAuth, listMessages);
eventsRouter.post("/:id/messages", requireAuth, sendMessage);
