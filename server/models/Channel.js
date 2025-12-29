const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
    default: null,
  },
  category: {
    type: String,
    default: "sports",
  },
  country: {
    type: String,
    default: null,
  },
  language: {
    type: String,
    default: null,
  },
  groupTitle: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  lastAccessed: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
channelSchema.index({ category: 1, isActive: 1 });
channelSchema.index({ name: "text" });

module.exports = mongoose.model("Channel", channelSchema);
