import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../styles";
import type { EventMessage } from "../types";

type ChatScreenProps = {
  chatMessages: EventMessage[];
  chatDraft: string;
  onChangeChatDraft: (value: string) => void;
  onSendMessage: () => void;
  onBack: () => void;
};

export const ChatScreen = ({
  chatMessages,
  chatDraft,
  onChangeChatDraft,
  onSendMessage,
  onBack,
}: ChatScreenProps) => {
  return (
    <View style={styles.chatContainer}>
      <View style={styles.chatHeader}>
        <Text style={styles.chatTitle}>Event Chat</Text>
        <Pressable style={styles.linkButton} onPress={onBack}>
          <Text style={styles.linkText}>Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.chatMessages}>
        {chatMessages.map((message) => (
          <View key={message.id} style={styles.chatMessage}>
            <Text style={styles.chatDisplayName}>
              {message.displayName || "Member"}
            </Text>
            <Text style={styles.chatText}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.chatInputRow}>
        <TextInput
          placeholder="Write a message"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.chatInput]}
          value={chatDraft}
          onChangeText={onChangeChatDraft}
        />
        <Pressable style={styles.primaryButton} onPress={onSendMessage}>
          <Text style={styles.primaryButtonText}>Send</Text>
        </Pressable>
      </View>
      <StatusBar style="dark" />
    </View>
  );
};
