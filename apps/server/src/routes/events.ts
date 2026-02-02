import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/requireAuth";
import { Event } from "../models/Event";
import { EventMember } from "../models/EventMember";
import { EventMessage } from "../models/EventMessage";
import { JoinRequest } from "../models/JoinRequest";
import { User } from "../models/User";
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

const isAcceptedMemberForEvent = async (
  eventId: string,
  userId?: string,
  acceptedMembers?: Array<string | { toString(): string }>
) => {
  if (!userId) {
    return false;
  }

  const membership = await EventMember.findOne({
    eventId,
    userId,
    status: "accepted",
  }).lean();

  if (membership) {
    return true;
  }

  return Boolean(
    acceptedMembers?.some((member) => member.toString() === userId)
  );
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
    acceptedMembers: [userId],
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

  const eventIds = events.map((event) => event._id.toString());
  const membershipByEventId = new Set<string>();
  if (userId && eventIds.length) {
    const memberships = await EventMember.find({
      eventId: { $in: eventIds },
      userId,
      status: "accepted",
    })
      .select("eventId")
      .lean();
    memberships.forEach((membership) => {
      membershipByEventId.add(membership.eventId.toString());
    });
  }

  const response = events.map((event) => {
    const isPrivate = event.type === "private";
    const isAcceptedFromMembers = membershipByEventId.has(event._id.toString());
    const isAcceptedMember = Boolean(
      isAcceptedFromMembers ||
        (userId && event.acceptedMembers?.some((member) => member.toString() === userId))
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

eventsRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  const authHeader = req.header("authorization");
  const userId = getUserIdFromAuthHeader(authHeader);

  const event = await Event.findById(id).lean();
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const isPrivate = event.type === "private";
  let membership = null;
  let joinRequest = null;

  if (userId) {
    membership = await EventMember.findOne({
      eventId: event._id,
      userId,
      status: "accepted",
    }).lean();
    joinRequest = await JoinRequest.findOne({
      eventId: event._id,
      userId,
    }).lean();
  }

  const isAcceptedMember = Boolean(
    membership || (userId && event.acceptedMembers?.some((member) => member.toString() === userId))
  );
  const shouldReveal = !isPrivate || isAcceptedMember;

  return res.status(200).json({
    event: {
      id: event._id.toString(),
      title: event.title,
      description: event.description,
      category: event.category,
      type: event.type,
      startTime: event.startTime,
      endTime: event.endTime,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      ...(shouldReveal
        ? { location: event.location }
        : {
            redactedLocation: {
              type: "Point",
              coordinates: blurLocation(event.location.coordinates as [number, number]),
            },
          }),
      viewer: {
        isMember: Boolean(isAcceptedMember),
        role: membership?.role ?? null,
        status: membership?.status ?? null,
        joinRequestStatus: joinRequest?.status ?? null,
      },
    },
  });
});

eventsRouter.post("/:id/request-join", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  if (event.type !== "private") {
    return res.status(400).json({ error: "Join requests are only needed for private events" });
  }

  const existingMembership = await EventMember.findOne({
    eventId: event._id,
    userId,
    status: "accepted",
  }).lean();
  if (existingMembership) {
    return res.status(200).json({ joinRequest: { status: "approved" } });
  }

  const existingRequest = await JoinRequest.findOne({
    eventId: event._id,
    userId,
  });

  if (existingRequest) {
    if (existingRequest.status === "pending") {
      return res.status(200).json({ joinRequest: existingRequest });
    }
    if (existingRequest.status === "approved") {
      return res.status(200).json({ joinRequest: existingRequest });
    }

    existingRequest.status = "pending";
    await existingRequest.save();
    return res.status(200).json({ joinRequest: existingRequest });
  }

  const joinRequest = await JoinRequest.create({
    eventId: event._id,
    userId,
    status: "pending",
  });

  return res.status(201).json({ joinRequest });
});

const requireAdminForEvent = async (eventId: string, userId?: string) => {
  if (!userId) {
    return false;
  }

  const membership = await EventMember.findOne({
    eventId,
    userId,
    role: "admin",
    status: "accepted",
  }).lean();

  return Boolean(membership);
};

eventsRouter.get("/:id/requests", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  const event = await Event.findById(id).lean();
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const isAdmin = await requireAdminForEvent(id, userId);
  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const requests = await JoinRequest.find({ eventId: event._id })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    requests: requests.map((request) => ({
      id: request._id.toString(),
      eventId: request.eventId.toString(),
      userId: request.userId.toString(),
      status: request.status,
      createdAt: request.createdAt,
    })),
  });
});

eventsRouter.post("/:id/requests/:requestId/approve", requireAuth, async (req, res) => {
  const { id, requestId } = req.params;
  const userId = req.userId;

  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const isAdmin = await requireAdminForEvent(id, userId);
  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const joinRequest = await JoinRequest.findOne({ _id: requestId, eventId: event._id });
  if (!joinRequest) {
    return res.status(404).json({ error: "Request not found" });
  }

  joinRequest.status = "approved";
  await joinRequest.save();

  await EventMember.findOneAndUpdate(
    { eventId: event._id, userId: joinRequest.userId },
    { eventId: event._id, userId: joinRequest.userId, role: "member", status: "accepted" },
    { upsert: true }
  );

  await Event.updateOne(
    { _id: event._id },
    { $addToSet: { acceptedMembers: joinRequest.userId } }
  );

  return res.status(200).json({
    request: {
      id: joinRequest._id.toString(),
      status: joinRequest.status,
    },
  });
});

eventsRouter.post("/:id/requests/:requestId/reject", requireAuth, async (req, res) => {
  const { id, requestId } = req.params;
  const userId = req.userId;

  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const isAdmin = await requireAdminForEvent(id, userId);
  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const joinRequest = await JoinRequest.findOne({ _id: requestId, eventId: event._id });
  if (!joinRequest) {
    return res.status(404).json({ error: "Request not found" });
  }

  joinRequest.status = "rejected";
  await joinRequest.save();

  return res.status(200).json({
    request: {
      id: joinRequest._id.toString(),
      status: joinRequest.status,
    },
  });
});

eventsRouter.get("/:id/messages", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const limitParam = Number(req.query.limit);
  const limit = Number.isNaN(limitParam) ? 50 : Math.min(limitParam, 200);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const event = await Event.findById(id).lean();
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const isAccepted = await isAcceptedMemberForEvent(id, userId, event.acceptedMembers);
  if (!isAccepted) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const messages = await EventMessage.find({ eventId: event._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const userIds = Array.from(new Set(messages.map((message) => message.userId.toString())));
  const users = await User.find({ _id: { $in: userIds } })
    .select("displayName")
    .lean();
  const displayNameById = new Map(users.map((user) => [user._id.toString(), user.displayName ?? ""]));

  return res.status(200).json({
    messages: messages
      .map((message) => ({
        id: message._id.toString(),
        eventId: message.eventId.toString(),
        text: message.text,
        createdAt: message.createdAt,
        displayName: displayNameById.get(message.userId.toString()) ?? "",
      }))
      .reverse(),
  });
});
