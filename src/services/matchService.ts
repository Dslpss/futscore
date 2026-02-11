import { api } from "./api";
import { Match } from "../types";
import { CONFIG } from "../constants/config";
import {
  schedulePushNotification,
  scheduleMatchStartNotification,
  notifyMatchStarted,
  notifyGoal,
  notifyHalfTime,
  notifyMatchEnded,
} from "./notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_KNOWN_SCORES_KEY = "futscore_last_known_scores";
const LAST_KNOWN_STATUS_KEY = "futscore_last_known_status";
const NOTIFIED_MATCHES_KEY = "futscore_notified_started";
const NOTIFIED_HALFTIME_KEY = "futscore_notified_halftime";
const NOTIFIED_FINISHED_KEY = "futscore_notified_finished";
const NOTIFIED_GOALS_KEY = "futscore_notified_goals"; // Cache de gols já notificados
const CACHE_CLEANUP_KEY = "futscore_last_cleanup";
const FAVORITE_MATCHES_KEY = "futscore_favorite_matches";
const NOTIFICATION_SETTINGS_KEY = "futscore_notification_settings";
const LAST_CHECK_TIME_KEY = "futscore_last_check_time"; // Persistente para evitar duplicatas ao reabrir app

// Lock para evitar verificações simultâneas (evita notificações duplicadas)
let isCheckingMatches = false;
let lastCheckTime = 0;
const MIN_CHECK_INTERVAL = 30000; // 30 segundos entre verificações (aumentado para evitar duplicatas)

// Interface das configurações de notificação
interface NotificationSettings {
  allMatches: boolean;
  favoritesOnly: boolean;
  goals: boolean;
  matchStart: boolean;
}

// Interface do jogo favorito (mesmo formato do FavoritesContext)
interface FavoriteMatchData {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  leagueName: string;
  msnGameId?: string;
}

