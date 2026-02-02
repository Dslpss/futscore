const express = require("express");
const router = express.Router();
const { getMatchesPredictions } = require("../services/aiPrediction");

// Cache simples para partidas próximas
let matchesCache = {
  data: [],
  timestamp: 0,
};
const MATCHES_CACHE_TTL = 10 * 60 * 1000; // 10 minutos

// Cache de previsões diárias - gerado uma vez por dia para economizar tokens
let predictionsCache = {
  data: [],
  date: "", // formato YYYY-MM-DD
  generatedAt: null,
  isGenerating: false, // flag para evitar requisições duplicadas
};

/**
 * Retorna a data atual no formato YYYY-MM-DD
 */
function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Busca partidas próximas (próximas 24h) do match monitor
 */
async function getUpcomingMatches() {
  try {
    // Usar diretamente o fetchMSNUpcomingMatches que já tem a lógica correta
    console.log(
      "[AIPredictions] Buscando partidas via fetchMSNUpcomingMatches...",
    );
    return await fetchMSNUpcomingMatches();
  } catch (error) {
    console.error("[AIPredictions] Erro ao buscar partidas:", error.message);
    return [];
  }
}

/**
 * Busca partidas diretamente da MSN API usando o mesmo endpoint da HomeScreen
 */
async function fetchMSNUpcomingMatches() {
  const axios = require("axios");
  const MSN_API_BASE = "https://api.msn.com/sports";
  const MSN_API_KEY = "kO1dI4ptCTTylLkPL1ZTHYP8JhLKb8mRDoA5yotmNJ";

  // Usar as mesmas ligas do HomeScreen para consistência
  const leagues = [
    { id: "Soccer_BrazilBrasileiroSerieA", name: "Brasileirão" },
    { id: "Soccer_BrazilCopaDoBrasil", name: "Copa do Brasil" },
    {
      id: "Soccer_InternationalClubsUEFAChampionsLeague",
      name: "Champions League",
    },
    { id: "Soccer_UEFAEuropaLeague", name: "Europa League" },
    { id: "Soccer_EnglandPremierLeague", name: "Premier League" },
    { id: "Soccer_GermanyBundesliga", name: "Bundesliga" },
    { id: "Soccer_ItalySerieA", name: "Serie A" },
    { id: "Soccer_FranceLigue1", name: "Ligue 1" },
    { id: "Soccer_SpainLaLiga", name: "La Liga" },
    { id: "Soccer_PortugalPrimeiraLiga", name: "Liga Portugal" },
    { id: "Soccer_BrazilCarioca", name: "Campeonato Carioca" },
    { id: "Soccer_BrazilMineiro", name: "Campeonato Mineiro" },
    { id: "Soccer_BrazilPaulistaSerieA1", name: "Campeonato Paulista" },
    { id: "Soccer_BrazilGaucho", name: "Campeonato Gaúcho" },
  ];

  const matches = [];
  const now = new Date();

  // Gerar data no formato YYYY-MM-DD (mesma lógica do HomeScreen)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  console.log(`[AIPredictions] Buscando partidas para ${dateStr}...`);

  // Buscar todas as ligas em paralelo para maior velocidade
  const leaguePromises = leagues.map(async (league) => {
    try {
      console.log(`[AIPredictions] Buscando partidas de ${league.name}...`);

      // Usar o mesmo endpoint /liveschedules que a HomeScreen
      const tzoffset = Math.floor(-now.getTimezoneOffset() / 60).toString();
      const params = new URLSearchParams({
        version: "1.0",
        cm: "pt-br",
        scn: "ANON",
        it: "web",
        apikey: MSN_API_KEY,
        activityId: `ai-pred-${Date.now()}-${league.id}`,
        ids: league.id,
        date: dateStr,
        withcalendar: "true",
        type: "LeagueSchedule",
        tzoffset: tzoffset,
        ocid: "sports-league-schedule",
      });

      const response = await axios.get(
        `${MSN_API_BASE}/liveschedules?${params}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "*/*",
          },
          timeout: 15000,
        },
      );

      const data = response.data?.value?.[0];
      if (!data) {
        console.log(`[AIPredictions] Sem dados para ${league.name}`);
        return [];
      }

      const leagueMatches = [];

      // Extrair jogos do formato de resposta (mesmo padrão do msnSportsApi)
      const allGames = [];

      // 1. Verificar array de games no topo
      if (data.games && Array.isArray(data.games)) {
        allGames.push(...data.games);
      }

      // 2. Verificar games dentro de schedules
      if (data.schedules && Array.isArray(data.schedules)) {
        data.schedules.forEach((schedule) => {
          if (schedule.games && Array.isArray(schedule.games)) {
            allGames.push(...schedule.games);
          }
        });
      }

      console.log(
        `[AIPredictions] ${league.name}: ${allGames.length} jogos encontrados`,
      );

      for (const game of allGames) {
        const startDateTime = game.startDateTime;
        // Handle numeric strings, numbers, and ISO strings
        let matchTime;
        if (typeof startDateTime === "number") {
          matchTime = startDateTime;
        } else if (
          typeof startDateTime === "string" &&
          /^\d+$/.test(startDateTime)
        ) {
          matchTime = parseInt(startDateTime, 10);
        } else {
          matchTime = new Date(startDateTime).getTime();
        }

        // Filtrar por data (mesmo que o HomeScreen faz)
        const gameDate = new Date(matchTime);
        const gameDateStr = `${gameDate.getFullYear()}-${String(gameDate.getMonth() + 1).padStart(2, "0")}-${String(gameDate.getDate()).padStart(2, "0")}`;

        if (gameDateStr !== dateStr) {
          continue; // Pular jogos de outras datas
        }

        const gameStatus = (game.gameState?.gameStatus || "").toLowerCase();

        // Pegar apenas partidas que ainda não terminaram
        const isFinished =
          gameStatus === "final" ||
          gameStatus === "post" ||
          gameStatus === "ft";

        if (!isFinished) {
          const homeTeam = game.participants?.[0];
          const awayTeam = game.participants?.[1];

          if (homeTeam && awayTeam) {
            leagueMatches.push({
              id:
                game.id ||
                game.liveId ||
                `${Date.now()}-${leagueMatches.length}`,
              homeTeam:
                homeTeam?.team?.shortName?.rawName ||
                homeTeam?.team?.name?.rawName ||
                "Time Casa",
              awayTeam:
                awayTeam?.team?.shortName?.rawName ||
                awayTeam?.team?.name?.rawName ||
                "Time Fora",
              homeTeamLogo: homeTeam?.team?.image?.id
                ? `https://www.bing.com/th?id=${homeTeam.team.image.id}&w=80&h=80`
                : "",
              awayTeamLogo: awayTeam?.team?.image?.id
                ? `https://www.bing.com/th?id=${awayTeam.team.image.id}&w=80&h=80`
                : "",
              startTime:
                typeof startDateTime === "number"
                  ? new Date(startDateTime).toISOString()
                  : startDateTime,
              league: { name: league.name, logo: "" },
              status: gameStatus || "pregame",
            });
          }
        }
      }

      console.log(
        `[AIPredictions] ${league.name}: ${leagueMatches.length} partidas válidas`,
      );
      return leagueMatches;
    } catch (error) {
      console.error(
        `[AIPredictions] Erro ao buscar ${league.name}:`,
        error.message,
      );
      return [];
    }
  });

  // Aguardar todas as requisições em paralelo
  const leagueResults = await Promise.all(leaguePromises);

  // Combinar todos os resultados
  leagueResults.forEach((leagueMatches) => {
    matches.push(...leagueMatches);
  });

  console.log(
    `[AIPredictions] Total de partidas encontradas: ${matches.length}`,
  );

  // Ordenar por horário
  matches.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  return matches;
}

