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
  id: number;
  name: string;
  number: number;
  pos: string | null;
  grid: string | null;
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

