import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';
import { EspnLiveEvent, EspnScoreboardResponse } from '../types';

const ESPN_CACHE_PREFIX = 'espn_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Types
export interface EspnEvent {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: string;
  summary?: string;
  broadcasts: EspnBroadcast[];
  broadcast?: string;
  onWatch?: boolean;
  competitors: EspnCompetitor[];
  league?: {
    name: string;
    abbreviation: string;
    slug: string;
  };
  sport?: {
    name: string;
    slug: string;
  };
}

export interface EspnBroadcast {
  name: string;
  shortName: string;
  type: string;
}

export interface EspnCompetitor {
  id: string;
  displayName: string;
  abbreviation: string;
  homeAway: 'home' | 'away';
  score?: string;
  winner?: boolean;
  logo?: string;
  color?: string;
}

// Cache helpers
const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    const cached = await AsyncStorage.getItem(ESPN_CACHE_PREFIX + key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data as T;
      }
    }
  } catch (e) {
    console.error('[ESPN CACHE] Error reading cache', e);
  }
  return null;
};

const setCachedData = async <T>(key: string, data: T): Promise<void> => {
  try {
    const cacheEntry = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(ESPN_CACHE_PREFIX + key, JSON.stringify(cacheEntry));
  } catch (e) {
    console.error('[ESPN CACHE] Error saving cache', e);
  }
};

