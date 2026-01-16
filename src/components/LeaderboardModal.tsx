import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Trophy, Medal, Crown, Flame } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { getLeaderboard, LeaderboardEntry } from "../services/predictionsApi";

const { width, height } = Dimensions.get("window");

interface LeaderboardModalProps {
  visible: boolean;
  onClose: () => void;
}

type LeaderboardType = "total" | "weekly" | "monthly";

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  visible,
  onClose,
}) => {
  const [type, setType] = useState<LeaderboardType>("total");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadLeaderboard();
    }
  }, [visible, type]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getLeaderboard(type, 50);
      setLeaderboard(data.leaderboard);
      setUserRank(data.userRank);
      setUserPoints(data.userPoints);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={20} color="#fbbf24" />;
      case 2:
        return <Medal size={20} color="#94a3b8" />;
      case 3:
        return <Medal size={20} color="#cd7f32" />;
      default:
        return null;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return styles.rank1;
      case 2:
        return styles.rank2;
      case 3:
        return styles.rank3;
      default:
        return null;
    }
  };

  const renderLeaderboardItem = ({
    item,
    index,
  }: {
    item: LeaderboardEntry;
    index: number;
  }) => {
    const isTopThree = item.rank <= 3;

    return (
      <View
        style={[
          styles.leaderboardItem,
          item.isCurrentUser && styles.currentUserItem,
          isTopThree && getRankStyle(item.rank),
        ]}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {getRankIcon(item.rank) || (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text
            style={[styles.userName, item.isCurrentUser && styles.currentUserName]}
            numberOfLines={1}
          >
            {item.name}
            {item.isCurrentUser && " (você)"}
          </Text>
          <View style={styles.userStats}>
            <Text style={styles.userStatText}>
              {item.predictions.total} palpites
            </Text>
            {item.streak > 0 && (
              <View style={styles.streakBadge}>
                <Flame size={10} color="#ef4444" />
                <Text style={styles.streakText}>{item.streak}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Points */}
        <View style={styles.pointsContainer}>
          <Text
            style={[styles.points, item.isCurrentUser && styles.currentUserPoints]}
          >
            {item.points}
          </Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.blurContainer}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={["#171717", "#0a0a0a"]}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <Trophy size={24} color="#fbbf24" />
                <Text style={styles.title}>Ranking</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Type Tabs */}
            <View style={styles.typeTabs}>
              {[
                { key: "total", label: "🏆 Geral" },
                { key: "weekly", label: "📅 Semana" },
                { key: "monthly", label: "📆 Mês" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.typeTab,
                    type === tab.key && styles.typeTabActive,
                  ]}
                  onPress={() => setType(tab.key as LeaderboardType)}
                >
                  <Text
                    style={[
                      styles.typeTabText,
                      type === tab.key && styles.typeTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* User's Position */}
            {userRank && (
              <View style={styles.userPosition}>
                <Text style={styles.userPositionText}>
                  Sua posição: <Text style={styles.userPositionRank}>#{userRank}</Text>
                </Text>
                <Text style={styles.userPositionPoints}>
                  {userPoints} pontos
                </Text>
              </View>
            )}

            {/* Leaderboard List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22c55e" />
              </View>
            ) : leaderboard.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏆</Text>
                <Text style={styles.emptyText}>
                  Nenhum palpite ainda neste período
                </Text>
              </View>
            ) : (
              <FlatList
                data={leaderboard}
                keyExtractor={(item) => item.userId.toString()}
                renderItem={renderLeaderboardItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    height: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalContent: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
  },
  typeTabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
  },
  typeTabActive: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.5)",
  },
  typeTabText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
  },
  typeTabTextActive: {
    color: "#22c55e",
  },
  userPosition: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  userPositionText: {
    color: "#fff",
    fontSize: 14,
  },
  userPositionRank: {
    fontWeight: "bold",
    color: "#22c55e",
  },
  userPositionPoints: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "bold",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  currentUserItem: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  rank1: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  rank2: {
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
  rank3: {
    backgroundColor: "rgba(205, 127, 50, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(205, 127, 50, 0.3)",
  },
  rankContainer: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10,
    marginRight: 12,
  },
  rankText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  currentUserName: {
    color: "#22c55e",
  },
  userStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userStatText: {
    color: "#888",
    fontSize: 11,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  streakText: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "bold",
  },
  pointsContainer: {
    alignItems: "flex-end",
  },
  points: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  currentUserPoints: {
    color: "#22c55e",
  },
  pointsLabel: {
    color: "#888",
    fontSize: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
});

export default LeaderboardModal;
