import type { Request, Response } from "express";
import { Event } from "../../models/Event";
import { JoinRequest } from "../../models/JoinRequest";
import { joinRequestParamSchema } from "../../validation/events";
import { requireAdminForEvent } from "./utils";

export const rejectJoinRequest = async (req: Request, res: Response) => {
  const paramsResult = joinRequestParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({ error: "Invalid request" });
  }
  const { id, requestId } = paramsResult.data;
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
};
