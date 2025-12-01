import { api } from './api';
import { Match } from '../types';
import { CONFIG } from '../constants/config';
import { schedulePushNotification } from './notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_KNOWN_SCORES_KEY = 'futscore_last_known_scores';

export const matchService = {
  /**
   * Fetches live matches and checks for score updates.
   * @param favoriteTeams List of favorite team IDs
   * @returns List of live matches
   */
  checkMatchesAndNotify: async (favoriteTeams: number[] = []) => {
    try {
      console.log('[MatchService] Checking matches...');
      const leagueIds = Object.values(CONFIG.LEAGUE_IDS) as string[];
      
      // Fetch all matches for today
      let allFixtures: Match[] = [];
      for (const id of leagueIds) {
        const fixtures = await api.getFixtures(id);
        allFixtures = [...allFixtures, ...fixtures];
      }

      // Filter for today (local time)
      const todayLocal = new Date().toLocaleDateString('pt-BR');
      const filteredFixtures = allFixtures.filter(m => {
        const matchDate = new Date(m.fixture.date).toLocaleDateString('pt-BR');
        return matchDate === todayLocal;
      });

      // Filter for live matches
      const liveMatches = filteredFixtures.filter(m => 
        ['1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(m.fixture.status.short)
      );

      // Check for score changes if we have favorites
      if (favoriteTeams.length > 0 && liveMatches.length > 0) {
        await checkScoreChanges(liveMatches, favoriteTeams);
      }

      return {
        liveMatches,
        todaysMatches: filteredFixtures
      };

    } catch (error) {
      console.error('[MatchService] Error checking matches:', error);
      return { liveMatches: [], todaysMatches: [] };
    }
  }
};

async function checkScoreChanges(currentMatches: Match[], favoriteTeams: number[]) {
  try {
    // Load last known scores
    const lastKnownJson = await AsyncStorage.getItem(LAST_KNOWN_SCORES_KEY);
    const lastKnownScores: Record<number, { home: number, away: number }> = lastKnownJson ? JSON.parse(lastKnownJson) : {};
    
    const newScores: Record<number, { home: number, away: number }> = { ...lastKnownScores };
    let hasChanges = false;

    for (const match of currentMatches) {
      const matchId = match.fixture.id;
      const currentHome = match.goals.home ?? 0;
      const currentAway = match.goals.away ?? 0;
      
      const previous = lastKnownScores[matchId];

      if (previous) {
        const homeChanged = currentHome > previous.home;
        const awayChanged = currentAway > previous.away;

        if (homeChanged || awayChanged) {
          const isHomeFavorite = favoriteTeams.includes(match.teams.home.id);
          const isAwayFavorite = favoriteTeams.includes(match.teams.away.id);

          if (isHomeFavorite || isAwayFavorite) {
            const scorer = homeChanged ? match.teams.home.name : match.teams.away.name;
            const title = `⚽ GOL do ${scorer}!`;
            const body = `${match.teams.home.name} ${currentHome} x ${currentAway} ${match.teams.away.name}\n${match.league.name}`;
            
            console.log(`[MatchService] Notification: ${title}`);
            await schedulePushNotification(title, body);
          }
        }
      }

      // Update known score
      if (!previous || previous.home !== currentHome || previous.away !== currentAway) {
        newScores[matchId] = { home: currentHome, away: currentAway };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await AsyncStorage.setItem(LAST_KNOWN_SCORES_KEY, JSON.stringify(newScores));
    }

  } catch (error) {
    console.error('[MatchService] Error checking score changes:', error);
  }
}
