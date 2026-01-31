import { StatusBar } from 'expo-status-bar';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await SecureStore.getItemAsync(tokenKey);
      setAuthToken(storedToken);
      setIsLoading(false);
    };

    loadToken().catch(() => {
      setIsLoading(false);
    });
  }, []);

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
    } catch (error) {
      setErrorMessage('Unable to reach the server.');
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
