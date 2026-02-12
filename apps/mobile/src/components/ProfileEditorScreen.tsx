import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, Text, TextInput, SafeAreaView, View } from "react-native";
import { styles } from "../styles";
import type { Profile } from "../types";

type ProfileEditorScreenProps = {
  needsProfileSetup: boolean;
  profileDraft: Profile;
  interestInput: string;
  errorMessage: string;
  onChangeDisplayName: (value: string) => void;
  onChangeBio: (value: string) => void;
  onChangeAvatarUrl: (value: string) => void;
  onChangeInterestInput: (value: string) => void;
  onAddInterest: () => void;
  onRemoveInterest: (interest: string) => void;
  onSaveProfile: () => void;
  onBack: () => void;
};

export const ProfileEditorScreen = ({
  needsProfileSetup,
  profileDraft,
  interestInput,
  errorMessage,
  onChangeDisplayName,
  onChangeBio,
  onChangeAvatarUrl,
  onChangeInterestInput,
  onAddInterest,
  onRemoveInterest,
  onSaveProfile,
  onBack,
}: ProfileEditorScreenProps) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.profileContainer, styles.safeAreaContent]}
      >
        <Text style={styles.title}>
          {needsProfileSetup ? "Finish your profile" : "Edit profile"}
        </Text>
        <Text style={styles.subtitle}>
          Add a display name and interests to continue.
        </Text>
        <TextInput
          placeholder="Display name"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={profileDraft.displayName}
          onChangeText={onChangeDisplayName}
        />
        <TextInput
          placeholder="Bio"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.textArea]}
          value={profileDraft.bio}
          onChangeText={onChangeBio}
          multiline
        />
        <TextInput
          placeholder="Avatar URL (optional)"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={profileDraft.avatarUrl}
          onChangeText={onChangeAvatarUrl}
        />
        <View style={styles.interestRow}>
          <TextInput
            placeholder="Add interest"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.interestInput]}
            value={interestInput}
            onChangeText={onChangeInterestInput}
          />
          <Pressable style={styles.secondaryButton} onPress={onAddInterest}>
            <Text style={styles.secondaryButtonText}>Add</Text>
          </Pressable>
        </View>
        <View style={styles.tagWrap}>
          {profileDraft.interests.map((item) => (
            <Pressable
              key={item}
              style={styles.tag}
              onPress={() => onRemoveInterest(item)}
            >
              <Text style={styles.tagText}>{item} ✕</Text>
            </Pressable>
          ))}
        </View>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Pressable style={styles.primaryButton} onPress={onSaveProfile}>
          <Text style={styles.primaryButtonText}>Save profile</Text>
        </Pressable>
        {!needsProfileSetup ? (
          <Pressable style={styles.linkButton} onPress={onBack}>
            <Text style={styles.linkText}>Back to profile</Text>
          </Pressable>
        ) : null}
        <StatusBar style="dark" />
      </ScrollView>
    </SafeAreaView>
  );
};
