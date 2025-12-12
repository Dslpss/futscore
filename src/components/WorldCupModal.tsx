import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, MapPin, Calendar, Users, ChevronRight } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { espnApi } from "../services/espnApi";
import { EspnLiveEvent } from "../types";

const { width, height } = Dimensions.get("window");

interface WorldCupModalProps {
  visible: boolean;
  onClose: () => void;
}

interface GroupedMatches {
  [dateKey: string]: EspnLiveEvent[];
}

// World Cup trophy component
const WorldCupTrophy = () => (
  <View style={styles.trophyContainer}>
    <Text style={styles.trophyEmoji}>🏆</Text>
    <View style={styles.trophyGlow} />
  </View>
);

// Animated flag component
const FlagBadge = ({ emoji, delay = 0 }: { emoji: string; delay?: number }) => (
  <View style={[styles.flagBadge, { marginLeft: delay * 4 }]}>
    <Text style={styles.flagEmoji}>{emoji}</Text>
  </View>
);

export const WorldCupModal: React.FC<WorldCupModalProps> = ({
  visible,
  onClose,
}) => {
  const [matches, setMatches] = useState<EspnLiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = async () => {
    try {
      const events = await espnApi.getWorldCupEvents();
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setMatches(events);
    } catch (error) {
      console.error("[WorldCupModal] Error fetching matches:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchMatches();
    }
  }, [visible]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  // Group matches by date
  const groupedMatches: GroupedMatches = matches.reduce((acc, match) => {
    const date = new Date(match.date);
    const dateKey = date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(match);
    return acc;
  }, {} as GroupedMatches);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMatch = (match: EspnLiveEvent, index: number) => {
    const home = match.competitors.find((c) => c.homeAway === "home");
    const away = match.competitors.find((c) => c.homeAway === "away");
    const isLive = match.status === "in";
    const isFinished = match.status === "post";

    return (
      <TouchableOpacity 
        key={match.id} 
        activeOpacity={0.85}
        style={styles.matchCardWrapper}
      >
        <LinearGradient
          colors={
            isLive 
              ? ["rgba(239, 68, 68, 0.2)", "rgba(239, 68, 68, 0.05)"]
              : isFinished
              ? ["rgba(34, 197, 94, 0.15)", "rgba(34, 197, 94, 0.05)"]
              : ["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.matchCard}
        >
          {/* Live indicator */}
          {isLive && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>AO VIVO</Text>
            </View>
          )}

          {/* Time Badge */}
          <View style={styles.timeBadgeContainer}>
            <LinearGradient
              colors={
                isLive 
                  ? ["#ef4444", "#dc2626"]
                  : isFinished
                  ? ["#22c55e", "#16a34a"]
                  : ["#FFD700", "#FFA500"]
              }
              style={styles.timeBadge}
            >
              <Text style={styles.timeText}>
                {isLive ? match.clock || "⚽" : isFinished ? "FIM" : formatTime(match.date)}
              </Text>
            </LinearGradient>
          </View>

          {/* Teams Container */}
          <View style={styles.teamsMainContainer}>
            {/* Home Team */}
            <View style={styles.teamContainer}>
              <View style={styles.teamLogoWrapper}>
                <Image
                  source={{ uri: home?.logo || "" }}
                  style={styles.teamLogo}
                  resizeMode="contain"
                />
                <View style={styles.teamLogoGlow} />
              </View>
              <Text style={styles.teamName} numberOfLines={2}>
                {home?.displayName || "A Definir"}
              </Text>
              {(isLive || isFinished) && (
                <Text style={[styles.scoreText, home?.winner && styles.winnerScore]}>
                  {home?.score || "0"}
                </Text>
              )}
            </View>

            {/* VS Divider */}
            <View style={styles.vsDivider}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            {/* Away Team */}
            <View style={styles.teamContainer}>
              <View style={styles.teamLogoWrapper}>
                <Image
                  source={{ uri: away?.logo || "" }}
                  style={styles.teamLogo}
                  resizeMode="contain"
                />
                <View style={styles.teamLogoGlow} />
              </View>
              <Text style={styles.teamName} numberOfLines={2}>
                {away?.displayName || "A Definir"}
              </Text>
              {(isLive || isFinished) && (
                <Text style={[styles.scoreText, away?.winner && styles.winnerScore]}>
                  {away?.score || "0"}
                </Text>
              )}
            </View>
          </View>

          {/* Match Info Footer */}
          <View style={styles.matchFooter}>
            {match.location && (
              <View style={styles.locationBadge}>
                <MapPin size={10} color="#9CA3AF" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {match.location}
                </Text>
              </View>
            )}
            <ChevronRight size={16} color="#4B5563" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient
          colors={["#0a0a0f", "#0d1117", "#161b22"]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        {/* Premium Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={["rgba(255, 215, 0, 0.15)", "transparent"]}
            style={styles.headerGlow}
          />
          
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <WorldCupTrophy />
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <BlurView intensity={20} style={styles.closeButtonBlur}>
                  <X size={20} color="#FFF" />
                </BlurView>
              </TouchableOpacity>
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>FIFA WORLD CUP</Text>
              <LinearGradient
                colors={["#FFD700", "#FFA500", "#FF8C00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.yearBadge}
              >
                <Text style={styles.yearText}>2026</Text>
              </LinearGradient>
            </View>

            <View style={styles.hostCountries}>
              <FlagBadge emoji="🇺🇸" delay={0} />
              <FlagBadge emoji="🇨🇦" delay={1} />
              <FlagBadge emoji="🇲🇽" delay={2} />
              <Text style={styles.hostText}>Estados Unidos • Canadá • México</Text>
            </View>

            {/* Stats Bar */}
            {!loading && matches.length > 0 && (
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <Users size={14} color="#FFD700" />
                  <Text style={styles.statValue}>48</Text>
                  <Text style={styles.statLabel}>Seleções</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Calendar size={14} color="#FFD700" />
                  <Text style={styles.statValue}>{matches.length}</Text>
                  <Text style={styles.statLabel}>Jogos</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MapPin size={14} color="#FFD700" />
                  <Text style={styles.statValue}>16</Text>
                  <Text style={styles.statLabel}>Cidades</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="large" color="#FFD700" />
            </View>
            <Text style={styles.loadingText}>Carregando jogos...</Text>
            <Text style={styles.loadingSubtext}>Buscando calendário completo</Text>
          </View>
        ) : matches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏟️</Text>
            <Text style={styles.emptyTitle}>Calendário Indisponível</Text>
            <Text style={styles.emptySubtitle}>
              Os jogos da Copa do Mundo 2026 serão exibidos aqui quando estiverem disponíveis
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFD700"
                colors={["#FFD700"]}
              />
            }
          >
            {/* Grouped Matches */}
            {Object.entries(groupedMatches).map(([date, dateMatches], groupIndex) => (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <View style={styles.dateLine} />
                  <View style={styles.dateBadge}>
                    <Calendar size={12} color="#FFD700" />
                    <Text style={styles.dateText}>{date}</Text>
                  </View>
                  <View style={styles.dateLine} />
                </View>
                <View style={styles.matchesGrid}>
                  {dateMatches.map((match, index) => renderMatch(match, index))}
                </View>
              </View>
            ))}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                ⚽ Dados fornecidos pela ESPN
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  decorativeCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 215, 0, 0.03)",
    top: -100,
    right: -100,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 165, 0, 0.02)",
    bottom: 100,
    left: -50,
  },
  decorativeCircle3: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(220, 38, 38, 0.03)",
    top: "40%",
    right: -30,
  },
  header: {
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 50,
    paddingBottom: 20,
    position: "relative",
  },
  headerGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  trophyContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  trophyEmoji: {
    fontSize: 48,
  },
  trophyGlow: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    top: -5,
  },
  closeButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  closeButtonBlur: {
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  yearBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  yearText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 1,
  },
  hostCountries: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  flagBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  flagEmoji: {
    fontSize: 16,
  },
  hostText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginLeft: 8,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.1)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    color: "#6B7280",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  loadingSubtext: {
    color: "#6B7280",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  retryText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  dateText: {
    color: "#FFD700",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  matchesGrid: {
    gap: 12,
  },
  matchCardWrapper: {
    borderRadius: 16,
    overflow: "hidden",
  },
  matchCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  liveIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFF",
  },
  liveText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timeBadgeContainer: {
    alignItems: "flex-start",
    marginBottom: 16,
  },
  timeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "800",
  },
  teamsMainContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamContainer: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  teamLogoWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  teamLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  teamLogoGlow: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    zIndex: -1,
  },
  teamName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 100,
  },
  scoreText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  winnerScore: {
    color: "#22C55E",
  },
  vsDivider: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  vsText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "700",
  },
  matchFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  locationText: {
    color: "#6B7280",
    fontSize: 11,
    flex: 1,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    color: "#4B5563",
    fontSize: 12,
  },
});
