const axios = require("axios");

// Perplexity API Configuration
const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
const API_KEY = process.env.PERPLEXITY_API_KEY;

// Cache para previsões (evita requisições excessivas)
const predictionCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

/**
 * Limpa entradas expiradas do cache
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of predictionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      predictionCache.delete(key);
    }
  }
}

// Limpar cache periodicamente
setInterval(cleanExpiredCache, 5 * 60 * 1000);

/**
 * Gera prompt para análise da partida
 */
function generateMatchPrompt(match) {
  const homeTeam = match.homeTeam || match.teams?.home?.name || "Time Casa";
  const awayTeam = match.awayTeam || match.teams?.away?.name || "Time Fora";
  const league = match.league?.name || match.league || "Liga";
  const homeForm = match.homeForm || match.teams?.home?.form || "";
  const awayForm = match.awayForm || match.teams?.away?.form || "";

  return `Atue como um analista de futebol pragmático e baseado em dados.
Sua tarefa é prever o resultado para: ${homeTeam} vs ${awayTeam} (${league}).

CRITÉRIOS OBRIGATÓRIOS:
1. PESQUISE EM TEMPO REAL os últimos 5 jogos de cada time. Não confie em dados antigos.
2. Priorize TOTALMENTE o MOMENTO ATUAL (forma recente) sobre a "tradição" ou "tamanho" do time.
3. Se um time grande está jogando mal, sua previsão DEVE refletir baixa probabilidade de vitória.
4. Considere mando de campo e desfalques importantes recentes.

Dados fornecidos (se vazios, você DEVE pesquisar):
Casa: ${homeForm || "Pesquise a forma recente na web"}
Fora: ${awayForm || "Pesquise a forma recente na web"}

Responda APENAS com este JSON válido (sem markdown, sem code blocks):
{
  "homeWinProbability": <inteiro 0-100>,
  "drawProbability": <inteiro 0-100>,
  "awayWinProbability": <inteiro 0-100>,
  "confidence": "high" | "medium" | "low",
  "analysis": "<Resumo de 1 frase (max 80 chars) focado APENAS no motivo técnico principal>"
}

As probabilidades devem somar 100.
Exemplo de análise boa: "Time A vem de 3 vitórias seguidas em casa."
Exemplo de análise ruim: "Time A é muito tradicional."`;
}

/**
 * Limpa o texto da análise removendo citações, referências e caracteres indesejados
 */
