import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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

type PickerTarget = 'start' | 'end';
type PickerMode = 'date' | 'time';

type ActivePicker = {
  target: PickerTarget;
  mode: PickerMode;
};

const formatDisplayDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Select date';
  return parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDisplayTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Select time';
  return parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const mergeDate = (baseIso: string, pickedDate: Date) => {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return baseIso;
  const next = new Date(base);
  next.setFullYear(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate());
  return next.toISOString();
};

const mergeTime = (baseIso: string, pickedTime: Date) => {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return baseIso;
  const next = new Date(base);
  next.setHours(pickedTime.getHours(), pickedTime.getMinutes(), 0, 0);
  return next.toISOString();
};

export function CreateEventScreen({ draft, categoryInput, categories, onDraft, onCategoryInput, onCreate, onBack }: Props) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);

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

  const pickerIsoValue =
    activePicker?.target === 'start'
      ? draft.startTime
      : activePicker?.target === 'end'
        ? draft.endTime
        : new Date().toISOString();

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!activePicker) return;

    if (Platform.OS !== 'ios') {
      setActivePicker(null);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    if (activePicker.target === 'start') {
      const nextStart = activePicker.mode === 'date'
        ? mergeDate(draft.startTime, selectedDate)
        : mergeTime(draft.startTime, selectedDate);
      onDraft({ ...draft, startTime: nextStart });
      return;
    }

    const nextEnd = activePicker.mode === 'date'
      ? mergeDate(draft.endTime, selectedDate)
      : mergeTime(draft.endTime, selectedDate);
    onDraft({ ...draft, endTime: nextEnd });
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

        <View className="gap-2">
          <Text className="text-xs font-medium text-slate-500">Start</Text>
          <View className="flex-row gap-2">
            <Pressable className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3" onPress={() => setActivePicker({ target: 'start', mode: 'date' })}>
              <Text className="text-slate-800">📅 {formatDisplayDate(draft.startTime)}</Text>
            </Pressable>
            <Pressable className="w-36 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3" onPress={() => setActivePicker({ target: 'start', mode: 'time' })}>
              <Text className="text-slate-800">🕒 {formatDisplayTime(draft.startTime)}</Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-medium text-slate-500">End</Text>
          <View className="flex-row gap-2">
            <Pressable className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3" onPress={() => setActivePicker({ target: 'end', mode: 'date' })}>
              <Text className="text-slate-800">📅 {formatDisplayDate(draft.endTime)}</Text>
            </Pressable>
            <Pressable className="w-36 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3" onPress={() => setActivePicker({ target: 'end', mode: 'time' })}>
              <Text className="text-slate-800">🕒 {formatDisplayTime(draft.endTime)}</Text>
            </Pressable>
          </View>
        </View>

        {!!activePicker && (
          <View className="rounded-lg border border-blue-100 bg-blue-50 p-2">
            <DateTimePicker
              value={new Date(pickerIsoValue)}
              mode={activePicker.mode}
              display={activePicker.mode === 'date' ? 'default' : 'spinner'}
              onChange={handlePickerChange}
            />
            {Platform.OS === 'ios' && (
              <Pressable className="mt-2 rounded-md bg-blue-600 px-3 py-2" onPress={() => setActivePicker(null)}>
                <Text className="text-center text-white font-medium">Done</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <Pressable className="bg-blue-600 rounded-xl px-4 py-3" onPress={onCreate}><Text className="text-white text-center">Create</Text></Pressable>
      <Pressable onPress={onBack}><Text className="text-blue-600 text-center">Back</Text></Pressable>
    </ScrollView>
  );
}
