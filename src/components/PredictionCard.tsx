import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, X, Trophy, Target, Minus, Plus } from "lucide-react-native";
import {
  createPrediction,
  getMatchPrediction,
  Prediction,
} from "../services/predictionsApi";

interface Match {
  id: string;
  homeTeam: {
    name: string;
    logo: string;
    id?: string;
  };
  awayTeam: {
    name: string;
    logo: string;
    id?: string;
  };
  competition?: {
    name: string;
    logo?: string;
  };
  date: string;
  time?: string;
  status?: string;
  homeScore?: number;
  awayScore?: number;
}

interface PredictionCardProps {
  match: Match;
  onPredictionMade?: (prediction: Prediction) => void;
  compact?: boolean;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  match,
  onPredictionMade,
  compact = false,
}) => {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [existingPrediction, setExistingPrediction] =
    useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Check if match already started
  const matchDate = new Date(match.date);
  const hasStarted = matchDate <= new Date();
  const isFinished = match.status === "FT" || match.status === "AET";

  useEffect(() => {
    loadExistingPrediction();
  }, [match.id]);

  const loadExistingPrediction = async () => {
    try {
      setLoading(true);
      const prediction = await getMatchPrediction(match.id);
      if (prediction) {
        setExistingPrediction(prediction);
        setHomeScore(prediction.predictedHomeScore);
        setAwayScore(prediction.predictedAwayScore);
      }
    } catch (err) {
      console.error("Error loading prediction:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (hasStarted) {
      setError("Partida já iniciou!");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await createPrediction({
        matchId: match.id,
        homeTeam: {
          name: match.homeTeam.name,
          logo: match.homeTeam.logo,
          id: match.homeTeam.id,
        },
        awayTeam: {
          name: match.awayTeam.name,
          logo: match.awayTeam.logo,
          id: match.awayTeam.id,
        },
        competition: match.competition,
        matchDate: match.date,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
      });

      setExistingPrediction(result.prediction);
      setShowSuccess(true);

      // Animate success
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowSuccess(false));

      onPredictionMade?.(result.prediction);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar palpite");
    } finally {
      setSubmitting(false);
    }
  };

  const adjustScore = (team: "home" | "away", delta: number) => {
    if (hasStarted) return;

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    if (team === "home") {
      setHomeScore((prev) => Math.max(0, Math.min(20, prev + delta)));
    } else {
      setAwayScore((prev) => Math.max(0, Math.min(20, prev + delta)));
    }
  };

  const getResultBadge = () => {
    if (!existingPrediction || existingPrediction.result.type === "pending") {
      return null;
    }

    const { type, points } = existingPrediction.result;
    const configs = {
      exact: { color: "#22c55e", icon: Target, text: "Exato!", emoji: "🎯" },
      partial: {
        color: "#3b82f6",
        icon: Trophy,
        text: "Parcial",
        emoji: "👏",
      },
      result: { color: "#f59e0b", icon: Check, text: "Certo", emoji: "✅" },
      miss: { color: "#ef4444", icon: X, text: "Errou", emoji: "❌" },
    };

    const config = configs[type];
    const Icon = config.icon;

    return (
      <View style={[styles.resultBadge, { backgroundColor: config.color }]}>
        <Text style={styles.resultEmoji}>{config.emoji}</Text>
        <Text style={styles.resultText}>
          {config.text} +{points}pts
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator color="#22c55e" />
      </View>
    );
  }

  // Show result view if match is finished
  if (isFinished && existingPrediction) {
    return (
      <LinearGradient
        colors={["rgba(34, 197, 94, 0.1)", "rgba(34, 197, 94, 0.05)"]}
        style={[styles.container, compact && styles.containerCompact]}
      >
        {getResultBadge()}

        <View style={styles.teamsRow}>
          <View style={styles.teamSection}>
            <Image
              source={{ uri: match.homeTeam.logo }}
              style={styles.teamLogo}
            />
            <Text style={styles.teamName} numberOfLines={1}>
              {match.homeTeam.name}
            </Text>
          </View>

          <View style={styles.scoresSection}>
            <View style={styles.predictionScores}>
              <Text style={styles.predictionLabel}>Seu palpite</Text>
              <Text style={styles.predictionScore}>
                {existingPrediction.predictedHomeScore} x{" "}
                {existingPrediction.predictedAwayScore}
              </Text>
            </View>
            <View style={styles.actualScores}>
              <Text style={styles.actualLabel}>Resultado</Text>
              <Text style={styles.actualScore}>
                {match.homeScore} x {match.awayScore}
              </Text>
            </View>
          </View>

          <View style={styles.teamSection}>
            <Image
              source={{ uri: match.awayTeam.logo }}
              style={styles.teamLogo}
            />
            <Text style={styles.teamName} numberOfLines={1}>
              {match.awayTeam.name}
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["rgba(23, 23, 23, 0.9)", "rgba(23, 23, 23, 0.7)"]}
      style={[
        styles.container,
        compact && styles.containerCompact,
        hasStarted && styles.containerDisabled,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        {match.competition && (
          <View style={styles.competitionBadge}>
            {match.competition.logo && (
              <Image
                source={{ uri: match.competition.logo }}
                style={styles.competitionLogo}
              />
            )}
            <Text style={styles.competitionName} numberOfLines={1}>
              {match.competition.name}
            </Text>
          </View>
        )}

        {existingPrediction && (
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>✏️ Palpite feito</Text>
          </View>
        )}
      </View>

      {/* Teams and Score Input */}
      <View style={styles.mainContent}>
        {/* Home Team */}
        <View style={styles.teamSection}>
          <Image
            source={{ uri: match.homeTeam.logo }}
            style={styles.teamLogo}
          />
          <Text style={styles.teamName} numberOfLines={2}>
            {match.homeTeam.name}
          </Text>
        </View>

        {/* Score Input */}
        <Animated.View
          style={[styles.scoreInput, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={styles.scoreColumn}>
            <TouchableOpacity
              style={styles.scoreButton}
              onPress={() => adjustScore("home", 1)}
              disabled={hasStarted}
            >
              <Plus size={16} color={hasStarted ? "#555" : "#22c55e"} />
            </TouchableOpacity>
            <Text style={styles.scoreValue}>{homeScore}</Text>
            <TouchableOpacity
              style={styles.scoreButton}
              onPress={() => adjustScore("home", -1)}
              disabled={hasStarted}
            >
              <Minus size={16} color={hasStarted ? "#555" : "#ef4444"} />
            </TouchableOpacity>
          </View>

          <Text style={styles.scoreSeparator}>×</Text>

          <View style={styles.scoreColumn}>
            <TouchableOpacity
              style={styles.scoreButton}
              onPress={() => adjustScore("away", 1)}
              disabled={hasStarted}
            >
              <Plus size={16} color={hasStarted ? "#555" : "#22c55e"} />
            </TouchableOpacity>
            <Text style={styles.scoreValue}>{awayScore}</Text>
            <TouchableOpacity
              style={styles.scoreButton}
              onPress={() => adjustScore("away", -1)}
              disabled={hasStarted}
            >
              <Minus size={16} color={hasStarted ? "#555" : "#ef4444"} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Away Team */}
        <View style={styles.teamSection}>
          <Image
            source={{ uri: match.awayTeam.logo }}
            style={styles.teamLogo}
          />
          <Text style={styles.teamName} numberOfLines={2}>
            {match.awayTeam.name}
          </Text>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Submit Button */}
      {!hasStarted && (
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonLoading]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {existingPrediction ? "Atualizar Palpite" : "Confirmar Palpite"} 🎯
            </Text>
          )}
        </TouchableOpacity>
      )}

      {hasStarted && !isFinished && (
        <View style={styles.startedBadge}>
          <Text style={styles.startedText}>⏱️ Partida em andamento</Text>
        </View>
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <Animated.View
          style={[styles.successOverlay, { opacity: successAnim }]}
        >
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successText}>Palpite salvo!</Text>
        </Animated.View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  containerCompact: {
    padding: 12,
    marginVertical: 4,
  },
  containerDisabled: {
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  competitionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  competitionLogo: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  competitionName: {
    color: "#999",
    fontSize: 11,
    maxWidth: 120,
  },
  editBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editBadgeText: {
    color: "#22c55e",
    fontSize: 10,
    fontWeight: "600",
  },
  mainContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamSection: {
    flex: 1,
    alignItems: "center",
  },
  teamLogo: {
    width: 48,
    height: 48,
    marginBottom: 6,
  },
  teamName: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 80,
  },
  scoreInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    padding: 8,
  },
  scoreColumn: {
    alignItems: "center",
  },
  scoreButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
  },
  scoreValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginVertical: 4,
    minWidth: 32,
    textAlign: "center",
  },
  scoreSeparator: {
    color: "#666",
    fontSize: 24,
    marginHorizontal: 12,
  },
  submitButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    alignItems: "center",
  },
  submitButtonLoading: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  startedBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  startedText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    textAlign: "center",
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34, 197, 94, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  successText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: "center",
  },
  resultEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  resultText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoresSection: {
    alignItems: "center",
  },
  predictionScores: {
    alignItems: "center",
    marginBottom: 8,
  },
  predictionLabel: {
    color: "#888",
    fontSize: 10,
    marginBottom: 2,
  },
  predictionScore: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  actualScores: {
    alignItems: "center",
  },
  actualLabel: {
    color: "#888",
    fontSize: 10,
    marginBottom: 2,
  },
  actualScore: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default PredictionCard;
