const Prediction = require("../models/Prediction");
const UserStats = require("../models/UserStats");
const { sendPushToUser } = require("./pushNotifications");
const User = require("../models/User");

/**
 * Process predictions for completed matches
 * This should be called periodically or after match results are fetched
 */
async function processPredictions(completedMatches) {
  console.log(`[PredictionService] Processing ${completedMatches.length} completed matches...`);
  
  let processed = 0;
  let pointsAwarded = 0;
  
  for (const match of completedMatches) {
    try {
      // Find pending predictions for this match
      const predictions = await Prediction.find({
        matchId: match.id,
        "result.type": "pending",
      });
      
      if (predictions.length === 0) continue;
      
      console.log(`[PredictionService] Found ${predictions.length} predictions for match ${match.id}`);
      
      for (const prediction of predictions) {
        // Calculate points
        const { points, type } = Prediction.calculatePoints(
          prediction.predictedHomeScore,
          prediction.predictedAwayScore,
          match.homeScore,
          match.awayScore
        );
        
        // Update prediction with result
        prediction.result = {
          actualHomeScore: match.homeScore,
          actualAwayScore: match.awayScore,
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
        
        pointsAwarded += finalPoints;
        processed++;
        
        // Send push notification for results
        if (points > 0) {
          await notifyPredictionResult(prediction.userId, prediction, finalPoints, type);
        }
        
        console.log(`[PredictionService] User ${prediction.userId} earned ${finalPoints} points (${type})`);
      }
    } catch (error) {
      console.error(`[PredictionService] Error processing match ${match.id}:`, error);
    }
  }
  
  console.log(`[PredictionService] Processed ${processed} predictions, awarded ${pointsAwarded} points`);
  return { processed, pointsAwarded };
}

/**
 * Send push notification for prediction result
 */
async function notifyPredictionResult(userId, prediction, points, type) {
  try {
    const user = await User.findById(userId).select("pushToken");
    if (!user?.pushToken) return;
    
    const emoji = type === "exact" ? "🎯" : type === "partial" ? "👏" : "✅";
    const typeText = type === "exact" ? "Placar exato!" : type === "partial" ? "Diferença de gols!" : "Resultado certo!";
    
    const title = `${emoji} +${points} pontos!`;
    const body = `${typeText}\n${prediction.homeTeam.name} ${prediction.result.actualHomeScore}x${prediction.result.actualAwayScore} ${prediction.awayTeam.name}`;
    
    await sendPushToUser(user.pushToken, title, body, {
      type: "prediction_result",
      matchId: prediction.matchId,
      points,
      resultType: type,
    });
  } catch (error) {
    console.error("[PredictionService] Error sending notification:", error);
  }
}

/**
 * Get user's prediction stats summary
 */
async function getUserStats(userId) {
  let stats = await UserStats.findOne({ userId });
  
  if (!stats) {
    stats = new UserStats({ userId });
    await stats.save();
  }
  
  return stats;
}

/**
 * Update global rankings
 * Should be called periodically (e.g., every hour)
 */
async function updateRankings() {
  console.log("[PredictionService] Updating global rankings...");
  
  try {
    // Get all users sorted by total points
    const allStats = await UserStats.find({ totalPoints: { $gt: 0 } })
      .sort({ totalPoints: -1 })
      .select("_id");
    
    // Update each user's rank
    const bulkOps = allStats.map((stat, index) => ({
      updateOne: {
        filter: { _id: stat._id },
        update: { globalRank: index + 1 },
      },
    }));
    
    if (bulkOps.length > 0) {
      await UserStats.bulkWrite(bulkOps);
    }
    
    // Update weekly rankings
    const weeklyStats = await UserStats.find({ weeklyPoints: { $gt: 0 } })
      .sort({ weeklyPoints: -1 })
      .select("_id");
    
    const weeklyBulkOps = weeklyStats.map((stat, index) => ({
      updateOne: {
        filter: { _id: stat._id },
        update: { weeklyRank: index + 1 },
      },
    }));
    
    if (weeklyBulkOps.length > 0) {
      await UserStats.bulkWrite(weeklyBulkOps);
    }
    
    console.log(`[PredictionService] Updated rankings for ${allStats.length} users`);
  } catch (error) {
    console.error("[PredictionService] Error updating rankings:", error);
  }
}

/**
 * Check for achievements
 */
async function checkAchievements(userStats) {
  const achievements = [];
  
  // First prediction
  if (userStats.predictions.total === 1 && !hasAchievement(userStats, "first_prediction")) {
    achievements.push({
      type: "first_prediction",
      name: "Primeiro Palpite",
      description: "Você fez seu primeiro palpite!",
      icon: "🎉",
    });
  }
  
  // First exact score
  if (userStats.predictions.exact === 1 && !hasAchievement(userStats, "first_exact")) {
    achievements.push({
      type: "first_exact",
      name: "Vidente",
      description: "Acertou o placar exato pela primeira vez!",
      icon: "🔮",
    });
  }
  
  // 10 predictions
  if (userStats.predictions.total >= 10 && !hasAchievement(userStats, "10_predictions")) {
    achievements.push({
      type: "10_predictions",
      name: "Apostador Iniciante",
      description: "Fez 10 palpites",
      icon: "📊",
    });
  }
  
  // 50 predictions
  if (userStats.predictions.total >= 50 && !hasAchievement(userStats, "50_predictions")) {
    achievements.push({
      type: "50_predictions",
      name: "Apostador Experiente",
      description: "Fez 50 palpites",
      icon: "🎯",
    });
  }
  
  // 5 streak
  if (userStats.currentStreak >= 5 && !hasAchievement(userStats, "5_streak")) {
    achievements.push({
      type: "5_streak",
      name: "Sequência de Fogo",
      description: "Acertou 5 palpites seguidos!",
      icon: "🔥",
    });
  }
  
  // 10 streak
  if (userStats.currentStreak >= 10 && !hasAchievement(userStats, "10_streak")) {
    achievements.push({
      type: "10_streak",
      name: "Imparável",
      description: "Acertou 10 palpites seguidos!",
      icon: "⚡",
    });
  }
  
  // 100 points
  if (userStats.totalPoints >= 100 && !hasAchievement(userStats, "100_points")) {
    achievements.push({
      type: "100_points",
      name: "Centenário",
      description: "Alcançou 100 pontos totais",
      icon: "💯",
    });
  }
  
  // 500 points
  if (userStats.totalPoints >= 500 && !hasAchievement(userStats, "500_points")) {
    achievements.push({
      type: "500_points",
      name: "Meio Milhar",
      description: "Alcançou 500 pontos totais",
      icon: "🏆",
    });
  }
  
  return achievements;
}

function hasAchievement(userStats, type) {
  return userStats.achievements?.some(a => a.type === type);
}

/**
 * Reset weekly points (should be called every Sunday midnight)
 */
async function resetWeeklyPoints() {
  console.log("[PredictionService] Resetting weekly points...");
  await UserStats.resetWeeklyPoints();
}

/**
 * Reset monthly points (should be called on 1st of each month)
 */
async function resetMonthlyPoints() {
  console.log("[PredictionService] Resetting monthly points...");
  await UserStats.resetMonthlyPoints();
}

module.exports = {
  processPredictions,
  getUserStats,
  updateRankings,
  checkAchievements,
  resetWeeklyPoints,
  resetMonthlyPoints,
};
