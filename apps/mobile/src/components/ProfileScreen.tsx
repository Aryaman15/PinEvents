import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, Text, SafeAreaView, View } from "react-native";
import { styles } from "../styles";
import type { Profile } from "../types";

type ProfileScreenProps = {
  profile: Profile;
  onEditProfile: () => void;
  onLogout: () => void;
  onBack: () => void;
};

export const ProfileScreen = ({
  profile,
  onEditProfile,
  onLogout,
  onBack,
}: ProfileScreenProps) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.profileContainer, styles.safeAreaContent]}
      >
        <Text style={styles.title}>Your profile</Text>
        <Text style={styles.profileValue}>
          {profile.displayName || "No display name set"}
        </Text>
        {profile.bio ? (
          <Text style={styles.profileBio}>{profile.bio}</Text>
        ) : null}
        <Text style={styles.sectionTitle}>Interests</Text>
        <View style={styles.tagWrap}>
          {profile.interests.length ? (
            profile.interests.map((interest) => (
              <View key={interest} style={styles.tag}>
                <Text style={styles.tagText}>{interest}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>No interests added yet.</Text>
          )}
        </View>
        <Pressable style={styles.primaryButton} onPress={onEditProfile}>
          <Text style={styles.primaryButtonText}>Edit profile</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </Pressable>
        <Pressable style={styles.linkButton} onPress={onBack}>
          <Text style={styles.linkText}>Back to map</Text>
        </Pressable>
        <StatusBar style="dark" />
      </ScrollView>
    </SafeAreaView>
  );
};
