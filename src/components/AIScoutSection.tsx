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
  TrendingUp,
  TriangleAlert,
  ShieldCheck,
  Flame,
  Target,
  Sparkles,
  Info,
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
  favorite?: "Home" | "Away" | "None";
}

interface AIScoutSectionProps {
  onPressMatch?: (matchId: string) => void;
}

export const AIScoutSection: React.FC<AIScoutSectionProps> = ({
  onPressMatch,
}) => {
  const [insights, setInsights] = useState<ScoutInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScoutInsights();
  }, []);

  const fetchScoutInsights = async () => {
    try {
      setLoading(true);
      // Use configured API URL
      const apiUrl = `${CONFIG.BACKEND_URL}/api/ai-predictions/scout`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.success && Array.isArray(data.insights)) {
        setInsights(data.insights);
      } else {
        setInsights([]);
      }
    } catch (err) {
      console.error("[AIScout] Error checking insights:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#a855f7" />
        <Text style={styles.loadingText}>Buscando as melhores oportunidades...</Text>
      </View>
    );
  }

  if (insights.length === 0) return null;

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "zebra":
        return {
          icon: <TriangleAlert size={18} color="#fbbf24" />,
          label: "OPORTUNIDADE DE RISCO",
          action: "Apostar na Zebra 🦓",
          colors: ["#422006", "#271a0c"],
          borderColor: "rgba(251, 191, 36, 0.4)",
          textColor: "#fbbf24",
          gradientIcon: ["#f59e0b", "#d97706"],
        };
      case "seguro":
        return {
          icon: <ShieldCheck size={18} color="#22c55e" />,
          label: "ALTA PROBABILIDADE",
          action: "Vitória do Favorito 🛡️",
          colors: ["#052e16", "#022c22"],
          borderColor: "rgba(34, 197, 94, 0.4)",
          textColor: "#4ade80",
          gradientIcon: ["#22c55e", "#15803d"],
        };
      case "gols":
        return {
          icon: <Flame size={18} color="#f97316" />,
          label: "TENDÊNCIA DE GOLS",
          action: "Mais de 2.5 Gols 🔥",
          colors: ["#431407", "#27120a"],
          borderColor: "rgba(249, 115, 22, 0.4)",
          textColor: "#fb923c",
          gradientIcon: ["#f97316", "#c2410c"],
        };
      default:
        return {
          icon: <Target size={18} color="#a855f7" />,
          label: "DESTAQUE IA",
          action: "Fique de Olho 👀",
          colors: ["#3b0764", "#2e1065"],
          borderColor: "rgba(168, 85, 247, 0.4)",
          textColor: "#c084fc",
          gradientIcon: ["#a855f7", "#7e22ce"],
        };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      if (!isoString) return "--:--";
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "--:--";
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
    } catch {
      return "--:--";
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Sparkles size={18} color="#a855f7" />
            <Text style={styles.title}>Dicas de Apostas & Scout IA</Text>
          </View>
          <Text style={styles.subtitle}>
            Melhores oportunidades analisadas pelo algoritmo hoje
          </Text>
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
                
                {/* Header do Card: Tipo e Odds */}
                <View style={styles.cardHeader}>
                  <View style={styles.typeBadge}>
                    {config.icon}
                    <Text style={[styles.typeText, { color: config.textColor }]}>
                      {config.label}
                    </Text>
                  </View>
                  {insight.odds_estimation && (
                    <View style={styles.oddsBadge}>
                      <Text style={styles.oddsLabel}>ODD EST.</Text>
                      <Text style={styles.oddsValue}>@{insight.odds_estimation}</Text>
                    </View>
                  )}
                </View>

                {/* Ação Sugerida (Destaque) */}
                <View style={styles.actionContainer}>
                  <Text style={styles.actionLabel}>Sugestão da IA:</Text>
                  <Text style={[styles.actionText, { color: config.textColor }]}>
                    {config.action}
                  </Text>
                </View>

                {/* Informações do Jogo */}
                <View style={styles.divider} />
                <View style={styles.matchInfo}>
                  <View style={styles.leagueRow}>
                    <Text style={styles.leagueName}>
                      {insight.league.name}
                    </Text>
                    <Text style={styles.matchTime}>
                      {formatTime(insight.startTime)}
                    </Text>
                  </View>
                  
                  <View style={styles.teamsContainer}>
                    <Text style={styles.teamsText}>
                      {insight.homeTeam} <Text style={styles.vsText}>x</Text> {insight.awayTeam}
                    </Text>
                  </View>

                  {/* Favorito Badge */}
                  {insight.favorite && insight.favorite !== "None" && (
                    <View style={styles.favoriteBadge}>
                      <Text style={styles.favoriteLabel}>FAVORITO:</Text>
                      <Text style={styles.favoriteValue}>
                        {insight.favorite === "Home" ? insight.homeTeam : insight.awayTeam}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Motivo (Análise) */}
                <View style={styles.reasonContainer}>
                  <View style={styles.reasonHeader}>
                    <Info size={12} color="#a1a1aa" />
                    <Text style={styles.reasonLabel}>Por que apostar?</Text>
                  </View>
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
    marginBottom: 28,
  },
  loadingContainer: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#71717a",
    fontSize: 13,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 16,
  },
  cardWrapper: {
    width: 320,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    minHeight: 220,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  typeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  oddsBadge: {
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  oddsLabel: {
    color: "#a1a1aa",
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 2,
  },
  oddsValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  actionContainer: {
    marginBottom: 16,
  },
  actionLabel: {
    color: "#a1a1aa",
    fontSize: 11,
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  actionText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  matchInfo: {
    marginBottom: 16,
  },
  leagueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  leagueName: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  matchTime: {
    color: "#a1a1aa",
    fontSize: 11,
  },
  teamsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  teamsText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  vsText: {
    color: "#71717a",
    fontWeight: "400",
    fontSize: 13,
  },
  reasonContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  reasonLabel: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "600",
  },
  reasonText: {
    color: "#e4e4e7",
    fontSize: 13,
    lineHeight: 18,
  },
  favoriteBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  favoriteLabel: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "700",
    marginRight: 4,
  },
  favoriteValue: {
    color: "#22c55e",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
