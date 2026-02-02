import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Brain, Sparkles, TrendingUp, ChevronRight } from "lucide-react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_GAP = 12;

export interface AIPrediction {
  matchId: number | string;
  homeTeam: {
    name: string;
    logo: string;
    winProbability: number;
  };
  awayTeam: {
    name: string;
    logo: string;
    winProbability: number;
  };
  drawProbability: number;
  analysis: string;
  confidence: "high" | "medium" | "low";
  matchDate: string;
  league: {
    name: string;
    logo: string;
  };
}

interface AIPredictionSliderProps {
  predictions: AIPrediction[];
  loading?: boolean;
  onPressPrediction?: (prediction: AIPrediction) => void;
}

export const AIPredictionSlider: React.FC<AIPredictionSliderProps> = ({
  predictions,
  loading = false,
  onPressPrediction,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Animação de pulse para o ícone
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Shimmer animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (predictions.length <= 1) return;

    const autoScrollInterval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % predictions.length;
      const offsetX = nextIndex * (CARD_WIDTH + CARD_GAP);

      scrollViewRef.current?.scrollTo({
        x: offsetX,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 6000);

    return () => clearInterval(autoScrollInterval);
  }, [activeIndex, predictions.length]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (CARD_WIDTH + CARD_GAP));
    setActiveIndex(index);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "#22c55e";
      case "medium":
        return "#f59e0b";
      default:
        return "#94a3b8";
    }
  };

  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "Alta confiança";
      case "medium":
        return "Média confiança";
      default:
        return "Baixa confiança";
    }
  };

  const formatMatchTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--:--";
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Brain size={20} color="#a855f7" />
            <Text style={styles.sectionTitle}>Previsões da IA</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
          <Text style={styles.loadingText}>Analisando partidas...</Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (predictions.length === 0) {
    return <View style={styles.emptyContainer} />;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Animated.View
            style={[
              styles.iconWrapper,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <LinearGradient
              colors={["#a855f7", "#6366f1"]}
              style={styles.iconGradient}
            >
              <Brain size={18} color="#ffffff" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.sectionTitle}>Previsões da IA</Text>
          <Sparkles size={14} color="#a855f7" style={{ marginLeft: 4 }} />
        </View>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>POWERED BY AI</Text>
        </View>
      </View>

      {/* Cards Slider */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {predictions.map((prediction, index) => (
          <TouchableOpacity
            key={prediction.matchId}
            activeOpacity={0.9}
            onPress={() => onPressPrediction?.(prediction)}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={["#1e1b4b", "#312e81", "#1e1b4b"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.leagueInfo}>
                  {prediction.league.logo ? (
                    <Image
                      source={{ uri: prediction.league.logo }}
                      style={styles.leagueLogo}
                    />
                  ) : null}
                  <Text style={styles.leagueName} numberOfLines={1}>
                    {prediction.league.name}
                  </Text>
                </View>
                <View style={styles.timeContainer}>
                  <Text style={styles.matchTime}>
                    {formatMatchTime(prediction.matchDate)}
                  </Text>
                </View>
              </View>

              {/* Teams */}
              <View style={styles.teamsContainer}>
                {/* Home Team */}
                <View style={styles.teamSection}>
                  <View style={styles.teamLogoContainer}>
                    <View style={styles.teamLogoGlow} />
                    <Image
                      source={{ uri: prediction.homeTeam.logo || "https://via.placeholder.com/50" }}
                      style={styles.teamLogo}
                    />
                  </View>
                  <Text style={styles.teamName} numberOfLines={2}>
                    {prediction.homeTeam.name}
                  </Text>
                  <View style={styles.probabilityBadge}>
                    <Text style={styles.probabilityText}>
                      {prediction.homeTeam.winProbability}%
                    </Text>
                  </View>
                </View>

                {/* Center - Draw */}
                <View style={styles.centerSection}>
                  <View style={styles.drawBadge}>
                    <Text style={styles.drawLabel}>EMPATE</Text>
                    <Text style={styles.drawValue}>
                      {prediction.drawProbability}%
                    </Text>
                  </View>
                </View>

                {/* Away Team */}
                <View style={styles.teamSection}>
                  <View style={styles.teamLogoContainer}>
                    <View style={styles.teamLogoGlow} />
                    <Image
                      source={{ uri: prediction.awayTeam.logo || "https://via.placeholder.com/50" }}
                      style={styles.teamLogo}
                    />
                  </View>
                  <Text style={styles.teamName} numberOfLines={2}>
                    {prediction.awayTeam.name}
                  </Text>
                  <View style={styles.probabilityBadge}>
                    <Text style={styles.probabilityText}>
                      {prediction.awayTeam.winProbability}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Probability Bar */}
              <View style={styles.probabilityBarContainer}>
                <View
                  style={[
                    styles.probabilityBarHome,
                    { flex: prediction.homeTeam.winProbability },
                  ]}
                />
                <View
                  style={[
                    styles.probabilityBarDraw,
                    { flex: prediction.drawProbability },
                  ]}
                />
                <View
                  style={[
                    styles.probabilityBarAway,
                    { flex: prediction.awayTeam.winProbability },
                  ]}
                />
              </View>

              {/* Analysis */}
              <View style={styles.analysisContainer}>
                <View style={styles.analysisHeader}>
                  <TrendingUp size={14} color="#a855f7" />
                  <Text style={styles.analysisLabel}>Análise</Text>
                  <View
                    style={[
                      styles.confidenceDot,
                      { backgroundColor: getConfidenceColor(prediction.confidence) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.confidenceText,
                      { color: getConfidenceColor(prediction.confidence) },
                    ]}
                  >
                    {getConfidenceText(prediction.confidence)}
                  </Text>
                </View>
                <Text style={styles.analysisText} numberOfLines={2}>
                  {prediction.analysis}
                </Text>
              </View>

              {/* Tap hint */}
              <View style={styles.tapHintContainer}>
                <Text style={styles.tapHint}>Toque para mais detalhes</Text>
                <ChevronRight size={14} color="#52525b" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      {predictions.length > 1 && (
        <View style={styles.pagination}>
          {predictions.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  emptyContainer: {
    height: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrapper: {
    borderRadius: 10,
    overflow: "hidden",
  },
  iconGradient: {
    padding: 6,
    borderRadius: 10,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  aiBadge: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
  },
  aiBadgeText: {
    color: "#a855f7",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  leagueInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  leagueLogo: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  leagueName: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  timeContainer: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchTime: {
    color: "#a855f7",
    fontSize: 12,
    fontWeight: "700",
  },
  teamsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  teamSection: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  teamLogoContainer: {
    position: "relative",
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  teamLogoGlow: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
  },
  teamLogo: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
  teamName: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 80,
  },
  probabilityBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.5)",
  },
  probabilityText: {
    color: "#818cf8",
    fontSize: 14,
    fontWeight: "800",
  },
  centerSection: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 20,
  },
  drawBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  drawLabel: {
    color: "#71717a",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  drawValue: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "700",
  },
  probabilityBarContainer: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  probabilityBarHome: {
    backgroundColor: "#6366f1",
  },
  probabilityBarDraw: {
    backgroundColor: "#52525b",
  },
  probabilityBarAway: {
    backgroundColor: "#a855f7",
  },
  analysisContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  analysisLabel: {
    color: "#a855f7",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: "600",
  },
  analysisText: {
    color: "#d4d4d8",
    fontSize: 12,
    lineHeight: 18,
  },
  tapHintContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  tapHint: {
    textAlign: "center",
    color: "#52525b",
    fontSize: 11,
    fontWeight: "500",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(168, 85, 247, 0.3)",
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: "#a855f7",
  },
});

export default AIPredictionSlider;
