import { RequestHandler } from "express";
import { User } from "../models/User";
import { profileUpdateSchema } from "../validation/profile";

export const getProfile: RequestHandler = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.status(200).json({
    user: {
      id: user.id,
      displayName: user.displayName ?? "",
      bio: user.bio ?? "",
      interests: user.interests ?? [],
      avatarUrl: user.avatarUrl ?? "",
    },
  });
};

export const updateProfile: RequestHandler = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = profileUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const updates = parseResult.data;
  const nextProfile = {
    ...updates,
    avatarUrl: updates.avatarUrl === "" ? undefined : updates.avatarUrl,
  };

  const user = await User.findByIdAndUpdate(userId, nextProfile, { new: true });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.status(200).json({
    user: {
      id: user.id,
      displayName: user.displayName ?? "",
      bio: user.bio ?? "",
      interests: user.interests ?? [],
      avatarUrl: user.avatarUrl ?? "",
    },
  });
};
