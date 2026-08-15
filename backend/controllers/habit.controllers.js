import { Habit, Logger } from "../models/index.models.js";
import { ErrorResponse } from "../utils/errorResponse.utils.js";
import { Response } from "../utils/response.utils.js";

export async function createHabit(req, res, next) {
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

export async function getAllHabits(req, res, next) {
  try {
    const { category, isArchived } = req.query;
    // customised filter adding logic
    let filterObj = { isArchived: false };
    if (category) {
      filterObj.category = category;
    } else if (isArchived) {
      filterObj.isArchived = isArchived;
    }

    const allHabits = await Habit.find({ ...filterObj });

    return res
      .status(200)
      .json(new Response(200, "operation successful", allHabits));
  } catch (error) {
    next(error);
  }
}

export async function getHabit(req, res, next) {
  try {
    const { id } = req.params;

    const targetHabit = await Habit.findById({ _id: id });

    if (!targetHabit) {
      throw new ErrorResponse(404, "habit does not exist");
    }
    return res
      .status(200)
      .json(new Response(200, "operation successful", targetHabit));
  } catch (error) {
    next(error);
  }
}

export async function updateHabit(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, category, frequency, custom_days, targetValue } =
      req.body;

    const update = {};
    if (name) update.name = name;
    if (description) update.description = description;
    if (category) update.category = category;
    if (frequency) update.frequency = frequency;
    if (custom_days) update.custom_days = custom_days;
    if (targetValue) update.targetValue = targetValue;

    const isValid = await Habit.exists({ _id: id });
    if (!isValid) {
      throw new ErrorResponse(404, "habit not found");
    }

    const targetObj = await Habit.findByIdAndUpdate(
      { _id: id },
      { $set: update },
      { new: true, runValidators: true, returnDocument: "after" },
    );

    return res
      .status(200)
      .json(new Response(200, "operation successful", targetObj));
  } catch (error) {
    next(error);
  }
}

export async function updateHabitSetArchive(req, res, next) {
  try {
    const { id } = req.params;

    if (!(await Habit.exists({ _id: id })))
      throw new ErrorResponse(404, "habit not found");

    const targetHabit = await Habit.findByIdAndUpdate(
      { _id: id },
      { $set: { isArchived: true, archivedAt: Date.now() } },
      { runValidators: true, returnDocument: "after" },
    );
    return res
      .status(200)
      .json(new Response(200, "operation successful", targetHabit));
  } catch (error) {
    next(error);
  }
}

export async function updateHabitUnsetArchive(req, res, next) {
  try {
    const { id } = req.params;

    if (!(await Habit.exists({ _id: id })))
      throw new ErrorResponse(404, "habit not found");

    const targetHabit = await Habit.findByIdAndUpdate(
      { _id: id },
      { $set: { isArchived: false, archivedAt: null } },
      { runValidators: true, returnDocument: "after" },
    );
    return res
      .status(200)
      .json(new Response(200, "operation successful", targetHabit));
  } catch (error) {
    next(error);
  }
}
