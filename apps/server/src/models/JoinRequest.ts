import mongoose, { Schema, type InferSchemaType } from "mongoose";

const joinRequestSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      required: true,
      default: "pending",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

joinRequestSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export type JoinRequestDocument = InferSchemaType<typeof joinRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const JoinRequest = mongoose.model<JoinRequestDocument>("JoinRequest", joinRequestSchema);
