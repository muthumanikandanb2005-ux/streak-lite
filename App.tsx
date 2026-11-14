import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { lastSevenDateKeys, localDateKey, weekdayLabel } from "./src/dates";
import { syncAllReminders } from "./src/notifications";
import { createHabit, loadHabits, saveHabits } from "./src/storage";
import { currentStreak, isCompleteOn } from "./src/streaks";
import type { Habit } from "./src/types";

type EditorState = {
  habitId: string | null;
  name: string;
  reminderEnabled: boolean;
  reminderHour: string;
  reminderMinute: string;
};

const emptyEditor: EditorState = {
  habitId: null,
  name: "",
  reminderEnabled: false,
  reminderHour: "8",
  reminderMinute: "00",
};

export default function App() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [ready, setReady] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const today = localDateKey();
  const week = useMemo(() => lastSevenDateKeys(), []);

  useEffect(() => {
    loadHabits()
      .then((loaded) => {
        setHabits(loaded);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    saveHabits(habits).catch(() => {
      Alert.alert("Could not save habits on this device.");
    });
    syncAllReminders(habits).catch(() => {
      // Permission denied is fine; the habit still works without a reminder.
    });
  }, [habits, ready]);

  const visibleHabits = habits.filter((habit) => !habit.archived);

  function openNew() {
    setEditor(emptyEditor);
    setEditorOpen(true);
  }

  function openEdit(habit: Habit) {
    setEditor({
      habitId: habit.id,
      name: habit.name,
      reminderEnabled: habit.reminderEnabled,
      reminderHour: String(habit.reminderHour),
      reminderMinute: String(habit.reminderMinute).padStart(2, "0"),
    });
    setEditorOpen(true);
  }

  function toggleToday(habit: Habit) {
    setHabits((current) =>
      current.map((item) => {
        if (item.id !== habit.id) {
          return item;
        }
        const already = item.completions.includes(today);
        return {
          ...item,
          completions: already
            ? item.completions.filter((date) => date !== today)
            : [...item.completions, today],
        };
      })
    );
  }

  function saveEditor() {
    const name = editor.name.trim();
    if (!name) {
      Alert.alert("Give the habit a name.");
      return;
    }

    const hour = clampNumber(Number(editor.reminderHour), 0, 23, 8);
    const minute = clampNumber(Number(editor.reminderMinute), 0, 59, 0);

    setHabits((current) => {
      if (editor.habitId) {
        return current.map((habit) =>
          habit.id === editor.habitId
            ? {
                ...habit,
                name,
                reminderEnabled: editor.reminderEnabled,
                reminderHour: hour,
                reminderMinute: minute,
              }
            : habit
        );
      }
      return [
        ...current,
        {
          ...createHabit(name),
          reminderEnabled: editor.reminderEnabled,
          reminderHour: hour,
          reminderMinute: minute,
        },
      ];
    });
    setEditorOpen(false);
  }

  function archiveCurrent() {
    if (!editor.habitId) {
      setEditorOpen(false);
      return;
    }
    setHabits((current) =>
      current.map((habit) =>
        habit.id === editor.habitId ? { ...habit, archived: true } : habit
      )
    );
    setEditorOpen(false);
  }

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Today</Text>
          <Text style={styles.title}>Streak Lite</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openNew}>
          <Text style={styles.addButtonLabel}>Add habit</Text>
        </Pressable>
      </View>

      {visibleHabits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptyBody}>
            Add one thing you want to do every day. Progress stays on this
            phone — no account needed.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {visibleHabits.map((habit) => {
            const streak = currentStreak(habit);
            const doneToday = isCompleteOn(habit, today);
            return (
              <View key={habit.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Pressable
                    onPress={() => toggleToday(habit)}
                    style={[
                      styles.check,
                      doneToday ? styles.checkOn : styles.checkOff,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: doneToday }}
                    accessibilityLabel={`Mark ${habit.name} complete for today`}
                  >
                    <Text style={styles.checkMark}>{doneToday ? "✓" : ""}</Text>
                  </Pressable>
                  <Pressable style={styles.cardCopy} onPress={() => openEdit(habit)}>
                    <Text style={styles.habitName}>{habit.name}</Text>
                    <Text style={styles.streak}>
                      {streak === 0 ? "Start today" : `${streak}-day streak`}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.weekRow}>
                  {week.map((dateKey) => {
                    const done = isCompleteOn(habit, dateKey);
                    const isToday = dateKey === today;
                    return (
                      <View key={dateKey} style={styles.day}>
                        <Text style={styles.dayLabel}>{weekdayLabel(dateKey)}</Text>
                        <View
                          style={[
                            styles.dot,
                            done ? styles.dotOn : styles.dotOff,
                            isToday && styles.dotToday,
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={editorOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalWrap}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setEditorOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editor.habitId ? "Edit habit" : "New habit"}
            </Text>
            <TextInput
              value={editor.name}
              onChangeText={(name) => setEditor((current) => ({ ...current, name }))}
              placeholder="Drink water, stretch, read..."
              placeholderTextColor="#8A8174"
              style={styles.input}
              autoFocus
            />
            <View style={styles.reminderRow}>
              <Text style={styles.reminderLabel}>Daily reminder</Text>
              <Switch
                value={editor.reminderEnabled}
                onValueChange={(reminderEnabled) =>
                  setEditor((current) => ({ ...current, reminderEnabled }))
                }
              />
            </View>
            {editor.reminderEnabled ? (
              <View style={styles.timeRow}>
                <TextInput
                  value={editor.reminderHour}
                  onChangeText={(reminderHour) =>
                    setEditor((current) => ({ ...current, reminderHour }))
                  }
                  keyboardType="number-pad"
                  style={styles.timeInput}
                  maxLength={2}
                />
                <Text style={styles.timeColon}>:</Text>
                <TextInput
                  value={editor.reminderMinute}
                  onChangeText={(reminderMinute) =>
                    setEditor((current) => ({ ...current, reminderMinute }))
                  }
                  keyboardType="number-pad"
                  style={styles.timeInput}
                  maxLength={2}
                />
              </View>
            ) : null}
            <Pressable style={styles.saveButton} onPress={saveEditor}>
              <Text style={styles.saveButtonLabel}>Save</Text>
            </Pressable>
            {editor.habitId ? (
              <Pressable onPress={archiveCurrent}>
                <Text style={styles.archiveLabel}>Archive habit</Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4EFE6",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: {
    color: "#6B6258",
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    color: "#1F1A16",
    fontSize: 28,
    fontWeight: "700",
  },
  addButton: {
    backgroundColor: "#1F6F54",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  addButtonLabel: {
    color: "#F4EFE6",
    fontWeight: "600",
  },
  empty: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F1A16",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 16,
    lineHeight: 24,
    color: "#5C534A",
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFbf4",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4D8C8",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  check: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  checkOn: {
    backgroundColor: "#1F6F54",
    borderColor: "#1F6F54",
  },
  checkOff: {
    backgroundColor: "transparent",
    borderColor: "#C9B8A3",
  },
  checkMark: {
    color: "#F4EFE6",
    fontSize: 18,
    fontWeight: "700",
  },
  cardCopy: {
    flex: 1,
  },
  habitName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F1A16",
  },
  streak: {
    marginTop: 2,
    color: "#6B6258",
  },
  weekRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    alignItems: "center",
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    color: "#8A8174",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOn: {
    backgroundColor: "#1F6F54",
  },
  dotOff: {
    backgroundColor: "#E4D8C8",
  },
  dotToday: {
    transform: [{ scale: 1.25 }],
  },
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(31, 26, 22, 0.35)",
  },
  sheet: {
    backgroundColor: "#FFFbf4",
    padding: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1A16",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E4D8C8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F1A16",
    backgroundColor: "#F4EFE6",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reminderLabel: {
    fontSize: 16,
    color: "#1F1A16",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    width: 56,
    borderWidth: 1,
    borderColor: "#E4D8C8",
    borderRadius: 12,
    paddingVertical: 10,
    textAlign: "center",
    fontSize: 18,
    backgroundColor: "#F4EFE6",
  },
  timeColon: {
    fontSize: 20,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "#1F6F54",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonLabel: {
    color: "#F4EFE6",
    fontWeight: "700",
    fontSize: 16,
  },
  archiveLabel: {
    textAlign: "center",
    color: "#9B4D3C",
    paddingVertical: 8,
  },
});
