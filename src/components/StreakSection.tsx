import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame,
  Shield,
  Zap,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { CONFIG } from "../constants/config";

export interface Streak {
  matchIndex: number;
  matchId: string;
  team: string;
  type: "fire" | "shield" | "alert";
  title: string;
  subtitle: string;
  startTime: string;
}

interface StreakSectionProps {
  onPressMatch?: (matchId: string) => void;
}

export const StreakSection: React.FC<StreakSectionProps> = ({ onPressMatch }) => {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreaks();
  }, []);

  const fetchStreaks = async () => {
    try {
      setLoading(true);
      const output = await fetch(`${CONFIG.BACKEND_URL}/api/ai-predictions/streaks`);
      const data = await output.json();
      if (data.success && data.streaks) {
        setStreaks(data.streaks);
      }
    } catch (error) {
      console.error("Erro fetching streaks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null; // Não mostra loading pra não poluir, só aparece quando tiver dado
  if (streaks.length === 0) return null;

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "fire":
        return {
          icon: <Flame size={16} color="#ef4444" fill="#ef4444" />,
          colors: ["#2d1212", "#1a0d0d"],
          border: "#7f1d1d",
          text: "#fca5a5"
        };
      case "shield":
        return {
          icon: <Shield size={16} color="#3b82f6" fill="#3b82f6" />,
          colors: ["#0f1c2e", "#0a101a"],
          border: "#1e3a8a",
          text: "#93c5fd"
        };
      default:
        return {
          icon: <Zap size={16} color="#eab308" fill="#eab308" />,
          colors: ["#2d240f", "#1a160a"],
          border: "#713f12",
          text: "#fde047"
        };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TrendingUp size={16} color="#fbbf24" />
          <Text style={styles.title}>Streak Hunter 🔥</Text>
        </View>
        <Text style={styles.subtitle}>Sequências vao quebrar hoje?</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {streaks.map((streak, index) => {
          const config = getTypeConfig(streak.type);
          return (
            <TouchableOpacity 
              key={index}
              activeOpacity={0.8}
              onPress={() => onPressMatch?.(streak.matchId)}
            >
              <LinearGradient
                colors={config.colors as any}
                style={[styles.card, { borderColor: config.border }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    {config.icon}
                  </View>
                  <Text style={[styles.teamName, { color: config.text }]}>
                    {streak.team}
                  </Text>
                </View>
                
                <Text style={styles.streakTitle}>{streak.title}</Text>
                <Text style={styles.streakSubtitle}>{streak.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  subtitle: {
    color: '#71717a',
    fontSize: 12,
    marginLeft: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 200,
    height: 110,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  streakTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  streakSubtitle: {
    color: '#a1a1aa',
    fontSize: 11,
    lineHeight: 14,
  },
});
