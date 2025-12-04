import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { Match } from "../types";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import {
  Star,
  Clock,
  Calendar,
  Tv,
  Trophy,
  Bell,
  BellRing,
  BellOff,
  X,
  Check,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useFavorites } from "../context/FavoritesContext";
import { MatchStatsModal } from "./MatchStatsModal";

const { width } = Dimensions.get("window");

interface MatchCardProps {
  match: Match;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const isHalfTime = match.fixture.status.short === "HT";
  const isLive =
    match.fixture.status.short === "1H" ||
    match.fixture.status.short === "2H" ||
    match.fixture.status.short === "HT";
  const isFinished = ["FT", "AET", "PEN"].includes(match.fixture.status.short);
  const isScheduled = ["NS", "TBD", "TIMED"].includes(
    match.fixture.status.short
  );
  const {
    isFavoriteTeam,
    toggleFavoriteTeam,
    isFavoriteMatch,
    toggleFavoriteMatch,
  } = useFavorites();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [notifyModalVisible, setNotifyModalVisible] = React.useState(false);

  const isHomeFavorite = isFavoriteTeam(match.teams.home.id);
  const isAwayFavorite = isFavoriteTeam(match.teams.away.id);
  const isMatchFavorite = isFavoriteMatch(match.fixture.id);

  // Handler para abrir modal de confirmação
  const handleToggleFavoriteMatch = (e: any) => {
    e.stopPropagation();
    setNotifyModalVisible(true);
  };

  // Confirmar toggle de notificação
  const confirmToggleFavoriteMatch = () => {
    const favoriteMatchData = {
      fixtureId: match.fixture.id,
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      date: match.fixture.date,
      leagueName: match.league.name,
      msnGameId: match.fixture.msnGameId,
    };

    toggleFavoriteMatch(favoriteMatchData);
    setNotifyModalVisible(false);
  };

