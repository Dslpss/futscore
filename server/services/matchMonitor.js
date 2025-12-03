const {
  notifyMatchStarted,
  notifyGoal,
  notifyYellowCard,
  notifyRedCard,
  notifyPenalty,
  notifyVAR,
  notifySubstitution,
} = require("./pushNotifications");

// Cache de scores e status para detectar mudanças
let lastKnownScores = {};
let lastKnownStatus = {};
let notifiedMatchStarts = new Set();
// Cache para eventos já notificados (por matchId -> Set de eventIds)
let notifiedEvents = {};

// Configuração - intervalos mais espaçados para evitar detecção
const CHECK_INTERVAL_LIVE = 60 * 1000; // 1 minuto quando há jogos ao vivo
const CHECK_INTERVAL_IDLE = 5 * 60 * 1000; // 5 minutos quando não há jogos
let currentInterval = CHECK_INTERVAL_IDLE;
let intervalId = null;

// User agents rotativos para parecer requisições de diferentes dispositivos
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

let userAgentIndex = 0;

function getRandomUserAgent() {
  userAgentIndex = (userAgentIndex + 1) % USER_AGENTS.length;
  return USER_AGENTS[userAgentIndex];
}

// Delay aleatório para parecer comportamento humano
function randomDelay(min = 500, max = 2000) {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.random() * (max - min) + min)
  );
}

// MSN Sports API config (mesma do app)
const MSN_API_BASE = "https://api.msn.com/sports";
const MSN_API_KEY = "kO1dI4ptCTTylLkPL1ZTHYP8JhLKb8mRDoA5yotmNJ";

// Gerar activity ID único
function generateActivityId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Busca jogos ao vivo de todas as ligas
 */
async function fetchLiveMatches() {
  const leagues = [
    {
      id: "Soccer_BrazilBrasileiroSerieA",
      name: "Brasileirão",
      sport: "Soccer",
    },
    {
      id: "Soccer_InternationalClubsUEFAChampionsLeague",
      name: "Champions League",
      sport: "Soccer",
    },
    { id: "Soccer_SpainLaLiga", name: "La Liga", sport: "Soccer" },
    {
      id: "Soccer_EnglandPremierLeague",
      name: "Premier League",
      sport: "Soccer",
    },
    { id: "Soccer_GermanyBundesliga", name: "Bundesliga", sport: "Soccer" },
    { id: "Soccer_ItalySerieA", name: "Serie A", sport: "Soccer" },
    { id: "Soccer_FranceLigue1", name: "Ligue 1", sport: "Soccer" },
    {
      id: "Soccer_PortugalPrimeiraLiga",
      name: "Liga Portugal",
      sport: "Soccer",
    },
  ];

  const allMatches = [];

  for (const league of leagues) {
    try {
      // Delay aleatório entre requisições de cada liga
      await randomDelay(800, 2500);

      const now = new Date();
      const tzoffset = Math.floor(-now.getTimezoneOffset() / 60);

      const params = new URLSearchParams({
        version: "1.0",
        cm: "pt-br",
        scn: "ANON",
        it: "web",
        apikey: MSN_API_KEY,
        activityId: generateActivityId(),
        id: league.id,
        sport: league.sport,
        datetime: now.toISOString().split(".")[0],
        tzoffset: tzoffset.toString(),
        withleaguereco: "true",
        ocid: "sports-league-landing",
      });

      const url = `${MSN_API_BASE}/livearoundtheleague?${params}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          Accept: "*/*",
          "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
        },
      });

      if (!response.ok) {
        console.log(`[Monitor] ${league.name}: HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();

      // DEBUG: Log da estrutura da resposta
      if (!data?.value?.[0]) {
        console.log(
          `[Monitor] ${league.name}: Resposta sem value[0]`,
          JSON.stringify(data).substring(0, 200)
        );
        continue;
      }

      const schedules = data.value[0].schedules || [];

      for (const schedule of schedules) {
        const games = schedule.games || [];

        for (const game of games) {
          // gameState é um objeto, não uma string
          const gameStatus = game.gameState?.gameStatus?.toLowerCase() || "";
          const isLive =
            ["inprogress", "inprogressbreak"].includes(gameStatus) ||
            game.gameState?.detailedGameStatus
              ?.toLowerCase()
              ?.includes("inprogress");
          const isScheduled =
            gameStatus === "pre" || gameStatus === "scheduled";

          // Participantes: [0] = time da casa, [1] = time visitante
          const homeParticipant = game.participants?.[0];
          const awayParticipant = game.participants?.[1];

          if (isLive || isScheduled) {
            allMatches.push({
              id: game.id || game.liveId,
              status: gameStatus,
              rawStatus: game.gameState?.gameStatus,
              homeTeam:
                homeParticipant?.team?.shortName?.rawName ||
                homeParticipant?.team?.name?.rawName ||
                "Time Casa",
              awayTeam:
                awayParticipant?.team?.shortName?.rawName ||
                awayParticipant?.team?.name?.rawName ||
                "Time Fora",
              homeTeamId: homeParticipant?.team?.id || "",
              awayTeamId: awayParticipant?.team?.id || "",
              homeScore: parseInt(homeParticipant?.result?.score) || 0,
              awayScore: parseInt(awayParticipant?.result?.score) || 0,
              league: league.name,
              startTime: game.startDateTime,
              isLive: isLive,
            });
          }
        }
      }

      console.log(`[Monitor] ${league.name}: ${allMatches.length} jogos`);
    } catch (error) {
      console.error(`[Monitor] Erro ao buscar ${league.name}:`, error.message);
    }
  }

  return allMatches;
}

