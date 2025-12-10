import { Match, Team } from "../types";

/**
 * Transform MSN Sports game data to app Match format
 */
export function transformMsnGameToMatch(game: any, leagueInfo?: any): Match {
  const homeParticipant = game.participants?.find(
    (p: any) => p.homeAwayStatus === "Home"
  );
  const awayParticipant = game.participants?.find(
    (p: any) => p.homeAwayStatus === "Away"
  );

  // Detect sport type (basketball vs soccer)
  const sport = game.sport?.toLowerCase() || "";
  const sportWithLeague =
    game.sportWithLeague?.toLowerCase() ||
    homeParticipant?.team?.sportWithLeague?.toLowerCase() ||
    "";
  const seasonId = game.seasonId?.toLowerCase() || "";

  const isBasketball =
    sport === "basketball" ||
    sportWithLeague.includes("basketball") ||
    sportWithLeague.includes("nba") ||
    seasonId.includes("basketball") ||
    seasonId.includes("nba");

  // Determine match status
  let statusShort = "NS"; // Not Started
  let statusLong = "Não Iniciado";
  let elapsed: number | undefined = undefined;

  const gameStatus = game.gameState?.gameStatus;
  const detailedStatus =
    game.gameState?.detailedGameStatus?.toLowerCase() || "";

  // Buscar minutos do gameClock (formato: { minutes: "52", seconds: "41" })
  const gameClockMinutes = game.gameState?.gameClock?.minutes;
  const gameClockSeconds = game.gameState?.gameClock?.seconds;

  // Buscar período do currentPlayingPeriod (formato: { playingPeriodType: "Half"|"Quarter", number: "2" })
  const currentPeriod = game.currentPlayingPeriod?.number;
  const periodType =
    game.currentPlayingPeriod?.playingPeriodType?.toLowerCase();

  if (gameStatus === "Final" || gameStatus === "Post") {
    statusShort = "FT";
    statusLong = "Partida Encerrada";
  } else if (gameStatus === "InProgress" || gameStatus === "InProgressBreak") {
    if (isBasketball) {
      // ==================== BASKETBALL (NBA) ====================
      // NBA has 4 quarters of 12 minutes each, with halftime after Q2
      // gameClock in NBA is countdown (12:00 → 0:00 per quarter)

      const quarter = parseInt(currentPeriod) || 1;

      // Check for halftime (between Q2 and Q3)
      if (
        gameStatus === "InProgressBreak" ||
        periodType === "break" ||
        detailedStatus.includes("halftime") ||
        detailedStatus.includes("half time") ||
        detailedStatus.includes("half-time")
      ) {
        if (quarter <= 2) {
          statusShort = "HT";
          statusLong = "Intervalo";
        } else {
          // Break between Q3 and Q4
          statusShort = `Q${quarter}`;
          statusLong = `Intervalo ${quarter}º Quarto`;
        }
      } else if (quarter >= 5) {
        // Overtime
        const otPeriod = quarter - 4;
        statusShort = `OT${otPeriod > 1 ? otPeriod : ""}`;
        statusLong = `Prorrogação${otPeriod > 1 ? ` ${otPeriod}` : ""}`;
        // For overtime, show remaining time
        if (gameClockMinutes !== undefined) {
          elapsed = parseInt(gameClockMinutes) || 0;
        }
      } else {
        // Regular quarter (Q1, Q2, Q3, Q4)
        statusShort = `Q${quarter}`;
        statusLong = `${quarter}º Quarto`;
        // For NBA, elapsed can show the countdown time remaining in quarter
        if (gameClockMinutes !== undefined) {
          elapsed = parseInt(gameClockMinutes) || 0;
        }
      }
    } else {
      // ==================== SOCCER (FOOTBALL) ====================
      // Soccer has 2 halves of 45 minutes each
      // gameClock is total elapsed time (0 → 90+)

      // Parse minutos jogados
      if (gameClockMinutes) {
        elapsed = parseInt(gameClockMinutes) || 0;
      }

      // Verificar se está no intervalo
      if (
        gameStatus === "InProgressBreak" ||
        periodType === "break" ||
        detailedStatus.includes("halftime") ||
        detailedStatus.includes("half time") ||
        detailedStatus.includes("half-time") ||
        detailedStatus.includes("break") ||
        detailedStatus.includes("intervalo")
      ) {
        statusShort = "HT";
        statusLong = "Intervalo";
      } else if (
        currentPeriod === "2" ||
        currentPeriod === 2 ||
        detailedStatus.includes("second half") ||
        detailedStatus.includes("2nd half") ||
        detailedStatus.includes("segundo tempo") ||
        // Se o minuto é maior que 45, está no segundo tempo
        (elapsed && elapsed > 45)
      ) {
        statusShort = "2H";
        statusLong = "Segundo Tempo";
      } else {
        statusShort = "1H";
        statusLong = "Primeiro Tempo";
      }
    }
  } else if (gameStatus === "PreGame" || gameStatus === "Pre") {
    statusShort = "NS";
    statusLong = "Não Iniciado";
  }

  // Parse start date from timestamp
  const startDate = game.startDateTime
    ? new Date(parseInt(game.startDateTime)).toISOString()
    : new Date().toISOString();

  // Get scores
  const homeScore: number | null = homeParticipant?.result?.score
    ? parseInt(homeParticipant.result.score)
    : null;
  const awayScore: number | null = awayParticipant?.result?.score
    ? parseInt(awayParticipant.result.score)
    : null;

  // Get halftime scores if available
  const homeHalftime = homeParticipant?.playingPeriodScores?.find(
    (s: any) => s.playingPeriod?.number === "1"
  )?.score;
  const awayHalftime = awayParticipant?.playingPeriodScores?.find(
    (s: any) => s.playingPeriod?.number === "1"
  )?.score;

  const match: Match = {
    fixture: {
      id: game.id
        ? parseInt(game.id.split("_").pop() || "0") ||
          Math.floor(Math.random() * 1000000)
        : Math.floor(Math.random() * 1000000),
      date: startDate,
      status: {
        long: statusLong,
        short: statusShort,
        elapsed: elapsed,
      },
      // Store the full MSN game ID for later use (statistics, lineups)
      // Some games have UUID format, others have SportRadar format
      msnGameId: game.id || game.gameId || game.triggeringId,
    },
    league: (() => {
      // Try to get league info from the MSN_LEAGUE_MAP using multiple possible sources
      const seasonId = game.seasonId || "";
      const leagueId = game.leagueId || game.league?.id || "";
      const sportWithLeague = game.sportWithLeague || "";
      
      // Get league info from _leagueInfo (attached by getScheduleByDate) or game.league
      const leagueInfo = game._leagueInfo || game.league || null;

      // Try to find league in MSN_LEAGUE_MAP by different keys
      let mappedLeague =
        MSN_LEAGUE_MAP[seasonId] ||
        MSN_LEAGUE_MAP[leagueId] ||
        MSN_LEAGUE_MAP[sportWithLeague];

      // Also try to match by partial name in the seasonId
      if (!mappedLeague) {
        const seasonIdLower = seasonId.toLowerCase();
        for (const [key, value] of Object.entries(MSN_LEAGUE_MAP)) {
          if (
            seasonIdLower.includes(
              key
                .toLowerCase()
                .replace("soccer_", "")
                .replace("basketball_", "")
            ) ||
            key
              .toLowerCase()
              .includes(
                seasonIdLower.replace("soccer_", "").replace("basketball_", "")
              )
          ) {
            mappedLeague = value;
            break;
          }
        }
      }

      if (mappedLeague) {
        // Prefer logo from API (leagueInfo) if available, fallback to mapped logo
        const apiLogo = leagueInfo?.image?.id
          ? `https://www.bing.com/th?id=${encodeURIComponent(leagueInfo.image.id)}&w=100&h=100`
          : null;
        
        return {
          id: mappedLeague.id,
          name: mappedLeague.name,
          logo: apiLogo || mappedLeague.logo,
          country: mappedLeague.country,
        };
      }

      // Fallback to leagueInfo or game data
      return {
        id: leagueInfo?.id || seasonId || "unknown",
        name:
          game.leagueName?.localizedName ||
          game.leagueName?.rawName ||
          leagueInfo?.name ||
          "Unknown League",
        logo: leagueInfo?.image?.id
          ? `https://www.bing.com/th?id=${encodeURIComponent(leagueInfo.image.id)}&w=100&h=100`
          : "",
        country: leagueInfo?.country || "International",
      };
    })(),
    teams: {
      home: {
        id: homeParticipant?.team?.id
          ? parseInt(homeParticipant.team.id.split("_").pop() || "0")
          : 0,
        name:
          homeParticipant?.team?.name?.localizedName ||
          homeParticipant?.team?.name?.rawName ||
          "Unknown",
        logo: homeParticipant?.team?.image?.id
          ? `https://www.bing.com/th?id=${homeParticipant.team.image.id}&w=80&h=80`
          : "",
        msnId: homeParticipant?.team?.id, // Store MSN Team ID for later use
      },
      away: {
        id: awayParticipant?.team?.id
          ? parseInt(awayParticipant.team.id.split("_").pop() || "0")
          : 0,
        name:
          awayParticipant?.team?.name?.localizedName ||
          awayParticipant?.team?.name?.rawName ||
          "Unknown",
        logo: awayParticipant?.team?.image?.id
          ? `https://www.bing.com/th?id=${awayParticipant.team.image.id}&w=80&h=80`
          : "",
        msnId: awayParticipant?.team?.id, // Store MSN Team ID for later use
      },
    },
    goals: {
      home: homeScore,
      away: awayScore,
    },
    score: {
      halftime: {
        home:
          homeHalftime !== "-" && homeHalftime ? parseInt(homeHalftime) : null,
        away:
          awayHalftime !== "-" && awayHalftime ? parseInt(awayHalftime) : null,
      },
      fulltime: {
        home: homeScore,
        away: awayScore,
      },
    },
    // Add probabilities if available
    probabilities:
      homeParticipant?.probabilities?.[0] || awayParticipant?.probabilities?.[0]
        ? {
            home: homeParticipant?.probabilities?.[0]?.winProbability || 0,
            draw:
              homeParticipant?.probabilities?.[0]?.tieProbability ||
              awayParticipant?.probabilities?.[0]?.tieProbability ||
              0,
            away: awayParticipant?.probabilities?.[0]?.winProbability || 0,
          }
        : undefined,
    // Add TV channels if available
    // Format can be: { channelNames: ["ESPN", "TNT"] } or { name: "ESPN" }
    channels: extractChannels(game.channels),
    // Add round/week information
    round: (() => {
        const type = game.gameType;
        if (!type) return game.week || game.detailSeasonPhase;
        
        const phase = type.detailSeasonPhase || type.simpleSeasonPhase || game.week;
        if (type.subPhaseNumber && type.totalSubPhases) {
             return `${phase} ${type.subPhaseNumber}/${type.totalSubPhases}`;
        }
        return phase;
    })(),
  };

  return match;
}

