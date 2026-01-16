import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Trophy,
  Target,
  TrendingUp,
  Flame,
  Medal,
  Users,
  Calendar,
  History,
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

  const renderStatsHeader = () => {
    if (!stats) return null;

    return (
      <View style={styles.premiumHeaderContainer}>
        {/* Background Gradients */}
        <LinearGradient
          colors={["#052e16", "#09090b"]} // Verde escuro para preto
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        
        {/* Decorative Glow */}
        <View style={styles.headerGlow} />

        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          {/* Top Bar */}
          <View style={styles.navigationBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <BlurView intensity={20} tint="light" style={styles.blurButton}>
                <ChevronLeft size={24} color="#fff" />
              </BlurView>
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={styles.screenTitle}>Central de Palpites</Text>
            </View>

            <TouchableOpacity 
              style={styles.globalRankButton}
              onPress={() => setShowLeaderboard(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#fbbf24', '#d97706']}
                style={styles.globalRankGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Trophy size={16} color="#451a03" strokeWidth={2.5} />
                <Text style={styles.globalRankText}>RANK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* User Stats - Hero Section */}
          <View style={styles.heroStatsContainer}>
            <View style={styles.mainPointsBadge}>
              <LinearGradient
                colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']}
                style={styles.pointsCircle}
              >
                <Text style={styles.pointsValue}>{stats.totalPoints}</Text>
                <Text style={styles.pointsLabel}>PONTOS</Text>
              </LinearGradient>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <TrendingUp size={16} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.miniStatValue}>{stats.accuracy}%</Text>
                  <Text style={styles.miniStatLabel}>Precisão</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.miniStat}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                  <Target size={16} color="#22c55e" />
                </View>
                <View>
                  <Text style={styles.miniStatValue}>{stats.predictions.exact}</Text>
                  <Text style={styles.miniStatLabel}>Cravadas</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.miniStat}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Flame size={16} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.miniStatValue}>{stats.currentStreak}</Text>
                  <Text style={styles.miniStatLabel}>Sequência</Text>
                </View>
              </View>
            </View>

            {stats.currentStreak >= 3 && (
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']}
                style={styles.streakAlert}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Flame size={14} color="#ef4444" fill="#ef4444" />
                <Text style={styles.streakAlertText}>
                  FIRE MODE! Ganhe pontos em dobro no próximo acerto!
                </Text>
              </LinearGradient>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsWrapper}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab("upcoming")}
          activeOpacity={0.8}
        >
          {activeTab === "upcoming" && (
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          )}
          <View style={styles.tabContent}>
            <Calendar 
              size={16} 
              color={activeTab === "upcoming" ? "#fff" : "#71717a"} 
            />
            <Text style={[
              styles.tabText,
              activeTab === "upcoming" ? styles.tabTextActive : styles.tabTextInactive
            ]}>Próximos</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab("history")}
          activeOpacity={0.8}
        >
           {activeTab === "history" && (
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          )}
          <View style={styles.tabContent}>
            <History 
              size={16} 
              color={activeTab === "history" ? "#fff" : "#71717a"} 
            />
            <Text style={[
              styles.tabText,
              activeTab === "history" ? styles.tabTextActive : styles.tabTextInactive
            ]}>Histórico</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      );
    }

    if (activeTab === "upcoming") {
      if (upcomingMatches.length === 0) {
        return (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.1)', 'transparent']}
              style={styles.emptyIconBg}
            >
              <Target size={48} color="#22c55e" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Tudo pronto por enquanto</Text>
            <Text style={styles.emptySubtitle}>
              Nenhum jogo novo para palpitar. Volte mais tarde!
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#22c55e" />
          }
        />
      );
    }

    // History Tab
    if (predictions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <History size={48} color="#3b82f6" />
          </View>
          <Text style={styles.emptyTitle}>Sem histórico</Text>
          <Text style={styles.emptySubtitle}>
            Seus palpites finalizados aparecerão aqui.
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#22c55e" />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {renderStatsHeader()}
      
      <View style={styles.mainContent}>
        {renderTabs()}
        {renderContent()}
      </View>

      <LeaderboardModal
        visible={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  premiumHeaderContainer: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    marginBottom: -20, // Negative margin for overlap
    zIndex: 10,
  },
  headerGlow: {
    position: 'absolute',
    top: -100,
    left: width * 0.2,
    width: width * 0.6,
    height: 300,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 999,
    transform: [{ scaleX: 2 }],
  },
  safeAreaHeader: {
    zIndex: 2,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  blurButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  titleContainer: {
    alignItems: 'center',
  },
  screenTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  globalRankButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  globalRankGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  globalRankText: {
    color: '#451a03',
    fontSize: 10,
    fontWeight: '800',
  },
  heroStatsContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  mainPointsBadge: {
    marginBottom: 20,
    alignItems: 'center',
  },
  pointsCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  pointsValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
  },
  pointsLabel: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 90,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  miniStatLabel: {
    color: '#a1a1aa',
    fontSize: 10,
  },
  streakAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  streakAlertText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#09090b',
    paddingTop: 32, // Space for overlap
  },
  tabsWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabTextInactive: {
    color: '#71717a',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#71717a',
    marginTop: 12,
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#71717a',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
  },
});

export default PredictionsScreen;