  // Determine gradient colors based on match state
  const gradientColors = isLive
    ? (["#1a2e1a", "#162216", "#0f1a0f"] as const)
    : (["#1a1a2e", "#16213e", "#0f0f1a"] as const);

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}>
          {/* Header: League Badge & Status */}
          <View style={styles.header}>
            <View style={styles.leagueBadge}>
              <Image
                source={{ uri: match.league.logo }}
                style={styles.leagueLogo}
              />
              <Text style={styles.leagueName} numberOfLines={1}>
                {match.league.name}
              </Text>
            </View>

            <View style={styles.headerRight}>
              {/* Botão de notificação do jogo */}
              <TouchableOpacity
                onPress={handleToggleFavoriteMatch}
                style={[
                  styles.notifyButton,
                  isMatchFavorite && styles.notifyButtonActive,
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Bell
                  size={16}
                  color={isMatchFavorite ? "#fbbf24" : "#71717a"}
                  fill={isMatchFavorite ? "#fbbf24" : "transparent"}
                />
              </TouchableOpacity>

              {isHalfTime ? (
                <View style={styles.halfTimeBadge}>
                  <Text style={styles.halfTimeIcon}>☕</Text>
                  <Text style={styles.halfTimeText}>INTERVALO</Text>
                </View>
              ) : isLive ? (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>
                    AO VIVO •{" "}
                    {match.fixture.status.short === "1H"
                      ? "1º TEMPO"
                      : "2º TEMPO"}
                    {match.fixture.status.elapsed
                      ? ` ${match.fixture.status.elapsed}'`
                      : ""}
                  </Text>
                </View>
              ) : isFinished ? (
                <View style={styles.finishedBadge}>
                  <Text style={styles.finishedText}>ENCERRADO</Text>
                </View>
              ) : (
                <View style={styles.scheduledBadge}>
                  <Clock size={12} color="#a1a1aa" />
                  <Text style={styles.scheduledText}>
                    {format(new Date(match.fixture.date), "HH:mm")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Match Content */}
          <View style={styles.matchContent}>
            {/* Home Team */}
            <View style={styles.teamSection}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  toggleFavoriteTeam(match.teams.home.id);
                }}
                style={styles.favoriteButton}>
                <Star
                  size={14}
                  color={isHomeFavorite ? "#FBBF24" : "rgba(255,255,255,0.2)"}
                  fill={isHomeFavorite ? "#FBBF24" : "transparent"}
                />
              </TouchableOpacity>

              <View style={styles.teamLogoWrapper}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.03)"]}
                  style={styles.teamLogoGlow}>
                  <Image
                    source={{ uri: match.teams.home.logo }}
                    style={styles.teamLogo}
                  />
                </LinearGradient>
              </View>

              <Text style={styles.teamName} numberOfLines={2}>
                {match.teams.home.name}
              </Text>

              <View style={styles.homeIndicator}>
                <Text style={styles.homeIndicatorText}>CASA</Text>
              </View>
            </View>

            {/* Score / VS Section */}
            <View style={styles.centerSection}>
              {["NS", "TBD", "TIMED", "PST", "CANC", "ABD", "WO"].includes(
                match.fixture.status.short
              ) ? (
                <>
                  <View style={styles.vsContainer}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>
                  <View style={styles.dateContainer}>
                    <Calendar size={10} color="#71717a" />
                    <Text style={styles.dateText}>
                      {format(new Date(match.fixture.date), "dd/MM")}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View
                    style={[styles.scoreBox, isLive && styles.scoreBoxLive]}>
                    <Text
                      style={[
                        styles.scoreNumber,
                        isLive && styles.scoreNumberLive,
                      ]}>
                      {match.goals.home ?? 0}
                    </Text>
                    <View
                      style={[
                        styles.scoreDivider,
                        isLive && styles.scoreDividerLive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.scoreNumber,
                        isLive && styles.scoreNumberLive,
                      ]}>
                      {match.goals.away ?? 0}
                    </Text>
                  </View>
                  <Text style={styles.statusLabel}>
                    {getStatusLabel(match.fixture.status.short)}
                  </Text>
                </>
              )}
            </View>

            {/* Away Team */}
            <View style={styles.teamSection}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  toggleFavoriteTeam(match.teams.away.id);
                }}
                style={styles.favoriteButton}>
                <Star
                  size={14}
                  color={isAwayFavorite ? "#FBBF24" : "rgba(255,255,255,0.2)"}
                  fill={isAwayFavorite ? "#FBBF24" : "transparent"}
                />
              </TouchableOpacity>

              <View style={styles.teamLogoWrapper}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.03)"]}
                  style={styles.teamLogoGlow}>
                  <Image
                    source={{ uri: match.teams.away.logo }}
                    style={styles.teamLogo}
                  />
                </LinearGradient>
              </View>

              <Text style={styles.teamName} numberOfLines={2}>
                {match.teams.away.name}
              </Text>

              <View style={styles.awayIndicator}>
                <Text style={styles.awayIndicatorText}>FORA</Text>
              </View>
            </View>
          </View>

          {/* Tap hint */}
          <Text style={styles.tapHint}>Toque para ver detalhes</Text>

          {/* Footer: TV Channels & Round */}
          {(match.channels?.length || match.round) && (
            <View style={styles.footer}>
              {/* Round/Week */}
              {match.round && (
                <View style={styles.roundBadge}>
                  <Trophy size={10} color="#a1a1aa" />
                  <Text style={styles.roundText}>{match.round}</Text>
                </View>
              )}

              {/* TV Channels */}
              {match.channels && match.channels.length > 0 && (
                <View style={styles.channelsBadge}>
                  <Tv size={10} color="#60a5fa" />
                  <Text style={styles.channelsText} numberOfLines={1}>
                    {match.channels
                      .slice(0, 2)
                      .map((c) => c.name)
                      .join(", ")}
                    {match.channels.length > 2 &&
                      ` +${match.channels.length - 2}`}
                  </Text>
                </View>
              )}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal de Notificação */}
      <Modal
        visible={notifyModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setNotifyModalVisible(false)}>
        <BlurView intensity={20} tint="dark" style={styles.notifyModalOverlay}>
          <View style={styles.notifyModalContainer}>
            <LinearGradient
              colors={["#1a1a2e", "#16213e", "#0f0f1a"]}
              style={styles.notifyModalContent}>
              {/* Icon */}
              <View
                style={[
                  styles.notifyIconContainer,
                  isMatchFavorite
                    ? styles.notifyIconContainerOff
                    : styles.notifyIconContainerOn,
                ]}>
                {isMatchFavorite ? (
                  <BellOff size={32} color="#ef4444" />
                ) : (
                  <Bell size={32} color="#22c55e" />
                )}
              </View>

              {/* Title */}
              <Text style={styles.notifyModalTitle}>
                {isMatchFavorite
                  ? "Desativar Notificações?"
                  : "Ativar Notificações?"}
              </Text>

              {/* Match Info */}
              <View style={styles.notifyMatchInfo}>
                <View style={styles.notifyTeamsRow}>
                  <Image
                    source={{ uri: match.teams.home.logo }}
                    style={styles.notifyTeamLogo}
                  />
                  <Text style={styles.notifyVsText}>vs</Text>
                  <Image
                    source={{ uri: match.teams.away.logo }}
                    style={styles.notifyTeamLogo}
                  />
                </View>
                <Text style={styles.notifyMatchText}>
                  {match.teams.home.name} vs {match.teams.away.name}
                </Text>
                <Text style={styles.notifyLeagueText}>{match.league.name}</Text>
              </View>

              {/* Description */}
              <Text style={styles.notifyDescription}>
                {isMatchFavorite
                  ? "Você não receberá mais notificações sobre esta partida."
                  : "Você receberá notificações sobre:\n• Início da partida\n• Gols\n• Intervalo\n• Fim de jogo"}
              </Text>

              {/* Buttons */}
              <View style={styles.notifyButtonsRow}>
                <TouchableOpacity
                  style={styles.notifyCancelButton}
                  onPress={() => setNotifyModalVisible(false)}>
                  <X size={18} color="#a1a1aa" />
                  <Text style={styles.notifyCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.notifyConfirmButton,
                    isMatchFavorite
                      ? styles.notifyConfirmButtonOff
                      : styles.notifyConfirmButtonOn,
                  ]}
                  onPress={confirmToggleFavoriteMatch}>
                  <Check size={18} color="#fff" />
                  <Text style={styles.notifyConfirmText}>
                    {isMatchFavorite ? "Desativar" : "Ativar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </BlurView>
      </Modal>

      <MatchStatsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        match={match}
      />
    </>
  );
};

