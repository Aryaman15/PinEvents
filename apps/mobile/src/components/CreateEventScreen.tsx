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

const getDatePart = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTimePart = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const setDatePart = (value: string, nextDate: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const [year, month, day] = nextDate.split('-').map(Number);
  if (!year || !month || !day) return value;

  parsed.setFullYear(year, month - 1, day);
  return parsed.toISOString();
};

const setTimePart = (value: string, nextTime: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const [hours, minutes] = nextTime.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  parsed.setHours(hours, minutes, 0, 0);
  return parsed.toISOString();
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
            <TextInput
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              placeholder="YYYY-MM-DD"
              value={getDatePart(draft.startTime)}
              onChangeText={(nextDate) => onDraft({ ...draft, startTime: setDatePart(draft.startTime, nextDate) })}
            />
            <TextInput
              className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              placeholder="HH:MM"
              value={getTimePart(draft.startTime)}
              onChangeText={(nextTime) => onDraft({ ...draft, startTime: setTimePart(draft.startTime, nextTime) })}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-medium text-slate-500">End</Text>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              placeholder="YYYY-MM-DD"
              value={getDatePart(draft.endTime)}
              onChangeText={(nextDate) => onDraft({ ...draft, endTime: setDatePart(draft.endTime, nextDate) })}
            />
            <TextInput
              className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              placeholder="HH:MM"
              value={getTimePart(draft.endTime)}
              onChangeText={(nextTime) => onDraft({ ...draft, endTime: setTimePart(draft.endTime, nextTime) })}
            />
          </View>
        </View>
      </View>

      <Pressable className="bg-blue-600 rounded-xl px-4 py-3" onPress={onCreate}><Text className="text-white text-center">Create</Text></Pressable>
      <Pressable onPress={onBack}><Text className="text-blue-600 text-center">Back</Text></Pressable>
    </ScrollView>
  );
}