/**
 * Busca timeline de eventos de um jogo específico
 */
async function fetchMatchTimeline(matchId) {
  try {
    await randomDelay(300, 800);

    const params = new URLSearchParams({
      version: "1.0",
      cm: "pt-br",
      scn: "ANON",
      it: "web",
      apikey: MSN_API_KEY,
      activityId: generateActivityId(),
    });

    const url = `${MSN_API_BASE}/match/${matchId}/timeline?${params}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        Accept: "*/*",
        "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
      },
    });

    if (!response.ok) {
      console.log(`[Monitor] Timeline ${matchId}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error(`[Monitor] Erro timeline ${matchId}:`, error.message);
    return null;
  }
}

/**
 * Processa eventos da timeline e envia notificações
 */
async function processTimelineEvents(match, events) {
  if (!events || !Array.isArray(events)) return;

  const matchId = match.id;

  // Inicializar cache de eventos notificados para este jogo
  if (!notifiedEvents[matchId]) {
    notifiedEvents[matchId] = new Set();
  }

  for (const event of events) {
    const eventId =
      event.id ||
      `${event.eventType}_${event.clockTime}_${event.participantId}`;

    // Pular se já notificamos este evento
    if (notifiedEvents[matchId].has(eventId)) continue;

    const eventType = event.eventType?.toLowerCase() || "";
    const minute = event.clockTime || event.gameTime?.gameMinute || null;

    // Identificar time do evento
    const isHomeTeam =
      event.participantId === match.homeTeamId ||
      event.teamId === match.homeTeamId;
    const teamName = isHomeTeam ? match.homeTeam : match.awayTeam;

    // Nome do jogador
    const playerName =
      event.player?.name?.rawName ||
      event.player?.shortName?.rawName ||
      event.athleteName ||
      null;

    try {
      switch (eventType) {
        case "card":
        case "yellowcard":
          if (
            event.cardType?.toLowerCase() === "yellow" ||
            eventType === "yellowcard"
          ) {
            console.log(
              `[Monitor] 🟨 Cartão Amarelo: ${playerName} (${teamName}) - ${match.homeTeam} vs ${match.awayTeam}`
            );
            await notifyYellowCard(
              match,
              playerName || "Jogador",
              teamName,
              minute
            );
            notifiedEvents[matchId].add(eventId);
          }
          break;

        case "redcard":
          console.log(
            `[Monitor] 🟥 Cartão Vermelho: ${playerName} (${teamName}) - ${match.homeTeam} vs ${match.awayTeam}`
          );
          const isSecondYellow =
            event.cardType?.toLowerCase()?.includes("second") ||
            event.isSecondYellow;
          await notifyRedCard(
            match,
            playerName || "Jogador",
            teamName,
            minute,
            isSecondYellow
          );
          notifiedEvents[matchId].add(eventId);
          break;

        case "secondyellowcard":
          console.log(
            `[Monitor] 🟨🟥 Segundo Amarelo: ${playerName} (${teamName}) - ${match.homeTeam} vs ${match.awayTeam}`
          );
          await notifyRedCard(
            match,
            playerName || "Jogador",
            teamName,
            minute,
            true
          );
          notifiedEvents[matchId].add(eventId);
          break;

        case "penaltymissed":
        case "penalty_missed":
          console.log(
            `[Monitor] ❌ Pênalti Perdido: ${teamName} - ${match.homeTeam} vs ${match.awayTeam}`
          );
          await notifyPenalty(match, teamName, "missed", playerName, minute);
          notifiedEvents[matchId].add(eventId);
          break;

        case "penaltysaved":
        case "penalty_saved":
          console.log(
            `[Monitor] 🧤 Pênalti Defendido: ${teamName} - ${match.homeTeam} vs ${match.awayTeam}`
          );
          await notifyPenalty(match, teamName, "saved", playerName, minute);
          notifiedEvents[matchId].add(eventId);
          break;

        case "var":
        case "varreview":
          const decision =
            event.varDecision?.toLowerCase() ||
            event.decision?.toLowerCase() ||
            "review";
          console.log(
            `[Monitor] 📺 VAR: ${decision} - ${match.homeTeam} vs ${match.awayTeam}`
          );
          await notifyVAR(match, decision, teamName, minute);
          notifiedEvents[matchId].add(eventId);
          break;

        case "substitution":
          const playerOut =
            event.playerOut?.name?.rawName ||
            event.playerOut?.shortName?.rawName ||
            "Jogador";
          const playerIn =
            event.playerIn?.name?.rawName ||
            event.playerIn?.shortName?.rawName ||
            "Jogador";
          console.log(
            `[Monitor] 🔄 Substituição: ${playerOut} -> ${playerIn} (${teamName})`
          );
          await notifySubstitution(
            match,
            teamName,
            playerOut,
            playerIn,
            minute
          );
          notifiedEvents[matchId].add(eventId);
          break;

        case "scorechange":
        case "goal":
          // Gols são detectados pela mudança de score, mas podemos enriquecer com dados da timeline
          const isPenalty =
            event.isPenalty ||
            event.goalType?.toLowerCase()?.includes("penalty");
          const isOwnGoal =
            event.isOwnGoal || event.goalType?.toLowerCase()?.includes("own");

          // Apenas logar, não notificar aqui (já é feito pela detecção de score)
          if (!notifiedEvents[matchId].has(eventId)) {
            console.log(
              `[Monitor] ⚽ Gol detectado na timeline: ${playerName} (${teamName}) - Pênalti: ${isPenalty}, Contra: ${isOwnGoal}`
            );
            notifiedEvents[matchId].add(eventId);
          }
          break;
      }
    } catch (error) {
      console.error(
        `[Monitor] Erro ao processar evento ${eventType}:`,
        error.message
      );
    }
  }
}