// Helper para carregar partidas favoritas do AsyncStorage
async function loadFavoriteMatches(): Promise<FavoriteMatchData[]> {
  try {
    const json = await AsyncStorage.getItem(FAVORITE_MATCHES_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

// Helper para carregar configurações de notificação
async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const json = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (json) {
      return JSON.parse(json);
    }
    // Valores padrão: apenas favoritos, não todos os jogos
    return {
      allMatches: false,
      favoritesOnly: true,
      goals: true,
      matchStart: true,
    };
  } catch {
    return {
      allMatches: false,
      favoritesOnly: true,
      goals: true,
      matchStart: true,
    };
  }
}

// Helper para verificar se deve notificar uma partida
function shouldNotifyMatch(
  match: Match,
  favoriteTeams: number[],
  favoriteMatches: FavoriteMatchData[],
  settings: NotificationSettings,
): boolean {
  // Se allMatches está habilitado, notificar tudo
  if (settings.allMatches) {
    return true;
  }

  // Se favoritesOnly está habilitado, verificar se é favorito
  if (settings.favoritesOnly) {
    const isTeamFavorite =
      favoriteTeams.includes(match.teams.home.id) ||
      favoriteTeams.includes(match.teams.away.id);
    const isMatchFavorite = isMatchFavorited(match, favoriteMatches);

    return isTeamFavorite || isMatchFavorite;
  }

  // Se nenhuma opção está habilitada, não notificar
  return false;
}

// Helper para verificar se partida é favorita (por fixtureId ou msnGameId)
function isMatchFavorited(
  match: Match,
  favoriteMatches: FavoriteMatchData[],
): boolean {
  const fixtureId = match.fixture.id;
  const msnGameId = match.fixture.msnGameId;

  return favoriteMatches.some(
    (fav) =>
      fav.fixtureId === fixtureId || (msnGameId && fav.msnGameId === msnGameId),
  );
}

export const matchService = {
  /**
   * Fetches live matches and checks for score updates.
   * PRIORITY: MSN Sports API (primary) → football-data.org (fallback only if MSN fails)
   * @param favoriteTeams List of favorite team IDs
   * @returns List of live matches
   */
  checkMatchesAndNotify: async (
    favoriteTeams: number[] = [],
    forceRefresh: boolean = false,
  ) => {
    // Proteção contra chamadas simultâneas/muito frequentes
    const now = Date.now();
    if (isCheckingMatches) {
      console.log("[MatchService] Already checking matches, skipping...");
      return null; // Retorna null para indicar que a chamada foi ignorada
    }

    // Se não for forceRefresh, aplicar verificações de tempo
    if (!forceRefresh) {
      // Verificação em memória (rápida)
      if (now - lastCheckTime < MIN_CHECK_INTERVAL) {
        console.log(
          "[MatchService] Called too soon (memory check), skipping to avoid duplicates...",
        );
        return null; // Retorna null para indicar que a chamada foi ignorada
      }

      // Verificação persistente (evita duplicatas ao reabrir app)
      try {
        const lastCheckPersisted =
          await AsyncStorage.getItem(LAST_CHECK_TIME_KEY);
        if (lastCheckPersisted) {
          const lastCheckTimePersisted = parseInt(lastCheckPersisted, 10);
          if (now - lastCheckTimePersisted < MIN_CHECK_INTERVAL) {
            console.log(
              "[MatchService] Called too soon (persistent check), skipping to avoid duplicates...",
            );
            // Atualizar a variável em memória para próximas verificações
            lastCheckTime = lastCheckTimePersisted;
            return null; // Retorna null para indicar que a chamada foi ignorada
          }
        }
      } catch (error) {
        console.log(
          "[MatchService] Error reading persistent check time:",
          error,
        );
      }
    } else {
      console.log(
        "[MatchService] Force refresh enabled, skipping time checks...",
      );
    }

    isCheckingMatches = true;
    lastCheckTime = now;

    // Salvar timestamp persistente
    try {
      await AsyncStorage.setItem(LAST_CHECK_TIME_KEY, now.toString());
    } catch (error) {
      console.log("[MatchService] Error saving persistent check time:", error);
    }

    try {
      console.log(
        "[MatchService] Checking matches with PRIORITY API (MSN → football-data)...",
      );

      const { msnSportsApi } = await import("./msnSportsApi");
      const { transformMsnGameToMatch } =
        await import("../utils/msnTransformer");

      // Define league mapping: MSN ID → football-data ID
      const leagueMapping = [
        {
          msn: "Soccer_BrazilBrasileiroSerieA",
          fd: "BSA",
          sport: "Soccer",
          name: "Brasileirão",
        },
        {
          msn: "Soccer_BrazilCopaDoBrasil",
          fd: null,
          sport: "Soccer",
          name: "Copa do Brasil",
        },
        {
          msn: "Soccer_InternationalClubsCopaLibertadores",
          fd: null,
          sport: "Soccer",
          name: "Copa Libertadores",
        },
        {
          msn: "Soccer_InternationalClubsUEFAChampionsLeague",
          fd: "CL",
          sport: "Soccer",
          name: "Champions League",
        },
        {
          msn: "Soccer_UEFAEuropaLeague",
          fd: null,
          sport: "Soccer",
          name: "Europa League",
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
        {
          msn: "Soccer_BrazilCarioca",
          fd: null,
          sport: "Soccer",
          name: "Campeonato Carioca",
        },
        {
          msn: "Soccer_BrazilMineiro",
          fd: null,
          sport: "Soccer",
          name: "Campeonato Mineiro",
        },
        {
          msn: "Soccer_BrazilPaulistaSerieA1",
          fd: null,
          sport: "Soccer",
          name: "Campeonato Paulista",
        },
        {
          msn: "Soccer_BrazilGaucho",
          fd: null,
          sport: "Soccer",
          name: "Campeonato Gaúcho",
        },
      ];

      let allFixtures: Match[] = [];

      // Get today's date string for schedule API
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // Helper function to check if a match is from today
      const isMatchFromToday = (match: Match): boolean => {
        const matchDate = new Date(match.fixture.date);
        const matchDateStr = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, "0")}-${String(matchDate.getDate()).padStart(2, "0")}`;
        return matchDateStr === todayStr;
      };

      // Helper function to check if a match is not finished
      const isMatchNotFinished = (match: Match): boolean => {
        const status = match.fixture.status?.short?.toUpperCase() || "";
        return ![
          "FT",
          "AET",
          "PEN",
          "PST",
          "CANC",
          "ABD",
          "AWD",
          "WO",
        ].includes(status);
      };

      // Try each league: MSN first, then football-data fallback
      for (const league of leagueMapping) {
        let leagueMatches: Match[] = [];

        // 1. Try MSN Sports getLiveAroundLeague first (for live/upcoming matches)
        try {
          const games = await msnSportsApi.getLiveAroundLeague(
            league.msn,
            league.sport,
          );

          if (games && games.length > 0) {
            const allMatches = games.map((game: any) =>
              transformMsnGameToMatch(game),
            );

            // Include ALL today's matches (scheduled, live, and finished)
            const todayMatches = allMatches.filter(
              (m: Match) => isMatchFromToday(m),
            );

            // Also include live/in-progress matches even if from previous days
            const liveMatchesFromOtherDays = allMatches.filter((m: Match) => {
              const status = m.fixture.status?.short?.toUpperCase() || "";
              const isLive = ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"].includes(status);
              // Only include if it's live AND not from today (to avoid duplicates)
              return isLive && !isMatchFromToday(m);
            });

            // Combine: ALL today's matches + any live matches from other days (deduplicated)
            const matchIds = new Set<number>();
            leagueMatches = [...todayMatches, ...liveMatchesFromOtherDays].filter(
              (m: Match) => {
                if (matchIds.has(m.fixture.id)) return false;
                matchIds.add(m.fixture.id);
                return true;
              },
            );

            if (leagueMatches.length > 0) {
              console.log(
                `[MatchService] ✓ ${league.name}: ${leagueMatches.length} matches from MSN Sports (live API)`,
              );
            } else {
              console.log(
                `[MatchService] ○ ${league.name}: ${allMatches.length} matches found but none for today`,
              );
            }
          }
        } catch (error) {
          console.log(
            `[MatchService] ✗ ${league.name}: MSN Sports live failed`,
          );
        }

        // 2. If getLiveAroundLeague returned no active matches for today, try getScheduleByDate
        // This is especially important for leagues like Carioca that may have later games
        if (leagueMatches.length === 0) {
          try {
            const scheduleGames = await msnSportsApi.getScheduleByDate(
              league.msn,
              todayStr,
            );
            if (scheduleGames && scheduleGames.length > 0) {
              leagueMatches = scheduleGames.map((game: any) =>
                transformMsnGameToMatch({ ...game, seasonId: league.msn }),
              );
              console.log(
                `[MatchService] ✓ ${league.name}: ${leagueMatches.length} matches from MSN Sports (schedule)`,
              );
            }
          } catch (error) {
            console.log(
              `[MatchService] ✗ ${league.name}: MSN Sports schedule failed`,
            );
          }
        }

        // 3. If MSN failed or returned empty, try football-data as fallback
        if (leagueMatches.length === 0 && league.fd) {
          try {
            const fixtures = await api.getFixtures(league.fd);
            if (fixtures && fixtures.length > 0) {
              leagueMatches = fixtures;
              console.log(
                `[MatchService] ✓ ${league.name}: ${leagueMatches.length} matches from football-data fallback`,
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

      // SPECIAL: Fetch FIFA Intercontinental Cup from ESPN API (not available in MSN)
      try {
        const { espnApi } = await import("./espnApi");
        const espnEvents = await espnApi.getIntercontinentalCupEvents();

        if (espnEvents && espnEvents.length > 0) {
          // Transform ESPN events to Match format
          const intercontinentalMatches: Match[] = espnEvents.map((event) => {
            const homeCompetitor = event.competitors?.find(
              (c: any) => c.homeAway === "home",
            );
            const awayCompetitor = event.competitors?.find(
              (c: any) => c.homeAway === "away",
            );

            // Map ESPN status to our format
            let statusShort = "NS";
            let statusLong = "Não Iniciado";
            if (event.status === "in") {
              statusShort = event.period === 1 ? "1H" : "2H";
              statusLong =
                event.period === 1 ? "Primeiro Tempo" : "Segundo Tempo";
            } else if (event.status === "post") {
              statusShort = "FT";
              statusLong = "Encerrado";
            }
            // Extract scoring summary from ESPN format
            const scoringSummary: Match["scoringSummary"] = [];
            if (homeCompetitor?.scoringSummary) {
              homeCompetitor.scoringSummary.forEach((s: any) => {
                scoringSummary.push({
                  player:
                    s.athlete?.shortName || s.athlete?.displayName || "Unknown",
                  minute: s.displayValue || "",
                  team: "home",
                });
              });
            }
            if (awayCompetitor?.scoringSummary) {
              awayCompetitor.scoringSummary.forEach((s: any) => {
                scoringSummary.push({
                  player:
                    s.athlete?.shortName || s.athlete?.displayName || "Unknown",
                  minute: s.displayValue || "",
                  team: "away",
                });
              });
            }

            return {
              fixture: {
                id: parseInt(event.id) || Math.floor(Math.random() * 1000000),
                date: event.date,
                status: {
                  short: statusShort,
                  long: statusLong,
                  elapsed: event.clock ? parseInt(event.clock) : undefined,
                },
                venue: event.location
                  ? { name: event.location, city: "" }
                  : undefined,
              },
              league: {
                id: "FIC",
                name: "Copa Intercontinental",
                logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/22902.png",
                country: "Internacional",
              },
              teams: {
                home: {
                  id: parseInt(homeCompetitor?.id || "0"),
                  name: homeCompetitor?.displayName || "Unknown",
                  logo: homeCompetitor?.logo || "",
                  form: homeCompetitor?.form,
                  record: homeCompetitor?.record,
                },
                away: {
                  id: parseInt(awayCompetitor?.id || "0"),
                  name: awayCompetitor?.displayName || "Unknown",
                  logo: awayCompetitor?.logo || "",
                  form: awayCompetitor?.form,
                  record: awayCompetitor?.record,
                },
              },
              goals: {
                home: homeCompetitor?.score
                  ? parseInt(homeCompetitor.score)
                  : null,
                away: awayCompetitor?.score
                  ? parseInt(awayCompetitor.score)
                  : null,
              },
              score: {
                halftime: { home: null, away: null },
                fulltime: {
                  home: homeCompetitor?.score
                    ? parseInt(homeCompetitor.score)
                    : null,
                  away: awayCompetitor?.score
                    ? parseInt(awayCompetitor.score)
                    : null,
                },
              },
              scoringSummary:
                scoringSummary.length > 0 ? scoringSummary : undefined,
            };
          });

          allFixtures = [...allFixtures, ...intercontinentalMatches];
          console.log(
            `[MatchService] ✓ Copa Intercontinental: ${intercontinentalMatches.length} matches from ESPN`,
          );
        }
      } catch (error) {
        console.log(
          "[MatchService] ✗ Copa Intercontinental: ESPN fetch failed",
          error,
        );
      }

      console.log(`[MatchService] Total unique matches: ${allFixtures.length}`);

      // Filter for today (local time)
      const todayLocal = new Date().toLocaleDateString("pt-BR");
      const filteredFixtures = allFixtures.filter((m) => {
        const matchDate = new Date(m.fixture.date).toLocaleDateString("pt-BR");
        return matchDate === todayLocal;
      });

      // Filter for live matches (soccer: 1H, 2H, HT | basketball: Q1-Q4, OT)
      const liveMatches = filteredFixtures.filter((m) => {
        const status = m.fixture.status.short;
        return (
          ["1H", "2H", "HT", "ET", "P", "BT", "Q1", "Q2", "Q3", "Q4"].includes(
            status,
          ) || status.startsWith("OT")
        );
      });

      // Carregar partidas favoritas
      const favoriteMatches = await loadFavoriteMatches();

      // Carregar configurações de notificação
      const notificationSettings = await loadNotificationSettings();

      console.log(
        `[MatchService] Notification settings: allMatches=${notificationSettings.allMatches}, favoritesOnly=${notificationSettings.favoritesOnly}, goals=${notificationSettings.goals}, matchStart=${notificationSettings.matchStart}`,
      );
      console.log(
        `[MatchService] Favorite teams: ${favoriteTeams.length}, Favorite matches: ${favoriteMatches.length}`,
      );

      // Check for matches that just STARTED (notify all users)
      if (liveMatches.length > 0) {
        await checkMatchStarted(
          liveMatches,
          favoriteTeams,
          favoriteMatches,
          notificationSettings,
        );
      }

      // Check for HALFTIME (notify all users)
      if (liveMatches.length > 0) {
        await checkHalfTime(
          liveMatches,
          favoriteTeams,
          favoriteMatches,
          notificationSettings,
        );
      }

      // Check for score changes in ALL live matches
      if (liveMatches.length > 0) {
        await checkScoreChanges(
          liveMatches,
          favoriteTeams,
          favoriteMatches,
          notificationSettings,
        );
      }

      // Check for FINISHED matches (notify all users)
      const finishedMatches = filteredFixtures.filter((m) =>
        ["FT", "AET", "PEN"].includes(m.fixture.status.short),
      );
      if (finishedMatches.length > 0) {
        await checkMatchFinished(
          finishedMatches,
          favoriteTeams,
          favoriteMatches,
          notificationSettings,
        );
      }

      // Periodic cache cleanup (once per day)
      await cleanupOldCache();

      // Schedule start notifications ONLY for relevant matches (based on settings)
      const upcomingMatches = filteredFixtures.filter((m) =>
        ["NS", "TBD"].includes(m.fixture.status.short),
      );

      // Filtrar apenas partidas que devem ser notificadas
      for (const match of upcomingMatches) {
        // Só agendar notificação se matchStart estiver habilitado E for um jogo relevante
        if (
          notificationSettings.matchStart &&
          shouldNotifyMatch(
            match,
            favoriteTeams,
            favoriteMatches,
            notificationSettings,
          )
        ) {
          await scheduleMatchStartNotification(match);
        }
      }

      return {
        liveMatches,
        todaysMatches: filteredFixtures,
      };
    } catch (error) {
      console.error("[MatchService] Error checking matches:", error);
      return { liveMatches: [], todaysMatches: [] };
    } finally {
      // Sempre liberar o lock, mesmo se houver erro
      isCheckingMatches = false;
    }
  },
};

// Verifica se algum jogo acabou de COMEÇAR
async function checkMatchStarted(
  currentMatches: Match[],
  favoriteTeams: number[],
  favoriteMatches: FavoriteMatchData[],
  settings: NotificationSettings,
) {
  // Se matchStart está desabilitado, não notificar
  if (!settings.matchStart) return;

  try {
    const notifiedJson = await AsyncStorage.getItem(NOTIFIED_MATCHES_KEY);
    const notifiedMatches: number[] = notifiedJson
      ? JSON.parse(notifiedJson)
      : [];

    console.log(
      `[MatchService] Already notified matches in cache: ${notifiedMatches.length}`,
    );

    let hasChanges = false;
    const updatedNotified = [...notifiedMatches];

    for (const match of currentMatches) {
      const matchId = match.fixture.id;
      const status = match.fixture.status.short;

      // Se está no primeiro tempo e ainda não notificamos
      if (status === "1H" && !notifiedMatches.includes(matchId)) {
        // Verificar se deve notificar esta partida
        if (
          !shouldNotifyMatch(match, favoriteTeams, favoriteMatches, settings)
        ) {
          updatedNotified.push(matchId); // Marcar como processado mesmo sem notificar
          hasChanges = true;
          continue;
        }

        const isHomeFavorite = favoriteTeams.includes(match.teams.home.id);
        const isAwayFavorite = favoriteTeams.includes(match.teams.away.id);
        const isTeamFavorite = isHomeFavorite || isAwayFavorite;
        const isMatchFavorited_ = isMatchFavorited(match, favoriteMatches);

        // Prioridade: partida favorita > time favorito
        const isFavoriteMatch = isMatchFavorited_ || isTeamFavorite;

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
        JSON.stringify(trimmedNotified),
      );
    }
  } catch (error) {
    console.error("[MatchService] Error checking match started:", error);
  }
}

async function checkScoreChanges(
  currentMatches: Match[],
  favoriteTeams: number[],
  favoriteMatches: FavoriteMatchData[],
  settings: NotificationSettings,
) {
  // Se goals está desabilitado, não notificar
  if (!settings.goals) return;

  try {
    // Load last known scores
    const lastKnownJson = await AsyncStorage.getItem(LAST_KNOWN_SCORES_KEY);
    const lastKnownScores: Record<number, { home: number; away: number }> =
      lastKnownJson ? JSON.parse(lastKnownJson) : {};

    // Load notified goals cache (para evitar duplicatas)
    const notifiedGoalsJson = await AsyncStorage.getItem(NOTIFIED_GOALS_KEY);
    const notifiedGoals: string[] = notifiedGoalsJson
      ? JSON.parse(notifiedGoalsJson)
      : [];

    const newScores: Record<number, { home: number; away: number }> = {
      ...lastKnownScores,
    };
    const updatedNotifiedGoals = [...notifiedGoals];
    let hasScoreChanges = false;
    let hasGoalChanges = false;

    console.log(
      `[MatchService] Already notified goals in cache: ${notifiedGoals.length}`,
    );

    for (const match of currentMatches) {
      const matchId = match.fixture.id;
      const currentHome = match.goals.home ?? 0;
      const currentAway = match.goals.away ?? 0;

      const previous = lastKnownScores[matchId];

      if (previous) {
        const homeChanged = currentHome > previous.home;
        const awayChanged = currentAway > previous.away;

        // Criar identificador único para o gol: matchId_home_away
        const goalKey = `${matchId}_${currentHome}_${currentAway}`;

        // Só notifica se o gol ainda não foi notificado E se deve notificar esta partida
        if ((homeChanged || awayChanged) && !notifiedGoals.includes(goalKey)) {
          // Marcar gol como processado independentemente
          updatedNotifiedGoals.push(goalKey);
          hasGoalChanges = true;

          // Verificar se deve notificar esta partida
          if (
            !shouldNotifyMatch(match, favoriteTeams, favoriteMatches, settings)
          ) {
            continue;
          }

          const scorerTeam = homeChanged
            ? match.teams.home.name
            : match.teams.away.name;
          const isHomeFavorite = favoriteTeams.includes(match.teams.home.id);
          const isAwayFavorite = favoriteTeams.includes(match.teams.away.id);
          const isTeamFavorite = isHomeFavorite || isAwayFavorite;
          const isMatchFavorited_ = isMatchFavorited(match, favoriteMatches);

          // Prioridade: partida favorita > time favorito
          const isFavoriteMatch = isMatchFavorited_ || isTeamFavorite;

          // Usar a nova função de notificação de gol
          await notifyGoal(match, scorerTeam, isFavoriteMatch);

          console.log(`[MatchService] Goal notified: ${goalKey}`);
        }
      } else {
        // Primeira vez vendo este jogo - apenas salvar o placar atual SEM notificar
        console.log(
          `[MatchService] First time seeing match ${matchId}, saving score without notification`,
        );
      }

      // Update known score
      if (
        !previous ||
        previous.home !== currentHome ||
        previous.away !== currentAway
      ) {
        newScores[matchId] = { home: currentHome, away: currentAway };
        hasScoreChanges = true;
      }
    }

    // Salvar placares atualizados
    if (hasScoreChanges) {
      await AsyncStorage.setItem(
        LAST_KNOWN_SCORES_KEY,
        JSON.stringify(newScores),
      );
    }

    // Salvar cache de gols notificados (manter últimos 500)
    if (hasGoalChanges) {
      const trimmedGoals = updatedNotifiedGoals.slice(-500);
      await AsyncStorage.setItem(
        NOTIFIED_GOALS_KEY,
        JSON.stringify(trimmedGoals),
      );
    }
  } catch (error) {
    console.error("[MatchService] Error checking score changes:", error);
  }
}

// Verifica se algum jogo está no INTERVALO
async function checkHalfTime(
  currentMatches: Match[],
  favoriteTeams: number[],
  favoriteMatches: FavoriteMatchData[],
  settings: NotificationSettings,
) {
  try {
    const notifiedJson = await AsyncStorage.getItem(NOTIFIED_HALFTIME_KEY);
    const notifiedMatches: number[] = notifiedJson
      ? JSON.parse(notifiedJson)
      : [];

    let hasChanges = false;
    const updatedNotified = [...notifiedMatches];

    for (const match of currentMatches) {
      const matchId = match.fixture.id;
      const status = match.fixture.status.short;

      // Se está no intervalo e ainda não notificamos
      if (status === "HT" && !notifiedMatches.includes(matchId)) {
        updatedNotified.push(matchId);
        hasChanges = true;

        // Verificar se deve notificar esta partida
        if (
          !shouldNotifyMatch(match, favoriteTeams, favoriteMatches, settings)
        ) {
          continue;
        }

        const isHomeFavorite = favoriteTeams.includes(match.teams.home.id);
        const isAwayFavorite = favoriteTeams.includes(match.teams.away.id);
        const isTeamFavorite = isHomeFavorite || isAwayFavorite;
        const isMatchFavorited_ = isMatchFavorited(match, favoriteMatches);

        // Prioridade: partida favorita > time favorito
        const isFavoriteMatch = isMatchFavorited_ || isTeamFavorite;

        // Notificar intervalo
        await notifyHalfTime(match, isFavoriteMatch);
      }
    }

    // Manter apenas os últimos 100 jogos notificados
    const trimmedNotified = updatedNotified.slice(-100);

    if (hasChanges) {
      await AsyncStorage.setItem(
        NOTIFIED_HALFTIME_KEY,
        JSON.stringify(trimmedNotified),
      );
    }
  } catch (error) {
    console.error("[MatchService] Error checking half time:", error);
  }
}

// Verifica se algum jogo TERMINOU
async function checkMatchFinished(
  finishedMatches: Match[],
  favoriteTeams: number[],
  favoriteMatches: FavoriteMatchData[],
  settings: NotificationSettings,
) {
  try {
    const notifiedJson = await AsyncStorage.getItem(NOTIFIED_FINISHED_KEY);
    const notifiedMatches: number[] = notifiedJson
      ? JSON.parse(notifiedJson)
      : [];

    let hasChanges = false;
    const updatedNotified = [...notifiedMatches];

    for (const match of finishedMatches) {
      const matchId = match.fixture.id;

      // Se o jogo terminou e ainda não notificamos
      if (!notifiedMatches.includes(matchId)) {
        updatedNotified.push(matchId);
        hasChanges = true;

        // Verificar se deve notificar esta partida
        if (
          !shouldNotifyMatch(match, favoriteTeams, favoriteMatches, settings)
        ) {
          continue;
        }

        const isHomeFavorite = favoriteTeams.includes(match.teams.home.id);
        const isAwayFavorite = favoriteTeams.includes(match.teams.away.id);
        const isTeamFavorite = isHomeFavorite || isAwayFavorite;
        const isMatchFavorited_ = isMatchFavorited(match, favoriteMatches);

        // Prioridade: partida favorita > time favorito
        const isFavoriteMatch = isMatchFavorited_ || isTeamFavorite;

        // Notificar fim de jogo
        await notifyMatchEnded(match, isFavoriteMatch);
      }
    }

    // Manter apenas os últimos 100 jogos notificados
    const trimmedNotified = updatedNotified.slice(-100);

    if (hasChanges) {
      await AsyncStorage.setItem(
        NOTIFIED_FINISHED_KEY,
        JSON.stringify(trimmedNotified),
      );
    }
  } catch (error) {
    console.error("[MatchService] Error checking match finished:", error);
  }
}

// Limpeza periódica do cache (uma vez por dia)
async function cleanupOldCache() {
  try {
    const lastCleanup = await AsyncStorage.getItem(CACHE_CLEANUP_KEY);
    const now = new Date();
    const today = now.toDateString();

    // Se já limpou hoje, não fazer nada
    if (lastCleanup === today) {
      return;
    }

    console.log("[MatchService] Running daily cache cleanup...");

    // Limpar scores de jogos antigos (manter apenas os de hoje)
    const scoresJson = await AsyncStorage.getItem(LAST_KNOWN_SCORES_KEY);
    if (scoresJson) {
      const scores = JSON.parse(scoresJson);
      // Limpar tudo - os jogos de hoje serão re-adicionados automaticamente
      // Isso evita acúmulo infinito de dados
      const keysCount = Object.keys(scores).length;
      if (keysCount > 200) {
        // Se tiver mais de 200 jogos, limpar
        await AsyncStorage.setItem(LAST_KNOWN_SCORES_KEY, JSON.stringify({}));
        console.log(`[MatchService] Cleared ${keysCount} old score entries`);
      }
    }

    // Limpar listas de notificados (manter apenas últimos 50)
    const cleanupList = async (key: string) => {
      const json = await AsyncStorage.getItem(key);
      if (json) {
        const list = JSON.parse(json);
        if (list.length > 50) {
          const trimmed = list.slice(-50);
          await AsyncStorage.setItem(key, JSON.stringify(trimmed));
          console.log(`[MatchService] Trimmed ${key}: ${list.length} -> 50`);
        }
      }
    };

    await cleanupList(NOTIFIED_MATCHES_KEY);
    await cleanupList(NOTIFIED_HALFTIME_KEY);
    await cleanupList(NOTIFIED_FINISHED_KEY);

    // Marcar que limpou hoje
    await AsyncStorage.setItem(CACHE_CLEANUP_KEY, today);
    console.log("[MatchService] Cache cleanup completed");
  } catch (error) {
    console.error("[MatchService] Error during cache cleanup:", error);
  }
}
