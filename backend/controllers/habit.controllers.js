import { Habit, Logger } from "../models/index.models.js";
import { ErrorResponse } from "../utils/errorResponse.utils.js";
import { Response } from "../utils/response.utils.js";

async function createHabit(req, res, next) {
  try {
    const { name, description, category, frequency, custom_days, targetValue } =
      req.body;

    const preExistHabit = await Habit.exists({
      name: name,
    });

    if (preExistHabit) {
      throw new ErrorResponse(400, "Habit already exists");
    }

    const newHabit = await Habit.create({
      name,
      description,
      category,
      frequency,
      custom_days,
      targetValue,
    });

    return res
      .status(201)
      .json(new Response(201, "operation successful", newHabit));
  } catch (error) {
    next(error);
  }
}

async function getAllHabits(req, res, next) {
  try {
    const allHabits = await Habit.find();
    console.log(allHabits);
    return res
      .status(200)
      .json(new Response(200, "operation successful", allHabits));
  } catch (error) {
    next(error);
  }
}

export { createHabit, getAllHabits };
