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

/**
 * Get localized label for live period based on status code
 * Supports soccer (1H, 2H) and basketball (Q1-Q4, OT)
 */
const getLivePeriodLabel = (statusShort: string): string => {
  switch (statusShort) {
    case "1H":
      return "1º TEMPO";
    case "2H":
      return "2º TEMPO";
    case "Q1":
      return "1º QUARTO";
    case "Q2":
      return "2º QUARTO";
    case "Q3":
      return "3º QUARTO";
    case "Q4":
      return "4º QUARTO";
    default:
      if (statusShort.startsWith("OT")) {
        const otNum = statusShort.replace("OT", "");
        return otNum ? `PRORROG. ${otNum}` : "PRORROGAÇÃO";
      }
      return statusShort;
  }
};

interface MatchCardProps {
  match: Match;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const statusShort = match.fixture.status.short;
  const isHalfTime = statusShort === "HT";

  // Check if game is live (soccer: 1H, 2H, HT | basketball: Q1, Q2, Q3, Q4, OT)
  const isLive =
    statusShort === "1H" ||
    statusShort === "2H" ||
    statusShort === "HT" ||
    statusShort === "Q1" ||
    statusShort === "Q2" ||
    statusShort === "Q3" ||
    statusShort === "Q4" ||
    statusShort.startsWith("OT");

