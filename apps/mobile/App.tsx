import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'Not set';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EventPins</Text>
      <Text style={styles.subtitle}>API URL: {apiUrl}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
  },
});
