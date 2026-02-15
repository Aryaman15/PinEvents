import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { EventDraft } from '../types/app';

type Props = {
  draft: EventDraft;
  categoryInput: string;
  categories: string[];
  onDraft: (next: EventDraft) => void;
  onCategoryInput: (v: string) => void;
  onCreate: () => void;
  onBack: () => void;
};

type ScheduleTarget = 'start' | 'end';

const formatDisplayDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Invalid date';
  return parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDisplayTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Invalid time';
  return parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const shiftByMinutes = (value: string, minutes: number) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  parsed.setMinutes(parsed.getMinutes() + minutes);
  return parsed.toISOString();
};

const shiftByDays = (value: string, days: number) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString();
};

const applyScheduleShift = (
  draft: EventDraft,
  target: ScheduleTarget,
  updater: (iso: string) => string,
): EventDraft => {
  if (target === 'start') {
    return { ...draft, startTime: updater(draft.startTime) };
  }
  return { ...draft, endTime: updater(draft.endTime) };
};

export function CreateEventScreen({ draft, categoryInput, categories, onDraft, onCategoryInput, onCreate, onBack }: Props) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const filteredCategories = useMemo(() => {
    const query = categoryInput.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) => category.toLowerCase().includes(query));
  }, [categories, categoryInput]);

  const hasExactMatch = useMemo(() => {
    const query = categoryInput.trim().toLowerCase();
    if (!query) return false;
    return categories.some((category) => category.toLowerCase() === query);
  }, [categories, categoryInput]);

  const selectExistingCategory = (category: string) => {
    onDraft({ ...draft, category });
    onCategoryInput('');
    setShowCategoryDropdown(false);
  };

  const createNewCategory = () => {
    const nextCategory = categoryInput.trim();
    if (!nextCategory) return;
    onDraft({ ...draft, category: nextCategory });
    onCategoryInput(nextCategory);
    setShowCategoryDropdown(false);
  };

  const handleShift = (target: ScheduleTarget, shiftType: 'min' | 'day', amount: number) => {
    const updateFn = shiftType === 'min'
      ? (iso: string) => shiftByMinutes(iso, amount)
      : (iso: string) => shiftByDays(iso, amount);
    onDraft(applyScheduleShift(draft, target, updateFn));
  };

  const setEndOneHourAfterStart = () => {
    onDraft({
      ...draft,
      endTime: shiftByMinutes(draft.startTime, 60),
    });
  };

  const setStartNow = () => {
    const now = new Date();
    onDraft({ ...draft, startTime: now.toISOString() });
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 24, rowGap: 12 }} keyboardShouldPersistTaps="handled">
      <Text className="text-2xl font-bold">Create event</Text>
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Title" value={draft.title} onChangeText={(v) => onDraft({ ...draft, title: v })} />
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Description" multiline value={draft.description} onChangeText={(v) => onDraft({ ...draft, description: v })} />

      <Text className="text-sm font-medium text-slate-700">Category</Text>
      <Pressable className="rounded-xl border border-slate-200 bg-white px-4 py-3" onPress={() => setShowCategoryDropdown((prev) => !prev)}>
        <Text className={draft.category ? 'text-slate-900' : 'text-slate-400'}>
          {draft.category || 'Select or create category'}
        </Text>
      </Pressable>

      {showCategoryDropdown && (
        <View className="rounded-xl border border-slate-200 bg-white p-3 gap-2">
          <TextInput
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            placeholder="Search category"
            value={categoryInput}
            onChangeText={onCategoryInput}
          />

          <View className="max-h-40">
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredCategories.length ? (
                filteredCategories.map((category) => (
                  <Pressable key={category} className="px-2 py-2" onPress={() => selectExistingCategory(category)}>
                    <Text className="text-slate-800">{category}</Text>
                  </Pressable>
                ))
              ) : (
                <Text className="px-2 py-2 text-slate-500">No matching category found.</Text>
              )}
            </ScrollView>
          </View>

          {!!categoryInput.trim() && !hasExactMatch && (
            <Pressable className="rounded-lg bg-blue-600 px-3 py-2" onPress={createNewCategory}>
              <Text className="text-center font-medium text-white">Create "{categoryInput.trim()}"</Text>
            </Pressable>
          )}
        </View>
      )}

      <View className="flex-row gap-2">
        <Pressable className={`flex-1 rounded-xl px-4 py-3 ${draft.type === 'public' ? 'bg-blue-600' : 'bg-slate-200'}`} onPress={() => onDraft({ ...draft, type: 'public' })}><Text className={`text-center ${draft.type === 'public' ? 'text-white' : 'text-slate-700'}`}>Public</Text></Pressable>
        <Pressable className={`flex-1 rounded-xl px-4 py-3 ${draft.type === 'private' ? 'bg-blue-600' : 'bg-slate-200'}`} onPress={() => onDraft({ ...draft, type: 'private' })}><Text className={`text-center ${draft.type === 'private' ? 'text-white' : 'text-slate-700'}`}>Private</Text></Pressable>
      </View>

      <View className="rounded-xl border border-slate-200 bg-white p-3 gap-3">
        <Text className="text-sm font-semibold text-slate-700">Schedule</Text>

        <View className="flex-row gap-2">
          <Pressable className="flex-1 rounded-lg bg-slate-100 px-3 py-2" onPress={setStartNow}>
            <Text className="text-center text-slate-700">Start Now</Text>
          </Pressable>
          <Pressable className="flex-1 rounded-lg bg-slate-100 px-3 py-2" onPress={setEndOneHourAfterStart}>
            <Text className="text-center text-slate-700">End = Start + 1h</Text>
          </Pressable>
        </View>

        {(['start', 'end'] as const).map((target) => (
          <View key={target} className="rounded-lg border border-slate-100 bg-slate-50 p-3 gap-2">
            <Text className="text-xs font-semibold uppercase text-slate-500">{target}</Text>
            <Text className="text-base font-medium text-slate-800">
              {formatDisplayDate(target === 'start' ? draft.startTime : draft.endTime)} • {formatDisplayTime(target === 'start' ? draft.startTime : draft.endTime)}
            </Text>

            <View className="flex-row gap-2">
              <Pressable className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-2" onPress={() => handleShift(target, 'day', -1)}>
                <Text className="text-center text-slate-700">-1 day</Text>
              </Pressable>
              <Pressable className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-2" onPress={() => handleShift(target, 'day', 1)}>
                <Text className="text-center text-slate-700">+1 day</Text>
              </Pressable>
            </View>

            <View className="flex-row gap-2">
              <Pressable className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-2" onPress={() => handleShift(target, 'min', -15)}>
                <Text className="text-center text-slate-700">-15 min</Text>
              </Pressable>
              <Pressable className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-2" onPress={() => handleShift(target, 'min', 15)}>
                <Text className="text-center text-slate-700">+15 min</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <Pressable className="bg-blue-600 rounded-xl px-4 py-3" onPress={onCreate}><Text className="text-white text-center">Create</Text></Pressable>
      <Pressable onPress={onBack}><Text className="text-blue-600 text-center">Back</Text></Pressable>
    </ScrollView>
  );
}