  const isFinished = ["FT", "AET", "PEN"].includes(statusShort);
  const isScheduled = ["NS", "TBD", "TIMED"].includes(statusShort);
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
              {match.league.logo ? (
                <Image
                  source={{ uri: match.league.logo }}
                  style={styles.leagueLogo}
                />
              ) : (
                <Trophy size={14} color="#a1a1aa" style={{ marginRight: 6 }} />
              )}
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
                    AO VIVO
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
                  toggleFavoriteTeam(match.teams.home.id, {
                    name: match.teams.home.name,
                    logo: match.teams.home.logo,
                    country: match.league.country || 'Unknown',
                  });
                }}
                style={styles.favoriteButton}>
                <Star
                  size={14}
                  color={isHomeFavorite ? "#FBBF24" : "rgba(255,255,255,0.2)"}
                  fill={isHomeFavorite ? "#FBBF24" : "transparent"}
                />
              </TouchableOpacity>

              <View style={[
                styles.teamLogoWrapper,
                match.teams.home.colors?.primary && {
                  borderColor: `#${match.teams.home.colors.primary}`,
                  borderWidth: 2,
                  borderRadius: 32,
                }
              ]}>
                <LinearGradient
                  colors={[
                    match.teams.home.colors?.primary 
                      ? `#${match.teams.home.colors.primary}20` 
                      : "rgba(255,255,255,0.1)", 
                    "rgba(255,255,255,0.03)"
                  ]}
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
                  
                  {/* Win Probability Bar */}
                  {match.probabilities && (
                    <View style={styles.probabilityContainer}>
                      <View style={styles.probabilityBar}>
                        <View 
                          style={[
                            styles.probabilitySegment, 
                            styles.probabilityHome,
                            { flex: match.probabilities.home }
                          ]} 
                        />
                        <View 
                          style={[
                            styles.probabilitySegment, 
                            styles.probabilityDraw,
                            { flex: match.probabilities.draw }
                          ]} 
                        />
                        <View 
                          style={[
                            styles.probabilitySegment, 
                            styles.probabilityAway,
                            { flex: match.probabilities.away }
                          ]} 
                        />
                      </View>
                      <View style={styles.probabilityLabels}>
                        <Text style={styles.probabilityTextHome}>
                          {match.probabilities.home.toFixed(0)}%
                        </Text>
                        <Text style={styles.probabilityTextDraw}>
                          {match.probabilities.draw.toFixed(0)}%
                        </Text>
                        <Text style={styles.probabilityTextAway}>
                          {match.probabilities.away.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View
                    style={[styles.scoreBox, isLive && styles.scoreBoxLive]}>
                    {/* Home Score with Penalties */}
                    <View style={styles.scoreWithPenalty}>
                      <Text
                        style={[
                          styles.scoreNumber,
                          isLive && styles.scoreNumberLive,
                        ]}>
                        {match.goals.home ?? 0}
                      </Text>
                      {match.score?.penalties && match.score.penalties.home !== null && (
                        <Text style={styles.penaltyScore}>
                          ({match.score.penalties.home})
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.scoreDivider,
                        isLive && styles.scoreDividerLive,
                      ]}
                    />
                    {/* Away Score with Penalties */}
                    <View style={styles.scoreWithPenalty}>
                      {match.score?.penalties && match.score.penalties.away !== null && (
                        <Text style={styles.penaltyScore}>
                          ({match.score.penalties.away})
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.scoreNumber,
                          isLive && styles.scoreNumberLive,
                        ]}>
                        {match.goals.away ?? 0}
                      </Text>
                    </View>
                  </View>
                  
                  {isLive && (
                    <Text style={styles.liveTimer}>
                      {match.fixture.status.elapsed !== undefined && 
                       !match.fixture.status.short.startsWith("Q") && 
                       !match.fixture.status.short.startsWith("OT")
                        ? `${match.fixture.status.elapsed}'${
                            match.fixture.status.elapsedSeconds !== undefined
                              ? `:${match.fixture.status.elapsedSeconds.toString().padStart(2, "0")}`
                              : ""
                          }`
                        : getLivePeriodLabel(match.fixture.status.short)}
                    </Text>
                  )}

                  {!isLive && (
                    <>
                      <Text style={styles.statusLabel}>
                        {getStatusLabel(match.fixture.status.short)}
                      </Text>
                      {/* Half-time score for finished games */}
                      {isFinished && 
                       match.score?.halftime?.home !== null && 
                       match.score?.halftime?.away !== null && (
                        <Text style={styles.halftimeScore}>
                          (HT: {match.score?.halftime?.home}-{match.score?.halftime?.away})
                        </Text>
                      )}
                    </>
                  )}
                  {isLive && match.fixture.status.short !== "HT" && (
                     <Text style={styles.livePeriod}>
                       {getLivePeriodLabel(match.fixture.status.short)}
                     </Text>
                  )}
                </>
              )}
            </View>

            {/* Away Team */}
            <View style={styles.teamSection}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  toggleFavoriteTeam(match.teams.away.id, {
                    name: match.teams.away.name,
                    logo: match.teams.away.logo,
                    country: match.league.country || 'Unknown',
                  });
                }}
                style={styles.favoriteButton}>
                <Star
                  size={14}
                  color={isAwayFavorite ? "#FBBF24" : "rgba(255,255,255,0.2)"}
                  fill={isAwayFavorite ? "#FBBF24" : "transparent"}
                />
              </TouchableOpacity>

              <View style={[
                styles.teamLogoWrapper,
                match.teams.away.colors?.primary && {
                  borderColor: `#${match.teams.away.colors.primary}`,
                  borderWidth: 2,
                  borderRadius: 32,
                }
              ]}>
                <LinearGradient
                  colors={[
                    match.teams.away.colors?.primary 
                      ? `#${match.teams.away.colors.primary}20` 
                      : "rgba(255,255,255,0.1)", 
                    "rgba(255,255,255,0.03)"
                  ]}
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

          {/* Stats Preview Section: Form + Scorers */}
          {(match.teams.home.form || match.teams.away.form || match.scoringSummary?.length) && (
            <View style={styles.statsPreview}>
              {/* Team Forms */}
              {(match.teams.home.form || match.teams.away.form) && (
                <View style={styles.formRow}>
                  <View style={styles.formTeam}>
                    <Text style={styles.formLabel}>CASA</Text>
                    {match.teams.home.form && (
                      <View style={styles.formDots}>
                        {match.teams.home.form.slice(-5).split("").map((char, i) => (
                          <View
                            key={`home-${i}`}
                            style={[
                              styles.formDot,
                              {
                                backgroundColor:
                                  char === "V" || char === "W"
                                    ? "#22c55e"
                                    : char === "E" || char === "D"
                                    ? "#eab308"
                                    : "#ef4444",
                              },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={styles.formTeam}>
                    <Text style={styles.formLabel}>FORA</Text>
                    {match.teams.away.form && (
                      <View style={styles.formDots}>
                        {match.teams.away.form.slice(-5).split("").map((char, i) => (
                          <View
                            key={`away-${i}`}
                            style={[
                              styles.formDot,
                              {
                                backgroundColor:
                                  char === "V" || char === "W"
                                    ? "#22c55e"
                                    : char === "E" || char === "D"
                                    ? "#eab308"
                                    : "#ef4444",
                              },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Scorers Summary */}
              {match.scoringSummary && match.scoringSummary.length > 0 && (
                <View style={styles.scorersRow}>
                  {match.scoringSummary.slice(0, 3).map((scorer, index) => (
                    <View
                      key={`scorer-${index}`}
                      style={[
                        styles.scorerBadge,
                        scorer.team === "home"
                          ? styles.scorerBadgeHome
                          : styles.scorerBadgeAway,
                      ]}
                    >
                      <Text style={styles.scorerIcon}>⚽</Text>
                      <Text style={styles.scorerName} numberOfLines={1}>
                        {scorer.player.split(" ").pop()}'
                      </Text>
                      <Text style={styles.scorerMinute}>{scorer.minute}</Text>
                    </View>
                  ))}
                  {match.scoringSummary.length > 3 && (
                    <Text style={styles.moreScorers}>
                      +{match.scoringSummary.length - 3}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

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
    // NBA Basketball quarters
    case "Q1":
      return "1º Quarto";
    case "Q2":
      return "2º Quarto";
    case "Q3":
      return "3º Quarto";
    case "Q4":
      return "4º Quarto";
    default:
      // Handle overtime (OT, OT2, OT3, etc.)
      if (status.startsWith("OT")) {
        const otNum = status.replace("OT", "");
        return otNum ? `Prorrogação ${otNum}` : "Prorrogação";
      }
      return status;
  }
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    height: 32, // Definindo altura para garantir alinhamento vertical consistente
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: "100%",
  },
  notifyButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  notifyButtonActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  leagueBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingVertical: 0, // Removendo padding vertical para usar alignItems do pai
    flex: 1,
    marginRight: 8,
    height: "100%",
  },
  leagueLogo: {
    width: 20,
    height: 20,
    resizeMode: "contain",
    marginRight: 8,
    opacity: 0.9,
  },
  leagueName: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    flex: 1,
    textAlignVertical: "center", // Garante alinhamento vertical no Android
  },

  // Status badges
  halfTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 146, 60, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(251, 146, 60, 0.3)",
    gap: 4,
  },
  halfTimeIcon: {
    fontSize: 10,
  },
  halfTimeText: {
    color: "#fb923c",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ef4444",
    marginRight: 6,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  liveText: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  finishedBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  finishedText: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  scheduledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 6,
  },
  scheduledText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "600",
  },

  // Match Content
  matchContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 4,
  },

  // Team Section
  teamSection: {
    flex: 1,
    alignItems: "center",
    maxWidth: 100,
  },
  favoriteButton: {
    position: "absolute",
    top: -10,
    right: 0,
    zIndex: 20,
    padding: 5,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  teamLogoWrapper: {
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  teamLogoGlow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  teamLogo: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
  teamName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 8,
  },
  homeIndicator: {
    marginTop: 4,
  },
  homeIndicatorText: {
    color: "#22c55e",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    opacity: 0.8,
  },
  awayIndicator: {
    marginTop: 4,
  },
  awayIndicatorText: {
    color: "#fbbf24",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    opacity: 0.8,
  },

  // Center / Score Section
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingTop: 4,
  },
  vsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  vsText: {
    color: "#52525b",
    fontSize: 14,
    fontWeight: "800",
    fontStyle: "italic",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dateText: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "600",
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreBoxLive: {
    // Glow effect handled by text shadow
  },
  liveTimer: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6,
    textShadowColor: "rgba(34, 197, 94, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    fontVariant: ["tabular-nums"],
  },
  livePeriod: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  scoreNumber: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    minWidth: 28,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  scoreNumberLive: {
    color: "#fff",
    textShadowColor: "rgba(34, 197, 94, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  scoreDivider: {
    width: 2,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 12,
    borderRadius: 1,
  },
  scoreDividerLive: {
    backgroundColor: "rgba(34, 197, 94, 0.5)",
    height: 24,
  },
  statusLabel: {
    color: "#71717a",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  // Score with penalty container
  scoreWithPenalty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  // Penalty shootout score style
  penaltyScore: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 2,
    opacity: 0.9,
  },

  // Tap hint
  tapHint: {
    color: "#52525b",
    fontSize: 10,
    textAlign: "center",
    marginTop: 12,
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
  
  // Stats Preview Section
  statsPreview: {
    marginTop: 16,
    marginBottom: 8,
    gap: 10,
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  formTeam: {
    alignItems: "center",
    gap: 4,
  },
  formLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#71717a",
    letterSpacing: 0.5,
  },
  formDots: {
    flexDirection: "row",
    gap: 3,
  },
  formDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  scorersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  scorerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  scorerBadgeHome: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  scorerBadgeAway: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.25)",
  },
  scorerIcon: {
    fontSize: 10,
  },
  scorerName: {
    fontSize: 10,
    fontWeight: "600",
    color: "#e4e4e7",
    maxWidth: 60,
  },
  scorerMinute: {
    fontSize: 9,
    fontWeight: "500",
    color: "#71717a",
  },
  moreScorers: {
    fontSize: 10,
    fontWeight: "600",
    color: "#71717a",
    paddingHorizontal: 6,
  },

  // Probability Bar Styles
  probabilityContainer: {
    marginTop: 12,
    width: "100%",
    paddingHorizontal: 4,
  },
  probabilityBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  probabilitySegment: {
    height: "100%",
  },
  probabilityHome: {
    backgroundColor: "#22c55e",
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  probabilityDraw: {
    backgroundColor: "#71717a",
  },
  probabilityAway: {
    backgroundColor: "#3b82f6",
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  probabilityLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  probabilityTextHome: {
    fontSize: 9,
    fontWeight: "700",
    color: "#22c55e",
  },
  probabilityTextDraw: {
    fontSize: 9,
    fontWeight: "700",
    color: "#71717a",
  },
  probabilityTextAway: {
    fontSize: 9,
    fontWeight: "700",
    color: "#3b82f6",
  },

  // Half-time Score Style
  halftimeScore: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
    fontStyle: "italic",
  },
});

