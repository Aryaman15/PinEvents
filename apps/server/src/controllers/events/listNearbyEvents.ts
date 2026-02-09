import type { Request, Response } from "express";
import { Event } from "../../models/Event";
import { EventMember } from "../../models/EventMember";
import { eventsNearQuerySchema } from "../../validation/events";
import { blurLocation, getUserIdFromAuthHeader } from "./utils";

export const listNearbyEvents = async (req: Request, res: Response) => {
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
      attendeeCount: event.acceptedMembers?.length ?? 0,
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
};
