import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';
import { League, Match, Team, Player } from '../types';
import { Country } from '../types/country';

// Backend API client (proxies to football-data.org)
const apiClient = axios.create({
  baseURL: `${CONFIG.BACKEND_URL}/api/football`,
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
      },
      {
        id: 'PD' as any,
        name: 'La Liga',
        logo: 'https://crests.football-data.org/PD.png',
        country: 'Spain'
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
      
      const cacheDuration = queryDate === today ? CONFIG.CACHE_DURATION.TODAY_FIXTURES : CONFIG.CACHE_DURATION.FIXTURES;
      await setCachedData(cacheKey, matches, cacheDuration);
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
            long: matchData.status === 'FINISHED' ? 'Partida Encerrada' : 
                   matchData.status === 'IN_PLAY' ? 'Em Andamento' :
                   matchData.status === 'PAUSED' ? 'Intervalo' : 'Não Iniciado',
            short: matchData.status === 'FINISHED' ? 'FT' :
                   matchData.status === 'IN_PLAY' ? '1H' :
                   matchData.status === 'PAUSED' ? 'HT' : 'NS',
            elapsed: matchData.minute || null,
          },
          venue: {
            name: matchData.venue || 'Estádio',
            city: '', // football-data.org often doesn't provide city in this endpoint
          },
          referee: matchData.referees?.[0]?.name,
        },
        league: {
          id: matchData.competition.code as any,
          name: matchData.competition.name,
          logo: matchData.competition.emblem || '',
          country: matchData.area.name,
        },
        teams: {
          home: {
            id: matchData.homeTeam.id,
            name: matchData.homeTeam.name,
            logo: matchData.homeTeam.crest || '',
          },
          away: {
            id: matchData.awayTeam.id,
            name: matchData.awayTeam.name,
            logo: matchData.awayTeam.crest || '',
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
        // football-data.org free tier might not provide detailed stats here, 
        // but if they do, it's usually under a different structure or endpoint.
        // For now, we'll map what we can or leave empty if not present.
        statistics: [],
        lineups: matchData.lineups ? matchData.lineups.map((lineup: any) => ({
          team: {
            id: lineup.team.id,
            name: lineup.team.name,
            logo: lineup.team.logo || '',
            colors: lineup.team.colors,
          },
          coach: {
            id: lineup.coach.id,
            name: lineup.coach.name,
            photo: lineup.coach.photo,
          },
          formation: lineup.formation,
          startXI: lineup.startXI.map((player: any) => ({
            id: player.player.id,
            name: player.player.name,
            number: player.player.number,
            pos: player.player.pos,
            grid: player.player.grid,
          })),
          substitutes: lineup.substitutes.map((player: any) => ({
            id: player.player.id,
            name: player.player.name,
            number: player.player.number,
            pos: player.player.pos,
            grid: player.player.grid,
          })),
        })) : [],
      };

      // Cache for a short time (e.g., 5 minutes)
      await setCachedData(cacheKey, match, 5 * 60 * 1000);
      return match;
    } catch (error) {
      console.error('[API] Error fetching match details:', error);
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
        logo: team.crest || '',
      }));

      // Cache for 7 days
      await setCachedData(cacheKey, teams, 7 * 24 * 60 * 60 * 1000);
      return teams;
    } catch (error) {
      console.error('[API] Error fetching teams:', error);
      return [];
    }
  },

  // Search teams across multiple leagues
  searchTeams: async (query: string, leagueCodes?: string[]): Promise<Array<Team & { country: string }>> => {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const leagues = leagueCodes || ['BSA', 'CL', 'PD'];
      let allTeams: Array<Team & { country: string }> = [];

      for (const code of leagues) {
        const teams = await api.getTeamsByLeague(code);
        const leagueInfo = await api.getLeagues();
        const league = leagueInfo.find(l => l.id === code);
        
        const teamsWithCountry = teams.map(team => ({
          ...team,
          country: league?.country || 'Unknown',
        }));

        allTeams = [...allTeams, ...teamsWithCountry];
      }

      // Filter teams by search query
      const searchLower = query.toLowerCase();
      const filtered = allTeams.filter(team => 
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
      console.error('[API] Error searching teams:', error);
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
        grid: null
      }));

      await setCachedData(cacheKey, squad, 24 * 60 * 60 * 1000);
      return squad;
    } catch (error) {
      console.error('[API] Error fetching squad:', error);
      return [];
    }
  },
};
