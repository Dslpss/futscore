import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';
import { League, Match } from '../types';
import { Country } from '../types/country';

const apiClient = axios.create({
  baseURL: CONFIG.API_URL,
  headers: {
    'X-Auth-Token': CONFIG.API_KEY,
  },
});

const CACHE_PREFIX = 'futscore_cache_';

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
    console.error('Error reading cache', e);
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
    console.error('Error saving cache', e);
  }
};

export const api = {
  getLeagues: async (): Promise<League[]> => {
    const cacheKey = 'leagues';
    const cached = await getCachedData<League[]>(cacheKey);
    if (cached) return cached;

    // For football-data.org, we'll hardcode the leagues we support
    const leaguesData: League[] = [
      {
        id: 'BSA' as any,
        name: 'Campeonato Brasileiro Série A',
        logo: 'https://crests.football-data.org/764.png',
        country: 'Brazil'
      },
      {
        id: 'CL' as any,
        name: 'UEFA Champions League',
        logo: 'https://crests.football-data.org/CL.png',
        country: 'Europe'
      }
    ];
      
    await setCachedData(cacheKey, leaguesData, CONFIG.CACHE_DURATION.LEAGUES);
    return leaguesData;
  },

  getFixtures: async (leagueCode: string, date?: string): Promise<Match[]> => {
    const today = new Date().toISOString().split('T')[0];
    const queryDate = date || today;
    
    const cacheKey = `fixtures_${leagueCode}_${queryDate}`;
    
    const cached = await getCachedData<Match[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.get(`/competitions/${leagueCode}/matches`, {
        params: {
          dateFrom: queryDate,
          dateTo: queryDate,
        },
      });
      
      console.log(`[API] Fetched ${response.data.matches?.length || 0} matches for ${leagueCode} on ${queryDate}`);
      
      if (!response.data.matches || response.data.matches.length === 0) {
        return [];
      }
      
      // Transform football-data.org format to our format
      const matches: Match[] = response.data.matches.map((match: any) => ({
        fixture: {
          id: match.id,
          date: match.utcDate,
          status: {
            long: match.status === 'FINISHED' ? 'Partida Encerrada' : 
                   match.status === 'IN_PLAY' ? 'Em Andamento' :
                   match.status === 'PAUSED' ? 'Intervalo' : 'Não Iniciado',
            short: match.status === 'FINISHED' ? 'FT' :
                   match.status === 'IN_PLAY' ? '1H' :
                   match.status === 'PAUSED' ? 'HT' : 'NS',
            elapsed: match.minute || null,
          }
        },
        league: {
          id: match.competition.code as any,
          name: match.competition.name,
          logo: match.competition.emblem || '',
          country: match.area.name,
        },
        teams: {
          home: {
            id: match.homeTeam.id,
            name: match.homeTeam.name,
            logo: match.homeTeam.crest || '',
          },
          away: {
            id: match.awayTeam.id,
            name: match.awayTeam.name,
            logo: match.awayTeam.crest || '',
          },
        },
        goals: {
          home: match.score.fullTime.home,
          away: match.score.fullTime.away,
        },
      }));
      
      console.log(`[API] Transformed ${matches.length} matches for cache`);
      await setCachedData(cacheKey, matches, CONFIG.CACHE_DURATION.FIXTURES);
      return matches;
    } catch (error) {
      console.error('[API] Error fetching fixtures:', error);
      return [];
    }
  },

  getLiveMatches: async (leagueCodes: string[]): Promise<Match[]> => {
     const cacheKey = `live_${leagueCodes.join('_')}`;
     const cached = await getCachedData<Match[]>(cacheKey);
     if (cached) return cached;

     try {
        let allMatches: Match[] = [];
        
        // football-data.org doesn't have a single "live" endpoint
        // We need to fetch today's matches and filter by status
        for (const code of leagueCodes) {
          const matches = await api.getFixtures(code);
          const liveMatches = matches.filter((m: Match) => 
            m.fixture.status.short === '1H' || 
            m.fixture.status.short === '2H' || 
            m.fixture.status.short === 'HT'
          );
          allMatches = [...allMatches, ...liveMatches];
        }
        
        await setCachedData(cacheKey, allMatches, CONFIG.CACHE_DURATION.LIVE);
        return allMatches;
     } catch (error) {
         console.error('Error fetching live matches', error);
         return [];
     }
  },

  // Keeping these for the Explore feature, but they won't work with football-data.org
  // Would need a different approach or remove the feature
  getCountries: async (): Promise<Country[]> => {
    console.warn('getCountries not available with football-data.org');
    return [];
  },

  getLeaguesByCountry: async (countryName: string): Promise<League[]> => {
    console.warn('getLeaguesByCountry not available with football-data.org');
    return [];
  }
};
