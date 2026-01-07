import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'olhar_digital_';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Types
export interface OlharDigitalGame {
  id: string;
  name: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  venue: string;
  startDate: string;
  time: string;
  channels: string[];
  sport: 'Soccer' | 'Basketball';
}

// Cache helpers
const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data as T;
      }
    }
  } catch (e) {
    console.error('[OlharDigital CACHE] Error reading cache', e);
  }
  return null;
};

const setCachedData = async <T>(key: string, data: T): Promise<void> => {
  try {
    const cacheEntry = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
  } catch (e) {
    console.error('[OlharDigital CACHE] Error saving cache', e);
  }
};

// Parse JSON-LD from HTML
const parseJsonLd = (html: string): any[] => {
  try {
    // Find all JSON-LD scripts
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (!jsonLdMatch) return [];

    const allItems: any[] = [];
    
    for (const match of jsonLdMatch) {
      const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
      try {
        const parsed = JSON.parse(jsonContent);
        if (parsed['@graph']) {
          allItems.push(...parsed['@graph']);
        } else if (Array.isArray(parsed)) {
          allItems.push(...parsed);
        } else {
          allItems.push(parsed);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
    
    return allItems;
  } catch (e) {
    console.error('[OlharDigital] Error parsing JSON-LD:', e);
    return [];
  }
};

// Transform JSON-LD to our format
const transformGames = (items: any[]): OlharDigitalGame[] => {
  const sportsEvents = items.filter(item => item['@type'] === 'SportsEvent' && item['@id']);
  const broadcastEvents = items.filter(item => item['@type'] === 'BroadcastEvent');
  
  const games: OlharDigitalGame[] = [];
  
  for (const event of sportsEvents) {
    // Find broadcasts for this event
    const eventBroadcasts = broadcastEvents.filter(
      b => b.broadcastOfEvent?.['@id'] === event['@id']
    );
    
    const channels = eventBroadcasts
      .map(b => b.broadcastService?.name || b.broadcastService?.broadcastDisplayName)
      .filter(Boolean);
    
    // Extract teams from competitor array
    const competitors = event.competitor || [];
    const homeTeam = competitors[0]?.name || '';
    const awayTeam = competitors[1]?.name || '';
    
    if (!homeTeam || !awayTeam) continue;
    
    // Format time from startDate
    const startDate = event.startDate || '';
    let time = '';
    try {
      const date = new Date(startDate);
      time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      time = '';
    }
    
    // Determine sport
    const sport = event.sport === 'Basketball' ? 'Basketball' : 'Soccer';
    
    games.push({
      id: event['@id'] || `${homeTeam}-${awayTeam}`,
      name: event.name || `${homeTeam} vs ${awayTeam}`,
      homeTeam,
      awayTeam,
      competition: event.superEvent?.name || '',
      venue: event.location?.name || '',
      startDate,
      time,
      channels: [...new Set(channels)], // Remove duplicates
      sport,
    });
  }
  
  // Sort by start date
  games.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  
  return games;
};

// API
export const olharDigitalApi = {
  /**
   * Get today's games from Olhar Digital
   */
  getTodayGames: async (): Promise<OlharDigitalGame[]> => {
    const cacheKey = 'today_games';
    const cached = await getCachedData<OlharDigitalGame[]>(cacheKey);
    if (cached) {
      console.log('[OlharDigital] Returning cached games');
      return cached;
    }

    try {
      console.log('[OlharDigital] Fetching games from Olhar Digital...');
      
      const response = await axios.get('https://olhardigital.com.br/esportes/jogos/', {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });

      const html = response.data;
      const jsonLdItems = parseJsonLd(html);
      const games = transformGames(jsonLdItems);
      
      console.log(`[OlharDigital] Found ${games.length} games`);
      
      await setCachedData(cacheKey, games);
      return games;
    } catch (error) {
      console.error('[OlharDigital] Error fetching games:', error);
      return [];
    }
  },

  /**
   * Get games for a specific date
   */
  getGamesByDate: async (date: Date): Promise<OlharDigitalGame[]> => {
    const dateStr = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    }).split('/').join('-');
    
    const cacheKey = `games_${dateStr}`;
    const cached = await getCachedData<OlharDigitalGame[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `https://olhardigital.com.br/esportes/jogos/${dateStr}/`;
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const html = response.data;
      const jsonLdItems = parseJsonLd(html);
      const games = transformGames(jsonLdItems);
      
      await setCachedData(cacheKey, games);
      return games;
    } catch (error) {
      console.error('[OlharDigital] Error fetching games by date:', error);
      return [];
    }
  },

  /**
   * Get channel badge color
   */
  getChannelColor: (channel: string): string => {
    const channelLower = channel.toLowerCase();
    if (channelLower.includes('espn')) return '#dc2626';
    if (channelLower.includes('disney')) return '#1d4ed8';
    if (channelLower.includes('sportv')) return '#ea580c';
    if (channelLower.includes('cazétv') || channelLower.includes('cazetv')) return '#7c3aed';
    if (channelLower.includes('onefootball')) return '#ec4899';
    if (channelLower.includes('goat')) return '#059669';
    if (channelLower.includes('globo')) return '#dc2626';
    return '#6b7280';
  },

  /**
   * Clear cache
   */
  clearCache: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const olharKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(olharKeys);
      console.log('[OlharDigital] Cache cleared');
    } catch (e) {
      console.error('[OlharDigital] Error clearing cache', e);
    }
  },
};
