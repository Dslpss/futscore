const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['update', 'feature', 'promo', 'alert', 'news'],
    default: 'news',
  },
  icon: {
    type: String,
    default: '🎉', // Emoji or icon name
  },
  primaryColor: {
    type: String,
    default: '#22c55e', // Green
  },
  secondaryColor: {
    type: String,
    default: '#16a34a', // Darker green
  },
  actionType: {
    type: String,
    enum: ['none', 'link', 'screen', 'dismiss'],
    default: 'dismiss',
  },
  actionTarget: {
    type: String, // URL or screen name
    default: '',
  },
  actionLabel: {
    type: String,
    default: 'Entendi',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  priority: {
    type: Number,
    default: 0, // Higher = more important
    min: 0,
    max: 10,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null, // null = no expiration
  },
  targetAudience: {
    type: String,
    enum: ['all', 'premium', 'free'],
    default: 'all',
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  dismissedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for efficient queries
announcementSchema.index({ isActive: 1, startDate: 1, endDate: 1, priority: -1 });

// Static method to get active announcements for a user
announcementSchema.statics.getActiveForUser = async function(userId, isPremium = false) {
  const now = new Date();
  
  const query = {
    isActive: true,
    startDate: { $lte: now },
    $or: [
      { endDate: null },
      { endDate: { $gte: now } },
    ],
  };

  // Filter by audience
  if (isPremium) {
    query.targetAudience = { $in: ['all', 'premium'] };
  } else {
    query.targetAudience = { $in: ['all', 'free'] };
  }

  // Exclude dismissed announcements
  if (userId) {
    query.dismissedBy = { $ne: userId };
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(5)
    .select('-dismissedBy -createdBy');
};

module.exports = mongoose.model('Announcement', announcementSchema);
