import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/requireAuth";
import { Event } from "../models/Event";
import { createEventSchema, eventsNearQuerySchema } from "../validation/events";

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

  const acceptedMembers =
    rest.type === "private" ? [userId] : [userId];

  const event = await Event.create({
    ...rest,
    startTime: startDate,
    endTime: endDate,
    createdBy: userId,
    acceptedMembers,
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

  const response = events.map((event) => {
    const isPrivate = event.type === "private";
    const isAcceptedMember = Boolean(
      userId && event.acceptedMembers?.some((member) => member.toString() === userId)
    );
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