/**
 * Verifica mudanças e envia notificações
 */
async function checkAndNotify() {
  try {
    console.log("[Monitor] Verificando jogos...");
    const matches = await fetchLiveMatches();

    // Contar jogos ao vivo para ajustar intervalo
    const liveMatches = matches.filter((m) => m.isLive);
    console.log(
      `[Monitor] ${matches.length} jogos total, ${liveMatches.length} ao vivo`
    );

    // Ajustar intervalo baseado em jogos ao vivo
    adjustCheckInterval(liveMatches.length > 0);

    for (const match of matches) {
      const matchId = match.id;

      // 1. Verificar se jogo COMEÇOU (mudou de scheduled/pre para inprogress)
      const previousStatus = lastKnownStatus[matchId];
      const isNowLive = match.isLive;
      const wasNotLive =
        !previousStatus ||
        previousStatus === "pre" ||
        previousStatus === "scheduled";

      if (isNowLive && wasNotLive && !notifiedMatchStarts.has(matchId)) {
        console.log(
          `[Monitor] 🟢 Jogo começou: ${match.homeTeam} vs ${match.awayTeam}`
        );
        await notifyMatchStarted(match);
        notifiedMatchStarts.add(matchId);
      }

      // Atualizar status conhecido
      lastKnownStatus[matchId] = match.status;

      // 2. Verificar se houve GOL (apenas para jogos ao vivo)
      if (isNowLive) {
        const previous = lastKnownScores[matchId];

        if (previous) {
          const homeScored = match.homeScore > previous.home;
          const awayScored = match.awayScore > previous.away;

          if (homeScored) {
            console.log(
              `[Monitor] ⚽ GOL ${match.homeTeam}! ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`
            );
            await notifyGoal(match, match.homeTeam);
          }

          if (awayScored) {
            console.log(
              `[Monitor] ⚽ GOL ${match.awayTeam}! ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`
            );
            await notifyGoal(match, match.awayTeam);
          }
        }

        // Atualizar score conhecido
        lastKnownScores[matchId] = {
          home: match.homeScore,
          away: match.awayScore,
        };

        // 3. Buscar e processar eventos da timeline (cartões, pênaltis, VAR, etc)
        const timelineEvents = await fetchMatchTimeline(matchId);
        if (timelineEvents) {
          await processTimelineEvents(match, timelineEvents);
        }
      }
    }

    // Limpar jogos antigos do cache (a cada hora)
    cleanOldCache();
  } catch (error) {
    console.error("[Monitor] Erro:", error);
  }
}

