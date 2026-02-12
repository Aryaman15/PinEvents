import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { authSchema } from "../validation/auth";
import { signToken } from "../utils/jwt";

export const signup: RequestHandler = async (req, res) => {
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
    const token = signToken(user._id.toString());
    return res.status(201).json({
      token,
      user: { id: user._id.toString(), displayName: user.displayName ?? "" },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server misconfiguration" });
  }
};

export const login: RequestHandler = async (req, res) => {
  const parseResult = authSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { email, password } = parseResult.data;
  const user = await User.findOne({ email }).lean();

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  try {
    const token = signToken(user._id.toString());
    return res.status(200).json({
      token,
      user: { id: user._id.toString(), displayName: user.displayName ?? "" },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server misconfiguration" });
  }
};
