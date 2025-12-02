import { Statistics } from '../types';

/**
 * Transform MSN Sports statistics to app Statistics format
 */
export function transformMsnStatsToStatistics(msnStatsData: any, homeTeamId: string, awayTeamId: string): Statistics[] {
  if (!msnStatsData || !msnStatsData.statistics || !Array.isArray(msnStatsData.statistics)) {
    return [];
  }

  const stats = msnStatsData.statistics;
  
  // Find home and away team stats
  const homeStats = stats.find((s: any) => s.teamId === homeTeamId);
  const awayStats = stats.find((s: any) => s.teamId === awayTeamId);

  if (!homeStats || !awayStats) {
    return [];
  }

  // Build statistics array in the format expected by the app
  const statistics: Statistics[] = [];

  // Helper to add stat pair (home and away)
  const addStat = (type: string, homeValue: any, awayValue: any) => {
    if (homeValue !== undefined && awayValue !== undefined) {
      statistics.push({
        team: { id: 0, name: 'home', logo: '' },
        statistics: [{ type, value: homeValue }]
      });
      statistics.push({
        team: { id: 1, name: 'away', logo: '' },
        statistics: [{ type, value: awayValue }]
      });
    }
  };

  // Map MSN stats to app format
  addStat('Ball Possession', `${homeStats.ballPossessionPercentage}%`, `${awayStats.ballPossessionPercentage}%`);
  addStat('Total Shots', homeStats.shotsTotal, awayStats.shotsTotal);
  addStat('Shots on Goal', homeStats.shotsOnTarget, awayStats.shotsOnTarget);
  addStat('Shots off Goal', homeStats.shotsOffTarget, awayStats.shotsOffTarget);
  addStat('Blocked Shots', homeStats.shotsBlocked, awayStats.shotsBlocked);
  addStat('Corner Kicks', homeStats.cornerKicks, awayStats.cornerKicks);
  addStat('Offsides', homeStats.offsides, awayStats.offsides);
  addStat('Fouls', homeStats.fouls, awayStats.fouls);
  addStat('Yellow Cards', homeStats.yellowCards, awayStats.yellowCards);
  addStat('Red Cards', homeStats.redCards, awayStats.redCards);
  addStat('Goalkeeper Saves', homeStats.shotsSaved || 0, awayStats.shotsSaved || 0);

  return statistics;
}
