import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CONFIG } from "../constants/config";
import { MsnLeague, MsnPersonalizationStrip } from "../types";

// MSN Sports API client
const msnApiClient = axios.create({
  baseURL: CONFIG.MSN_SPORTS.BASE_URL,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "*/*",
    "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
  },
});

const CACHE_PREFIX = "msn_sports_cache_";

// Helper functions for caching
const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (jsonValue != null) {
      const { data, timestamp, duration } = JSON.parse(jsonValue);
      if (Date.now() - timestamp < duration) {
        console.log(`[MSN CACHE] Hit for ${key}`);
        return data;
      } else {
        console.log(`[MSN CACHE] Expired for ${key}`);
      }
    }
  } catch (e) {
    console.error("[MSN CACHE] Error reading cache", e);
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
    console.error("[MSN CACHE] Error saving cache", e);
  }
};

// Generate a unique activity ID for each request
const generateActivityId = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Helper to infer league ID from team ID
// Team ID format: SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2020
const inferLeagueFromTeamId = (teamId: string): string => {
  // Extract league part from team ID
  // Example: SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2020 -> Soccer_BrazilBrasileiroSerieA
  const parts = teamId.split("_");
  if (parts.length >= 3) {
    // Format: SportRadar_Soccer_LeagueName_Year_Team_ID
    // We want: Soccer_LeagueName
    return `${parts[1]}_${parts[2]}`;
  }
  return "Soccer_BrazilBrasileiroSerieA"; // Default fallback
};

