import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi, FavoriteTeam } from "../services/authApi";
import { useAuth } from "./AuthContext";

// Interface para jogo favorito
interface FavoriteMatch {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  leagueName: string;
  msnGameId?: string;
}

// Interface para liga favorita
export interface FavoriteLeague {
  id: string;
  name: string;
  logo?: string;
  country?: string;
}

// Ligas disponíveis para seguir
export const AVAILABLE_LEAGUES: FavoriteLeague[] = [
  { id: "BSA", name: "Brasileirão Série A", logo: "https://media.api-sports.io/football/leagues/71.png", country: "Brazil" },
  { id: "BSB", name: "Brasileirão Série B", logo: "https://media.api-sports.io/football/leagues/72.png", country: "Brazil" },
  { id: "CDB", name: "Copa do Brasil", logo: "https://media.api-sports.io/football/leagues/73.png", country: "Brazil" },
  { id: "CL", name: "Champions League", logo: "https://media.api-sports.io/football/leagues/2.png", country: "Europe" },
  { id: "EL", name: "Europa League", logo: "https://media.api-sports.io/football/leagues/3.png", country: "Europe" },
  { id: "PL", name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png", country: "England" },
  { id: "PD", name: "La Liga", logo: "https://media.api-sports.io/football/leagues/140.png", country: "Spain" },
  { id: "BL1", name: "Bundesliga", logo: "https://media.api-sports.io/football/leagues/78.png", country: "Germany" },
  { id: "SA", name: "Serie A", logo: "https://media.api-sports.io/football/leagues/135.png", country: "Italy" },
  { id: "FL1", name: "Ligue 1", logo: "https://media.api-sports.io/football/leagues/61.png", country: "France" },
  { id: "PPL", name: "Liga Portugal", logo: "https://media.api-sports.io/football/leagues/94.png", country: "Portugal" },
  { id: "ARG", name: "Liga Argentina", logo: "https://media.api-sports.io/football/leagues/128.png", country: "Argentina" },
  { id: "LIB", name: "Libertadores", logo: "https://media.api-sports.io/football/leagues/13.png", country: "South America" },
  { id: "SUL", name: "Copa Sul-Americana", logo: "https://media.api-sports.io/football/leagues/11.png", country: "South America" },
  { id: "CAR", name: "Campeonato Carioca", logo: "https://media.api-sports.io/football/leagues/287.png", country: "Brazil" },
  { id: "SPA", name: "Campeonato Paulista", logo: "https://media.api-sports.io/football/leagues/280.png", country: "Brazil" },
  { id: "MIN", name: "Campeonato Mineiro", logo: "https://media.api-sports.io/football/leagues/288.png", country: "Brazil" },
  { id: "GAU", name: "Campeonato Gaúcho", logo: "https://media.api-sports.io/football/leagues/289.png", country: "Brazil" },
];

interface FavoritesContextData {
  favoriteTeams: number[];
  favoriteLeagues: string[];
  favoriteLeaguesData: FavoriteLeague[];
  favoriteMatches: FavoriteMatch[];
  backendFavorites: FavoriteTeam[]; // Expose backend favorites
  toggleFavoriteTeam: (teamId: number, teamInfo?: { name: string; logo: string; country: string; msnId?: string }) => Promise<void>;
  toggleFavoriteLeague: (leagueId: string) => Promise<void>;
  toggleFavoriteMatch: (match: FavoriteMatch) => Promise<void>;
  isFavoriteTeam: (teamId: number) => boolean;
  isFavoriteLeague: (leagueId: string) => boolean;
  isFavoriteMatch: (fixtureId: number) => boolean;
  getFavoriteMatches: () => FavoriteMatch[];
  clearExpiredFavoriteMatches: () => Promise<void>;
  refreshFromBackend: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextData>(
  {} as FavoritesContextData
);

const FAVORITE_TEAMS_KEY = "futscore_favorite_teams";
const FAVORITE_LEAGUES_KEY = "futscore_favorite_leagues";
const FAVORITE_MATCHES_KEY = "futscore_favorite_matches";

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { token, isAuthenticated } = useAuth();
  const [favoriteTeams, setFavoriteTeams] = useState<number[]>([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[]>([]);
  const [favoriteMatches, setFavoriteMatches] = useState<FavoriteMatch[]>([]);
  const [backendFavorites, setBackendFavorites] = useState<FavoriteTeam[]>([]);

  // Computed: dados completos das ligas favoritas
  const favoriteLeaguesData = AVAILABLE_LEAGUES.filter(l => favoriteLeagues.includes(l.id));

  // Load local favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  // Refresh from backend when user authenticates
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log("[FavoritesContext] User authenticated, waiting for AsyncStorage...");
      // Wait for AsyncStorage to be updated by signIn function (it saves token after setting state)
      const timer = setTimeout(() => {
        console.log("[FavoritesContext] Refreshing from backend...");
        refreshFromBackend();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, token]);

  // Limpar jogos expirados periodicamente
  useEffect(() => {
    clearExpiredFavoriteMatches();
  }, [favoriteMatches.length]);

  const loadFavorites = async () => {
    try {
      const teams = await AsyncStorage.getItem(FAVORITE_TEAMS_KEY);
      const leagues = await AsyncStorage.getItem(FAVORITE_LEAGUES_KEY);
      const matches = await AsyncStorage.getItem(FAVORITE_MATCHES_KEY);

      if (teams) setFavoriteTeams(JSON.parse(teams));
      if (leagues) setFavoriteLeagues(JSON.parse(leagues));
      if (matches) setFavoriteMatches(JSON.parse(matches));
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  // Refresh favorites from backend
  const refreshFromBackend = async () => {
    try {
      // Fetch favorite teams
      const backendFavs = await authApi.getFavoriteTeams();
      console.log(`[FavoritesContext] Loaded ${backendFavs.length} favorite teams from backend`);
      setBackendFavorites(backendFavs);
      
      // Sync local state with backend
      const backendIds = backendFavs.map(f => f.id);
      setFavoriteTeams(backendIds);
      await AsyncStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(backendIds));

      // Fetch favorite leagues
      try {
        const backendLeagues = await authApi.getFavoriteLeagues();
        console.log(`[FavoritesContext] Loaded ${backendLeagues.length} favorite leagues from backend`);
        setFavoriteLeagues(backendLeagues);
        await AsyncStorage.setItem(FAVORITE_LEAGUES_KEY, JSON.stringify(backendLeagues));
      } catch (leagueError) {
        console.log("[FavoritesContext] Could not sync leagues with backend");
      }
    } catch (error) {
      console.log("[FavoritesContext] Could not sync with backend, using local data");
    }
  };

  const toggleFavoriteTeam = async (teamId: number, teamInfo?: { name: string; logo: string; country: string; msnId?: string }) => {
    try {
      const isFav = favoriteTeams.includes(teamId);
      
      // Update local state first for immediate feedback
      const newFavorites = isFav
        ? favoriteTeams.filter((id) => id !== teamId)
        : [...favoriteTeams, teamId];

      setFavoriteTeams(newFavorites);
      await AsyncStorage.setItem(
        FAVORITE_TEAMS_KEY,
        JSON.stringify(newFavorites)
      );

      // Sync with backend
      try {
        if (isFav) {
          await authApi.removeFavoriteTeam(teamId);
          console.log(`[FavoritesContext] Removed team ${teamId} from backend`);
        } else {
          const team: FavoriteTeam = {
            id: teamId,
            name: teamInfo?.name || `Team ${teamId}`,
            logo: teamInfo?.logo || '',
            country: teamInfo?.country || 'Unknown',
            msnId: teamInfo?.msnId,
          };
          await authApi.addFavoriteTeam(team);
          console.log(`[FavoritesContext] Added team ${teamId} to backend with msnId: ${teamInfo?.msnId}`);
        }
        // Refresh backend favorites after successful sync
        await refreshFromBackend();
      } catch (backendError) {
        console.log(`[FavoritesContext] Backend sync failed, local change saved:`, backendError);
      }
    } catch (error) {
      console.error("Error toggling favorite team:", error);
    }
  };

  const toggleFavoriteLeague = async (leagueId: string) => {
    try {
      const isFav = favoriteLeagues.includes(leagueId);
      const newFavorites = isFav
        ? favoriteLeagues.filter((id) => id !== leagueId)
        : [...favoriteLeagues, leagueId];

      // Update local state first for immediate feedback
      setFavoriteLeagues(newFavorites);
      await AsyncStorage.setItem(
        FAVORITE_LEAGUES_KEY,
        JSON.stringify(newFavorites)
      );
      console.log(`[FavoritesContext] Toggled league ${leagueId}, total: ${newFavorites.length}`);

      // Sync with backend
      try {
        if (isFav) {
          await authApi.removeFavoriteLeague(leagueId);
          console.log(`[FavoritesContext] Removed league ${leagueId} from backend`);
        } else {
          await authApi.addFavoriteLeague(leagueId);
          console.log(`[FavoritesContext] Added league ${leagueId} to backend`);
        }
      } catch (backendError) {
        console.log(`[FavoritesContext] Backend sync failed for league:`, backendError);
      }
    } catch (error) {
      console.error("Error toggling favorite league:", error);
    }
  };

  const toggleFavoriteMatch = async (match: FavoriteMatch) => {
    try {
      const exists = favoriteMatches.some(
        (m) => m.fixtureId === match.fixtureId
      );

      let newFavorites: FavoriteMatch[];
      // Use fixtureId or msnGameId for backend sync
      const matchIdForBackend = match.msnGameId || String(match.fixtureId);
      
      if (exists) {
        newFavorites = favoriteMatches.filter(
          (m) => m.fixtureId !== match.fixtureId
        );
        console.log(
          `[Favorites] Removed match ${match.homeTeam} vs ${match.awayTeam} from favorites`
        );
        
        // Sync with backend - remove match
        try {
          await authApi.removeFavoriteMatch(matchIdForBackend);
          console.log(`[Favorites] Synced removal to backend: ${matchIdForBackend}`);
        } catch (backendError) {
          console.log(`[Favorites] Backend sync failed (remove):`, backendError);
        }
      } else {
        newFavorites = [...favoriteMatches, match];
        console.log(
          `[Favorites] Added match ${match.homeTeam} vs ${match.awayTeam} to favorites`
        );
        
        // Sync with backend - add match
        try {
          await authApi.addFavoriteMatch(matchIdForBackend);
          console.log(`[Favorites] Synced addition to backend: ${matchIdForBackend}`);
        } catch (backendError) {
          console.log(`[Favorites] Backend sync failed (add):`, backendError);
        }
      }

      setFavoriteMatches(newFavorites);
      await AsyncStorage.setItem(
        FAVORITE_MATCHES_KEY,
        JSON.stringify(newFavorites)
      );
    } catch (error) {
      console.error("Error toggling favorite match:", error);
    }
  };

  // Limpar jogos que já passaram (mais de 24h após a data)
  const clearExpiredFavoriteMatches = async () => {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const validMatches = favoriteMatches.filter((match) => {
        const matchDate = new Date(match.date);
        return matchDate > oneDayAgo;
      });

      if (validMatches.length !== favoriteMatches.length) {
        console.log(
          `[Favorites] Cleaned ${
            favoriteMatches.length - validMatches.length
          } expired matches`
        );
        setFavoriteMatches(validMatches);
        await AsyncStorage.setItem(
          FAVORITE_MATCHES_KEY,
          JSON.stringify(validMatches)
        );
      }
    } catch (error) {
      console.error("Error clearing expired matches:", error);
    }
  };

  const isFavoriteTeam = (teamId: number) => favoriteTeams.includes(teamId);
  const isFavoriteLeague = (leagueId: string) =>
    favoriteLeagues.includes(leagueId);
  const isFavoriteMatch = (fixtureId: number) =>
    favoriteMatches.some((m) => m.fixtureId === fixtureId);
  const getFavoriteMatches = () => favoriteMatches;

  return (
    <FavoritesContext.Provider
      value={{
        favoriteTeams,
        favoriteLeagues,
        favoriteLeaguesData,
        favoriteMatches,
        backendFavorites,
        toggleFavoriteTeam,
        toggleFavoriteLeague,
        toggleFavoriteMatch,
        isFavoriteTeam,
        isFavoriteLeague,
        isFavoriteMatch,
        getFavoriteMatches,
        clearExpiredFavoriteMatches,
        refreshFromBackend,
      }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
