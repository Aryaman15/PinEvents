import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/meController";
import { requireAuth } from "../middleware/requireAuth";

export const meRouter = Router();

meRouter.get("/", requireAuth, getProfile);
meRouter.put("/", requireAuth, updateProfile);
