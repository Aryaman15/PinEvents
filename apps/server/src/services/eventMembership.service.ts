import { Event } from "../models/Event";
import { EventMember } from "../models/EventMember";
import mongoose from "mongoose";

// const hasUserId = (value: string | { toString(): string }) => value.toString();
type IdLike = string | mongoose.Types.ObjectId;

const normalizeId = (id: IdLike): string => {
  return id.toString();
};

export const isAcceptedMember = async (
  eventId: string,
  userId?: string,
  acceptedMembers?: IdLike[],
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

  if (acceptedMembers) {
    return acceptedMembers.some((member) => normalizeId(member) === userId);
  }

  const event = await Event.findById(eventId).select("acceptedMembers").lean();
  if (!event) {
    return false;
  }

  return Boolean(
    event.acceptedMembers.some((member) => normalizeId(member) === userId),
  );
};

export const isAdminForEvent = async (eventId: string, userId?: string) => {
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
