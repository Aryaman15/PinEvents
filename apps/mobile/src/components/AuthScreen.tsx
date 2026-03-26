import { Pressable, Text, TextInput, View } from 'react-native';
import { AuthMode } from '../types/app';

type Props = {
  authMode: AuthMode;
  email: string;
  password: string;
  signupAvatarUrl: string;
  errorMessage: string;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onChangeSignupAvatarUrl: (v: string) => void;
  onSubmit: () => void;
  onToggleMode: () => void;
};

export function AuthScreen(props: Props) {
  const { authMode, email, password, signupAvatarUrl, errorMessage, onChangeEmail, onChangePassword, onChangeSignupAvatarUrl, onSubmit, onToggleMode } = props;

  return (
    <View className="flex-1 bg-slate-50 px-6 justify-center gap-3">
      <Text className="text-3xl font-bold text-slate-900">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</Text>
      <Text className="text-slate-500 mb-2">{authMode === 'login' ? 'Log in to continue.' : 'Sign up to access the map.'}</Text>
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={onChangeEmail} />
      <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3" placeholder="Password" secureTextEntry value={password} onChangeText={onChangePassword} />
      {authMode === 'signup' && (
        <TextInput
          className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          placeholder="Profile picture URL (optional)"
          value={signupAvatarUrl}
          onChangeText={onChangeSignupAvatarUrl}
          autoCapitalize="none"
        />
      )}
      {!!errorMessage && <Text className="text-red-600">{errorMessage}</Text>}
      <Pressable className="bg-blue-600 rounded-xl px-4 py-3" onPress={onSubmit}><Text className="text-white text-center font-semibold">{authMode === 'login' ? 'Log In' : 'Sign Up'}</Text></Pressable>
      <Pressable onPress={onToggleMode}><Text className="text-blue-600 text-center">{authMode === 'login' ? 'Need an account? Sign up.' : 'Have an account? Log in.'}</Text></Pressable>
    </View>
  );
}
