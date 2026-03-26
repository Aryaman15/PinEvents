import { z } from "zod";

const locationSchema = z.object({
  type: z.literal("Point"),
  coordinates: z
    .tuple([z.number(), z.number()])
    .refine((coords) => coords.length === 2, "Coordinates must be [lng, lat]."),
});

// export const createEventSchema = z.object({
//   title: z.string().min(1),
//   description: z.string().min(1),
//   category: z.string().min(1),
//   type: z.enum(["public", "private"]),
//   startTime: z.string().datetime(),
//   endTime: z.string().datetime(),
//   imageUrls: z.array(z.string().url()).max(4).optional(),
//   location: locationSchema,
// });
export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Title is mandatory"),
  description: z.string().trim().min(1, "Description is mandatory"),
  category: z.string().trim().min(1, "Category is mandatory"),
  type: z.enum(["public", "private"]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        publicId: z.string().min(1),
      }),
    )
    .max(4)
    .optional(),
  location: locationSchema,
});

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const eventsNearQuerySchema = z.object({
  lat: z.string().transform(Number).refine(Number.isFinite, "Invalid latitude"),
  lng: z
    .string()
    .transform(Number)
    .refine(Number.isFinite, "Invalid longitude"),
  radiusKm: z
    .string()
    .transform(Number)
    .refine(Number.isFinite, "Invalid radius"),
  q: z.string().optional(),
  category: z.string().optional(),
});

export const eventIdParamSchema = z.object({
  id: objectIdSchema,
});

export const joinRequestParamSchema = z.object({
  id: objectIdSchema,
  requestId: objectIdSchema,
});

export const messagesQuerySchema = z.object({
  limit: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type EventsNearQuery = z.infer<typeof eventsNearQuerySchema>;
