import { Router } from "express";
import { getPublicProfile } from "../controllers/usersController";

export const usersRouter = Router();

usersRouter.get("/:id/public", getPublicProfile);
