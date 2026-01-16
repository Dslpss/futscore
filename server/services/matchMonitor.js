const {
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
} = require("./pushNotifications");
const { processPredictions } = require("./predictionService");

// Cache de scores e status para detectar mudanças
let lastKnownScores = {};
let lastKnownStatus = {};
let notifiedMatchStarts = new Set();
let notifiedHalfTime = new Set();
let notifiedSecondHalf = new Set();
let notifiedMatchEnds = new Set();
// Cache para eventos já notificados (por matchId -> Set de eventIds)
let notifiedEvents = {};
// Cache para gols notificados (matchId -> {home: x, away: y}) - evita duplicatas
let notifiedGoals = {};
// Cache para rastrear quando cada jogo foi visto pela primeira vez
let firstSeenTime = {};

// Configuração - intervalos mais espaçados para evitar detecção
const CHECK_INTERVAL_LIVE = 20 * 1000; // 20 segundos quando há jogos ao vivo (quase real-time)
const CHECK_INTERVAL_IDLE = 2 * 60 * 1000; // 2 minutos quando não há jogos
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

// ESPN API config
const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/personalized/v2/scoreboard/header";

// Gerar activity ID único
function generateActivityId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Busca jogos da Copa Intercontinental na ESPN
 */
async function fetchEspnLiveMatches() {
  const espnMatches = [];
  try {
    const params = new URLSearchParams({
      sport: 'soccer',
      league: 'fifa.intercontinental_cup',
      lang: 'pt',
      region: 'br',
      contentorigin: 'deportes',
      tz: 'America/Sao_Paulo'
    });

    const response = await fetch(`${ESPN_SCOREBOARD_URL}?${params}`, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.log(`[Monitor] ESPN: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Navegar pela estrutura complexa da ESPN: sports -> leagues -> events
    const sports = data.sports || [];
    for (const sport of sports) {
      const leagues = sport.leagues || [];
      for (const league of leagues) {
        const events = league.events || [];
        
        for (const event of events) {
          // Mapear status da ESPN para nosso padrão
          // ESPN: 'pre', 'in', 'post'
          let status = 'scheduled';
          if (event.status === 'in') status = 'inprogress';
          if (event.status === 'post') status = 'final';

          const isLive = event.status === 'in';
          const isFinished = event.status === 'post';
          const isScheduled = event.status === 'pre';

          // Checar se deve incluir
          if (isLive || isScheduled || isFinished) {
            
            // Extrair competidores
            const homeCompetitor = event.competitors?.find(c => c.homeAway === 'home');
            const awayCompetitor = event.competitors?.find(c => c.homeAway === 'away');

            const homeName = homeCompetitor?.displayName || homeCompetitor?.name || "Time Casa";
            const awayName = awayCompetitor?.displayName || awayCompetitor?.name || "Time Fora";
            
            // Tentar pegar placar
            const homeScore = parseInt(homeCompetitor?.score) || 0;
            const awayScore = parseInt(awayCompetitor?.score) || 0;

            // Detectar intervalo e outros status detalhados
            const fullStatus = event.fullStatus || {};
            const isHalfTime = fullStatus.type?.name === 'STATUS_HALFTIME';
            const detailedStatus = fullStatus.type?.description || event.summary || '';

            espnMatches.push({
              id: event.id, // ID da ESPN
              status: status,
              rawStatus: event.status,
              homeTeam: homeName,
              awayTeam: awayName,
              homeTeamId: homeCompetitor?.id,
              awayTeamId: awayCompetitor?.id,
              homeScore: homeScore,
              awayScore: awayScore,
              league: league.name || "Intercontinental Cup",
              leagueId: league.id || league.slug || "FIC", // ID da liga para notificações
              startTime: event.date,
              isLive: isLive,
              detailedStatus: detailedStatus,
              isHalfTime: isHalfTime,
              isFinished: isFinished,
              source: 'ESPN' // Marcador para saber a origem
            });
          }
        }
      }
    }
    
    if (espnMatches.length > 0) {
      console.log(`[Monitor] ESPN: ${espnMatches.length} jogos da ${espnMatches[0].league}`);
    }

  } catch (error) {
    console.error(`[Monitor] Erro ao buscar ESPN:`, error.message);
  }
  return espnMatches;
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
      id: "Soccer_BrazilCopaDoBrasil",
      name: "Copa do Brasil",
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
    {
      id: "Soccer_UEFAEuropaLeague",
      name: "Europa League",
      sport: "Soccer",
    },
    // Campeonatos Estaduais Brasileiros
    {
      id: "Soccer_BrazilCarioca",
      name: "Campeonato Carioca",
      sport: "Soccer",
    },
    {
      id: "Soccer_BrazilMineiro",
      name: "Campeonato Mineiro",
      sport: "Soccer",
    },
    {
      id: "Soccer_BrazilPaulistaSerieA1",
      name: "Campeonato Paulista",
      sport: "Soccer",
    },
    {
      id: "Soccer_BrazilGaucho",
      name: "Campeonato Gaúcho",
      sport: "Soccer",
    },
  ];

  let allMatches = [];

  // 1. Buscar jogos da MSN
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
        // Silenciar erro se for vazio, comum em ligas sem jogos
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
          const isFinished = gameStatus === "final" || gameStatus === "post";

          // Participantes: [0] = time da casa, [1] = time visitante
          const homeParticipant = game.participants?.[0];
          const awayParticipant = game.participants?.[1];

          // Incluir jogos ao vivo, agendados E finalizados recentemente
          if (isLive || isScheduled || isFinished) {
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
              leagueId: league.id, // ID da liga para notificações de favoritos
              startTime: game.startDateTime,
              isLive: isLive,
              detailedStatus:
                game.gameState?.detailedGameStatus?.toLowerCase() || "",
              isHalfTime:
                gameStatus === "inprogressbreak" ||
                game.gameState?.detailedGameStatus
                  ?.toLowerCase()
                  ?.includes("halftime"),
              isFinished:
                gameStatus === "final" ||
                gameStatus === "post" ||
                game.gameState?.detailedGameStatus
                  ?.toLowerCase()
                  ?.includes("final"),
              source: 'MSN'
            });
          }
        }
      }

      console.log(`[Monitor] ${league.name}: ${allMatches.filter(m => m.league === league.name).length} jogos`);
    } catch (error) {
      console.error(`[Monitor] Erro ao buscar ${league.name}:`, error.message);
    }
  }

  // 2. Buscar jogos da ESPN (Intercontinental) e mesclar
  const espnMatches = await fetchEspnLiveMatches();
  allMatches = [...allMatches, ...espnMatches];

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
      // 404 é esperado para jogos que já terminaram - não precisa logar como erro
      if (response.status !== 404) {
        console.log(`[Monitor] Timeline ${matchId}: HTTP ${response.status}`);
      }
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
    lastCheckTime = new Date();
    checkCount++;

    console.log(`[Monitor] Verificando jogos... (check #${checkCount})`);
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
        // IMPORTANTE: Verificar se o jogo já está em andamento há muito tempo
        // Se o jogo já está no segundo tempo, ou se já tem gols, não notificar início
        // Isso evita notificações falsas quando o servidor reinicia ou o cache é limpo
        const hasScore = match.homeScore > 0 || match.awayScore > 0;
        const matchStartTime = match.startTime
          ? new Date(match.startTime)
          : null;
        const minutesSinceStart = matchStartTime
          ? Math.floor((Date.now() - matchStartTime.getTime()) / 60000)
          : 0;

        // Verificar também se já está no intervalo ou segundo tempo
        const isInHalfTimeOrSecondHalf =
          match.isHalfTime ||
          match.detailedStatus?.includes("halftime") ||
          match.detailedStatus?.includes("secondhalf") ||
          minutesSinceStart > 45;

        // Só notifica se:
        // 1. O jogo começou há menos de 3 minutos E não tem placar ainda
        // 2. OU se estávamos monitorando antes (previousStatus existe)
        const isReallyJustStarted =
          minutesSinceStart <= 3 && !hasScore && !isInHalfTimeOrSecondHalf;
        const wasMonitoringBefore =
          previousStatus !== undefined &&
          (previousStatus === "pre" || previousStatus === "scheduled");

        const shouldNotifyStart = wasMonitoringBefore || isReallyJustStarted;

        if (shouldNotifyStart) {
          console.log(
            `[Monitor] 🟢 Jogo começou: ${match.homeTeam} vs ${match.awayTeam} (${minutesSinceStart}min)`
          );
          await notifyMatchStarted(match);
        } else {
          console.log(
            `[Monitor] ⏭️ Jogo já em andamento (${minutesSinceStart}min, placar: ${match.homeScore}x${match.awayScore}), pulando notificação de início: ${match.homeTeam} vs ${match.awayTeam}`
          );
        }
        notifiedMatchStarts.add(matchId);
      }

      // Atualizar status conhecido
      lastKnownStatus[matchId] = match.status;

      // Rastrear quando vimos este jogo pela primeira vez
      if (!firstSeenTime[matchId]) {
        firstSeenTime[matchId] = Date.now();
      }

      // 2. Verificar se houve GOL (apenas para jogos ao vivo)
      if (isNowLive) {
        const previous = lastKnownScores[matchId];

        // Inicializar cache de gols notificados para este jogo
        if (!notifiedGoals[matchId]) {
          notifiedGoals[matchId] = { home: 0, away: 0 };
        }

        if (previous) {
          const homeScored = match.homeScore > previous.home;
          const awayScored = match.awayScore > previous.away;

          // Verificar se já notificamos esse placar específico (evita duplicatas)
          const homeAlreadyNotified =
            match.homeScore <= notifiedGoals[matchId].home;
          const awayAlreadyNotified =
            match.awayScore <= notifiedGoals[matchId].away;

          if (homeScored && !homeAlreadyNotified) {
            console.log(
              `[Monitor] ⚽ GOL ${match.homeTeam}! ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`
            );
            await notifyGoal(match, match.homeTeam);
            notifiedGoals[matchId].home = match.homeScore;
          }

          if (awayScored && !awayAlreadyNotified) {
            console.log(
              `[Monitor] ⚽ GOL ${match.awayTeam}! ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`
            );
            await notifyGoal(match, match.awayTeam);
            notifiedGoals[matchId].away = match.awayScore;
          }
        } else {
          // Primeira vez vendo este jogo ao vivo - NÃO notificar gols existentes
          // Apenas registrar o placar atual como já notificado
          console.log(
            `[Monitor] 📋 Primeira vez vendo ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam} - registrando placar atual`
          );
          notifiedGoals[matchId] = {
            home: match.homeScore,
            away: match.awayScore,
          };
        }

        // Atualizar score conhecido
        lastKnownScores[matchId] = {
          home: match.homeScore,
          away: match.awayScore,
        };

        // 3. Verificar INTERVALO
        if (match.isHalfTime && !notifiedHalfTime.has(matchId)) {
          // Verificar se estamos realmente detectando o intervalo pela primeira vez
          // e não é só porque o servidor reiniciou durante o intervalo
          const matchStartTime = match.startTime
            ? new Date(match.startTime)
            : null;
          const minutesSinceStart = matchStartTime
            ? Math.floor((Date.now() - matchStartTime.getTime()) / 60000)
            : 45;

          // O intervalo normalmente ocorre entre 45-60 minutos após o início
          // Se já passou muito tempo (> 60min), provavelmente já estamos no segundo tempo
          // e isso é só um glitch de dados
          if (minutesSinceStart >= 40 && minutesSinceStart <= 65) {
            console.log(
              `[Monitor] ⏸️ Intervalo: ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`
            );
            await notifyHalfTime(match);
          } else {
            console.log(
              `[Monitor] ⏭️ Intervalo detectado mas fora do tempo esperado (${minutesSinceStart}min), pulando: ${match.homeTeam} vs ${match.awayTeam}`
            );
          }
          notifiedHalfTime.add(matchId);
        }

        // 3.5. Verificar INÍCIO DO 2º TEMPO (saiu do intervalo)
        // Se já notificamos o intervalo E agora o jogo voltou (não está mais no halfTime)
        // E ainda não notificamos o 2º tempo
        if (
          notifiedHalfTime.has(matchId) &&
          !match.isHalfTime &&
          !notifiedSecondHalf.has(matchId)
        ) {
          // Verificar se faz sentido notificar o segundo tempo
          const matchStartTime = match.startTime
            ? new Date(match.startTime)
            : null;
          const minutesSinceStart = matchStartTime
            ? Math.floor((Date.now() - matchStartTime.getTime()) / 60000)
            : 50;

          // Só notifica se estiver entre 45-70 minutos (tempo normal para início do 2º tempo)
          if (minutesSinceStart >= 45 && minutesSinceStart <= 75) {
            console.log(
              `[Monitor] 🔄 2º Tempo começou: ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`
            );
            await notifySecondHalfStarted(match);
          } else {
            console.log(
              `[Monitor] ⏭️ 2º tempo detectado mas fora do tempo esperado (${minutesSinceStart}min), pulando: ${match.homeTeam} vs ${match.awayTeam}`
            );
          }
          notifiedSecondHalf.add(matchId);
        }

        // 4. Buscar e processar eventos da timeline (apenas para MSN por enquanto)
        if (match.source !== 'ESPN') {
          const timelineEvents = await fetchMatchTimeline(matchId);
          if (timelineEvents) {
            await processTimelineEvents(match, timelineEvents);
          }
        }
      }

      // 5. Verificar FIM DE JOGO (fora do if isLive para pegar jogos que acabaram de terminar)
      if (match.isFinished && !notifiedMatchEnds.has(matchId)) {
        // Só notifica se o jogo estava sendo monitorado (já tinha começado)
        // E se o jogo não terminou há muito tempo (evita notificações de jogos antigos)
        const matchStartTime = match.startTime
          ? new Date(match.startTime)
          : null;
        const minutesSinceStart = matchStartTime
          ? Math.floor((Date.now() - matchStartTime.getTime()) / 60000)
          : 120;

        // Um jogo dura em média 90-120 minutos com acréscimos
        // Só notifica se terminou há pouco tempo (< 150 minutos desde o início)
        const recentlyFinished = minutesSinceStart <= 150;

        if (notifiedMatchStarts.has(matchId)) {
          console.log(
            `[Monitor] 🏁 Fim de jogo: ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}`
          );
          await notifyMatchEnded(match);
          
          // Processar palpites para este jogo finalizado
          try {
            const completedMatch = {
              id: matchId,
              homeScore: match.homeScore,
              awayScore: match.awayScore,
            };
            const result = await processPredictions([completedMatch]);
            if (result.processed > 0) {
              console.log(
                `[Monitor] 🎯 Palpites processados: ${result.processed} palpites, ${result.pointsAwarded} pontos`
              );
            }
          } catch (predError) {
            console.error("[Monitor] Erro ao processar palpites:", predError.message);
          }
        } else if (recentlyFinished) {
          console.log(
            `[Monitor] ⏭️ Fim de jogo detectado mas não estava monitorando: ${match.homeTeam} vs ${match.awayTeam} (${minutesSinceStart}min desde início)`
          );
        }
        notifiedMatchEnds.add(matchId);
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
 * Limpa cache de jogos antigos - mais inteligente para não perder dados de jogos em andamento
 */
let lastCleanup = Date.now();
function cleanOldCache() {
  const now = Date.now();
  const THREE_HOURS = 3 * 60 * 60 * 1000; // 3 horas em ms

  // Limpar cache a cada 3 horas (ao invés de 1 hora) para maior segurança
  if (now - lastCleanup > THREE_HOURS) {
    console.log("[Monitor] 🧹 Limpando cache antigo (jogos > 3h)...");

    // Limpar apenas jogos que terminaram há mais de 3 horas
    // Manter dados de jogos recentes para evitar notificações duplicadas
    const matchesToClean = [];

    for (const matchId in firstSeenTime) {
      const seenAt = firstSeenTime[matchId];
      const hoursSinceSeen = (now - seenAt) / (60 * 60 * 1000);

      // Só limpa se o jogo foi visto há mais de 4 horas
      if (hoursSinceSeen > 4) {
        matchesToClean.push(matchId);
      }
    }

    for (const matchId of matchesToClean) {
      delete lastKnownScores[matchId];
      delete lastKnownStatus[matchId];
      delete notifiedEvents[matchId];
      delete notifiedGoals[matchId];
      delete firstSeenTime[matchId];
      notifiedMatchStarts.delete(matchId);
      notifiedHalfTime.delete(matchId);
      notifiedSecondHalf.delete(matchId);
      notifiedMatchEnds.delete(matchId);
    }

    console.log(
      `[Monitor] 🧹 ${matchesToClean.length} jogos antigos removidos do cache`
    );
    lastCleanup = now;
  }
}

/**
 * Inicia o monitoramento em loop
 */
let monitorStartTime = null;
let lastCheckTime = null;
let checkCount = 0;

function startMatchMonitor() {
  console.log("[Monitor] 🚀 Iniciando monitoramento de partidas...");
  console.log(
    `[Monitor] Intervalo inicial: ${currentInterval / 1000}s (modo economia)`
  );
  console.log("[Monitor] Intervalo com jogos ao vivo: 60s | Sem jogos: 5min");

  monitorStartTime = new Date();

  // Primeira verificação com delay inicial aleatório
  setTimeout(() => {
    checkAndNotify();

    // Loop contínuo
    intervalId = setInterval(checkAndNotify, currentInterval);
  }, Math.random() * 5000 + 2000); // Delay inicial de 2-7 segundos
}

// Função para obter status do monitor
function getMonitorStatus() {
  return {
    isRunning: intervalId !== null,
    startedAt: monitorStartTime,
    lastCheck: lastCheckTime,
    checkCount: checkCount,
    currentInterval: currentInterval / 1000 + "s",
    notifiedMatches: notifiedMatchStarts.size,
    notifiedHalfTimes: notifiedHalfTime.size,
    notifiedSecondHalfs: notifiedSecondHalf.size,
    notifiedEnds: notifiedMatchEnds.size,
    trackedMatches: Object.keys(firstSeenTime).length,
    goalsTracked: Object.keys(notifiedGoals).length,
  };
}

module.exports = {
  startMatchMonitor,
  checkAndNotify,
  fetchLiveMatches,
  getMonitorStatus,
};
