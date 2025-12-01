const express = require('express');
const router = express.Router();
const Warning = require('../models/Warning');
const AppVersion = require('../models/AppVersion');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to check if user is admin
const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// --- WARNINGS ---

// Get all warnings (Public for app)
router.get('/warnings', async (req, res) => {
  try {
    const warnings = await Warning.find({ active: true }).sort({ createdAt: -1 });
    res.json(warnings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create warning (Admin)
router.post('/warnings', authMiddleware, async (req, res) => {
  try {
    const newWarning = new Warning(req.body);
    const savedWarning = await newWarning.save();
    res.json(savedWarning);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete warning (Admin)
router.delete('/warnings/:id', authMiddleware, async (req, res) => {
  try {
    await Warning.findByIdAndDelete(req.params.id);
    res.json({ message: 'Warning deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- APP VERSION ---

// Get latest version (Public for app)
router.get('/version', async (req, res) => {
  try {
    const latestVersion = await AppVersion.findOne().sort({ createdAt: -1 });
    res.json(latestVersion || { version: '1.0.0', downloadLink: '', forceUpdate: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Set new version (Admin)
router.post('/version', authMiddleware, async (req, res) => {
  try {
    const newVersion = new AppVersion(req.body);
    const savedVersion = await newVersion.save();
    res.json(savedVersion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
