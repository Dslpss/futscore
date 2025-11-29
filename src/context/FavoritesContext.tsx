import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoritesContextData {
  favoriteTeams: number[];
  favoriteLeagues: number[];
  toggleFavoriteTeam: (teamId: number) => Promise<void>;
  toggleFavoriteLeague: (leagueId: number) => Promise<void>;
  isFavoriteTeam: (teamId: number) => boolean;
  isFavoriteLeague: (leagueId: number) => boolean;
}

const FavoritesContext = createContext<FavoritesContextData>({} as FavoritesContextData);

const FAVORITE_TEAMS_KEY = 'futscore_favorite_teams';
const FAVORITE_LEAGUES_KEY = 'futscore_favorite_leagues';

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favoriteTeams, setFavoriteTeams] = useState<number[]>([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState<number[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const teams = await AsyncStorage.getItem(FAVORITE_TEAMS_KEY);
      const leagues = await AsyncStorage.getItem(FAVORITE_LEAGUES_KEY);

      if (teams) setFavoriteTeams(JSON.parse(teams));
      if (leagues) setFavoriteLeagues(JSON.parse(leagues));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavoriteTeam = async (teamId: number) => {
    try {
      const newFavorites = favoriteTeams.includes(teamId)
        ? favoriteTeams.filter(id => id !== teamId)
        : [...favoriteTeams, teamId];
      
      setFavoriteTeams(newFavorites);
      await AsyncStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error toggling favorite team:', error);
    }
  };

  const toggleFavoriteLeague = async (leagueId: number) => {
    try {
      const newFavorites = favoriteLeagues.includes(leagueId)
        ? favoriteLeagues.filter(id => id !== leagueId)
        : [...favoriteLeagues, leagueId];

      setFavoriteLeagues(newFavorites);
      await AsyncStorage.setItem(FAVORITE_LEAGUES_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error toggling favorite league:', error);
    }
  };

  const isFavoriteTeam = (teamId: number) => favoriteTeams.includes(teamId);
  const isFavoriteLeague = (leagueId: number) => favoriteLeagues.includes(leagueId);

  return (
    <FavoritesContext.Provider value={{
      favoriteTeams,
      favoriteLeagues,
      toggleFavoriteTeam,
      toggleFavoriteLeague,
      isFavoriteTeam,
      isFavoriteLeague
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
