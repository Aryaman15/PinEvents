import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Share,
  View,
} from "react-native";
import { io, Socket } from "socket.io-client";
import type { Feature, FeatureCollection, Point } from "geojson";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { AuthScreen } from "./src/components/AuthScreen";
import { CreateEventScreen } from "./src/components/CreateEventScreen";
import { MapHomeScreen } from "./src/components/MapHomeScreen";
import { ProfileEditorScreen } from "./src/components/ProfileEditorScreen";
import { ProfileScreen } from "./src/components/ProfileScreen";
import {
  AuthMode,
  EventDetail,
  EventDraft,
  EventMessage,
  EventPin,
  JoinRequest,
  Profile,
  ViewerInfo,
} from "./src/types/app";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const mapStyleUrl = process.env.EXPO_PUBLIC_MAP_STYLE_URL_2;
const initialCenter: [number, number] = [-122.4194, 37.7749];
const tokenKey = "authToken";

if (!apiUrl) throw new Error("Missing EXPO_PUBLIC_API_URL in .env");
if (!mapStyleUrl)
  throw new Error("Missing EXPO_PUBLIC_MAP_STYLE_URL_2 in .env");

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
  const [profileDraft, setProfileDraft] = useState<Profile>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [interestInput, setInterestInput] = useState("");

  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);

  const [centerCoordinate, setCenterCoordinate] =
    useState<[number, number]>(initialCenter);
  const [events, setEvents] = useState<EventPin[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventDetail, setSelectedEventDetail] =
    useState<EventDetail | null>(null);
  const [selectedEventRequests, setSelectedEventRequests] = useState<
    JoinRequest[]
  >([]);
  const [isSubmittingJoinRequest, setIsSubmittingJoinRequest] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const [chatEventId, setChatEventId] = useState<string | null>(null);
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<EventMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");

  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [createCoordinate, setCreateCoordinate] =
    useState<[number, number]>(initialCenter);
  const [eventDraft, setEventDraft] = useState<EventDraft>({
    title: "",
    description: "",
    category: "",
    type: "public",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600_000).toISOString(),
    images: [],
  });

  const socketRef = useRef<Socket | null>(null);

  const needsProfileSetup = useMemo(
    () => Boolean(authToken && profile && !profile.displayName.trim()),
    [authToken, profile],
  );

  const availableCategories = useMemo(() => {
    const eventCategories = events
      .map((event) => event.category)
      .filter((c) => c.trim());
    return Array.from(new Set([...eventCategories, ...customCategories])).sort(
      (a, b) => a.localeCompare(b),
    );
  }, [events, customCategories]);

  const eventFeatures = useMemo<FeatureCollection<Point>>(
    () => ({
      type: "FeatureCollection",
      features: events.map(
        (event): Feature<Point> => ({
          type: "Feature",
          id: event.id,
          properties: { id: event.id, isPrivate: event.type === "private" },
          geometry: {
            type: "Point",
            coordinates:
              event.location?.coordinates ??
              event.redactedLocation?.coordinates ??
              initialCenter,
          },
        }),
      ),
    }),
    [events],
  );

  useEffect(() => {
    SecureStore.getItemAsync(tokenKey)
      .then(async (token) => {
        setAuthToken(token);
        if (token) await loadProfile(token);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!authToken) return;
    Location.requestForegroundPermissionsAsync()
      .then(async ({ status }) => {
        if (status !== "granted") return;
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        setCenterCoordinate([
          position.coords.longitude,
          position.coords.latitude,
        ]);
      })
      .catch(() => undefined);
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    loadEvents(authToken, centerCoordinate, searchQuery, searchCategory).catch(
      () => undefined,
    );
  }, [authToken, centerCoordinate, searchQuery, searchCategory]);

  useEffect(() => {
    if (!authToken || !selectedEventId) return;
    fetch(`${apiUrl}/events/${selectedEventId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          setErrorMessage("Session expired. Please log in again.");
          await handleLogout();
          return;
        }
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { event?: EventDetail };
        setSelectedEventDetail(data.event ?? null);
      })
      .catch(() => setErrorMessage("Unable to load event details."));
  }, [authToken, selectedEventId]);

  useEffect(() => {
    if (!showChatScreen || !authToken || !chatEventId) return;
    socketRef.current?.disconnect();
    const socket = io(apiUrl, { auth: { token: authToken } });
    socketRef.current = socket;
    socket.on("connect_error", (error: Error) => {
      const normalizedMessage = error.message.toLowerCase();
      if (normalizedMessage.includes("unauthorized")) {
        setErrorMessage("Session expired. Please log in again.");
        handleLogout().catch(() => undefined);
        return;
      }
      setErrorMessage("Unable to connect to event chat.");
    });
    socket.on("message", (message: EventMessage) =>
      setChatMessages((prev) => [
        ...prev,
        {
          ...message,
          isMine:
            message.isMine ??
            Boolean(profile?.id && message.createdBy === profile.id),
        },
      ]),
    );
    socket.emit("join", chatEventId, (response: { error?: string }) => {
      if (!response?.error) return;
      if (response.error.toLowerCase().includes("unauthorized")) {
        setErrorMessage("Session expired. Please log in again.");
        handleLogout().catch(() => undefined);
        return;
      }
      setErrorMessage(response.error);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [showChatScreen, authToken, chatEventId]);

  useEffect(() => {
    if (!authToken) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (showChatScreen) {
          setShowChatScreen(false);
          return true;
        }
        if (showEventDetails) {
          setShowEventDetails(false);
          return true;
        }
        if (selectedEventId || selectedEventDetail) {
          setSelectedEventId(null);
          setSelectedEventDetail(null);
          return true;
        }
        if (showCreateEvent) {
          setShowCreateEvent(false);
          return true;
        }
        if (showProfileEditor) {
          setShowProfileEditor(false);
          return true;
        }
        if (showProfileScreen) {
          setShowProfileScreen(false);
          return true;
        }

        return false;
      },
    );

    return () => subscription.remove();
  }, [
    authToken,
    showChatScreen,
    showEventDetails,
    selectedEventId,
    selectedEventDetail,
    showCreateEvent,
    showProfileEditor,
    showProfileScreen,
  ]);

  useEffect(() => {
    if (selectedEventDetail?.viewer?.role === "admin") {
      loadJoinRequests(selectedEventDetail.id).catch(() => undefined);
    }
  }, [selectedEventDetail?.id, selectedEventDetail?.viewer?.role]);

  const loadProfile = async (token: string) => {
    try {
      const response = await fetch(`${apiUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        setErrorMessage("Session expired. Please log in again.");
        await handleLogout();
        return false;
      }
      if (!response.ok) {
        setErrorMessage("Unable to load profile. Please log in again.");
        await handleLogout();
        return false;
      }
      const data = (await response.json()) as { user?: Profile };
      if (!data.user) {
        setErrorMessage("Unable to load profile. Please log in again.");
        await handleLogout();
        return false;
      }
      setProfile(data.user);
      setProfileDraft(data.user);
      return true;
    } catch {
      setErrorMessage("Unable to reach the server.");
      return false;
    }
  };

  const handleOpenProfile = async () => {
    if (!authToken) return;
    if (!profile) {
      const loaded = await loadProfile(authToken);
      if (!loaded) return;
    }
    setShowProfileScreen(true);
  };

  const handleAuth = async () => {
    setErrorMessage("");
    const response = await fetch(`${apiUrl}/auth/${authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) return setErrorMessage("Authentication failed.");
    const data = (await response.json()) as { token?: string };
    if (!data.token) return setErrorMessage("Missing token in response.");
    await SecureStore.setItemAsync(tokenKey, data.token);
    setAuthToken(data.token);
    await loadProfile(data.token);
  };

  const handleSaveProfile = async () => {
    if (!authToken) return;
    const response = await fetch(`${apiUrl}/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(profileDraft),
    });
    if (response.status === 401) {
      setErrorMessage("Session expired. Please log in again.");
      await handleLogout();
      return;
    }
    if (!response.ok) return setErrorMessage("Unable to save profile.");
    const data = (await response.json()) as { user?: Profile };
    if (!data.user) return;
    setProfile(data.user);
    setProfileDraft(data.user);
    setShowProfileEditor(false);
  };

  const loadEvents = async (
    token: string,
    coordinate: [number, number],
    query = "",
    category = "",
  ) => {
    setIsLoadingEvents(true);
    const params = new URLSearchParams({
      lat: String(coordinate[1]),
      lng: String(coordinate[0]),
      radiusKm: "5",
    });
    if (query.trim()) params.set("q", query.trim());
    if (category.trim()) params.set("category", category.trim());
    const response = await fetch(`${apiUrl}/events/near?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      setErrorMessage("Session expired. Please log in again.");
      await handleLogout();
      setIsLoadingEvents(false);
      return;
    }
    if (!response.ok) {
      setIsLoadingEvents(false);
      return setErrorMessage("Unable to load nearby events.");
    }
    const data = (await response.json()) as { events?: EventPin[] };
    setEvents(data.events ?? []);
    setIsLoadingEvents(false);
  };

  // const handlePickImages = async () => {
  //   if (!authToken) return;
  //   const remainingSlots = 4 - eventDraft.images.length;
  //   if (remainingSlots <= 0) return;

  //   // let ImagePicker: any;
  //   // try {
  //   //   // eslint-disable-next-line @typescript-eslint/no-var-requires
  //   //   ImagePicker = require("expo-image-picker");
  //   // } catch (err) {
  //   //   console.log("IMAGE PICKER ERROR:", err);
  //   //   setErrorMessage("Image picker failed: " + String(err));
  //   //   return;
  //   // }
  //   // setErrorMessage(
  //   //   "Image picker is unavailable in this dev build. Rebuild the development client after installing expo-image-picker.",
  //   // );

  //   // let result: any;
  //   // try {
  //   //   // const permission =
  //   //   //   await ImagePicker.requestMediaLibraryPermissionsAsync();
  //   //   // if (permission.status !== "granted") {
  //   //   //   if (!permission.canAskAgain) {
  //   //   //     setErrorMessage(
  //   //   //       "Photo access is blocked. Please enable photo access for EventPins in your phone settings.",
  //   //   //     );
  //   //   //     await Linking.openSettings();
  //   //   //     return;
  //   //   //   }

  //   //   //   setErrorMessage("Please allow photo access to upload event images.");
  //   //   //   return;
  //   //   // }

  //   //   result = await ImagePicker.launchImageLibraryAsync({
  //   //     // mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //   //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //   //     quality: 0.8,
  //   //     allowsMultipleSelection: true,
  //   //     selectionLimit: remainingSlots,
  //   //   });
  //   // } catch {
  //   //   setErrorMessage(
  //   //     "Image picker failed to open. Please rebuild your development client and try again.",
  //   //   );
  //   //   return;
  //   // }
  //   let result: any;
  //   const permission = await ImagePicker.getMediaLibraryPermissionsAsync();

  //   if (!permission.granted) {
  //     const ask = await ImagePicker.requestMediaLibraryPermissionsAsync();

  //     if (!ask.granted) {
  //       if (!ask.canAskAgain) {
  //         setErrorMessage(
  //           "Photo access blocked. Please enable it in settings.",
  //         );
  //         await Linking.openSettings();
  //       } else {
  //         setErrorMessage("Photo permission is required to upload images.");
  //       }
  //       return;
  //     }
  //   }

  //   if (result.canceled || !result.assets.length) return;

  //   const formData = new FormData();
  //   result.assets
  //     .slice(0, remainingSlots)
  //     .forEach((asset: any, index: number) => {
  //       const extension = (asset.uri.split(".").pop() || "jpg").toLowerCase();
  //       const type = asset.mimeType || `image/${extension}`;
  //       formData.append("images", {
  //         uri: asset.uri,
  //         name: `event-image-${Date.now()}-${index}.${extension}`,
  //         type,
  //       } as unknown as Blob);
  //     });

  //   setIsUploadingImages(true);
  //   const response = await fetch(`${apiUrl}/events/uploads`, {
  //     method: "POST",
  //     headers: { Authorization: `Bearer ${authToken}` },
  //     body: formData,
  //   });

  //   if (response.status === 401) {
  //     setErrorMessage("Session expired. Please log in again.");
  //     setIsUploadingImages(false);
  //     await handleLogout();
  //     return;
  //   }

  //   if (!response.ok) {
  //     setIsUploadingImages(false);
  //     return setErrorMessage("Unable to upload images.");
  //   }

  //   const data = (await response.json()) as {
  //     images?: { url: string; publicId: string }[];
  //   };

  //   const uploadedImages = data.images ?? [];

  //   setEventDraft((prev) => ({
  //     ...prev,
  //     images: [...prev.images, ...uploadedImages].slice(0, 4),
  //   }));
  //   setIsUploadingImages(false);
  // };
  const handlePickImages = async () => {
    if (!authToken) return;

    const remainingSlots = 4 - eventDraft.images.length;
    if (remainingSlots <= 0) return;

    const currentPermission =
      await ImagePicker.getMediaLibraryPermissionsAsync();

    if (!currentPermission.granted) {
      const ask = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!ask.granted) {
        if (!ask.canAskAgain) {
          setErrorMessage("Photo access blocked. Enable it in settings.");
          await Linking.openSettings();
        } else {
          setErrorMessage("Photo permission is required.");
        }
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
    });

    if (result.canceled || !result.assets?.length) return;

    const formData = new FormData();

    result.assets.forEach((asset: any, index: number) => {
      const extension = (asset.uri.split(".").pop() || "jpg").toLowerCase();
      const type = asset.mimeType || `image/${extension}`;

      formData.append("images", {
        uri: asset.uri,
        name: `event-${Date.now()}-${index}.${extension}`,
        type,
      } as any);
    });

    setIsUploadingImages(true);

    try {
      const response = await fetch(`${apiUrl}/events/uploads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });

      if (!response.ok) {
        setErrorMessage("Upload failed.");
        return;
      }

      const data = await response.json();

      setEventDraft((prev) => ({
        ...prev,
        images: [...prev.images, ...(data.images ?? [])].slice(0, 4),
      }));
    } catch (err) {
      console.log("UPLOAD ERROR:", err);
      setErrorMessage("Upload crashed.");
    } finally {
      setIsUploadingImages(false);
    }
  };
  const handleCreateEvent = async () => {
    if (!authToken) return;
    const finalCategory = newCategoryInput.trim() || eventDraft.category.trim();
    if (!finalCategory) return setErrorMessage("Please choose a category.");

    if (
      !availableCategories.some(
        (c) => c.toLowerCase() === finalCategory.toLowerCase(),
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
        ...eventDraft,
        category: finalCategory,
        location: { type: "Point", coordinates: createCoordinate },
      }),
    });
    if (response.status === 401) {
      setErrorMessage("Session expired. Please log in again.");
      await handleLogout();
      return;
    }
    if (!response.ok) return setErrorMessage("Unable to create event.");
    setShowCreateEvent(false);
    setNewCategoryInput("");
    setEventDraft({
      title: "",
      description: "",
      category: "",
      type: "public",
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600_000).toISOString(),
      images: [],
    });
    setCreateCoordinate(centerCoordinate);
    await loadEvents(authToken, centerCoordinate);
  };

  const handleDeleteEvent = async () => {
    if (!authToken || !selectedEventDetail) return;
    setIsDeletingEvent(true);
    const response = await fetch(`${apiUrl}/events/${selectedEventDetail.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.status === 401) {
      setErrorMessage("Session expired. Please log in again.");
      setIsDeletingEvent(false);
      await handleLogout();
      return;
    }
    if (!response.ok) {
      setIsDeletingEvent(false);
      return setErrorMessage("Unable to delete event.");
    }
    setShowEventDetails(false);
    setSelectedEventId(null);
    setSelectedEventDetail(null);
    setIsDeletingEvent(false);
    await loadEvents(authToken, centerCoordinate, searchQuery, searchCategory);
  };

  const handleRequestJoin = async () => {
    if (!authToken || !selectedEventDetail) return;
    setIsSubmittingJoinRequest(true);
    const response = await fetch(
      `${apiUrl}/events/${selectedEventDetail.id}/join`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
    if (response.status === 401) {
      setErrorMessage("Session expired. Please log in again.");
      setIsSubmittingJoinRequest(false);
      await handleLogout();
      return;
    }
    if (!response.ok) {
      setIsSubmittingJoinRequest(false);
      return setErrorMessage("Unable to request access.");
    }
    const data = (await response.json()) as {
      joinRequest?: { status?: string };
    };
    setSelectedEventDetail((prev) =>
      prev
        ? {
            ...prev,
            viewer: {
              isMember: prev.viewer?.isMember ?? false,
              role: prev.viewer?.role ?? null,
              status: prev.viewer?.status ?? null,
              joinRequestStatus:
                (data.joinRequest?.status as ViewerInfo["joinRequestStatus"]) ??
                "pending",
            },
          }
        : prev,
    );
    setIsSubmittingJoinRequest(false);
  };

  const loadJoinRequests = async (eventId: string) => {
    if (!authToken) return;
    const response = await fetch(`${apiUrl}/events/${eventId}/requests`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.status === 401) {
      setErrorMessage("Session expired. Please log in again.");
      await handleLogout();
      return;
    }
    if (!response.ok) return;
    const data = (await response.json()) as { requests?: JoinRequest[] };
    setSelectedEventRequests(data.requests ?? []);
  };

  //     setSelectedEventRequests((prev) =>
  //       prev.map((request) =>
  //         request.id === requestId
  //           ? {
  //               ...request,
  //               status: action === "approve" ? "approved" : "rejected",
  //             }
  //           : request,
  //       ),
  //     );
  //   } catch (error) {
  //     setErrorMessage("Unable to reach the server.");
  //   }
  // };
  const handleRequestDecision = async (
    requestId: string,
    action: "approved" | "rejected",
  ) => {
    if (!authToken || !selectedEventDetail) return;
    const response = await fetch(
      `${apiUrl}/events/${selectedEventDetail.id}/requests/${requestId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: action }),
      },
    );
    if (response.status === 401) {
      setErrorMessage("Session expired. Please log in again.");
      await handleLogout();
      return;
    }
    if (!response.ok) return setErrorMessage("Unable to update request.");
    setSelectedEventRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, status: action } : request,
      ),
    );
  };

  const loadEventMessages = async (eventId: string) => {
    if (!authToken) return;
    const response = await fetch(`${apiUrl}/events/${eventId}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.status === 401) {
      setErrorMessage("Session expired. Please log in again.");
      await handleLogout();
      return;
    }
    if (!response.ok) return setErrorMessage("Unable to load chat history.");
    const data = (await response.json()) as { messages?: EventMessage[] };
    const normalized = (data.messages ?? []).map((message) => ({
      ...message,
      isMine:
        message.isMine ??
        Boolean(profile?.id && message.createdBy === profile.id),
    }));
    setChatMessages(normalized);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync(tokenKey);
    setAuthToken(null);
    setProfile(null);
    setProfileDraft(emptyProfile);
    setShowProfileEditor(false);
    setShowProfileScreen(false);
    setShowCreateEvent(false);
    setShowEventDetails(false);
    setSelectedEventId(null);
    setSelectedEventDetail(null);
    setSelectedEventRequests([]);
    setShowChatScreen(false);
    setChatEventId(null);
    setChatMessages([]);
    setChatDraft("");
  };

  const handleAddInterest = () => {
    const trimmed = interestInput.trim();
    if (!trimmed || profileDraft.interests.includes(trimmed))
      return setInterestInput("");
    setProfileDraft((prev) => ({
      ...prev,
      interests: [...prev.interests, trimmed],
    }));
    setInterestInput("");
  };

  const handleShareEvent = async (eventToShare: EventPin | EventDetail) => {
    try {
      await Share.share({
        message: `${eventToShare.title}\n${eventToShare.description}\nCategory: ${eventToShare.category}`,
      });
    } catch {
      setErrorMessage("Unable to share event.");
    }
  };

  const handleSendMessage = () => {
    if (!chatDraft.trim() || !chatEventId) return;
    socketRef.current?.emit("message", {
      eventId: chatEventId,
      text: chatDraft,
    });
    setChatDraft("");
  };

  const handleEventPress = (event: MapLibreGL.OnPressEvent) => {
    const eventId = event.features?.[0]?.properties?.id as string | undefined;
    if (eventId) {
      setSelectedEventId(eventId);
      setShowEventDetails(false);
    }
  };

  if (isLoading)
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );

  if (!authToken) {
    return (
      <>
        <AuthScreen
          authMode={authMode}
          email={email}
          password={password}
          errorMessage={errorMessage}
          onChangeEmail={setEmail}
          onChangePassword={setPassword}
          onSubmit={() =>
            handleAuth().catch(() =>
              setErrorMessage("Unable to reach the server."),
            )
          }
          onToggleMode={() =>
            setAuthMode((m) => (m === "login" ? "signup" : "login"))
          }
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (needsProfileSetup || showProfileEditor) {
    return (
      <>
        <ProfileEditorScreen
          draft={profileDraft}
          interestInput={interestInput}
          needsSetup={needsProfileSetup}
          onUpdateDraft={setProfileDraft}
          onInterestInput={setInterestInput}
          onAddInterest={handleAddInterest}
          onRemoveInterest={(interest) =>
            setProfileDraft((prev) => ({
              ...prev,
              interests: prev.interests.filter((i) => i !== interest),
            }))
          }
          onSave={() =>
            handleSaveProfile().catch(() =>
              setErrorMessage("Unable to reach the server."),
            )
          }
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (showProfileScreen && profile) {
    return (
      <>
        <ProfileScreen
          profile={profile}
          onEdit={() => setShowProfileEditor(true)}
          onLogout={() =>
            handleLogout().catch(() => setErrorMessage("Unable to log out."))
          }
          onBack={() => setShowProfileScreen(false)}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (showCreateEvent) {
    return (
      <>
        <CreateEventScreen
          draft={eventDraft}
          categoryInput={newCategoryInput}
          categories={availableCategories}
          isUploadingImages={isUploadingImages}
          mapStyleUrl={mapStyleUrl}
          selectedCoordinate={createCoordinate}
          errorMessage={errorMessage}
          onDraft={setEventDraft}
          onCategoryInput={setNewCategoryInput}
          onSelectCoordinate={setCreateCoordinate}
          onPickImages={() =>
            handlePickImages().catch(() =>
              setErrorMessage("Unable to upload images."),
            )
          }
          onCreate={() =>
            handleCreateEvent().catch(() =>
              setErrorMessage("Unable to reach the server."),
            )
          }
          onBack={() => setShowCreateEvent(false)}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <>
      <MapHomeScreen
        mapStyleUrl={mapStyleUrl}
        centerCoordinate={centerCoordinate}
        eventFeatures={eventFeatures}
        searchQuery={searchQuery}
        searchCategory={searchCategory}
        categories={availableCategories}
        loadingEvents={isLoadingEvents}
        errorMessage={errorMessage}
        selectedEventDetail={selectedEventDetail}
        selectedEventRequests={selectedEventRequests}
        showChatScreen={showChatScreen}
        showEventDetails={showEventDetails}
        chatMessages={chatMessages}
        chatDraft={chatDraft}
        isSubmittingJoinRequest={isSubmittingJoinRequest}
        isDeletingEvent={isDeletingEvent}
        onSearchQuery={setSearchQuery}
        onSearchCategory={setSearchCategory}
        onClearSearch={() => {
          setSearchQuery("");
          setSearchCategory("");
        }}
        onOpenCreate={() => {
          setCreateCoordinate(centerCoordinate);
          setShowCreateEvent(true);
        }}
        onOpenProfile={() =>
          handleOpenProfile().catch(() =>
            setErrorMessage("Unable to load profile."),
          )
        }
        onEventPress={handleEventPress}
        onRequestJoin={() =>
          handleRequestJoin().catch(() =>
            setErrorMessage("Unable to reach the server."),
          )
        }
        onRequestDecision={(requestId, action) =>
          handleRequestDecision(requestId, action).catch(() =>
            setErrorMessage("Unable to reach the server."),
          )
        }
        onOpenChat={() => {
          if (!selectedEventDetail) return;
          setChatEventId(selectedEventDetail.id);
          setShowChatScreen(true);
          loadEventMessages(selectedEventDetail.id).catch(() =>
            setErrorMessage("Unable to reach the server."),
          );
        }}
        onOpenEventDetails={() => setShowEventDetails(true)}
        onCloseEventDetails={() => setShowEventDetails(false)}
        onDeleteEvent={() =>
          handleDeleteEvent().catch(() =>
            setErrorMessage("Unable to delete event."),
          )
        }
        onCloseDetail={() => {
          setSelectedEventId(null);
          setSelectedEventDetail(null);
          setShowEventDetails(false);
        }}
        onShareEvent={(eventToShare) =>
          handleShareEvent(eventToShare).catch(() =>
            setErrorMessage("Unable to share event."),
          )
        }
        onCloseChat={() => setShowChatScreen(false)}
        onChatDraft={setChatDraft}
        onSendMessage={handleSendMessage}
      />
      <StatusBar style="dark" />
    </>
  );
}
