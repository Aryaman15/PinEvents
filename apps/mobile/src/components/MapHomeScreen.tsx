import MapLibreGL from '@maplibre/maplibre-react-native';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { FeatureCollection, Point } from 'geojson';
import { EventDetail, EventMessage, EventPin, JoinRequest } from '../types/app';
import { formatDateTime } from '../utils/date';

type Props = {
  mapStyleUrl: string;
  centerCoordinate: [number, number];
  eventFeatures: FeatureCollection<Point>;
  searchQuery: string;
  searchCategory: string;
  categories: string[];
  loadingEvents: boolean;
  errorMessage: string;
  selectedEventDetail: EventDetail | null;
  selectedEventRequests: JoinRequest[];
  showChatScreen: boolean;
  showEventDetails: boolean;
  chatMessages: EventMessage[];
  chatDraft: string;
  isSubmittingJoinRequest: boolean;
  isDeletingEvent: boolean;
  onSearchQuery: (v: string) => void;
  onSearchCategory: (v: string) => void;
  onClearSearch: () => void;
  onOpenCreate: () => void;
  onOpenProfile: () => void;
  onEventPress: (event: MapLibreGL.OnPressEvent) => void;
  onRequestJoin: () => void;
  onRequestDecision: (requestId: string, action: 'approved' | 'rejected') => void;
  onOpenChat: () => void;
  onOpenEventDetails: () => void;
  onCloseEventDetails: () => void;
  onDeleteEvent: () => void;
  onCloseDetail: () => void;
  onShareEvent: (event: EventPin | EventDetail) => void;
  onCloseChat: () => void;
  onChatDraft: (v: string) => void;
  onSendMessage: () => void;
};

