import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import http from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { Event } from "./models/Event";
import { EventMember } from "./models/EventMember";
import { EventMessage } from "./models/EventMessage";
import { User } from "./models/User";
import { authRouter } from "./routes/auth";
import { eventsRouter } from "./routes/events";
import { meRouter } from "./routes/me";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const defaultOrigins = [
  "http://localhost:19006",
  "http://localhost:19000",
  "http://localhost:3000",
];
const allowedOrigins = configuredOrigins.length ? configuredOrigins : defaultOrigins;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

app.use(
  helmet({
    referrerPolicy: { policy: "no-referrer" },
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/events", eventsRouter);
app.use("/me", meRouter);

const isAcceptedMember = async (eventId: string, userId: string) => {
  const membership = await EventMember.findOne({
    eventId,
    userId,
    status: "accepted",
  }).lean();

  if (membership) {
    return true;
  }

  const event = await Event.findById(eventId).select("acceptedMembers").lean();
  if (!event) {
    return false;
  }

  return Boolean(
    event.acceptedMembers?.some((member) => member.toString() === userId)
  );
};

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) {
    return next(new Error("Unauthorized"));
  }

  try {
    const payload = jwt.verify(token, secret) as { userId?: string };
    if (!payload.userId) {
      return next(new Error("Unauthorized"));
    }
    socket.data.userId = payload.userId;
    return next();
  } catch (error) {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.on("join", async (eventId: string, callback?: (response: { ok?: boolean; error?: string }) => void) => {
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
      const event = await Event.findById(eventId).select("_id").lean();
      if (!event) {
        callback?.({ error: "Event not found" });
        return;
      }
      const accepted = await isAcceptedMember(eventId, userId);
      if (!accepted) {
        callback?.({ error: "Forbidden" });
        return;
      }
      socket.join(eventId);
      callback?.({ ok: true });
    } catch (error) {
      callback?.({ error: "Unable to join room" });
    }
  });

  socket.on("message", async (payload: { eventId?: string; text?: string }) => {
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
    socket.to(eventId).emit("message", { ...responsePayload, isMine: false });
  });
});

const startServer = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn("MONGO_URI is not set; skipping database connection.");
  } else {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");
  }

  server.listen(port, () => {
    console.log(`PinEvents API running on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
