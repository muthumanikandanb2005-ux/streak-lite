import { addDays, localDateKey } from "./dates";
import type { Habit } from "./types";

export function currentStreak(habit: Habit, today = new Date()): number {
  const done = new Set(habit.completions);
  let cursor = new Date(today);
  if (!done.has(localDateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }

  let count = 0;
  while (done.has(localDateKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function isCompleteOn(habit: Habit, dateKey: string): boolean {
  return habit.completions.includes(dateKey);
}
