import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';
import { MsnLeague, MsnPersonalizationStrip } from '../types';

// MSN Sports API client
const msnApiClient = axios.create({
  baseURL: CONFIG.MSN_SPORTS.BASE_URL,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Accept-Language': 'pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3',
  }
});

const CACHE_PREFIX = 'msn_sports_cache_';

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
    console.error('[MSN CACHE] Error reading cache', e);
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
    console.error('[MSN CACHE] Error saving cache', e);
  }
};

// Generate a unique activity ID for each request
const generateActivityId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const msnSportsApi = {
  /**
   * Get personalized leagues/competitions available
   */
  getPersonalizationStrip: async (): Promise<MsnLeague[]> => {
    const cacheKey = 'personalization_strip';
    const cached = await getCachedData<MsnLeague[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        type: 'SportsVertical',
      };

      console.log('[MSN API] Fetching personalization strip...');
      
      const response = await msnApiClient.get('/personalizationstrip', { params });

      if (!response.data || !response.data.value || !response.data.value[0]) {
        console.error('[MSN API] Invalid response structure');
        return [];
      }

      const items = response.data.value[0].items || [];
      const leagues: MsnLeague[] = items
        .filter((item: any) => item.itemType === 'League' && item.league)
        .map((item: any) => item.league);

      console.log(`[MSN API] Fetched ${leagues.length} leagues`);

      // Cache for 24 hours
      await setCachedData(cacheKey, leagues, CONFIG.CACHE_DURATION.MSN_LEAGUES);
      return leagues;
    } catch (error) {
      console.error('[MSN API] Error fetching personalization strip:', error);
      return [];
    }
  },

  /**
   * Get detailed entity header information for a specific league
   */
  getEntityHeader: async (leagueId: string, type: string = 'League'): Promise<any> => {
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
        ocid: 'sports-league-landing',
        pagetypes: 'LeagueHome,Scores,Schedule,Standings,Teams,Team,GameCenter,TeamRoster,Player,PlayerStats,TeamStats,Polls,Videos,TourCalendar,TourRankings,RaceCalendar,DriverStandings,ICCRankings,Rankings,Bracket,Statistics,Headlines,Tournament,Results,Medals,TeamSchedule,TeamMedals,TeamResults',
      };

      console.log(`[MSN API] Fetching entity header for ${leagueId}...`);
      
      const response = await msnApiClient.get('/entityheader', { params });

      if (!response.data || !response.data.value || !response.data.value[0]) {
        console.error('[MSN API] Invalid entity header response structure');
        return null;
      }

      const entityHeader = response.data.value[0];
      console.log(`[MSN API] Fetched entity header for ${leagueId}`);

      // Cache for 6 hours
      await setCachedData(cacheKey, entityHeader, 6 * 60 * 60 * 1000);
      return entityHeader;
    } catch (error) {
      console.error('[MSN API] Error fetching entity header:', error);
      return null;
    }
  },

  /**
   * Get live and upcoming matches for a specific league
   */
  getLiveAroundLeague: async (leagueId: string, sport: string = 'Soccer'): Promise<any[]> => {
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
        datetime: now.toISOString().split('.')[0], // Remove milliseconds
        tzoffset: Math.floor(-now.getTimezoneOffset() / 60).toString(),
        withleaguereco: 'true',
        ocid: 'sports-league-landing',
      };

      console.log(`[MSN API] Fetching live matches for ${leagueId}...`);
      
      const response = await msnApiClient.get('/livearoundtheleague', { params });

      if (!response.data || !response.data.value || !response.data.value[0]) {
        console.error('[MSN API] Invalid live matches response structure');
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
      console.error('[MSN API] Error fetching live matches:', error);
      return [];
    }
  },

  /**
   * Get league image URL
   * MSN Sports images are served via Bing thumbnail API
   */
  getLeagueImageUrl: (imageId: string): string => {
    // Format: https://www.bing.com/th?id=[imageId]&w=[width]&h=[height]
    return `https://www.bing.com/th?id=${imageId}&w=100&h=100`;
  },

  /**
   * Clear all MSN Sports cache
   */
  clearCache: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const msnKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(msnKeys);
      console.log('[MSN CACHE] Cleared all cache');
    } catch (error) {
      console.error('[MSN CACHE] Error clearing cache:', error);
    }
  },

  /**
   * Get lineups for a specific match
   * @param gameId - MSN Sports game ID (e.g., "SportRadar_Soccer_EnglandPremierLeague_2025_Game_61300775")
   */
  getLineups: async (gameId: string): Promise<any> => {
    // Extract just the numeric ID from the full game ID
    const numericId = gameId.split('_').pop() || gameId;
    const cacheKey = `lineups_${numericId}`;
    const cached = await getCachedData<any>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: 'sports-gamecenter',
        ids: numericId,
      };

      console.log(`[MSN API] Fetching lineups for game ${numericId}...`);
      
      const response = await msnApiClient.get('/lineups', { params });

      if (!response.data || !response.data.value || response.data.value.length === 0) {
        console.log('[MSN API] No lineups data available');
        return null;
      }

      const lineupsData = response.data.value[0];
      
      // Cache for 1 hour
      await setCachedData(cacheKey, lineupsData, 60 * 60 * 1000);
      
      console.log(`[MSN API] Fetched lineups successfully`);
      return lineupsData;
    } catch (error) {
      console.error('[MSN API] Error fetching lineups:', error);
      return null;
    }
  },

  /**
   * Get statistics for a specific match
   * @param gameId - MSN Sports game ID (e.g., "SportRadar_Soccer_EnglandPremierLeague_2025_Game_61300775")
   * @param sport - Sport type (e.g., "Soccer", "Basketball")
   * @param leagueId - League ID (e.g., "Soccer_EnglandPremierLeague")
   */
  getStatistics: async (gameId: string, sport: string = 'Soccer', leagueId: string): Promise<any> => {
    const cacheKey = `stats_${gameId}`;
    const cached = await getCachedData<any>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: 'sports-gamecenter',
        ids: gameId,
        type: 'Game',
        scope: 'Teamgame',
        sport: sport,
        leagueid: leagueId,
      };

      console.log(`[MSN API] Fetching statistics...`);
      console.log(`[MSN API] GameId: ${gameId}`);
      console.log(`[MSN API] Sport: ${sport}`);
      console.log(`[MSN API] LeagueId: ${leagueId}`);
      
      const response = await msnApiClient.get('/statistics', { params });

      if (!response.data || !response.data.value || response.data.value.length === 0) {
        console.log('[MSN API] No statistics data available');
        return null;
      }

      const statsData = response.data.value[0];
      
      // Cache for 5 minutes (stats change during live matches)
      await setCachedData(cacheKey, statsData, 5 * 60 * 1000);
      
      console.log(`[MSN API] Fetched statistics successfully`);
      return statsData;
    } catch (error) {
      console.error('[MSN API] Error fetching statistics:', error);
      return null;
    }
  },

  /**
   * Get timeline/events for a specific match (includes goals, cards, substitutions)
   * @param gameId - MSN Sports game ID (numeric part, e.g., "61300783")
   * @param sport - Sport type (e.g., "Soccer", "Basketball")
   */
  getTimeline: async (gameId: string, sport: string = 'Soccer'): Promise<any> => {
    // Extract just the numeric ID from the full game ID
    const numericId = gameId.split('_').pop() || gameId;
    const cacheKey = `timeline_${numericId}`;
    const cached = await getCachedData<any>(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        ...CONFIG.MSN_SPORTS.BASE_PARAMS,
        apikey: CONFIG.MSN_SPORTS.API_KEY,
        activityId: generateActivityId(),
        ocid: 'sports-gamecenter',
        ids: numericId,
        gameid: numericId,
        sport: sport,
        scope: 'timeline',
      };

      console.log(`[MSN API] Fetching timeline for game ${numericId}...`);
      
      const response = await msnApiClient.get('/timeline', { params });

      if (!response.data || !response.data.value || response.data.value.length === 0) {
        console.log('[MSN API] No timeline data available');
        return null;
      }

      const timelineData = response.data.value[0];
      
      // Cache for 5 minutes (events change during live matches)
      await setCachedData(cacheKey, timelineData, 5 * 60 * 1000);
      
      console.log(`[MSN API] Fetched timeline successfully`);
      return timelineData;
    } catch (error) {
      console.error('[MSN API] Error fetching timeline:', error);
      return null;
    }
  },
};

