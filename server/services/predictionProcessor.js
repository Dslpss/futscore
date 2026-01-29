/**
 * Prediction Processor Service
 * 
 * This service periodically checks for pending predictions whose matches 
 * have already finished and processes them to award points.
 */

const Prediction = require("../models/Prediction");
const UserStats = require("../models/UserStats");
const User = require("../models/User");
const { sendPushToUser } = require("./pushNotifications");

// MSN Sports API config
const MSN_API_BASE = "https://api.msn.com/sports";
const MSN_API_KEY = "kO1dI4ptCTTylLkPL1ZTHYP8JhLKb8mRDoA5yotmNJ";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

let userAgentIndex = 0;
function getRandomUserAgent() {
  userAgentIndex = (userAgentIndex + 1) % USER_AGENTS.length;
  return USER_AGENTS[userAgentIndex];
}

function generateActivityId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Fetch match result from API-Football or MSN
 * Returns { homeScore, awayScore, status } or null if not found
 */
async function fetchMatchResult(matchId, matchDate, homeTeamName, awayTeamName) {
  try {
    // Try multiple API sources to find the match result
    
    // 1. Try API-Football if matchId looks like an API-Football ID (numeric)
    if (/^\d+$/.test(matchId)) {
      const result = await fetchFromApiFootball(matchId);
      if (result) return result;
    }
    
    // 2. Try MSN Sports with team names
    const msnResult = await fetchFromMSN(matchDate, homeTeamName, awayTeamName);
    if (msnResult) return msnResult;
    
    return null;
  } catch (error) {
    console.error(`[PredictionProcessor] Error fetching match ${matchId}:`, error.message);
    return null;
  }
}

/**
 * Fetch match from API-Football
 */
async function fetchFromApiFootball(fixtureId) {
  try {
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, {
      headers: {
        "x-rapidapi-key": process.env.FOOTBALL_API_KEY || "",
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const fixture = data.response?.[0];
    
    if (!fixture) return null;
    
    const status = fixture.fixture.status.short;
    if (!["FT", "AET", "PEN"].includes(status)) {
      return null; // Match not finished
    }
    
    return {
      homeScore: fixture.goals.home ?? 0,
      awayScore: fixture.goals.away ?? 0,
      status: status,
    };
  } catch (error) {
    console.error(`[PredictionProcessor] API-Football error:`, error.message);
    return null;
  }
}

/**
 * Fetch match from MSN Sports by team names
 */
async function fetchFromMSN(matchDate, homeTeamName, awayTeamName) {
  const leagues = [
    "Soccer_BrazilBrasileiroSerieA",
    "Soccer_BrazilCopaDoBrasil",
    "Soccer_InternationalClubsUEFAChampionsLeague",
    "Soccer_SpainLaLiga",
    "Soccer_EnglandPremierLeague",
    "Soccer_GermanyBundesliga",
    "Soccer_ItalySerieA",
    "Soccer_FranceLigue1",
    "Soccer_PortugalPrimeiraLiga",
    "Soccer_UEFAEuropaLeague",
    "Soccer_BrazilCarioca",
    "Soccer_BrazilMineiro",
    "Soccer_BrazilPaulistaSerieA1",
    "Soccer_BrazilGaucho",
  ];
  
  const normalizedHome = normalizeTeamName(homeTeamName);
  const normalizedAway = normalizeTeamName(awayTeamName);
  
  for (const leagueId of leagues) {
    try {
      const now = new Date();
      const tzoffset = Math.floor(-now.getTimezoneOffset() / 60);
      
      const params = new URLSearchParams({
        version: "1.0",
        cm: "pt-br",
        scn: "ANON",
        it: "web",
        apikey: MSN_API_KEY,
        activityId: generateActivityId(),
        id: leagueId,
        sport: "Soccer",
        datetime: now.toISOString().split(".")[0],
        tzoffset: tzoffset.toString(),
        withleaguereco: "true",
      });
      
      const url = `${MSN_API_BASE}/livearoundtheleague?${params}`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          Accept: "*/*",
        },
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const schedules = data.value?.[0]?.schedules || [];
      
      for (const schedule of schedules) {
        const games = schedule.games || [];
        
        for (const game of games) {
          const gameStatus = game.gameState?.gameStatus?.toLowerCase() || "";
          const isFinished = gameStatus === "final" || gameStatus === "post";
          
          if (!isFinished) continue;
          
          const homeParticipant = game.participants?.[0];
          const awayParticipant = game.participants?.[1];
          
          const gameHome = normalizeTeamName(
            homeParticipant?.team?.shortName?.rawName ||
            homeParticipant?.team?.name?.rawName || ""
          );
          const gameAway = normalizeTeamName(
            awayParticipant?.team?.shortName?.rawName ||
            awayParticipant?.team?.name?.rawName || ""
          );
          
          // Check if this is the match we're looking for
          if (teamsMatch(normalizedHome, gameHome) && teamsMatch(normalizedAway, gameAway)) {
            return {
              homeScore: parseInt(homeParticipant?.result?.score) || 0,
              awayScore: parseInt(awayParticipant?.result?.score) || 0,
              status: "FT",
            };
          }
        }
      }
      
      // Small delay between league requests
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      // Continue to next league
    }
  }
  
  return null;
}

/**
 * Normalize team name for comparison
 */
function normalizeTeamName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric
    .replace(/fc|sc|ac|cf|rc|real|atletico|club|esporte|clube|futebol/g, "")
    .trim();
}

/**
 * Check if two team names match
 */
