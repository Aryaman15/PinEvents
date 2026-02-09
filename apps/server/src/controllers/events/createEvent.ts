import type { Request, Response } from "express";
import { Event } from "../../models/Event";
import { EventMember } from "../../models/EventMember";
import { createEventSchema } from "../../validation/events";

export const createEvent = async (req: Request, res: Response) => {
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

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate
  ) {
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
      attendeeCount: event.acceptedMembers?.length ?? 0,
    },
  });
};
