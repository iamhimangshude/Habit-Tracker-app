import mongoose, {Schema} from "mongoose";
import crypto from "node:crypto";

const loggerSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    habit: {
      type: String,
      ref: "Habit",
      required: true,
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
  },
  {
    timestamps: true,
  },
);

loggerSchema.index({ habit: 1, date: 1 }, { unique: true });

const Logger = mongoose.model("Logger", loggerSchema);

export { Logger };
