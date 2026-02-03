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
  Lock,
  Crown,
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
  isPremium?: boolean;
  onPremiumPress?: () => void;
}

export const AIScoutSection: React.FC<AIScoutSectionProps> = ({
  onPressMatch,
  isPremium = true,
  onPremiumPress,
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
        <Text style={styles.loadingText}>
          Buscando as melhores oportunidades...
        </Text>
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

  // Se não é premium, mostrar versão bloqueada
  if (!isPremium) {
    return (
      <View style={styles.container}>
        {/* Section Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Sparkles size={18} color="#a855f7" />
              <Text style={styles.title}>Guru IA - Dicas de Apostas</Text>
              <View style={styles.premiumBadgeSmall}>
                <Crown size={10} color="#fbbf24" />
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Análises exclusivas do nosso algoritmo de IA
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPremiumPress}
          style={styles.lockedContainer}>
          <LinearGradient
            colors={["#1a1a2e", "#16162a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockedCard}>
            {/* Ícones de exemplo borrados no fundo */}
            <View style={styles.lockedBackground}>
              <View style={[styles.lockedIcon, { left: 20, top: 30 }]}>
                <TriangleAlert size={24} color="rgba(251, 191, 36, 0.2)" />
              </View>
              <View style={[styles.lockedIcon, { right: 40, top: 50 }]}>
                <ShieldCheck size={28} color="rgba(34, 197, 94, 0.2)" />
              </View>
              <View style={[styles.lockedIcon, { left: 60, bottom: 40 }]}>
                <Flame size={22} color="rgba(249, 115, 22, 0.2)" />
              </View>
              <View style={[styles.lockedIcon, { right: 80, bottom: 60 }]}>
                <Target size={26} color="rgba(168, 85, 247, 0.2)" />
              </View>
            </View>

            {/* Conteúdo Principal */}
            <View style={styles.lockedContent}>
              <View style={styles.lockedIconWrapper}>
                <LinearGradient
                  colors={["#a855f7", "#7c3aed"]}
                  style={styles.lockedIconGradient}>
                  <Lock size={28} color="#fff" />
                </LinearGradient>
              </View>

              <Text style={styles.lockedTitle}>Conteúdo Exclusivo Premium</Text>
              <Text style={styles.lockedDescription}>
                Desbloqueie análises avançadas de IA com dicas de apostas,
                identificação de zebras e oportunidades de alto valor.
              </Text>

              {/* Features */}
              <View style={styles.lockedFeatures}>
                <View style={styles.lockedFeatureItem}>
                  <TriangleAlert size={14} color="#fbbf24" />
                  <Text style={styles.lockedFeatureText}>
                    Zebras identificadas
                  </Text>
                </View>
                <View style={styles.lockedFeatureItem}>
                  <ShieldCheck size={14} color="#22c55e" />
                  <Text style={styles.lockedFeatureText}>Apostas seguras</Text>
                </View>
                <View style={styles.lockedFeatureItem}>
                  <Flame size={14} color="#f97316" />
                  <Text style={styles.lockedFeatureText}>
                    Tendência de gols
                  </Text>
                </View>
              </View>

              {/* CTA Button */}
              <LinearGradient
                colors={["#a855f7", "#7c3aed"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.lockedButton}>
                <Crown size={16} color="#fff" />
                <Text style={styles.lockedButtonText}>Desbloquear Guru IA</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Sparkles size={18} color="#a855f7" />
            <Text style={styles.title}>Guru IA - Dicas de Apostas</Text>
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
                    <Text
                      style={[styles.typeText, { color: config.textColor }]}>
                      {config.label}
                    </Text>
                  </View>
                  {insight.odds_estimation && (
                    <View style={styles.oddsBadge}>
                      <Text style={styles.oddsLabel}>ODD EST.</Text>
                      <Text style={styles.oddsValue}>
                        @{insight.odds_estimation}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Ação Sugerida (Destaque) */}
                <View style={styles.actionContainer}>
                  <Text style={styles.actionLabel}>Sugestão da IA:</Text>
                  <Text
                    style={[styles.actionText, { color: config.textColor }]}>
                    {config.action}
                  </Text>
                </View>

                {/* Informações do Jogo */}
                <View style={styles.divider} />
                <View style={styles.matchInfo}>
                  <View style={styles.leagueRow}>
                    <Text style={styles.leagueName}>{insight.league.name}</Text>
                    <Text style={styles.matchTime}>
                      {formatTime(insight.startTime)}
                    </Text>
                  </View>

                  <View style={styles.teamsContainer}>
                    <Text style={styles.teamsText}>
                      {insight.homeTeam} <Text style={styles.vsText}>x</Text>{" "}
                      {insight.awayTeam}
                    </Text>
                  </View>

                  {/* Favorito Badge */}
                  {insight.favorite && insight.favorite !== "None" && (
                    <View style={styles.favoriteBadge}>
                      <Text style={styles.favoriteLabel}>FAVORITO:</Text>
                      <Text style={styles.favoriteValue}>
                        {insight.favorite === "Home"
                          ? insight.homeTeam
                          : insight.awayTeam}
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
                  <Text style={styles.reasonText} numberOfLines={2}>
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
    paddingBottom: 8,
    gap: 16,
  },
  cardWrapper: {
    width: 340, // Aumentado
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    height: 320, // Aumentado para caber tudo folgado
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 32,
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 12,
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
    height: 50,
    justifyContent: "center",
    marginBottom: 4,
  },
  actionLabel: {
    color: "#a1a1aa",
    fontSize: 11,
    marginBottom: 2,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  actionText: {
    fontSize: 22, // Maior destaque
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 12,
  },
  matchInfo: {
    marginBottom: 0,
    flex: 1,
  },
  leagueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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
    marginBottom: 8,
  },
  teamsText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  vsText: {
    color: "#71717a",
    fontWeight: "400",
    fontSize: 14,
    marginHorizontal: 4,
  },
  favoriteBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    height: 28,
  },
  favoriteLabel: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "700",
    marginRight: 6,
  },
  favoriteValue: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  reasonContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    height: 80, // Um pouco maior
    justifyContent: "center",
  },
  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  reasonLabel: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  reasonText: {
    color: "#e4e4e7",
    fontSize: 12,
    lineHeight: 16,
  },
  // Estilos para versão bloqueada (não-premium)
  premiumBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginLeft: 4,
  },
  premiumBadgeText: {
    color: "#fbbf24",
    fontSize: 9,
    fontWeight: "800",
  },
  lockedContainer: {
    paddingHorizontal: 16,
  },
  lockedCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    minHeight: 320,
    overflow: "hidden",
  },
  lockedBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lockedIcon: {
    position: "absolute",
    opacity: 0.6,
  },
  lockedContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  lockedIconWrapper: {
    marginBottom: 16,
  },
  lockedIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  lockedTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  lockedDescription: {
    color: "#a1a1aa",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  lockedFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  lockedFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  lockedFeatureText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "500",
  },
  lockedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  lockedButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
