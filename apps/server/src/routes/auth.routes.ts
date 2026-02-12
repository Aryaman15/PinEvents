import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, signup } from "../controllers/authController";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post("/signup", authLimiter, signup);
authRouter.post("/login", authLimiter, login);
