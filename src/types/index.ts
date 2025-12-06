export interface League {
  id: number | string;
  name: string;
  logo: string;
  country: string;
  type?: string;
}

export interface Team {
  id: number;
  name: string;
  logo: string;
  msnId?: string; // MSN Sports Team ID (e.g., "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2001")
}

export interface Statistics {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  statistics: {
    type: string;
    value: any;
  }[];
}

export interface Player {
  id: number | string;
  name: string;
  number: number | null;
  pos: string | null;
  grid?: string | null;
  photo?: string;
  stats?: {
    goals?: number;
    assists?: number;
    yellowCards?: number;
    minutesPlayed?: number;
  };
}

export interface Lineup {
  team: {
    id: number;
    name: string;
    logo: string;
    colors?: {
      player: {
        primary: string;
        number: string;
        border: string;
      };
      goalkeeper: {
        primary: string;
        number: string;
        border: string;
      };
    };
  };
  coach: {
    id: number;
    name: string;
    photo?: string;
  };
  formation: string;
  startXI: Player[];
  substitutes: Player[];
}

export interface Match {
  fixture: {
    id: number;
    date: string;
    status: {
      long: string;
      short: string;
      elapsed?: number;
    };
    venue?: {
      name: string;
      city: string;
    };
    referee?: string;
    msnGameId?: string; // Full MSN Sports game ID for API calls
  };
  league: League;
  teams: {
    home: Team;
    away: Team;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score?: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
  };
  probabilities?: {
    home: number;
    draw: number;
    away: number;
  };
  statistics?: Statistics[];
  lineups?: Lineup[];
  // TV Channels where the match will be broadcast
  channels?: {
    name: string;
    logo?: string;
  }[];
  // Match round/week information
  round?: string;
}

export interface ApiResponse<T> {
  get: string;
  parameters: any;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: T[];
}

// MSN Sports API Types
export interface MsnLeague {
  id: string;
  sport: string;
  sportWithLeague: string;
  name: {
    rawName: string;
    localizedName: string;
  };
  image: {
    id: string;
  };
  secondaryIds: Array<{
    idType: string;
    id: string;
  }>;
  navUrls: {
    schedule: string;
    leagueHome: string;
  };
}

export interface MsnPersonalizationStrip {
  items: Array<{
    itemType: string;
    league: MsnLeague;
  }>;
  version: string;
}

export interface MsnEntityHeader {
  league: {
    seasonYear: number;
    currentSeasonPhase: string;
    currentDetailedSeasonPhase: string;
    seasonStart: string;
    seasonEnd: string;
    isRegularSeasonScheduleAvailable: boolean;
    isRegularSeasonStandingsAvailable: boolean;
    isRegularSeasonStatisticsAvailable: boolean;
    isPlayerStatisticsAvailable: boolean;
    id: string;
    sport: string;
    sportWithLeague: string;
    name: {
      rawName: string;
      localizedName: string;
    };
    image: {
      id: string;
      secondaryImages?: Array<{
        type: string;
        id: string;
      }>;
    };
    colors?: {
      primaryColorHex: string;
    };
    secondaryIds: Array<{
      idType: string;
      id: string;
    }>;
    navUrls: {
      schedule: string;
      leagueHome: string;
    };
  };
  urls: {
    leagueId: string;
    name: {
      rawName: string;
      localizedName: string;
    };
    urlTemplates: {
      leagueHome: string;
      scores?: string;
      schedule: string;
      standings?: string;
      team?: string;
      gameCenter?: string;
      headlines?: string;
    };
  };
  version: string;
}

// Detalhes completos do jogo (via /livegames)
export interface GameDetails {
  venue?: {
    name: string;
    capacity: string;
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  channels?: {
    type: string;
    names: string[];
  }[];
  weather?: {
    condition: string;
    detailedCondition: string;
    temperature: number;
    unit: string;
    summary: string;
  };
  winLossRecord?: {
    home: {
      wins: number;
      losses: number;
      ties: number;
    };
    away: {
      wins: number;
      losses: number;
      ties: number;
    };
  };
}

// ESPN Live Event Types
export interface EspnLastPlay {
  sequence: number;
  text: string;
  clock: {
    value: number;
    displayValue: string;
  };
}

export interface EspnAthlete {
  id: string;
  displayName: string;
  shortName: string;
  jersey: string;
  position: string;
}

export interface EspnScoringSummary {
  displayValue: string; // e.g., "2 G"
  athlete: EspnAthlete;
}

export interface EspnGoalieSummary {
  displayValue: string; // e.g., "0 GS, 5 D"
  athlete: EspnAthlete;
}

export interface EspnLiveCompetitor {
  id: string;
  displayName: string;
  abbreviation: string;
  homeAway: 'home' | 'away';
  winner: boolean;
  form: string; // e.g., "EVDDD"
  score: string;
  logo: string;
  logoDark: string;
  color: string;
  record: string;
  scoringSummary?: EspnScoringSummary[];
  goalieSummary?: EspnGoalieSummary[];
}

export interface EspnLiveEvent {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: 'pre' | 'in' | 'post';
  summary: string;
  period: number;
  clock: string;
  location: string;
  link: string;
  situation?: {
    lastPlay: EspnLastPlay;
  };
  competitors: EspnLiveCompetitor[];
}

export interface EspnScoreboardLeague {
  id: string;
  name: string;
  abbreviation: string;
  slug: string;
  events: EspnLiveEvent[];
}

export interface EspnScoreboardResponse {
  sports: Array<{
    id: string;
    name: string;
    slug: string;
    leagues: EspnScoreboardLeague[];
  }>;
}
