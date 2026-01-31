import mongoose, { Schema, type InferSchemaType } from "mongoose";

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
        type: [Number],
        required: true,
        validate: {
          validator: (value: number[]) => value.length === 2,
          message: "Location coordinates must include [lng, lat].",
        },
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

eventSchema.index({ location: "2dsphere" });

export type EventDocument = InferSchemaType<typeof eventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Event = mongoose.model("Event", eventSchema);