/**
 * Extract TV channels from MSN game data
 * Handles multiple formats from the API
 */
function extractChannels(
  channels: any[]
): { name: string; logo?: string }[] | undefined {
  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    return undefined;
  }

  const result: { name: string; logo?: string }[] = [];

  for (const channel of channels) {
    // Format 1: channelNames array (from livearoundtheleague)
    if (channel.channelNames && Array.isArray(channel.channelNames)) {
      for (const name of channel.channelNames) {
        if (name && typeof name === "string") {
          result.push({ name });
        }
      }
    }
    // Format 2: single name property
    else if (channel.name || channel.localizedName) {
      result.push({
        name: channel.name || channel.localizedName,
        logo: channel.image?.id
          ? `https://img-s-msn-com.akamaized.net/tenant/amp/entityid/${channel.image.id}`
          : undefined,
      });
    }
  }

  return result.length > 0 ? result : undefined;
}

/**
 * Map league IDs from MSN Sports format to app format
 * imageId comes from MSN API for Bing thumbnail service
 */
export const MSN_LEAGUE_MAP: Record<
  string,
  {
    id: string;
    sport: string;
    name: string;
    logo: string;
    country: string;
    imageId?: string;
  }
> = {
  Soccer_EnglandPremierLeague: {
    id: "PL",
    sport: "Soccer",
    name: "Premier League",
    logo: "https://www.bing.com/th?id=OIP.K3lXJGMKkL9_L36T5h9_uwHaHa&w=100&h=100",
    imageId: "OIP.K3lXJGMKkL9_L36T5h9_uwHaHa",
    country: "Inglaterra",
  },
  Soccer_GermanyBundesliga: {
    id: "BL1",
    sport: "Soccer",
    name: "Bundesliga",
    logo: "https://www.bing.com/th?id=OIP.lYaZzOdvT7Y-7mJEzLOw8gHaHa&w=100&h=100",
    imageId: "OIP.lYaZzOdvT7Y-7mJEzLOw8gHaHa",
    country: "Alemanha",
  },
  Soccer_ItalySerieA: {
    id: "SA",
    sport: "Soccer",
    name: "Serie A",
    logo: "https://www.bing.com/th?id=OIP.XZW-WgOZE3kNLuCxvLPCVgHaHa&w=100&h=100",
    imageId: "OIP.XZW-WgOZE3kNLuCxvLPCVgHaHa",
    country: "Itália",
  },
  Soccer_FranceLigue1: {
    id: "FL1",
    sport: "Soccer",
    name: "Ligue 1",
    logo: "https://www.bing.com/th?id=OIP.GVdeDXOFaJXuq9GUMxNrUAHaHa&w=100&h=100",
    imageId: "OIP.GVdeDXOFaJXuq9GUMxNrUAHaHa",
    country: "França",
  },
  Soccer_SpainLaLiga: {
    id: "PD",
    sport: "Soccer",
    name: "La Liga",
    logo: "https://www.bing.com/th?id=OIP.OMJH6dHOt-2qoGzM12CQ4gHaHa&w=100&h=100",
    imageId: "OIP.OMJH6dHOt-2qoGzM12CQ4gHaHa",
    country: "Espanha",
  },
  Soccer_PortugalPrimeiraLiga: {
    id: "PPL",
    sport: "Soccer",
    name: "Liga Portugal",
    logo: "https://www.bing.com/th?id=OIP.qXPKHXkpvO_mdhKrT1v-_wHaHa&w=100&h=100",
    imageId: "OIP.qXPKHXkpvO_mdhKrT1v-_wHaHa",
    country: "Portugal",
  },
  Soccer_InternationalClubsUEFAChampionsLeague: {
    id: "CL",
    sport: "Soccer",
    name: "Champions League",
    logo: "https://www.bing.com/th?id=OIP.4WfVpEPLtPcB8qxCj_QVpgHaHa&w=100&h=100",
    imageId: "OIP.4WfVpEPLtPcB8qxCj_QVpgHaHa",
    country: "Europa",
  },
  Soccer_UEFAEuropaLeague: {
    id: "EL",
    sport: "Soccer",
    name: "Europa League",
    logo: "https://www.bing.com/th?id=OIP.5CX8hcL8gQ8xnpEoG4KxjAHaHa&w=100&h=100",
    imageId: "OIP.5CX8hcL8gQ8xnpEoG4KxjAHaHa",
    country: "Europa",
  },
  Soccer_BrazilBrasileiroSerieA: {
    id: "BSA",
    sport: "Soccer",
    name: "Brasileirão",
    logo: "https://www.bing.com/th?id=OIP.m9vS1mQHE7rW0J8GqFWEJgHaHa&w=100&h=100",
    imageId: "OIP.m9vS1mQHE7rW0J8GqFWEJgHaHa",
    country: "Brasil",
  },
  Soccer_BrazilCopaDoBrasil: {
    id: "CDB",
    sport: "Soccer",
    name: "Copa do Brasil",
    logo: "https://www.bing.com/th?id=OSB.eU2p2A%7C8WHaLXvGHBFf8dg--.png&w=100&h=100",
    imageId: "OSB.eU2p2A|8WHaLXvGHBFf8dg--",
    country: "Brasil",
  },
  Basketball_NBA: {
    id: "NBA",
    sport: "Basketball",
    name: "NBA",
    logo: "https://www.bing.com/th?id=OIP.KKy5O2PYIv3vQjFQjLAj2AHaHa&w=100&h=100",
    imageId: "OIP.KKy5O2PYIv3vQjFQjLAj2AHaHa",
    country: "EUA",
  },
  Soccer_FIFAIntercontinentalCup: {
    id: "FIC",
    sport: "Soccer",
    name: "Copa Intercontinental",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/22902.png",
    imageId: "",
    country: "Internacional",
  },
};

/**
 * Get list of leagues that should use MSN Sports API
 * (leagues not available in football-data.org)
 */
export function getMsnLeagueIds(): string[] {
  return [
    "Soccer_BrazilBrasileiroSerieA",
    "Soccer_InternationalClubsUEFAChampionsLeague",
    "Soccer_UEFAEuropaLeague",
    "Soccer_SpainLaLiga",
    "Soccer_EnglandPremierLeague",
    "Soccer_GermanyBundesliga",
    "Soccer_ItalySerieA",
    "Soccer_FranceLigue1",
    "Soccer_PortugalPrimeiraLiga",
    "Basketball_NBA",
  ];
}

/**
 * Get list of leagues that should use football-data.org API
 */
export function getFootballDataLeagueIds(): string[] {
  return ["BSA", "CL", "PD"]; // Brasileirão, Champions, La Liga
}
