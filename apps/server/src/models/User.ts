import mongoose from "mongoose";

export interface UserDocument extends mongoose.Document {
  email: string;
  passwordHash: string;
  displayName?: string;
  bio?: string;
  interests: string[];
  avatarUrl?: string;
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
  displayName: {
    type: String,
    trim: true,
  },
  bio: {
    type: String,
    trim: true,
  },
  interests: {
    type: [String],
    default: [],
  },
  avatarUrl: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.model<UserDocument>("User", userSchema);
