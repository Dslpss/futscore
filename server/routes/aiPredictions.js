const express = require("express");
const router = express.Router();
const { getMatchesPredictions } = require("../services/aiPrediction");

// Cache simples para partidas próximas
let matchesCache = {
  data: [],
  timestamp: 0,
};
const MATCHES_CACHE_TTL = 10 * 60 * 1000; // 10 minutos

/**
 * Busca partidas próximas (próximas 24h) do match monitor
 */
async function getUpcomingMatches() {
  try {
    // Usar diretamente o fetchMSNUpcomingMatches que já tem a lógica correta
    console.log("[AIPredictions] Buscando partidas via fetchMSNUpcomingMatches...");
    return await fetchMSNUpcomingMatches();
  } catch (error) {
    console.error("[AIPredictions] Erro ao buscar partidas:", error.message);
    return [];
  }
}

/**
 * Busca partidas diretamente da MSN API (fallback)
 */
async function fetchMSNUpcomingMatches() {
  const axios = require("axios");
  const MSN_API_BASE = "https://api.msn.com/sports";
  const MSN_API_KEY = "kO1dI4ptCTTylLkPL1ZTHYP8JhLKb8mRDoA5yotmNJ";

  const leagues = [
    { id: "Soccer_EnglandPremierLeague", name: "Premier League" },
    { id: "Soccer_SpainLaLiga", name: "La Liga" },
    { id: "Soccer_ItalySerieA", name: "Serie A" },
    { id: "Soccer_GermanyBundesliga", name: "Bundesliga" },
    { id: "Soccer_InternationalClubsUEFAChampionsLeague", name: "Champions League" },
    { id: "Soccer_BrazilBrasileiroSerieA", name: "Brasileirão" },
    { id: "Soccer_BrazilPaulistaSerieA1", name: "Campeonato Paulista" },
  ];

  const matches = [];
  const now = new Date();

  for (const league of leagues) {
    try {
      console.log(`[AIPredictions] Buscando partidas de ${league.name}...`);
      
      const params = new URLSearchParams({
        version: "1.0",
        cm: "pt-br",
        scn: "ANON",
        it: "web",
        apikey: MSN_API_KEY,
        activityId: `ai-pred-${Date.now()}`,
        id: league.id,
        sport: "Soccer",
        datetime: now.toISOString().split(".")[0],
        tzoffset: "-3",
      });

      const response = await axios.get(
        `${MSN_API_BASE}/livearoundtheleague?${params}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
          },
          timeout: 10000,
        }
      );

      const schedules = response.data?.value?.[0]?.schedules || [];
      console.log(`[AIPredictions] ${league.name}: ${schedules.length} schedules`);
      
      for (const schedule of schedules) {
        const games = schedule.games || [];
        
        for (const game of games) {
          const startDateTime = game.startDateTime;
          // Handle both milliseconds timestamp and ISO string
          const matchTime = typeof startDateTime === 'number' ? startDateTime : new Date(startDateTime).getTime();
          const gameStatus = (game.gameState?.gameStatus || "").toLowerCase();
          
          // Pegar apenas partidas que ainda não terminaram
          const isFinished = gameStatus === "final" || gameStatus === "post" || gameStatus === "ft";
          
          // Verificar se é partida dentro dos próximos 7 dias
          const now = Date.now();
          const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
          const isInRange = matchTime >= now && matchTime <= sevenDaysFromNow;
          
          // Log debug para primeira partida
          if (games.indexOf(game) === 0) {
            console.log(`[AIPredictions] Sample: ${game.participants?.[0]?.team?.shortName?.rawName} status=${gameStatus} time=${matchTime} now=${now} inRange=${isInRange}`);
          }
          
          if (!isFinished && isInRange) {
            const homeTeam = game.participants?.[0];
            const awayTeam = game.participants?.[1];
            
            if (homeTeam && awayTeam) {
              matches.push({
                id: game.id || game.liveId || `${Date.now()}-${matches.length}`,
                homeTeam: homeTeam?.team?.shortName?.rawName || homeTeam?.team?.name?.rawName || "Time Casa",
                awayTeam: awayTeam?.team?.shortName?.rawName || awayTeam?.team?.name?.rawName || "Time Fora",
                homeTeamLogo: homeTeam?.team?.image?.id ? 
                  `https://img-s-msn-com.akamaized.net/tenant/amp/entityid/${homeTeam.team.image.id}` : "",
                awayTeamLogo: awayTeam?.team?.image?.id ?
                  `https://img-s-msn-com.akamaized.net/tenant/amp/entityid/${awayTeam.team.image.id}` : "",
                startTime: typeof startDateTime === 'number' ? new Date(startDateTime).toISOString() : startDateTime,
                league: { name: league.name, logo: "" },
                status: gameStatus || "pregame",
              });
              
              console.log(`[AIPredictions] + ${homeTeam?.team?.shortName?.rawName} vs ${awayTeam?.team?.shortName?.rawName} (${gameStatus || 'pregame'})`);
            }
          }
        }
      }
      
      // Parar após encontrar 10 partidas
      if (matches.length >= 10) break;
      
    } catch (error) {
      console.error(`[AIPredictions] Erro ao buscar ${league.name}:`, error.message);
    }
  }

  console.log(`[AIPredictions] Total de partidas encontradas: ${matches.length}`);

  // Ordenar por horário
  matches.sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return matches.slice(0, 10);
}

/**
 * GET /api/ai-predictions/upcoming
 * Retorna previsões de IA para partidas próximas
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

    // Force refresh se cache estiver vazio ou parâmetro refresh=true
    const forceRefresh = req.query.refresh === "true";
    
    // Buscar partidas próximas (com cache)
    let matches = [];
    const now = Date.now();

    if (!forceRefresh && matchesCache.data.length > 0 && now - matchesCache.timestamp < MATCHES_CACHE_TTL) {
      matches = matchesCache.data;
      console.log("[AIPredictions] Usando cache de partidas:", matches.length);
    } else {
      console.log("[AIPredictions] Buscando partidas frescas...");
      matches = await getUpcomingMatches();
      
      // Só guardar no cache se encontrar partidas
      if (matches.length > 0) {
        matchesCache = { data: matches, timestamp: now };
      }
      console.log(`[AIPredictions] ${matches.length} partidas encontradas`);
    }

    if (matches.length === 0) {
      // Tentar fallback direto
      console.log("[AIPredictions] Sem partidas, tentando fetchMSNUpcomingMatches diretamente...");
      matches = await fetchMSNUpcomingMatches();
      console.log(`[AIPredictions] Fallback retornou ${matches.length} partidas`);
    }

    if (matches.length === 0) {
      return res.json({
        success: true,
        message: "Nenhuma partida próxima encontrada",
        predictions: [],
      });
    }

    // Obter previsões da IA (máximo 5 partidas)
    const predictions = await getMatchesPredictions(matches, 5);

    console.log(`[AIPredictions] ${predictions.length} previsões geradas`);

    res.json({
      success: true,
      predictions,
      generatedAt: new Date().toISOString(),
    });
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
      matches: matches.slice(0, 5).map(m => ({
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
