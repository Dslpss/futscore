// Radio API service for FutScore
// Uses Radio Browser API (free, open source) for dynamic stream URLs

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Radio, RadioSearchResult } from '../types/radio';

const RADIO_BROWSER_API = 'https://de1.api.radio-browser.info/json';
const CACHE_PREFIX = 'radio_cache_';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

// Radio search terms to find on Radio Browser API
// These are used to dynamically fetch working URLs
const RADIO_SEARCH_CONFIG = [
  // === SÃO PAULO ===
  {
    searchTerm: 'Jovem Pan Sorocaba',
    fallbackUrl: 'https://cast2.hoost.com.br:8039/stream',
    displayName: 'Jovem Pan FM Sorocaba',
    logoUrl: 'https://s.jpimg.com.br/wp-content/themes/jovempan/assets/build/images/favicons/apple-touch-icon.png',
    city: 'Sorocaba',
    state: 'SP',
    frequency: '91.1 FM',
    relatedTeams: ['Corinthians', 'São Paulo', 'Palmeiras', 'Santos'],
  },
  {
    searchTerm: 'Bandeirantes São Paulo',
    fallbackUrl: 'https://24383.live.streamtheworld.com/RADIOBANDEIRANTESAAC',
    displayName: 'Rádio Bandeirantes SP',
    logoUrl: 'https://img.radios.com.br/radio/lg/radio10410_1722854885.png',
    city: 'São Paulo',
    state: 'SP',
    frequency: '90.9 FM',
    relatedTeams: ['Corinthians', 'São Paulo', 'Palmeiras', 'Santos'],
  },
  {
    searchTerm: 'CBN São Paulo',
    fallbackUrl: 'https://26483.live.streamtheworld.com/CBN_SPAAC.aac',
    displayName: 'CBN São Paulo',
    logoUrl: 'https://static.mytuner.mobi/media/radios-150px/407/cbn-sao-paulo.c4cc5162.png',
    city: 'São Paulo',
    state: 'SP',
    frequency: '90.5 FM',
    relatedTeams: ['Corinthians', 'São Paulo', 'Palmeiras', 'Santos'],
  },
  {
    searchTerm: 'BandNews FM São Paulo',
    fallbackUrl: 'https://26663.live.streamtheworld.com/BANDNEWSFM_SPAAC_SC',
    displayName: 'BandNews FM SP',
    logoUrl: 'https://static.mytuner.mobi/media/tvos_radios/YjB73sNAHd.png',
    city: 'São Paulo',
    state: 'SP',
    frequency: '96.9 FM',
    relatedTeams: ['Corinthians', 'São Paulo', 'Palmeiras', 'Santos'],
  },
  {
    searchTerm: 'Transamérica',
    fallbackUrl: 'https://26643.live.streamtheworld.com/RT_SPAAC.aac',
    displayName: 'Rádio Transamérica',
    logoUrl: 'https://img.radios.com.br/radio/lg/radio8803_1578516680.png',
    city: 'São Paulo',
    state: 'SP',
    frequency: '100.1 FM',
    relatedTeams: ['Corinthians', 'São Paulo', 'Palmeiras', 'Santos'],
  },
  {
    searchTerm: 'Rádio Coringão',
    fallbackUrl: 'https://s18.maxcast.com.br:8010/live',
    displayName: 'Rádio Coringão',
    logoUrl: 'https://img.radios.com.br/radio/lg/radio24914_1439401618.jpg',
    city: 'São Paulo',
    state: 'SP',
    frequency: 'Web',
    relatedTeams: ['Corinthians'],
  },
  {
    searchTerm: 'Bandeirantes Campinas',
    fallbackUrl: 'https://stm23.xcast.com.br:11284/stream',
    displayName: 'Rádio Bandeirantes Campinas',
    logoUrl: 'https://img.radios.com.br/radio/lg/radio10412_1630622638.png',
    city: 'Campinas',
    state: 'SP',
    frequency: '85.7 FM',
    relatedTeams: ['Ponte Preta', 'Guarani'],
  },
  {
    searchTerm: 'CBN Campinas',
    fallbackUrl: 'https://8214.brasilstream.com.br/stream',
    displayName: 'CBN Campinas',
    logoUrl: 'https://img.radios.com.br/radio/lg/radio11233_1573682868.jpg',
    city: 'Campinas',
    state: 'SP',
    frequency: '99.1 FM',
    relatedTeams: ['Ponte Preta', 'Guarani'],
  },
  // === RIO DE JANEIRO ===
  {
    searchTerm: 'Super Radio Tupi',
    fallbackUrl: 'https://8923.brasilstream.com.br/stream',
    displayName: 'Super Rádio Tupi',
    logoUrl: 'https://static.mytuner.mobi/media/radios-150px/625/super-radio-tupi.b7c7416f.jpg',
    city: 'Rio de Janeiro',
    state: 'RJ',
    frequency: '96.5 FM',
    relatedTeams: ['Flamengo', 'Fluminense', 'Vasco', 'Botafogo'],
  },
  {
    searchTerm: 'Rádio Globo 98.1',
    fallbackUrl: 'https://26583.live.streamtheworld.com/RADIO_GLOBO_RJAAC.aac',
    displayName: 'Rádio Globo RJ',
    logoUrl: 'https://img.radios.com.br/radio/lg/radio8817_1676300226.png',
    city: 'Rio de Janeiro',
    state: 'RJ',
    frequency: '98.1 FM',
    relatedTeams: ['Flamengo', 'Fluminense', 'Vasco', 'Botafogo'],
  },
  {
    searchTerm: 'CBN Rio de Janeiro',
    fallbackUrl: 'https://19253.live.streamtheworld.com/CBN_RJ_ADP/HLS/playlist.m3u8',
    displayName: 'CBN Rio de Janeiro',
    logoUrl: 'https://static.mytuner.mobi/media/radios-150px/407/cbn-sao-paulo.c4cc5162.png',
    city: 'Rio de Janeiro',
    state: 'RJ',
    frequency: '92.5 FM',
    relatedTeams: ['Flamengo', 'Fluminense', 'Vasco', 'Botafogo'],
  },
  // === RIO GRANDE DO SUL ===
  {
    searchTerm: 'Gaúcha',
    fallbackUrl: 'https://liverdgaupoa.rbsdirect.com.br/primary/gaucha_rbs.sdp/playlist.m3u8',
    displayName: 'Rádio Gaúcha',
    logoUrl: 'https://img.radios.com.br/radio/lg/radio13176_1628168105.png',
    city: 'Porto Alegre',
    state: 'RS',
    frequency: '93.7 FM',
    relatedTeams: ['Grêmio', 'Internacional'],
  },
  {
    searchTerm: 'Rádio Grenal',
    fallbackUrl: 'https://grenal.audiostream.com.br:20000/aac',
    displayName: 'Rádio Grenal',
    logoUrl: 'https://img.radios.com.br/radio/lg/radio13176_1628168105.png',
    city: 'Porto Alegre',
    state: 'RS',
    frequency: '95.9 FM',
    relatedTeams: ['Grêmio', 'Internacional'],
  },
  // === MINAS GERAIS ===
  {
    searchTerm: 'Itatiaia',
    fallbackUrl: 'https://8903.brasilstream.com.br/stream',
    displayName: 'Rádio Itatiaia',
    logoUrl: 'https://img.radios.com.br/radio/lg/radio14_1646746883.jpeg',
    city: 'Belo Horizonte',
    state: 'MG',
    frequency: '95.7 FM',
    relatedTeams: ['Atlético-MG', 'Cruzeiro', 'América-MG'],
  },
  {
    searchTerm: 'CBN Belo Horizonte',
    fallbackUrl: 'https://27323.live.streamtheworld.com/CBN_BHAAC.aac',
    displayName: 'CBN Belo Horizonte',
    logoUrl: 'https://static.mytuner.mobi/media/radios-150px/407/cbn-sao-paulo.c4cc5162.png',
    city: 'Belo Horizonte',
    state: 'MG',
    frequency: '106.1 FM',
    relatedTeams: ['Atlético-MG', 'Cruzeiro'],
  },
  // === BAHIA ===
  {
    searchTerm: 'Rádio Metrópole Salvador',
    fallbackUrl: 'https://listen.radioking.com/radio/268642/stream/313975',
    displayName: 'Rádio Metrópole Salvador',
    logoUrl: 'https://cdn.onlineradiobox.com/img/l/1/16621.v7.png',
    city: 'Salvador',
    state: 'BA',
    frequency: '101.3 FM',
    relatedTeams: ['Bahia', 'Vitória'],
  },
];

