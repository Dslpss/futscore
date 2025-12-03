const { Expo } = require("expo-server-sdk");
const User = require("../models/User");

// Criar cliente Expo
const expo = new Expo();

/**
 * Envia push notification para um usuário específico
 */
async function sendPushToUser(pushToken, title, body, data = {}) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.log(`[Push] Token inválido: ${pushToken}`);
    return false;
  }

  try {
    const message = {
      to: pushToken,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
      channelId: "match-alerts", // Canal configurado no app
    };

    const chunks = expo.chunkPushNotifications([message]);

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log(`[Push] Enviado: ${title}`);
    }

    return true;
  } catch (error) {
    console.error("[Push] Erro ao enviar:", error);
    return false;
  }
}

/**
 * Envia push notification para TODOS os usuários registrados
 */
async function sendPushToAll(title, body, data = {}, filter = {}) {
  try {
    // Buscar todos os usuários com push token
    const query = { pushToken: { $ne: null } };

    // Se filter.favoritesOnly, buscar apenas quem tem esse time como favorito
    if (filter.teamId) {
      query["favoriteTeams.id"] = filter.teamId;
    }

    const users = await User.find(query).select(
      "pushToken notificationSettings favoriteTeams"
    );

    if (users.length === 0) {
      console.log("[Push] Nenhum usuário para notificar");
      return;
    }

    // Filtrar usuários baseado nas configurações
    const messages = [];

    for (const user of users) {
      if (!Expo.isExpoPushToken(user.pushToken)) continue;

      const settings = user.notificationSettings || {};

      // Verificar se o usuário quer receber esse tipo de notificação
      if (data.type === "goal" && settings.goals === false) continue;
      if (data.type === "match_start" && settings.matchStart === false)
        continue;

      // Verificar se quer apenas favoritos
      if (settings.favoritesOnly && !settings.allMatches) {
        const isFavoriteMatch = user.favoriteTeams.some(
          (team) => team.id === data.homeTeamId || team.id === data.awayTeamId
        );
        if (!isFavoriteMatch) continue;
      }

      // Adicionar emoji de favorito se for time do usuário
      const isFavorite = user.favoriteTeams.some(
        (team) => team.id === data.homeTeamId || team.id === data.awayTeamId
      );
      const finalTitle = isFavorite ? `⭐ ${title}` : title;

      messages.push({
        to: user.pushToken,
        sound: "default",
        title: finalTitle,
        body,
        data,
        priority: "high",
        channelId: "match-alerts",
      });
    }

    if (messages.length === 0) {
      console.log("[Push] Nenhum usuário elegível para essa notificação");
      return;
    }

    // Enviar em chunks (Expo tem limite de 100 por request)
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log(`[Push] Enviado para ${chunk.length} usuários: ${title}`);
      } catch (error) {
        console.error("[Push] Erro no chunk:", error);
      }
    }
  } catch (error) {
    console.error("[Push] Erro ao enviar para todos:", error);
  }
}

/**
 * Notifica início de partida
 */
async function notifyMatchStarted(match) {
  const title = `🟢 COMEÇOU!`;
  const body = `${match.homeTeam} vs ${match.awayTeam}\n${
    match.league || "Ao Vivo"
  }`;

  await sendPushToAll(title, body, {
    type: "match_start",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  });
}

/**
 * Notifica gol
 */
async function notifyGoal(match, scorerTeam) {
  const title = `⚽ GOOOOL do ${scorerTeam}!`;
  const body = `${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${
    match.awayTeam
  }\n${match.league || ""}`;

  await sendPushToAll(title, body, {
    type: "goal",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    scorer: scorerTeam,
  });
}

module.exports = {
  sendPushToUser,
  sendPushToAll,
  notifyMatchStarted,
  notifyGoal,
  expo,
};
