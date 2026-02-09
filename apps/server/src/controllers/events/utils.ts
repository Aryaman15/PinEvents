import jwt from "jsonwebtoken";
import { EventMember } from "../../models/EventMember";

export const getUserIdFromAuthHeader = (authHeader?: string) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret) as { userId?: string };
    return payload.userId ?? null;
  } catch (error) {
    return null;
  }
};

export const blurLocation = (coordinates: [number, number], radiusMeters = 250) => {
  const [lng, lat] = coordinates;
  const metersPerDegreeLat = 111_111;
  const deltaLat = (Math.random() * 2 - 1) * (radiusMeters / metersPerDegreeLat);
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos((lat * Math.PI) / 180);
  const deltaLng = (Math.random() * 2 - 1) * (radiusMeters / metersPerDegreeLng);

  return [lng + deltaLng, lat + deltaLat] as [number, number];
};

export const isAcceptedMemberForEvent = async (
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

  return Boolean(
    acceptedMembers?.some((member) => member.toString() === userId)
  );
};

export const requireAdminForEvent = async (eventId: string, userId?: string) => {
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
