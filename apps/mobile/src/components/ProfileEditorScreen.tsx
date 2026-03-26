import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Profile } from '../types/app';

type Props = {
  draft: Profile;
  interestInput: string;
  needsSetup: boolean;
  onUpdateDraft: (next: Profile) => void;
  onInterestInput: (v: string) => void;
  onAddInterest: () => void;
  onRemoveInterest: (interest: string) => void;
  onSave: () => void;
};

export function ProfileEditorScreen({ draft, interestInput, needsSetup, onUpdateDraft, onInterestInput, onAddInterest, onRemoveInterest, onSave }: Props) {
  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 24, rowGap: 12 }}>
      <Text className="text-2xl font-bold text-slate-900">{needsSetup ? 'Finish your profile' : 'Edit profile'}</Text>
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Display name" value={draft.displayName} onChangeText={(v) => onUpdateDraft({ ...draft, displayName: v })} />
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Bio" multiline value={draft.bio} onChangeText={(v) => onUpdateDraft({ ...draft, bio: v })} />
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Avatar URL" value={draft.avatarUrl} onChangeText={(v) => onUpdateDraft({ ...draft, avatarUrl: v })} />
      {!!draft.avatarUrl && (
        <View className="items-center">
          <Image source={{ uri: draft.avatarUrl }} className="h-24 w-24 rounded-full bg-slate-200" />
        </View>
      )}
      <View className="flex-row gap-2">
        <TextInput className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Add interest" value={interestInput} onChangeText={onInterestInput} />
        <Pressable className="bg-slate-800 rounded-xl px-4 justify-center" onPress={onAddInterest}><Text className="text-white">Add</Text></Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {draft.interests.map((interest) => (
          <Pressable key={interest} className="rounded-full bg-blue-100 px-3 py-2" onPress={() => onRemoveInterest(interest)}><Text className="text-blue-700">{interest} ✕</Text></Pressable>
        ))}
      </View>
      <Pressable className="bg-blue-600 rounded-xl px-4 py-3 mt-3" onPress={onSave}><Text className="text-white text-center font-semibold">Save profile</Text></Pressable>
    </ScrollView>
  );
}
