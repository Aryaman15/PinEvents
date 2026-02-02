import { StatusBar } from 'expo-status-bar';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';

MapLibreGL.setAccessToken('');

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
const mapStyleUrl =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ??
  'https://demotiles.maplibre.org/styles/osm-bright-gl-style/style.json';
const initialCenter: [number, number] = [-122.4194, 37.7749];
const tokenKey = 'authToken';

const markerColorExpression = [
  'case',
  ['get', 'isPrivate'],
  '#9b51e0',
  '#2f80ed',
] as const;

type AuthMode = 'login' | 'signup';
type EventPrivacy = 'public' | 'private';

type Profile = {
  id: string;
  displayName: string;
  bio: string;
  interests: string[];
  avatarUrl: string;
};

type EventPin = {
  id: string;
  title: string;
  description: string;
  category: string;
  type: EventPrivacy;
  startTime: string;
  endTime: string;
  createdAt: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  redactedLocation?: { type: 'Point'; coordinates: [number, number] };
};

type ViewerInfo = {
  isMember: boolean;
  role: 'admin' | 'member' | null;
  status: 'accepted' | null;
  joinRequestStatus: 'pending' | 'approved' | 'rejected' | null;
};

type EventDetail = EventPin & {
  viewer?: ViewerInfo;
};

