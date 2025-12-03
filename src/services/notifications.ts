import * as Notifications from "expo-notifications";
import { Platform, Vibration } from "react-native";

// Padrão de vibração para notificações (em ms)
const VIBRATION_PATTERN = [0, 300, 100, 300, 100, 300];

// Vibrar o celular (funciona mesmo no modo silencioso)
export function vibratePhone() {
  Vibration.vibrate(VIBRATION_PATTERN);
}

// Configurar canal de notificação para Android (necessário para heads-up)
export async function setupNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("match-alerts", {
      name: "Alertas de Partidas",
      importance: Notifications.AndroidImportance.MAX, // MAX = heads-up notifications
      vibrationPattern: VIBRATION_PATTERN,
      lightColor: "#22c55e",
      sound: "default",
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
      bypassDnd: true, // Ignora modo "Não Perturbe"
    });
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export async function schedulePushNotification(title: string, body: string) {
  // Vibrar manualmente (funciona mesmo no modo silencioso)
  vibratePhone();

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: VIBRATION_PATTERN, // Vibração na notificação
      ...(Platform.OS === "android" && { channelId: "match-alerts" }),
    },
    trigger: null,
  });
}

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  // Configura o canal de notificação para Android (heads-up)
  await setupNotificationChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("Failed to get push token for push notification!");
    return null;
  }

  // Obter o Expo Push Token
  try {
    console.log("[Push] Tentando obter Expo Push Token...");
    console.log("[Push] ProjectId: c060407a-d600-45dd-88b2-f4dcd4ee3eed");

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "c060407a-d600-45dd-88b2-f4dcd4ee3eed", // Seu projectId do app.json
    });

    console.log("[Push] ✅ Expo Push Token obtido com sucesso!");
    console.log("[Push] Token completo:", tokenData.data);
    return tokenData.data;
  } catch (error: any) {
    console.error(
      "[Push] ❌ Erro ao obter push token:",
      error?.message || error
    );
    console.error("[Push] Detalhes do erro:", JSON.stringify(error, null, 2));

    // Verificar se é erro de Expo Go
    if (
      error?.message?.includes("experienceId") ||
      error?.message?.includes("projectId")
    ) {
      console.error(
        "[Push] ⚠️ ATENÇÃO: Push tokens não funcionam corretamente no Expo Go."
      );
      console.error(
        "[Push] ⚠️ Use 'npx expo run:android' ou gere um APK para testar push notifications."
      );
    }

    return null;
  }
}

export async function scheduleMatchStartNotification(match: any) {
  const matchDate = new Date(match.fixture.date);
  const now = new Date();

  // Schedule for 15 minutes before match
  const triggerDate = new Date(matchDate.getTime() - 15 * 60 * 1000);

  // If match is already started or less than 15 mins away, don't schedule
  if (triggerDate <= now) {
    return;
  }

  const identifier = `match_start_${match.fixture.id}`;

  // Check if already scheduled to avoid duplicates
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const isScheduled = scheduled.some((n) => n.identifier === identifier);

  if (isScheduled) {
    return;
  }

  const title = `Vai começar: ${match.teams.home.name} vs ${match.teams.away.name}`;
  const body = `A partida começa em 15 minutos! ⚽`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { matchId: match.fixture.id },
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === "android" && { channelId: "match-alerts" }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
    identifier,
  });

  console.log(
    `[Notifications] Scheduled for ${match.teams.home.name} vs ${
      match.teams.away.name
    } at ${triggerDate.toLocaleTimeString()}`
  );
}

export async function cancelMatchNotification(matchId: number) {
  const identifier = `match_start_${matchId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

// Notificação imediata quando um jogo COMEÇOU (entrou ao vivo)
export async function notifyMatchStarted(
  match: any,
  isFavorite: boolean = false
) {
  const favoriteEmoji = isFavorite ? "⭐ " : "";
  const title = `${favoriteEmoji}🟢 COMEÇOU!`;
  const body = `${match.teams.home.name} vs ${match.teams.away.name}\n${
    match.league?.name || "Ao Vivo"
  }`;

  await schedulePushNotification(title, body);
  console.log(
    `[Notifications] Match started: ${match.teams.home.name} vs ${match.teams.away.name}`
  );
}

// Notificação de gol
export async function notifyGoal(
  match: any,
  scorerTeam: string,
  isFavorite: boolean = false
) {
  const favoriteEmoji = isFavorite ? "⭐ " : "";
  const homeScore = match.goals?.home ?? 0;
  const awayScore = match.goals?.away ?? 0;

  const title = `${favoriteEmoji}⚽ GOOOOL do ${scorerTeam}!`;
  const body = `${match.teams.home.name} ${homeScore} x ${awayScore} ${
    match.teams.away.name
  }\n${match.league?.name || ""}`;

  await schedulePushNotification(title, body);
  console.log(
    `[Notifications] Goal: ${scorerTeam} - ${match.teams.home.name} ${homeScore} x ${awayScore} ${match.teams.away.name}`
  );
}
