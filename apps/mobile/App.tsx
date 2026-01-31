import { StatusBar } from 'expo-status-bar';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
} from 'react-native';

MapLibreGL.setAccessToken('');

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
const initialCenter: [number, number] = [-122.4194, 37.7749];
const tokenKey = 'authToken';

const eventPins = [
  {
    id: 'public-event',
    coordinate: [-122.4194, 37.7749] as [number, number],
    label: 'P',
    color: '#2f80ed',
  },
  {
    id: 'private-event',
    coordinate: [-122.414, 37.778] as [number, number],
    label: 'R',
    color: '#9b51e0',
  },
];

type AuthMode = 'login' | 'signup';

type Profile = {
  id: string;
  displayName: string;
  bio: string;
  interests: string[];
  avatarUrl: string;
};

const emptyProfile: Profile = {
  id: '',
  displayName: '',
  bio: '',
  interests: [],
  avatarUrl: '',
};

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Profile>(emptyProfile);
  const [interestInput, setInterestInput] = useState('');

  const needsProfileSetup = useMemo(() => {
    return Boolean(authToken && profile && !profile.displayName.trim());
  }, [authToken, profile]);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await SecureStore.getItemAsync(tokenKey);
      setAuthToken(storedToken);
      setIsLoading(false);
      if (storedToken) {
        await loadProfile(storedToken);
      }
    };

    loadToken().catch(() => {
      setIsLoading(false);
    });
  }, []);

  const loadProfile = async (token: string) => {
    if (!apiUrl) {
      setErrorMessage('EXPO_PUBLIC_API_URL is not set.');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setErrorMessage('Unable to load profile.');
        return;
      }

      const data = (await response.json()) as { user?: Profile };
      if (!data.user) {
        setErrorMessage('Profile response is missing.');
        return;
      }

      setProfile(data.user);
      setProfileDraft(data.user);
    } catch (error) {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const handleAuth = async () => {
    setErrorMessage('');
    if (!apiUrl) {
      setErrorMessage('EXPO_PUBLIC_API_URL is not set.');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setErrorMessage('Authentication failed. Please check your details.');
        return;
      }

      const data = (await response.json()) as { token?: string };
      if (!data.token) {
        setErrorMessage('Missing token in response.');
        return;
      }

      await SecureStore.setItemAsync(tokenKey, data.token);
      setAuthToken(data.token);
      await loadProfile(data.token);
    } catch (error) {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const handleSaveProfile = async () => {
    setErrorMessage('');
    if (!authToken) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          displayName: profileDraft.displayName,
          bio: profileDraft.bio,
          interests: profileDraft.interests,
          avatarUrl: profileDraft.avatarUrl,
        }),
      });

      if (!response.ok) {
        setErrorMessage('Unable to save profile.');
        return;
      }

      const data = (await response.json()) as { user?: Profile };
      if (!data.user) {
        setErrorMessage('Profile response is missing.');
        return;
      }

      setProfile(data.user);
      setProfileDraft(data.user);
      setShowProfileEditor(false);
    } catch (error) {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const handleAddInterest = () => {
    const trimmed = interestInput.trim();
    if (!trimmed || profileDraft.interests.includes(trimmed)) {
      setInterestInput('');
      return;
    }

    setProfileDraft((prev) => ({
      ...prev,
      interests: [...prev.interests, trimmed],
    }));
    setInterestInput('');
  };

  const handleRemoveInterest = (interest: string) => {
    setProfileDraft((prev) => ({
      ...prev,
      interests: prev.interests.filter((item) => item !== interest),
    }));
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!authToken) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.title}>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</Text>
        <Text style={styles.subtitle}>
          {authMode === 'login' ? 'Log in to continue.' : 'Sign up to access the map.'}
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Password (min 8 chars)"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Pressable style={styles.primaryButton} onPress={handleAuth}>
          <Text style={styles.primaryButtonText}>
            {authMode === 'login' ? 'Log In' : 'Sign Up'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.linkButton}
          onPress={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
        >
          <Text style={styles.linkText}>
            {authMode === 'login' ? 'Need an account? Sign up.' : 'Have an account? Log in.'}
          </Text>
        </Pressable>
        <StatusBar style="dark" />
      </View>
    );
  }

  if (needsProfileSetup || showProfileEditor) {
    return (
      <View style={styles.profileContainer}>
        <Text style={styles.title}>{needsProfileSetup ? 'Finish your profile' : 'Edit profile'}</Text>
        <Text style={styles.subtitle}>Add a display name and interests to continue.</Text>
        <TextInput
          placeholder="Display name"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={profileDraft.displayName}
          onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, displayName: value }))}
        />
        <TextInput
          placeholder="Bio"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.textArea]}
          value={profileDraft.bio}
          onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, bio: value }))}
          multiline
        />
        <TextInput
          placeholder="Avatar URL (optional)"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={profileDraft.avatarUrl}
          onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, avatarUrl: value }))}
        />
        <View style={styles.interestRow}>
          <TextInput
            placeholder="Add interest"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.interestInput]}
            value={interestInput}
            onChangeText={setInterestInput}
          />
          <Pressable style={styles.secondaryButton} onPress={handleAddInterest}>
            <Text style={styles.secondaryButtonText}>Add</Text>
          </Pressable>
        </View>
        <FlatList
          data={profileDraft.interests}
          keyExtractor={(item) => item}
          horizontal
          contentContainerStyle={styles.interestList}
          renderItem={({ item }) => (
            <Pressable style={styles.tag} onPress={() => handleRemoveInterest(item)}>
              <Text style={styles.tagText}>{item} ✕</Text>
            </Pressable>
          )}
        />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Pressable style={styles.primaryButton} onPress={handleSaveProfile}>
          <Text style={styles.primaryButtonText}>Save profile</Text>
        </Pressable>
        {!needsProfileSetup ? (
          <Pressable style={styles.linkButton} onPress={() => setShowProfileEditor(false)}>
            <Text style={styles.linkText}>Back to map</Text>
          </Pressable>
        ) : null}
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView style={styles.map} styleURL="https://demotiles.maplibre.org/style.json">
        <MapLibreGL.Camera centerCoordinate={initialCenter} zoomLevel={12} />
        {eventPins.map((pin) => (
          <MapLibreGL.PointAnnotation key={pin.id} id={pin.id} coordinate={pin.coordinate}>
            <View style={[styles.marker, { backgroundColor: pin.color }]}>
              <Text style={styles.markerText}>{pin.label}</Text>
            </View>
          </MapLibreGL.PointAnnotation>
        ))}
      </MapLibreGL.MapView>
      <Pressable style={styles.profileButton} onPress={() => setShowProfileEditor(true)}>
        <Text style={styles.profileButtonText}>Profile</Text>
      </Pressable>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authContainer: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  profileContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#dc2626',
    marginBottom: 8,
  },
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interestInput: {
    flex: 1,
    marginBottom: 0,
  },
  interestList: {
    paddingVertical: 12,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  tagText: {
    color: '#3730a3',
    fontWeight: '600',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontWeight: '700',
  },
  profileButton: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  profileButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