// Team to state mapping for suggestions
const TEAM_STATE_MAP: Record<string, string> = {
  'Corinthians': 'SP',
  'São Paulo': 'SP',
  'Palmeiras': 'SP',
  'Santos': 'SP',
  'Flamengo': 'RJ',
  'Fluminense': 'RJ',
  'Vasco': 'RJ',
  'Botafogo': 'RJ',
  'Grêmio': 'RS',
  'Internacional': 'RS',
  'Atlético-MG': 'MG',
  'Cruzeiro': 'MG',
  'América-MG': 'MG',
  'Bahia': 'BA',
  'Vitória': 'BA',
  'Sport': 'PE',
  'Fortaleza': 'CE',
  'Ceará': 'CE',
  'Athletico-PR': 'PR',
  'Coritiba': 'PR',
  'Cuiabá': 'MT',
  'Goiás': 'GO',
  'Atlético-GO': 'GO',
};

// Cache helpers
const getCachedUrl = async (radioId: string): Promise<string | null> => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_PREFIX + radioId);
    if (cached) {
      const { url, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log(`[RadioAPI] Cache hit for ${radioId}`);
        return url;
      }
    }
  } catch (e) {
    console.error('[RadioAPI] Cache read error:', e);
  }
  return null;
};

const setCachedUrl = async (radioId: string, url: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      CACHE_PREFIX + radioId,
      JSON.stringify({ url, timestamp: Date.now() })
    );
  } catch (e) {
    console.error('[RadioAPI] Cache write error:', e);
  }
};

