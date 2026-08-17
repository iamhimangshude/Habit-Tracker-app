import jwt from "jsonwebtoken";
import { ErrorResponse } from "../utils/errorResponse.utils.js";

export function validateHeader(req, res, next) {
  try {
    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ErrorResponse(401, "unauthorized: invalid header provided");
    }

    const token = authHeader.split(" ")[1]?.trim();

    if (!token) throw new ErrorResponse(401, "unauthorized: token not provied");

    try {
      const decodedData = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.user = decodedData;
      return next();
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        throw new ErrorResponse(401, "token expired");
      }
      throw new ErrorResponse(401, "invalid token");
    }
  } catch (error) {
    next(error);
  }
}
