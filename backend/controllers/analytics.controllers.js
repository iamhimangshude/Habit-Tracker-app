import { Habit, Logger } from "../models/index.models.js";
import { ErrorResponse } from "../utils/errorResponse.utils.js";
import { Response } from "../utils/response.utils.js";

export async function overview(req, res, next) {
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
  try {
    const { startDate, endDate, id: habitId } = req.query;

    const matchOptions = {};

    if (habitId)
      if (await Habit.exists({ _id: habitId })) matchOptions.habit = habitId;

    const end = endDate || new Date().toISOString().split("T")[0];
    let start = startDate;

    if (!start) {
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 90);
      start = defaultStart.toISOString().split("T")[0];
    }

    matchOptions.isCompleted = true;
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
      .json(new Response(200, "operation success", queryData));
  } catch (error) {
    next(error);
  }
}