export function MapHomeScreen(props: Props) {
  const {
    mapStyleUrl, centerCoordinate, eventFeatures, searchQuery, searchCategory, categories, loadingEvents, errorMessage,
    selectedEventDetail, selectedEventRequests, showChatScreen, showEventDetails, chatMessages, chatDraft, isSubmittingJoinRequest,
    isDeletingEvent, onSearchQuery, onSearchCategory, onClearSearch, onOpenCreate, onOpenProfile, onEventPress, onRequestJoin, onRequestDecision,
    onOpenChat, onOpenEventDetails, onCloseEventDetails, onDeleteEvent, onCloseDetail, onShareEvent, onCloseChat, onChatDraft, onSendMessage,
  } = props;

  return (
    <View className="flex-1 bg-white">
      <MapLibreGL.MapView mapStyle={mapStyleUrl} style={{ flex: 1 }}>
        <MapLibreGL.Camera zoomLevel={12} centerCoordinate={centerCoordinate} />
        <MapLibreGL.ShapeSource id="events" shape={eventFeatures} onPress={onEventPress}>
          <MapLibreGL.CircleLayer id="event-points" style={{ circleRadius: 7, circleColor: ['case', ['get', 'isPrivate'], '#7c3aed', '#2563eb'] }} />
        </MapLibreGL.ShapeSource>
      </MapLibreGL.MapView>

      <View className="absolute top-12 left-4 right-4 bg-white/95 rounded-xl p-3 gap-2">
        <View className="flex-row gap-2">
          <TextInput className="flex-1 rounded-lg border border-slate-300 px-3 py-2" placeholder="Search" value={searchQuery} onChangeText={onSearchQuery} />
          <Pressable className="bg-slate-800 rounded-lg px-3 justify-center" onPress={onClearSearch}><Text className="text-white">Clear</Text></Pressable>
        </View>
        <TextInput className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Category" value={searchCategory} onChangeText={onSearchCategory} />
        {!!categories.length && <Text className="text-xs text-slate-500">Categories: {categories.join(', ')}</Text>}
        {!!errorMessage && <Text className="text-red-600">{errorMessage}</Text>}
      </View>

      <View className="absolute bottom-10 left-4 right-4 flex-row justify-between">
        <Pressable className="bg-blue-600 rounded-xl px-4 py-3" onPress={onOpenCreate}><Text className="text-white font-semibold">Create</Text></Pressable>
        <Pressable className="bg-slate-900 rounded-xl px-4 py-3" onPress={onOpenProfile}><Text className="text-white font-semibold">Profile</Text></Pressable>
      </View>

      {loadingEvents && <View className="absolute inset-0 items-center justify-center"><ActivityIndicator size="large" /></View>}

      {!!selectedEventDetail && !showChatScreen && (
        <View className="absolute bottom-28 left-4 right-4 rounded-xl bg-white p-4 gap-2">
          <Text className="text-lg font-bold">{selectedEventDetail.title}</Text>
          <Text className="text-slate-700" numberOfLines={2}>{selectedEventDetail.description}</Text>
          <Text className="text-slate-500">{selectedEventDetail.category} • {selectedEventDetail.type}</Text>
          <Text className="text-slate-500">{formatDateTime(selectedEventDetail.startTime)} - {formatDateTime(selectedEventDetail.endTime)}</Text>
          <View className="flex-row gap-2 mt-2 flex-wrap">
            <Pressable className="bg-slate-800 rounded-lg px-3 py-2" onPress={onOpenEventDetails}><Text className="text-white">View details</Text></Pressable>
            <Pressable className="bg-slate-800 rounded-lg px-3 py-2" onPress={() => onShareEvent(selectedEventDetail)}><Text className="text-white">Share</Text></Pressable>
            <Pressable className="bg-slate-800 rounded-lg px-3 py-2" onPress={onOpenChat}><Text className="text-white">Chat</Text></Pressable>
            {selectedEventDetail.type === 'private' && !selectedEventDetail.viewer?.isMember && (
              <Pressable className="bg-blue-600 rounded-lg px-3 py-2" onPress={onRequestJoin} disabled={isSubmittingJoinRequest}><Text className="text-white">Request Join</Text></Pressable>
            )}
            <Pressable className="bg-slate-200 rounded-lg px-3 py-2" onPress={onCloseDetail}><Text>Close</Text></Pressable>
          </View>
        </View>
      )}

      {!!selectedEventDetail && showEventDetails && (
        <View className="absolute inset-0 bg-black/50 p-4 pt-16">
          <View className="flex-1 rounded-2xl bg-white p-4">
            <ScrollView contentContainerStyle={{ rowGap: 10 }}>
              <Text className="text-xl font-bold">{selectedEventDetail.title}</Text>
              <Text className="text-slate-600">{selectedEventDetail.category} • {selectedEventDetail.type}</Text>
              <Text className="text-slate-700">{selectedEventDetail.description}</Text>
              <Text className="text-slate-500">Starts: {formatDateTime(selectedEventDetail.startTime)}</Text>
              <Text className="text-slate-500">Ends: {formatDateTime(selectedEventDetail.endTime)}</Text>

              {!!selectedEventDetail.imageUrls?.length && (
                <View className="gap-2">
                  <Text className="font-semibold text-slate-700">Images</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {selectedEventDetail.imageUrls.map((url, index) => (
                      <Image key={`${url}-${index}`} source={{ uri: url }} style={{ width: 240, height: 150, borderRadius: 12 }} resizeMode="cover" />
                    ))}
                  </ScrollView>
                </View>
              )}

              {selectedEventDetail.viewer?.role === 'admin' && (
                <View className="gap-2 mt-2">
                  <Text className="font-semibold">Join Requests</Text>
                  {selectedEventRequests.map((request) => (
                    <View key={request.id} className="flex-row items-center justify-between rounded-lg border border-slate-200 px-2 py-2">
                      <Text className="text-xs">{request.userId} ({request.status})</Text>
                      <View className="flex-row gap-2">
                        <Pressable className="bg-green-600 rounded px-2 py-1" onPress={() => onRequestDecision(request.id, 'approved')}><Text className="text-white text-xs">Approve</Text></Pressable>
                        <Pressable className="bg-red-600 rounded px-2 py-1" onPress={() => onRequestDecision(request.id, 'rejected')}><Text className="text-white text-xs">Reject</Text></Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View className="flex-row gap-2 mt-3">
              <Pressable className="flex-1 rounded-lg bg-slate-900 px-3 py-3" onPress={onCloseEventDetails}><Text className="text-center text-white">Close</Text></Pressable>
              {selectedEventDetail.viewer?.role === 'admin' && (
                <Pressable className="flex-1 rounded-lg bg-red-600 px-3 py-3" onPress={onDeleteEvent} disabled={isDeletingEvent}><Text className="text-center text-white">{isDeletingEvent ? 'Deleting...' : 'Delete event'}</Text></Pressable>
              )}
            </View>
          </View>
        </View>
      )}

      {showChatScreen && (
        <View className="absolute inset-0 bg-white p-4 pt-12">
          <Text className="text-xl font-bold mb-3">Event Chat</Text>
          <ScrollView className="flex-1 mb-3">
            {chatMessages.map((message) => (
              <View key={message.id} className={`mb-2 rounded-lg px-3 py-2 ${message.isMine ? 'bg-blue-100 self-end' : 'bg-slate-100 self-start'}`}>
                <Text className="text-xs text-slate-500">{message.displayName}</Text>
                <Text>{message.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View className="flex-row gap-2">
            <TextInput className="flex-1 rounded-lg border border-slate-300 px-3 py-2" placeholder="Message" value={chatDraft} onChangeText={onChatDraft} />
            <Pressable className="bg-blue-600 rounded-lg px-4 justify-center" onPress={onSendMessage}><Text className="text-white">Send</Text></Pressable>
          </View>
          <Pressable className="mt-3" onPress={onCloseChat}><Text className="text-blue-600 text-center">Close chat</Text></Pressable>
        </View>
      )}
    </View>
  );
}
