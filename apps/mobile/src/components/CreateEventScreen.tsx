import { StatusBar } from "expo-status-bar";
import MapLibreGL from "@maplibre/maplibre-react-native";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  SafeAreaView,
  View,
} from "react-native";
import { styles } from "../styles";
import type { EventDraft } from "../types";
import { formatDateTime, getDatePart, getTimePart } from "../utils/dateTime";

type CreateEventScreenProps = {
  eventDraft: EventDraft;
  availableCategories: string[];
  showCreateCategoryMenu: boolean;
  newCategoryInput: string;
  eventLocation: [number, number] | null;
  centerCoordinate: [number, number];
  mapStyleUrl: string;
  errorMessage: string;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onToggleCategoryMenu: () => void;
  onSelectCategory: (category: string) => void;
  onChangeNewCategory: (value: string) => void;
  onChangePrivacy: (value: EventDraft["type"]) => void;
  onChangeStartDate: (value: string) => void;
  onChangeStartTime: (value: string) => void;
  onChangeEndDate: (value: string) => void;
  onChangeEndTime: (value: string) => void;
  onMapPress: (coordinates: [number, number]) => void;
  onCreateEvent: () => void;
  onBack: () => void;
};

export const CreateEventScreen = ({
  eventDraft,
  availableCategories,
  showCreateCategoryMenu,
  newCategoryInput,
  eventLocation,
  centerCoordinate,
  mapStyleUrl,
  errorMessage,
  onChangeTitle,
  onChangeDescription,
  onToggleCategoryMenu,
  onSelectCategory,
  onChangeNewCategory,
  onChangePrivacy,
  onChangeStartDate,
  onChangeStartTime,
  onChangeEndDate,
  onChangeEndTime,
  onMapPress,
  onCreateEvent,
  onBack,
}: CreateEventScreenProps) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.profileContainer, styles.safeAreaContent]}
      >
        <Text style={styles.title}>Create event</Text>
        <Text style={styles.subtitle}>Share what is happening around you.</Text>
        <TextInput
          placeholder="Title"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={eventDraft.title}
          onChangeText={onChangeTitle}
        />
        <TextInput
          placeholder="Description"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.textArea]}
          value={eventDraft.description}
          onChangeText={onChangeDescription}
          multiline
        />
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryRow}>
          <Pressable style={styles.categoryButton} onPress={onToggleCategoryMenu}>
            <Text style={styles.categoryButtonText}>
              {eventDraft.category || "Select category"}
            </Text>
          </Pressable>
          <TextInput
            placeholder="Or add new"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.categoryInput]}
            value={newCategoryInput}
            onChangeText={onChangeNewCategory}
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
                    onPress={() => onSelectCategory(category)}
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
              eventDraft.type === "public" && styles.privacyToggleActive,
            ]}
            onPress={() => onChangePrivacy("public")}
          >
            <Text
              style={[
                styles.privacyToggleText,
                eventDraft.type === "public" && styles.privacyToggleTextActive,
              ]}
            >
              Public
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.privacyToggle,
              eventDraft.type === "private" && styles.privacyToggleActive,
            ]}
            onPress={() => onChangePrivacy("private")}
          >
            <Text
              style={[
                styles.privacyToggleText,
                eventDraft.type === "private" && styles.privacyToggleTextActive,
              ]}
            >
              Private
            </Text>
          </Pressable>
        </View>
        <Text style={styles.sectionTitle}>Event timing</Text>
        <View style={styles.timingCard}>
          <Text style={styles.timingLabel}>Start</Text>
          <View style={styles.timingRow}>
            <View style={styles.timingField}>
              <Text style={styles.timingFieldLabel}>Date</Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                style={[styles.input, styles.timingInput]}
                value={getDatePart(eventDraft.startTime)}
                onChangeText={onChangeStartDate}
              />
            </View>
            <View style={styles.timingField}>
              <Text style={styles.timingFieldLabel}>Time</Text>
              <TextInput
                placeholder="HH:MM"
                placeholderTextColor="#9ca3af"
                style={[styles.input, styles.timingInput]}
                value={getTimePart(eventDraft.startTime)}
                onChangeText={onChangeStartTime}
              />
            </View>
          </View>
          <Text style={styles.timingMeta}>
            Current: {formatDateTime(eventDraft.startTime)}
          </Text>
        </View>
        <View style={styles.timingCard}>
          <Text style={styles.timingLabel}>End</Text>
          <View style={styles.timingRow}>
            <View style={styles.timingField}>
              <Text style={styles.timingFieldLabel}>Date</Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                style={[styles.input, styles.timingInput]}
                value={getDatePart(eventDraft.endTime)}
                onChangeText={onChangeEndDate}
              />
            </View>
            <View style={styles.timingField}>
              <Text style={styles.timingFieldLabel}>Time</Text>
              <TextInput
                placeholder="HH:MM"
                placeholderTextColor="#9ca3af"
                style={[styles.input, styles.timingInput]}
                value={getTimePart(eventDraft.endTime)}
                onChangeText={onChangeEndTime}
              />
            </View>
          </View>
          <Text style={styles.timingMeta}>
            Current: {formatDateTime(eventDraft.endTime)}
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Event location</Text>
        <Text style={styles.bottomSheetMeta}>
          Zoom and tap to drop the event pin.
        </Text>
        <View style={styles.createMapWrapper}>
          <MapLibreGL.MapView
            style={styles.createMap}
            mapStyle={mapStyleUrl}
            onPress={(event) => {
              const geometry = event.geometry;

              if (geometry?.type === "Point") {
                const coordinates = geometry.coordinates as [number, number];
                onMapPress([coordinates[0], coordinates[1]]);
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
              >
                <View style={styles.eventMarker} />
              </MapLibreGL.PointAnnotation>
            ) : null}
          </MapLibreGL.MapView>
        </View>
        {eventLocation ? (
          <Text style={styles.bottomSheetMeta}>
            Selected: {eventLocation[1].toFixed(4)}, {eventLocation[0].toFixed(4)}
          </Text>
        ) : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Pressable style={styles.primaryButton} onPress={onCreateEvent}>
          <Text style={styles.primaryButtonText}>Create event</Text>
        </Pressable>
        <Pressable style={styles.linkButton} onPress={onBack}>
          <Text style={styles.linkText}>Back to map</Text>
        </Pressable>
        <StatusBar style="dark" />
      </ScrollView>
    </SafeAreaView>
  );
};