/**
 * Ajusta o intervalo de verificação baseado em jogos ao vivo
 */
function adjustCheckInterval(hasLiveMatches) {
  const newInterval = hasLiveMatches
    ? CHECK_INTERVAL_LIVE
    : CHECK_INTERVAL_IDLE;

  if (newInterval !== currentInterval) {
    currentInterval = newInterval;
    console.log(
      `[Monitor] Intervalo ajustado para ${currentInterval / 1000}s (${
        hasLiveMatches ? "jogos ao vivo" : "sem jogos"
      })`
    );

    // Reiniciar o intervalo com o novo tempo
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = setInterval(checkAndNotify, currentInterval);
    }
  }
}

/**
 * Limpa cache de jogos antigos
 */
let lastCleanup = Date.now();
function cleanOldCache() {
  const now = Date.now();
  if (now - lastCleanup > 60 * 60 * 1000) {
    // A cada 1 hora
    console.log("[Monitor] Limpando cache antigo...");
    lastKnownScores = {};
    lastKnownStatus = {};
    notifiedMatchStarts.clear();
    notifiedEvents = {};
    lastCleanup = now;
  }
}

/**
 * Inicia o monitoramento em loop
 */
function startMatchMonitor() {
  console.log("[Monitor] 🚀 Iniciando monitoramento de partidas...");
  console.log(
    `[Monitor] Intervalo inicial: ${currentInterval / 1000}s (modo economia)`
  );
  console.log("[Monitor] Intervalo com jogos ao vivo: 60s | Sem jogos: 5min");

  // Primeira verificação com delay inicial aleatório
  setTimeout(() => {
    checkAndNotify();

    // Loop contínuo
    intervalId = setInterval(checkAndNotify, currentInterval);
  }, Math.random() * 5000 + 2000); // Delay inicial de 2-7 segundos
}

module.exports = {
  startMatchMonitor,
  checkAndNotify,
  fetchLiveMatches,
};
