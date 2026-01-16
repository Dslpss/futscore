import AsyncStorage from "@react-native-async-storage/async-storage";
import { CONFIG } from "../constants/config";

const API_URL = CONFIG.BACKEND_URL;

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("@FutScore:token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export interface PredictionTeam {
  name: string;
  logo: string;
  id?: string;
}

export interface Prediction {
  _id: string;
  matchId: string;
  homeTeam: PredictionTeam;
  awayTeam: PredictionTeam;
  competition?: {
    name: string;
    logo: string;
  };
  matchDate: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  result: {
    actualHomeScore?: number;
    actualAwayScore?: number;
    points: number;
    type: "pending" | "exact" | "partial" | "result" | "miss";
    processedAt?: string;
  };
  createdAt: string;
}

export interface UserStats {
  predictions: {
    total: number;
    exact: number;
    partial: number;
    result: number;
    miss: number;
    pending: number;
  };
  totalPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  currentStreak: number;
  bestStreak: number;
  accuracy: number;
  achievements: Array<{
    type: string;
    name: string;
    description: string;
    earnedAt: string;
    icon: string;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  totalPoints: number;
  predictions: UserStats["predictions"];
  streak: number;
  isCurrentUser: boolean;
}

// ==========================================
// GET USER PREDICTIONS
// ==========================================
export async function getMyPredictions(
  status?: "pending" | "completed",
  limit = 20,
  offset = 0
): Promise<{ predictions: Prediction[]; total: number; hasMore: boolean }> {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await fetch(
      `${API_URL}/api/predictions/my?${params.toString()}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch predictions");
    }

    return await response.json();
  } catch (error) {
    console.error("[PredictionsAPI] Error getting predictions:", error);
    throw error;
  }
}

// ==========================================
// GET USER STATS
// ==========================================
export async function getMyStats(): Promise<UserStats> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/predictions/stats`, {
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PredictionsAPI] Stats error: ${response.status}`, errorText);
      throw new Error(`Failed to fetch stats: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[PredictionsAPI] Error getting stats:", error);
    throw error;
  }
}

// ==========================================
// CREATE/UPDATE PREDICTION
// ==========================================
export async function createPrediction(data: {
  matchId: string;
  homeTeam: PredictionTeam;
  awayTeam: PredictionTeam;
  competition?: { name: string; logo?: string };
  matchDate: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
}): Promise<{ prediction: Prediction; message: string; isUpdate: boolean }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/predictions`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create prediction");
    }

    return await response.json();
  } catch (error) {
    console.error("[PredictionsAPI] Error creating prediction:", error);
    throw error;
  }
}

// ==========================================
// GET PREDICTION FOR SPECIFIC MATCH
// ==========================================
export async function getMatchPrediction(
  matchId: string
): Promise<Prediction | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/api/predictions/match/${matchId}`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 404) return null; // No prediction yet
      const errorText = await response.text();
      console.error(`[PredictionsAPI] Match prediction error: ${response.status}`, errorText);
      throw new Error(`Failed to fetch prediction: ${response.status}`);
    }

    const data = await response.json();
    return data.prediction || null;
  } catch (error) {
    console.error("[PredictionsAPI] Error getting match prediction:", error);
    return null;
  }
}

// ==========================================
// DELETE PREDICTION
// ==========================================
export async function deletePrediction(matchId: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/predictions/${matchId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete prediction");
    }
  } catch (error) {
    console.error("[PredictionsAPI] Error deleting prediction:", error);
    throw error;
  }
}

// ==========================================
// GET LEADERBOARD
// ==========================================
export async function getLeaderboard(
  type: "total" | "weekly" | "monthly" = "total",
  limit = 50
): Promise<{
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  userPoints: number;
  type: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/api/predictions/leaderboard?type=${type}&limit=${limit}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch leaderboard");
    }

    return await response.json();
  } catch (error) {
    console.error("[PredictionsAPI] Error getting leaderboard:", error);
    throw error;
  }
}

// ==========================================
// GET PREDICTED MATCH IDS
// ==========================================
export async function getPredictedMatchIds(): Promise<string[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/predictions/upcoming`, {
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch upcoming predictions");
    }

    const data = await response.json();
    return data.predictedMatchIds || [];
  } catch (error) {
    console.error("[PredictionsAPI] Error getting predicted match IDs:", error);
    return [];
  }
}
