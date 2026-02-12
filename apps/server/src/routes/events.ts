import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  approveJoinRequest,
  createEvent,
  getEventById,
  getEventsNear,
  listJoinRequests,
  listMessages,
  rejectJoinRequest,
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

eventsRouter.post("/", requireAuth, createEvent);
eventsRouter.get("/near", getEventsNear);
eventsRouter.get("/:id", getEventById);
eventsRouter.post("/:id/request-join", requireAuth, joinLimiter, requestJoin);
eventsRouter.get("/:id/requests", requireAuth, listJoinRequests);
eventsRouter.post("/:id/requests/:requestId/approve", requireAuth, joinLimiter, approveJoinRequest);
eventsRouter.post("/:id/requests/:requestId/reject", requireAuth, joinLimiter, rejectJoinRequest);
eventsRouter.get("/:id/messages", requireAuth, listMessages);