export const msnSportsApi = {
  /**
   * Get personalized leagues/competitions available
   */
  getPersonalizationStrip: async (): Promise<MsnLeague[]> => {
    const cacheKey = "personalization_strip";
    const cached = await getCachedData<MsnLeague[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        type: "SportsVertical",
      };

      console.log("[MSN API] Fetching personalization strip...");

      const response = await msnApiClient.get("/personalizationstrip", {
        params,
      });

      if (!response.data || !response.data.value || !response.data.value[0]) {
        console.error("[MSN API] Invalid response structure");
        return [];
      }

      const items = response.data.value[0].items || [];
      const leagues: MsnLeague[] = items
        .filter((item: any) => item.itemType === "League" && item.league)
        .map((item: any) => item.league);

      console.log(`[MSN API] Fetched ${leagues.length} leagues`);

      // Cache for 24 hours
      await setCachedData(cacheKey, leagues, CONFIG.CACHE_DURATION.MSN_LEAGUES);
      return leagues;
    } catch (error) {
      console.error("[MSN API] Error fetching personalization strip:", error);
      return [];
    }
  },

  /**
   * Get detailed entity header information for a specific league
   */
  getEntityHeader: async (
    leagueId: string,
    type: string = "League"
  ): Promise<any> => {
    const cacheKey = `entity_header_${leagueId}`;
    const cached = await getCachedData<any>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        id: leagueId,
        type: type,
        ocid: "sports-league-landing",
        pagetypes:
          "LeagueHome,Scores,Schedule,Standings,Teams,Team,GameCenter,TeamRoster,Player,PlayerStats,TeamStats,Polls,Videos,TourCalendar,TourRankings,RaceCalendar,DriverStandings,ICCRankings,Rankings,Bracket,Statistics,Headlines,Tournament,Results,Medals,TeamSchedule,TeamMedals,TeamResults",
      };

      console.log(`[MSN API] Fetching entity header for ${leagueId}...`);

      const response = await msnApiClient.get("/entityheader", { params });

      if (!response.data || !response.data.value || !response.data.value[0]) {
        console.error("[MSN API] Invalid entity header response structure");
        return null;
      }

      const entityHeader = response.data.value[0];
      console.log(`[MSN API] Fetched entity header for ${leagueId}`);

      // Cache for 6 hours
      await setCachedData(cacheKey, entityHeader, 6 * 60 * 60 * 1000);
      return entityHeader;
    } catch (error) {
      console.error("[MSN API] Error fetching entity header:", error);
      return null;
    }
  },

  /**
   * Get live and upcoming matches for a specific league
   */
  getLiveAroundLeague: async (
    leagueId: string,
    sport: string = "Soccer"
  ): Promise<any[]> => {
    const cacheKey = `live_around_${leagueId}`;
    const cached = await getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        id: leagueId,
        sport: sport,
        datetime: now.toISOString().split(".")[0], // Remove milliseconds
        tzoffset: Math.floor(-now.getTimezoneOffset() / 60).toString(),
        withleaguereco: "true",
        ocid: "sports-league-landing",
      };

      console.log(`[MSN API] Fetching live matches for ${leagueId}...`);

      const response = await msnApiClient.get("/livearoundtheleague", {
        params,
      });

      if (!response.data || !response.data.value || !response.data.value[0]) {
        console.error("[MSN API] Invalid live matches response structure");
        return [];
      }

      const schedules = response.data.value[0].schedules || [];
      const allGames: any[] = [];

      schedules.forEach((schedule: any) => {
        if (schedule.games && Array.isArray(schedule.games)) {
          allGames.push(...schedule.games);
        }
      });

      console.log(`[MSN API] Fetched ${allGames.length} games for ${leagueId}`);

      // Cache for 2 minutes (live data changes frequently)
      await setCachedData(cacheKey, allGames, 2 * 60 * 1000);
      return allGames;
    } catch (error) {
      console.error("[MSN API] Error fetching live matches:", error);
      return [];
    }
  },

  /**
   * Get matches for a specific league and date
   * Uses /liveschedules endpoint which supports date parameter for future/past matches
   * @param leagueId - League ID (e.g., "Soccer_UEFAEuropaLeague")
   * @param date - Date string in YYYY-MM-DD format
   */
  getScheduleByDate: async (leagueId: string, date: string): Promise<any[]> => {
    const cacheKey = `schedule_${leagueId}_${date}`;
    const cached = await getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ids: leagueId,
        date: date,
        withcalendar: "false",
        type: "LeagueSchedule",
        tzoffset: Math.floor(-new Date().getTimezoneOffset() / 60).toString(),
        ocid: "sports-league-schedule",
      };

      console.log(`[MSN API] Fetching schedule for ${leagueId} on ${date}...`);

      const response = await msnApiClient.get("/liveschedules", { params });

      if (!response.data || !response.data.value || !response.data.value[0]) {
        console.log(`[MSN API] No schedule data for ${leagueId} on ${date}`);
        // Cache empty result for 5 minutes to avoid repeated requests
        await setCachedData(cacheKey, [], 5 * 60 * 1000);
        return [];
      }

      const schedules = response.data.value[0].schedules || [];
      const allGames: any[] = [];

      schedules.forEach((schedule: any) => {
        if (schedule.games && Array.isArray(schedule.games)) {
          allGames.push(...schedule.games);
        }
      });

      console.log(
        `[MSN API] Fetched ${allGames.length} games for ${leagueId} on ${date}`
      );

      // Cache for 10 minutes (schedule data doesn't change frequently)
      await setCachedData(cacheKey, allGames, 10 * 60 * 1000);
      return allGames;
    } catch (error: any) {
      // 404 means no games scheduled for this date - not an error
      if (error?.response?.status === 404) {
        console.log(`[MSN API] No games for ${leagueId} on ${date} (404)`);
        // Cache empty result for 5 minutes
        await setCachedData(cacheKey, [], 5 * 60 * 1000);
        return [];
      }
      console.error(
        `[MSN API] Error fetching schedule for ${leagueId}:`,
        error
      );
      return [];
    }
  },

  /**
   * Get calendar of match days for a specific league
   * Returns array of dates (YYYY-MM-DD) that have matches
   * @param leagueId - League ID (e.g., "Soccer_UEFAEuropaLeague")
   * @param startDate - Start date for calendar (optional, defaults to today)
   */
  getLeagueCalendar: async (
    leagueId: string,
    startDate?: string
  ): Promise<{ dates: string[]; calendar: any }> => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const cacheKey = `calendar_v2_${leagueId}_${todayStr}`;
    const cached = await getCachedData<{ dates: string[]; calendar: any }>(
      cacheKey
    );
    if (cached) return cached;

    try {
      const date = startDate || todayStr;
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ids: leagueId,
        date: date,
        withcalendar: "true", // This enables calendar data
        type: "LeagueSchedule",
        tzoffset: Math.floor(-new Date().getTimezoneOffset() / 60).toString(),
        ocid: "sports-league-schedule",
      };

      console.log(`[MSN API] Fetching calendar for ${leagueId}...`);

      const response = await msnApiClient.get("/liveschedules", { params });

      if (!response.data || !response.data.value || !response.data.value[0]) {
        console.log(`[MSN API] No calendar data for ${leagueId}`);
        return { dates: [], calendar: null };
      }

      const data = response.data.value[0];
      const schedules = data.schedules || [];
      const matchDates: string[] = [];

      // Structure: schedules[0].days[] with date as timestamp in milliseconds
      if (
        schedules.length > 0 &&
        schedules[0].days &&
        Array.isArray(schedules[0].days)
      ) {
        schedules[0].days.forEach((day: any) => {
          if (day.date) {
            // Convert timestamp (milliseconds) to YYYY-MM-DD in local timezone
            const timestamp = parseInt(day.date, 10);
            const dateObj = new Date(timestamp);
            // Format as local date to avoid UTC timezone shift
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const dayNum = String(dateObj.getDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${dayNum}`;
            matchDates.push(dateStr);
          }
        });
      }

      console.log(
        `[MSN API] Found ${matchDates.length} match days for ${leagueId}:`,
        matchDates.slice(0, 5)
      );

      const result = { dates: matchDates, calendar: schedules };

      // Cache for 1 hour (calendar doesn't change often)
      await setCachedData(cacheKey, result, 60 * 60 * 1000);
      return result;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        console.log(`[MSN API] No calendar for ${leagueId} (404)`);
        return { dates: [], calendar: null };
      }
      console.error(
        `[MSN API] Error fetching calendar for ${leagueId}:`,
        error
      );
      return { dates: [], calendar: null };
    }
  },

  /**
   * Get league image URL
   * MSN Sports images are served via Bing thumbnail API
   */
  getLeagueImageUrl: (imageId: string): string => {
    // Format: https://www.bing.com/th?id=[imageId]&w=[width]&h=[height]
    // Encode the imageId to handle special characters like |
    const encodedId = encodeURIComponent(imageId);
    return `https://www.bing.com/th?id=${encodedId}&w=100&h=100`;
  },

  /**
   * Get league logo URL by sportWithLeague ID
   * Fetches from cached leagues data
   */
  getLeagueLogo: async (sportWithLeague: string): Promise<string> => {
    try {
      const leagues = await msnSportsApi.getPersonalizationStrip();
      const league = leagues.find((l) => l.sportWithLeague === sportWithLeague);
      if (league?.image?.id) {
        return msnSportsApi.getLeagueImageUrl(league.image.id);
      }
      return "";
    } catch (error) {
      console.error("[MSN API] Error getting league logo:", error);
      return "";
    }
  },

  /**
   * Get league info including image from /sports/leagues endpoint
   */
  getLeagueInfo: async (
    sportWithLeague: string
  ): Promise<{ name: string; logo: string; country: string } | null> => {
    const cacheKey = `league_info_${sportWithLeague}`;
    const cached = await getCachedData<{
      name: string;
      logo: string;
      country: string;
    }>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ids: sportWithLeague,
        scope: "entityHeader",
        ocid: "sports-league-schedule",
      };

      const response = await msnApiClient.get("/leagues", { params });

      if (!response.data?.value?.[0]?.leagues?.[0]) {
        return null;
      }

      const league = response.data.value[0].leagues[0];
      const result = {
        name: league.name?.localizedName || league.name?.rawName || "",
        logo: league.image?.id
          ? `https://www.bing.com/th?id=${league.image.id}&w=100&h=100`
          : "",
        country: "International",
      };

      // Cache for 24 hours
      await setCachedData(cacheKey, result, 24 * 60 * 60 * 1000);
      return result;
    } catch (error) {
      console.error("[MSN API] Error getting league info:", error);
      return null;
    }
  },

  /**
   * Get all league logos for multiple leagues
   */
  getAllLeagueLogos: async (
    sportWithLeagueIds: string[]
  ): Promise<Record<string, string>> => {
    const logos: Record<string, string> = {};

    await Promise.all(
      sportWithLeagueIds.map(async (id) => {
        const info = await msnSportsApi.getLeagueInfo(id);
        if (info?.logo) {
          logos[id] = info.logo;
        }
      })
    );

    return logos;
  },

  /**
   * Clear all MSN Sports cache
   */
  clearCache: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const msnKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(msnKeys);
      console.log("[MSN CACHE] Cleared all cache");
    } catch (error) {
      console.error("[MSN CACHE] Error clearing cache:", error);
    }
  },

  /**
   * Get lineups for a specific match
   * @param gameId - MSN Sports game ID (e.g., "SportRadar_Soccer_EnglandPremierLeague_2025_Game_61300775")
   */
  getLineups: async (gameId: string): Promise<any> => {
    // Extract numeric ID from the full game ID
    // Handles: "SportRadar_Soccer_..._Game_12345" -> "12345"
    let queryId = gameId;
    if (gameId.includes("_Game_")) {
      queryId = gameId.split("_Game_")[1];
    } else if (gameId.includes("_") && !/^[0-9a-f]{8}-/.test(gameId)) {
      queryId = gameId.split("_").pop() || gameId;
    }
    // If it's a UUID, the API might not support it - but we try anyway

    const cacheKey = `lineups_${queryId}`;
    const cached = await getCachedData<any>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: "sports-gamecenter",
        ids: queryId,
      };

      console.log(`[MSN API] Fetching lineups for game ${queryId}...`);

      const response = await msnApiClient.get("/lineups", { params });

      if (
        !response.data ||
        !response.data.value ||
        response.data.value.length === 0
      ) {
        console.log("[MSN API] No lineups data available");
        return null;
      }

      const lineupsData = response.data.value[0];

      // Cache for 1 hour
      await setCachedData(cacheKey, lineupsData, 60 * 60 * 1000);

      console.log(`[MSN API] Fetched lineups successfully`);
      return lineupsData;
    } catch (error) {
      console.error("[MSN API] Error fetching lineups:", error);
      return null;
    }
  },

  /**
   * Get statistics for a specific match
   * @param gameId - MSN Sports game ID (e.g., "SportRadar_Soccer_EnglandPremierLeague_2025_Game_61300775")
   * @param sport - Sport type (e.g., "Soccer", "Basketball")
   * @param leagueId - League ID (e.g., "Soccer_EnglandPremierLeague")
   */
  getStatistics: async (
    gameId: string,
    sport: string = "Soccer",
    leagueId: string
  ): Promise<any> => {
    const cacheKey = `stats_${gameId}`;
    const cached = await getCachedData<any>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: "sports-gamecenter",
        ids: gameId,
        type: "Game",
        scope: "Teamgame",
        sport: sport,
        leagueid: leagueId,
      };

      console.log(`[MSN API] Fetching statistics...`);
      console.log(`[MSN API] GameId: ${gameId}`);
      console.log(`[MSN API] Sport: ${sport}`);
      console.log(`[MSN API] LeagueId: ${leagueId}`);

      const response = await msnApiClient.get("/statistics", { params });

      if (
        !response.data ||
        !response.data.value ||
        response.data.value.length === 0
      ) {
        console.log("[MSN API] No statistics data available");
        return null;
      }

      const statsData = response.data.value[0];

      // Cache for 5 minutes (stats change during live matches)
      await setCachedData(cacheKey, statsData, 5 * 60 * 1000);

      console.log(`[MSN API] Fetched statistics successfully`);
      return statsData;
    } catch (error) {
      console.error("[MSN API] Error fetching statistics:", error);
      return null;
    }
  },

  /**
   * Get timeline/events for a specific match (includes goals, cards, substitutions)
   * @param gameId - MSN Sports game ID (numeric part, e.g., "61300783")
   * @param sport - Sport type (e.g., "Soccer", "Basketball")
   */
  getTimeline: async (
    gameId: string,
    sport: string = "Soccer"
  ): Promise<any> => {
    // Extract just the numeric ID from the full game ID
    const numericId = gameId.split("_").pop() || gameId;
    const cacheKey = `timeline_${numericId}`;
    const cached = await getCachedData<any>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: "sports-gamecenter",
        ids: numericId,
        gameid: numericId,
        sport: sport,
        scope: "timeline",
      };

      console.log(`[MSN API] Fetching timeline for game ${numericId}...`);

      const response = await msnApiClient.get("/timeline", { params });

      if (
        !response.data ||
        !response.data.value ||
        response.data.value.length === 0
      ) {
        console.log("[MSN API] No timeline data available");
        return null;
      }

      const timelineData = response.data.value[0];

      // Cache for 5 minutes (events change during live matches)
      await setCachedData(cacheKey, timelineData, 5 * 60 * 1000);

      console.log(`[MSN API] Fetched timeline successfully`);
      return timelineData;
    } catch (error) {
      console.error("[MSN API] Error fetching timeline:", error);
      return null;
    }
  },

  /**
   * Get league standings/classification table
   * @param leagueId - League ID (e.g., "Soccer_EnglandPremierLeague")
   */
  getStandings: async (leagueId: string): Promise<any> => {
    const cacheKey = `standings_${leagueId}`;
    const cached = await getCachedData<any>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: "sports-league-standings",
        id: leagueId,
        idtype: "league",
        seasonPhase: "regularSeason",
      };

      console.log(`[MSN API] Fetching standings for ${leagueId}...`);

      const response = await msnApiClient.get("/standings", { params });

      if (
        !response.data ||
        !response.data.value ||
        response.data.value.length === 0
      ) {
        console.log("[MSN API] No standings data available");
        return null;
      }

      const standingsData = response.data.value[0];

      // Cache for 1 hour (standings don't change frequently)
      await setCachedData(cacheKey, standingsData, 60 * 60 * 1000);

      console.log(`[MSN API] Fetched standings successfully`);
      return standingsData;
    } catch (error) {
      console.error("[MSN API] Error fetching standings:", error);
      return null;
    }
  },

  /**
   * Get team live schedule (finished and upcoming matches)
   * Uses /liveschedules endpoint which provides richer data including game outcomes
   * @param teamId - Team ID from MSN Sports (e.g., "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2001")
   * @param take - Number of games to return (default: 7, includes past and future)
   */
  getTeamLiveSchedule: async (
    teamId: string,
    take: number = 7
  ): Promise<any[]> => {
    const cacheKey = `team_live_schedule_${teamId}_${take}`;
    const cached = await getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: "sports-gamecenter",
        type: "TeamSchedule",
        ids: teamId,
        take: take,
        tzoffset: Math.floor(-now.getTimezoneOffset() / 60).toString(),
      };

      console.log(`[MSN API] Fetching live schedule for team ${teamId}...`);

      const response = await msnApiClient.get("/liveschedules", { params });

      if (
        !response.data ||
        !response.data.value ||
        response.data.value.length === 0
      ) {
        console.log(
          `[MSN API] No live schedule data available for team ${teamId}`
        );
        return [];
      }

      const scheduleData = response.data.value[0];

      if (!scheduleData.schedules || scheduleData.schedules.length === 0) {
        console.log(
          `[MSN API] No games found in live schedule for team ${teamId}`
        );
        return [];
      }

      // Collect all games from schedules
      let allGames: any[] = [];

      scheduleData.schedules.forEach((schedule: any) => {
        if (schedule.games && Array.isArray(schedule.games)) {
          allGames = [...allGames, ...schedule.games];
        }
      });

      console.log(
        `[MSN API] Fetched ${allGames.length} games from live schedule for team ${teamId}`
      );

      // Cache for 30 minutes (live data changes frequently)
      await setCachedData(cacheKey, allGames, 30 * 60 * 1000);
      return allGames;
    } catch (error) {
      console.error(
        `[MSN API] Error fetching live schedule for ${teamId}:`,
        error
      );
      return [];
    }
  },

  /**
   * Get top players for a team with detailed statistics
   * This endpoint provides player info including jersey number, position, photo, etc.
   * @param teamId - Team ID from MSN Sports (e.g., "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2020")
   * @param leagueId - League ID (e.g., "Soccer_BrazilBrasileiroSerieA")
   * @returns Array of players with statistics
   */
  getTopPlayers: async (teamId: string, leagueId?: string): Promise<any[]> => {
    const cacheKey = `top_players_${teamId}`;
    const cached = await getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      // Try to infer league ID from team ID if not provided
      const inferredLeagueId = leagueId || inferLeagueFromTeamId(teamId);

      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: "sports-gamecenter",
        ids: teamId,
        type: "Team",
        sport: "Soccer",
        leagueid: inferredLeagueId,
      };

      console.log(`[MSN API] Fetching top players for team ${teamId}...`);

      const response = await msnApiClient.get("/topplayers", { params });

      if (
        !response.data ||
        !response.data.value ||
        response.data.value.length === 0
      ) {
        console.log(
          `[MSN API] No top players data available for team ${teamId}`
        );
        return [];
      }

      const topPlayersData = response.data.value[0];

      // Extract all unique players from all categories (Goals, Assists, Cards)
      const playersMap = new Map<string, any>();

      if (topPlayersData.topPlayers) {
        for (const teamData of topPlayersData.topPlayers) {
          if (teamData.categoryPlayerStatistics) {
            for (const category of teamData.categoryPlayerStatistics) {
              if (category.statistics) {
                for (const stat of category.statistics) {
                  if (stat.player && stat.player.id) {
                    // Only add if not already in map (avoid duplicates)
                    if (!playersMap.has(stat.player.id)) {
                      playersMap.set(stat.player.id, {
                        ...stat.player,
                        stats: {
                          goals: stat.goalsScored || 0,
                          assists: stat.assists || 0,
                          yellowCards: stat.yellowCards || 0,
                          minutesPlayed: stat.minutesPlayed || 0,
                        },
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      const players = Array.from(playersMap.values());
      console.log(
        `[MSN API] Fetched ${players.length} top players for team ${teamId}`
      );

      // Cache for 6 hours (player stats don't change frequently)
      await setCachedData(cacheKey, players, 6 * 60 * 60 * 1000);
      return players;
    } catch (error) {
      console.error(
        `[MSN API] Error fetching top players for ${teamId}:`,
        error
      );
      return [];
    }
  },

  /**
   * Get full team squad from MSN Sports using the teamplayerstatistics endpoint
   * This returns ALL players with their season statistics
   * @param teamId - Team ID from MSN Sports
   * @param leagueId - League ID (optional, will be inferred from teamId)
   * @returns Array of all players
   */
  getFullSquad: async (teamId: string, leagueId?: string): Promise<any[]> => {
    const cacheKey = `full_squad_${teamId}`;
    const cached = await getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    const inferredLeagueId = leagueId || inferLeagueFromTeamId(teamId);
    const allPlayers: Map<string, any> = new Map();

    // Helper to merge player into map (avoid duplicates)
    const addPlayer = (player: any) => {
      const id =
        player.id ||
        player.playerId ||
        `${player.name?.rawName || player.displayName}`;
      if (id && !allPlayers.has(String(id))) {
        allPlayers.set(String(id), player);
      } else if (id) {
        // Merge data if player already exists (combine stats, add missing fields)
        const existing = allPlayers.get(String(id));
        allPlayers.set(String(id), {
          ...existing,
          ...player,
          stats: { ...existing?.stats, ...player?.stats },
        });
      }
    };

    // Source 1 (PRIMARY): Try /statistics with scope=Playerleague - returns ALL players from the team
    try {
      const params1 = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: "sports-gamecenter",
        ids: teamId,
        type: "Team",
        sport: "Soccer",
        leagueid: inferredLeagueId,
        scope: "Playerleague",
      };

      console.log(
        `[MSN API] Source 1: Fetching /statistics Playerleague for ${teamId}...`
      );
      const response = await msnApiClient.get("/statistics", {
        params: params1,
      });

      if (response.data?.value?.[0]?.statistics?.[0]?.playerStatistics) {
        const playerStats =
          response.data.value[0].statistics[0].playerStatistics;
        playerStats.forEach((stat: any) => {
          addPlayer({
            id: stat.player?.id || stat.id,
            name: stat.player?.name || stat.name,
            firstName: stat.player?.firstName,
            lastName: stat.player?.lastName,
            jerseyNumber: stat.player?.jerseyNumber,
            playerPosition: stat.player?.playerPosition,
            image: stat.player?.image,
            country: stat.player?.country,
            birthDate: stat.player?.birthDate,
            height: stat.player?.height,
            weight: stat.player?.weight,
            stats: {
              goals: stat.goalsScored || 0,
              assists: stat.assists || 0,
              yellowCards: stat.yellowCards || 0,
              redCards: stat.redCards || 0,
              minutesPlayed: stat.minutesPlayed || 0,
              shotsOnTarget: stat.shotsOnTarget || 0,
              shotsOffTarget: stat.shotsOffTarget || 0,
            },
          });
        });
        console.log(
          `[MSN API] Source 1: Got ${playerStats.length} players from /statistics Playerleague`
        );
      }
    } catch (error) {
      console.log(`[MSN API] Source 1 failed: ${error}`);
    }

    // Source 2: Try /topplayers endpoint as fallback (returns top performers with detailed stats)
    if (allPlayers.size === 0) {
      try {
        const params2 = {
          ...CONFIG.MSN_SPORTS.BASE_PARAMS,
          apikey: CONFIG.MSN_SPORTS.API_KEY,
          activityId: generateActivityId(),
          ocid: "sports-team-topplayers",
          ids: teamId,
          type: "Team",
          sport: "Soccer",
          leagueid: inferredLeagueId,
          scope: "TopPlayers",
        };

        console.log(`[MSN API] Source 2: Fetching topplayers for ${teamId}...`);
        const response = await msnApiClient.get("/topplayers", {
          params: params2,
        });

        if (response.data?.value?.[0]?.topPlayers) {
          const topPlayers = response.data.value[0].topPlayers;
          topPlayers.forEach((player: any) => addPlayer(player));
          console.log(
            `[MSN API] Source 2: Got ${topPlayers.length} players from topplayers`
          );
        }
      } catch (error) {
        console.log(`[MSN API] Source 2 failed: ${error}`);
      }
    }

    const players = Array.from(allPlayers.values());
    console.log(
      `[MSN API] Full squad total: ${players.length} unique players from all sources`
    );

    // Cache for 12 hours
    if (players.length > 0) {
      await setCachedData(cacheKey, players, 12 * 60 * 60 * 1000);
    }

    return players;
  },

  /**
   * Get team roster (squad) from MSN Sports
   * @param teamId - Team ID from MSN Sports (e.g., "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2001")
   * @returns Array of players with position, number, name, etc.
   */
  getTeamRoster: async (teamId: string): Promise<any[]> => {
    const cacheKey = `team_roster_${teamId}`;
    const cached = await getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: "sports-team-roster",
        ids: teamId,
        type: "TeamRoster",
      };

      console.log(`[MSN API] Fetching roster for team ${teamId}...`);

      const response = await msnApiClient.get("/roster", { params });

      if (
        !response.data ||
        !response.data.value ||
        response.data.value.length === 0
      ) {
        console.log(`[MSN API] No roster data available for team ${teamId}`);
        return [];
      }

      const rosterData = response.data.value[0];

      // Players might be in different structures based on the response
      let players: any[] = [];

      if (rosterData.players) {
        players = rosterData.players;
      } else if (rosterData.roster) {
        players = rosterData.roster;
      } else if (rosterData.groups) {
        // Some responses group players by position
        rosterData.groups.forEach((group: any) => {
          if (group.players) {
            players = [...players, ...group.players];
          }
        });
      }

      console.log(
        `[MSN API] Fetched ${players.length} players from roster for team ${teamId}`
      );

      // Cache for 24 hours (rosters don't change frequently)
      await setCachedData(cacheKey, players, 24 * 60 * 60 * 1000);
      return players;
    } catch (error) {
      console.error(`[MSN API] Error fetching roster for ${teamId}:`, error);
      return [];
    }
  },

  /**
   * Search for a team by name to find MSN Team ID
   * @param teamName - Team name to search for
   * @param leagueId - Optional league ID to filter results
   * @returns Team data including MSN ID
   */
  searchTeam: async (
    teamName: string,
    leagueId?: string
  ): Promise<any | null> => {
    const cacheKey = `team_search_${teamName
      .toLowerCase()
      .replace(/\s/g, "_")}`;
    const cached = await getCachedData<any>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: "sports-search",
        query: teamName,
        type: "Team",
        ...(leagueId && { leagueid: leagueId }),
      };

      console.log(`[MSN API] Searching for team: ${teamName}...`);

      const response = await msnApiClient.get("/search", { params });

      if (
        !response.data ||
        !response.data.value ||
        response.data.value.length === 0
      ) {
        console.log(`[MSN API] No search results for team: ${teamName}`);
        return null;
      }

      const searchResults = response.data.value;

      // Try to find exact match
      const exactMatch = searchResults.find(
        (r: any) =>
          r.team?.name?.rawName?.toLowerCase() === teamName.toLowerCase() ||
          r.team?.name?.localizedName?.toLowerCase() === teamName.toLowerCase()
      );

      const result = exactMatch || searchResults[0];

      // Cache for 7 days (team data doesn't change)
      await setCachedData(cacheKey, result, 7 * 24 * 60 * 60 * 1000);

      console.log(
        `[MSN API] Found team: ${result?.team?.name?.localizedName || teamName}`
      );
      return result;
    } catch (error) {
      console.error(`[MSN API] Error searching for team ${teamName}:`, error);
      return null;
    }
  },

  /**
   * Get all teams from a league
   * @param leagueId - League ID (e.g., "Soccer_BrazilBrasileiroSerieA")
   * @returns Array of teams with their MSN IDs
   */
  getLeagueTeams: async (leagueId: string): Promise<any[]> => {
    const cacheKey = `league_teams_${leagueId}`;
    const cached = await getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: "sports-league-teams",
        id: leagueId,
        type: "Teams",
      };

      console.log(`[MSN API] Fetching teams for league ${leagueId}...`);

      const response = await msnApiClient.get("/teams", { params });

      if (
        !response.data ||
        !response.data.value ||
        response.data.value.length === 0
      ) {
        console.log(`[MSN API] No teams data for league ${leagueId}`);
        return [];
      }

      const teamsData = response.data.value[0];
      let teams: any[] = [];

      if (teamsData.teams) {
        teams = teamsData.teams;
      } else if (teamsData.groups) {
        teamsData.groups.forEach((group: any) => {
          if (group.teams) {
            teams = [...teams, ...group.teams];
          }
        });
      }

      console.log(
        `[MSN API] Fetched ${teams.length} teams for league ${leagueId}`
      );

      // Cache for 24 hours
      await setCachedData(cacheKey, teams, 24 * 60 * 60 * 1000);
      return teams;
    } catch (error) {
      console.error(`[MSN API] Error fetching teams for ${leagueId}:`, error);
      return [];
    }
  },

  /**
   * Get detailed game information (venue, channels, weather, win/loss record)
   * @param gameId - Game ID (e.g., "58053211" - the triggering ID, not the full MSN ID)
   * @returns Detailed game information
   */
  getGameDetails: async (gameId: string): Promise<any> => {
    // Extract numeric ID if full MSN ID is passed
    // Handles: "SportRadar_Soccer_..._Game_12345" -> "12345"
    // Also handles UUIDs by using them directly
    let numericId = gameId;
    if (gameId.includes("_Game_")) {
      numericId = gameId.split("_Game_")[1];
    } else if (gameId.includes("_")) {
      // Try to get the last segment
      numericId = gameId.split("_").pop() || gameId;
    }
    // If it's still a UUID format, use the full gameId as the API might accept it
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        numericId
      );
    const queryId = isUUID ? gameId : numericId;

    const cacheKey = `game_details_${queryId}`;
    const cached = await getCachedData<any>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ids: queryId,
        scope: "Full",
        ocid: "sports-gamecenter",
      };

      console.log(`[MSN API] Fetching game details for ${queryId}...`);

      const response = await msnApiClient.get("/livegames", { params });

      if (
        !response.data ||
        !response.data.value ||
        !response.data.value[0] ||
        !response.data.value[0].games ||
        !response.data.value[0].games[0]
      ) {
        console.log(`[MSN API] No game details found for ${numericId}`);
        return null;
      }

      const game = response.data.value[0].games[0];

      // Transform to a cleaner structure
      const gameDetails = {
        id: game.id,
        startDateTime: game.startDateTime,
        gameStatus: game.gameState?.gameStatus,
        detailedStatus: game.gameState?.detailedGameStatus,
        week: game.week,
        leagueName: game.leagueName?.localizedName || game.leagueName?.rawName,

        // Venue information
        venue: game.venue
          ? {
              name: game.venue.name?.localizedName || game.venue.name?.rawName,
              capacity: game.venue.capacity,
              city:
                game.venue.location?.city?.fullName ||
                game.venue.location?.city?.name?.rawName,
              country:
                game.venue.location?.country?.fullName ||
                game.venue.location?.country?.name?.rawName,
              latitude: game.venue.location?.latitude,
              longitude: game.venue.location?.longitude,
            }
          : null,

        // TV/Streaming channels
        channels:
          game.channels?.map((ch: any) => ({
            type: ch.type,
            names: ch.channelNames || [],
          })) || [],

        // Weather forecast
        weather: game.weatherForecast
          ? {
              condition: game.weatherForecast.condition,
              detailedCondition: game.weatherForecast.detailedCondition,
              temperature: game.weatherForecast.temperature?.value,
              unit: game.weatherForecast.temperature?.unit || "Celsius",
              summary: game.weatherForecast.summary,
            }
          : null,

        // Teams with win/loss record
        homeTeam: game.participants?.[0]
          ? {
              id: game.participants[0].team?.id,
              name:
                game.participants[0].team?.name?.localizedName ||
                game.participants[0].team?.name?.rawName,
              shortName:
                game.participants[0].team?.shortName?.localizedName ||
                game.participants[0].team?.shortName?.rawName,
              abbreviation: game.participants[0].team?.abbreviation,
              image: game.participants[0].team?.image?.id,
              score: game.participants[0].result?.score,
              winProbability:
                game.participants[0].probabilities?.[0]?.winProbability,
              winLossRecord: game.participants[0].team?.winLossRecord
                ? {
                    wins: parseInt(
                      game.participants[0].team.winLossRecord.wins
                    ),
                    losses: parseInt(
                      game.participants[0].team.winLossRecord.losses
                    ),
                    ties: parseInt(
                      game.participants[0].team.winLossRecord.ties
                    ),
                  }
                : null,
            }
          : null,

        awayTeam: game.participants?.[1]
          ? {
              id: game.participants[1].team?.id,
              name:
                game.participants[1].team?.name?.localizedName ||
                game.participants[1].team?.name?.rawName,
              shortName:
                game.participants[1].team?.shortName?.localizedName ||
                game.participants[1].team?.shortName?.rawName,
              abbreviation: game.participants[1].team?.abbreviation,
              image: game.participants[1].team?.image?.id,
              score: game.participants[1].result?.score,
              winProbability:
                game.participants[1].probabilities?.[0]?.winProbability,
              winLossRecord: game.participants[1].team?.winLossRecord
                ? {
                    wins: parseInt(
                      game.participants[1].team.winLossRecord.wins
                    ),
                    losses: parseInt(
                      game.participants[1].team.winLossRecord.losses
                    ),
                    ties: parseInt(
                      game.participants[1].team.winLossRecord.ties
                    ),
                  }
                : null,
            }
          : null,
      };

      console.log(
        `[MSN API] Fetched game details: ${gameDetails.homeTeam?.shortName} vs ${gameDetails.awayTeam?.shortName}`
      );

      // Cache for 30 minutes (game details can change)
      await setCachedData(cacheKey, gameDetails, 30 * 60 * 1000);
      return gameDetails;
    } catch (error) {
      console.error(`[MSN API] Error fetching game details:`, error);
      return null;
    }
  },
};
