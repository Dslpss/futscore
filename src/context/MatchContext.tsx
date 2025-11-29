import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { api } from '../services/api';
import { Match, League } from '../types';
import { CONFIG } from '../constants/config';
import { schedulePushNotification, registerForPushNotificationsAsync } from '../services/notifications';
import { clearCache } from '../utils/clearCache';
import { useFavorites } from './FavoritesContext';

interface MatchContextData {
  liveMatches: Match[];
  todaysMatches: Match[];
  leagues: League[];
  loading: boolean;
  refreshMatches: () => Promise<void>;
}

const MatchContext = createContext<MatchContextData>({} as MatchContextData);

export const MatchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [todaysMatches, setTodaysMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const prevLiveMatchesRef = useRef<Match[]>([]);
  const { favoriteTeams } = useFavorites();

  const fetchLeagues = async () => {
    const data = await api.getLeagues();
    setLeagues(data);
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const leagueIds = Object.values(CONFIG.LEAGUE_IDS) as string[];
      console.log('[MatchContext] Fetching matches for leagues:', leagueIds);
      
      let allFixtures: Match[] = [];
      
      for (const id of leagueIds) {
        // Add small delay between requests to avoid 429 errors
        if (allFixtures.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
        const fixtures = await api.getFixtures(id);
        allFixtures = [...allFixtures, ...fixtures];
      }

      // Filter matches to ensure they are from "today" in local time
      // This fixes the issue where late night games from yesterday (UTC today) appear
      const todayLocal = new Date().toLocaleDateString('pt-BR');
      
      const filteredFixtures = allFixtures.filter(m => {
        const matchDate = new Date(m.fixture.date).toLocaleDateString('pt-BR');
        return matchDate === todayLocal;
      });

      // Derive Live Matches from filtered fixtures
      const live = filteredFixtures.filter(m => 
        ['1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(m.fixture.status.short)
      );
      
      // Check for score changes
      if (prevLiveMatchesRef.current.length > 0) {
        live.forEach(newMatch => {
          const oldMatch = prevLiveMatchesRef.current.find(m => m.fixture.id === newMatch.fixture.id);
          if (oldMatch) {
            const homeScoreChanged = (newMatch.goals.home ?? 0) > (oldMatch.goals.home ?? 0);
            const awayScoreChanged = (newMatch.goals.away ?? 0) > (oldMatch.goals.away ?? 0);
            
            if (homeScoreChanged || awayScoreChanged) {
              const isHomeFavorite = favoriteTeams.includes(newMatch.teams.home.id);
              const isAwayFavorite = favoriteTeams.includes(newMatch.teams.away.id);

              if (isHomeFavorite || isAwayFavorite) {
                const scorer = homeScoreChanged ? newMatch.teams.home.name : newMatch.teams.away.name;
                const title = `⚽ GOL do ${scorer}!`;
                const body = `${newMatch.teams.home.name} ${newMatch.goals.home} x ${newMatch.goals.away} ${newMatch.teams.away.name}\n${newMatch.league.name}`;
                schedulePushNotification(title, body);
              }
            }
          }
        });
      }
      prevLiveMatchesRef.current = live;
      setLiveMatches(live);
      
      console.log('[MatchContext] Total fixtures fetched:', allFixtures.length);
      console.log('[MatchContext] Filtered (Local Date):', filteredFixtures.length);
      console.log('[MatchContext] Live matches:', live.length);
      
      setTodaysMatches(filteredFixtures);
      
    } catch (error) {
      console.error('Error fetching matches', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear cache on first mount to ensure we get fresh data after API migration
    clearCache().then(() => {
      registerForPushNotificationsAsync();
      fetchLeagues();
      fetchMatches();
    });

    // Polling every 60 seconds to respect API limits (10 req/min)
    const interval = setInterval(() => {
      fetchMatches();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <MatchContext.Provider value={{ liveMatches, todaysMatches, leagues, loading, refreshMatches: fetchMatches }}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatches = () => useContext(MatchContext);