type JoinRequest = {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

type EventMessage = {
  id: string;
  eventId: string;
  text: string;
  createdAt: string;
  displayName: string;
  isMine?: boolean;
};

type EventDraft = {
  title: string;
  description: string;
  category: string;
  type: EventPrivacy;
  startTime: string;
  endTime: string;
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
  const [centerCoordinate, setCenterCoordinate] = useState<[number, number]>(initialCenter);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Profile>(emptyProfile);
  const [interestInput, setInterestInput] = useState('');
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventDetail, setSelectedEventDetail] = useState<EventDetail | null>(null);
  const [selectedEventRequests, setSelectedEventRequests] = useState<JoinRequest[]>([]);
  const [isLoadingEventDetail, setIsLoadingEventDetail] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isSubmittingJoinRequest, setIsSubmittingJoinRequest] = useState(false);
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [chatEventId, setChatEventId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<EventMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [events, setEvents] = useState<EventPin[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [showSearchCategoryMenu, setShowSearchCategoryMenu] = useState(false);
  const [showCreateCategoryMenu, setShowCreateCategoryMenu] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [eventLocation, setEventLocation] = useState<[number, number] | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [eventDraft, setEventDraft] = useState<EventDraft>({
    title: '',
    description: '',
    category: '',
    type: 'public',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  const socketRef = useRef<Socket | null>(null);

  const needsProfileSetup = useMemo(() => {
    return Boolean(authToken && profile && !profile.displayName.trim());
  }, [authToken, profile]);

  const availableCategories = useMemo(() => {
    const eventCategories = events
      .map((event) => event.category)
      .filter((category) => category.trim().length > 0);
    return Array.from(new Set([...eventCategories, ...customCategories])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [events, customCategories]);

  const eventFeatures = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: events.map((event) => {
        const coordinates =
          event.location?.coordinates ?? event.redactedLocation?.coordinates ?? initialCenter;
        return {
          type: 'Feature',
          id: event.id,
          properties: {
            id: event.id,
            isPrivate: event.type === 'private',
          },
          geometry: {
            type: 'Point',
            coordinates,
          },
        };
      }),
    } as const;
  }, [events]);

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

  useEffect(() => {
    if (!authToken) {
      return;
    }

    const loadLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({});
      setCenterCoordinate([currentPosition.coords.longitude, currentPosition.coords.latitude]);
    };

    loadLocation().catch(() => {
      // Keep default center if location fails.
    });
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    loadEvents(authToken, centerCoordinate, searchQuery, searchCategory).catch(() => {
      // Errors are handled in loadEvents.
    });
  }, [authToken, centerCoordinate, searchQuery, searchCategory]);

  useEffect(() => {
    if (!authToken || !selectedEventId) {
      setSelectedEventDetail(null);
      setSelectedEventRequests([]);
      return;
    }

    const loadEventDetail = async () => {
      if (!apiUrl) {
        setErrorMessage('EXPO_PUBLIC_API_URL is not set.');
        return;
      }

      setIsLoadingEventDetail(true);
      try {
        const response = await fetch(`${apiUrl}/events/${selectedEventId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          setErrorMessage('Unable to load event details.');
          return;
        }

        const data = (await response.json()) as { event?: EventDetail };
        setSelectedEventDetail(data.event ?? null);
      } catch (error) {
        setErrorMessage('Unable to reach the server.');
      } finally {
        setIsLoadingEventDetail(false);
      }
    };

    loadEventDetail().catch(() => {
      setIsLoadingEventDetail(false);
    });
  }, [authToken, selectedEventId]);

  useEffect(() => {
    if (!selectedEventDetail?.viewer || selectedEventDetail.viewer.role !== 'admin') {
      setSelectedEventRequests([]);
      return;
    }

    loadJoinRequests(selectedEventDetail.id).catch(() => {
      setIsLoadingRequests(false);
    });
  }, [selectedEventDetail?.id, selectedEventDetail?.viewer?.role]);

  useEffect(() => {
    if (!showChatScreen || !authToken || !chatEventId || !apiUrl) {
      return;
    }

    const socket = io(apiUrl, { auth: { token: authToken } });
    socketRef.current = socket;

    socket.on('message', (message: EventMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    socket.emit('join', chatEventId, (response: { ok?: boolean; error?: string }) => {
      if (response?.error) {
        setErrorMessage(response.error);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [showChatScreen, authToken, chatEventId]);

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

  const loadEvents = async (
    token: string,
    coordinate: [number, number],
    query = '',
    category = ''
  ) => {
    if (!apiUrl) {
      setErrorMessage('EXPO_PUBLIC_API_URL is not set.');
      return;
    }

    setIsLoadingEvents(true);
    try {
      const params = new URLSearchParams({
        lat: String(coordinate[1]),
        lng: String(coordinate[0]),
        radiusKm: '5',
      });
      if (query.trim()) {
        params.set('q', query.trim());
      }
      if (category.trim()) {
        params.set('category', category.trim());
      }
      const response = await fetch(
        `${apiUrl}/events/near?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        setErrorMessage('Unable to load nearby events.');
        return;
      }

      const data = (await response.json()) as { events?: EventPin[] };
      setEvents(data.events ?? []);
    } catch (error) {
      setErrorMessage('Unable to reach the server.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleCreateEvent = async () => {
    setErrorMessage('');
    if (!authToken) {
      return;
    }
    if (!apiUrl) {
      setErrorMessage('EXPO_PUBLIC_API_URL is not set.');
      return;
    }

    try {
      const finalCategory = newCategoryInput.trim() || eventDraft.category.trim();
      if (!finalCategory) {
        setErrorMessage('Please choose a category.');
        return;
      }
      if (
        finalCategory &&
        !availableCategories.some((category) => category.toLowerCase() === finalCategory.toLowerCase())
      ) {
        setCustomCategories((prev) => [...prev, finalCategory]);
      }
      const response = await fetch(`${apiUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: eventDraft.title,
          description: eventDraft.description,
          category: finalCategory,
          type: eventDraft.type,
          startTime: eventDraft.startTime,
          endTime: eventDraft.endTime,
          location: {
            type: 'Point',
            coordinates: eventLocation ?? centerCoordinate,
          },
        }),
      });

      if (!response.ok) {
        setErrorMessage('Unable to create event.');
        return;
      }

      setShowCreateEvent(false);
      setEventLocation(null);
      setNewCategoryInput('');
      await loadEvents(authToken, centerCoordinate);
    } catch (error) {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setSearchCategory('');
    setShowSearchCategoryMenu(false);
  };

  const handleCategorySelect = (category: string) => {
    setSearchCategory(category);
    setShowSearchCategoryMenu(false);
  };

  const loadEventMessages = async (eventId: string) => {
    if (!authToken) {
      return;
    }
    if (!apiUrl) {
      setErrorMessage('EXPO_PUBLIC_API_URL is not set.');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/events/${eventId}/messages`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        setErrorMessage('Unable to load chat history.');
        return;
      }

      const data = (await response.json()) as { messages?: EventMessage[] };
      setChatMessages(data.messages ?? []);
    } catch (error) {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const handleOpenChat = () => {
    if (!selectedEventDetail) {
      return;
    }
    setChatEventId(selectedEventDetail.id);
    setShowChatScreen(true);
    loadEventMessages(selectedEventDetail.id).catch(() => {
      // Errors handled in loadEventMessages.
    });
  };

  const handleSendMessage = () => {
    if (!chatDraft.trim() || !chatEventId) {
      return;
    }
    socketRef.current?.emit('message', { eventId: chatEventId, text: chatDraft });
    setChatDraft('');
  };

  const handleRequestJoin = async () => {
    if (!authToken || !selectedEventDetail) {
      return;
    }
    if (!apiUrl) {
      setErrorMessage('EXPO_PUBLIC_API_URL is not set.');
      return;
    }

    setIsSubmittingJoinRequest(true);
    try {
      const response = await fetch(`${apiUrl}/events/${selectedEventDetail.id}/request-join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        setErrorMessage('Unable to request access.');
        return;
      }

      const data = (await response.json()) as { joinRequest?: { status?: string } };
      setSelectedEventDetail((prev) =>
        prev
          ? {
              ...prev,
              viewer: {
                ...prev.viewer,
                joinRequestStatus: (data.joinRequest?.status as ViewerInfo['joinRequestStatus']) ??
                  'pending',
              },
            }
          : prev
      );
    } catch (error) {
      setErrorMessage('Unable to reach the server.');
    } finally {
      setIsSubmittingJoinRequest(false);
    }
  };

  async function loadJoinRequests(eventId: string) {
    if (!authToken) {
      return;
    }
    if (!apiUrl) {
      setErrorMessage('EXPO_PUBLIC_API_URL is not set.');
      return;
    }

    setIsLoadingRequests(true);
    try {
      const response = await fetch(`${apiUrl}/events/${eventId}/requests`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { requests?: JoinRequest[] };
      setSelectedEventRequests(data.requests ?? []);
    } catch (error) {
      setErrorMessage('Unable to reach the server.');
    } finally {
      setIsLoadingRequests(false);
    }
  }

  const handleRequestDecision = async (requestId: string, action: 'approve' | 'reject') => {
    if (!authToken || !selectedEventDetail) {
      return;
    }
    if (!apiUrl) {
      setErrorMessage('EXPO_PUBLIC_API_URL is not set.');
      return;
    }

    try {
      const response = await fetch(
        `${apiUrl}/events/${selectedEventDetail.id}/requests/${requestId}/${action}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        setErrorMessage('Unable to update request.');
        return;
      }

      setSelectedEventRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? { ...request, status: action === 'approve' ? 'approved' : 'rejected' }
            : request
        )
      );
    } catch (error) {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync(tokenKey);
    setAuthToken(null);
    setProfile(null);
    setProfileDraft(emptyProfile);
    setShowProfileEditor(false);
    setShowProfileScreen(false);
    setSelectedEventId(null);
    setSelectedEventDetail(null);
    setSelectedEventRequests([]);
    setShowCreateEvent(false);
    setShowChatScreen(false);
    setChatEventId(null);
    setChatMessages([]);
    setChatDraft('');
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

  const handleEventPress = (event: MapLibreGL.OnPressEvent) => {
    const feature = event.features?.[0];
    const eventId = feature?.properties?.id as string | undefined;
    if (!eventId) {
      return;
    }

    console.log(`Pressed event ${eventId}`);
    setSelectedEventId(eventId);
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
      <ScrollView contentContainerStyle={styles.profileContainer}>
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
        <View style={styles.tagWrap}>
          {profileDraft.interests.map((item) => (
            <Pressable key={item} style={styles.tag} onPress={() => handleRemoveInterest(item)}>
              <Text style={styles.tagText}>{item} ✕</Text>
            </Pressable>
          ))}
        </View>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Pressable style={styles.primaryButton} onPress={handleSaveProfile}>
          <Text style={styles.primaryButtonText}>Save profile</Text>
        </Pressable>
        {!needsProfileSetup ? (
          <Pressable style={styles.linkButton} onPress={() => setShowProfileEditor(false)}>
            <Text style={styles.linkText}>Back to profile</Text>
          </Pressable>
        ) : null}
        <StatusBar style="dark" />
      </ScrollView>
    );
  }

  if (profile && showProfileScreen && !showProfileEditor) {
    return (
      <ScrollView contentContainerStyle={styles.profileContainer}>
        <Text style={styles.title}>Your profile</Text>
        <Text style={styles.profileValue}>{profile.displayName || 'No display name set'}</Text>
        {profile.bio ? <Text style={styles.profileBio}>{profile.bio}</Text> : null}
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
        <Pressable style={styles.primaryButton} onPress={() => setShowProfileEditor(true)}>
          <Text style={styles.primaryButtonText}>Edit profile</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </Pressable>
        <Pressable style={styles.linkButton} onPress={() => setShowProfileScreen(false)}>
          <Text style={styles.linkText}>Back to map</Text>
        </Pressable>
        <StatusBar style="dark" />
      </ScrollView>
    );
  }

  if (showCreateEvent) {
    return (
      <ScrollView contentContainerStyle={styles.profileContainer}>
        <Text style={styles.title}>Create event</Text>
        <Text style={styles.subtitle}>Share what is happening around you.</Text>
        <TextInput
          placeholder="Title"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={eventDraft.title}
          onChangeText={(value) => setEventDraft((prev) => ({ ...prev, title: value }))}
        />
        <TextInput
          placeholder="Description"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.textArea]}
          value={eventDraft.description}
          onChangeText={(value) => setEventDraft((prev) => ({ ...prev, description: value }))}
          multiline
        />
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryRow}>
          <Pressable
            style={styles.categoryButton}
            onPress={() => setShowCreateCategoryMenu((prev) => !prev)}
          >
            <Text style={styles.categoryButtonText}>
              {eventDraft.category || 'Select category'}
            </Text>
          </Pressable>
          <TextInput
            placeholder="Or add new"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.categoryInput]}
            value={newCategoryInput}
            onChangeText={setNewCategoryInput}
          />
        </View>
        {showCreateCategoryMenu ? (
          <View style={styles.categoryMenu}>
            <ScrollView>
              {availableCategories.length ? (
                availableCategories.map((category) => (
                  <Pressable
                    key={category}
                    style={styles.categoryOption}
                    onPress={() => {
                      setEventDraft((prev) => ({ ...prev, category }));
                      setNewCategoryInput('');
                      setShowCreateCategoryMenu(false);
                    }}
                  >
                    <Text style={styles.categoryOptionText}>{category}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.bottomSheetMeta}>No categories yet.</Text>
              )}
            </ScrollView>
          </View>
        ) : null}
        <View style={styles.privacyRow}>
          <Pressable
            style={[
              styles.privacyToggle,
              eventDraft.type === 'public' && styles.privacyToggleActive,
            ]}
            onPress={() => setEventDraft((prev) => ({ ...prev, type: 'public' }))}
          >
            <Text
              style={[
                styles.privacyToggleText,
                eventDraft.type === 'public' && styles.privacyToggleTextActive,
              ]}
            >
              Public
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.privacyToggle,
              eventDraft.type === 'private' && styles.privacyToggleActive,
            ]}
            onPress={() => setEventDraft((prev) => ({ ...prev, type: 'private' }))}
          >
            <Text
              style={[
                styles.privacyToggleText,
                eventDraft.type === 'private' && styles.privacyToggleTextActive,
              ]}
            >
              Private
            </Text>
          </Pressable>
        </View>
        <TextInput
          placeholder="Start time (ISO)"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={eventDraft.startTime}
          onChangeText={(value) => setEventDraft((prev) => ({ ...prev, startTime: value }))}
        />
        <TextInput
          placeholder="End time (ISO)"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={eventDraft.endTime}
          onChangeText={(value) => setEventDraft((prev) => ({ ...prev, endTime: value }))}
        />
        <Text style={styles.sectionTitle}>Event location</Text>
        <Text style={styles.bottomSheetMeta}>Zoom and tap to drop the event pin.</Text>
        <View style={styles.createMapWrapper}>
          <MapLibreGL.MapView
            style={styles.createMap}
            mapStyle={mapStyleUrl}
            onPress={(event) => {
              const coordinates = event.geometry?.coordinates as [number, number] | undefined;
              if (coordinates) {
                setEventLocation([coordinates[0], coordinates[1]]);
              }
            }}
          >
            <MapLibreGL.Camera
              centerCoordinate={eventLocation ?? centerCoordinate}
              zoomLevel={13}
            />
            {eventLocation ? (
              <MapLibreGL.PointAnnotation
                id="event-location"
                coordinate={eventLocation}
              />
            ) : null}
          </MapLibreGL.MapView>
        </View>
        {eventLocation ? (
          <Text style={styles.bottomSheetMeta}>
            Selected: {eventLocation[1].toFixed(4)}, {eventLocation[0].toFixed(4)}
          </Text>
        ) : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Pressable style={styles.primaryButton} onPress={handleCreateEvent}>
          <Text style={styles.primaryButtonText}>Create event</Text>
        </Pressable>
        <Pressable style={styles.linkButton} onPress={() => setShowCreateEvent(false)}>
          <Text style={styles.linkText}>Back to map</Text>
        </Pressable>
        <StatusBar style="dark" />
      </ScrollView>
    );
  }

  if (showChatScreen && chatEventId) {
    return (
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>Event Chat</Text>
          <Pressable style={styles.linkButton} onPress={() => setShowChatScreen(false)}>
            <Text style={styles.linkText}>Back</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.chatMessages}>
          {chatMessages.map((message) => (
            <View key={message.id} style={styles.chatMessage}>
              <Text style={styles.chatDisplayName}>{message.displayName || 'Member'}</Text>
              <Text style={styles.chatText}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.chatInputRow}>
          <TextInput
            placeholder="Write a message"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.chatInput]}
            value={chatDraft}
            onChangeText={setChatDraft}
          />
          <Pressable style={styles.primaryButton} onPress={handleSendMessage}>
            <Text style={styles.primaryButtonText}>Send</Text>
          </Pressable>
        </View>
        <StatusBar style="dark" />
      </View>
    );
  }

  const selectedEvent = selectedEventDetail ??
    (selectedEventId ? events.find((event) => event.id === selectedEventId) : null);

  const canRequestJoin =
    selectedEvent?.type === 'private' &&
    !selectedEventDetail?.viewer?.isMember &&
    selectedEventDetail?.viewer?.joinRequestStatus !== 'pending';

  const isJoinPending = selectedEventDetail?.viewer?.joinRequestStatus === 'pending';
  const isAdmin = selectedEventDetail?.viewer?.role === 'admin';
  const canOpenChat = selectedEventDetail?.viewer?.isMember ?? false;

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView style={styles.map} mapStyle="https://api.maptiler.com/maps/streets-v4/style.json?key=UkfGJIzJRTu4ZQq0bmN7">
        <MapLibreGL.Camera centerCoordinate={centerCoordinate} zoomLevel={12} />
        <MapLibreGL.ShapeSource id="events" shape={eventFeatures} onPress={handleEventPress}>
          <MapLibreGL.CircleLayer
            id="event-icons"
            style={{
              circleColor: markerColorExpression,
              circleRadius: 8,
              circleStrokeColor: '#ffffff',
              circleStrokeWidth: 2,
            }}
          />
        </MapLibreGL.ShapeSource>
      </MapLibreGL.MapView>
      <View style={styles.searchBar}>
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search activities"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.searchInput]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Pressable
            style={styles.categoryButton}
            onPress={() => setShowSearchCategoryMenu((prev) => !prev)}
          >
            <Text style={styles.categoryButtonText}>
              {searchCategory || 'Category'}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleSearchClear}>
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </Pressable>
        </View>
        {showSearchCategoryMenu ? (
          <View style={styles.categoryMenu}>
            <ScrollView>
              {availableCategories.length ? (
                availableCategories.map((category) => (
                  <Pressable
                    key={category}
                    style={styles.categoryOption}
                    onPress={() => handleCategorySelect(category)}
                  >
                    <Text style={styles.categoryOptionText}>{category}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.bottomSheetMeta}>No categories yet.</Text>
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
      <Pressable style={styles.profileButton} onPress={() => setShowProfileScreen(true)}>
        <Text style={styles.profileButtonText}>Profile</Text>
      </Pressable>
      <Pressable style={styles.createEventButton} onPress={() => setShowCreateEvent(true)}>
        <Text style={styles.createEventButtonText}>Create</Text>
      </Pressable>
      <View style={styles.attributionContainer}>
        <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
      </View>
      {selectedEventId ? (
        <View style={styles.bottomSheet}>
          <Text style={styles.bottomSheetTitle}>
            {selectedEvent?.title ?? 'Event Details'}
          </Text>
          <Text style={styles.bottomSheetText}>
            {selectedEvent?.description ?? 'Tap a pin to view details.'}
          </Text>
          <Text style={styles.bottomSheetMeta}>
            {selectedEvent ? `${selectedEvent.category} • ${selectedEvent.type}` : ''}
          </Text>
          {isLoadingEventDetail ? (
            <Text style={styles.bottomSheetMeta}>Loading details...</Text>
          ) : null}
          {selectedEventDetail?.location ? (
            <Text style={styles.bottomSheetMeta}>
              Location: {selectedEventDetail.location.coordinates[1].toFixed(4)},{' '}
              {selectedEventDetail.location.coordinates[0].toFixed(4)}
            </Text>
          ) : selectedEvent?.type === 'private' ? (
            <Text style={styles.bottomSheetMeta}>Exact location hidden until approved.</Text>
          ) : null}
          {selectedEvent?.type === 'private' && canOpenChat ? (
            <Pressable style={styles.primaryButton} onPress={handleOpenChat}>
              <Text style={styles.primaryButtonText}>Open Chat</Text>
            </Pressable>
          ) : null}
          {canRequestJoin ? (
            <Pressable
              style={styles.primaryButton}
              onPress={handleRequestJoin}
              disabled={isSubmittingJoinRequest}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmittingJoinRequest ? 'Requesting...' : 'Request to Join'}
              </Text>
            </Pressable>
          ) : null}
          {isJoinPending ? (
            <Text style={styles.bottomSheetMeta}>Join request pending approval.</Text>
          ) : null}
          {isAdmin ? (
            <View style={styles.adminPanel}>
              <Text style={styles.sectionTitle}>Join requests</Text>
              {isLoadingRequests ? (
                <Text style={styles.bottomSheetMeta}>Loading requests...</Text>
              ) : null}
              {selectedEventRequests.length ? (
                selectedEventRequests.map((request) => (
                  <View key={request.id} style={styles.requestRow}>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestText}>{request.userId}</Text>
                      <Text style={styles.requestStatus}>{request.status}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => handleRequestDecision(request.id, 'approve')}
                        disabled={request.status !== 'pending'}
                      >
                        <Text style={styles.secondaryButtonText}>Approve</Text>
                      </Pressable>
                      <Pressable
                        style={styles.rejectButton}
                        onPress={() => handleRequestDecision(request.id, 'reject')}
                        disabled={request.status !== 'pending'}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.bottomSheetMeta}>No join requests yet.</Text>
              )}
            </View>
          ) : null}
          <Pressable style={styles.secondaryButton} onPress={() => setSelectedEventId(null)}>
            <Text style={styles.secondaryButtonText}>Close</Text>
          </Pressable>
        </View>
      ) : null}
      {isLoadingEvents ? (
        <View style={styles.loadingEventsBadge}>
          <Text style={styles.loadingEventsText}>Loading events...</Text>
        </View>
      ) : null}
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
    flexGrow: 1,
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
    paddingVertical: 10,
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
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  logoutButtonText: {
    color: '#fff',
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
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#3730a3',
    fontWeight: '600',
  },
  profileValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0f172a',
  },
  mutedText: {
    color: '#64748b',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchBar: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
    paddingVertical: 8,
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryInput: {
    flex: 1,
    marginBottom: 0,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButtonText: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryMenu: {
    marginTop: 8,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 8,
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#0f172a',
  },
  createMapWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    marginBottom: 12,
  },
  createMap: {
    flex: 1,
  },
  attributionContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  attributionText: {
    fontSize: 12,
    color: '#1e293b',
  },
  profileButton: {
    position: 'absolute',
    top: 140,
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
  createEventButton: {
    position: 'absolute',
    top: 140,
    left: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createEventButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  bottomSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0f172a',
  },
  bottomSheetText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  bottomSheetMeta: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  chatMessages: {
    paddingBottom: 16,
  },
  chatMessage: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  chatDisplayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  chatText: {
    fontSize: 14,
    color: '#0f172a',
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    marginBottom: 0,
  },
  adminPanel: {
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  requestRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  requestInfo: {
    gap: 4,
  },
  requestText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  requestStatus: {
    fontSize: 12,
    color: '#64748b',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingEventsBadge: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  loadingEventsText: {
    color: '#fff',
    fontSize: 12,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  privacyToggle: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  privacyToggleActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#6366f1',
  },
  privacyToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  privacyToggleTextActive: {
    color: '#3730a3',
  },
});
