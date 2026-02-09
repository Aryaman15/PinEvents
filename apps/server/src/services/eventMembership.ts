import { Event } from "../models/Event";
import { EventMember } from "../models/EventMember";

const hasUserId = (value: string | { toString(): string }) => value.toString();

export const isAcceptedMember = async (
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

  if (acceptedMembers) {
    return acceptedMembers.some((member) => hasUserId(member) === userId);
  }

  const event = await Event.findById(eventId).select("acceptedMembers").lean();
  if (!event) {
    return false;
  }

  return Boolean(event.acceptedMembers?.some((member) => hasUserId(member) === userId));
};
