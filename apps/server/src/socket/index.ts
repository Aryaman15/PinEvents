import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { Event } from "../models/Event";
import { EventMessage } from "../models/EventMessage";
import { User } from "../models/User";
import { isAcceptedMember } from "../services/eventMembership.service";
import { getUserIdFromToken } from "../utils/jwt";

export const configureSockets = (
  server: HttpServer,
  allowedOrigins: string[],
) => {
  const io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const userId = getUserIdFromToken(token);
    if (!userId) {
      return next(new Error("Unauthorized"));
    }

    socket.data.userId = userId;
    return next();
  });

  io.on("connection", (socket) => {
    socket.on(
      "join",
      async (
        eventId: string,
        callback?: (response: { ok?: boolean; error?: string }) => void,
      ) => {
        try {
          if (!eventId) {
            callback?.({ error: "Missing event id" });
            return;
          }
          const userId = socket.data.userId as string | undefined;
          if (!userId) {
            callback?.({ error: "Unauthorized" });
            return;
          }
          const event = await Event.findById(eventId)
            .select("_id acceptedMembers")
            .lean();
          if (!event) {
            callback?.({ error: "Event not found" });
            return;
          }
          const accepted = await isAcceptedMember(
            eventId,
            userId,
            event.acceptedMembers,
          );
          if (!accepted) {
            callback?.({ error: "Forbidden" });
            return;
          }
          socket.join(eventId);
          callback?.({ ok: true });
        } catch (error) {
          callback?.({ error: "Unable to join room" });
        }
      },
    );

    socket.on(
      "message",
      async (payload: { eventId?: string; text?: string }) => {
        const { eventId, text } = payload;
        const trimmed = text?.trim();
        const userId = socket.data.userId as string | undefined;

        if (!eventId || !trimmed || !userId) {
          return;
        }

        const accepted = await isAcceptedMember(eventId, userId);
        if (!accepted) {
          return;
        }

        const message = await EventMessage.create({
          eventId,
          userId,
          text: trimmed,
        });

        const user = await User.findById(userId).select("displayName").lean();
        const displayName = user?.displayName ?? "";
        const responsePayload = {
          id: message._id.toString(),
          eventId,
          text: message.text,
          createdAt: message.createdAt,
          displayName,
        };

        socket.emit("message", { ...responsePayload, isMine: true });
        socket
          .to(eventId)
          .emit("message", { ...responsePayload, isMine: false });
      },
    );
  });
};
