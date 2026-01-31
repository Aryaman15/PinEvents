import { StatusBar } from 'expo-status-bar';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { StyleSheet, Text, View } from 'react-native';

MapLibreGL.setAccessToken('');

const initialCenter: [number, number] = [-122.4194, 37.7749];

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

export default function App() {
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
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