// Helper function for status labels
const getStatusLabel = (status: string): string => {
  switch (status) {
    case "TBD":
      return "A Definir";
    case "NS":
      return "Não Iniciado";
    case "1H":
      return "1º Tempo";
    case "HT":
      return "Intervalo";
    case "2H":
      return "2º Tempo";
    case "ET":
      return "Prorrogação";
    case "BT":
      return "Pênaltis";
    case "P":
      return "Pênaltis";
    case "SUSP":
      return "Suspenso";
    case "INT":
      return "Interrompido";
    case "FT":
      return "Encerrado";
    case "AET":
      return "Prorrogação";
    case "PEN":
      return "Pênaltis";
    case "PST":
      return "Adiado";
    case "CANC":
      return "Cancelado";
    case "ABD":
      return "Abandonado";
    case "AWD":
      return "W.O.";
    case "WO":
      return "W.O.";
    case "LIVE":
      return "Ao Vivo";
    default:
      return status;
  }
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notifyButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  notifyButtonActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
  },
  leagueBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    flex: 1,
    maxWidth: "60%",
  },
  leagueLogo: {
    width: 18,
    height: 18,
    resizeMode: "contain",
    marginRight: 8,
  },
  leagueName: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    flex: 1,
  },

  // Status badges
  halfTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 146, 60, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(251, 146, 60, 0.3)",
    gap: 6,
  },
  halfTimeIcon: {
    fontSize: 12,
  },
  halfTimeText: {
    color: "#fb923c",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
    marginRight: 6,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  liveText: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  finishedBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  finishedText: {
    color: "#22c55e",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  scheduledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  scheduledText: {
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: "700",
  },

  // Match Content
  matchContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  // Team Section
  teamSection: {
    flex: 1,
    alignItems: "center",
    maxWidth: 100,
  },
  favoriteButton: {
    position: "absolute",
    top: -8,
    right: 4,
    zIndex: 20,
    padding: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
  },
  teamLogoWrapper: {
    marginBottom: 10,
  },
  teamLogoGlow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
  },
  teamLogo: {
    width: 42,
    height: 42,
    resizeMode: "contain",
  },
  teamName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 6,
  },
  homeIndicator: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  homeIndicatorText: {
    color: "#22c55e",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  awayIndicator: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.25)",
  },
  awayIndicatorText: {
    color: "#fbbf24",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Center / Score Section
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingTop: 8,
  },
  vsContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  vsText: {
    color: "#52525b",
    fontSize: 16,
    fontWeight: "900",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  dateText: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: "600",
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scoreBoxLive: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  scoreNumber: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    minWidth: 24,
    textAlign: "center",
  },
  scoreNumberLive: {
    color: "#22c55e",
    textShadowColor: "rgba(34, 197, 94, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  scoreDivider: {
    width: 3,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 10,
    borderRadius: 2,
  },
  scoreDividerLive: {
    backgroundColor: "rgba(34, 197, 94, 0.4)",
  },
  statusLabel: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 8,
    letterSpacing: 0.3,
  },

  // Tap hint
  tapHint: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 14,
    fontStyle: "italic",
  },

  // Footer: TV Channels & Round
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    gap: 12,
    flexWrap: "wrap",
  },
  roundBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  roundText: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "600",
  },
  channelsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.2)",
    gap: 5,
    maxWidth: 180,
  },
  channelsText: {
    color: "#60a5fa",
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
  },

  // Modal de Notificação
  notifyModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  notifyModalContainer: {
    width: width * 0.85,
    maxWidth: 340,
  },
  notifyModalContent: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  notifyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  notifyIconContainerOn: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  notifyIconContainerOff: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  notifyModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  notifyMatchInfo: {
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 12,
    width: "100%",
  },
  notifyTeamsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  notifyTeamLogo: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  notifyVsText: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "600",
  },
  notifyMatchText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  notifyLeagueText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "500",
  },
  notifyDescription: {
    color: "#a1a1aa",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  notifyButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  notifyCancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  notifyCancelText: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "600",
  },
  notifyConfirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  notifyConfirmButtonOn: {
    backgroundColor: "#22c55e",
  },
  notifyConfirmButtonOff: {
    backgroundColor: "#ef4444",
  },
  notifyConfirmText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
