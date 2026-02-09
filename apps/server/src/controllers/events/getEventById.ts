import type { Request, Response } from "express";
import { Event } from "../../models/Event";
import { EventMember } from "../../models/EventMember";
import { JoinRequest } from "../../models/JoinRequest";
import { eventIdParamSchema } from "../../validation/events";
import { blurLocation, getUserIdFromAuthHeader } from "./utils";

export const getEventById = async (req: Request, res: Response) => {
  const paramsResult = eventIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({ error: "Invalid event id" });
  }
  const { id } = paramsResult.data;
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
      attendeeCount: event.acceptedMembers?.length ?? 0,
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
};
