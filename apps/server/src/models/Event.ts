import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { GeoPoint } from "../types/location.types";

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    type: { type: String, enum: ["public", "private"], required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number] as unknown as [number, number],
        required: true,
        validate: {
          validator: (value: number[]) => value.length === 2,
          message: "Location coordinates must include [lng, lat].",
        },
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
      default: [],
      validate: {
        validator: (value: { url: string; publicId: string }[]) =>
          value.length <= 4,
        message: "At most 4 event images are allowed.",
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

eventSchema.index({ location: "2dsphere" });

type BaseEvent = InferSchemaType<typeof eventSchema>;

// Override bad inference
export type EventDocument = Omit<BaseEvent, "location"> & {
  _id: mongoose.Types.ObjectId;
  location: GeoPoint;
};
export const Event = mongoose.model<EventDocument>("Event", eventSchema);
