import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { authSchema } from "../validation/auth";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const signToken = (userId: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
};

authRouter.post("/signup", authLimiter, async (req, res) => {
  const parseResult = authSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { email, password } = parseResult.data;
  const existingUser = await User.findOne({ email }).lean();

  if (existingUser) {
    return res.status(409).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, passwordHash });
  try {
    const token = signToken(user.id);
    return res.status(201).json({ token, user: { id: user.id, displayName: user.displayName ?? "" } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server misconfiguration" });
  }
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const parseResult = authSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { email, password } = parseResult.data;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  try {
    const token = signToken(user.id);
    return res.status(200).json({ token, user: { id: user.id, displayName: user.displayName ?? "" } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server misconfiguration" });
  }
});
