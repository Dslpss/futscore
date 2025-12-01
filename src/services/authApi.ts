import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CONFIG } from '../constants/config';

// Backend API URL - Railway Production
const BACKEND_URL = CONFIG.BACKEND_URL;

const authClient = axios.create({
  baseURL: BACKEND_URL,
});

// Add token to requests
authClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@FutScore:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  favoriteTeams: FavoriteTeam[];
}

export interface FavoriteTeam {
  id: number;
  name: string;
  logo: string;
  country: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  // Register new user
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await authClient.post('/auth/register', {
        name,
        email,
        password,
      });
      
      // Save token
      await AsyncStorage.setItem('@FutScore:token', response.data.token);
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  // Login user
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await authClient.post('/auth/login', {
        email,
        password,
      });
      
      // Save token
      await AsyncStorage.setItem('@FutScore:token', response.data.token);
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  // Logout user
  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem('@FutScore:token');
  },

  // Get user's favorite teams
  getFavoriteTeams: async (): Promise<FavoriteTeam[]> => {
    try {
      const response = await authClient.get('/user/favorites');
      return response.data.favoriteTeams;
    } catch (error: any) {
      console.error('Error fetching favorite teams:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch favorites');
    }
  },

  // Update user's favorite teams (replace entire list)
  saveFavoriteTeams: async (teams: FavoriteTeam[]): Promise<FavoriteTeam[]> => {
    try {
      const response = await authClient.put('/user/favorites', {
        favoriteTeams: teams,
      });
      return response.data.favoriteTeams;
    } catch (error: any) {
      console.error('Error saving favorite teams:', error);
      throw new Error(error.response?.data?.message || 'Failed to save favorites');
    }
  },

  // Add a single team to favorites
  addFavoriteTeam: async (team: FavoriteTeam): Promise<FavoriteTeam[]> => {
    try {
      const response = await authClient.post(`/user/favorites/${team.id}`, {
        name: team.name,
        logo: team.logo,
        country: team.country,
      });
      return response.data.favoriteTeams;
    } catch (error: any) {
      console.error('Error adding favorite team:', error);
      throw new Error(error.response?.data?.message || 'Failed to add favorite');
    }
  },

  // Remove a team from favorites
  removeFavoriteTeam: async (teamId: number): Promise<FavoriteTeam[]> => {
    try {
      const response = await authClient.delete(`/user/favorites/${teamId}`);
      return response.data.favoriteTeams;
    } catch (error: any) {
      console.error('Error removing favorite team:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove favorite');
    }
  },
};