/**
 * Fetch a working stream URL from Radio Browser API
 */
const fetchStreamUrlFromApi = async (searchTerm: string): Promise<string | null> => {
  try {
    console.log(`[RadioAPI] Fetching URL for: ${searchTerm}`);
    const response = await axios.get(
      `${RADIO_BROWSER_API}/stations/byname/${encodeURIComponent(searchTerm)}`,
      {
        params: {
          limit: 5,
          countrycode: 'BR',
          hidebroken: true,
          order: 'votes',
          reverse: true,
        },
        headers: {
          'User-Agent': 'FutScore/1.0',
        },
        timeout: 8000,
      }
    );

    if (response.data && response.data.length > 0) {
      // Find the first station with lastcheckok = 1 (verified working)
      const workingStation = response.data.find((s: any) => s.lastcheckok === 1);
      if (workingStation) {
        const url = workingStation.url_resolved || workingStation.url;
        console.log(`[RadioAPI] Found working URL: ${url}`);
        return url;
      }
    }
    return null;
  } catch (error) {
    console.error(`[RadioAPI] Error fetching URL for ${searchTerm}:`, error);
    return null;
  }
};

/**
 * Build Radio object from config
 */
const buildRadioFromConfig = (config: typeof RADIO_SEARCH_CONFIG[0], streamUrl: string): Radio => ({
  id: config.searchTerm.toLowerCase().replace(/\s+/g, '-'),
  name: config.displayName,
  streamUrl,
  logoUrl: config.logoUrl,
  city: config.city,
  state: config.state,
  frequency: config.frequency,
  tags: ['sports', 'news', 'football'],
  isSportsRadio: true,
  relatedTeams: config.relatedTeams,
});

