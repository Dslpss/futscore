import React, { useRef, useEffect, useState, useMemo } from "react";
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
  Modal,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Brain,
  Sparkles,
  TrendingUp,
  ChevronRight,
  X,
} from "lucide-react-native";

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
  error?: boolean;
  onPressPrediction?: (prediction: AIPrediction) => void;
  onRetry?: () => void;
}

export const AIPredictionSlider: React.FC<AIPredictionSliderProps> = ({
  predictions,
  loading = false,
  error = false,
  onPressPrediction,
  onRetry,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedPrediction, setSelectedPrediction] =
    useState<AIPrediction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Validate and filter predictions to ensure all required fields exist
  const validPredictions = useMemo(() => {
    if (!predictions || !Array.isArray(predictions)) return [];

    return predictions
      .filter((p) => {
        // Check required fields exist
        if (!p || typeof p !== "object") return false;
        if (!p.matchId) return false;
        if (!p.homeTeam || typeof p.homeTeam !== "object") return false;
        if (!p.awayTeam || typeof p.awayTeam !== "object") return false;
        if (typeof p.homeTeam.winProbability !== "number") return false;
        if (typeof p.awayTeam.winProbability !== "number") return false;
        if (typeof p.drawProbability !== "number") return false;
        return true;
      })
      .map((p) => ({
        ...p,
        // Ensure all optional fields have defaults
        homeTeam: {
          name: p.homeTeam?.name || "Time Casa",
          logo: p.homeTeam?.logo || "",
          winProbability: p.homeTeam?.winProbability ?? 33,
        },
        awayTeam: {
          name: p.awayTeam?.name || "Time Fora",
          logo: p.awayTeam?.logo || "",
          winProbability: p.awayTeam?.winProbability ?? 33,
        },
        drawProbability: p.drawProbability ?? 34,
        analysis: p.analysis || "Análise não disponível",
        confidence: p.confidence || "medium",
        matchDate: p.matchDate || new Date().toISOString(),
        league: {
          name: p.league?.name || "",
          logo: p.league?.logo || "",
        },
      }));
  }, [predictions]);

  const handlePredictionPress = (prediction: AIPrediction) => {
    setSelectedPrediction(prediction);
    setModalVisible(true);
    onPressPrediction?.(prediction);
  };

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
      ]),
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
      }),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (validPredictions.length <= 1) return;

    const autoScrollInterval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % validPredictions.length;
      const offsetX = nextIndex * (CARD_WIDTH + CARD_GAP);

      scrollViewRef.current?.scrollTo({
        x: offsetX,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 6000);

    return () => clearInterval(autoScrollInterval);
  }, [activeIndex, validPredictions.length]);

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
      // Handle numeric timestamp strings (e.g., "1770062400000")
      let date: Date;
      if (/^\d+$/.test(dateString)) {
        date = new Date(parseInt(dateString, 10));
      } else {
        date = new Date(dateString);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "--:--";
      }

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

  // Error state - show retry button
  if (error || (validPredictions.length === 0 && !loading)) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Brain size={20} color="#a855f7" />
            <Text style={styles.sectionTitle}>Previsões da IA</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrapper}>
            <Brain size={32} color="#6b7280" />
          </View>
          <Text style={styles.errorTitle}>Previsões indisponíveis</Text>
          <Text style={styles.errorText}>
            Não foi possível carregar as previsões da IA.
          </Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Animated.View
            style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={["#a855f7", "#6366f1"]}
              style={styles.iconGradient}>
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
        scrollEventThrottle={16}>
        {validPredictions.map((prediction, index) => (
          <TouchableOpacity
            key={prediction.matchId}
            activeOpacity={0.9}
            onPress={() => handlePredictionPress(prediction)}
            style={styles.cardWrapper}>
            <LinearGradient
              colors={["#1e1b4b", "#312e81", "#1e1b4b"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}>
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
                    {prediction.homeTeam.logo ? (
                      <Image
                        source={{ uri: prediction.homeTeam.logo }}
                        style={styles.teamLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.teamLogoPlaceholder}>
                        <Text style={styles.teamLogoPlaceholderText}>⚽</Text>
                      </View>
                    )}
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
                    {prediction.awayTeam.logo ? (
                      <Image
                        source={{ uri: prediction.awayTeam.logo }}
                        style={styles.teamLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.teamLogoPlaceholder}>
                        <Text style={styles.teamLogoPlaceholderText}>⚽</Text>
                      </View>
                    )}
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
                      {
                        backgroundColor: getConfidenceColor(
                          prediction.confidence,
                        ),
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.confidenceText,
                      { color: getConfidenceColor(prediction.confidence) },
                    ]}>
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
      {validPredictions.length > 1 && (
        <View style={styles.pagination}>
          {validPredictions.map((_, index) => (
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

      {/* Modal de Detalhes */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={["#1e1b4b", "#312e81", "#1e1b4b"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalGradient}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Brain size={20} color="#a855f7" />
                  <Text style={styles.modalTitle}>Análise da IA</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseButton}>
                  <X size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {selectedPrediction && (
                <>
                  {/* League */}
                  <Text style={styles.modalLeague}>
                    {selectedPrediction.league.name}
                  </Text>

                  {/* Teams */}
                  <View style={styles.modalTeamsContainer}>
                    <View style={styles.modalTeamSection}>
                      {selectedPrediction.homeTeam.logo ? (
                        <Image
                          source={{ uri: selectedPrediction.homeTeam.logo }}
                          style={styles.modalTeamLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.modalTeamLogoPlaceholder}>
                          <Text style={styles.modalTeamLogoPlaceholderText}>
                            ⚽
                          </Text>
                        </View>
                      )}
                      <Text style={styles.modalTeamName} numberOfLines={2}>
                        {selectedPrediction.homeTeam.name}
                      </Text>
                      <View style={styles.modalProbabilityBadge}>
                        <Text style={styles.modalProbabilityText}>
                          {selectedPrediction.homeTeam.winProbability}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalVsContainer}>
                      <Text style={styles.modalVsText}>VS</Text>
                      <View style={styles.modalDrawBadge}>
                        <Text style={styles.modalDrawLabel}>Empate</Text>
                        <Text style={styles.modalDrawValue}>
                          {selectedPrediction.drawProbability}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalTeamSection}>
                      {selectedPrediction.awayTeam.logo ? (
                        <Image
                          source={{ uri: selectedPrediction.awayTeam.logo }}
                          style={styles.modalTeamLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.modalTeamLogoPlaceholder}>
                          <Text style={styles.modalTeamLogoPlaceholderText}>
                            ⚽
                          </Text>
                        </View>
                      )}
                      <Text style={styles.modalTeamName} numberOfLines={2}>
                        {selectedPrediction.awayTeam.name}
                      </Text>
                      <View style={styles.modalProbabilityBadge}>
                        <Text style={styles.modalProbabilityText}>
                          {selectedPrediction.awayTeam.winProbability}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Probability Bar */}
                  <View style={styles.modalProbabilityBar}>
                    <View
                      style={[
                        styles.modalProbBarHome,
                        { flex: selectedPrediction.homeTeam.winProbability },
                      ]}
                    />
                    <View
                      style={[
                        styles.modalProbBarDraw,
                        { flex: selectedPrediction.drawProbability },
                      ]}
                    />
                    <View
                      style={[
                        styles.modalProbBarAway,
                        { flex: selectedPrediction.awayTeam.winProbability },
                      ]}
                    />
                  </View>

                  {/* Analysis */}
                  <View style={styles.modalAnalysisContainer}>
                    <View style={styles.modalAnalysisHeader}>
                      <Sparkles size={16} color="#a855f7" />
                      <Text style={styles.modalAnalysisTitle}>Análise</Text>
                    </View>
                    <ScrollView 
                      style={styles.modalAnalysisScroll}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      <Text style={styles.modalAnalysisText}>
                        {selectedPrediction.analysis}
                      </Text>
                    </ScrollView>
                  </View>

                  {/* Confidence */}
                  <View style={styles.modalConfidenceContainer}>
                    <Text style={styles.modalConfidenceLabel}>
                      Confiança da previsão:
                    </Text>
                    <View
                      style={[
                        styles.modalConfidenceBadge,
                        selectedPrediction.confidence === "high" &&
                          styles.confidenceHigh,
                        selectedPrediction.confidence === "medium" &&
                          styles.confidenceMedium,
                        selectedPrediction.confidence === "low" &&
                          styles.confidenceLow,
                      ]}>
                      <Text style={styles.modalConfidenceText}>
                        {selectedPrediction.confidence === "high"
                          ? "Alta"
                          : selectedPrediction.confidence === "medium"
                            ? "Média"
                            : "Baixa"}
                      </Text>
                    </View>
                  </View>

                  {/* Match Time */}
                  <Text style={styles.modalMatchTime}>
                    🕐 {formatMatchTime(selectedPrediction.matchDate)}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
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
  teamLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(168, 85, 247, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  teamLogoPlaceholderText: {
    fontSize: 24,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
  },
  modalGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.4)",
    borderRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalLeague: {
    color: "#a1a1aa",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  modalTeamsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTeamSection: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  modalTeamLogo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  modalTeamLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(168, 85, 247, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTeamLogoPlaceholderText: {
    fontSize: 28,
  },
  modalTeamName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 100,
  },
  modalProbabilityBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.4)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalProbabilityText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalVsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  modalVsText: {
    color: "#52525b",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  modalDrawBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalDrawLabel: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "500",
  },
  modalDrawValue: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "700",
  },
  modalProbabilityBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 20,
  },
  modalProbBarHome: {
    backgroundColor: "#6366f1",
  },
  modalProbBarDraw: {
    backgroundColor: "#71717a",
  },
  modalProbBarAway: {
    backgroundColor: "#a855f7",
  },
  modalAnalysisContainer: {
    backgroundColor: "rgba(168, 85, 247, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.2)",
  },
  modalAnalysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  modalAnalysisScroll: {
    maxHeight: 120,
  },
  modalAnalysisTitle: {
    color: "#a855f7",
    fontSize: 14,
    fontWeight: "600",
  },
  modalAnalysisText: {
    color: "#e4e4e7",
    fontSize: 14,
    lineHeight: 22,
  },
  modalConfidenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  modalConfidenceLabel: {
    color: "#a1a1aa",
    fontSize: 13,
  },
  modalConfidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceHigh: {
    backgroundColor: "rgba(34, 197, 94, 0.3)",
  },
  confidenceMedium: {
    backgroundColor: "rgba(234, 179, 8, 0.3)",
  },
  confidenceLow: {
    backgroundColor: "rgba(239, 68, 68, 0.3)",
  },
  modalConfidenceText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalMatchTime: {
    color: "#71717a",
    fontSize: 12,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.15)",
  },
  errorIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(107, 114, 128, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorTitle: {
    color: "#e4e4e7",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  errorText: {
    color: "#71717a",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.4)",
  },
  retryButtonText: {
    color: "#a855f7",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AIPredictionSlider;
