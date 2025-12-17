// Radio types for FutScore app

export interface Radio {
  id: string;
  name: string;
  streamUrl: string;
  logoUrl: string;
  city?: string;
  state?: string;
  frequency?: string;
  tags: string[];
  isSportsRadio: boolean;
  relatedTeams?: string[];
  votes?: number;
}

export interface RadioSearchResult {
  radios: Radio[];
  totalCount: number;
}

export interface RadioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  currentRadio: Radio | null;
  error: string | null;
}
