import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../services/api";
import { Match } from "../types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { inferMsnTeamId } from "../utils/teamIdMapper";
import { TeamLogo } from "./TeamLogo";
interface TeamMatchHistoryProps {
  teamId: number;
  teamName: string;
  limit?: number;
  msnId?: string; // Optional MSN Sports Team ID for better data
  onMatchPress?: (match: Match) => void;
}

type MatchResult = "W" | "D" | "L" | "F"; // Win, Draw, Loss, Future

export const TeamMatchHistory: React.FC<TeamMatchHistoryProps> = ({
  teamId,
  teamName,
  limit = 5,
  msnId,
  onMatchPress,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const handleMatchPress = (match: Match) => {
    if (onMatchPress) {
      onMatchPress(match);
    }
  };

  useEffect(() => {
    loadMatchHistory();
  }, [teamId, msnId]);

  const loadMatchHistory = async () => {
    setLoading(true);
    try {
      let data: Match[] = [];

      // Use provided msnId or try to infer from mapping
      const effectiveMsnId = msnId || inferMsnTeamId(teamId, teamName);

      // Try MSN Sports API first if we have MSN Team ID
      if (effectiveMsnId) {
        console.log(
          `[TeamMatchHistory] Trying MSN API for team ${effectiveMsnId}...`
        );
        const { msnSportsApi } = await import("../services/msnSportsApi");
        const { transformMsnGameToMatch } = await import(
          "../utils/msnTransformer"
        );

        try {
          const msnGames = await msnSportsApi.getTeamLiveSchedule(
            effectiveMsnId,
            10
          );

          if (msnGames && msnGames.length > 0) {
            // Separate finished and upcoming games
            const finishedGames = msnGames.filter(
              (game: any) => game.gameState?.gameStatus === "Final"
            );

            const upcomingGames = msnGames.filter(
              (game: any) => game.gameState?.gameStatus === "PreGame"
            );

            // Transform finished games (last N matches)
            const finishedMatches = finishedGames
              .slice(0, limit)
              .map((game: any) => transformMsnGameToMatch(game));

            // Transform upcoming games (next 2-3 matches)
            const upcomingMatches = upcomingGames
              .slice(0, 3)
              .map((game: any) => transformMsnGameToMatch(game));

            // Combine: finished (reversed to show recent first) + upcoming
            data = [...finishedMatches.reverse(), ...upcomingMatches];

            console.log(
              `[TeamMatchHistory] MSN API returned ${finishedMatches.length} finished + ${upcomingMatches.length} upcoming games`
            );
          }
        } catch (msnError) {
          console.log(`[TeamMatchHistory] MSN API failed:`, msnError);
        }
      }

      // Fallback to football-data.org if MSN didn't work or no MSN ID
      if (data.length === 0) {
        console.log(
          `[TeamMatchHistory] Trying football-data.org for team ${teamId}...`
        );
        try {
          const fallbackData = await api.getTeamMatches(teamId, limit);
          if (fallbackData && fallbackData.length > 0) {
            data = fallbackData.reverse();
          }
        } catch (footballError) {
          console.log(
            `[TeamMatchHistory] football-data.org also failed:`,
            footballError
          );
        }
      }

      // Set matches if we got data
      if (data && data.length > 0) {
        setMatches(data);
      } else {
        console.log(`[TeamMatchHistory] No matches found for team ${teamId}`);
        setMatches([]);
      }
    } catch (error) {
      // Silently handle 404 or other errors
      console.log(
        `[TeamMatchHistory] Could not load matches for team ${teamId}:`,
        error
      );
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const getMatchResult = (match: Match): MatchResult => {
    // Check if it's a future match (not started yet)
    if (
      match.fixture.status.short === "NS" ||
      match.fixture.status.short === "TBD"
    ) {
      return "F"; // Future match
    }

    const isHome = match.teams.home.id === teamId;
    const teamGoals = isHome ? match.goals.home : match.goals.away;
    const opponentGoals = isHome ? match.goals.away : match.goals.home;

    if (teamGoals === null || opponentGoals === null) return "F"; // Treat as future if no goals

    if (teamGoals > opponentGoals) return "W";
    if (teamGoals < opponentGoals) return "L";
    return "D";
  };

  const getResultColor = (result: MatchResult): string[] => {
    switch (result) {
      case "W":
        return ["#22c55e", "#16a34a"]; // Green
      case "D":
        return ["#eab308", "#ca8a04"]; // Yellow
      case "L":
        return ["#ef4444", "#dc2626"]; // Red
      case "F":
        return ["#3b82f6", "#2563eb"]; // Blue (Future)
      default:
        return ["#71717a", "#52525b"]; // Gray
    }
  };

  const getResultLabel = (result: MatchResult): string => {
    switch (result) {
      case "W":
        return "V";
      case "D":
        return "E";
      case "L":
        return "D";
      case "F":
        return "?"; // Future/upcoming match
      default:
        return "-";
    }
  };

  const getOpponent = (match: Match): string => {
    const isHome = match.teams.home.id === teamId;
    return isHome ? match.teams.away.name : match.teams.home.name;
  };

  const getScore = (match: Match): string => {
    const isHome = match.teams.home.id === teamId;
    const teamGoals = isHome ? match.goals.home : match.goals.away;
    const opponentGoals = isHome ? match.goals.away : match.goals.home;
    return `${teamGoals ?? 0}-${opponentGoals ?? 0}`;
  };

  const getVenueIcon = (match: Match): string => {
    const isHome = match.teams.home.id === teamId;
    return isHome ? "🏠" : "✈️";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#22c55e" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>Nenhum jogo recente encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Últimos Jogos</Text>
        <Text style={styles.subtitle}>{teamName}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.matchesContainer}>
        {matches.map((match, index) => {
          const result = getMatchResult(match);
          const resultColors = getResultColor(result);
          const score = getScore(match);
          const venueIcon = getVenueIcon(match);
          const matchDate = new Date(match.fixture.date);
          const isFuture = result === "F";

          // Get both teams for matchup display
          const homeTeam = match.teams.home;
          const awayTeam = match.teams.away;

          return (
            <TouchableOpacity
              key={match.fixture.id}
              style={styles.matchCard}
              activeOpacity={0.7}
              onPress={() => handleMatchPress(match)}>
              <LinearGradient
                colors={
                  ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"] as any
                }
                style={styles.matchGradient}>
                {/* Venue Icon */}
                <Text style={styles.venueIcon}>{venueIcon}</Text>

                {/* Matchup: Team A x Team B */}
                <View style={styles.matchupContainer}>
                  <TeamLogo
                    uri={homeTeam.logo}
                    size={24}
                    style={styles.teamLogo}
                  />
                  <Text style={styles.vsText}>x</Text>
                  <TeamLogo
                    uri={awayTeam.logo}
                    size={24}
                    style={styles.teamLogo}
                  />
                </View>

                {/* Score or Time */}
                {isFuture ? (
                  <Text style={styles.futureTime}>
                    {format(matchDate, "HH:mm", { locale: ptBR })}
                  </Text>
                ) : (
                  <Text style={styles.score}>{score}</Text>
                )}

                {/* Date - More prominent */}
                <Text style={[styles.date, isFuture && styles.futureDate]}>
                  {format(matchDate, "dd/MM", { locale: ptBR })}
                </Text>

                {/* League */}
                <Text style={styles.league} numberOfLines={1}>
                  {match.league.name}
                </Text>

                {/* Tap indicator for finished matches */}
                {!isFuture && (
                  <Text style={styles.tapHint}>Toque para detalhes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Summary Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {matches.filter((m) => getMatchResult(m) === "W").length}
          </Text>
          <Text style={[styles.statLabel, { color: "#22c55e" }]}>V</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {matches.filter((m) => getMatchResult(m) === "D").length}
          </Text>
          <Text style={[styles.statLabel, { color: "#eab308" }]}>E</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {matches.filter((m) => getMatchResult(m) === "L").length}
          </Text>
          <Text style={[styles.statLabel, { color: "#ef4444" }]}>D</Text>
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#71717a",
  },

  // Loading
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "500",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: "#71717a",
    fontSize: 13,
    fontWeight: "500",
  },

  // Matches
  matchesContainer: {
    paddingBottom: 8,
    gap: 8,
  },
  matchCard: {
    width: 100,
    borderRadius: 12,
    overflow: "hidden",
  },
  matchGradient: {
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
  },

  resultBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  resultText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  venueIcon: {
    fontSize: 12,
    marginBottom: 4,
  },

  matchupContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 6,
  },

  teamLogo: {
    width: 24,
    height: 24,
  },

  vsText: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "600",
  },

  score: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  futureTime: {
    color: "#3b82f6",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },

  date: {
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },

  futureDate: {
    color: "#60a5fa",
    fontWeight: "700",
  },

  league: {
    color: "#71717a",
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
  },

  // Stats Summary
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    gap: 16,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tapHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});
