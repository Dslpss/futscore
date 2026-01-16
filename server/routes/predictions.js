const express = require("express");
const router = express.Router();
const Prediction = require("../models/Prediction");
const UserStats = require("../models/UserStats");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

// ==========================================
// GET /api/predictions/my
// Get current user's predictions
// ==========================================
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    
    const query = { userId: req.user._id };
    
    // Filter by status
    if (status === "pending") {
      query["result.type"] = "pending";
      query.matchDate = { $gte: new Date() };
    } else if (status === "completed") {
      query["result.type"] = { $ne: "pending" };
    }
    
    const predictions = await Prediction.find(query)
      .sort({ matchDate: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();
    
    const total = await Prediction.countDocuments(query);
    
    res.json({
      predictions,
      total,
      hasMore: parseInt(offset) + predictions.length < total,
    });
  } catch (error) {
    console.error("[Predictions] Error getting user predictions:", error);
    res.status(500).json({ error: "Erro ao buscar palpites" });
  }
});

// ==========================================
// GET /api/predictions/stats
// Get current user's prediction stats
// ==========================================
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    let stats = await UserStats.findOne({ userId: req.user._id }).lean();
    
    if (!stats) {
      // Create default stats if none exist
      stats = {
        predictions: { total: 0, exact: 0, partial: 0, result: 0, miss: 0, pending: 0 },
        totalPoints: 0,
        weeklyPoints: 0,
        monthlyPoints: 0,
        currentStreak: 0,
        bestStreak: 0,
        achievements: [],
      };
    }
    
    // Calculate accuracy
    const completed = stats.predictions.total - stats.predictions.pending;
    const correct = stats.predictions.exact + stats.predictions.partial + stats.predictions.result;
    const accuracy = completed > 0 ? Math.round((correct / completed) * 100) : 0;
    
    res.json({
      ...stats,
      accuracy,
      user: {
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error("[Predictions] Error getting stats:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

// ==========================================
// POST /api/predictions
// Create or update a prediction
// ==========================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      matchId,
      homeTeam,
      awayTeam,
      competition,
      matchDate,
      predictedHomeScore,
      predictedAwayScore,
    } = req.body;
    
    // Validate required fields
    if (!matchId || predictedHomeScore === undefined || predictedAwayScore === undefined) {
      return res.status(400).json({ error: "Dados incompletos" });
    }
    
    // Validate scores
    if (
      predictedHomeScore < 0 ||
      predictedAwayScore < 0 ||
      predictedHomeScore > 20 ||
      predictedAwayScore > 20
    ) {
      return res.status(400).json({ error: "Placar inválido" });
    }
    
    // Check if match hasn't started yet
    const matchDateTime = new Date(matchDate);
    if (matchDateTime <= new Date()) {
      return res.status(400).json({ error: "Partida já iniciou, não é possível dar palpite" });
    }
    
    // Check for existing prediction
    const existingPrediction = await Prediction.findOne({
      userId: req.user._id,
      matchId,
    });
    
    if (existingPrediction) {
      // Update existing prediction
      existingPrediction.predictedHomeScore = predictedHomeScore;
      existingPrediction.predictedAwayScore = predictedAwayScore;
      existingPrediction.updatedAt = new Date();
      await existingPrediction.save();
      
      console.log(`[Predictions] Updated prediction for user ${req.user.email} - Match ${matchId}: ${predictedHomeScore}x${predictedAwayScore}`);
      
      return res.json({
        message: "Palpite atualizado!",
        prediction: existingPrediction,
        isUpdate: true,
      });
    }
    
    // Create new prediction
    const prediction = new Prediction({
      userId: req.user._id,
      matchId,
      homeTeam,
      awayTeam,
      competition,
      matchDate: matchDateTime,
      predictedHomeScore,
      predictedAwayScore,
    });
    
    await prediction.save();
    
    // Update user stats (increment pending)
    await UserStats.findOneAndUpdate(
      { userId: req.user._id },
      {
        $inc: { "predictions.pending": 1 },
        $set: { lastPredictionAt: new Date() },
      },
      { upsert: true }
    );
    
    console.log(`[Predictions] New prediction from ${req.user.email} - Match ${matchId}: ${predictedHomeScore}x${predictedAwayScore}`);
    
    res.status(201).json({
      message: "Palpite registrado!",
      prediction,
      isUpdate: false,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - should not happen due to check above
      return res.status(400).json({ error: "Você já deu um palpite para esta partida" });
    }
    console.error("[Predictions] Error creating prediction:", error);
    res.status(500).json({ error: "Erro ao registrar palpite" });
  }
});

// ==========================================
// GET /api/predictions/match/:matchId
// Get prediction for a specific match
// ==========================================
router.get("/match/:matchId", authMiddleware, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({
      userId: req.user._id,
      matchId: req.params.matchId,
    }).lean();
    
    res.json({ prediction });
  } catch (error) {
    console.error("[Predictions] Error getting match prediction:", error);
    res.status(500).json({ error: "Erro ao buscar palpite" });
  }
});

