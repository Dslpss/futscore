const axios = require("axios");

// NVIDIA API Configuration
const INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const API_KEY = process.env.NVIDIA_API_KEY;

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

  return `Analise esta partida de futebol e forneça probabilidades de resultado:

Partida: ${homeTeam} vs ${awayTeam}
Competição: ${league}
${homeForm ? `Forma recente ${homeTeam}: ${homeForm}` : ""}
${awayForm ? `Forma recente ${awayTeam}: ${awayForm}` : ""}

Responda APENAS em formato JSON válido, sem texto adicional:
{
  "homeWinProbability": <número de 0 a 100>,
  "drawProbability": <número de 0 a 100>,
  "awayWinProbability": <número de 0 a 100>,
  "confidence": "<high|medium|low>",
  "analysis": "<análise curta em português, máximo 100 caracteres>"
}

IMPORTANTE: As 3 probabilidades devem somar exatamente 100.`;
}

/**
 * Faz parse da resposta em stream da API NVIDIA
 */
async function parseStreamResponse(stream) {
  return new Promise((resolve, reject) => {
    let fullContent = "";
    let thinkingComplete = false;

    stream.on("data", (chunk) => {
      const lines = chunk.toString().split("\n");
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            // Ignorar blocos de "thinking" 
            if (content) {
              // Detectar fim do thinking
              if (content.includes("</think>")) {
                thinkingComplete = true;
              }
              // Só adicionar conteúdo após o thinking
              if (thinkingComplete || !content.includes("<think>")) {
                // Remover tags de thinking
                const cleanContent = content
                  .replace(/<think>[\s\S]*?<\/think>/g, "")
                  .replace(/<think>/g, "")
                  .replace(/<\/think>/g, "");
                fullContent += cleanContent;
              }
            }
          } catch (e) {
            // Ignorar linhas que não são JSON
          }
        }
      }
    });

    stream.on("end", () => {
      resolve(fullContent.trim());
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
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
 * Obtém previsão para uma partida específica
 */
async function getMatchPrediction(match) {
  if (!API_KEY) {
    console.error("[AIPrediction] NVIDIA_API_KEY não configurada");
    return null;
  }

  const matchId = match.id || match.fixture?.id || `${match.homeTeam}-${match.awayTeam}`;
  const cacheKey = `prediction_${matchId}`;

  // Verificar cache
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[AIPrediction] Cache hit para ${matchId}`);
    return cached.data;
  }

  try {
    console.log(`[AIPrediction] Gerando previsão para ${matchId}...`);

    const response = await axios.post(
      INVOKE_URL,
      {
        model: "nvidia/llama-3.1-nemotron-70b-instruct",
        messages: [
          {
            role: "system",
            content: "Você é um analista de futebol especializado. Responda sempre em JSON válido, sem texto adicional."
          },
          {
            role: "user",
            content: generateMatchPrompt(match),
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const fullResponse = response.data?.choices?.[0]?.message?.content || "";
    console.log(`[AIPrediction] Raw response length: ${fullResponse.length}, preview: ${fullResponse.substring(0, 200)}`);
    
    const prediction = extractJSON(fullResponse);

    if (!prediction) {
      console.error("[AIPrediction] Não foi possível extrair previsão da resposta");
      console.error("[AIPrediction] Full response:", fullResponse.substring(0, 500));
      return null;
    }

    // Validar e normalizar probabilidades
    const total = (prediction.homeWinProbability || 0) + 
                  (prediction.drawProbability || 0) + 
                  (prediction.awayWinProbability || 0);
    
    if (total > 0 && total !== 100) {
      // Normalizar para 100%
      const factor = 100 / total;
      prediction.homeWinProbability = Math.round(prediction.homeWinProbability * factor);
      prediction.drawProbability = Math.round(prediction.drawProbability * factor);
      prediction.awayWinProbability = 100 - prediction.homeWinProbability - prediction.drawProbability;
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
      analysis: prediction.analysis || "Análise indisponível",
      confidence: prediction.confidence || "medium",
      matchDate: match.startTime || match.fixture?.date || new Date().toISOString(),
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
 * Obtém previsões para múltiplas partidas
 */
async function getMatchesPredictions(matches, limit = 5) {
  const predictions = [];
  
  // Limitar quantidade para não sobrecarregar a API
  const matchesToAnalyze = matches.slice(0, limit);
  
  for (const match of matchesToAnalyze) {
    const prediction = await getMatchPrediction(match);
    if (prediction) {
      predictions.push(prediction);
    }
    
    // Pequeno delay entre requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
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
