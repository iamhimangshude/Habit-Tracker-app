import { Habit, Logger } from "../models/index.models.js";
import { ErrorResponse } from "../utils/errorResponse.utils.js";
import { Response } from "../utils/response.utils.js";

export async function overview(req, res, next) {
  // NOTE: overview focuses on showing habits data from a specific date
  try {
    const { date } = req.query;
    const userId = req.user.id;
    const today = new Date();
    const formattedDate =
      date ||
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const loggerData = await Logger.find({
      user: userId,
      date: formattedDate,
      isCompleted: true,
      isDeleted: false,
    })
      .sort({ date: 1 })
      .lean();

    return res
      .status(200)
      .json(new Response(200, "overview fetched", loggerData));
  } catch (error) {
    next(error);
  }
}

export async function heatmap(req, res, next) {
  // NOTE: heatmap focuses on github inspired habit completion counts based on a given date range
  try {
    const { startDate, endDate, id: habitId } = req.query;
    const userId = req.user.id;

    const matchOptions = {
      isDeleted: false,
      user: userId,
      isCompleted: true,
    };

    if (habitId) {
      if (
        !(await Habit.exists({ _id: habitId, user: userId, isArchived: false }))
      ) {
        throw new ErrorResponse(404, "habit not found");
      }
      matchOptions.habit = habitId;
    }

    const end = endDate || new Date().toISOString().split("T")[0];
    let start = startDate;

    if (!start) {
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      start = defaultStart.toISOString().split("T")[0];
    }

    matchOptions.date = { $gte: start, $lte: end };

    const queryData = await Logger.aggregate([
      { $match: matchOptions },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    return res
      .status(200)
      .json(new Response(200, "heatmap data fetched successfully", queryData));
  } catch (error) {
    next(error);
  }
}
