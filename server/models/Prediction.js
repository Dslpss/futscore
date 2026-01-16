const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  matchId: {
    type: String,
    required: true,
  },
  // Match details (stored for reference)
  homeTeam: {
    name: { type: String, required: true },
    logo: { type: String },
    id: { type: String },
  },
  awayTeam: {
    name: { type: String, required: true },
    logo: { type: String },
    id: { type: String },
  },
  competition: {
    name: { type: String },
    logo: { type: String },
  },
  matchDate: {
    type: Date,
    required: true,
  },
  // User prediction
  predictedHomeScore: {
    type: Number,
    required: true,
    min: 0,
    max: 20,
  },
  predictedAwayScore: {
    type: Number,
    required: true,
    min: 0,
    max: 20,
  },
  // Result (filled after match ends)
  result: {
    actualHomeScore: { type: Number },
    actualAwayScore: { type: Number },
    points: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["pending", "exact", "partial", "result", "miss"],
      default: "pending",
    },
    processedAt: { type: Date },
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure one prediction per user per match
predictionSchema.index({ userId: 1, matchId: 1 }, { unique: true });

// Index for querying user predictions
predictionSchema.index({ userId: 1, matchDate: -1 });

// Index for processing pending predictions
predictionSchema.index({ "result.type": 1, matchDate: 1 });

// Static method to calculate points
predictionSchema.statics.calculatePoints = function (
  predictedHome,
  predictedAway,
  actualHome,
  actualAway
) {
  // Exact score match = 10 points
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return { points: 10, type: "exact" };
  }

  // Goal difference match = 5 points
  const predictedDiff = predictedHome - predictedAway;
  const actualDiff = actualHome - actualAway;
  if (predictedDiff === actualDiff) {
    return { points: 5, type: "partial" };
  }

  // Result match (win/draw/loss) = 3 points
  const predictedResult =
    predictedHome > predictedAway
      ? "home"
      : predictedHome < predictedAway
      ? "away"
      : "draw";
  const actualResult =
    actualHome > actualAway ? "home" : actualHome < actualAway ? "away" : "draw";

  if (predictedResult === actualResult) {
    return { points: 3, type: "result" };
  }

  // No match = 0 points
  return { points: 0, type: "miss" };
};

module.exports = mongoose.model("Prediction", predictionSchema);
