import jwt from "jsonwebtoken";
import { ErrorResponse } from "../utils/errorResponse.utils.js";
import { User } from "../models/user.models.js";

export async function validateHeader(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) throw new ErrorResponse(401, "invalid token");

    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ErrorResponse(401, "unauthorized: invalid header provided");
    }

    const token = authHeader.split(" ")[1]?.trim();

    if (!token) throw new ErrorResponse(401, "unauthorized: token not provied");

    let decodedData, refreshTokenData;
    try {
      decodedData = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      refreshTokenData = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
      );
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        throw new ErrorResponse(401, "token expired");
      }
      throw new ErrorResponse(401, "invalid token");
    }

    const user = await User.exists({ _id: decodedData.id });

    if (!user) throw new ErrorResponse(404, "user not found");

    req.user = decodedData;

    return next();
  } catch (error) {
    next(error);
  }
}
