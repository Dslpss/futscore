import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi, FavoriteTeam } from "../services/authApi";

// Interface para jogo favorito
interface FavoriteMatch {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  leagueName: string;
  msnGameId?: string;
}

interface FavoritesContextData {
  favoriteTeams: number[];
  favoriteLeagues: number[];
  favoriteMatches: FavoriteMatch[];
  backendFavorites: FavoriteTeam[]; // Expose backend favorites
  toggleFavoriteTeam: (teamId: number, teamInfo?: { name: string; logo: string; country: string; msnId?: string }) => Promise<void>;
  toggleFavoriteLeague: (leagueId: number) => Promise<void>;
  toggleFavoriteMatch: (match: FavoriteMatch) => Promise<void>;
  isFavoriteTeam: (teamId: number) => boolean;
  isFavoriteLeague: (leagueId: number) => boolean;
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
  const [favoriteTeams, setFavoriteTeams] = useState<number[]>([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState<number[]>([]);
  const [favoriteMatches, setFavoriteMatches] = useState<FavoriteMatch[]>([]);
  const [backendFavorites, setBackendFavorites] = useState<FavoriteTeam[]>([]);

  useEffect(() => {
    loadFavorites();
    refreshFromBackend();
  }, []);

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
      const backendFavs = await authApi.getFavoriteTeams();
      console.log(`[FavoritesContext] Loaded ${backendFavs.length} favorites from backend`);
      setBackendFavorites(backendFavs);
      
      // Sync local state with backend
      const backendIds = backendFavs.map(f => f.id);
      setFavoriteTeams(backendIds);
      await AsyncStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(backendIds));
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

  const toggleFavoriteLeague = async (leagueId: number) => {
    try {
      const newFavorites = favoriteLeagues.includes(leagueId)
        ? favoriteLeagues.filter((id) => id !== leagueId)
        : [...favoriteLeagues, leagueId];

      setFavoriteLeagues(newFavorites);
      await AsyncStorage.setItem(
        FAVORITE_LEAGUES_KEY,
        JSON.stringify(newFavorites)
      );
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
  const isFavoriteLeague = (leagueId: number) =>
    favoriteLeagues.includes(leagueId);
  const isFavoriteMatch = (fixtureId: number) =>
    favoriteMatches.some((m) => m.fixtureId === fixtureId);
  const getFavoriteMatches = () => favoriteMatches;

  return (
    <FavoritesContext.Provider
      value={{
        favoriteTeams,
        favoriteLeagues,
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