function teamsMatch(name1, name2) {
  if (name1 === name2) return true;
  
  // Check if one contains the other (for abbreviated names)
  if (name1.includes(name2) || name2.includes(name1)) return true;
  
  // Check Levenshtein distance for slight variations
  const distance = levenshteinDistance(name1, name2);
  const maxLen = Math.max(name1.length, name2.length);
  const similarity = 1 - (distance / maxLen);
  
  return similarity > 0.8; // 80% similarity threshold
}

/**
 * Calculate Levenshtein distance
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Send push notification for prediction result
 */
async function notifyPredictionResult(userId, prediction, points, type) {
  try {
    const user = await User.findById(userId).select("pushToken");
    if (!user?.pushToken) return;
    
    const emoji = type === "exact" ? "🎯" : type === "partial" ? "👏" : type === "result" ? "✅" : "❌";
    const typeText = type === "exact" ? "Placar exato!" : type === "partial" ? "Diferença de gols!" : type === "result" ? "Resultado certo!" : "Não foi dessa vez!";
    
    const title = points > 0 ? `${emoji} +${points} pontos!` : `${emoji} ${typeText}`;
    const body = `${typeText}\n${prediction.homeTeam.name} ${prediction.result.actualHomeScore}x${prediction.result.actualAwayScore} ${prediction.awayTeam.name}`;
    
    await sendPushToUser(user.pushToken, title, body, {
      type: "prediction_result",
      matchId: prediction.matchId,
      points,
      resultType: type,
    });
  } catch (error) {
    console.error("[PredictionProcessor] Error sending notification:", error);
  }
}

/**
 * Process a single pending prediction
 */
async function processPrediction(prediction, matchResult) {
  const { points, type } = Prediction.calculatePoints(
    prediction.predictedHomeScore,
    prediction.predictedAwayScore,
    matchResult.homeScore,
    matchResult.awayScore
  );
  
  // Update prediction with result
  prediction.result = {
    actualHomeScore: matchResult.homeScore,
    actualAwayScore: matchResult.awayScore,
    points,
    type,
    processedAt: new Date(),
  };
  await prediction.save();
  
  // Update user stats
  let userStats = await UserStats.findOne({ userId: prediction.userId });
  if (!userStats) {
    userStats = new UserStats({ userId: prediction.userId });
  }
  
  const finalPoints = userStats.addPoints(points, type);
  await userStats.save();
  
  // Send push notification
  await notifyPredictionResult(prediction.userId, prediction, finalPoints, type);
  
  console.log(`[PredictionProcessor] User ${prediction.userId} earned ${finalPoints} points (${type}) for match ${prediction.matchId}`);
  
  return { points: finalPoints, type };
}

/**
 * Main function to check and process pending predictions
 */
async function checkPendingPredictions() {
  console.log("[PredictionProcessor] Checking pending predictions...");
  
  try {
    // Find predictions that are still pending but match date is in the past (finished)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 3); // Consider matches that ended at least 3 hours ago
    
    const pendingPredictions = await Prediction.find({
      "result.type": "pending",
      matchDate: { $lt: cutoffTime }
    }).limit(50); // Process in batches
    
    if (pendingPredictions.length === 0) {
      console.log("[PredictionProcessor] No pending predictions to process");
      return { processed: 0, failed: 0 };
    }
    
    console.log(`[PredictionProcessor] Found ${pendingPredictions.length} pending predictions to check`);
    
    let processed = 0;
    let failed = 0;
    
    for (const prediction of pendingPredictions) {
      try {
        // Fetch match result from APIs
        const matchResult = await fetchMatchResult(
          prediction.matchId,
          prediction.matchDate,
          prediction.homeTeam.name,
          prediction.awayTeam.name
        );
        
        if (!matchResult) {
          console.log(`[PredictionProcessor] Could not find result for match ${prediction.matchId}: ${prediction.homeTeam.name} vs ${prediction.awayTeam.name}`);
          failed++;
          continue;
        }
        
        await processPrediction(prediction, matchResult);
        processed++;
        
        // Small delay between processing
        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        console.error(`[PredictionProcessor] Error processing prediction ${prediction._id}:`, error.message);
        failed++;
      }
    }
    
    console.log(`[PredictionProcessor] Processed ${processed} predictions, ${failed} failed`);
    return { processed, failed };
  } catch (error) {
    console.error("[PredictionProcessor] Error:", error);
    return { processed: 0, failed: 0 };
  }
}

// Interval ID for the processor
let processorIntervalId = null;
const PROCESSOR_INTERVAL = 15 * 60 * 1000; // Run every 15 minutes

/**
 * Start the prediction processor
 */
function startPredictionProcessor() {
  console.log("[PredictionProcessor] Starting prediction processor...");
  console.log(`[PredictionProcessor] Will check pending predictions every ${PROCESSOR_INTERVAL / 60000} minutes`);
  
  // Initial check after 2 minutes (give time for server to fully start)
  setTimeout(() => {
    checkPendingPredictions();
    
    // Then run periodically
    processorIntervalId = setInterval(checkPendingPredictions, PROCESSOR_INTERVAL);
  }, 2 * 60 * 1000);
}

/**
 * Stop the prediction processor
 */
function stopPredictionProcessor() {
  if (processorIntervalId) {
    clearInterval(processorIntervalId);
    processorIntervalId = null;
    console.log("[PredictionProcessor] Prediction processor stopped");
  }
}

module.exports = {
  checkPendingPredictions,
  startPredictionProcessor,
  stopPredictionProcessor,
  fetchMatchResult,
  processPrediction,
};
