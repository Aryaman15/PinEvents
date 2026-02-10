// import { UserDocument } from './User';
import mongoose, {Schema, InferSchemaType, mongo } from "mongoose";

// export interface UserDocument extends mongoose.Document {
//   email: string;
//   passwordHash: string;
//   displayName?: string;
//   bio?: string;
//   interests: string[];
//   avatarUrl?: string;
//   createdAt: Date;
// } 

const userSchema = new Schema({
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


export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id:mongoose.Types.ObjectId
}
export const User = mongoose.model<UserDocument>("User", userSchema);
