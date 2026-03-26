import { RequestHandler } from "express";
import { User } from "../models/User";

export const getPublicProfile: RequestHandler = async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const user = await User.findById(id).lean();
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
