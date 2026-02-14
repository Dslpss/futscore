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
      "pushToken notificationSettings favoriteTeams favoriteMatchIds favoriteLeagues isPremium trialStartDate trialUsed giftPremiumEndDate subscriptionId"
    ).populate("subscriptionId");

    if (users.length === 0) {
      console.log("[Push] Nenhum usuário para notificar");
      return;
    }

    // Helper: Extract numeric ID from MSN format strings
    // MSN IDs look like: "Basketball_NBA_Lakers_1610612747" or "Soccer_Player_12345"
    // We want to extract: 1610612747 or 12345
    const extractNumericId = (id) => {
      if (typeof id === 'number') return id;
      if (typeof id !== 'string') return null;
      
      // Try to get the last numeric part of the ID
      const parts = id.split('_');
      for (let i = parts.length - 1; i >= 0; i--) {
        const num = parseInt(parts[i]);
        if (!isNaN(num)) return num;
      }
      
      // Fallback: try to parse the whole string
      const parsed = parseInt(id);
      return isNaN(parsed) ? null : parsed;
    };

    // Helper: Check if user has premium access
    const hasPremiumAccess = (user) => {
      // Check trial
      if (user.trialStartDate && !user.trialUsed) {
        const trialEnd = new Date(user.trialStartDate);
        trialEnd.setDate(trialEnd.getDate() + 7);
        if (new Date() < trialEnd) return true;
      }
      
      // Check gift premium
      if (user.giftPremiumEndDate && new Date() < user.giftPremiumEndDate) {
        return true;
      }
      
      // Check subscription
      if (user.isPremium && user.subscriptionId) {
        const sub = user.subscriptionId;
        return sub.status === "active" && sub.endDate > new Date();
      }
      
      return false;
    };

    // Helper: Check if league ID matches user's favorite leagues
    const matchesFavoriteLeague = (user, leagueId) => {
      if (!user.favoriteLeagues || user.favoriteLeagues.length === 0) return false;
      
      // Mapeamento de códigos para IDs MSN
      const msnMapping = {
        BSA: "BrazilBrasileiroSerieA",
        BSB: "BrazilBrasileiroSerieB",
        CDB: "BrazilCopaDoBrasil",
        CAR: "BrazilCarioca",
        SPA: "BrazilPaulistaSerieA1",
        MIN: "BrazilMineiro",
        GAU: "BrazilGaucho",
        CL: "InternationalClubsUEFAChampionsLeague",
        EL: "UEFAEuropaLeague",
        PL: "EnglandPremierLeague",
        PD: "SpainLaLiga",
        BL1: "GermanyBundesliga",
        SA: "ItalySerieA",
        FL1: "FranceLigue1",
        PPL: "PortugalPrimeiraLiga",
        ARG: "ArgentinaPrimeraDivision",
        LIB: "InternationalClubsCopaLibertadores",
        SUL: "InternationalClubsCopaSudamericana",
      };
      
      return user.favoriteLeagues.some(favLeagueCode => {
        // Verificação direta
        if (leagueId === favLeagueCode) return true;
        // Verificação via mapeamento MSN
        if (msnMapping[favLeagueCode] && leagueId.includes(msnMapping[favLeagueCode])) return true;
        return false;
      });
    };

    // Extract numeric IDs from the match data
    const homeTeamNumericId = extractNumericId(data.homeTeamId);
    const awayTeamNumericId = extractNumericId(data.awayTeamId);

    console.log(`[Push] Match IDs - Home: ${data.homeTeamId} -> ${homeTeamNumericId}, Away: ${data.awayTeamId} -> ${awayTeamNumericId}`);

    // Filtrar usuários baseado nas configurações
    const messages = [];

    for (const user of users) {
      if (!Expo.isExpoPushToken(user.pushToken)) continue;

      const settings = user.notificationSettings || {};

      // Verificar se o usuário quer receber esse tipo de notificação
      if (data.type === "goal" && settings.goals === false) continue;
      if (data.type === "match_start" && settings.matchStart === false)
        continue;

      // Verificar se deve filtrar (Se allMatches for true, envia para todos, exceto filtros de tipo)
      if (!settings.allMatches) {
        // 1. Verificar se a partida está na lista de favoriteMatchIds (sino 🔔)
        const matchIdStr = String(data.matchId);
        const msnGameIdStr = data.msnGameId ? String(data.msnGameId) : null;
        const isMarkedMatch = (user.favoriteMatchIds || []).some(id => 
          id === matchIdStr || (msnGameIdStr && id === msnGameIdStr)
        );
        
        // 2. Verificar se é time favorito (estrela ⭐) - APENAS se favoritesOnly estiver ativado
        let isFavoriteTeamMatch = false;
        if (settings.favoritesOnly) {
          isFavoriteTeamMatch = user.favoriteTeams.some((team) => {
            const teamId = team.id;
            const teamMsnId = team.msnId;
            
            return (
              teamId === homeTeamNumericId || 
              teamId === awayTeamNumericId ||
              teamMsnId === data.homeTeamId || 
              teamMsnId === data.awayTeamId ||
              teamId === data.homeTeamId ||
              teamId === data.awayTeamId
            );
          });
        }
        
        // 3. Verificar ligas favoritas (apenas se for premium E tiver a configuração ativada) 🏆
        let isFavoriteLeagueMatch = false;
        if (data.leagueId && hasPremiumAccess(user) && settings.favoriteLeaguesNotify) {
          isFavoriteLeagueMatch = matchesFavoriteLeague(user, data.leagueId);
          if (isFavoriteLeagueMatch) {
            console.log(`[Push] ✓ Match is from user's favorite league (premium + setting enabled) - league: ${data.leagueId}`);
          }
        }
        
        // Permitir APENAS se:
        // - É partida marcada (Bell)
        // - É time favorito E favoritesOnly=true
        // - É liga favorita E favoriteLeaguesNotify=true
        if (!isMarkedMatch && !isFavoriteTeamMatch && !isFavoriteLeagueMatch) continue;
        
        if (isMarkedMatch) {
          console.log(`[Push] ✓ Match ${matchIdStr}/${msnGameIdStr || 'no-msn'} is in user's favoriteMatchIds (bell icon) - user: ${user.pushToken?.substring(0, 30)}...`);
        }
      }

      // Adicionar emoji de favorito se for time do usuário
      const isFavorite = user.favoriteTeams.some((team) => {
        const teamId = team.id;
        const teamMsnId = team.msnId;
        return (
          teamId === homeTeamNumericId || 
          teamId === awayTeamNumericId ||
          teamMsnId === data.homeTeamId || 
          teamMsnId === data.awayTeamId ||
          teamId === data.homeTeamId ||
          teamId === data.awayTeamId
        );
      });
      
      // Adicionar emoji de liga se for liga favorita (premium + configuração ativada)
      const isFavoriteLeague = data.leagueId && hasPremiumAccess(user) && settings.favoriteLeaguesNotify && matchesFavoriteLeague(user, data.leagueId);
      
      let finalTitle = title;
      if (isFavorite) {
        finalTitle = `⭐ ${title}`;
      } else if (isFavoriteLeague) {
        finalTitle = `🏆 ${title}`;
      }

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

    // Enviar notificações uma de cada vez para evitar erro PUSH_TOO_MANY_EXPERIENCE_IDS
    // Isso acontece quando tokens de projetos Expo diferentes estão no mesmo request
    console.log(`[Push] Enviando ${messages.length} notificações individualmente...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const message of messages) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync([message]);
        
        // Verificar se houve erro específico no ticket
        if (ticketChunk[0]?.status === 'error') {
          console.error(`[Push] ❌ Erro para token ${message.to?.substring(0, 30)}...: ${ticketChunk[0].message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`[Push] ❌ Erro ao enviar para ${message.to?.substring(0, 30)}...:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`[Push] ✅ Enviado ${successCount}/${messages.length} notificações: ${title}`);
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
    msnGameId: match.id, // Include msnGameId for bell icon matching
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    leagueId: match.leagueId || match.league, // Include leagueId for favorite leagues
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
    msnGameId: match.id, // Include msnGameId for bell icon matching
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    leagueId: match.leagueId || match.league, // Include leagueId for favorite leagues
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
    msnGameId: match.id,
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
    msnGameId: match.id,
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
    msnGameId: match.id,
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
    msnGameId: match.id,
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
    msnGameId: match.id,
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
    msnGameId: match.id,
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
    msnGameId: match.id,
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
    msnGameId: match.id,
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
