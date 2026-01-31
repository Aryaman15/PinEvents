import { z } from "zod";

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
  interests: z.array(z.string().min(1).max(50)).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
