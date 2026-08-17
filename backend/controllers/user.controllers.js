import { User } from "../models/index.models.js";
import { ErrorResponse } from "../utils/errorResponse.utils.js";
import { generateTokens } from "../utils/generateToken.utils.js";
import { Response } from "../utils/response.utils.js";
import jwt from "jsonwebtoken";

export async function createUser(req, res, next) {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!confirmPassword || !password || !email || !name)
      throw new ErrorResponse(
        400,
        "name, email and password fields are required",
      );

    if (await User.exists({ email: email }))
      throw new ErrorResponse(400, "user already exists");

    const normalizedEmail = email.toLowerCase().trim();

    if (!(password === confirmPassword))
      throw new ErrorResponse(400, "passwords don\'t match");

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    if (!user) {
      throw new ErrorResponse(500, "user not created");
    }

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;

    return res.status(201).json(new Response(201, "user created", userObj));
  } catch (error) {
    next(error);
  }
}

export async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ErrorResponse(400, "email and password are required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.validatePassword(password))) {
      throw new ErrorResponse(400, "invalid credentials");
    }

    const { accessToken, refreshToken } = generateTokens({
      id: user._id,
      name: user.name,
      email: user.email,
    });

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: true });

    const userObj = user.toObject();

    delete userObj.password;
    delete userObj.refreshToken;

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge:
          (parseInt(process.env.REFRESH_TOKEN_EXPIRY, 10) || 7) *
          24 *
          60 *
          60 *
          1000,
      })
      .json(
        new Response(200, "user logged in", {
          ...userObj,
          accessToken,
        }),
      );
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const id = req.user.id;
    const {
      name: bodyName,
      email: bodyEmail,
      password: currentPassword,
    } = req.body;

    const options = {};

    if (bodyName) {
      options.name = bodyName;
    }
    if (bodyEmail) {
      if (!currentPassword)
        throw new ErrorResponse(401, "password required to change email");

      const existingUser = await User.findById(id);
      if (!existingUser) throw new ErrorResponse(404, "user not found");

      if (!(await existingUser.validatePassword(currentPassword)))
        throw new ErrorResponse(400, "invalid credentials provided");
      options.email = bodyEmail;
    }

    if (Object.keys(options).length === 0) {
      throw new ErrorResponse(400, "no valid update fields provided");
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: options,
      },
      { returnDocument: "after", runValidators: true },
    ).select("-password -refreshToken");

    if (!user) {
      throw new ErrorResponse(404, "user not found");
    }

    return res
      .status(200)
      .json(new Response(200, "user updated", user.toObject()));
  } catch (error) {
    next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const id = req.user.id;
    const user = await User.findById(id).select("-password -refreshToken");

    if (!user) {
      throw new ErrorResponse(404, "user not found");
    }

    return res
      .status(200)
      .json(new Response(200, "user fetched", user.toObject()));
  } catch (error) {
    next(error);
  }
}

// TODO: implement delete controller logic, then head to routes!
export async function deleteUser(req, res, next) {
  try {
    const id = req.user.id;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      throw new ErrorResponse(404, "user not found");
    }

    return res
      .status(200)
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      })
      .json(new Response(200, "user deleted", null));
  } catch (error) {
    next(error);
  }
}

export async function generateAccessTokenAndRefreshToken(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new ErrorResponse(401, "refresh token missing");
    }

    let decodedData;

    try {
      decodedData = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError")
        throw new ErrorResponse(403, "refresh token expired");
      throw new ErrorResponse(401, "invalid refresh token");
    }

    const user = await User.findOne({
      _id: decodedData.id,
      email: decodedData.email,
    }).select("-password");

    if (!user || user.refreshToken !== refreshToken)
      throw new ErrorResponse(403, "malformed refresh token");

    const { accessToken: access, refreshToken: refresh } = await generateTokens(
      {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    );

    user.refreshToken = refresh;
    await user.save({ validateBeforeSave: true });

    const userObj = user.toObject();
    delete userObj.refreshToken;

    return res
      .status(200)
      .cookie("refreshToken", refresh, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge:
          (parseInt(process.env.REFRESH_TOKEN_EXPIRY, 10) || 7) *
          24 *
          60 *
          60 *
          1000,
      })
      .json(
        new Response(200, "tokens regenerated", {
          ...userObj,
          accessToken: access,
        }),
      );
  } catch (error) {
    next(error);
  }
}
