import mongoose from "mongoose";

export interface UserDocument extends mongoose.Document {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<UserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.model<UserDocument>("User", userSchema);
