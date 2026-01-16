const mongoose = require("mongoose");

const userStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  // Prediction stats
  predictions: {
    total: { type: Number, default: 0 },
    exact: { type: Number, default: 0 },      // Placar exato
    partial: { type: Number, default: 0 },    // Diferença de gols
    result: { type: Number, default: 0 },     // Apenas resultado
    miss: { type: Number, default: 0 },       // Errou
    pending: { type: Number, default: 0 },    // Aguardando resultado
  },
  // Points
  totalPoints: { type: Number, default: 0 },
  weeklyPoints: { type: Number, default: 0 },
  monthlyPoints: { type: Number, default: 0 },
  // Streaks
  currentStreak: { type: Number, default: 0 },  // Acertos consecutivos
  bestStreak: { type: Number, default: 0 },
  // Rankings
  globalRank: { type: Number },
  weeklyRank: { type: Number },
  // Achievements
  achievements: [{
    type: { type: String },
    name: { type: String },
    description: { type: String },
    earnedAt: { type: Date, default: Date.now },
    icon: { type: String },
  }],
  // Last activity
  lastPredictionAt: { type: Date },
  lastPointsUpdate: { type: Date },
  // Period tracking
  weekStartDate: { type: Date },
  monthStartDate: { type: Date },
}, {
  timestamps: true,
});

// Index for leaderboard queries
userStatsSchema.index({ totalPoints: -1 });
userStatsSchema.index({ weeklyPoints: -1 });
userStatsSchema.index({ monthlyPoints: -1 });
userStatsSchema.index({ currentStreak: -1 });

// Method to add points
userStatsSchema.methods.addPoints = function (points, resultType) {
  this.totalPoints += points;
  this.weeklyPoints += points;
  this.monthlyPoints += points;
  
  // Update prediction counts
  this.predictions.total += 1;
  this.predictions.pending = Math.max(0, this.predictions.pending - 1);
  
  if (resultType === "exact") {
    this.predictions.exact += 1;
    this.currentStreak += 1;
  } else if (resultType === "partial") {
    this.predictions.partial += 1;
    this.currentStreak += 1;
  } else if (resultType === "result") {
    this.predictions.result += 1;
    this.currentStreak += 1;
  } else {
    this.predictions.miss += 1;
    this.currentStreak = 0;
  }
  
  // Update best streak
  if (this.currentStreak > this.bestStreak) {
    this.bestStreak = this.currentStreak;
  }
  
  // Apply streak bonus (+2 per consecutive hit after 3)
  if (this.currentStreak >= 3 && points > 0) {
    const streakBonus = 2;
    this.totalPoints += streakBonus;
    this.weeklyPoints += streakBonus;
    this.monthlyPoints += streakBonus;
    return points + streakBonus;
  }
  
  this.lastPointsUpdate = new Date();
  return points;
};

// Static method to reset weekly points
userStatsSchema.statics.resetWeeklyPoints = async function () {
  const now = new Date();
  await this.updateMany(
    {},
    {
      weeklyPoints: 0,
      weekStartDate: now,
    }
  );
};

// Static method to reset monthly points
userStatsSchema.statics.resetMonthlyPoints = async function () {
  const now = new Date();
  await this.updateMany(
    {},
    {
      monthlyPoints: 0,
      monthStartDate: now,
    }
  );
};

// Static method to get leaderboard
userStatsSchema.statics.getLeaderboard = async function (
  type = "total",
  limit = 50
) {
  const sortField =
    type === "weekly"
      ? "weeklyPoints"
      : type === "monthly"
      ? "monthlyPoints"
      : "totalPoints";

  return await this.find({ [sortField]: { $gt: 0 } })
    .sort({ [sortField]: -1 })
    .limit(limit)
    .populate("userId", "name email")
    .lean();
};

module.exports = mongoose.model("UserStats", userStatsSchema);
