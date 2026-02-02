import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/requireAuth";
import { Event } from "../models/Event";
import { EventMember } from "../models/EventMember";
import { JoinRequest } from "../models/JoinRequest";
import {
  createEventSchema,
  eventIdParamsSchema,
  eventsNearQuerySchema,
  requestIdParamsSchema,
} from "../validation/events";

export const eventsRouter = Router();

const getUserIdFromAuthHeader = (authHeader?: string) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret) as { userId?: string };
    return payload.userId ?? null;
  } catch (error) {
    return null;
  }
};

const blurLocation = (coordinates: [number, number], radiusMeters = 250) => {
  const [lng, lat] = coordinates;
  const metersPerDegreeLat = 111_111;
  const deltaLat = (Math.random() * 2 - 1) * (radiusMeters / metersPerDegreeLat);
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos((lat * Math.PI) / 180);
  const deltaLng = (Math.random() * 2 - 1) * (radiusMeters / metersPerDegreeLng);

  return [lng + deltaLng, lat + deltaLat] as [number, number];
};

eventsRouter.post("/", requireAuth, async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = createEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { startTime, endTime, ...rest } = parseResult.data;
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return res.status(400).json({ error: "Invalid event time range" });
  }

  const event = await Event.create({
    ...rest,
    startTime: startDate,
    endTime: endDate,
    createdBy: userId,
  });

  await EventMember.create({
    eventId: event._id,
    userId,
    role: "admin",
    status: "accepted",
  });

  return res.status(201).json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      type: event.type,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
    },
  });
});

eventsRouter.get("/near", async (req, res) => {
  const parseResult = eventsNearQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid query" });
  }

  const { lat, lng, radiusKm, q, category } = parseResult.data;
  const authHeader = req.header("authorization");
  const userId = getUserIdFromAuthHeader(authHeader);

  const filters: Record<string, unknown> = {};
  if (category) {
    filters.category = category;
  }
  if (q) {
    const regex = new RegExp(q, "i");
    filters.$or = [{ title: regex }, { description: regex }];
  }

  const events = await Event.find({
    ...filters,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .limit(200)
    .lean();

  const membershipMap = userId
    ? await EventMember.find({ userId, status: "accepted" })
        .select({ eventId: 1 })
        .lean()
    : [];
  const acceptedEventIds = new Set(membershipMap.map((member) => member.eventId.toString()));

  const response = events.map((event) => {
    const isPrivate = event.type === "private";
    const isAcceptedMember = userId ? acceptedEventIds.has(event._id.toString()) : false;
    const shouldReveal = !isPrivate || isAcceptedMember;
    const base = {
      id: event._id.toString(),
      title: event.title,
      description: event.description,
      category: event.category,
      type: event.type,
      startTime: event.startTime,
      endTime: event.endTime,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
    };

    if (shouldReveal) {
      return {
        ...base,
        location: event.location,
      };
    }

    return {
      ...base,
      redactedLocation: {
        type: "Point",
        coordinates: blurLocation(event.location.coordinates as [number, number]),
      },
    };
  });

  return res.status(200).json({ events: response });
});

eventsRouter.get("/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = eventIdParamsSchema.safeParse(req.params);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const event = await Event.findById(parseResult.data.id).lean();
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const membership = await EventMember.findOne({
    eventId: event._id,
    userId,
    status: "accepted",
  })
    .select({ role: 1 })
    .lean();

  const shouldReveal = event.type === "public" || Boolean(membership);

  const base = {
    id: event._id.toString(),
    title: event.title,
    description: event.description,
    category: event.category,
    type: event.type,
    startTime: event.startTime,
    endTime: event.endTime,
    createdBy: event.createdBy,
    createdAt: event.createdAt,
    isMember: Boolean(membership),
    role: membership?.role ?? null,
  };

  return res.status(200).json({
    event: shouldReveal
      ? { ...base, location: event.location }
      : {
          ...base,
          redactedLocation: {
            type: "Point",
            coordinates: blurLocation(event.location.coordinates as [number, number]),
          },
        },
  });
});

eventsRouter.post("/:id/request-join", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = eventIdParamsSchema.safeParse(req.params);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const event = await Event.findById(parseResult.data.id).lean();
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const existingMember = await EventMember.findOne({
    eventId: event._id,
    userId,
    status: "accepted",
  }).lean();
  if (existingMember) {
    return res.status(200).json({ status: "already-member" });
  }

  const joinRequest = await JoinRequest.findOneAndUpdate(
    { eventId: event._id, userId },
    { status: "pending" },
    { upsert: true, new: true }
  ).lean();

  return res.status(201).json({
    request: {
      id: joinRequest._id.toString(),
      status: joinRequest.status,
    },
  });
});

eventsRouter.get("/:id/requests", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = eventIdParamsSchema.safeParse(req.params);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const eventId = parseResult.data.id;
  const membership = await EventMember.findOne({
    eventId,
    userId,
    status: "accepted",
    role: "admin",
  }).lean();
  if (!membership) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const requests = await JoinRequest.find({ eventId, status: "pending" })
    .sort({ createdAt: 1 })
    .lean();

  return res.status(200).json({
    requests: requests.map((request) => ({
      id: request._id.toString(),
      userId: request.userId,
      status: request.status,
      createdAt: request.createdAt,
    })),
  });
});

eventsRouter.post("/:id/requests/:requestId/approve", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = requestIdParamsSchema.safeParse(req.params);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { id: eventId, requestId } = parseResult.data;
  const membership = await EventMember.findOne({
    eventId,
    userId,
    status: "accepted",
    role: "admin",
  }).lean();
  if (!membership) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const joinRequest = await JoinRequest.findOne({
    _id: requestId,
    eventId,
  });
  if (!joinRequest) {
    return res.status(404).json({ error: "Request not found" });
  }

  joinRequest.status = "approved";
  await joinRequest.save();

  await EventMember.findOneAndUpdate(
    { eventId, userId: joinRequest.userId },
    { role: "member", status: "accepted" },
    { upsert: true }
  );

  return res.status(200).json({ status: "approved" });
});

eventsRouter.post("/:id/requests/:requestId/reject", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = requestIdParamsSchema.safeParse(req.params);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { id: eventId, requestId } = parseResult.data;
  const membership = await EventMember.findOne({
    eventId,
    userId,
    status: "accepted",
    role: "admin",
  }).lean();
  if (!membership) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const joinRequest = await JoinRequest.findOne({
    _id: requestId,
    eventId,
  });
  if (!joinRequest) {
    return res.status(404).json({ error: "Request not found" });
  }

  joinRequest.status = "rejected";
  await joinRequest.save();

  return res.status(200).json({ status: "rejected" });
});
