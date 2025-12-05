import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CONFIG } from "../constants/config";
import { League, Match, Team, Player } from "../types";
import { Country } from "../types/country";

// Backend API client (proxies to football-data.org)
const apiClient = axios.create({
  baseURL: `${CONFIG.BACKEND_URL}/api/football`,
});

const CACHE_PREFIX = "futscore_cache_";

const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (jsonValue != null) {
      const { data, timestamp, duration } = JSON.parse(jsonValue);
      if (Date.now() - timestamp < duration) {
        console.log(`[CACHE] Hit for ${key}`);
        return data;
      } else {
        console.log(`[CACHE] Expired for ${key}`);
      }
    }
  } catch (e) {
    console.error("Error reading cache", e);
  }
  return null;
};

const setCachedData = async (key: string, data: any, duration: number) => {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      duration,
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
  } catch (e) {
    console.error("Error saving cache", e);
  }
};

export const api = {
  getLeagues: async (): Promise<League[]> => {
    const cacheKey = "leagues";
    const cached = await getCachedData<League[]>(cacheKey);
    if (cached) return cached;

    // For football-data.org, we'll hardcode the leagues we support
    const leaguesData: League[] = [
      {
        id: "BSA" as any,
        name: "Campeonato Brasileiro Série A",
        logo: "https://crests.football-data.org/764.png",
        country: "Brazil",
      },
      {
        id: "CL" as any,
        name: "UEFA Champions League",
        logo: "https://crests.football-data.org/CL.png",
        country: "Europe",
      },
      {
        id: "PD" as any,
        name: "La Liga",
        logo: "https://crests.football-data.org/PD.png",
        country: "Spain",
      },
    ];

    await setCachedData(cacheKey, leaguesData, CONFIG.CACHE_DURATION.LEAGUES);
    return leaguesData;
  },

  getFixtures: async (leagueCode: string, date?: string): Promise<Match[]> => {
    const today = new Date().toISOString().split("T")[0];
    const queryDate = date || today;

    const cacheKey = `fixtures_${leagueCode}_${queryDate}`;

    const cached = await getCachedData<Match[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.get(
        `/competitions/${leagueCode}/matches`,
        {
          params: {
            dateFrom: queryDate,
            dateTo: queryDate,
          },
        }
      );

      console.log(
        `[API] Fetched ${
          response.data.matches?.length || 0
        } matches for ${leagueCode} on ${queryDate}`
      );

      if (!response.data.matches || response.data.matches.length === 0) {
        return [];
      }

      // Transform football-data.org format to our format
      const matches: Match[] = response.data.matches.map((match: any) => ({
        fixture: {
          id: match.id,
          date: match.utcDate,
          status: {
            long:
              match.status === "FINISHED"
                ? "Partida Encerrada"
                : match.status === "IN_PLAY"
                ? "Em Andamento"
                : match.status === "PAUSED"
                ? "Intervalo"
                : "Não Iniciado",
            short:
              match.status === "FINISHED"
                ? "FT"
                : match.status === "IN_PLAY"
                ? "1H"
                : match.status === "PAUSED"
                ? "HT"
                : "NS",
            elapsed: match.minute || null,
          },
        },
        league: {
          id: match.competition.code as any,
          name: match.competition.name,
          logo: match.competition.emblem || "",
          country: match.area.name,
        },
        teams: {
          home: {
            id: match.homeTeam.id,
            name: match.homeTeam.name,
            logo: match.homeTeam.crest || "",
          },
          away: {
            id: match.awayTeam.id,
            name: match.awayTeam.name,
            logo: match.awayTeam.crest || "",
          },
        },
        goals: {
          home: match.score.fullTime.home,
          away: match.score.fullTime.away,
        },
      }));

      console.log(`[API] Transformed ${matches.length} matches for cache`);

      const cacheDuration =
        queryDate === today
          ? CONFIG.CACHE_DURATION.TODAY_FIXTURES
          : CONFIG.CACHE_DURATION.FIXTURES;
      await setCachedData(cacheKey, matches, cacheDuration);
      return matches;
    } catch (error) {
      console.error("[API] Error fetching fixtures:", error);
      return [];
    }
  },

  getLiveMatches: async (leagueCodes: string[]): Promise<Match[]> => {
    const cacheKey = `live_${leagueCodes.join("_")}`;
    const cached = await getCachedData<Match[]>(cacheKey);
    if (cached) return cached;

    try {
      let allMatches: Match[] = [];

      // football-data.org doesn't have a single "live" endpoint
      // We need to fetch today's matches and filter by status
      for (const code of leagueCodes) {
        const matches = await api.getFixtures(code);
        const liveMatches = matches.filter((m: Match) => {
          const status = m.fixture.status.short;
          return (
            status === "1H" ||
            status === "2H" ||
            status === "HT" ||
            status === "Q1" ||
            status === "Q2" ||
            status === "Q3" ||
            status === "Q4" ||
            status.startsWith("OT")
          );
        });
        allMatches = [...allMatches, ...liveMatches];
      }

      await setCachedData(cacheKey, allMatches, CONFIG.CACHE_DURATION.LIVE);
      return allMatches;
    } catch (error) {
      console.error("Error fetching live matches", error);
      return [];
    }
  },

  // Keeping these for the Explore feature, but they won't work with football-data.org
  // Would need a different approach or remove the feature
  getCountries: async (): Promise<Country[]> => {
    console.warn("getCountries not available with football-data.org");
    return [];
  },

  getLeaguesByCountry: async (countryName: string): Promise<League[]> => {
    console.warn("getLeaguesByCountry not available with football-data.org");
    return [];
  },
  getMatchDetails: async (matchId: number): Promise<Match | null> => {
    const cacheKey = `match_${matchId}`;
    const cached = await getCachedData<Match>(cacheKey);
    if (cached) return cached;

    try {
      // football-data.org endpoint for single match
      const response = await apiClient.get(`/matches/${matchId}`);

      if (!response.data) {
        return null;
      }

      const matchData = response.data;

      // Transform football-data.org format to our format
      const match: Match = {
        fixture: {
          id: matchData.id,
          date: matchData.utcDate,
          status: {
            long:
              matchData.status === "FINISHED"
                ? "Partida Encerrada"
                : matchData.status === "IN_PLAY"
                ? "Em Andamento"
                : matchData.status === "PAUSED"
                ? "Intervalo"
                : "Não Iniciado",
            short:
              matchData.status === "FINISHED"
                ? "FT"
                : matchData.status === "IN_PLAY"
                ? "1H"
                : matchData.status === "PAUSED"
                ? "HT"
                : "NS",
            elapsed: matchData.minute || null,
          },
          venue: matchData.venue
            ? {
                name:
                  matchData.venue.name ||
                  matchData.venue ||
                  "Estádio não informado",
                city: matchData.venue.city || "",
              }
            : undefined,
          referee: matchData.referees?.[0]?.name,
        },
        league: {
          id: matchData.competition.code as any,
          name: matchData.competition.name,
          logo: matchData.competition.emblem || "",
          country: matchData.area.name,
        },
        teams: {
          home: {
            id: matchData.homeTeam.id,
            name: matchData.homeTeam.name,
            logo: matchData.homeTeam.crest || "",
          },
          away: {
            id: matchData.awayTeam.id,
            name: matchData.awayTeam.name,
            logo: matchData.awayTeam.crest || "",
          },
        },
        goals: {
          home: matchData.score.fullTime.home,
          away: matchData.score.fullTime.away,
        },
        score: {
          halftime: {
            home: matchData.score.halfTime.home,
            away: matchData.score.halfTime.away,
          },
          fulltime: {
            home: matchData.score.fullTime.home,
            away: matchData.score.fullTime.away,
          },
        },
        // Statistics might not be available for all matches
        statistics: matchData.statistics || [],
        lineups: matchData.lineups
          ? matchData.lineups.map((lineup: any) => ({
              team: {
                id: lineup.team?.id || 0,
                name: lineup.team?.name || "",
                logo: lineup.team?.crest || "",
                colors: lineup.team?.colors,
              },
              coach: lineup.coach
                ? {
                    id: lineup.coach.id || 0,
                    name: lineup.coach.name || "Não informado",
                    photo: lineup.coach.photo || null,
                  }
                : {
                    id: 0,
                    name: "Não informado",
                    photo: null,
                  },
              formation: lineup.formation || "",
              startXI: (lineup.startXI || []).map((p: any) => ({
                id: p.player?.id || p.id || 0,
                name: p.player?.name || p.name || "Desconhecido",
                number: p.player?.shirtNumber || p.shirtNumber || 0,
                pos: p.player?.position || p.position || "",
                grid: p.player?.grid || null,
              })),
              substitutes: (lineup.substitutes || []).map((p: any) => ({
                id: p.player?.id || p.id || 0,
                name: p.player?.name || p.name || "Desconhecido",
                number: p.player?.shirtNumber || p.shirtNumber || 0,
                pos: p.player?.position || p.position || "",
                grid: p.player?.grid || null,
              })),
            }))
          : [],
      };

      // Cache for a short time (e.g., 5 minutes)
      await setCachedData(cacheKey, match, 5 * 60 * 1000);
      return match;
    } catch (error) {
      console.error("[API] Error fetching match details:", error);
      return null;
    }
  },

  // Get all teams from a specific league/competition
  getTeamsByLeague: async (leagueCode: string): Promise<Team[]> => {
    const cacheKey = `teams_${leagueCode}`;
    const cached = await getCachedData<Team[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.get(`/competitions/${leagueCode}/teams`);

      if (!response.data.teams || response.data.teams.length === 0) {
        return [];
      }

      const teams: Team[] = response.data.teams.map((team: any) => ({
        id: team.id,
        name: team.name,
        logo: team.crest || "",
      }));

      // Cache for 7 days
      await setCachedData(cacheKey, teams, 7 * 24 * 60 * 60 * 1000);
      return teams;
    } catch (error) {
      console.error("[API] Error fetching teams:", error);
      return [];
    }
  },

  // Search teams across multiple leagues
  searchTeams: async (
    query: string,
    leagueCodes?: string[]
  ): Promise<Array<Team & { country: string }>> => {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const leagues = leagueCodes || ["BSA", "CL", "PD"];
      let allTeams: Array<Team & { country: string }> = [];

      for (const code of leagues) {
        const teams = await api.getTeamsByLeague(code);
        const leagueInfo = await api.getLeagues();
        const league = leagueInfo.find((l) => l.id === code);

        const teamsWithCountry = teams.map((team) => ({
          ...team,
          country: league?.country || "Unknown",
        }));

        allTeams = [...allTeams, ...teamsWithCountry];
      }

      // Filter teams by search query
      const searchLower = query.toLowerCase();
      const filtered = allTeams.filter((team) =>
        team.name.toLowerCase().includes(searchLower)
      );

      // Remove duplicates by team ID
      const uniqueTeams = filtered.reduce((acc, team) => {
        if (!acc.find((t: Team & { country: string }) => t.id === team.id)) {
          acc.push(team);
        }
        return acc;
      }, [] as Array<Team & { country: string }>);

      return uniqueTeams;
    } catch (error) {
      console.error("[API] Error searching teams:", error);
      return [];
    }
  },

  getSquad: async (teamId: number): Promise<Player[]> => {
    const cacheKey = `squad_${teamId}`;
    const cached = await getCachedData<Player[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.get(`/teams/${teamId}`);

      if (!response.data || !response.data.squad) {
        return [];
      }

      const squad: Player[] = response.data.squad.map((player: any) => ({
        id: player.id,
        name: player.name,
        number: player.shirtNumber,
        pos: player.position,
        grid: null,
      }));

      await setCachedData(cacheKey, squad, 24 * 60 * 60 * 1000);
      return squad;
    } catch (error) {
      console.error("[API] Error fetching squad:", error);
      return [];
    }
  },

  /**
   * Get recent matches for a specific team (last 5 finished games)
   * @param teamId - Team ID
   * @param limit - Number of matches to return (default: 5)
   */
  getTeamMatches: async (
    teamId: number,
    limit: number = 5
  ): Promise<Match[]> => {
    const cacheKey = `team_matches_${teamId}_${limit}`;
    const cached = await getCachedData<Match[]>(cacheKey);
    if (cached) return cached;

    try {
      // football-data.org endpoint for team matches
      const response = await apiClient.get(`/teams/${teamId}/matches`, {
        params: {
          status: "FINISHED",
          limit: limit * 2, // Request more to ensure we get enough after filtering
        },
      });

      if (!response.data.matches || response.data.matches.length === 0) {
        console.log(`[API] No matches found for team ${teamId}`);
        return [];
      }

      // Transform and filter
      const matches: Match[] = response.data.matches
        .filter((match: any) => match.status === "FINISHED")
        .slice(0, limit)
        .map((match: any) => ({
          fixture: {
            id: match.id,
            date: match.utcDate,
            status: {
              long: "Partida Encerrada",
              short: "FT",
              elapsed: null,
            },
            venue: match.venue
              ? {
                  name: match.venue.name || "Estádio não informado",
                  city: match.venue.city || "",
                }
              : undefined,
          },
          league: {
            id: match.competition.code as any,
            name: match.competition.name,
            logo: match.competition.emblem || "",
            country: match.area?.name || "",
          },
          teams: {
            home: {
              id: match.homeTeam.id,
              name: match.homeTeam.name,
              logo: match.homeTeam.crest || "",
            },
            away: {
              id: match.awayTeam.id,
              name: match.awayTeam.name,
              logo: match.awayTeam.crest || "",
            },
          },
          goals: {
            home: match.score.fullTime.home,
            away: match.score.fullTime.away,
          },
          score: {
            halftime: {
              home: match.score.halfTime.home,
              away: match.score.halfTime.away,
            },
            fulltime: {
              home: match.score.fullTime.home,
              away: match.score.fullTime.away,
            },
          },
        }));

      console.log(
        `[API] Fetched ${matches.length} recent matches for team ${teamId}`
      );

      // Cache for 1 hour
      await setCachedData(cacheKey, matches, 60 * 60 * 1000);
      return matches;
    } catch (error) {
      console.error(
        `[API] Error fetching team matches for team ${teamId}:`,
        error
      );
      return [];
    }
  },

  /**
   * Get upcoming matches for a specific team
   * @param teamId - Team ID
   * @param limit - Number of matches to return (default: 3)
   */
  getTeamUpcomingMatches: async (
    teamId: number,
    limit: number = 3
  ): Promise<Match[]> => {
    const cacheKey = `team_upcoming_${teamId}_${limit}`;
    const cached = await getCachedData<Match[]>(cacheKey);
    if (cached) return cached;

    try {
      // football-data.org endpoint for team matches
      const response = await apiClient.get(`/teams/${teamId}/matches`, {
        params: {
          status: "SCHEDULED",
          limit: limit * 2,
        },
      });

      if (!response.data.matches || response.data.matches.length === 0) {
        console.log(`[API] No upcoming matches found for team ${teamId}`);
        return [];
      }

      // Transform and filter
      const matches: Match[] = response.data.matches
        .filter((match: any) => match.status === "SCHEDULED" || match.status === "TIMED")
        .slice(0, limit)
        .map((match: any) => ({
          fixture: {
            id: match.id,
            date: match.utcDate,
            status: {
              long: "Agendado",
              short: "NS", // Not Started
              elapsed: null,
            },
            venue: match.venue
              ? {
                  name: match.venue.name || "Estádio não informado",
                  city: match.venue.city || "",
                }
              : undefined,
          },
          league: {
            id: match.competition.code as any,
            name: match.competition.name,
            logo: match.competition.emblem || "",
            country: match.area?.name || "",
          },
          teams: {
            home: {
              id: match.homeTeam.id,
              name: match.homeTeam.name,
              logo: match.homeTeam.crest || "",
            },
            away: {
              id: match.awayTeam.id,
              name: match.awayTeam.name,
              logo: match.awayTeam.crest || "",
            },
          },
          goals: {
            home: null,
            away: null,
          },
          score: {
            halftime: {
              home: null,
              away: null,
            },
            fulltime: {
              home: null,
              away: null,
            },
          },
        }));

      console.log(
        `[API] Fetched ${matches.length} upcoming matches for team ${teamId}`
      );

      // Cache for 30 minutes
      await setCachedData(cacheKey, matches, 30 * 60 * 1000);
      return matches;
    } catch (error) {
      console.error(
        `[API] Error fetching team upcoming matches for team ${teamId}:`,
        error
      );
      return [];
    }
  },
};
