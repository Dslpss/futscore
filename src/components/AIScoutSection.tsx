import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Brain,
  TrendingUp,
  TriangleAlert,
  ShieldCheck,
  Flame,
  ChevronRight,
  Target,
} from "lucide-react-native";
import { CONFIG } from "../constants/config";

// Interface for Scout Insight (must match backend)
export interface ScoutInsight {
  type: "zebra" | "seguro" | "gols";
  matchIndex: number;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  reason: string;
  confidence: "high" | "medium";
  odds_estimation?: string;
  league: {
    name: string;
    logo?: string;
  };
  startTime: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

interface AIScoutSectionProps {
  onPressMatch?: (matchId: string) => void;
}

export const AIScoutSection: React.FC<AIScoutSectionProps> = ({
  onPressMatch,
}) => {
  const [insights, setInsights] = useState<ScoutInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchScoutInsights();
  }, []);

  const fetchScoutInsights = async () => {
    try {
      setLoading(true);
      setError(false);
      // Use configured API URL
      const apiUrl = `${CONFIG.BACKEND_URL}/api/ai-predictions/scout`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.success && Array.isArray(data.insights)) {
        setInsights(data.insights);
      } else {
        // Se falhar ou vier vazio, apenas não mostra nada (sem erro explícito para o usuário)
        setInsights([]);
      }
    } catch (err) {
      console.error("[AIScout] Error fetching insights:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#a855f7" />
        <Text style={styles.loadingText}>Buscando oportunidades...</Text>
      </View>
    );
  }

  if (insights.length === 0) return null;

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "zebra":
        return {
          icon: <TriangleAlert size={16} color="#fbbf24" />,
          label: "ZEBRA POSSÍVEL",
          colors: ["#422006", "#271a0c"],
          borderColor: "rgba(251, 191, 36, 0.4)",
          textColor: "#fbbf24",
        };
      case "seguro":
        return {
          icon: <ShieldCheck size={16} color="#22c55e" />,
          label: "JOGO SEGURO",
          colors: ["#052e16", "#022c22"],
          borderColor: "rgba(34, 197, 94, 0.4)",
          textColor: "#4ade80",
        };
      case "gols":
        return {
          icon: <Flame size={16} color="#f97316" />,
          label: "ALERTA DE GOLS",
          colors: ["#431407", "#27120a"],
          borderColor: "rgba(249, 115, 22, 0.4)",
          textColor: "#fb923c",
        };
      default:
        return {
          icon: <Target size={16} color="#a855f7" />,
          label: "DESTAQUE",
          colors: ["#3b0764", "#2e1065"],
          borderColor: "rgba(168, 85, 247, 0.4)",
          textColor: "#c084fc",
        };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--:--";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Target size={20} color="#fbbf24" />
          <Text style={styles.title}>Scout de Oportunidades</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>BETA</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {insights.map((insight, index) => {
          const config = getTypeConfig(insight.type);
          return (
            <TouchableOpacity
              key={index}
              style={styles.cardWrapper}
              activeOpacity={0.9}
              onPress={() => onPressMatch?.(insight.matchId)}>
              <LinearGradient
                colors={config.colors as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, { borderColor: config.borderColor }]}>
                {/* Type Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.typeBadge}>
                    {config.icon}
                    <Text
                      style={[styles.typeText, { color: config.textColor }]}>
                      {config.label}
                    </Text>
                  </View>
                  <View style={styles.oddsBadge}>
                    <Text style={styles.oddsLabel}>Odds est.</Text>
                    <Text style={styles.oddsValue}>
                      {insight.odds_estimation || "-.-"}
                    </Text>
                  </View>
                </View>

                {/* Match Info */}
                <View style={styles.matchInfo}>
                  <Text style={styles.leagueName} numberOfLines={1}>
                    {insight.league.name} • {formatTime(insight.startTime)}
                  </Text>
                  <View style={styles.teamsRow}>
                    <Text style={styles.teamName} numberOfLines={1}>
                      {insight.homeTeam}
                    </Text>
                    <Text style={styles.vsText}>vs</Text>
                    <Text style={styles.teamName} numberOfLines={1}>
                      {insight.awayTeam}
                    </Text>
                  </View>
                </View>

                {/* Reason */}
                <View style={styles.reasonContainer}>
                  <TrendingUp
                    size={14}
                    color="#a1a1aa"
                    style={{ marginTop: 2, marginRight: 6 }}
                  />
                  <Text style={styles.reasonText} numberOfLines={3}>
                    {insight.reason}
                  </Text>
                </View>
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
  loadingContainer: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  badge: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  badgeText: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {
    width: 280,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    height: 160,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  oddsBadge: {
    alignItems: "flex-end",
  },
  oddsLabel: {
    color: "#71717a",
    fontSize: 9,
  },
  oddsValue: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  matchInfo: {
    marginBottom: 12,
  },
  leagueName: {
    color: "#a1a1aa",
    fontSize: 11,
    marginBottom: 4,
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  teamName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  vsText: {
    color: "#52525b",
    fontSize: 11,
    fontWeight: "500",
  },
  reasonContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 8,
    borderRadius: 8,
    flex: 1,
  },
  reasonText: {
    color: "#d4d4d8",
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
});
