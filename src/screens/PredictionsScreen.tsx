import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Trophy,
  Target,
  TrendingUp,
  Flame,
  Medal,
  Users,
} from "lucide-react-native";
import { PredictionCard } from "../components/PredictionCard";
import { LeaderboardModal } from "../components/LeaderboardModal";
import {
  getMyPredictions,
  getMyStats,
  Prediction,
  UserStats,
} from "../services/predictionsApi";

const { width } = Dimensions.get("window");

interface PredictionsScreenProps {
  navigation: any;
  route?: {
    params?: {
      matches?: Array<{
        id: string;
        homeTeam: { name: string; logo: string; id?: string };
        awayTeam: { name: string; logo: string; id?: string };
        competition?: { name: string; logo?: string };
        date: string;
        status?: string;
        homeScore?: number;
        awayScore?: number;
      }>;
    };
  };
}

type TabType = "upcoming" | "history";

export const PredictionsScreen: React.FC<PredictionsScreenProps> = ({
  navigation,
  route,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Get upcoming matches from route params
  const upcomingMatches = route?.params?.matches || [];

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Always load stats
      const statsData = await getMyStats();
      setStats(statsData);

      // Load predictions based on tab
      if (activeTab === "history") {
        const { predictions: historyPredictions } = await getMyPredictions(
          "completed",
          50,
          0
        );
        setPredictions(historyPredictions);
      } else {
        const { predictions: pendingPredictions } = await getMyPredictions(
          "pending",
          50,
          0
        );
        setPredictions(pendingPredictions);
      }
    } catch (error) {
      console.error("Error loading predictions data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [activeTab]);

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <LinearGradient
        colors={["rgba(34, 197, 94, 0.15)", "rgba(34, 197, 94, 0.05)"]}
        style={styles.statsCard}
      >
        {/* Points Header */}
        <View style={styles.statsHeader}>
          <View style={styles.pointsContainer}>
            <Trophy size={24} color="#fbbf24" />
            <Text style={styles.totalPoints}>{stats.totalPoints}</Text>
            <Text style={styles.pointsLabel}>pontos</Text>
          </View>

          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={() => setShowLeaderboard(true)}
          >
            <Users size={18} color="#22c55e" />
            <Text style={styles.leaderboardButtonText}>Ranking</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Target size={20} color="#22c55e" />
            <Text style={styles.statValue}>{stats.predictions.exact}</Text>
            <Text style={styles.statLabel}>Exatos</Text>
          </View>

          <View style={styles.statItem}>
            <TrendingUp size={20} color="#3b82f6" />
            <Text style={styles.statValue}>{stats.accuracy}%</Text>
            <Text style={styles.statLabel}>Acertos</Text>
          </View>

          <View style={styles.statItem}>
            <Flame size={20} color="#ef4444" />
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Sequência</Text>
          </View>

          <View style={styles.statItem}>
            <Medal size={20} color="#f59e0b" />
            <Text style={styles.statValue}>{stats.predictions.total}</Text>
            <Text style={styles.statLabel}>Palpites</Text>
          </View>
        </View>

        {/* Streak Bonus Info */}
        {stats.currentStreak >= 3 && (
          <View style={styles.streakBonus}>
            <Flame size={16} color="#ef4444" />
            <Text style={styles.streakBonusText}>
              🔥 Bônus de sequência ativo! +2 pontos por acerto
            </Text>
          </View>
        )}
      </LinearGradient>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "upcoming" && styles.tabActive]}
        onPress={() => setActiveTab("upcoming")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "upcoming" && styles.tabTextActive,
          ]}
        >
          📅 Próximos Jogos
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "history" && styles.tabActive]}
        onPress={() => setActiveTab("history")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "history" && styles.tabTextActive,
          ]}
        >
          📊 Histórico
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderUpcomingMatches = () => {
    if (upcomingMatches.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⚽</Text>
          <Text style={styles.emptyTitle}>Nenhum jogo para palpitar</Text>
          <Text style={styles.emptySubtitle}>
            Volte mais tarde para ver os próximos jogos disponíveis
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={upcomingMatches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PredictionCard match={item} onPredictionMade={handleRefresh} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderHistory = () => {
    if (predictions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Sem histórico ainda</Text>
          <Text style={styles.emptySubtitle}>
            Seus palpites aparecerão aqui após as partidas terminarem
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={predictions}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PredictionCard
            match={{
              id: item.matchId,
              homeTeam: item.homeTeam,
              awayTeam: item.awayTeam,
              competition: item.competition,
              date: item.matchDate,
              status: item.result.type !== "pending" ? "FT" : undefined,
              homeScore: item.result.actualHomeScore,
              awayScore: item.result.actualAwayScore,
            }}
            compact
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>🎯 Palpites</Text>
          <Text style={styles.headerSubtitle}>Teste seus conhecimentos</Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* Stats Card */}
      {renderStatsCard()}

      {/* Tabs */}
      {renderTabs()}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {activeTab === "upcoming" ? renderUpcomingMatches() : renderHistory()}
        </View>
      )}

      {/* Leaderboard Modal */}
      <LeaderboardModal
        visible={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#888",
    fontSize: 12,
  },
  headerRight: {
    width: 40,
  },
  statsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pointsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  totalPoints: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  pointsLabel: {
    color: "#888",
    fontSize: 14,
  },
  leaderboardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  leaderboardButtonText: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#888",
    fontSize: 11,
  },
  streakBonus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  streakBonusText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.5)",
  },
  tabText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#22c55e",
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
});

export default PredictionsScreen;
