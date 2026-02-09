import type { Request, Response } from "express";
import { Event } from "../../models/Event";
import { EventMessage } from "../../models/EventMessage";
import { User } from "../../models/User";
import { eventIdParamSchema, messagesQuerySchema } from "../../validation/events";
import { isAcceptedMemberForEvent } from "./utils";

export const getEventMessages = async (req: Request, res: Response) => {
  const paramsResult = eventIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({ error: "Invalid event id" });
  }
  const queryResult = messagesQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({ error: "Invalid query" });
  }
  const { id } = paramsResult.data;
  const userId = req.userId;
  const limitParam = queryResult.data.limit ? Number(queryResult.data.limit) : NaN;
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
};
