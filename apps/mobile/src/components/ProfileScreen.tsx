import { Pressable, ScrollView, Text, View } from 'react-native';
import { Profile } from '../types/app';

type Props = {
  profile: Profile;
  onEdit: () => void;
  onLogout: () => void;
  onBack: () => void;
};

export function ProfileScreen({ profile, onEdit, onLogout, onBack }: Props) {
  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 24, rowGap: 12 }}>
      <Text className="text-2xl font-bold">Your profile</Text>
      <Text className="text-lg">{profile.displayName || 'No display name set'}</Text>
      {!!profile.bio && <Text className="text-slate-600">{profile.bio}</Text>}
      <Text className="font-semibold mt-2">Interests</Text>
      <View className="flex-row flex-wrap gap-2">
        {profile.interests.length ? profile.interests.map((interest) => (
          <View key={interest} className="rounded-full bg-slate-200 px-3 py-1"><Text>{interest}</Text></View>
        )) : <Text className="text-slate-500">No interests added yet.</Text>}
      </View>
      <Pressable className="bg-blue-600 rounded-xl px-4 py-3 mt-3" onPress={onEdit}><Text className="text-white text-center">Edit profile</Text></Pressable>
      <Pressable className="bg-red-600 rounded-xl px-4 py-3" onPress={onLogout}><Text className="text-white text-center">Log out</Text></Pressable>
      <Pressable onPress={onBack}><Text className="text-blue-600 text-center">Back to map</Text></Pressable>
    </ScrollView>
  );
}