/**
 * GET /api/ai-predictions/upcoming
 * Retorna previsões de IA para partidas próximas
 * Cache diário: gera previsões uma vez por dia para economizar tokens
 */
router.get("/upcoming", async (req, res) => {
  try {
    console.log("[AIPredictions] Requisição de previsões recebida");

    // Verificar API key
    if (!process.env.NVIDIA_API_KEY) {
      console.warn("[AIPredictions] NVIDIA_API_KEY não configurada");
      return res.json({
        success: false,
        message: "API de IA não configurada",
        predictions: [],
      });
    }

    const today = getTodayDateString();
    const forceRefresh = req.query.refresh === "true" && req.query.adminKey === process.env.ADMIN_KEY;

    // Verificar se já temos previsões para hoje no cache
    if (!forceRefresh && predictionsCache.date === today && predictionsCache.data.length > 0) {
      console.log(`[AIPredictions] Retornando ${predictionsCache.data.length} previsões do cache diário`);
      return res.json({
        success: true,
        predictions: predictionsCache.data,
        generatedAt: predictionsCache.generatedAt,
        cached: true,
        cacheDate: today,
      });
    }

    // Se já está gerando, retornar cache atual (mesmo que vazio) para evitar duplicação
    if (predictionsCache.isGenerating) {
      console.log("[AIPredictions] Geração em andamento, retornando cache atual");
      return res.json({
        success: true,
        predictions: predictionsCache.data,
        generatedAt: predictionsCache.generatedAt,
        generating: true,
        message: "Previsões estão sendo geradas, tente novamente em alguns minutos",
      });
    }

    // Marcar que está gerando para evitar requisições duplicadas
    predictionsCache.isGenerating = true;
    console.log(`[AIPredictions] Gerando novas previsões para ${today}...`);

    try {
      // Buscar partidas do dia
      let matches = [];
      const now = Date.now();

      if (
        matchesCache.data.length > 0 &&
        now - matchesCache.timestamp < MATCHES_CACHE_TTL
      ) {
        matches = matchesCache.data;
        console.log("[AIPredictions] Usando cache de partidas:", matches.length);
      } else {
        console.log("[AIPredictions] Buscando partidas frescas...");
        matches = await getUpcomingMatches();

        if (matches.length > 0) {
          matchesCache = { data: matches, timestamp: now };
        }
        console.log(`[AIPredictions] ${matches.length} partidas encontradas`);
      }

      if (matches.length === 0) {
        console.log("[AIPredictions] Tentando fallback...");
        matches = await fetchMSNUpcomingMatches();
        console.log(`[AIPredictions] Fallback retornou ${matches.length} partidas`);
      }

      if (matches.length === 0) {
        predictionsCache.isGenerating = false;
        return res.json({
          success: true,
          message: "Nenhuma partida encontrada para hoje",
          predictions: [],
        });
      }

      // Gerar previsões da IA (UMA VEZ POR DIA)
      console.log(`[AIPredictions] Gerando previsões para ${matches.length} partidas...`);
      const predictions = await getMatchesPredictions(matches, matches.length);

      // Salvar no cache diário
      predictionsCache = {
        data: predictions,
        date: today,
        generatedAt: new Date().toISOString(),
        isGenerating: false,
      };

      console.log(`[AIPredictions] ${predictions.length} previsões geradas e cacheadas para ${today}`);

      res.json({
        success: true,
        predictions,
        generatedAt: predictionsCache.generatedAt,
        cached: false,
        cacheDate: today,
      });
    } catch (genError) {
      predictionsCache.isGenerating = false;
      throw genError;
    }
  } catch (error) {
    console.error("[AIPredictions] Erro:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      predictions: [],
    });
  }
});

