import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  avatarUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal("")),
});

export type AuthInput = z.infer<typeof authSchema>;
