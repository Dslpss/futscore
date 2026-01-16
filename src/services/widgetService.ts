import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, NativeModules, Platform } from "react-native";

// Widget data structure
interface WidgetMatch {
  id: string;
  homeTeam: {
    name: string;
    shortName: string;
    logo: string;
  };
  awayTeam: {
    name: string;
    shortName: string;
    logo: string;
  };
  competition: {
    name: string;
    logo?: string;
  };
  date: string;
  time: string;
  status: string;
  channel?: string;
}

interface WidgetData {
  match: WidgetMatch | null;
  favoriteTeamName: string;
  favoriteTeamLogo: string;
  countdown: string;
  lastUpdated: string;
}

const WIDGET_DATA_KEY = "@futscore_widget_data";
const WIDGET_FAVORITES_KEY = "@futscore_favorites";

/**
 * Service for managing home screen widget data
 * 
 * Note: Full widget implementation requires native code:
 * - Android: Kotlin/Java with AppWidgetProvider
 * - iOS: Swift with WidgetKit
 * 
 * This service handles data preparation that can be shared with native widgets
 * through SharedPreferences (Android) or App Groups (iOS).
 */
class WidgetService {
  private static instance: WidgetService;
  private updateInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;

  static getInstance(): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService();
    }
    return WidgetService.instance;
  }

  /**
   * Initialize widget service
   * Sets up periodic updates and app state listeners
   */
  async initialize(): Promise<void> {
    console.log("[WidgetService] Initializing...");
    
    // Update immediately on init
    await this.updateWidgetData();
    
    // Set up periodic updates (every 5 minutes)
    this.updateInterval = setInterval(() => {
      this.updateWidgetData();
    }, 5 * 60 * 1000);

    // Update when app becomes active
    this.appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        this.updateWidgetData();
      }
    });

    console.log("[WidgetService] Initialized with 5-minute update interval");
  }

  /**
   * Stop the widget service
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    console.log("[WidgetService] Stopped");
  }

  /**
   * Update widget data with next match for favorite team
   */
  async updateWidgetData(): Promise<void> {
    try {
      console.log("[WidgetService] Updating widget data...");

      // Get favorite teams from storage
      const favoritesJson = await AsyncStorage.getItem(WIDGET_FAVORITES_KEY);
      let favoriteTeam: { id: number; name: string; logo: string } | null = null;

      if (favoritesJson) {
        const favorites = JSON.parse(favoritesJson);
        if (favorites.length > 0) {
          favoriteTeam = favorites[0]; // Use first favorite
        }
      }

      if (!favoriteTeam) {
        console.log("[WidgetService] No favorite team set");
        await this.saveWidgetData({
          match: null,
          favoriteTeamName: "",
          favoriteTeamLogo: "",
          countdown: "",
          lastUpdated: new Date().toISOString(),
        });
        return;
      }

      // Get next match data from cached matches
      const nextMatch = await this.getNextMatchForTeam(favoriteTeam.id);

      if (!nextMatch) {
        console.log("[WidgetService] No upcoming match found");
        await this.saveWidgetData({
          match: null,
          favoriteTeamName: favoriteTeam.name,
          favoriteTeamLogo: favoriteTeam.logo,
          countdown: "Sem jogos agendados",
          lastUpdated: new Date().toISOString(),
        });
        return;
      }

      // Calculate countdown
      const countdown = this.calculateCountdown(new Date(nextMatch.date));

      const widgetData: WidgetData = {
        match: nextMatch,
        favoriteTeamName: favoriteTeam.name,
        favoriteTeamLogo: favoriteTeam.logo,
        countdown,
        lastUpdated: new Date().toISOString(),
      };

      await this.saveWidgetData(widgetData);
      console.log("[WidgetService] Widget data updated:", widgetData.countdown);
    } catch (error) {
      console.error("[WidgetService] Error updating widget data:", error);
    }
  }

  /**
   * Get next match for a specific team
   */
  private async getNextMatchForTeam(
    teamId: number
  ): Promise<WidgetMatch | null> {
    try {
      // Try to get cached next matches
      const cacheKey = "@futscore_favorite_next_matches";
      const cachedJson = await AsyncStorage.getItem(cacheKey);

      if (cachedJson) {
        const cachedMatches = JSON.parse(cachedJson);
        const teamMatch = cachedMatches.find(
          (m: any) =>
            m.homeTeam?.id === teamId || m.awayTeam?.id === teamId
        );

        if (teamMatch) {
          return this.formatMatchForWidget(teamMatch);
        }
      }

      return null;
    } catch (error) {
      console.error("[WidgetService] Error getting next match:", error);
      return null;
    }
  }

  /**
   * Format a match object for widget display
   */
  private formatMatchForWidget(match: any): WidgetMatch {
    const matchDate = new Date(match.date || match.fixture?.date);

    return {
      id: match.id?.toString() || match.fixture?.id?.toString(),
      homeTeam: {
        name: match.homeTeam?.name || match.teams?.home?.name,
        shortName: this.getShortName(
          match.homeTeam?.name || match.teams?.home?.name
        ),
        logo: match.homeTeam?.logo || match.teams?.home?.logo,
      },
      awayTeam: {
        name: match.awayTeam?.name || match.teams?.away?.name,
        shortName: this.getShortName(
          match.awayTeam?.name || match.teams?.away?.name
        ),
        logo: match.awayTeam?.logo || match.teams?.away?.logo,
      },
      competition: {
        name: match.competition?.name || match.league?.name,
        logo: match.competition?.logo || match.league?.logo,
      },
      date: matchDate.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }),
      time: matchDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: match.status || match.fixture?.status?.short,
      channel: match.channel,
    };
  }

  /**
   * Get short name for team (e.g., "FLA" for "Flamengo")
   */
  private getShortName(name: string): string {
    if (!name) return "";
    
    // Common Brazilian team abbreviations
    const abbreviations: Record<string, string> = {
      Flamengo: "FLA",
      Palmeiras: "PAL",
      "São Paulo": "SAO",
      Corinthians: "COR",
      Fluminense: "FLU",
      Santos: "SAN",
      Grêmio: "GRE",
      Internacional: "INT",
      "Atlético Mineiro": "CAM",
      Cruzeiro: "CRU",
      Vasco: "VAS",
      Botafogo: "BOT",
      Bahia: "BAH",
      Fortaleza: "FOR",
      "Red Bull Bragantino": "RBB",
      Athletico: "CAP",
      // European teams
      Barcelona: "BAR",
      "Real Madrid": "RMA",
      "Manchester City": "MCI",
      Liverpool: "LIV",
      Chelsea: "CHE",
      "Manchester United": "MUN",
      "Bayern Munich": "BAY",
      "Paris Saint-Germain": "PSG",
      Juventus: "JUV",
      Milan: "MIL",
    };

    if (abbreviations[name]) {
      return abbreviations[name];
    }

    // Generate abbreviation from first 3 letters
    return name.substring(0, 3).toUpperCase();
  }

  /**
   * Calculate countdown string
   */
  private calculateCountdown(matchDate: Date): string {
    const now = new Date();
    const diff = matchDate.getTime() - now.getTime();

    if (diff <= 0) {
      return "Agora";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  }

  /**
   * Save widget data to storage
   * This data can be read by native widget implementations
   */
  private async saveWidgetData(data: WidgetData): Promise<void> {
    try {
      await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));

      // Notify native widget to update (if implemented)
      this.notifyWidgetUpdate();
    } catch (error) {
      console.error("[WidgetService] Error saving widget data:", error);
    }
  }

  /**
   * Notify native widget to refresh
   * Requires native module implementation
   */
  private notifyWidgetUpdate(): void {
    try {
      if (Platform.OS === "android") {
        // Call Android native module to update widget
        // NativeModules.WidgetModule?.updateWidget();
        console.log("[WidgetService] Android widget update triggered");
      } else if (Platform.OS === "ios") {
        // Call iOS native module to reload widget timeline
        // NativeModules.WidgetModule?.reloadAllTimelines();
        console.log("[WidgetService] iOS widget update triggered");
      }
    } catch (error) {
      console.log("[WidgetService] Native widget update not available");
    }
  }

  /**
   * Get current widget data
   */
  async getWidgetData(): Promise<WidgetData | null> {
    try {
      const dataJson = await AsyncStorage.getItem(WIDGET_DATA_KEY);
      if (dataJson) {
        return JSON.parse(dataJson);
      }
      return null;
    } catch (error) {
      console.error("[WidgetService] Error getting widget data:", error);
      return null;
    }
  }

  /**
   * Set favorite team for widget
   */
  async setFavoriteTeam(team: {
    id: number;
    name: string;
    logo: string;
  }): Promise<void> {
    try {
      await AsyncStorage.setItem(
        WIDGET_FAVORITES_KEY,
        JSON.stringify([team])
      );
      await this.updateWidgetData();
    } catch (error) {
      console.error("[WidgetService] Error setting favorite team:", error);
    }
  }
}

// Export singleton instance
export const widgetService = WidgetService.getInstance();

// Export types
export type { WidgetData, WidgetMatch };
