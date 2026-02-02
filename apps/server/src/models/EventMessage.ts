import mongoose, { Schema, type InferSchemaType } from "mongoose";

const eventMessageSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

eventMessageSchema.index({ eventId: 1, createdAt: 1 });

export type EventMessageDocument = InferSchemaType<typeof eventMessageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EventMessage = mongoose.model("EventMessage", eventMessageSchema);
