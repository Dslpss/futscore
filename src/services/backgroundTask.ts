import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import { matchService } from "./matchService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKGROUND_FETCH_TASK = "BACKGROUND_MATCH_UPDATE";
const FAVORITE_TEAMS_KEY = "futscore_favorite_teams";
const LAST_FETCH_KEY = "futscore_last_background_fetch";

// Configurar handler de notificação para foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const now = new Date();
    console.log(`[BackgroundFetch] Starting at ${now.toLocaleTimeString()}...`);

    // Registrar última execução
    await AsyncStorage.setItem(LAST_FETCH_KEY, now.toISOString());

    // Get favorites from storage
    const favoritesJson = await AsyncStorage.getItem(FAVORITE_TEAMS_KEY);
    const favoriteTeams = favoritesJson ? JSON.parse(favoritesJson) : [];

    // Check matches and notify
    await matchService.checkMatchesAndNotify(favoriteTeams);

    console.log("[BackgroundFetch] Completed successfully.");
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("[BackgroundFetch] Error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Flag para evitar registro duplicado na mesma sessão
let isBackgroundTaskRegistered = false;

export async function registerBackgroundFetchAsync() {
  // Evitar registros duplicados na mesma sessão do app
  if (isBackgroundTaskRegistered) {
    console.log(
      "[BackgroundFetch] Already registered in this session, skipping..."
    );
    return;
  }

  try {
    // Verificar se já está registrado no sistema
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );

    if (isRegistered) {
      console.log(
        "[BackgroundFetch] Task already registered in system, skipping re-registration..."
      );
      isBackgroundTaskRegistered = true;
      return;
    }

    console.log("[BackgroundFetch] Registering task...");

    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutos (mínimo do Android)
      stopOnTerminate: false, // Continuar mesmo com app fechado
      startOnBoot: true, // Iniciar no boot do dispositivo
    });

    // Definir intervalo mínimo do sistema
    await BackgroundFetch.setMinimumIntervalAsync(15 * 60);

    console.log("[BackgroundFetch] Task registered with 15min interval!");
    isBackgroundTaskRegistered = true;

    // Verificar status
    const status = await BackgroundFetch.getStatusAsync();
    console.log(`[BackgroundFetch] Status: ${getStatusText(status)}`);
  } catch (err) {
    console.log("[BackgroundFetch] Task registration failed:", err);
  }
}

function getStatusText(status: BackgroundFetch.BackgroundFetchStatus): string {
  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return "Available ✓";
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return "Denied - User disabled background refresh";
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return "Restricted - System limited background activity";
    default:
      return "Unknown";
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

// Verificar quando foi a última execução
export async function getLastFetchTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_FETCH_KEY);
  } catch {
    return null;
  }
}

// Forçar verificação manual (usar quando app volta ao foreground)
export async function forceCheckMatches() {
  try {
    console.log("[BackgroundFetch] Manual check triggered...");
    const favoritesJson = await AsyncStorage.getItem(FAVORITE_TEAMS_KEY);
    const favoriteTeams = favoritesJson ? JSON.parse(favoritesJson) : [];
    await matchService.checkMatchesAndNotify(favoriteTeams);
  } catch (error) {
    console.error("[BackgroundFetch] Manual check error:", error);
  }
}
