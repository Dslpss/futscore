import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
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
  // Verificar se é dispositivo físico (emuladores não suportam push)
  // Alguns dispositivos podem retornar false incorretamente, então apenas logamos
  if (!Device.isDevice) {
    console.log(
      "[Push] ⚠️ Device.isDevice retornou false - tentando registrar mesmo assim..."
    );
  }

  // Configura o canal de notificação para Android (heads-up)
  await setupNotificationChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  console.log("[Push] Status atual de permissão:", existingStatus);

  if (existingStatus !== "granted") {
    console.log("[Push] Solicitando permissão...");
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log("[Push] Nova permissão:", status);
  }

  if (finalStatus !== "granted") {
    console.log("[Push] ❌ Permissão de notificação negada!");
    return null;
  }

  console.log("[Push] ✅ Permissão concedida!");

  // Obter o Expo Push Token
  try {
    console.log("[Push] Tentando obter Expo Push Token...");

    // Usar Constants para pegar projectId dinamicamente
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.manifest?.extra?.eas?.projectId ??
      "f4992830-2819-4f76-aa40-95358ba22784";

    console.log("[Push] ProjectId:", projectId);

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    if (!tokenData || !tokenData.data) {
      console.error("[Push] ❌ Token retornado é inválido:", tokenData);
      return null;
    }

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
  isFavorite: boolean = false,
  playerName?: string,
  isPenalty?: boolean,
  isOwnGoal?: boolean,
  assistName?: string
) {
  const favoriteEmoji = isFavorite ? "⭐ " : "";
  const homeScore = match.goals?.home ?? 0;
  const awayScore = match.goals?.away ?? 0;

  let goalType = "";
  if (isPenalty) goalType = " (Pênalti)";
  if (isOwnGoal) goalType = " (Gol Contra)";

  const title = `${favoriteEmoji}⚽ GOOOOL${goalType}!`;

  let body = `${match.teams.home.name} ${homeScore} x ${awayScore} ${match.teams.away.name}`;
  if (playerName) {
    body = `${playerName}${goalType}\n${body}`;
    if (assistName) {
      body += `\nAssist: ${assistName}`;
    }
  }
  body += `\n${match.league?.name || ""}`;

  await schedulePushNotification(title, body);
  console.log(
    `[Notifications] Goal: ${scorerTeam} - ${match.teams.home.name} ${homeScore} x ${awayScore} ${match.teams.away.name}`
  );
}

// Notificação de cartão amarelo
export async function notifyYellowCard(
  match: any,
  playerName: string,
  teamName: string,
  minute: string,
  isFavorite: boolean = false,
  reason?: string
) {
  const favoriteEmoji = isFavorite ? "⭐ " : "";
  const title = `${favoriteEmoji}🟨 Cartão Amarelo`;

  let body = `${minute}' - ${playerName} (${teamName})`;
  if (reason) body += `\n${reason}`;
  body += `\n${match.teams.home.name} vs ${match.teams.away.name}`;

  await schedulePushNotification(title, body);
  console.log(`[Notifications] Yellow Card: ${playerName} - ${teamName}`);
}

// Notificação de cartão vermelho
export async function notifyRedCard(
  match: any,
  playerName: string,
  teamName: string,
  minute: string,
  isFavorite: boolean = false,
  isSecondYellow: boolean = false,
  reason?: string
) {
  const favoriteEmoji = isFavorite ? "⭐ " : "";
  const cardEmoji = isSecondYellow ? "🟨🟥" : "🟥";
  const cardType = isSecondYellow ? "Segundo Amarelo" : "Cartão Vermelho";
  const title = `${favoriteEmoji}${cardEmoji} ${cardType}!`;

  let body = `${minute}' - ${playerName} EXPULSO! (${teamName})`;
  if (reason) body += `\n${reason}`;
  body += `\n${match.teams.home.name} vs ${match.teams.away.name}`;

  await schedulePushNotification(title, body);
  console.log(`[Notifications] Red Card: ${playerName} - ${teamName}`);
}

// Notificação de pênalti marcado
export async function notifyPenaltyAwarded(
  match: any,
  teamName: string,
  minute: string,
  isFavorite: boolean = false
) {
  const favoriteEmoji = isFavorite ? "⭐ " : "";
  const title = `${favoriteEmoji}🎯 PÊNALTI!`;
  const body = `${minute}' - Pênalti para o ${teamName}!\n${match.teams.home.name} vs ${match.teams.away.name}`;

  await schedulePushNotification(title, body);
  console.log(`[Notifications] Penalty Awarded: ${teamName}`);
}

// Notificação de pênalti perdido/defendido
export async function notifyPenaltyMissed(
  match: any,
  playerName: string,
  teamName: string,
  minute: string,
  isFavorite: boolean = false
) {
  const favoriteEmoji = isFavorite ? "⭐ " : "";
  const title = `${favoriteEmoji}❌ Pênalti Perdido!`;
  const body = `${minute}' - ${playerName} (${teamName}) perdeu o pênalti!\n${match.teams.home.name} vs ${match.teams.away.name}`;

  await schedulePushNotification(title, body);
  console.log(`[Notifications] Penalty Missed: ${playerName} - ${teamName}`);
}

// Notificação de decisão VAR
export async function notifyVARDecision(
  match: any,
  decision: string,
  minute: string,
  isFavorite: boolean = false
) {
  const favoriteEmoji = isFavorite ? "⭐ " : "";
  const title = `${favoriteEmoji}📺 Decisão VAR`;
  const body = `${minute}' - ${decision}\n${match.teams.home.name} vs ${match.teams.away.name}`;

  await schedulePushNotification(title, body);
  console.log(`[Notifications] VAR Decision: ${decision}`);
}

// Notificação de fim de jogo
export async function notifyMatchEnded(
  match: any,
  isFavorite: boolean = false
) {
  const favoriteEmoji = isFavorite ? "⭐ " : "";
  const homeScore = match.goals?.home ?? 0;
  const awayScore = match.goals?.away ?? 0;

  let resultText = "";
  if (homeScore > awayScore) {
    resultText = `Vitória do ${match.teams.home.name}!`;
  } else if (awayScore > homeScore) {
    resultText = `Vitória do ${match.teams.away.name}!`;
  } else {
    resultText = "Empate!";
  }

  const title = `${favoriteEmoji}🏁 FIM DE JOGO!`;
  const body = `${match.teams.home.name} ${homeScore} x ${awayScore} ${match.teams.away.name}\n${resultText}`;

  await schedulePushNotification(title, body);
  console.log(
    `[Notifications] Match Ended: ${match.teams.home.name} ${homeScore} x ${awayScore} ${match.teams.away.name}`
  );
}

// Notificação de intervalo
export async function notifyHalfTime(match: any, isFavorite: boolean = false) {
  const favoriteEmoji = isFavorite ? "⭐ " : "";
  const homeScore = match.goals?.home ?? 0;
  const awayScore = match.goals?.away ?? 0;

  const title = `${favoriteEmoji}⏸️ Intervalo`;
  const body = `${match.teams.home.name} ${homeScore} x ${awayScore} ${match.teams.away.name}`;

  await schedulePushNotification(title, body);
  console.log(
    `[Notifications] Half Time: ${match.teams.home.name} ${homeScore} x ${awayScore} ${match.teams.away.name}`
  );
}
