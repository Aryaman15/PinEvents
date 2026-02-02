import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Event } from "./models/Event";
import { EventMember } from "./models/EventMember";
import { User } from "./models/User";

dotenv.config();

const defaultCoordinate: [number, number] = [-122.4194, 37.7749];

const getSeedCoordinate = () => {
  const lat = Number(process.env.SEED_LAT);
  const lng = Number(process.env.SEED_LNG);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return [lng, lat] as [number, number];
  }
  return defaultCoordinate;
};

const randomOffset = () => (Math.random() * 0.02 - 0.01);

const buildLocation = (base: [number, number]) => ({
  type: "Point" as const,
  coordinates: [base[0] + randomOffset(), base[1] + randomOffset()] as [number, number],
});

const seed = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set.");
  }

  await mongoose.connect(mongoUri);
  const coordinate = getSeedCoordinate();

  const email = "demo@pinevents.local";
  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await bcrypt.hash("demo-password", 10);
    user = await User.create({ email, passwordHash, displayName: "Demo Host" });
  }

  const baseTime = Date.now();
  const events = [
    {
      title: "Sunset Run Club",
      description: "Easy-paced run with the community.",
      category: "Fitness",
      type: "public",
    },
    {
      title: "Coffee & Co-working",
      description: "Bring your laptop and work together.",
      category: "Work",
      type: "public",
    },
    {
      title: "Private Dinner Party",
      description: "Invite-only dinner gathering.",
      category: "Food",
      type: "private",
    },
    {
      title: "Game Night",
      description: "Board games and snacks with friends.",
      category: "Games",
      type: "private",
    },
  ] as const;

  const createdEvents = [];

  for (let index = 0; index < events.length; index += 1) {
    const eventTemplate = events[index];
    const startTime = new Date(baseTime + (index + 1) * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    const event = await Event.create({
      ...eventTemplate,
      startTime,
      endTime,
      location: buildLocation(coordinate),
      createdBy: user._id,
      acceptedMembers: [user._id],
    });
    createdEvents.push(event);

    await EventMember.create({
      eventId: event._id,
      userId: user._id,
      role: "admin",
      status: "accepted",
    });
  }

  console.log(`Seeded ${createdEvents.length} events near ${coordinate[1]}, ${coordinate[0]}.`);
  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error("Failed to seed events:", error);
  process.exit(1);
});