function cleanAnalysisText(text) {
  if (!text || typeof text !== "string") return "Análise indisponível";

  let cleaned = text
    // Remove citações no formato [1], [2], etc
    .replace(/\[\d+\]/g, "")
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, "")
    // Remove "Fonte:", "Ref:", etc
    .replace(/\b(fonte|ref|referência|according to|source)s?:?\s*/gi, "")
    // Remove aspas duplas e simples extras
    .replace(/["""'']/g, "")
    // Remove espaços múltiplos
    .replace(/\s+/g, " ")
    // Remove pontuação repetida
    .replace(/\.{2,}/g, ".")
    .trim();

  // Garante que começa com letra maiúscula
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Limita tamanho
  if (cleaned.length > 120) {
    // Corta na última palavra completa antes do limite
    const truncated = cleaned.substring(0, 117);
    const lastSpace = truncated.lastIndexOf(" ");
    cleaned =
      (lastSpace > 80 ? truncated.substring(0, lastSpace) : truncated) + "...";
  }

  return cleaned || "Análise indisponível";
}

/**
 * Extrai JSON da resposta da IA
 */
function extractJSON(text) {
  // Remove possíveis blocos de código markdown
  let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");

  // Tenta encontrar o JSON na resposta
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("[AIPrediction] Erro ao parsear JSON:", e.message);
    }
  }
  return null;
}

/**
 * Faz uma chamada à API Perplexity com retry
 */
async function callPerplexityAPI(prompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        PERPLEXITY_URL,
        {
          model: "sonar",
          messages: [
            {
              role: "system",
              content:
                "Você é um analista de futebol especializado em estatísticas e previsões. Responda sempre em JSON válido.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.5,
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 segundos
        },
      );

      const content = response.data?.choices?.[0]?.message?.content || "";

      // Se resposta vazia, tentar novamente
      if (!content || content.length < 10) {
        if (attempt < retries) {
          console.log(
            `[AIPrediction] Resposta vazia, tentativa ${attempt + 1}/${retries + 1}...`,
          );
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
      }

      return content;
    } catch (error) {
      if (attempt < retries) {
        console.log(
          `[AIPrediction] Erro na tentativa ${attempt + 1}, retrying: ${error.message}`,
        );
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw error;
    }
  }
  return "";
}

/**
 * Obtém previsão para uma partida específica
 */
async function getMatchPrediction(match) {
  if (!API_KEY) {
    console.error("[AIPrediction] PERPLEXITY_API_KEY não configurada");
    return null;
  }

  const matchId =
    match.id || match.fixture?.id || `${match.homeTeam}-${match.awayTeam}`;
  const cacheKey = `prediction_${matchId}`;

  // Verificar cache
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[AIPrediction] Cache hit para ${matchId}`);
    return cached.data;
  }

  try {
    console.log(`[AIPrediction] Gerando previsão para ${matchId}...`);

    const fullResponse = await callPerplexityAPI(generateMatchPrompt(match));

    console.log(
      `[AIPrediction] Raw response length: ${fullResponse.length}, preview: ${fullResponse.substring(0, 300)}`,
    );

    const prediction = extractJSON(fullResponse);

    if (!prediction) {
      console.error(
        "[AIPrediction] Não foi possível extrair previsão da resposta",
      );
      console.error(
        "[AIPrediction] Full response:",
        fullResponse.substring(0, 500),
      );
      return null;
    }

    // Validar e normalizar probabilidades
    const total =
      (prediction.homeWinProbability || 0) +
      (prediction.drawProbability || 0) +
      (prediction.awayWinProbability || 0);

    if (total > 0 && total !== 100) {
      // Normalizar para 100%
      const factor = 100 / total;
      prediction.homeWinProbability = Math.round(
        prediction.homeWinProbability * factor,
      );
      prediction.drawProbability = Math.round(
        prediction.drawProbability * factor,
      );
      prediction.awayWinProbability =
        100 - prediction.homeWinProbability - prediction.drawProbability;
    }

    // Estruturar resultado final
    const result = {
      matchId,
      homeTeam: {
        name: match.homeTeam || match.teams?.home?.name || "Time Casa",
        logo: match.homeTeamLogo || match.teams?.home?.logo || "",
        winProbability: prediction.homeWinProbability || 33,
      },
      awayTeam: {
        name: match.awayTeam || match.teams?.away?.name || "Time Fora",
        logo: match.awayTeamLogo || match.teams?.away?.logo || "",
        winProbability: prediction.awayWinProbability || 33,
      },
      drawProbability: prediction.drawProbability || 34,
      analysis: cleanAnalysisText(prediction.analysis),
      confidence: prediction.confidence || "medium",
      matchDate:
        match.startTime || match.fixture?.date || new Date().toISOString(),
      league: {
        name: match.league?.name || match.league || "",
        logo: match.league?.logo || "",
      },
    };

    // Salvar no cache
    predictionCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    console.log(`[AIPrediction] Previsão gerada para ${matchId}:`, {
      home: result.homeTeam.winProbability,
      draw: result.drawProbability,
      away: result.awayTeam.winProbability,
    });

    return result;
  } catch (error) {
    console.error("[AIPrediction] Erro ao obter previsão:", error.message);
    return null;
  }
}

/**
 * Obtém previsões para múltiplas partidas (processamento paralelo)
 */
async function getMatchesPredictions(matches, limit = 50) {
  // Limitar quantidade para não sobrecarregar a API
  const matchesToAnalyze = matches.slice(0, limit);

  // Processar em paralelo (5 de cada vez para maior velocidade)
  const batchSize = 5;
  const predictions = [];

  for (let i = 0; i < matchesToAnalyze.length; i += batchSize) {
    const batch = matchesToAnalyze.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((match) => getMatchPrediction(match)),
    );

    predictions.push(...batchResults.filter((p) => p !== null));

    // Pequeno delay entre batches
    if (i + batchSize < matchesToAnalyze.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return predictions;
}

/**
 * Limpa todo o cache
 */
function clearCache() {
  predictionCache.clear();
  console.log("[AIPrediction] Cache limpo");
}

module.exports = {
  getMatchPrediction,
  getMatchesPredictions,
  clearCache,
};
