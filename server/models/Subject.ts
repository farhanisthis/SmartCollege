import mongoose, { Schema, Document } from "mongoose";

export interface ISubject extends Document {
  code: string;
  name: string;
  type: "theory" | "lab";
  section: string;
  color: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["theory", "lab"],
      required: true,
    },
    section: {
      type: String,
      required: true,
      default: "E1",
    },
    color: {
      type: String,
      required: true,
      default: "from-gray-600 via-gray-500 to-gray-400",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for code + section (unique combination)
SubjectSchema.index({ code: 1, section: 1 }, { unique: true });

export const Subject = mongoose.model<ISubject>("Subject", SubjectSchema);
