import { useState, useEffect, useCallback } from 'react';
import { Match, MatchTopPlayers, MatchInjuries, MatchLeagueStats } from '../types';
import { api } from '../services/api';
import { MatchTimeline } from '../utils/msnTimelineTransformer';

// Interface local para compatibilidade com a View existente
export interface GameDetails {
  venue?: {
    name: string;
    capacity: string;
    city: string;
    country: string;
  };
  channels?: { type: string; names: string[] }[];
  weather?: {
    condition: string;
    detailedCondition: string;
    temperature: number;
    unit: string;
    summary: string;
  };
  homeTeam?: {
    winLossRecord?: { wins: number; losses: number; ties: number };
  };
  awayTeam?: {
    winLossRecord?: { wins: number; losses: number; ties: number };
  };
}

export const useMatchDetails = (initialMatch: Match | null, visible: boolean) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState<MatchTimeline | null>(null);
  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);
  const [topPlayers, setTopPlayers] = useState<MatchTopPlayers | null>(null);
  const [injuries, setInjuries] = useState<MatchInjuries | null>(null);
  const [playerLeagueStats, setPlayerLeagueStats] = useState<MatchLeagueStats | null>(null);
  const [teamPositions, setTeamPositions] = useState<{ home: number | null; away: number | null }>({ home: null, away: null });
  const [recentMatches, setRecentMatches] = useState<{ home: any[]; away: any[] }>({ home: [], away: [] });
  const [pollData, setPollData] = useState<{ options: { id: string; count: number }[]; type: string } | null>(null);
  
  // Track the current match ID to avoid unnecessary reloads
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  const loadMatchDetails = useCallback(async () => {
    if (!initialMatch) return;

    setLoading(true);
    try {
      const leagueId = initialMatch.league.id?.toString() || "";

      // Check if this is an MSN Sports match
      const hasMsnGameId = !!initialMatch.fixture.msnGameId;
      const hasMsnTeamId =
        !!(initialMatch.teams.home as any).msnId ||
        !!(initialMatch.teams.away as any).msnId;
      const isMsnMatch =
        hasMsnGameId ||
        hasMsnTeamId ||
        leagueId.includes("Soccer_") ||
        leagueId.includes("Basketball_");

      console.log(
        `[useMatchDetails] Match detection - leagueId: ${leagueId}, msnGameId: ${initialMatch.fixture.msnGameId}, isMsnMatch: ${isMsnMatch}`
      );

      if (isMsnMatch) {
        // MSN Matches Logic
        let enhancedMatch = { ...initialMatch };

        try {
          const { msnSportsApi } = await import("../services/msnSportsApi");

          const gameId =
            initialMatch.fixture.msnGameId ||
            initialMatch.fixture.id.toString();

          // Fetch game details
          const details = await msnSportsApi.getGameDetails(gameId);
          if (details) {
            setGameDetails(details);
          }

          // Fetch lineups
          const { transformMsnLineupsToLineups } = await import(
            "../utils/msnLineupsTransformer"
          );
          const msnLineupsData = await msnSportsApi.getLineups(gameId);

          if (msnLineupsData && msnLineupsData.lineups) {
            const lineups = transformMsnLineupsToLineups(msnLineupsData);
            enhancedMatch.lineups = lineups;
          }

          // Fetch top players, injuries, stats...
          const homeTeamMsnId = (initialMatch.teams.home as any).msnId;
          const awayTeamMsnId = (initialMatch.teams.away as any).msnId;
          
          if (homeTeamMsnId && awayTeamMsnId) {
            const parts = homeTeamMsnId.split("_");
            const extractedLeagueId = parts.length >= 3 ? `${parts[1]}_${parts[2]}` : "";
            
            if (extractedLeagueId) {
              // Parallel fetching for independent data
              const [playersData, injuriesData, playerStatsData, standingsData] = await Promise.all([
                  msnSportsApi.getTopPlayers(homeTeamMsnId, awayTeamMsnId, extractedLeagueId),
                  msnSportsApi.getTeamInjuries(homeTeamMsnId, awayTeamMsnId),
                  msnSportsApi.getPlayerLeagueStats(homeTeamMsnId, awayTeamMsnId, extractedLeagueId),
                  msnSportsApi.getStandings(extractedLeagueId)
              ]).catch(err => [null, null, null, null]);

              if (playersData) setTopPlayers(playersData);
              if (injuriesData) setInjuries(injuriesData);
              if (playerStatsData) setPlayerLeagueStats(playerStatsData);
              
              if (standingsData?.standings) {
                const homePos = standingsData.standings.find(
                  (s: any) => s.team?.id === homeTeamMsnId || 
                              s.team?.id?.includes(initialMatch.teams.home.id.toString())
                )?.overallRank;
                const awayPos = standingsData.standings.find(
                  (s: any) => s.team?.id === awayTeamMsnId || 
                              s.team?.id?.includes(initialMatch.teams.away.id.toString())
                )?.overallRank;
                
                if (homePos || awayPos) {
                  setTeamPositions({ home: homePos || null, away: awayPos || null });
                }
              }

              // Fetch recent matches
              try {
                const [homeSchedule, awaySchedule] = await Promise.all([
                  msnSportsApi.getTeamLiveSchedule(homeTeamMsnId, 20),
                  msnSportsApi.getTeamLiveSchedule(awayTeamMsnId, 20),
                ]);

                const filterFinishedGames = (games: any[]) => 
                  games.filter((g: any) => g.gameState?.gameStatus === 'Final');

                if (homeSchedule.length > 0 || awaySchedule.length > 0) {
                  setRecentMatches({
                    home: filterFinishedGames(homeSchedule || []),
                    away: filterFinishedGames(awaySchedule || []),
                  });
                }
              } catch (scheduleError) {
                console.log('[useMatchDetails] Could not fetch team schedules:', scheduleError);
              }

              // Poll Data
              try {
                 const msnGameId = initialMatch.fixture.msnGameId;
                 if (msnGameId) {
                   const poll = await msnSportsApi.getPoll(msnGameId);
                   if (poll?.options?.length > 0) {
                     setPollData(poll);
                   }
                 }
              } catch (pollError) {
                 console.log("[useMatchDetails] Poll error", pollError);
              }
            }
          }

          // Stats & Timeline (Only if started/finished)
          const matchStatus = initialMatch.fixture.status.short;
          const isMatchStartedOrFinished = !["NS", "TBD", "PST", "CANC", "AWD", "WO"].includes(matchStatus);

          if (isMatchStartedOrFinished) {
            const { transformMsnStatsToStatistics } = await import("../utils/msnStatsTransformer");
            
            // League ID Logic (Full ID reconstruction)
            const leagueIdMap: Record<string, string> = {
              PL: "Soccer_EnglandPremierLeague",
              BL1: "Soccer_GermanyBundesliga",
              SA: "Soccer_ItalySerieA",
              FL1: "Soccer_FranceLigue1",
              PD: "Soccer_SpainLaLiga",
              PPL: "Soccer_PortugalPrimeiraLiga",
              CL: "Soccer_InternationalClubsUEFAChampionsLeague",
              EL: "Soccer_UEFAEuropaLeague",
              BSA: "Soccer_BrazilBrasileiroSerieA",
            };
            
            let fullLeagueId = leagueIdMap[leagueId] || leagueId;
             // If still short and we have msnGameId, extract league from it
             if (
                !fullLeagueId.includes("Soccer_") &&
                !fullLeagueId.includes("Basketball_") &&
                initialMatch.fixture.msnGameId
              ) {
                const msnParts = initialMatch.fixture.msnGameId.split("_");
                if (msnParts.length >= 3) {
                  const sportIndex = msnParts.findIndex(
                    (p) => p === "Soccer" || p === "Basketball"
                  );
                  if (sportIndex !== -1 && msnParts[sportIndex + 1]) {
                    fullLeagueId = `${msnParts[sportIndex]}_${
                      msnParts[sportIndex + 1]
                    }`;
                  }
                }
              }

            const sport = fullLeagueId.includes("Basketball") ? "Basketball" : "Soccer";
            const cleanLeagueId = fullLeagueId.replace(/^SportRadar_/, "").replace(/_\d{4}$/, "");

            const msnStatsData = await msnSportsApi.getStatistics(gameId, sport, cleanLeagueId);

            if (msnStatsData && msnStatsData.statistics) {
               const homeTeamMsnId = (initialMatch.teams.home as any).msnId;
               const awayTeamMsnId = (initialMatch.teams.away as any).msnId;

               const homeTeamId = homeTeamMsnId || `SportRadar_${fullLeagueId}_${new Date().getFullYear()}_Team_${initialMatch.teams.home.id}`;
               const awayTeamId = awayTeamMsnId || `SportRadar_${fullLeagueId}_${new Date().getFullYear()}_Team_${initialMatch.teams.away.id}`;

               let statistics = transformMsnStatsToStatistics(msnStatsData, homeTeamId, awayTeamId);
               
               // Fallback search logic
               if (statistics.length === 0) {
                 const homeStats = msnStatsData.statistics.find((s: any) => s.teamId && s.teamId.includes(`_${initialMatch.teams.home.id}`));
                 const awayStats = msnStatsData.statistics.find((s: any) => s.teamId && s.teamId.includes(`_${initialMatch.teams.away.id}`));
                 if (homeStats && awayStats) {
                   statistics = transformMsnStatsToStatistics(msnStatsData, homeStats.teamId, awayStats.teamId);
                 }
               }

               if (statistics.length > 0) {
                 enhancedMatch.statistics = statistics;
               }
            }

            // Timeline
            const { transformMsnTimeline } = await import("../utils/msnTimelineTransformer");
            const msnTimelineRawData = await msnSportsApi.getTimeline(gameId, sport);
            if (msnTimelineRawData) {
              const fullTimeline = transformMsnTimeline(msnTimelineRawData);
              setTimelineData(fullTimeline);
            }
          }

        } catch (error) {
          console.error("[useMatchDetails] Error fetching MSN data:", error);
        }
        setMatch(enhancedMatch);

      } else {
        // Football-data.org match
        try {
            const data = await api.getMatchDetails(initialMatch.fixture.id);
            setMatch(data || initialMatch);
        } catch (e) {
            console.error("[useMatchDetails] Error fetching standard API:", e);
            setMatch(initialMatch);
        }
        
      }
    } catch (error) {
      console.error("[useMatchDetails] General Error:", error);
      setMatch(initialMatch);
    } finally {
      setLoading(false);
    }
  }, [initialMatch]);

  useEffect(() => {
    if (visible && initialMatch) {
      const matchId = initialMatch.fixture.id?.toString() || initialMatch.fixture.msnGameId || '';
      if (matchId !== currentMatchId) {
        setCurrentMatchId(matchId);
        loadMatchDetails();
      } else {
        setMatch(initialMatch);
      }
    } else if (!visible) {
      setCurrentMatchId(null);
      setMatch(null);
      setGameDetails(null);
      setTopPlayers(null);
      setInjuries(null);
      setPlayerLeagueStats(null);
      setTeamPositions({ home: null, away: null });
      setRecentMatches({ home: [], away: [] });
      setPollData(null);
    }
  }, [visible, initialMatch, currentMatchId, loadMatchDetails]);

  return {
    match,
    loading,
    timelineData,
    gameDetails,
    topPlayers,
    injuries,
    playerLeagueStats,
    teamPositions,
    recentMatches,
    pollData
  };
};
