const mongoose = require('mongoose');

const AppVersionSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
  },
  downloadLink: {
    type: String,
    required: true,
  },
  forceUpdate: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AppVersion', AppVersionSchema);
