import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  X,
  MapPin,
  Tv,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudFog,
  Thermometer,
  User,
} from "lucide-react-native";
import { Match } from "../types";
import { api } from "../services/api";
import { LinearGradient } from "expo-linear-gradient";

interface GameDetails {
  venue?: {
    name: string;
    capacity: string;
    city: string;
    country: string;
  };
  channels?: { type: string; names: string[] }[];
  weather?: {
    condition: string;
    detailedCondition: string;
    temperature: number;
    unit: string;
    summary: string;
  };
  homeTeam?: {
    winLossRecord?: { wins: number; losses: number; ties: number };
  };
  awayTeam?: {
    winLossRecord?: { wins: number; losses: number; ties: number };
  };
}

interface MatchStatsModalProps {
  visible: boolean;
  onClose: () => void;
  match: Match | null;
}

const { width } = Dimensions.get("window");

export const MatchStatsModal: React.FC<MatchStatsModalProps> = ({
  visible,
  onClose,
  match: initialMatch,
}) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "lineups" | "goals">(
    "stats"
  );
  const [goals, setGoals] = useState<any[]>([]);
  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);

  useEffect(() => {
    if (visible && initialMatch) {
      loadMatchDetails();
    } else {
      setMatch(null);
      setGameDetails(null);
    }
  }, [visible, initialMatch]);

  const loadMatchDetails = async () => {
    if (!initialMatch) return;

    setLoading(true);
    try {
      const leagueId = initialMatch.league.id?.toString() || "";

      // Check if this is an MSN Sports match by looking for msnGameId or msnId on teams
      // The league.id may be short like "PL", "BSA" but msnGameId will have the full MSN format
      const hasMsnGameId = !!initialMatch.fixture.msnGameId;
      const hasMsnTeamId =
        !!(initialMatch.teams.home as any).msnId ||
        !!(initialMatch.teams.away as any).msnId;
      const isMsnMatch =
        hasMsnGameId ||
        hasMsnTeamId ||
        leagueId.includes("Soccer_") ||
        leagueId.includes("Basketball_");

      console.log(
        `[MatchStatsModal] Match detection - leagueId: ${leagueId}, msnGameId: ${initialMatch.fixture.msnGameId}, isMsnMatch: ${isMsnMatch}`
      );

      if (isMsnMatch) {
        // For MSN matches, fetch lineups and statistics
        console.log(
          "[MatchStatsModal] MSN Sports match detected, fetching data..."
        );

        let enhancedMatch = { ...initialMatch };

        try {
          const { msnSportsApi } = await import("../services/msnSportsApi");

          // Get game ID once for all requests - prefer msnGameId if available
          const gameId =
            initialMatch.fixture.msnGameId ||
            initialMatch.fixture.id.toString();

          console.log(`[MatchStatsModal] Using gameId: ${gameId}`);
          console.log(
            `[MatchStatsModal] Match fixture ID: ${initialMatch.fixture.id}`
          );
          console.log(
            `[MatchStatsModal] Match msnGameId: ${initialMatch.fixture.msnGameId}`
          );

          // Fetch game details (venue, channels, weather)
          const details = await msnSportsApi.getGameDetails(gameId);
          if (details) {
            setGameDetails(details);
            console.log(
              "[MatchStatsModal] Fetched game details:",
              details.venue?.name
            );
          }

          // Fetch lineups
          const { transformMsnLineupsToLineups } = await import(
            "../utils/msnLineupsTransformer"
          );
          console.log(
            `[MatchStatsModal] Fetching lineups for gameId: ${gameId}`
          );
          const msnLineupsData = await msnSportsApi.getLineups(gameId);
          console.log(
            `[MatchStatsModal] Lineups response:`,
            msnLineupsData ? "has data" : "null"
          );

          if (msnLineupsData && msnLineupsData.lineups) {
            const lineups = transformMsnLineupsToLineups(msnLineupsData);
            enhancedMatch.lineups = lineups;
            console.log(
              `[MatchStatsModal] Fetched ${lineups.length} lineups from MSN`
            );
          }

          // Only fetch statistics and timeline if match has started or finished
          const matchStatus = initialMatch.fixture.status.short;
          const isMatchStartedOrFinished = ![
            "NS",
            "TBD",
            "PST",
            "CANC",
            "AWD",
            "WO",
          ].includes(matchStatus);

          if (isMatchStartedOrFinished) {
            // Fetch statistics
            const { transformMsnStatsToStatistics } = await import(
              "../utils/msnStatsTransformer"
            );

            // Map short league IDs to full MSN format
            const leagueIdMap: Record<string, string> = {
              PL: "Soccer_EnglandPremierLeague",
              BL1: "Soccer_GermanyBundesliga",
              SA: "Soccer_ItalySerieA",
              FL1: "Soccer_FranceLigue1",
              PD: "Soccer_SpainLaLiga",
              PPL: "Soccer_PortugalPrimeiraLiga",
              CL: "Soccer_InternationalClubsUEFAChampionsLeague",
              EL: "Soccer_UEFAEuropaLeague",
              BSA: "Soccer_BrazilBrasileiroSerieA",
              NBA: "Basketball_NBA",
            };

            // Get full league ID from map or use the original if it's already in full format
            let fullLeagueId = leagueIdMap[leagueId] || leagueId;

            // If still short and we have msnGameId, extract league from it
            if (
              !fullLeagueId.includes("Soccer_") &&
              !fullLeagueId.includes("Basketball_") &&
              initialMatch.fixture.msnGameId
            ) {
              // Extract from msnGameId format: SportRadar_Soccer_EnglandPremierLeague_2025_Game_12345
              const msnParts = initialMatch.fixture.msnGameId.split("_");
              if (msnParts.length >= 3) {
                // Skip "SportRadar" and reconstruct league ID
                const sportIndex = msnParts.findIndex(
                  (p) => p === "Soccer" || p === "Basketball"
                );
                if (sportIndex !== -1 && msnParts[sportIndex + 1]) {
                  fullLeagueId = `${msnParts[sportIndex]}_${
                    msnParts[sportIndex + 1]
                  }`;
                }
              }
            }

            const sport = fullLeagueId.includes("Basketball")
              ? "Basketball"
              : "Soccer";

            // Extract clean league ID (remove SportRadar_ prefix and _2025 suffix)
            // From: SportRadar_Soccer_SpainLaLiga_2025 -> Soccer_SpainLaLiga
            const cleanLeagueId = fullLeagueId
              .replace(/^SportRadar_/, "") // Remove SportRadar_ prefix
              .replace(/_\d{4}$/, ""); // Remove _2025 suffix

            console.log(
              `[MatchStatsModal] Original leagueId: ${leagueId}, Full leagueId: ${fullLeagueId}, Clean LeagueId: ${cleanLeagueId}`
            );

            const msnStatsData = await msnSportsApi.getStatistics(
              gameId,
              sport,
              cleanLeagueId
            );

            if (msnStatsData && msnStatsData.statistics) {
              // Use msnId from teams if available, otherwise construct from fullLeagueId
              const homeTeamMsnId = (initialMatch.teams.home as any).msnId;
              const awayTeamMsnId = (initialMatch.teams.away as any).msnId;

              const homeTeamId =
                homeTeamMsnId ||
                `SportRadar_${fullLeagueId}_${new Date().getFullYear()}_Team_${
                  initialMatch.teams.home.id
                }`;
              const awayTeamId =
                awayTeamMsnId ||
                `SportRadar_${fullLeagueId}_${new Date().getFullYear()}_Team_${
                  initialMatch.teams.away.id
                }`;

              console.log(`[MatchStatsModal] HomeTeamId: ${homeTeamId}`);
              console.log(`[MatchStatsModal] AwayTeamId: ${awayTeamId}`);

              // Try with full IDs first, if not found, try with just the numeric ID
              let statistics = transformMsnStatsToStatistics(
                msnStatsData,
                homeTeamId,
                awayTeamId
              );

              if (statistics.length === 0) {
                // Try finding by partial match on teamId
                const homeStats = msnStatsData.statistics.find(
                  (s: any) =>
                    s.teamId &&
                    s.teamId.includes(`_${initialMatch.teams.home.id}`)
                );
                const awayStats = msnStatsData.statistics.find(
                  (s: any) =>
                    s.teamId &&
                    s.teamId.includes(`_${initialMatch.teams.away.id}`)
                );

                if (homeStats && awayStats) {
                  statistics = transformMsnStatsToStatistics(
                    msnStatsData,
                    homeStats.teamId,
                    awayStats.teamId
                  );
                }
              }

              if (statistics.length > 0) {
                enhancedMatch.statistics = statistics;
                console.log(
                  `[MatchStatsModal] Fetched ${statistics.length} statistics from MSN`
                );
              }
            }

            // Fetch timeline (goals, events)
            const { transformMsnTimelineToGoals } = await import(
              "../utils/msnTimelineTransformer"
            );
            const msnTimelineData = await msnSportsApi.getTimeline(
              gameId,
              sport
            );

            if (msnTimelineData) {
              const goalEvents = transformMsnTimelineToGoals(msnTimelineData);
              setGoals(goalEvents);
              console.log(
                `[MatchStatsModal] Fetched ${goalEvents.length} goal events from MSN`
              );
            }
          } else {
            console.log(
              `[MatchStatsModal] Match not started yet (${matchStatus}), skipping stats/timeline fetch`
            );
          }
        } catch (error) {
          console.error("[MatchStatsModal] Error fetching MSN data:", error);
        }

        setMatch(enhancedMatch);
      } else {
        // For football-data.org matches, fetch full details including stats and lineups
        console.log(
          "[MatchStatsModal] Football-data match, fetching full details..."
        );
        const data = await api.getMatchDetails(initialMatch.fixture.id);
        setMatch(data || initialMatch);
      }
    } catch (error) {
      console.error("[MatchStatsModal] Error loading match details:", error);
      // Fallback to initial match data
      setMatch(initialMatch);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.modalView}>
          {/* Header with Close Button */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Detalhes da Partida</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#22c55e" />
            </View>
          ) : match ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}>
              {/* Scoreboard - Modern Design */}
              <View style={styles.scoreCardWrapper}>
                <LinearGradient
                  colors={["#1a1a2e", "#16213e", "#0f0f1a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scoreCard}>
                  {/* League Badge */}
                  <View style={styles.leagueBadge}>
                    <Image
                      source={{ uri: match.league.logo }}
                      style={styles.leagueLogo}
                    />
                    <Text style={styles.leagueName}>{match.league.name}</Text>
                  </View>

                  {/* Teams and Score Section */}
                  <View style={styles.matchupSection}>
                    {/* Home Team */}
                    <View style={styles.teamSection}>
                      <View style={styles.teamLogoContainer}>
                        <LinearGradient
                          colors={[
                            "rgba(255,255,255,0.1)",
                            "rgba(255,255,255,0.05)",
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
                    </View>

                    {/* Score Display */}
                    <View style={styles.scoreSection}>
                      <View style={styles.scoreBox}>
                        <Text style={styles.scoreNumber}>
                          {match.goals.home ?? 0}
                        </Text>
                        <View style={styles.scoreDivider} />
                        <Text style={styles.scoreNumber}>
                          {match.goals.away ?? 0}
                        </Text>
                      </View>
                      <View style={styles.statusBadge}>
                        <View
                          style={[
                            styles.statusDot,
                            match.fixture.status.short === "LIVE" ||
                            match.fixture.status.short === "1H" ||
                            match.fixture.status.short === "2H" ||
                            match.fixture.status.short === "HT"
                              ? styles.statusDotLive
                              : styles.statusDotFinished,
                          ]}
                        />
                        <Text style={styles.statusText}>
                          {match.fixture.status.short === "FT"
                            ? "Encerrado"
                            : match.fixture.status.long}
                        </Text>
                      </View>
                      {match.fixture.status.elapsed && (
                        <Text style={styles.elapsedTime}>
                          {match.fixture.status.elapsed}'
                        </Text>
                      )}
                    </View>

                    {/* Away Team */}
                    <View style={styles.teamSection}>
                      <View style={styles.teamLogoContainer}>
                        <LinearGradient
                          colors={[
                            "rgba(255,255,255,0.1)",
                            "rgba(255,255,255,0.05)",
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
                    </View>
                  </View>

                  {/* Venue Info */}
                  {match.fixture.venue &&
                    match.fixture.venue.name &&
                    match.fixture.venue.name !== "Estádio não informado" && (
                      <View style={styles.venueContainer}>
                        <MapPin color="#71717a" size={12} />
                        <Text style={styles.venueText}>
                          {match.fixture.venue.name}
                          {match.fixture.venue.city
                            ? `, ${match.fixture.venue.city}`
                            : ""}
                        </Text>
                      </View>
                    )}
                </LinearGradient>
              </View>

              {/* Game Details Card (Venue, Channels, Weather) */}
              {gameDetails &&
                (gameDetails.venue ||
                  gameDetails.channels?.length ||
                  gameDetails.weather) && (
                  <View style={styles.gameDetailsCard}>
                    {/* Stadium/Venue */}
                    {gameDetails.venue && (
                      <View style={styles.gameDetailRow}>
                        <View style={styles.gameDetailIcon}>
                          <MapPin color="#22c55e" size={18} />
                        </View>
                        <View style={styles.gameDetailContent}>
                          <Text style={styles.gameDetailTitle}>Estádio</Text>
                          <Text style={styles.gameDetailValue}>
                            {gameDetails.venue.name}
                          </Text>
                          {gameDetails.venue.city && (
                            <Text style={styles.gameDetailSubtext}>
                              {gameDetails.venue.city}
                              {gameDetails.venue.country
                                ? `, ${gameDetails.venue.country}`
                                : ""}
                            </Text>
                          )}
                          {gameDetails.venue.capacity && (
                            <Text style={styles.gameDetailSubtext}>
                              Capacidade:{" "}
                              {parseInt(
                                gameDetails.venue.capacity
                              ).toLocaleString("pt-BR")}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* TV/Streaming Channels */}
                    {gameDetails.channels &&
                      gameDetails.channels.length > 0 &&
                      gameDetails.channels.some(
                        (ch) => ch.names.length > 0
                      ) && (
                        <View style={styles.gameDetailRow}>
                          <View style={styles.gameDetailIcon}>
                            <Tv color="#3b82f6" size={18} />
                          </View>
                          <View style={styles.gameDetailContent}>
                            <Text style={styles.gameDetailTitle}>
                              Onde Assistir
                            </Text>
                            {gameDetails.channels.map(
                              (channel, idx) =>
                                channel.names.length > 0 && (
                                  <Text
                                    key={idx}
                                    style={styles.gameDetailValue}>
                                    {channel.names.join(", ")}
                                  </Text>
                                )
                            )}
                          </View>
                        </View>
                      )}

                    {/* Weather */}
                    {gameDetails.weather && (
                      <View style={styles.gameDetailRow}>
                        <View style={styles.gameDetailIcon}>
                          {gameDetails.weather.condition
                            ?.toLowerCase()
                            .includes("sun") ||
                          gameDetails.weather.condition
                            ?.toLowerCase()
                            .includes("clear") ? (
                            <Sun color="#f59e0b" size={18} />
                          ) : gameDetails.weather.condition
                              ?.toLowerCase()
                              .includes("rain") ? (
                            <CloudRain color="#60a5fa" size={18} />
                          ) : gameDetails.weather.condition
                              ?.toLowerCase()
                              .includes("snow") ? (
                            <CloudSnow color="#e5e7eb" size={18} />
                          ) : gameDetails.weather.condition
                              ?.toLowerCase()
                              .includes("fog") ? (
                            <CloudFog color="#9ca3af" size={18} />
                          ) : (
                            <Cloud color="#9ca3af" size={18} />
                          )}
                        </View>
                        <View style={styles.gameDetailContent}>
                          <Text style={styles.gameDetailTitle}>
                            Clima no Dia
                          </Text>
                          <View style={styles.weatherInfo}>
                            <Text style={styles.weatherTemp}>
                              {gameDetails.weather.temperature}°
                              {gameDetails.weather.unit === "Celsius"
                                ? "C"
                                : "F"}
                            </Text>
                            <Text style={styles.gameDetailValue}>
                              {gameDetails.weather.summary ||
                                gameDetails.weather.condition}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Win/Loss Record */}
                    {(gameDetails.homeTeam?.winLossRecord ||
                      gameDetails.awayTeam?.winLossRecord) && (
                      <View style={styles.gameDetailRow}>
                        <View style={styles.gameDetailIcon}>
                          <Text style={{ fontSize: 16 }}>📊</Text>
                        </View>
                        <View style={styles.gameDetailContent}>
                          <Text style={styles.gameDetailTitle}>
                            Retrospecto na Temporada
                          </Text>
                          <View style={styles.recordContainer}>
                            {gameDetails.homeTeam?.winLossRecord && (
                              <View style={styles.teamRecord}>
                                <Text style={styles.recordTeamName}>
                                  {match.teams.home.name}
                                </Text>
                                <Text style={styles.recordStats}>
                                  {gameDetails.homeTeam.winLossRecord.wins}V{" "}
                                  {gameDetails.homeTeam.winLossRecord.ties}E{" "}
                                  {gameDetails.homeTeam.winLossRecord.losses}D
                                </Text>
                              </View>
                            )}
                            {gameDetails.awayTeam?.winLossRecord && (
                              <View style={styles.teamRecord}>
                                <Text style={styles.recordTeamName}>
                                  {match.teams.away.name}
                                </Text>
                                <Text style={styles.recordStats}>
                                  {gameDetails.awayTeam.winLossRecord.wins}V{" "}
                                  {gameDetails.awayTeam.winLossRecord.ties}E{" "}
                                  {gameDetails.awayTeam.winLossRecord.losses}D
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )}

              {/* Probabilities (if available from MSN Sports) */}
              {match.probabilities && (
                <View style={styles.probabilitiesCard}>
                  <Text style={styles.probabilitiesTitle}>
                    Probabilidades de Vitória
                  </Text>
                  <View style={styles.probabilitiesContainer}>
                    <View style={styles.probabilityItem}>
                      <Text style={styles.probabilityLabel}>
                        {match.teams.home.name}
                      </Text>
                      <View style={styles.probabilityBarContainer}>
                        <View
                          style={[
                            styles.probabilityBar,
                            styles.homeBar,
                            { width: `${match.probabilities.home}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.probabilityValue}>
                        {match.probabilities.home.toFixed(1)}%
                      </Text>
                    </View>

                    <View style={styles.probabilityItem}>
                      <Text style={styles.probabilityLabel}>Empate</Text>
                      <View style={styles.probabilityBarContainer}>
                        <View
                          style={[
                            styles.probabilityBar,
                            styles.drawBar,
                            { width: `${match.probabilities.draw}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.probabilityValue}>
                        {match.probabilities.draw.toFixed(1)}%
                      </Text>
                    </View>

                    <View style={styles.probabilityItem}>
                      <Text style={styles.probabilityLabel}>
                        {match.teams.away.name}
                      </Text>
                      <View style={styles.probabilityBarContainer}>
                        <View
                          style={[
                            styles.probabilityBar,
                            styles.awayBar,
                            { width: `${match.probabilities.away}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.probabilityValue}>
                        {match.probabilities.away.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.probabilitySource}>
                    Fonte: SportRadar
                  </Text>
                </View>
              )}

              {/* Tabs or Not Started Message */}
              {["NS", "TBD", "PST"].includes(match.fixture.status.short) ? (
                <View style={styles.noStatsContainer}>
                  <View style={styles.emptyIconContainer}>
                    <Text style={styles.emptyIcon}>⏳</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Aguardando Início</Text>
                  <Text style={styles.noStatsText}>
                    Estatísticas e escalações estarão disponíveis assim que a
                    partida começar.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Tabs */}
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[
                        styles.tabButton,
                        activeTab === "stats" && styles.activeTabButton,
                      ]}
                      onPress={() => setActiveTab("stats")}>
                      <Text
                        style={[
                          styles.tabText,
                          activeTab === "stats" && styles.activeTabText,
                        ]}>
                        Estatísticas
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tabButton,
                        activeTab === "goals" && styles.activeTabButton,
                      ]}
                      onPress={() => setActiveTab("goals")}>
                      <Text
                        style={[
                          styles.tabText,
                          activeTab === "goals" && styles.activeTabText,
                        ]}>
                        Gols
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tabButton,
                        activeTab === "lineups" && styles.activeTabButton,
                      ]}
                      onPress={() => setActiveTab("lineups")}>
                      <Text
                        style={[
                          styles.tabText,
                          activeTab === "lineups" && styles.activeTabText,
                        ]}>
                        Escalações
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {activeTab === "stats" ? (
                    /* Statistics */
                    match.statistics && match.statistics.length > 0 ? (
                      <View style={styles.statsContainer}>
                        <Text style={styles.sectionTitle}>Estatísticas</Text>
                        {match.statistics[0].statistics.map((stat, index) => {
                          const homeValue = stat.value ?? 0;
                          const awayValue =
                            match.statistics?.[1].statistics[index].value ?? 0;

                          // Calculate percentages for bar
                          const total =
                            (typeof homeValue === "number" ? homeValue : 0) +
                            (typeof awayValue === "number" ? awayValue : 0);
                          const homePercent =
                            total === 0
                              ? 50
                              : ((typeof homeValue === "number"
                                  ? homeValue
                                  : 0) /
                                  total) *
                                100;
                          const awayPercent =
                            total === 0
                              ? 50
                              : ((typeof awayValue === "number"
                                  ? awayValue
                                  : 0) /
                                  total) *
                                100;

                          return (
                            <View key={index} style={styles.statRow}>
                              <View style={styles.statValues}>
                                <Text style={styles.statValue}>
                                  {homeValue}
                                </Text>
                                <Text style={styles.statLabel}>
                                  {stat.type}
                                </Text>
                                <Text style={styles.statValue}>
                                  {awayValue}
                                </Text>
                              </View>
                              <View style={styles.statBarContainer}>
                                <View
                                  style={[
                                    styles.statBar,
                                    {
                                      width: `${homePercent}%`,
                                      backgroundColor: "#22c55e",
                                      borderTopLeftRadius: 4,
                                      borderBottomLeftRadius: 4,
                                    },
                                  ]}
                                />
                                <View
                                  style={[
                                    styles.statBar,
                                    {
                                      width: `${awayPercent}%`,
                                      backgroundColor: "#ef4444",
                                      borderTopRightRadius: 4,
                                      borderBottomRightRadius: 4,
                                    },
                                  ]}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.noStatsContainer}>
                        <Text style={styles.noStatsText}>
                          Estatísticas não disponíveis para este jogo.
                        </Text>
                      </View>
                    )
                  ) : activeTab === "goals" ? (
                    /* Goals Tab */
                    <View style={styles.statsContainer}>
                      {goals && goals.length > 0 ? (
                        <>
                          <Text style={styles.sectionTitle}>
                            Gols da Partida
                          </Text>
                          {goals.map((goal, index) => (
                            <View
                              key={index}
                              style={[
                                styles.goalCard,
                                goal.isDisallowed && styles.goalCardDisallowed,
                              ]}>
                              <View style={styles.goalHeader}>
                                <View style={styles.goalTimeContainer}>
                                  <Text
                                    style={[
                                      styles.goalMinute,
                                      goal.isDisallowed &&
                                        styles.goalMinuteDisallowed,
                                    ]}>
                                    {goal.minute}'
                                  </Text>
                                  <View
                                    style={[
                                      styles.goalPeriodBadge,
                                      goal.period === 2 &&
                                        styles.goalPeriodBadgeSecond,
                                      goal.isDisallowed &&
                                        styles.goalPeriodBadgeDisallowed,
                                    ]}>
                                    <Text style={styles.goalPeriodText}>
                                      {goal.period === 1 ? "1º T" : "2º T"}
                                    </Text>
                                  </View>
                                  {goal.isDisallowed && (
                                    <View style={styles.disallowedBadge}>
                                      <Text style={styles.disallowedText}>
                                        ANULADO
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.goalIcon}>
                                  {goal.isDisallowed ? "❌" : "⚽"}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.goalPlayer,
                                  goal.isDisallowed &&
                                    styles.goalPlayerDisallowed,
                                ]}>
                                {goal.player.number}. {goal.player.name}
                                {goal.isPenalty && " (Pênalti)"}
                                {goal.isOwnGoal && " (Gol Contra)"}
                              </Text>
                              {goal.assist && !goal.isDisallowed && (
                                <Text style={styles.goalAssist}>
                                  Assistência: {goal.assist.number}.{" "}
                                  {goal.assist.name}
                                </Text>
                              )}
                              {goal.isDisallowed && goal.description && (
                                <Text style={styles.disallowedReason}>
                                  {goal.description}
                                </Text>
                              )}
                            </View>
                          ))}
                        </>
                      ) : (
                        <View style={styles.noStatsContainer}>
                          <Text style={styles.noStatsText}>
                            Nenhum gol marcado nesta partida
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : /* Lineups */
                  match.lineups && match.lineups.length > 0 ? (
                    <View style={styles.lineupsContainer}>
                      {/* Home Team Lineup */}
                      <View style={styles.teamLineup}>
                        <View style={styles.lineupHeader}>
                          <Image
                            source={{ uri: match.teams.home.logo }}
                            style={styles.smallTeamLogo}
                          />
                          <Text style={styles.lineupTeamName}>
                            {match.teams.home.name}
                          </Text>
                          <Text style={styles.formation}>
                            {match.lineups[0].formation}
                          </Text>
                        </View>

                        <Text style={styles.lineupSectionTitle}>Titulares</Text>
                        {match.lineups[0].startXI.map((player) => (
                          <View key={player.id} style={styles.playerRow}>
                            {player.photo ? (
                              <Image
                                source={{ uri: player.photo }}
                                style={styles.playerPhoto}
                              />
                            ) : (
                              <View style={styles.playerPhotoPlaceholder}>
                                <User size={16} color="#71717a" />
                              </View>
                            )}
                            <Text style={styles.playerNumber}>
                              {player.number}
                            </Text>
                            <Text style={styles.playerName}>{player.name}</Text>
                            <Text style={styles.playerPosition}>
                              {player.pos}
                            </Text>
                          </View>
                        ))}

                        <Text style={styles.lineupSectionTitle}>Reservas</Text>
                        {match.lineups[0].substitutes.map((player) => (
                          <View key={player.id} style={styles.playerRow}>
                            {player.photo ? (
                              <Image
                                source={{ uri: player.photo }}
                                style={styles.playerPhoto}
                              />
                            ) : (
                              <View style={styles.playerPhotoPlaceholder}>
                                <User size={16} color="#71717a" />
                              </View>
                            )}
                            <Text style={styles.playerNumber}>
                              {player.number}
                            </Text>
                            <Text style={styles.playerName}>{player.name}</Text>
                            <Text style={styles.playerPosition}>
                              {player.pos}
                            </Text>
                          </View>
                        ))}

                        <View style={styles.coachContainer}>
                          <Text style={styles.coachLabel}>Técnico:</Text>
                          <Text style={styles.coachName}>
                            {match.lineups[0].coach.name}
                          </Text>
                        </View>
                      </View>

                      {/* Divider */}
                      <View style={styles.lineupDivider} />

                      {/* Away Team Lineup */}
                      <View style={styles.teamLineup}>
                        <View style={styles.lineupHeader}>
                          <Image
                            source={{ uri: match.teams.away.logo }}
                            style={styles.smallTeamLogo}
                          />
                          <Text style={styles.lineupTeamName}>
                            {match.teams.away.name}
                          </Text>
                          <Text style={styles.formation}>
                            {match.lineups[1].formation}
                          </Text>
                        </View>

                        <Text style={styles.lineupSectionTitle}>Titulares</Text>
                        {match.lineups[1].startXI.map((player) => (
                          <View key={player.id} style={styles.playerRow}>
                            {player.photo ? (
                              <Image
                                source={{ uri: player.photo }}
                                style={styles.playerPhoto}
                              />
                            ) : (
                              <View style={styles.playerPhotoPlaceholder}>
                                <User size={16} color="#71717a" />
                              </View>
                            )}
                            <Text style={styles.playerNumber}>
                              {player.number}
                            </Text>
                            <Text style={styles.playerName}>{player.name}</Text>
                            <Text style={styles.playerPosition}>
                              {player.pos}
                            </Text>
                          </View>
                        ))}

                        <Text style={styles.lineupSectionTitle}>Reservas</Text>
                        {match.lineups[1].substitutes.map((player) => (
                          <View key={player.id} style={styles.playerRow}>
                            {player.photo ? (
                              <Image
                                source={{ uri: player.photo }}
                                style={styles.playerPhoto}
                              />
                            ) : (
                              <View style={styles.playerPhotoPlaceholder}>
                                <User size={16} color="#71717a" />
                              </View>
                            )}
                            <Text style={styles.playerNumber}>
                              {player.number}
                            </Text>
                            <Text style={styles.playerName}>{player.name}</Text>
                            <Text style={styles.playerPosition}>
                              {player.pos}
                            </Text>
                          </View>
                        ))}

                        <View style={styles.coachContainer}>
                          <Text style={styles.coachLabel}>Técnico:</Text>
                          <Text style={styles.coachName}>
                            {match.lineups[1].coach.name}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noStatsContainer}>
                      <Text style={styles.noStatsText}>
                        Escalações não disponíveis para este jogo.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Não foi possível carregar os detalhes.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalView: {
    backgroundColor: "#09090b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingBottom: 40,
  },

  // Scorecard - Modern Design
  scoreCardWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scoreCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  leagueBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 20,
  },
  leagueLogo: {
    width: 18,
    height: 18,
    marginRight: 8,
    resizeMode: "contain",
  },
  leagueName: {
    color: "#d4d4d8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  matchupSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  teamSection: {
    alignItems: "center",
    flex: 1,
    maxWidth: 100,
  },
  teamLogoContainer: {
    marginBottom: 12,
  },
  teamLogoGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },
  teamLogo: {
    width: 52,
    height: 52,
    resizeMode: "contain",
  },
  teamName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },
  scoreSection: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scoreNumber: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    minWidth: 30,
    textAlign: "center",
  },
  scoreDivider: {
    width: 3,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 12,
    borderRadius: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusDotLive: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusDotFinished: {
    backgroundColor: "#22c55e",
  },
  statusText: {
    color: "#d4d4d8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  elapsedTime: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6,
  },
  venueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  venueText: {
    color: "#71717a",
    fontSize: 11,
    marginLeft: 6,
    fontWeight: "500",
  },

  // Legacy styles (keeping for compatibility)
  teamsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  team: {
    alignItems: "center",
    flex: 1,
  },
  scoreContainer: {
    alignItems: "center",
    width: 100,
  },
  score: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 4,
  },
  status: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  time: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "600",
  },
  venue: {
    color: "#71717a",
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  statRow: {
    marginBottom: 16,
  },
  statValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    width: 40,
    textAlign: "center",
  },
  statLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  statBarContainer: {
    flexDirection: "row",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  statBar: {
    height: "100%",
  },
  noStatsContainer: {
    padding: 40,
    alignItems: "center",
  },
  noStatsText: {
    color: "#71717a",
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tabText: {
    color: "#71717a",
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#fff",
  },
  lineupsContainer: {
    paddingHorizontal: 20,
  },
  teamLineup: {
    marginBottom: 24,
  },
  lineupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
    borderRadius: 12,
  },
  smallTeamLogo: {
    width: 24,
    height: 24,
    marginRight: 10,
    resizeMode: "contain",
  },
  lineupTeamName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  formation: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "600",
  },
  lineupSectionTitle: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 8,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  playerPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  playerPhotoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  playerNumber: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "700",
    width: 30,
  },
  playerName: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  playerPosition: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "600",
    width: 30,
    textAlign: "right",
  },
  lineupDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 24,
  },
  coachContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  coachLabel: {
    color: "#a1a1aa",
    fontSize: 14,
    marginRight: 8,
  },
  coachName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  probabilitiesCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  probabilitiesTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  probabilitiesContainer: {
    gap: 12,
  },
  probabilityItem: {
    gap: 6,
  },
  probabilityLabel: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "600",
  },
  probabilityBarContainer: {
    height: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    overflow: "hidden",
  },
  probabilityBar: {
    height: "100%",
    borderRadius: 12,
  },
  homeBar: {
    backgroundColor: "#22c55e",
  },
  drawBar: {
    backgroundColor: "#f59e0b",
  },
  awayBar: {
    backgroundColor: "#ef4444",
  },
  probabilityValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  probabilitySource: {
    color: "#71717a",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  goalCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#22c55e",
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  goalMinute: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "800",
  },
  goalIcon: {
    fontSize: 20,
  },
  goalPlayer: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  goalAssist: {
    color: "#a1a1aa",
    fontSize: 14,
    marginBottom: 8,
  },
  goalTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalPeriodBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  goalPeriodBadgeSecond: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  goalPeriodBadgeDisallowed: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  goalPeriodText: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "600",
  },
  goalDescription: {
    color: "#71717a",
    fontSize: 13,
    fontStyle: "italic",
  },
  // Estilos para gol anulado
  goalCardDisallowed: {
    borderLeftColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    opacity: 0.8,
  },
  goalMinuteDisallowed: {
    color: "#ef4444",
    textDecorationLine: "line-through",
  },
  goalPlayerDisallowed: {
    color: "#71717a",
    textDecorationLine: "line-through",
  },
  disallowedBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  disallowedText: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "700",
  },
  disallowedReason: {
    color: "#71717a",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
  },
  // Game Details Styles
  gameDetailsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  gameDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  gameDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  gameDetailContent: {
    flex: 1,
  },
  gameDetailTitle: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gameDetailValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  gameDetailSubtext: {
    color: "#a1a1aa",
    fontSize: 13,
  },
  weatherInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  weatherTemp: {
    color: "#f59e0b",
    fontSize: 20,
    fontWeight: "800",
  },
  recordContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  teamRecord: {
    flex: 1,
    alignItems: "center",
  },
  recordTeamName: {
    color: "#a1a1aa",
    fontSize: 12,
    marginBottom: 4,
  },
  recordStats: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
