import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Habit } from "./types";

const STORAGE_KEY = "streak-lite.habits.v1";

export async function loadHabits(): Promise<Habit[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as Habit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

export function createHabit(name: string): Habit {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    archived: false,
    reminderEnabled: false,
    reminderHour: 8,
    reminderMinute: 0,
    completions: [],
  };
}
