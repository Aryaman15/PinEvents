import MapLibreGL from "@maplibre/maplibre-react-native";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Share, View } from "react-native";
import { io, Socket } from "socket.io-client";
import type { FeatureCollection, Point, Feature } from "geojson";
import { AuthScreen } from "./src/components/AuthScreen";
import { ProfileEditorScreen } from "./src/components/ProfileEditorScreen";
import { ProfileScreen } from "./src/components/ProfileScreen";
import { CreateEventScreen } from "./src/components/CreateEventScreen";
import { ChatScreen } from "./src/components/ChatScreen";
import { EventBottomSheet } from "./src/components/EventBottomSheet";
import { MapScreen } from "./src/components/MapScreen";
import { initialCenter, tokenKey } from "./src/constants";
import { styles } from "./src/styles";
import {
  formatDateTime,
  setDatePart,
  setTimePart,
} from "./src/utils/dateTime";
import type {
  AuthMode,
  EventDetail,
  EventDraft,
  EventMessage,
  EventPin,
  JoinRequest,
  Profile,
  ViewerInfo,
} from "./src/types";

// MapLibreGL.setAccessToken('');

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const mapStyleUrl = process.env.EXPO_PUBLIC_MAP_STYLE_URL_2;

if (!apiUrl) {
  throw new Error("Missing EXPO_PUBLIC_API_URL in .env");
}

if (!mapStyleUrl) {
  throw new Error("Missing EXPO_PUBLIC_MAP_STYLE_URL_2 in .env");
}

