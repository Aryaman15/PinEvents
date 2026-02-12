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
      id: user._id.toString(),
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

  // Remove all undefined fields
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined),
  );

  // Safe partial update
  if (Object.keys(cleanUpdates).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: cleanUpdates },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.status(200).json({
    user: {
      id: user._id.toString(),
      displayName: user.displayName ?? "",
      bio: user.bio ?? "",
      interests: user.interests ?? [],
      avatarUrl: user.avatarUrl ?? "",
    },
  });
};
