import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
  userId: string;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not set.");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    req.userId = payload.userId;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
