import { useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { EventDraft } from "../types/app";

type Props = {
  draft: EventDraft;
  categoryInput: string;
  categories: string[];
  isUploadingImages: boolean;
  errorMessage?: string;
  onDraft: (next: EventDraft) => void;
  onCategoryInput: (v: string) => void;
  onPickImages: () => void;
  onCreate: () => void;
  onBack: () => void;
};

type ScheduleTarget = "start" | "end";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const QUICK_TIMES = [
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
];

const parseIso = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatDisplayDate = (value: string) =>
  parseIso(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const formatDisplayTime = (value: string) =>
  parseIso(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

const mergeDate = (baseIso: string, pickedDate: Date) => {
  const next = new Date(parseIso(baseIso));
  next.setFullYear(
    pickedDate.getFullYear(),
    pickedDate.getMonth(),
    pickedDate.getDate(),
  );
  return next.toISOString();
};

const mergeTime = (baseIso: string, timeText: string) => {
  const next = new Date(parseIso(baseIso));
  const [hours, minutes] = timeText.split(":").map(Number);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  )
    return baseIso;
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
};

const getMonthGrid = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export function CreateEventScreen({
  draft,
  categoryInput,
  categories,
  isUploadingImages,
  errorMessage,
  onDraft,
  onCategoryInput,
  onPickImages,
  onCreate,
  onBack,
}: Props) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [activeDateTarget, setActiveDateTarget] =
    useState<ScheduleTarget | null>(null);
  const [activeTimeTarget, setActiveTimeTarget] =
    useState<ScheduleTarget | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [timeInput, setTimeInput] = useState("");

  const filteredCategories = useMemo(() => {
    const query = categoryInput.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) =>
      category.toLowerCase().includes(query),
    );
  }, [categories, categoryInput]);

  const hasExactMatch = useMemo(() => {
    const query = categoryInput.trim().toLowerCase();
    if (!query) return false;
    return categories.some((category) => category.toLowerCase() === query);
  }, [categories, categoryInput]);

  const selectExistingCategory = (category: string) => {
    onDraft({ ...draft, category });
    onCategoryInput("");
    setShowCategoryDropdown(false);
  };

  const createNewCategory = () => {
    const nextCategory = categoryInput.trim();
    if (!nextCategory) return;
    onDraft({ ...draft, category: nextCategory });
    onCategoryInput(nextCategory);
    setShowCategoryDropdown(false);
  };

  const openDatePicker = (target: ScheduleTarget) => {
    setActiveTimeTarget(null);
    setActiveDateTarget(target);
    setCalendarMonth(
      parseIso(target === "start" ? draft.startTime : draft.endTime),
    );
  };

  const openTimePicker = (target: ScheduleTarget) => {
    setActiveDateTarget(null);
    setActiveTimeTarget(target);
    const source = target === "start" ? draft.startTime : draft.endTime;
    const parsed = parseIso(source);
    setTimeInput(
      `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`,
    );
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const selectDate = (day: number) => {
    if (!activeDateTarget) return;
    const picked = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );
    if (activeDateTarget === "start")
      onDraft({ ...draft, startTime: mergeDate(draft.startTime, picked) });
    else onDraft({ ...draft, endTime: mergeDate(draft.endTime, picked) });
    setActiveDateTarget(null);
  };

  const applyTime = (time: string) => {
    if (!activeTimeTarget) return;
    if (activeTimeTarget === "start")
      onDraft({ ...draft, startTime: mergeTime(draft.startTime, time) });
    else onDraft({ ...draft, endTime: mergeTime(draft.endTime, time) });
    setActiveTimeTarget(null);
  };

  const removeImageUrl = (url: string) => {
    onDraft({
      ...draft,
      imageUrls: draft.imageUrls.filter((item) => item !== url),
    });
  };

  const selectedDate = activeDateTarget
    ? parseIso(activeDateTarget === "start" ? draft.startTime : draft.endTime)
    : null;
  const monthCells = getMonthGrid(calendarMonth);

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 24, rowGap: 12, paddingBottom: 220 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold">Create event</Text>
      {!!errorMessage && (
        <View className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <Text className="text-sm text-red-700">{errorMessage}</Text>
        </View>
      )}
      <TextInput
        className="rounded-xl border border-slate-200 bg-white px-4 py-3"
        placeholder="Title"
        value={draft.title}
        onChangeText={(v) => onDraft({ ...draft, title: v })}
      />
      <TextInput
        className="rounded-xl border border-slate-200 bg-white px-4 py-3"
        placeholder="Description"
        multiline
        value={draft.description}
        onChangeText={(v) => onDraft({ ...draft, description: v })}
      />

      <View>
        <TextInput
          className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          placeholder="Category"
          value={categoryInput || draft.category}
          onFocus={() => setShowCategoryDropdown(true)}
          onChangeText={(v) => {
            onCategoryInput(v);
            onDraft({ ...draft, category: v });
            setShowCategoryDropdown(true);
          }}
        />
        {showCategoryDropdown && (
          <View className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
            {filteredCategories.map((category) => (
              <Pressable
                key={category}
                className="rounded px-3 py-2"
                onPress={() => selectExistingCategory(category)}
              >
                <Text className="text-slate-700">{category}</Text>
              </Pressable>
            ))}
            {!hasExactMatch && !!categoryInput.trim() && (
              <Pressable
                className="rounded bg-blue-50 px-3 py-2"
                onPress={createNewCategory}
              >
                <Text className="text-blue-700">
                  Use "{categoryInput.trim()}"
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View className="rounded-xl border border-slate-200 bg-white p-3 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-slate-700">
            Event photos ({draft.imageUrls.length}/4)
          </Text>
          <Pressable
            className="rounded-md bg-blue-600 px-3 py-2"
            onPress={onPickImages}
            disabled={isUploadingImages || draft.imageUrls.length >= 4}
          >
            <Text className="text-white">
              {isUploadingImages ? "Uploading..." : "Upload photos"}
            </Text>
          </Pressable>
        </View>
        <Text className="text-xs text-slate-500">
          Select images from your phone. No URL paste required.
        </Text>
        {!!draft.imageUrls.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {draft.imageUrls.map((url) => (
              <View
                key={url}
                className="w-36 rounded-lg border border-slate-200 bg-white p-2"
              >
                <Image
                  source={{ uri: url }}
                  className="h-20 w-full rounded-md bg-slate-100"
                  resizeMode="cover"
                />
                <Pressable
                  className="mt-2 rounded-md bg-red-50 px-2 py-1"
                  onPress={() => removeImageUrl(url)}
                >
                  <Text className="text-center text-xs text-red-600">
                    Remove
                  </Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View className="flex-row gap-2">
        <Pressable
          className={`flex-1 rounded-xl px-4 py-3 ${draft.type === "public" ? "bg-blue-600" : "bg-slate-200"}`}
          onPress={() => onDraft({ ...draft, type: "public" })}
        >
          <Text
            className={`text-center ${draft.type === "public" ? "text-white" : "text-slate-700"}`}
          >
            Public
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 rounded-xl px-4 py-3 ${draft.type === "private" ? "bg-blue-600" : "bg-slate-200"}`}
          onPress={() => onDraft({ ...draft, type: "private" })}
        >
          <Text
            className={`text-center ${draft.type === "private" ? "text-white" : "text-slate-700"}`}
          >
            Private
          </Text>
        </Pressable>
      </View>

      <View className="rounded-xl border border-slate-200 bg-white p-3 gap-3">
        <Text className="text-sm font-semibold text-slate-700">Schedule</Text>

        {(["start", "end"] as const).map((target) => {
          const iso = target === "start" ? draft.startTime : draft.endTime;
          return (
            <View
              key={target}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3 gap-2"
            >
              <Text className="text-xs font-semibold uppercase text-slate-500">
                {target}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-3"
                  onPress={() => openDatePicker(target)}
                >
                  <Text className="text-slate-800">
                    📅 {formatDisplayDate(iso)}
                  </Text>
                </Pressable>
                <Pressable
                  className="w-36 rounded-md border border-slate-200 bg-white px-3 py-3"
                  onPress={() => openTimePicker(target)}
                >
                  <Text className="text-slate-800">
                    🕒 {formatDisplayTime(iso)}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {!!activeDateTarget && (
          <View className="rounded-lg border border-blue-100 bg-blue-50 p-3 gap-2">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
              >
                <Text className="text-blue-700">‹ Prev</Text>
              </Pressable>
              <Text className="font-semibold text-slate-800">
                {calendarMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Pressable
                onPress={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() + 1,
                      1,
                    ),
                  )
                }
              >
                <Text className="text-blue-700">Next ›</Text>
              </Pressable>
            </View>

            <View className="flex-row flex-wrap">
              {WEEK_DAYS.map((wd) => (
                <Text
                  key={wd}
                  style={{ width: "14.28%" }}
                  className="text-center text-xs text-slate-500 pb-1"
                >
                  {wd}
                </Text>
              ))}
              {monthCells.map((day, index) => {
                const isSelected = !!(
                  day &&
                  selectedDate &&
                  day === selectedDate.getDate() &&
                  calendarMonth.getMonth() === selectedDate.getMonth() &&
                  calendarMonth.getFullYear() === selectedDate.getFullYear()
                );
                return (
                  <Pressable
                    key={`${day}-${index}`}
                    style={{ width: "14.28%" }}
                    className={`py-2 ${isSelected ? "bg-blue-600 rounded-md" : ""}`}
                    onPress={() => day && selectDate(day)}
                    disabled={!day}
                  >
                    <Text
                      className={`text-center ${isSelected ? "text-white" : "text-slate-700"}`}
                    >
                      {day ?? ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => setActiveDateTarget(null)}>
              <Text className="text-center text-blue-700">Done</Text>
            </Pressable>
          </View>
        )}

        {!!activeTimeTarget && (
          <View className="rounded-lg border border-blue-100 bg-blue-50 p-3 gap-2">
            <Text className="text-sm font-medium text-slate-700">
              Pick time
            </Text>
            <Text className="text-xs text-slate-500">
              Enter in 24-hour format, e.g. 09:30
            </Text>
            <TextInput
              className="rounded-md border-2 border-blue-300 bg-white px-3 py-2 text-slate-900"
              placeholder="HH:MM (24h)"
              placeholderTextColor="#94a3b8"
              selectionColor="#2563eb"
              autoFocus
              value={timeInput}
              onChangeText={setTimeInput}
            />
            <Text className="text-xs text-slate-600">
              Typing: {timeInput || "--:--"}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {QUICK_TIMES.map((time) => (
                <Pressable
                  key={time}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2"
                  onPress={() => applyTime(time)}
                >
                  <Text className="text-slate-700">{time}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 rounded-md bg-blue-600 px-3 py-2"
                onPress={() => applyTime(timeInput)}
              >
                <Text className="text-center text-white">Apply</Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-md border border-slate-300 px-3 py-2"
                onPress={() => setActiveTimeTarget(null)}
              >
                <Text className="text-center text-slate-700">Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <Pressable
        className="bg-blue-600 rounded-xl px-4 py-3"
        onPress={onCreate}
      >
        <Text className="text-white text-center">Create</Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text className="text-blue-600 text-center">Back</Text>
      </Pressable>
    </ScrollView>
  );
}
