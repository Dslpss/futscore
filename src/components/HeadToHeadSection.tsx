import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Swords } from "lucide-react-native";
import { TeamLogo } from "./TeamLogo";

interface H2HMatch {
  id: string;
  date: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeTeamSide: "home" | "away";
}

interface H2HStats {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  homeGoals: number;
  awayGoals: number;
  matches: H2HMatch[];
}

interface HeadToHeadSectionProps {
  homeTeamName: string;
  awayTeamName: string;
  homeLogo: string;
  awayLogo: string;
  homeRecentGames: any[];
  awayRecentGames: any[];
  homeTeamId?: string;
  awayTeamId?: string;
}

// Extract the numeric team ID from MSN format
// "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2001" → "2001"
const extractTeamNumber = (msnId: string): string | null => {
  if (!msnId) return null;
  const match = msnId.match(/_Team_(\d+)/i);
  return match ? match[1] : null;
};

const normalizeTeamName = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const teamNamesMatch = (name1: string, name2: string): boolean => {
  if (!name1 || !name2) return false;
  
  const n1 = normalizeTeamName(name1);
  const n2 = normalizeTeamName(name2);

  if (n1 === n2) return true;
  if (n1.length > 2 && n2.length > 2 && (n1.includes(n2) || n2.includes(n1))) return true;

  // Check if the main distinguishing word matches
  // (e.g., "palmeiras" in "se palmeiras" or "sociedade esportiva palmeiras")
  const words1 = n1.split(" ").filter((w) => w.length > 3);
  const words2 = n2.split(" ").filter((w) => w.length > 3);
  return words1.some((w1) => words2.some((w2) => w1 === w2));
};

// Check if a participant matches a target team
const participantMatchesTeam = (
  participant: any,
  targetTeamName: string,
  targetTeamId: string | undefined
): boolean => {
  const pId = participant?.team?.id || "";
  const pName = participant?.team?.shortName?.rawName || 
                participant?.team?.name?.rawName || 
                participant?.team?.name?.localizedName || "";

  // Match by team number extracted from MSN ID (most reliable)
  if (targetTeamId && pId) {
    const targetNum = extractTeamNumber(targetTeamId);
    const pNum = extractTeamNumber(pId);
    if (targetNum && pNum && targetNum === pNum) {
      return true;
    }
  }

  // Match by name
  if (pName && targetTeamName) {
    if (teamNamesMatch(pName, targetTeamName)) return true;
  }

  return false;
};

