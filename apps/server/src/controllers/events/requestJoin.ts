import type { Request, Response } from "express";
import { Event } from "../../models/Event";
import { EventMember } from "../../models/EventMember";
import { JoinRequest } from "../../models/JoinRequest";
import { eventIdParamSchema } from "../../validation/events";

export const requestJoin = async (req: Request, res: Response) => {
  const paramsResult = eventIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({ error: "Invalid event id" });
  }
  const { id } = paramsResult.data;
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
};
