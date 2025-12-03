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

  // Determine match status
  let statusShort = "NS"; // Not Started
  let statusLong = "Não Iniciado";
  let elapsed: number | undefined = undefined;

  const gameStatus = game.gameState?.gameStatus;
  const detailedStatus =
    game.gameState?.detailedGameStatus?.toLowerCase() || "";

  // Buscar minutos do gameClock (formato: { minutes: "52", seconds: "41" })
  const gameClockMinutes = game.gameState?.gameClock?.minutes;

  // Buscar período do currentPlayingPeriod (formato: { playingPeriodType: "Half", number: "2" })
  const currentPeriod = game.currentPlayingPeriod?.number;
  const periodType =
    game.currentPlayingPeriod?.playingPeriodType?.toLowerCase();

  if (gameStatus === "Final" || gameStatus === "Post") {
    statusShort = "FT";
    statusLong = "Partida Encerrada";
  } else if (gameStatus === "InProgress" || gameStatus === "InProgressBreak") {
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
        ? parseInt(game.id.split("_").pop() || "0")
        : Math.floor(Math.random() * 1000000),
      date: startDate,
      status: {
        long: statusLong,
        short: statusShort,
        elapsed: elapsed,
      },
      // Store the full MSN game ID for later use (statistics, lineups)
      msnGameId: game.id,
    },
    league: {
      id: leagueInfo?.id || game.seasonId || "unknown",
      name:
        game.leagueName?.localizedName ||
        game.leagueName?.rawName ||
        "Unknown League",
      logo: leagueInfo?.image?.id
        ? `https://img-s-msn-com.akamaized.net/tenant/amp/entityid/${leagueInfo.image.id}`
        : "",
      country: leagueInfo?.country || "International",
    },
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
  };

  return match;
}

/**
 * Map league IDs from MSN Sports format to app format
 */
export const MSN_LEAGUE_MAP: Record<
  string,
  { id: string; sport: string; name: string }
> = {
  Soccer_EnglandPremierLeague: {
    id: "PL",
    sport: "Soccer",
    name: "Premier League",
  },
  Soccer_GermanyBundesliga: { id: "BL1", sport: "Soccer", name: "Bundesliga" },
  Soccer_ItalySerieA: { id: "SA", sport: "Soccer", name: "Serie A" },
  Soccer_FranceLigue1: { id: "FL1", sport: "Soccer", name: "Ligue 1" },
  Soccer_SpainLaLiga: { id: "PD", sport: "Soccer", name: "La Liga" },
  Soccer_PortugalPrimeiraLiga: {
    id: "PPL",
    sport: "Soccer",
    name: "Liga Portugal",
  },
  Soccer_InternationalClubsUEFAChampionsLeague: {
    id: "CL",
    sport: "Soccer",
    name: "Champions League",
  },
  Soccer_UEFAEuropaLeague: { id: "EL", sport: "Soccer", name: "Europa League" },
  Soccer_BrazilBrasileiroSerieA: {
    id: "BSA",
    sport: "Soccer",
    name: "Brasileirão",
  },
  Basketball_NBA: { id: "NBA", sport: "Basketball", name: "NBA" },
};

/**
 * Get list of leagues that should use MSN Sports API
 * (leagues not available in football-data.org)
 */
export function getMsnLeagueIds(): string[] {
  return [
    "Soccer_BrazilBrasileiroSerieA",
    "Soccer_InternationalClubsUEFAChampionsLeague",
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