const extractHeadToHead = (
  homeTeamName: string,
  awayTeamName: string,
  homeTeamId: string | undefined,
  awayTeamId: string | undefined,
  homeGames: any[],
  awayGames: any[]
): H2HStats => {
  const h2hMatches: H2HMatch[] = [];
  const seen = new Set<string>();

  console.log(`[H2H] Searching H2H: "${homeTeamName}" vs "${awayTeamName}"`);
  console.log(`[H2H] Home team ID: ${homeTeamId}, num: ${extractTeamNumber(homeTeamId || "")}`);
  console.log(`[H2H] Away team ID: ${awayTeamId}, num: ${extractTeamNumber(awayTeamId || "")}`);
  console.log(`[H2H] Home games: ${homeGames.length}, Away games: ${awayGames.length}`);

  // Log first game structure for debugging
  if (homeGames.length > 0) {
    const firstGame = homeGames[0];
    const p0 = firstGame.participants?.[0];
    const p1 = firstGame.participants?.[1];
    console.log(`[H2H] Sample game structure:`, {
      id: firstGame.id,
      status: firstGame.gameState?.gameStatus,
      p0_id: p0?.team?.id,
      p0_name: p0?.team?.shortName?.rawName || p0?.team?.name?.rawName,
      p0_abbr: p0?.team?.abbreviation,
      p1_id: p1?.team?.id, 
      p1_name: p1?.team?.shortName?.rawName || p1?.team?.name?.rawName,
      p1_abbr: p1?.team?.abbreviation,
      p0_score: p0?.result?.score,
      p1_score: p1?.result?.score,
    });
  }

  const processGames = (games: any[], searchingFor: "away" | "home") => {
    const searchTeamName = searchingFor === "away" ? awayTeamName : homeTeamName;
    const searchTeamId = searchingFor === "away" ? awayTeamId : homeTeamId;

    for (const game of games) {
      const participants = game.participants || [];
      if (participants.length < 2) continue;

      const p0 = participants[0];
      const p1 = participants[1];

      // Check if opponent team is in this game
      const opponentIsP0 = participantMatchesTeam(p0, searchTeamName, searchTeamId);
      const opponentIsP1 = participantMatchesTeam(p1, searchTeamName, searchTeamId);

      if (!opponentIsP0 && !opponentIsP1) continue;

      // Create unique game key
      const p0Name = p0?.team?.shortName?.rawName || p0?.team?.name?.rawName || "?";
      const p1Name = p1?.team?.shortName?.rawName || p1?.team?.name?.rawName || "?";
      const gameDate = game.startDateTime || "";
      const gameKey = `${gameDate.substring(0, 10)}_${p0Name}_${p1Name}`;
      
      if (seen.has(gameKey)) continue;
      seen.add(gameKey);

      console.log(`[H2H] ✅ Found H2H match: ${p0Name} vs ${p1Name} (${gameDate})`);

      // Determine which participant is our "home team" from the current match
      const homeIsP0 = participantMatchesTeam(p0, homeTeamName, homeTeamId);

      h2hMatches.push({
        id: game.id || gameKey,
        date: gameDate,
        homeTeamName: p0Name,
        awayTeamName: p1Name,
        homeScore: parseInt(p0?.result?.score) || 0,
        awayScore: parseInt(p1?.result?.score) || 0,
        homeTeamSide: homeIsP0 ? "home" : "away",
      });
    }
  };

  // Search through home team's games for the away team
  processGames(homeGames, "away");
  // Search through away team's games for the home team (may find additional games)
  processGames(awayGames, "home");

  console.log(`[H2H] Total H2H matches found: ${h2hMatches.length}`);

  // Sort by date (most recent first)
  h2hMatches.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate stats
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let homeGoals = 0;
  let awayGoals = 0;

  for (const m of h2hMatches) {
    const isHomeOnLeft = m.homeTeamSide === "home";
    const currentHomeScore = isHomeOnLeft ? m.homeScore : m.awayScore;
    const currentAwayScore = isHomeOnLeft ? m.awayScore : m.homeScore;

    homeGoals += currentHomeScore;
    awayGoals += currentAwayScore;

    if (currentHomeScore > currentAwayScore) homeWins++;
    else if (currentAwayScore > currentHomeScore) awayWins++;
    else draws++;
  }

  return {
    totalMatches: h2hMatches.length,
    homeWins,
    awayWins,
    draws,
    homeGoals,
    awayGoals,
    matches: h2hMatches,
  };
};