export const radioApi = {
  /**
   * Get list of sports radios with dynamically fetched URLs
   * Fetches fresh URLs from Radio Browser API when cache is expired
   */
  getSportsRadiosAsync: async (): Promise<Radio[]> => {
    const radios: Radio[] = [];

    await Promise.all(
      RADIO_SEARCH_CONFIG.map(async (config) => {
        const radioId = config.searchTerm.toLowerCase().replace(/\s+/g, '-');
        
        // Check cache first
        let streamUrl = await getCachedUrl(radioId);
        
        if (!streamUrl) {
          // Fetch from API
          streamUrl = await fetchStreamUrlFromApi(config.searchTerm);
          
          if (streamUrl) {
            // Cache the result
            await setCachedUrl(radioId, streamUrl);
          } else {
            // Use fallback URL
            console.log(`[RadioAPI] Using fallback URL for ${config.displayName}`);
            streamUrl = config.fallbackUrl;
          }
        }

        radios.push(buildRadioFromConfig(config, streamUrl));
      })
    );

    return radios;
  },

  /**
   * Get a specific radio with fresh URL
   */
  getRadioWithFreshUrl: async (radioName: string): Promise<Radio | null> => {
    const config = RADIO_SEARCH_CONFIG.find(
      (c) => c.displayName.toLowerCase().includes(radioName.toLowerCase()) ||
             c.searchTerm.toLowerCase().includes(radioName.toLowerCase())
    );

    if (!config) {
      // Try to search directly on the API
      const result = await radioApi.searchRadios(radioName, 1);
      return result.radios[0] || null;
    }

    const radioId = config.searchTerm.toLowerCase().replace(/\s+/g, '-');
    
    // Try to get fresh URL
    let streamUrl = await fetchStreamUrlFromApi(config.searchTerm);
    
    if (streamUrl) {
      await setCachedUrl(radioId, streamUrl);
    } else {
      streamUrl = config.fallbackUrl;
    }

    return buildRadioFromConfig(config, streamUrl);
  },

  /**
   * Get list of pre-defined Brazilian sports radios (sync version with fallback URLs)
   */
  getSportsRadios: (): Radio[] => {
    return RADIO_SEARCH_CONFIG.map((config) => 
      buildRadioFromConfig(config, config.fallbackUrl)
    );
  },

  /**
   * Get all available radios (sports + news)
   */
  getAllRadios: (): Radio[] => {
    return radioApi.getSportsRadios();
  },

  /**
   * Get radios filtered by state
   */
  getRadiosByState: (state: string): Radio[] => {
    return radioApi.getSportsRadios().filter(r => r.state === state);
  },

  /**
   * Search radios from Radio Browser API
   */
  searchRadios: async (query: string, limit: number = 20): Promise<RadioSearchResult> => {
    try {
      const response = await axios.get(`${RADIO_BROWSER_API}/stations/byname/${encodeURIComponent(query)}`, {
        params: {
          limit,
          countrycode: 'BR',
          hidebroken: true,
          order: 'votes',
          reverse: true,
        },
        headers: {
          'User-Agent': 'FutScore/1.0',
        },
        timeout: 8000,
      });

      const radios: Radio[] = response.data
        .filter((station: any) => station.lastcheckok === 1)
        .map((station: any) => ({
          id: station.stationuuid,
          name: station.name,
          streamUrl: station.url_resolved || station.url,
          logoUrl: station.favicon || '',
          city: station.state || '',
          state: station.state || '',
          frequency: '',
          tags: station.tags ? station.tags.split(',') : [],
          isSportsRadio: station.tags?.toLowerCase().includes('sports') || false,
          votes: station.votes,
        }));

      return { radios, totalCount: radios.length };
    } catch (error) {
      console.error('[RadioAPI] Error searching radios:', error);
      return { radios: [], totalCount: 0 };
    }
  },

  /**
   * Suggest radios based on match teams
   */
  suggestRadiosForMatch: (homeTeam: string, awayTeam: string): Radio[] => {
    const homeState = TEAM_STATE_MAP[homeTeam];
    const awayState = TEAM_STATE_MAP[awayTeam];
    const allRadios = radioApi.getSportsRadios();

    const relevantRadios = allRadios.filter(radio => {
      if (!radio.isSportsRadio) return false;
      
      const isRelatedToHome = radio.relatedTeams?.some(t => 
        t.toLowerCase().includes(homeTeam.toLowerCase()) ||
        homeTeam.toLowerCase().includes(t.toLowerCase())
      );
      const isRelatedToAway = radio.relatedTeams?.some(t =>
        t.toLowerCase().includes(awayTeam.toLowerCase()) ||
        awayTeam.toLowerCase().includes(t.toLowerCase())
      );

      const isFromHomeState = radio.state === homeState;
      const isFromAwayState = radio.state === awayState;

      return isRelatedToHome || isRelatedToAway || isFromHomeState || isFromAwayState;
    });

    if (relevantRadios.length === 0) {
      return allRadios.slice(0, 3);
    }

    return relevantRadios;
  },

  /**
   * Get a specific radio by ID
   */
  getRadioById: (id: string): Radio | undefined => {
    return radioApi.getSportsRadios().find(r => r.id === id);
  },

  /**
   * Clear radio URL cache
   */
  clearCache: async (): Promise<void> => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const radioKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(radioKeys);
      console.log(`[RadioAPI] Cleared ${radioKeys.length} cached URLs`);
    } catch (error) {
      console.error('[RadioAPI] Error clearing cache:', error);
    }
  },
};
