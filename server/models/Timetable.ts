import mongoose, { Schema, Document } from "mongoose";

export interface ITimetableSlot extends Document {
  section: string;
  day: string;
  timeSlot: string;
  subjectCode: string;
  room: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSlotSchema: Schema = new Schema(
  {
    section: {
      type: String,
      required: true,
      default: "E1",
    },
    day: {
      type: String,
      required: true,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    },
    timeSlot: {
      type: String,
      required: true,
    },
    subjectCode: {
      type: String,
      required: true,
    },
    room: {
      type: String,
      default: "311",
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

// Create compound index for section + day + timeSlot (unique combination)
TimetableSlotSchema.index({ section: 1, day: 1, timeSlot: 1 }, { unique: true });

export const TimetableSlot = mongoose.model<ITimetableSlot>(
  "TimetableSlot",
  TimetableSlotSchema
);