export const HeadToHeadSection: React.FC<HeadToHeadSectionProps> = React.memo(
  ({
    homeTeamName,
    awayTeamName,
    homeLogo,
    awayLogo,
    homeRecentGames,
    awayRecentGames,
    homeTeamId,
    awayTeamId,
  }) => {
    const stats = useMemo(
      () =>
        extractHeadToHead(
          homeTeamName,
          awayTeamName,
          homeTeamId,
          awayTeamId,
          homeRecentGames,
          awayRecentGames
        ),
      [homeTeamName, awayTeamName, homeTeamId, awayTeamId, homeRecentGames, awayRecentGames]
    );

    if (stats.totalMatches === 0) return null;

    const homeWinPct =
      stats.totalMatches > 0
        ? (stats.homeWins / stats.totalMatches) * 100
        : 0;
    const drawPct =
      stats.totalMatches > 0
        ? (stats.draws / stats.totalMatches) * 100
        : 0;
    const awayWinPct =
      stats.totalMatches > 0
        ? (stats.awayWins / stats.totalMatches) * 100
        : 0;

    const formatDate = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {
        return "";
      }
    };

    return (
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Swords color="#22c55e" size={18} />
          <Text style={styles.title}>Confronto Direto</Text>
          <Text style={styles.totalMatches}>
            {stats.totalMatches} {stats.totalMatches === 1 ? "jogo" : "jogos"}
          </Text>
        </View>

        {/* Stats Summary */}
        <LinearGradient
          colors={["#1a1a2e", "#16213e"]}
          style={styles.statsCard}
        >
          <View style={styles.statsRow}>
            <View style={styles.teamStatCol}>
              <TeamLogo uri={homeLogo} size={36} style={styles.teamLogo} />
              <Text style={styles.statNumber}>{stats.homeWins}</Text>
              <Text style={styles.statLabel}>Vitórias</Text>
            </View>

            <View style={styles.drawCol}>
              <View style={styles.drawCircle}>
                <Text style={styles.drawNumber}>{stats.draws}</Text>
              </View>
              <Text style={styles.statLabel}>Empates</Text>
            </View>

            <View style={styles.teamStatCol}>
              <TeamLogo uri={awayLogo} size={36} style={styles.teamLogo} />
              <Text style={styles.statNumber}>{stats.awayWins}</Text>
              <Text style={styles.statLabel}>Vitórias</Text>
            </View>
          </View>

          {/* Win Probability Bar */}
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barSegment,
                {
                  flex: homeWinPct || 0.1,
                  backgroundColor: "#22c55e",
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4,
                },
              ]}
            />
            <View
              style={[
                styles.barSegment,
                {
                  flex: drawPct || 0.1,
                  backgroundColor: "#6b7280",
                },
              ]}
            />
            <View
              style={[
                styles.barSegment,
                {
                  flex: awayWinPct || 0.1,
                  backgroundColor: "#3b82f6",
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4,
                },
              ]}
            />
          </View>

          {/* Goals */}
          <View style={styles.goalsRow}>
            <Text style={styles.goalsText}>
              ⚽ {stats.homeGoals} gols
            </Text>
            <Text style={styles.goalsDivider}>|</Text>
            <Text style={styles.goalsText}>
              ⚽ {stats.awayGoals} gols
            </Text>
          </View>
        </LinearGradient>

        {/* Match History List */}
        <View style={styles.matchList}>
          {stats.matches.map((m, index) => {
            const isHomeOnLeft = m.homeTeamSide === "home";
            const currentHomeScore = isHomeOnLeft ? m.homeScore : m.awayScore;
            const currentAwayScore = isHomeOnLeft ? m.awayScore : m.homeScore;

            let resultColor = "#eab308"; // draw
            if (currentHomeScore > currentAwayScore) resultColor = "#22c55e";
            else if (currentAwayScore > currentHomeScore) resultColor = "#ef4444";

            return (
              <View key={m.id || index} style={styles.matchRow}>
                <Text style={styles.matchDate}>{formatDate(m.date)}</Text>
                <View style={styles.matchTeams}>
                  <Text
                    style={[
                      styles.matchTeamName,
                      isHomeOnLeft && { fontWeight: "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {m.homeTeamName}
                  </Text>
                  <View
                    style={[
                      styles.matchScoreBadge,
                      { borderColor: resultColor },
                    ]}
                  >
                    <Text style={[styles.matchScore, { color: resultColor }]}>
                      {m.homeScore} - {m.awayScore}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.matchTeamName,
                      !isHomeOnLeft && { fontWeight: "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {m.awayTeamName}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.15)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },
  totalMatches: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 14,
  },
  teamStatCol: {
    alignItems: "center",
    gap: 6,
  },
  teamLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  drawCol: {
    alignItems: "center",
    gap: 6,
  },
  drawCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(107, 114, 128, 0.3)",
    borderWidth: 2,
    borderColor: "#6b7280",
    justifyContent: "center",
    alignItems: "center",
  },
  drawNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#d1d5db",
  },
  barContainer: {
    flexDirection: "row",
    height: 6,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
    gap: 2,
  },
  barSegment: {
    height: "100%",
  },
  goalsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  goalsText: {
    fontSize: 13,
    color: "#d1d5db",
    fontWeight: "600",
  },
  goalsDivider: {
    fontSize: 13,
    color: "#4b5563",
  },
  matchList: {
    gap: 1,
  },
  matchRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  matchDate: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
    textAlign: "center",
  },
  matchTeams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  matchTeamName: {
    fontSize: 13,
    color: "#d1d5db",
    flex: 1,
    textAlign: "center",
    fontWeight: "400",
  },
  matchScoreBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  matchScore: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});
