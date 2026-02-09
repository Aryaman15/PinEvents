import type { Request, Response } from "express";
import { Event } from "../../models/Event";
import { JoinRequest } from "../../models/JoinRequest";
import { eventIdParamSchema } from "../../validation/events";
import { requireAdminForEvent } from "./utils";

export const getJoinRequests = async (req: Request, res: Response) => {
  const paramsResult = eventIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({ error: "Invalid event id" });
  }
  const { id } = paramsResult.data;
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
};
