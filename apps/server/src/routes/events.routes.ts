import { Router } from "express";
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
} from "../controllers/eventsController";
import { requireAuth } from "../middleware/requireAuth";

export const eventsRouter = Router();

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
