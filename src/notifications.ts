import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Habit } from "./types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function syncHabitReminder(habit: Habit): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(habit.id);

  if (!habit.reminderEnabled || habit.archived) {
    return;
  }

  const allowed = await ensureNotificationPermission();
  if (!allowed) {
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("habits", {
      name: "Habit reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: habit.id,
    content: {
      title: "Streak Lite",
      body: `Time for ${habit.name}`,
      sound: undefined,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: habit.reminderHour,
      minute: habit.reminderMinute,
      channelId: Platform.OS === "android" ? "habits" : undefined,
    },
  });
}

export async function syncAllReminders(habits: Habit[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const habit of habits) {
    await syncHabitReminder(habit);
  }
}
