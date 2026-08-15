import mongoose from "mongoose";

import { ErrorResponse } from "../utils/errorResponse.utils.js";

export function errorHandler(err, req, res, next) {
  let error = err;
  if (!(error instanceof ErrorResponse)) {
    const status = error.status || error instanceof mongoose.Error ? 400 : 500;

    const message = error.message || "Something went wrong";
    error = new ErrorResponse(status, message, err?.errors || [], err.stack);
  }

  const response = {
    ...error,
    message: error.message,
    ...(process.env.ENV === "dev" ? { stack: error.stack } : {}),
  };

  return res.status(error.status).json(response);
}
