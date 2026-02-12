import { StatusBar } from "expo-status-bar";
import { Pressable, Text, TextInput, View } from "react-native";
import { styles } from "../styles";
import type { AuthMode } from "../types";

type AuthScreenProps = {
  authMode: AuthMode;
  email: string;
  password: string;
  errorMessage: string;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: () => void;
  onToggleMode: () => void;
};

export const AuthScreen = ({
  authMode,
  email,
  password,
  errorMessage,
  onChangeEmail,
  onChangePassword,
  onSubmit,
  onToggleMode,
}: AuthScreenProps) => {
  return (
    <View style={styles.authContainer}>
      <Text style={styles.title}>
        {authMode === "login" ? "Welcome Back" : "Create Account"}
      </Text>
      <Text style={styles.subtitle}>
        {authMode === "login"
          ? "Log in to continue."
          : "Sign up to access the map."}
      </Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#9ca3af"
        style={styles.input}
        value={email}
        onChangeText={onChangeEmail}
      />
      <TextInput
        placeholder="Password (min 8 chars)"
        placeholderTextColor="#9ca3af"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={onChangePassword}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Pressable style={styles.primaryButton} onPress={onSubmit}>
        <Text style={styles.primaryButtonText}>
          {authMode === "login" ? "Log In" : "Sign Up"}
        </Text>
      </Pressable>
      <Pressable style={styles.linkButton} onPress={onToggleMode}>
        <Text style={styles.linkText}>
          {authMode === "login"
            ? "Need an account? Sign up."
            : "Have an account? Log in."}
        </Text>
      </Pressable>
      <StatusBar style="dark" />
    </View>
  );
};
