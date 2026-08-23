import mongoose, { Schema } from "mongoose";
import crypto from "node:crypto";

const loggerSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    user: {
      type: String,
      ref: "User",
      required: [true, "user is required"],
      index: true,
    },
    habit: {
      type: String,
      ref: "Habit",
      required: [true, "habit is required"],
      index: true,
    },
    date: {
      type: String,
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    value: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

loggerSchema.index({ habit: 1, date: 1 }, { unique: true });
loggerSchema.index({ user: 1, date: 1 });

const Logger = mongoose.model("Logger", loggerSchema);

export { Logger };