// ESPN API Service
export const espnApi = {
  /**
   * Get live/upcoming games from ESPN with broadcast info
   * Returns games that have onWatch=true or broadcasts array
   */
  getEspnLiveGames: async (): Promise<EspnEvent[]> => {
    const cacheKey = 'live_games';
    const cached = await getCachedData<EspnEvent[]>(cacheKey);
    if (cached) {
      console.log('[ESPN API] Returning cached live games');
      return cached;
    }

    try {
      console.log('[ESPN API] Fetching live games from ESPN...');

      const response = await axios.get(
        `${CONFIG.ESPN.FAN_API_URL}/recommendations/context/brazil`,
        {
          params: {
            displayEvents: true,
            displayNow: true,
            limit: 30,
          },
          timeout: 10000,
        }
      );

      const recommendations = response.data.recommendations || [];
      const allEvents: EspnEvent[] = [];

      // Extract events from recommendations
      for (const recommendation of recommendations) {
        const events = recommendation.metaData?.events || [];
        for (const event of events) {
          // Only include events with broadcasts or onWatch
          if (event.onWatch || (event.broadcasts && event.broadcasts.length > 0)) {
            allEvents.push({
              id: event.id,
              name: event.name || event.shortName,
              shortName: event.shortName,
              date: event.date,
              status: event.status,
              summary: event.summary,
              broadcasts: event.broadcasts || [],
              broadcast: event.broadcast,
              onWatch: event.onWatch,
              competitors: event.competitors?.map((c: any) => ({
                id: c.id,
                displayName: c.displayName,
                abbreviation: c.abbreviation,
                homeAway: c.homeAway,
                score: c.score,
                winner: c.winner,
                logo: c.logo,
                color: c.color,
              })) || [],
              league: event.league ? {
                name: event.league.name,
                abbreviation: event.league.abbreviation,
                slug: event.league.slug,
              } : undefined,
              sport: event.sport ? {
                name: event.sport.name,
                slug: event.sport.slug,
              } : undefined,
            });
          }
        }
      }

      // Remove duplicates by event id
      const uniqueEvents = allEvents.filter(
        (event, index, self) => index === self.findIndex(e => e.id === event.id)
      );

      // Sort: live games first, then by date
      uniqueEvents.sort((a, b) => {
        const aIsLive = a.status === 'in';
        const bIsLive = b.status === 'in';
        if (aIsLive && !bIsLive) return -1;
        if (!aIsLive && bIsLive) return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      console.log(`[ESPN API] Found ${uniqueEvents.length} ESPN games with broadcasts`);

      await setCachedData(cacheKey, uniqueEvents);
      return uniqueEvents;
    } catch (error) {
      console.error('[ESPN API] Error fetching live games:', error);
      return [];
    }
  },

  /**
   * Format broadcasts to display string
   */
  formatBroadcasts: (broadcasts: EspnBroadcast[]): string => {
    if (!broadcasts || broadcasts.length === 0) return '';
    const names = broadcasts.map(b => b.shortName || b.name);
    return [...new Set(names)].join(', ');
  },

  /**
   * Clear ESPN cache
   */
  clearCache: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const espnKeys = keys.filter(k => k.startsWith(ESPN_CACHE_PREFIX));
      await AsyncStorage.multiRemove(espnKeys);
      console.log('[ESPN API] Cache cleared');
    } catch (e) {
      console.error('[ESPN API] Error clearing cache', e);
    }
  },

  /**
   * Get scoreboard data with live updates, scorers, and goalies
   * Returns events with last play text, scoring summary, and goalie stats
   */
  getScoreboardData: async (leagueSlug: string): Promise<EspnLiveEvent[]> => {
    const cacheKey = `scoreboard_${leagueSlug}`;
    const SCOREBOARD_CACHE_DURATION = 30 * 1000; // 30 seconds for real-time updates
    
    try {
      // Check cache with short duration for live data
      const cached = await AsyncStorage.getItem(ESPN_CACHE_PREFIX + cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < SCOREBOARD_CACHE_DURATION) {
          console.log('[ESPN API] Returning cached scoreboard data');
          return data as EspnLiveEvent[];
        }
      }
    } catch (e) {
      console.error('[ESPN CACHE] Error reading scoreboard cache', e);
    }

    try {
      console.log(`[ESPN API] Fetching scoreboard for ${leagueSlug}...`);

      const response = await axios.get<EspnScoreboardResponse>(
        `${CONFIG.ESPN.SCOREBOARD_API_URL}/apis/personalized/v2/scoreboard/header`,
        {
          params: {
            league: leagueSlug,
            sport: 'soccer',
            lang: 'pt',
            region: 'br',
            contentorigin: 'deportes',
            tz: 'America/Sao_Paulo',
          },
          timeout: 15000,
        }
      );

      // Extract events from the response
      const events: EspnLiveEvent[] = [];
      const sports = response.data.sports || [];
      
      for (const sport of sports) {
        for (const league of sport.leagues || []) {
          for (const event of league.events || []) {
            events.push({
              id: event.id,
              name: event.name,
              shortName: event.shortName,
              date: event.date,
              status: event.status,
              summary: event.summary,
              period: event.period,
              clock: event.clock,
              location: event.location,
              link: event.link,
              situation: event.situation,
              competitors: event.competitors?.map((c: any) => ({
                id: c.id,
                displayName: c.displayName,
                abbreviation: c.abbreviation,
                homeAway: c.homeAway,
                winner: c.winner,
                form: c.form,
                score: c.score,
                logo: c.logo,
                logoDark: c.logoDark,
                color: c.color,
                record: c.record,
                scoringSummary: c.scoringSummary,
                goalieSummary: c.goalieSummary,
              })) || [],
            });
          }
        }
      }

      console.log(`[ESPN API] Found ${events.length} events with live data`);

      // Cache the results
      try {
        const cacheEntry = { data: events, timestamp: Date.now() };
        await AsyncStorage.setItem(ESPN_CACHE_PREFIX + cacheKey, JSON.stringify(cacheEntry));
      } catch (e) {
        console.error('[ESPN CACHE] Error saving scoreboard cache', e);
      }

      return events;
    } catch (error) {
      console.error('[ESPN API] Error fetching scoreboard:', error);
      return [];
    }
  },

  /**
   * Get all live events from multiple leagues
   */
  getAllLiveEvents: async (): Promise<EspnLiveEvent[]> => {
    const leagues = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'bra.1'];
    const allEvents: EspnLiveEvent[] = [];

    for (const league of leagues) {
      try {
        const events = await espnApi.getScoreboardData(league);
        allEvents.push(...events.filter(e => e.status === 'in'));
      } catch (error) {
        console.error(`[ESPN API] Error fetching ${league}:`, error);
      }
    }

    return allEvents;
  },
};
