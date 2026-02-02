import mongoose, { Schema, type InferSchemaType } from "mongoose";

const eventMemberSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], required: true },
    status: { type: String, enum: ["accepted"], required: true, default: "accepted" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

eventMemberSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export type EventMemberDocument = InferSchemaType<typeof eventMemberSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EventMember = mongoose.model("EventMember", eventMemberSchema);
