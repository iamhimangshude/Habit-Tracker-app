import mongoose from "mongoose";
import { Habit, Logger, User } from "../models/index.models.js";
import { ErrorResponse } from "../utils/errorResponse.utils.js";
import { Response } from "../utils/response.utils.js";
import { calculateHabitStreak } from "../utils/streak.utils.js";

export async function createHabit(req, res, next) {
  try {
    const { name, description, category, frequency, custom_days, targetValue } =
      req.body;

    const id = req.user.id;

    if (!name) throw new ErrorResponse(400, "habit name required");

    const preExistHabit = await Habit.exists({
      name: name.trim(),
      user: id,
    });

    if (preExistHabit) {
      throw new ErrorResponse(400, "Habit already exists");
    }

    const newHabit = await Habit.create({
      name,
      user: id,
      description,
      category,
      frequency,
      custom_days,
      targetValue,
    });

    return res
      .status(201)
      .json(new Response(201, "habit created", newHabit.toObject()));
  } catch (error) {
    next(error);
  }
}

export async function getAllHabits(req, res, next) {
  try {
    const { category, isArchived } = req.query;
    const userId = req.user.id;
    // customised filter adding logic
    let filterObj = { isArchived: isArchived === "true", user: userId };
    if (category) {
      filterObj.category = category.toLowerCase().trim();
    }

    const allHabits = await Habit.find(filterObj).lean();

    return res
      .status(200)
      .json(new Response(200, "operation successful", allHabits));
  } catch (error) {
    next(error);
  }
}

export async function getHabit(req, res, next) {
  try {
    const id = req.user.id;
    const { id: habitId } = req.params;

    const targetHabit = await Habit.findOne({ _id: habitId, user: id }).lean();

    if (!targetHabit) {
      throw new ErrorResponse(404, "habit does not exist");
    }
    return res
      .status(200)
      .json(new Response(200, "habit fetched", targetHabit));
  } catch (error) {
    next(error);
  }
}

export async function updateHabit(req, res, next) {
  try {
    const { id: habitId } = req.params;
    const userId = req.user.id;
    const { name, description, category, frequency, custom_days, targetValue } =
      req.body;

    const update = {};
    if (name) update.name = name.trim();
    if (description) update.description = description;
    if (category) update.category = category.toLowerCase().trim();
    if (frequency) update.frequency = frequency;
    if (custom_days) update.custom_days = custom_days;
    if (targetValue) update.targetValue = targetValue;

    if (Object.keys(update).length === 0) {
      throw new ErrorResponse(400, "no valid updated fields provided");
    }

    const targetHabit = await Habit.findOneAndUpdate(
      { _id: habitId, user: userId },
      { $set: update },
      { runValidators: true, returnDocument: "after" },
    );

    if (!targetHabit) {
      throw new ErrorResponse(404, "habit not found");
    }

    return res
      .status(200)
      .json(new Response(200, "habit updated", targetHabit.toObject()));
  } catch (error) {
    next(error);
  }
}

export async function updateHabitSetArchive(req, res, next) {
  try {
    const id = req.user.id;
    const { id: habitId } = req.params;

    const session = await mongoose.startSession();

    let targetHabit;

    try {
      await session.withTransaction(async () => {
        targetHabit = await Habit.findOneAndUpdate(
          { _id: habitId, user: id, isArchived: false },
          { $set: { isArchived: true, archivedAt: new Date() } },
          { runValidators: true, returnDocument: "after" },
        ).session(session);

        if (!targetHabit) throw new ErrorResponse(404, "habit not found");

        const logs = await Logger.updateMany(
          {
            habit: habitId,
            user: id,
          },
          { $set: { isDeleted: true, deletedAt: new Date() } },
          { session: session },
        );
      });
    } catch (error) {
      console.log(error);
      throw new ErrorResponse(
        error.status || 500,
        error.message || "backend operation failed! Try again later!",
      );
    } finally {
      await session.endSession();
    }

    return res
      .status(200)
      .json(new Response(200, "habit archived", targetHabit.toObject()));
  } catch (error) {
    next(error);
  }
}

