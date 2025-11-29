import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { api } from '../services/api';
import { Match, League } from '../types';
import { CONFIG } from '../constants/config';
import { schedulePushNotification, registerForPushNotificationsAsync } from '../services/notifications';
import { clearCache } from '../utils/clearCache';

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

  const fetchLeagues = async () => {
    const data = await api.getLeagues();
    setLeagues(data);
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const leagueIds = Object.values(CONFIG.LEAGUE_IDS) as string[];
      console.log('[MatchContext] Fetching matches for leagues:', leagueIds);
      
      // Fetch Live Matches
      const live = await api.getLiveMatches(leagueIds);
      
      // Check for score changes
      if (prevLiveMatchesRef.current.length > 0) {
        live.forEach(newMatch => {
          const oldMatch = prevLiveMatchesRef.current.find(m => m.fixture.id === newMatch.fixture.id);
          if (oldMatch) {
            const homeScoreChanged = (newMatch.goals.home ?? 0) > (oldMatch.goals.home ?? 0);
            const awayScoreChanged = (newMatch.goals.away ?? 0) > (oldMatch.goals.away ?? 0);
            
            if (homeScoreChanged || awayScoreChanged) {
              const scorer = homeScoreChanged ? newMatch.teams.home.name : newMatch.teams.away.name;
              const title = `⚽ GOL do ${scorer}!`;
              const body = `${newMatch.teams.home.name} ${newMatch.goals.home} x ${newMatch.goals.away} ${newMatch.teams.away.name}\n${newMatch.league.name}`;
              schedulePushNotification(title, body);
            }
          }
        });
      }
      prevLiveMatchesRef.current = live;
      setLiveMatches(live);

      // Fetch Upcoming/Today's matches for each league
      let allFixtures: Match[] = [];
      for (const id of leagueIds) {
        const fixtures = await api.getFixtures(id);
        allFixtures = [...allFixtures, ...fixtures];
      }
      
      console.log('[MatchContext] Total fixtures fetched:', allFixtures.length);
      console.log('[MatchContext] Live matches:', live.length);
      
      // Filter out finished matches from upcoming if needed, or just show all for today
      setTodaysMatches(allFixtures);
      
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
