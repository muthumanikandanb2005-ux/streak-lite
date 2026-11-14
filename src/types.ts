export type Habit = {
  id: string;
  name: string;
  createdAt: string;
  archived: boolean;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  completions: string[];
};
