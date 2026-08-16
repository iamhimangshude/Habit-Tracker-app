import { Habit, Logger } from "../models/index.models.js";

export async function calculateHabitStreak(habitId) {
  const logs = await Logger.find({
    habit: habitId,
    isCompleted: true,
  })
    .sort({ date: 1 })
    .lean();

  if (!logs.length) {
    await Habit.findByIdAndUpdate(habitId, {
      streakCount: 0,
      longestStreakCount: 0,
    });
    return { streakCount: 0, longestStreakCount: 0 };
  }

  const completedDates = Array.from(new Set(logs.map((log) => log.date)));

  let longestStreak = 0,
    tempStreak = 0,
    prevDate = null;

  for (const dateStr of completedDates) {
    // similar to `for (var variable : IteratorObj){...}` in java
    const currDate = new Date(dateStr);

    if (prevDate) {
      const diffInDays =
        Math.round(currDate - prevDate) / (1000 * 60 * 60 * 24);

      if (diffInDays === 1) {
        tempStreak += 1;
      } else {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    prevDate = currDate;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const lastCompletedDate = completedDates[completedDates.length - 1];
  let currentStreak = 0;

  if (lastCompletedDate === todayStr || lastCompletedDate === yesterdayStr) {
    currentStreak = tempStreak;
  } else {
    // Last completed date was 2 or more days ago
    currentStreak = 0;
  }

  // 4. Update the Habit document cache
  await Habit.findByIdAndUpdate(habitId, {
    streakCount: currentStreak,
    longestStreakCount: longestStreak,
  });

  return { streakCount: currentStreak, longestStreakCount: longestStreak };
}
