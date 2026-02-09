import { Router } from "express";
import rateLimit from "express-rate-limit";
import { approveJoinRequest } from "../controllers/events/approveJoinRequest";
import { createEvent } from "../controllers/events/createEvent";
import { getEventById } from "../controllers/events/getEventById";
import { getEventMessages } from "../controllers/events/getEventMessages";
import { getJoinRequests } from "../controllers/events/getJoinRequests";
import { joinPublicEvent } from "../controllers/events/joinPublicEvent";
import { listNearbyEvents } from "../controllers/events/listNearbyEvents";
import { rejectJoinRequest } from "../controllers/events/rejectJoinRequest";
import { requestJoin } from "../controllers/events/requestJoin";
import { requireAuth } from "../middleware/requireAuth";

export const eventsRouter = Router();

const joinLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

eventsRouter.post("/", requireAuth, createEvent);
eventsRouter.get("/near", listNearbyEvents);
eventsRouter.get("/:id", getEventById);
eventsRouter.post("/:id/join", requireAuth, joinPublicEvent);
eventsRouter.post("/:id/request-join", requireAuth, joinLimiter, requestJoin);
eventsRouter.get("/:id/requests", requireAuth, getJoinRequests);
eventsRouter.post("/:id/requests/:requestId/approve", requireAuth, joinLimiter, approveJoinRequest);
eventsRouter.post("/:id/requests/:requestId/reject", requireAuth, joinLimiter, rejectJoinRequest);
eventsRouter.get("/:id/messages", requireAuth, getEventMessages);
