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

    console.log(`[Push] Enviando para: ${pushToken.substring(0, 40)}...`);

    const chunks = expo.chunkPushNotifications([message]);

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log(`[Push] Resposta Expo:`, JSON.stringify(ticketChunk));

      // Verificar se houve erro
      for (const ticket of ticketChunk) {
        if (ticket.status === "error") {
          console.error(`[Push] ❌ Erro do Expo: ${ticket.message}`);
          if (ticket.details && ticket.details.error) {
            console.error(`[Push] ❌ Detalhes: ${ticket.details.error}`);
          }
          return false;
        }
      }

      console.log(`[Push] ✅ Enviado com sucesso: ${title}`);
    }

    return true;
  } catch (error) {
    console.error("[Push] ❌ Erro ao enviar:", error);
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
async function notifyGoal(
  match,
  scorerTeam,
  playerName = null,
  minute = null,
  isPenalty = false,
  isOwnGoal = false
) {
  let title = `⚽ GOOOOL`;
  if (isOwnGoal) {
    title = `⚽ GOL CONTRA`;
  } else if (isPenalty) {
    title = `⚽ GOL DE PÊNALTI`;
  }
  title += ` do ${scorerTeam}!`;

  let body = `${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`;
  if (playerName && minute) {
    body = `${playerName} (${minute}')\n${body}`;
  }
  if (match.league) {
    body += `\n${match.league}`;
  }

  await sendPushToAll(title, body, {
    type: "goal",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    scorer: scorerTeam,
    playerName,
    minute,
    isPenalty,
    isOwnGoal,
  });
}

/**
 * Notifica cartão amarelo
 */
async function notifyYellowCard(match, playerName, teamName, minute = null) {
  const title = `🟨 Cartão Amarelo - ${teamName}`;
  let body = `${playerName} recebeu cartão amarelo`;
  if (minute) {
    body += ` aos ${minute}'`;
  }
  body += `\n${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`;

  await sendPushToAll(title, body, {
    type: "yellow_card",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    playerName,
    teamName,
    minute,
  });
}

/**
 * Notifica cartão vermelho
 */
async function notifyRedCard(
  match,
  playerName,
  teamName,
  minute = null,
  isSecondYellow = false
) {
  const title = isSecondYellow
    ? `🟨🟥 Segundo Amarelo - ${teamName}`
    : `🟥 Cartão Vermelho - ${teamName}`;

  let body = `${playerName} foi expulso`;
  if (isSecondYellow) {
    body += ` (segundo amarelo)`;
  }
  if (minute) {
    body += ` aos ${minute}'`;
  }
  body += `\n${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`;

  await sendPushToAll(title, body, {
    type: "red_card",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    playerName,
    teamName,
    minute,
    isSecondYellow,
  });
}

/**
 * Notifica pênalti
 */
async function notifyPenalty(
  match,
  teamName,
  result = "awarded",
  playerName = null,
  minute = null
) {
  let title = "";
  let body = "";

  switch (result) {
    case "scored":
      title = `⚽ Pênalti Convertido - ${teamName}`;
      body = playerName
        ? `${playerName} converteu o pênalti`
        : `${teamName} converteu o pênalti`;
      break;
    case "missed":
      title = `❌ Pênalti Perdido - ${teamName}`;
      body = playerName
        ? `${playerName} perdeu o pênalti`
        : `${teamName} perdeu o pênalti`;
      break;
    case "saved":
      title = `🧤 Pênalti Defendido!`;
      body = `Goleiro defende pênalti cobrado por ${teamName}`;
      break;
    default:
      title = `⚠️ Pênalti para ${teamName}!`;
      body = `${teamName} tem pênalti a seu favor`;
  }

  if (minute) {
    body += ` aos ${minute}'`;
  }
  body += `\n${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`;

  await sendPushToAll(title, body, {
    type: "penalty",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    teamName,
    result,
    playerName,
    minute,
  });
}

/**
 * Notifica decisão do VAR
 */
async function notifyVAR(match, decision, affectedTeam = null, minute = null) {
  let title = `📺 VAR - Revisão`;
  let body = "";

  switch (decision) {
    case "goal_confirmed":
      title = `📺 VAR - Gol Confirmado`;
      body = affectedTeam
        ? `Gol do ${affectedTeam} confirmado após revisão`
        : `Gol confirmado após revisão do VAR`;
      break;
    case "goal_disallowed":
      title = `📺 VAR - Gol Anulado`;
      body = affectedTeam
        ? `Gol do ${affectedTeam} anulado após revisão`
        : `Gol anulado após revisão do VAR`;
      break;
    case "penalty_awarded":
      title = `📺 VAR - Pênalti Marcado`;
      body = affectedTeam
        ? `Pênalti marcado para ${affectedTeam} após revisão`
        : `Pênalti marcado após revisão do VAR`;
      break;
    case "penalty_cancelled":
      title = `📺 VAR - Pênalti Cancelado`;
      body = `Pênalti cancelado após revisão do VAR`;
      break;
    case "red_card":
      title = `📺 VAR - Cartão Vermelho`;
      body = affectedTeam
        ? `Cartão vermelho para jogador do ${affectedTeam} após revisão`
        : `Cartão vermelho após revisão do VAR`;
      break;
    case "red_card_cancelled":
      title = `📺 VAR - Cartão Vermelho Cancelado`;
      body = `Cartão vermelho cancelado após revisão do VAR`;
      break;
    default:
      body = `Revisão do VAR em andamento`;
  }

  if (minute) {
    body += ` aos ${minute}'`;
  }
  body += `\n${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`;

  await sendPushToAll(title, body, {
    type: "var",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    decision,
    affectedTeam,
    minute,
  });
}

/**
 * Notifica substituição
 */
async function notifySubstitution(
  match,
  teamName,
  playerOut,
  playerIn,
  minute = null
) {
  const title = `🔄 Substituição - ${teamName}`;
  let body = `Sai: ${playerOut}\nEntra: ${playerIn}`;
  if (minute) {
    body += ` (${minute}')`;
  }
  body += `\n${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`;

  await sendPushToAll(title, body, {
    type: "substitution",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    teamName,
    playerOut,
    playerIn,
    minute,
  });
}

/**
 * Notifica intervalo do jogo
 */
async function notifyHalfTime(match) {
  const title = `⏸️ Intervalo`;
  const body = `${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${
    match.awayTeam
  }\n${match.league || ""}`;

  await sendPushToAll(title, body, {
    type: "half_time",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  });
}

/**
 * Notifica início do segundo tempo
 */
async function notifySecondHalfStarted(match) {
  const title = `🔄 VOLTOU!`;
  const body = `${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${
    match.awayTeam
  }\nSegundo tempo começou${match.league ? ` • ${match.league}` : ""}`;

  await sendPushToAll(title, body, {
    type: "second_half_start",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  });
}

/**
 * Notifica fim do jogo
 */
async function notifyMatchEnded(match) {
  let resultText = "";
  if (match.homeScore > match.awayScore) {
    resultText = `Vitória do ${match.homeTeam}!`;
  } else if (match.awayScore > match.homeScore) {
    resultText = `Vitória do ${match.awayTeam}!`;
  } else {
    resultText = "Empate!";
  }

  const title = `🏁 FIM DE JOGO`;
  const body = `${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}\n${resultText}`;

  await sendPushToAll(title, body, {
    type: "match_end",
    matchId: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  });
}

module.exports = {
  sendPushToUser,
  sendPushToAll,
  notifyMatchStarted,
  notifyGoal,
  notifyYellowCard,
  notifyRedCard,
  notifyPenalty,
  notifyVAR,
  notifySubstitution,
  notifyHalfTime,
  notifySecondHalfStarted,
  notifyMatchEnded,
  expo,
};
