import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    name: {
      type: String,
      required: [true, "name is required"],
      minlength: [3, "minimum length of name is 3"],
      maxlength: [50, "maximium length of name is 50"],
    },
    email: {
      type: String,
      unique: true,
      required: [true, "email is required"],
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "invalid email format"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minlength: [6, "password must have at least 6 characters"],
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", userSchema);
