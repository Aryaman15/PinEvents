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

export function CreateEventScreen({ draft, categoryInput, categories, onDraft, onCategoryInput, onCreate, onBack }: Props) {
  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 24, rowGap: 12 }}>
      <Text className="text-2xl font-bold">Create event</Text>
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Title" value={draft.title} onChangeText={(v) => onDraft({ ...draft, title: v })} />
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Description" multiline value={draft.description} onChangeText={(v) => onDraft({ ...draft, description: v })} />
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Category" value={draft.category} onChangeText={(v) => onDraft({ ...draft, category: v })} />
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Or create category" value={categoryInput} onChangeText={onCategoryInput} />
      {!!categories.length && <Text className="text-slate-500">Existing: {categories.join(', ')}</Text>}
      <View className="flex-row gap-2">
        <Pressable className={`flex-1 rounded-xl px-4 py-3 ${draft.type === 'public' ? 'bg-blue-600' : 'bg-slate-200'}`} onPress={() => onDraft({ ...draft, type: 'public' })}><Text className={`text-center ${draft.type === 'public' ? 'text-white' : 'text-slate-700'}`}>Public</Text></Pressable>
        <Pressable className={`flex-1 rounded-xl px-4 py-3 ${draft.type === 'private' ? 'bg-blue-600' : 'bg-slate-200'}`} onPress={() => onDraft({ ...draft, type: 'private' })}><Text className={`text-center ${draft.type === 'private' ? 'text-white' : 'text-slate-700'}`}>Private</Text></Pressable>
      </View>
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Start time (ISO)" value={draft.startTime} onChangeText={(v) => onDraft({ ...draft, startTime: v })} />
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="End time (ISO)" value={draft.endTime} onChangeText={(v) => onDraft({ ...draft, endTime: v })} />
      <Pressable className="bg-blue-600 rounded-xl px-4 py-3" onPress={onCreate}><Text className="text-white text-center">Create</Text></Pressable>
      <Pressable onPress={onBack}><Text className="text-blue-600 text-center">Back</Text></Pressable>
    </ScrollView>
  );
}
