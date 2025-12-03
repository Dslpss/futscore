import { api } from "./api";
import { Match } from "../types";
import { CONFIG } from "../constants/config";
import {
  schedulePushNotification,
  scheduleMatchStartNotification,
  notifyMatchStarted,
  notifyGoal,
} from "./notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_KNOWN_SCORES_KEY = "futscore_last_known_scores";
const LAST_KNOWN_STATUS_KEY = "futscore_last_known_status";
const NOTIFIED_MATCHES_KEY = "futscore_notified_started";

export const matchService = {
  /**
   * Fetches live matches and checks for score updates.
   * PRIORITY: MSN Sports API (primary) → football-data.org (fallback only if MSN fails)
   * @param favoriteTeams List of favorite team IDs
   * @returns List of live matches
   */
  checkMatchesAndNotify: async (favoriteTeams: number[] = []) => {
    try {
      console.log(
        "[MatchService] Checking matches with PRIORITY API (MSN → football-data)..."
      );

      const { msnSportsApi } = await import("./msnSportsApi");
      const { transformMsnGameToMatch } = await import(
        "../utils/msnTransformer"
      );

      // Define league mapping: MSN ID → football-data ID
      const leagueMapping = [
        {
          msn: "Soccer_BrazilBrasileiroSerieA",
          fd: "BSA",
          sport: "Soccer",
          name: "Brasileirão",
        },
        {
          msn: "Soccer_InternationalClubsUEFAChampionsLeague",
          fd: "CL",
          sport: "Soccer",
          name: "Champions League",
        },
        {
          msn: "Soccer_SpainLaLiga",
          fd: "PD",
          sport: "Soccer",
          name: "La Liga",
        },
        {
          msn: "Soccer_EnglandPremierLeague",
          fd: null,
          sport: "Soccer",
          name: "Premier League",
        },
        {
          msn: "Soccer_GermanyBundesliga",
          fd: null,
          sport: "Soccer",
          name: "Bundesliga",
        },
        {
          msn: "Soccer_ItalySerieA",
          fd: null,
          sport: "Soccer",
          name: "Serie A",
        },
        {
          msn: "Soccer_FranceLigue1",
          fd: null,
          sport: "Soccer",
          name: "Ligue 1",
        },
        {
          msn: "Soccer_PortugalPrimeiraLiga",
          fd: null,
          sport: "Soccer",
          name: "Liga Portugal",
        },
        { msn: "Basketball_NBA", fd: null, sport: "Basketball", name: "NBA" },
      ];

      let allFixtures: Match[] = [];

      // Try each league: MSN first, then football-data fallback
      for (const league of leagueMapping) {
        let leagueMatches: Match[] = [];

        // 1. Try MSN Sports first
        try {
          const games = await msnSportsApi.getLiveAroundLeague(
            league.msn,
            league.sport
          );

          if (games && games.length > 0) {
            leagueMatches = games.map((game: any) =>
              transformMsnGameToMatch(game)
            );
            console.log(
              `[MatchService] ✓ ${league.name}: ${leagueMatches.length} matches from MSN Sports`
            );
          }
        } catch (error) {
          console.log(`[MatchService] ✗ ${league.name}: MSN Sports failed`);
        }

        // 2. If MSN failed or returned empty, try football-data as fallback
        if (leagueMatches.length === 0 && league.fd) {
          try {
            const fixtures = await api.getFixtures(league.fd);
            if (fixtures && fixtures.length > 0) {
              leagueMatches = fixtures;
              console.log(
                `[MatchService] ✓ ${league.name}: ${leagueMatches.length} matches from football-data fallback`
              );
            }
          } catch (error) {
            console.log(`[MatchService] ✗ ${league.name}: Both APIs failed`);
          }
        }

        // Add to all fixtures (no duplicates since we only use one source per league)
        if (leagueMatches.length > 0) {
          allFixtures = [...allFixtures, ...leagueMatches];
        }
      }

      console.log(`[MatchService] Total unique matches: ${allFixtures.length}`);

      // Filter for today (local time)
      const todayLocal = new Date().toLocaleDateString("pt-BR");
      const filteredFixtures = allFixtures.filter((m) => {
        const matchDate = new Date(m.fixture.date).toLocaleDateString("pt-BR");
        return matchDate === todayLocal;
      });

      // Filter for live matches
      const liveMatches = filteredFixtures.filter((m) =>
        ["1H", "2H", "HT", "ET", "P", "BT"].includes(m.fixture.status.short)
      );

      // Check for matches that just STARTED (notify all users)
      if (liveMatches.length > 0) {
        await checkMatchStarted(liveMatches, favoriteTeams);
      }

      // Check for score changes in ALL live matches
      if (liveMatches.length > 0) {
        await checkScoreChanges(liveMatches, favoriteTeams);
      }

      // Schedule start notifications for ALL upcoming matches today
      const upcomingMatches = filteredFixtures.filter((m) =>
        ["NS", "TBD"].includes(m.fixture.status.short)
      );

      for (const match of upcomingMatches) {
        await scheduleMatchStartNotification(match);
      }

      return {
        liveMatches,
        todaysMatches: filteredFixtures,
      };
    } catch (error) {
      console.error("[MatchService] Error checking matches:", error);
      return { liveMatches: [], todaysMatches: [] };
    }
  },
};

