import { Pressable, Text, View } from "react-native";
import { styles } from "../styles";
import type { EventDetail, EventPin, JoinRequest } from "../types";

type EventBottomSheetProps = {
  selectedEventId: string | null;
  selectedEvent: EventPin | EventDetail | null;
  selectedEventDetail: EventDetail | null;
  isLoadingEventDetail: boolean;
  isLoadingRequests: boolean;
  isSubmittingJoinRequest: boolean;
  canOpenChat: boolean;
  canRequestJoin: boolean;
  isJoinPending: boolean;
  isAdmin: boolean;
  selectedEventRequests: JoinRequest[];
  onOpenChat: () => void;
  onShareEvent: (eventToShare: EventPin | EventDetail) => void;
  onRequestJoin: () => void;
  onRequestDecision: (requestId: string, action: "approve" | "reject") => void;
  onClose: () => void;
};

export const EventBottomSheet = ({
  selectedEventId,
  selectedEvent,
  selectedEventDetail,
  isLoadingEventDetail,
  isLoadingRequests,
  isSubmittingJoinRequest,
  canOpenChat,
  canRequestJoin,
  isJoinPending,
  isAdmin,
  selectedEventRequests,
  onOpenChat,
  onShareEvent,
  onRequestJoin,
  onRequestDecision,
  onClose,
}: EventBottomSheetProps) => {
  if (!selectedEventId) {
    return null;
  }

  return (
    <View style={styles.bottomSheet}>
      <Text style={styles.bottomSheetTitle}>
        {selectedEvent?.title ?? "Event Details"}
      </Text>
      <Text style={styles.bottomSheetText}>
        {selectedEvent?.description ?? "Tap a pin to view details."}
      </Text>
      <Text style={styles.bottomSheetMeta}>
        {selectedEvent ? `${selectedEvent.category} • ${selectedEvent.type}` : ""}
      </Text>
      {isLoadingEventDetail ? (
        <Text style={styles.bottomSheetMeta}>Loading details...</Text>
      ) : null}
      {selectedEventDetail?.location ? (
        <Text style={styles.bottomSheetMeta}>
          Location: {selectedEventDetail.location.coordinates[1].toFixed(4)},
          {" "}
          {selectedEventDetail.location.coordinates[0].toFixed(4)}
        </Text>
      ) : selectedEvent?.type === "private" ? (
        <Text style={styles.bottomSheetMeta}>
          Exact location hidden until approved.
        </Text>
      ) : null}
      {selectedEvent?.type === "private" && canOpenChat ? (
        <Pressable style={styles.primaryButton} onPress={onOpenChat}>
          <Text style={styles.primaryButtonText}>Open Chat</Text>
        </Pressable>
      ) : null}
      {selectedEvent ? (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => onShareEvent(selectedEvent)}
        >
          <Text style={styles.secondaryButtonText}>Share</Text>
        </Pressable>
      ) : null}
      {canRequestJoin ? (
        <Pressable
          style={styles.primaryButton}
          onPress={onRequestJoin}
          disabled={isSubmittingJoinRequest}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmittingJoinRequest ? "Requesting..." : "Request to Join"}
          </Text>
        </Pressable>
      ) : null}
      {isJoinPending ? (
        <Text style={styles.bottomSheetMeta}>
          Join request pending approval.
        </Text>
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
                    onPress={() => onRequestDecision(request.id, "approve")}
                    disabled={request.status !== "pending"}
                  >
                    <Text style={styles.secondaryButtonText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={styles.rejectButton}
                    onPress={() => onRequestDecision(request.id, "reject")}
                    disabled={request.status !== "pending"}
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
      <Pressable style={styles.secondaryButton} onPress={onClose}>
        <Text style={styles.secondaryButtonText}>Close</Text>
      </Pressable>
    </View>
  );
};
