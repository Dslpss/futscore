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
  statistics?: Statistics[];
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