// Verifica se algum jogo acabou de COMEÇAR
async function checkMatchStarted(
  currentMatches: Match[],
  favoriteTeams: number[]
) {
  try {
    const notifiedJson = await AsyncStorage.getItem(NOTIFIED_MATCHES_KEY);
    const notifiedMatches: number[] = notifiedJson
      ? JSON.parse(notifiedJson)
      : [];

    let hasChanges = false;
    const updatedNotified = [...notifiedMatches];

    for (const match of currentMatches) {
      const matchId = match.fixture.id;
      const status = match.fixture.status.short;

      // Se está no primeiro tempo e ainda não notificamos
      if (status === "1H" && !notifiedMatches.includes(matchId)) {
        const isHomeFavorite = favoriteTeams.includes(match.teams.home.id);
        const isAwayFavorite = favoriteTeams.includes(match.teams.away.id);
        const isFavoriteMatch = isHomeFavorite || isAwayFavorite;

        // Notificar que o jogo começou
        await notifyMatchStarted(match, isFavoriteMatch);

        updatedNotified.push(matchId);
        hasChanges = true;
      }
    }

    // Limpar jogos antigos (manter apenas os das últimas 24 horas)
    // Para simplificar, mantemos apenas os últimos 100 jogos notificados
    const trimmedNotified = updatedNotified.slice(-100);

    if (hasChanges) {
      await AsyncStorage.setItem(
        NOTIFIED_MATCHES_KEY,
        JSON.stringify(trimmedNotified)
      );
    }
  } catch (error) {
    console.error("[MatchService] Error checking match started:", error);
  }
}

async function checkScoreChanges(
  currentMatches: Match[],
  favoriteTeams: number[]
) {
  try {
    // Load last known scores
    const lastKnownJson = await AsyncStorage.getItem(LAST_KNOWN_SCORES_KEY);
    const lastKnownScores: Record<number, { home: number; away: number }> =
      lastKnownJson ? JSON.parse(lastKnownJson) : {};

    const newScores: Record<number, { home: number; away: number }> = {
      ...lastKnownScores,
    };
    let hasChanges = false;

    for (const match of currentMatches) {
      const matchId = match.fixture.id;
      const currentHome = match.goals.home ?? 0;
      const currentAway = match.goals.away ?? 0;

      const previous = lastKnownScores[matchId];

      if (previous) {
        const homeChanged = currentHome > previous.home;
        const awayChanged = currentAway > previous.away;

        // Notify for ANY goal in any match
        if (homeChanged || awayChanged) {
          const scorerTeam = homeChanged
            ? match.teams.home.name
            : match.teams.away.name;
          const isHomeFavorite = favoriteTeams.includes(match.teams.home.id);
          const isAwayFavorite = favoriteTeams.includes(match.teams.away.id);
          const isFavoriteMatch = isHomeFavorite || isAwayFavorite;

          // Usar a nova função de notificação de gol
          await notifyGoal(match, scorerTeam, isFavoriteMatch);
        }
      }

      // Update known score
      if (
        !previous ||
        previous.home !== currentHome ||
        previous.away !== currentAway
      ) {
        newScores[matchId] = { home: currentHome, away: currentAway };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await AsyncStorage.setItem(
        LAST_KNOWN_SCORES_KEY,
        JSON.stringify(newScores)
      );
    }
  } catch (error) {
    console.error("[MatchService] Error checking score changes:", error);
  }
}