export async function updateHabitUnsetArchive(req, res, next) {
  try {
    const userId = req.user.id;
    const { id: habitId } = req.params;

    const session = await mongoose.startSession();

    let targetHabit;

    try {
      await session.withTransaction(async () => {
        targetHabit = await Habit.findOneAndUpdate(
          { _id: habitId, user: userId, isArchived: true },
          { $set: { isArchived: false, archivedAt: null } },
          { runValidators: true, returnDocument: "after" },
        ).session(session);

        if (!targetHabit) throw new ErrorResponse(404, "habit not found");

        const logs = await Logger.updateMany(
          {
            habit: targetHabit._id,
            user: userId,
          },
          {
            $set: { isDeleted: false, deletedAt: null },
          },
          { session: session },
        );
      });
    } catch (error) {
      console.log(error);
      throw new ErrorResponse(
        error.status || 500,
        error.message || "backend operation failure! Try again",
      );
    } finally {
      await session.endSession();
    }

    return res
      .status(200)
      .json(new Response(200, "habit unarchived", targetHabit.toObject()));
  } catch (error) {
    next(error);
  }
}

export async function getHabitStats(req, res, next) {
  try {
    const userId = req.user.id;
    const { id: habitId } = req.params;

    const targetHabit = await Habit.findOne({
      _id: habitId,
      user: userId,
      isArchived: false,
    }).lean();

    if (!targetHabit) throw new ErrorResponse(404, "habit not found");

    const totalCompletedDays = await Logger.countDocuments({
      habit: habitId,
      isCompleted: true,
      isDeleted: false,
    });

    const statsObj = {
      id: targetHabit._id,
      streak: targetHabit.streakCount || 0,
      longestStreak: targetHabit.longestStreakCount || 0,
      totalCompletedDays,
    };

    return res
      .status(200)
      .json(new Response(200, "habit stats fetched", statsObj));
  } catch (error) {
    next(error);
  }
}

export async function toggleHabitCompletion(req, res, next) {
  try {
    const userId = req.user.id;
    const { id: habitId } = req.params;
    const todayStr = new Date().toISOString().split("T")[0];
    const date = req.body?.date || todayStr;

    const habit = await Habit.findOne({
      _id: habitId,
      user: userId,
      isArchived: false,
    });
    if (!habit) throw new ErrorResponse(404, "habit not found or is archived");

    let log = await Logger.findOne({
      habit: habitId,
      user: userId,
      date: date,
    });

    // preventing the backdating before habit creation
    if (date < habit.createdAt.toISOString().split("T")[0])
      throw new ErrorResponse(400, "cannot log habit before its creation date");

    if (log) {
      log.isCompleted = !log.isCompleted;
      log.value = log.isCompleted ? 1 : 0;
      log.completedAt = log.isCompleted ? new Date() : null;
      await log.save();
    } else {
      log = await Logger.create({
        habit: habitId,
        date,
        isCompleted: true,
        value: 1,
        user: userId,
        completedAt: new Date(),
      });
    }

    const { streakCount, longestStreakCount } =
      await calculateHabitStreak(habitId);

    return res.status(200).json(
      new Response(200, "habit completion updated", {
        ...log.toObject(),
        streakCount,
        longestStreakCount,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function getHabitLogs(req, res, next) {
  try {
    const userId = req.user.id;
    const { id: habitId } = req.params;
    const { startDate, endDate } = req.query;

    let logData;

    if (
      !(await Habit.exists({ _id: habitId, user: userId, isArchived: false }))
    )
      throw new ErrorResponse(404, "habit not found");

    const options = {
      habit: habitId,
      user: userId,
      isDeleted: false,
    };

    if (startDate || endDate) {
      options.date = {};
      if (startDate) options.date.$gte = startDate;
      if (endDate)
        options.date.$lte = endDate || new Date().toISOString().split("T")[0];
    }

    logData = await Logger.find(options).sort({ date: -1 }).lean();

    return res
      .status(200)
      .json(new Response(200, "habit logs fetched", logData));
  } catch (error) {
    next(error);
  }
}
