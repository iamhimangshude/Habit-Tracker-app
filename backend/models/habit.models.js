import mongoose, { Schema } from "mongoose";
import crypto from "node:crypto";

const habitSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    name: {
      type: String,
      required: [true, "Habit name is required!"],
    },
    description: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      enum: [
        "health",
        "productivity",
        "mindfulness",
        "learning",
        "finances",
        "relationships & social",
        "others",
      ],
      default: "others",
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "custom_days"],
      default: "daily",
    },
    custom_days: {
      type: [String],
      default: [],
    },
    targetValue: {
      type: Number,
      default: 1,
    },
    streakCount: {
      type: Number,
      default: 0,
    },
    longestStreakCount: {
      type: Number,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

export const Habit = mongoose.model("Habit", habitSchema);
