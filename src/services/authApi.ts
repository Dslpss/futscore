import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { CONFIG } from "../constants/config";

// Backend API URL - Railway Production
const BACKEND_URL = CONFIG.BACKEND_URL;

const authClient = axios.create({
  baseURL: BACKEND_URL,
});

// Add token to requests
authClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("@FutScore:token");
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
  msnId?: string; // MSN Sports Team ID
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  // Register new user
  register: async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    try {
      const response = await authClient.post("/auth/register", {
        name,
        email,
        password,
      });

      // Save token
      await AsyncStorage.setItem("@FutScore:token", response.data.token);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  },

  // Login user
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await authClient.post("/auth/login", {
        email,
        password,
      });

      // Save token
      await AsyncStorage.setItem("@FutScore:token", response.data.token);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  },

  // Logout user
  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem("@FutScore:token");
  },

  // Get user's favorite teams
  getFavoriteTeams: async (): Promise<FavoriteTeam[]> => {
    try {
      const response = await authClient.get("/user/favorites");
      return response.data.favoriteTeams;
    } catch (error: any) {
      console.error("Error fetching favorite teams:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch favorites"
      );
    }
  },

  // Update user's favorite teams (replace entire list)
  saveFavoriteTeams: async (teams: FavoriteTeam[]): Promise<FavoriteTeam[]> => {
    try {
      const response = await authClient.put("/user/favorites", {
        favoriteTeams: teams,
      });
      return response.data.favoriteTeams;
    } catch (error: any) {
      console.error("Error saving favorite teams:", error);
      throw new Error(
        error.response?.data?.message || "Failed to save favorites"
      );
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
      console.error("Error adding favorite team:", error);
      throw new Error(
        error.response?.data?.message || "Failed to add favorite"
      );
    }
  },

  // Remove a team from favorites
  removeFavoriteTeam: async (teamId: number): Promise<FavoriteTeam[]> => {
    try {
      const response = await authClient.delete(`/user/favorites/${teamId}`);
      return response.data.favoriteTeams;
    } catch (error: any) {
      console.error("Error removing favorite team:", error);
      throw new Error(
        error.response?.data?.message || "Failed to remove favorite"
      );
    }
  },

  // ============ PUSH NOTIFICATIONS ============

  // Registrar Push Token no servidor
  registerPushToken: async (pushToken: string): Promise<void> => {
    try {
      await authClient.post("/user/push-token", { pushToken });
      console.log("[Auth] Push token registrado no servidor");
    } catch (error: any) {
      console.error("Error registering push token:", error);
    }
  },

  // Remover Push Token (ao fazer logout)
  removePushToken: async (): Promise<void> => {
    try {
      await authClient.delete("/user/push-token");
      console.log("[Auth] Push token removido do servidor");
    } catch (error: any) {
      console.error("Error removing push token:", error);
    }
  },

  // Atualizar configurações de notificação
  updateNotificationSettings: async (settings: {
    allMatches?: boolean;
    favoritesOnly?: boolean;
    goals?: boolean;
    matchStart?: boolean;
  }): Promise<void> => {
    try {
      await authClient.put("/user/notification-settings", settings);
      console.log("[Auth] Configurações de notificação atualizadas");
    } catch (error: any) {
      console.error("Error updating notification settings:", error);
      throw new Error(
        error.response?.data?.message || "Failed to update settings"
      );
    }
  },

  // Buscar configurações de notificação
  getNotificationSettings: async (): Promise<{
    allMatches: boolean;
    favoritesOnly: boolean;
    goals: boolean;
    matchStart: boolean;
  }> => {
    try {
      const response = await authClient.get("/user/notification-settings");
      return response.data.notificationSettings;
    } catch (error: any) {
      console.error("Error fetching notification settings:", error);
      return {
        allMatches: true,
        favoritesOnly: false,
        goals: true,
        matchStart: true,
      };
    }
  },
};
