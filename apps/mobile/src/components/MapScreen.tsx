import MapLibreGL from "@maplibre/maplibre-react-native";
import type { FeatureCollection, Point } from "geojson";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { markerColorExpression } from "../constants";
import { styles } from "../styles";

type MapScreenProps = {
  mapStyleUrl: string;
  centerCoordinate: [number, number];
  eventFeatures: FeatureCollection<Point>;
  selectedEventId: string | null;
  onEventPress: (event: MapLibreGL.OnPressEvent) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchCategory: string;
  showSearchCategoryMenu: boolean;
  onToggleSearchCategoryMenu: () => void;
  onCategorySelect: (category: string) => void;
  onSearchClear: () => void;
  availableCategories: string[];
  onOpenProfile: () => void;
  onCreateEvent: () => void;
  isLocationUnavailable: boolean;
  onDemoArea: () => void;
  isLoadingEvents: boolean;
  bottomSheet: ReactNode;
};

export const MapScreen = ({
  mapStyleUrl,
  centerCoordinate,
  eventFeatures,
  selectedEventId,
  onEventPress,
  searchQuery,
  onSearchQueryChange,
  searchCategory,
  showSearchCategoryMenu,
  onToggleSearchCategoryMenu,
  onCategorySelect,
  onSearchClear,
  availableCategories,
  onOpenProfile,
  onCreateEvent,
  isLocationUnavailable,
  onDemoArea,
  isLoadingEvents,
  bottomSheet,
}: MapScreenProps) => {
  return (
    <View style={styles.container}>
      <MapLibreGL.MapView style={styles.map} mapStyle={mapStyleUrl}>
        <MapLibreGL.Camera centerCoordinate={centerCoordinate} zoomLevel={12} />
        <MapLibreGL.ShapeSource
          id="events"
          shape={eventFeatures}
          onPress={onEventPress}
        >
          <MapLibreGL.CircleLayer
            id="event-halo"
            style={{
              circleColor: markerColorExpression,
              circleRadius: [
                "interpolate",
                ["linear"],
                ["zoom"],
                8,
                10,
                12,
                16,
                16,
                22,
              ],
              circleBlur: 1,
              circleOpacity: 0.35,
            }}
          />
          <MapLibreGL.CircleLayer
            id="event-core"
            style={{
              circleColor: markerColorExpression,
              circleRadius: [
                "interpolate",
                ["linear"],
                ["zoom"],
                8,
                [
                  "case",
                  ["==", ["get", "id"], selectedEventId ?? ""],
                  7,
                  5,
                ],
                12,
                ["case", ["==", ["get", "id"], selectedEventId ?? ""], 10, 7],
                16,
                ["case", ["==", ["get", "id"], selectedEventId ?? ""], 14, 10],
              ],
              circleStrokeColor: "#ffffff",
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
            onChangeText={onSearchQueryChange}
          />
          <Pressable style={styles.categoryButton} onPress={onToggleSearchCategoryMenu}>
            <Text style={styles.categoryButtonText}>
              {searchCategory || "Category"}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onSearchClear}>
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
                    onPress={() => onCategorySelect(category)}
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
      <Pressable style={styles.profileButton} onPress={onOpenProfile}>
        <Text style={styles.profileButtonText}>Profile</Text>
      </Pressable>
      <Pressable style={styles.createEventButton} onPress={onCreateEvent}>
        <Text style={styles.createEventButtonText}>Create</Text>
      </Pressable>
      {isLocationUnavailable ? (
        <Pressable style={styles.demoAreaButton} onPress={onDemoArea}>
          <Text style={styles.demoAreaButtonText}>Demo Area</Text>
        </Pressable>
      ) : null}
      <View style={styles.attributionContainer}>
        <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
      </View>
      {bottomSheet}
      {isLoadingEvents ? (
        <View style={styles.loadingEventsBadge}>
          <Text style={styles.loadingEventsText}>Loading events...</Text>
        </View>
      ) : null}
      <StatusBar style="light" />
    </View>
  );
};
