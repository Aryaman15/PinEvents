import type { Request, Response } from "express";
import { Event } from "../../models/Event";
import { EventMember } from "../../models/EventMember";
import { eventIdParamSchema } from "../../validation/events";

export const joinPublicEvent = async (req: Request, res: Response) => {
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

  if (event.type !== "public") {
    return res.status(400).json({ error: "Join is only available for public events" });
  }

  const existingMembership = await EventMember.findOne({
    eventId: event._id,
    userId,
    status: "accepted",
  }).lean();

  if (!existingMembership) {
    await EventMember.create({
      eventId: event._id,
      userId,
      role: "member",
      status: "accepted",
    });
  }

  const acceptedMembers = event.acceptedMembers ?? [];
  if (!acceptedMembers.some((member) => member.toString() === userId)) {
    acceptedMembers.push(userId);
    event.acceptedMembers = acceptedMembers;
    await event.save();
  }

  return res.status(200).json({ attendeeCount: event.acceptedMembers?.length ?? 0 });
};