/**
 * GET /api/ai-predictions/debug
 * Endpoint de debug para verificar busca de partidas
 */
router.get("/debug", async (req, res) => {
  try {
    console.log("[AIPredictions] Debug: iniciando busca de partidas...");

    // Limpar cache
    matchesCache = { data: [], timestamp: 0 };

    // Buscar partidas diretamente
    const matches = await fetchMSNUpcomingMatches();

    res.json({
      success: true,
      matchesCount: matches.length,
      matches: matches.slice(0, 5).map((m) => ({
        id: m.id,
        home: m.homeTeam,
        away: m.awayTeam,
        time: m.startTime,
        status: m.status,
        league: m.league.name,
      })),
      apiKeyConfigured: !!process.env.NVIDIA_API_KEY,
      cacheCleared: true,
    });
  } catch (error) {
    console.error("[AIPredictions] Debug erro:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-predictions/test-msn
 * Testa a API MSN diretamente
 */
router.get("/test-msn", async (req, res) => {
  try {
    const axios = require("axios");
    const now = new Date();

    const params = new URLSearchParams({
      version: "1.0",
      cm: "pt-br",
      scn: "ANON",
      it: "web",
      apikey: "kO1dI4ptCTTylLkPL1ZTHYP8JhLKb8mRDoA5yotmNJ",
      id: "Soccer_EnglandPremierLeague",
      sport: "Soccer",
      datetime: now.toISOString().split(".")[0],
      tzoffset: "-3",
    });

    const response = await axios.get(
      `https://api.msn.com/sports/livearoundtheleague?${params}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
        timeout: 10000,
      },
    );

    const schedules = response.data?.value?.[0]?.schedules || [];
    const games = schedules[0]?.games || [];

    const processedGames = games.slice(0, 3).map((g) => {
      const startDateTime = g.startDateTime;
      const matchTime =
        typeof startDateTime === "number"
          ? startDateTime
          : new Date(startDateTime).getTime();
      const gameStatus = (g.gameState?.gameStatus || "").toLowerCase();
      const nowMs = Date.now();
      const isInRange =
        matchTime >= nowMs && matchTime <= nowMs + 7 * 24 * 60 * 60 * 1000;
      const isFinished =
        gameStatus === "final" || gameStatus === "post" || gameStatus === "ft";

      return {
        home: g.participants?.[0]?.team?.shortName?.rawName,
        away: g.participants?.[1]?.team?.shortName?.rawName,
        rawTime: startDateTime,
        matchTimeMs: matchTime,
        nowMs: nowMs,
        status: gameStatus,
        isInRange,
        isFinished,
        shouldInclude: !isFinished && isInRange,
      };
    });

    res.json({
      success: true,
      schedulesCount: schedules.length,
      gamesInFirstSchedule: games.length,
      sampleGames: processedGames,
      serverTime: now.toISOString(),
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-predictions/match/:id
 * Retorna previsão para uma partida específica
 */
router.get("/match/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!process.env.NVIDIA_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "API de IA não configurada",
      });
    }

    // Buscar dados da partida
    const { getMatchPrediction } = require("../services/aiPrediction");

    // TODO: Implementar busca de dados específicos da partida
    // Por enquanto retorna erro
    res.status(501).json({
      success: false,
      error: "Endpoint em desenvolvimento",
    });
  } catch (error) {
    console.error("[AIPredictions] Erro:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