// ==========================================
// DELETE /api/predictions/:matchId
// Delete a prediction (only if match hasn't started)
// ==========================================
router.delete("/:matchId", authMiddleware, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({
      userId: req.user._id,
      matchId: req.params.matchId,
    });
    
    if (!prediction) {
      return res.status(404).json({ error: "Palpite não encontrado" });
    }
    
    // Check if match hasn't started
    if (prediction.matchDate <= new Date()) {
      return res.status(400).json({ error: "Partida já iniciou, não é possível remover" });
    }
    
    await Prediction.deleteOne({ _id: prediction._id });
    
    // Update user stats
    await UserStats.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { "predictions.pending": -1 } }
    );
    
    res.json({ message: "Palpite removido" });
  } catch (error) {
    console.error("[Predictions] Error deleting prediction:", error);
    res.status(500).json({ error: "Erro ao remover palpite" });
  }
});

// ==========================================
// GET /api/predictions/leaderboard
// Get leaderboard
// ==========================================
router.get("/leaderboard", authMiddleware, async (req, res) => {
  try {
    const { type = "total", limit = 50 } = req.query;
    
    const sortField =
      type === "weekly"
        ? "weeklyPoints"
        : type === "monthly"
        ? "monthlyPoints"
        : "totalPoints";
    
    const leaderboard = await UserStats.find({ [sortField]: { $gt: 0 } })
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit))
      .populate("userId", "name email")
      .lean();
    
    // Get current user's rank
    const userStats = await UserStats.findOne({ userId: req.user._id }).lean();
    let userRank = null;
    
    if (userStats && userStats[sortField] > 0) {
      const higherCount = await UserStats.countDocuments({
        [sortField]: { $gt: userStats[sortField] },
      });
      userRank = higherCount + 1;
    }
    
    // Format leaderboard
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId?._id,
      name: entry.userId?.name || "Usuário",
      points: entry[sortField],
      totalPoints: entry.totalPoints,
      predictions: entry.predictions,
      streak: entry.currentStreak,
      isCurrentUser: entry.userId?._id?.toString() === req.user._id.toString(),
    }));
    
    res.json({
      leaderboard: formattedLeaderboard,
      userRank,
      userPoints: userStats?.[sortField] || 0,
      type,
    });
  } catch (error) {
    console.error("[Predictions] Error getting leaderboard:", error);
    res.status(500).json({ error: "Erro ao buscar ranking" });
  }
});

// ==========================================
// GET /api/predictions/upcoming
// Get matches available for prediction
// ==========================================
router.get("/upcoming", authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get user's existing predictions for upcoming matches
    const userPredictions = await Prediction.find({
      userId: req.user._id,
      matchDate: { $gte: new Date() },
    }).lean();
    
    const predictedMatchIds = userPredictions.map(p => p.matchId);
    
    res.json({
      predictedMatchIds,
      message: "Use match data from frontend to show prediction options",
    });
  } catch (error) {
    console.error("[Predictions] Error getting upcoming:", error);
    res.status(500).json({ error: "Erro ao buscar partidas" });
  }
});

module.exports = router;
