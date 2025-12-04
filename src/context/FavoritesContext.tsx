import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  toggleFavoriteTeam: (teamId: number) => Promise<void>;
  toggleFavoriteLeague: (leagueId: number) => Promise<void>;
  toggleFavoriteMatch: (match: FavoriteMatch) => Promise<void>;
  isFavoriteTeam: (teamId: number) => boolean;
  isFavoriteLeague: (leagueId: number) => boolean;
  isFavoriteMatch: (fixtureId: number) => boolean;
  getFavoriteMatches: () => FavoriteMatch[];
  clearExpiredFavoriteMatches: () => Promise<void>;
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

  useEffect(() => {
    loadFavorites();
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

  const toggleFavoriteTeam = async (teamId: number) => {
    try {
      const newFavorites = favoriteTeams.includes(teamId)
        ? favoriteTeams.filter((id) => id !== teamId)
        : [...favoriteTeams, teamId];

      setFavoriteTeams(newFavorites);
      await AsyncStorage.setItem(
        FAVORITE_TEAMS_KEY,
        JSON.stringify(newFavorites)
      );
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
      if (exists) {
        newFavorites = favoriteMatches.filter(
          (m) => m.fixtureId !== match.fixtureId
        );
        console.log(
          `[Favorites] Removed match ${match.homeTeam} vs ${match.awayTeam} from favorites`
        );
      } else {
        newFavorites = [...favoriteMatches, match];
        console.log(
          `[Favorites] Added match ${match.homeTeam} vs ${match.awayTeam} to favorites`
        );
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
        toggleFavoriteTeam,
        toggleFavoriteLeague,
        toggleFavoriteMatch,
        isFavoriteTeam,
        isFavoriteLeague,
        isFavoriteMatch,
        getFavoriteMatches,
        clearExpiredFavoriteMatches,
      }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
