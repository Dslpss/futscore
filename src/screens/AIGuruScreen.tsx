import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Send, ChevronLeft, Bot, User, Sparkles } from "lucide-react-native";
import { CONFIG } from "../constants/config";
import Markdown from "react-native-markdown-display";
import { useAuth } from "../context/AuthContext";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}



export const AIGuruScreen = ({ navigation }: any) => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content:
        "Olá! Sou o **Guru do Futebol** 🤖⚽\n\nPosso analisar jogos, comparar estatísticas, prever resultados ou apenas bater um papo sobre o mundo da bola.\n\n**Pergunte-me qualquer coisa!**",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      // Build history for backend context
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content,
        }));

      const response = await fetch(`${CONFIG.BACKEND_URL}/api/ai-predictions/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMsg.content,
          history,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: data.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        
        if (data.usage) {
          setUsageInfo(data.usage);
        }
      } else {
        throw new Error(data.error || "Falha na resposta");
      }
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Desculpe, tive um problema técnico. Tente novamente!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [messages]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAi,
        ]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={["#a855f7", "#7c3aed"]}
              style={styles.avatarGradient}>
              <Bot size={20} color="#fff" />
            </LinearGradient>
          </View>
        )}
        
        <LinearGradient
          colors={
            isUser ? ["#22c55e", "#16a34a"] : ["#27272a", "#18181b"]
          }
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAi,
          ]}>
          {isUser ? (
            <Text style={styles.userText}>{item.content}</Text>
          ) : (
            <Markdown
              style={{
                body: { color: "#e4e4e7", fontSize: 15, lineHeight: 22 },
                heading1: {
                  fontSize: 20,
                  fontWeight: "bold",
                  color: "#fff",
                  marginVertical: 10,
                },
                heading2: {
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#fff",
                  marginVertical: 8,
                },
                heading3: {
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#fff",
                  marginVertical: 6,
                },
                strong: { fontWeight: "bold", color: "#fff" },
                em: { fontStyle: "italic", color: "#d4d4d8" },
                link: { color: "#a855f7", textDecorationLine: "underline" },
                blockquote: {
                  borderLeftWidth: 4,
                  borderLeftColor: "#a855f7",
                  paddingLeft: 10,
                  marginVertical: 8,
                  backgroundColor: "rgba(168, 85, 247, 0.1)",
                  padding: 8,
                  borderRadius: 4,
                },
                code_inline: {
                  backgroundColor: "#3f3f46",
                  borderRadius: 4,
                  paddingHorizontal: 4,
                  color: "#e4e4e7",
                  fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                },
                code_block: {
                  backgroundColor: "#27272a",
                  padding: 10,
                  borderRadius: 8,
                  marginVertical: 8,
                  borderWidth: 1,
                  borderColor: "#3f3f46",
                },
                fence: {
                  backgroundColor: "#27272a",
                  padding: 10,
                  borderRadius: 8,
                  marginVertical: 8,
                  borderWidth: 1,
                  borderColor: "#3f3f46",
                },
                list_item: { marginVertical: 4 },
                bullet_list: { marginVertical: 8 },
                ordered_list: { marginVertical: 8 },
                hr: {
                  backgroundColor: "#3f3f46",
                  height: 1,
                  marginVertical: 12,
                },
                table: { borderWidth: 1, borderColor: "#3f3f46", marginVertical: 8 },
                tr: { borderBottomWidth: 1, borderColor: "#3f3f46" },
                th: {
                  padding: 8,
                  fontWeight: "bold",
                  color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.05)",
                },
                td: { padding: 8, color: "#e4e4e7" },
              }}>
              {item.content}
            </Markdown>
          )}
          <Text style={[styles.timestamp, isUser ? { color: "rgba(255,255,255,0.7)" } : {}]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </LinearGradient>

        {isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={["#3f3f46", "#27272a"]}
              style={styles.avatarGradient}>
              <User size={20} color="#a1a1aa" />
            </LinearGradient>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#09090b", "#18181b"]}
        style={styles.background}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView />
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Home");
              }
            }}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Guru do Futebol</Text>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}>
        
        {/* Chat Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        />

        {/* Usage Info Badge */}
        {usageInfo && (
          <View style={styles.usageBadgeContainer}>
            <LinearGradient
              colors={["rgba(168, 85, 247, 0.2)", "rgba(168, 85, 247, 0.1)"]}
              style={styles.usageBadge}>
              <Sparkles size={12} color="#a855f7" />
              <Text style={styles.usageText}>
                {usageInfo.remaining} perguntas restantes hoje
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Pergunte sobre jogos, estatísticas..."
            placeholderTextColor="#71717a"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            disabled={!inputText.trim() || loading}
            onPress={sendMessage}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 40 : 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 4,
  },
  onlineText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "500",
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAi: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginBottom: 4,
  },
  avatarGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 8,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: "#fff",
    fontSize: 15,
  },
  timestamp: {
    color: "#71717a",
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "rgba(24, 24, 27, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(39, 39, 42, 0.8)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 40,
    color: "#fff",
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#a855f7",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: "#3f3f46",
    opacity: 0.5,
  },
  usageBadgeContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: "center",
  },
  usageBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.2)",
    gap: 6,
  },
  usageText: {
    color: "#e9d5ff",
    fontSize: 12,
    fontWeight: "500",
  },
});
