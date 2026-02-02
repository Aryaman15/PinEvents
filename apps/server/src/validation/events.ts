import { z } from "zod";

const locationSchema = z.object({
  type: z.literal("Point"),
  coordinates: z
    .tuple([z.number(), z.number()])
    .refine((coords) => coords.length === 2, "Coordinates must be [lng, lat]."),
});

export const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  type: z.enum(["public", "private"]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: locationSchema,
});

export const eventsNearQuerySchema = z.object({
  lat: z.string().transform(Number),
  lng: z.string().transform(Number),
  radiusKm: z.string().transform(Number),
  q: z.string().optional(),
  category: z.string().optional(),
});

export const requestIdParamsSchema = z.object({
  id: z.string().min(1),
  requestId: z.string().min(1),
});

export const eventIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type EventsNearQuery = z.infer<typeof eventsNearQuerySchema>;
