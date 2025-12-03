import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { matchService } from "./matchService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKGROUND_FETCH_TASK = "BACKGROUND_MATCH_UPDATE";
const FAVORITE_TEAMS_KEY = "futscore_favorite_teams";

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log("[BackgroundFetch] Starting background fetch...");

    // Get favorites from storage (optional - for highlighting favorite teams)
    const favoritesJson = await AsyncStorage.getItem(FAVORITE_TEAMS_KEY);
    const favoriteTeams = favoritesJson ? JSON.parse(favoritesJson) : [];

    // Always check matches - notify for ALL games, not just favorites
    await matchService.checkMatchesAndNotify(favoriteTeams);

    console.log("[BackgroundFetch] Completed successfully.");
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("[BackgroundFetch] Error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetchAsync() {
  try {
    console.log("[BackgroundFetch] Registering task...");
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 2 * 60, // 2 minutes
      stopOnTerminate: false, // Continue even if app is closed
      startOnBoot: true, // Start on device boot
    });
    console.log("[BackgroundFetch] Task registered!");
  } catch (err) {
    console.log("[BackgroundFetch] Task registration failed:", err);
  }
}

export async function unregisterBackgroundFetchAsync() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log("[BackgroundFetch] Task unregistered!");
  } catch (err) {
    console.log("[BackgroundFetch] Task unregistration failed:", err);
  }
}