const emptyProfile: Profile = {
  id: "",
  displayName: "",
  bio: "",
  interests: [],
  avatarUrl: "",
};

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [centerCoordinate, setCenterCoordinate] =
    useState<[number, number]>(initialCenter);
  const [isLocationUnavailable, setIsLocationUnavailable] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Profile>(emptyProfile);
  const [interestInput, setInterestInput] = useState("");
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventDetail, setSelectedEventDetail] =
    useState<EventDetail | null>(null);
  const [selectedEventRequests, setSelectedEventRequests] = useState<
    JoinRequest[]
  >([]);
  const [isLoadingEventDetail, setIsLoadingEventDetail] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isSubmittingJoinRequest, setIsSubmittingJoinRequest] = useState(false);
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [chatEventId, setChatEventId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<EventMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [events, setEvents] = useState<EventPin[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [showSearchCategoryMenu, setShowSearchCategoryMenu] = useState(false);
  const [showCreateCategoryMenu, setShowCreateCategoryMenu] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [eventLocation, setEventLocation] = useState<[number, number] | null>(
    null,
  );
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [eventDraft, setEventDraft] = useState<EventDraft>({
    title: "",
    description: "",
    category: "",
    type: "public",
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
    return Array.from(new Set([...eventCategories, ...customCategories])).sort(
      (a, b) => a.localeCompare(b),
    );
  }, [events, customCategories]);

  const eventFeatures = useMemo<FeatureCollection<Point>>(() => {
    return {
      type: "FeatureCollection",
      features: events.map((event): Feature<Point> => {
        const coordinates =
          event.location?.coordinates ??
          event.redactedLocation?.coordinates ??
          initialCenter;

        return {
          type: "Feature",
          id: event.id,
          properties: {
            id: event.id,
            isPrivate: event.type === "private",
          },
          geometry: {
            type: "Point",
            coordinates,
          },
        };
      }),
    };
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
      if (status !== "granted") {
        setIsLocationUnavailable(true);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      setCenterCoordinate([
        currentPosition.coords.longitude,
        currentPosition.coords.latitude,
      ]);
      setIsLocationUnavailable(false);
    };

    loadLocation().catch(() => {
      setIsLocationUnavailable(true);
    });
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    loadEvents(authToken, centerCoordinate, searchQuery, searchCategory).catch(
      () => {
        // Errors are handled in loadEvents.
      },
    );
  }, [authToken, centerCoordinate, searchQuery, searchCategory]);

  useEffect(() => {
    if (!authToken || !selectedEventId) {
      setSelectedEventDetail(null);
      setSelectedEventRequests([]);
      return;
    }

    const loadEventDetail = async () => {
      setIsLoadingEventDetail(true);
      try {
        const response = await fetch(`${apiUrl}/events/${selectedEventId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          setErrorMessage("Unable to load event details.");
          return;
        }

        const data = (await response.json()) as { event?: EventDetail };
        setSelectedEventDetail(data.event ?? null);
      } catch (error) {
        setErrorMessage("Unable to reach the server.");
      } finally {
        setIsLoadingEventDetail(false);
      }
    };

    loadEventDetail().catch(() => {
      setIsLoadingEventDetail(false);
    });
  }, [authToken, selectedEventId]);

  useEffect(() => {
    if (
      !selectedEventDetail?.viewer ||
      selectedEventDetail.viewer.role !== "admin"
    ) {
      setSelectedEventRequests([]);
      return;
    }

    loadJoinRequests(selectedEventDetail.id).catch(() => {
      setIsLoadingRequests(false);
    });
  }, [selectedEventDetail?.id, selectedEventDetail?.viewer?.role]);

  useEffect(() => {
    if (!showChatScreen || !authToken || !chatEventId || !apiUrl) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(apiUrl, { auth: { token: authToken } });
    socketRef.current = socket;

    socket.on("message", (message: EventMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    socket.emit(
      "join",
      chatEventId,
      (response: { ok?: boolean; error?: string }) => {
        if (response?.error) {
          setErrorMessage(response.error);
        }
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [showChatScreen, authToken, chatEventId]);

  const loadProfile = async (token: string) => {
    try {
      const response = await fetch(`${apiUrl}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setErrorMessage("Session expired. Please log in again.");
        await handleLogout();
        return;
      }

      if (!response.ok) {
        setErrorMessage("Unable to load profile.");
        return;
      }

      const data = (await response.json()) as { user?: Profile };
      if (!data.user) {
        setErrorMessage("Profile response is missing.");
        return;
      }

      setProfile(data.user);
      setProfileDraft(data.user);
    } catch (error) {
      setErrorMessage("Unable to reach the server.");
    }
  };

  const handleOpenProfile = () => {
    if (authToken && !profile) {
      loadProfile(authToken).catch(() => {
        // Errors handled in loadProfile.
      });
    }
    setShowProfileScreen(true);
  };

  const handleAuth = async () => {
    setErrorMessage("");

    try {
      const response = await fetch(`${apiUrl}/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setErrorMessage("Authentication failed. Please check your details.");
        return;
      }

      const data = (await response.json()) as { token?: string };
      if (!data.token) {
        setErrorMessage("Missing token in response.");
        return;
      }

      await SecureStore.setItemAsync(tokenKey, data.token);
      setAuthToken(data.token);
      await loadProfile(data.token);
    } catch (error) {
      setErrorMessage("Unable to reach the server.");
    }
  };

  const handleSaveProfile = async () => {
    setErrorMessage("");
    if (!authToken) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          displayName: profileDraft.displayName,
          bio: profileDraft.bio,
          interests: profileDraft.interests,
          avatarUrl: profileDraft.avatarUrl,
        }),
      });

      if (response.status === 401) {
        setErrorMessage("Session expired. Please log in again.");
        await handleLogout();
        return;
      }

      if (!response.ok) {
        setErrorMessage("Unable to save profile.");
        return;
      }

      const data = (await response.json()) as { user?: Profile };
      if (!data.user) {
        setErrorMessage("Profile response is missing.");
        return;
      }

      setProfile(data.user);
      setProfileDraft(data.user);
      setShowProfileEditor(false);
    } catch (error) {
      setErrorMessage("Unable to reach the server.");
    }
  };

  const loadEvents = async (
    token: string,
    coordinate: [number, number],
    query = "",
    category = "",
  ) => {
    setIsLoadingEvents(true);
    try {
      const params = new URLSearchParams({
        lat: String(coordinate[1]),
        lng: String(coordinate[0]),
        radiusKm: "5",
      });
      if (query.trim()) {
        params.set("q", query.trim());
      }
      if (category.trim()) {
        params.set("category", category.trim());
      }
      const response = await fetch(
        `${apiUrl}/events/near?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        setErrorMessage("Unable to load nearby events.");
        return;
      }

      const data = (await response.json()) as { events?: EventPin[] };
      setEvents(data.events ?? []);
    } catch (error) {
      setErrorMessage("Unable to reach the server.");
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleCreateEvent = async () => {
    setErrorMessage("");
    if (!authToken) {
      return;
    }

    if (!eventDraft.title.trim()) {
      setErrorMessage("Title is required");
      return;
    }

    if (!eventDraft.description.trim()) {
      setErrorMessage("Description is required");
      return;
    }

    try {
      const finalCategory =
        newCategoryInput.trim() || eventDraft.category.trim();
      if (!finalCategory) {
        setErrorMessage("Please choose a category.");
        return;
      }
      if (
        finalCategory &&
        !availableCategories.some(
          (category) => category.toLowerCase() === finalCategory.toLowerCase(),
        )
      ) {
        setCustomCategories((prev) => [...prev, finalCategory]);
      }
      const response = await fetch(`${apiUrl}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
            type: "Point",
            coordinates: eventLocation ?? centerCoordinate,
          },
        }),
      });

      if (response.status === 401) {
        setErrorMessage("Session expired. Please log in again.");
        await handleLogout();
        return;
      }

      if (!response.ok) {
        setErrorMessage("Unable to create event.");
        return;
      }

      setShowCreateEvent(false);
      setEventLocation(null);
      setNewCategoryInput("");
      await loadEvents(authToken, centerCoordinate);
    } catch (error) {
      setErrorMessage("Unable to reach the server.");
    }
  };

  useEffect(() => {
    if (!showCreateEvent) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setShowCreateEvent(false);
        return true;
      },
    );

    return () => subscription.remove();
  }, [showCreateEvent]);

  const handleSearchClear = () => {
    setSearchQuery("");
    setSearchCategory("");
    setShowSearchCategoryMenu(false);
  };

  const handleDemoArea = () => {
    setCenterCoordinate(initialCenter);
    setIsLocationUnavailable(false);
  };

  const handleCategorySelect = (category: string) => {
    setSearchCategory(category);
    setShowSearchCategoryMenu(false);
  };

  const loadEventMessages = async (eventId: string) => {
    if (!authToken) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/events/${eventId}/messages`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        setErrorMessage("Unable to load chat history.");
        return;
      }

      const data = (await response.json()) as { messages?: EventMessage[] };
      setChatMessages(data.messages ?? []);
    } catch (error) {
      setErrorMessage("Unable to reach the server.");
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
    socketRef.current?.emit("message", {
      eventId: chatEventId,
      text: chatDraft,
    });
    setChatDraft("");
  };

  const handleRequestJoin = async () => {
    if (!authToken || !selectedEventDetail) {
      return;
    }

    setIsSubmittingJoinRequest(true);

    try {
      const response = await fetch(
        `${apiUrl}/events/${selectedEventDetail.id}/request-join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!response.ok) {
        setErrorMessage("Unable to request access.");
        return;
      }

      const data = (await response.json()) as {
        joinRequest?: { status?: string };
      };

      setSelectedEventDetail((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          viewer: {
            isMember: prev.viewer?.isMember ?? false,
            role: prev.viewer?.role ?? null,
            status: prev.viewer?.status ?? null,
            joinRequestStatus:
              (data.joinRequest?.status as ViewerInfo["joinRequestStatus"]) ??
              "pending",
          },
        };
      });
    } catch (error) {
      setErrorMessage("Unable to reach the server.");
    } finally {
      setIsSubmittingJoinRequest(false);
    }
  };

  async function loadJoinRequests(eventId: string) {
    if (!authToken) {
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
      setErrorMessage("Unable to reach the server.");
    } finally {
      setIsLoadingRequests(false);
    }
  }

  const handleRequestDecision = async (
    requestId: string,
    action: "approve" | "reject",
  ) => {
    if (!authToken || !selectedEventDetail) {
      return;
    }

    try {
      const response = await fetch(
        `${apiUrl}/events/${selectedEventDetail.id}/requests/${requestId}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!response.ok) {
        setErrorMessage("Unable to update request.");
        return;
      }

      setSelectedEventRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: action === "approve" ? "approved" : "rejected",
              }
            : request,
        ),
      );
    } catch (error) {
      setErrorMessage("Unable to reach the server.");
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
    setChatDraft("");
  };

  const handleAddInterest = () => {
    const trimmed = interestInput.trim();
    if (!trimmed || profileDraft.interests.includes(trimmed)) {
      setInterestInput("");
      return;
    }

    setProfileDraft((prev) => ({
      ...prev,
      interests: [...prev.interests, trimmed],
    }));
    setInterestInput("");
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

  const handleShareEvent = async (eventToShare: EventPin | EventDetail) => {
    const message = [
      eventToShare.title,
      eventToShare.description,
      `Category: ${eventToShare.category}`,
      `Type: ${eventToShare.type}`,
      `Starts: ${formatDateTime(eventToShare.startTime)}`,
      `Ends: ${formatDateTime(eventToShare.endTime)}`,
    ].join("\n");

    try {
      await Share.share({ message });
    } catch (error) {
      setErrorMessage("Unable to share event.");
    }
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
      <AuthScreen
        authMode={authMode}
        email={email}
        password={password}
        errorMessage={errorMessage}
        onChangeEmail={setEmail}
        onChangePassword={setPassword}
        onSubmit={handleAuth}
        onToggleMode={() =>
          setAuthMode(authMode === "login" ? "signup" : "login")
        }
      />
    );
  }

  if (needsProfileSetup || showProfileEditor) {
    return (
      <ProfileEditorScreen
        needsProfileSetup={needsProfileSetup}
        profileDraft={profileDraft}
        interestInput={interestInput}
        errorMessage={errorMessage}
        onChangeDisplayName={(value) =>
          setProfileDraft((prev) => ({ ...prev, displayName: value }))
        }
        onChangeBio={(value) =>
          setProfileDraft((prev) => ({ ...prev, bio: value }))
        }
        onChangeAvatarUrl={(value) =>
          setProfileDraft((prev) => ({ ...prev, avatarUrl: value }))
        }
        onChangeInterestInput={setInterestInput}
        onAddInterest={handleAddInterest}
        onRemoveInterest={handleRemoveInterest}
        onSaveProfile={handleSaveProfile}
        onBack={() => setShowProfileEditor(false)}
      />
    );
  }

  if (profile && showProfileScreen && !showProfileEditor) {
    return (
      <ProfileScreen
        profile={profile}
        onEditProfile={() => setShowProfileEditor(true)}
        onLogout={handleLogout}
        onBack={() => setShowProfileScreen(false)}
      />
    );
  }

  if (showCreateEvent) {
    return (
      <CreateEventScreen
        eventDraft={eventDraft}
        availableCategories={availableCategories}
        showCreateCategoryMenu={showCreateCategoryMenu}
        newCategoryInput={newCategoryInput}
        eventLocation={eventLocation}
        centerCoordinate={centerCoordinate}
        mapStyleUrl={mapStyleUrl}
        errorMessage={errorMessage}
        onChangeTitle={(value) =>
          setEventDraft((prev) => ({ ...prev, title: value }))
        }
        onChangeDescription={(value) =>
          setEventDraft((prev) => ({ ...prev, description: value }))
        }
        onToggleCategoryMenu={() =>
          setShowCreateCategoryMenu((prev) => !prev)
        }
        onSelectCategory={(category) => {
          setEventDraft((prev) => ({ ...prev, category }));
          setNewCategoryInput("");
          setShowCreateCategoryMenu(false);
        }}
        onChangeNewCategory={setNewCategoryInput}
        onChangePrivacy={(value) =>
          setEventDraft((prev) => ({ ...prev, type: value }))
        }
        onChangeStartDate={(value) =>
          setEventDraft((prev) => ({
            ...prev,
            startTime: setDatePart(prev.startTime, value),
          }))
        }
        onChangeStartTime={(value) =>
          setEventDraft((prev) => ({
            ...prev,
            startTime: setTimePart(prev.startTime, value),
          }))
        }
        onChangeEndDate={(value) =>
          setEventDraft((prev) => ({
            ...prev,
            endTime: setDatePart(prev.endTime, value),
          }))
        }
        onChangeEndTime={(value) =>
          setEventDraft((prev) => ({
            ...prev,
            endTime: setTimePart(prev.endTime, value),
          }))
        }
        onMapPress={setEventLocation}
        onCreateEvent={handleCreateEvent}
        onBack={() => setShowCreateEvent(false)}
      />
    );
  }

  if (showChatScreen && chatEventId) {
    return (
      <ChatScreen
        chatMessages={chatMessages}
        chatDraft={chatDraft}
        onChangeChatDraft={setChatDraft}
        onSendMessage={handleSendMessage}
        onBack={() => setShowChatScreen(false)}
      />
    );
  }

  const selectedEvent =
    selectedEventDetail ??
    (selectedEventId
      ? events.find((event) => event.id === selectedEventId)
      : null);

  const canRequestJoin =
    selectedEvent?.type === "private" &&
    !selectedEventDetail?.viewer?.isMember &&
    selectedEventDetail?.viewer?.joinRequestStatus !== "pending";

  const isJoinPending =
    selectedEventDetail?.viewer?.joinRequestStatus === "pending";
  const isAdmin = selectedEventDetail?.viewer?.role === "admin";
  const canOpenChat = selectedEventDetail?.viewer?.isMember ?? false;

  return (
    <MapScreen
      mapStyleUrl={mapStyleUrl}
      centerCoordinate={centerCoordinate}
      eventFeatures={eventFeatures}
      selectedEventId={selectedEventId}
      onEventPress={handleEventPress}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      searchCategory={searchCategory}
      showSearchCategoryMenu={showSearchCategoryMenu}
      onToggleSearchCategoryMenu={() =>
        setShowSearchCategoryMenu((prev) => !prev)
      }
      onCategorySelect={handleCategorySelect}
      onSearchClear={handleSearchClear}
      availableCategories={availableCategories}
      onOpenProfile={handleOpenProfile}
      onCreateEvent={() => setShowCreateEvent(true)}
      isLocationUnavailable={isLocationUnavailable}
      onDemoArea={handleDemoArea}
      isLoadingEvents={isLoadingEvents}
      bottomSheet={
        <EventBottomSheet
          selectedEventId={selectedEventId}
          selectedEvent={selectedEvent}
          selectedEventDetail={selectedEventDetail}
          isLoadingEventDetail={isLoadingEventDetail}
          isLoadingRequests={isLoadingRequests}
          isSubmittingJoinRequest={isSubmittingJoinRequest}
          canOpenChat={canOpenChat}
          canRequestJoin={canRequestJoin}
          isJoinPending={isJoinPending}
          isAdmin={isAdmin}
          selectedEventRequests={selectedEventRequests}
          onOpenChat={handleOpenChat}
          onShareEvent={handleShareEvent}
          onRequestJoin={handleRequestJoin}
          onRequestDecision={handleRequestDecision}
          onClose={() => setSelectedEventId(null)}
        />
      }
    />
  );
}
