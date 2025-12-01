const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get user's favorite teams
router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('favoriteTeams');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ favoriteTeams: user.favoriteTeams || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user's favorite teams (replace entire list)
router.put('/favorites', authMiddleware, async (req, res) => {
  try {
    const { favoriteTeams } = req.body;

    if (!Array.isArray(favoriteTeams)) {
      return res.status(400).json({ message: 'favoriteTeams must be an array' });
    }

    // Validate each team object
    for (const team of favoriteTeams) {
      if (!team.id || !team.name || !team.logo || !team.country) {
        return res.status(400).json({ 
          message: 'Each team must have id, name, logo, and country' 
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { favoriteTeams },
      { new: true }
    ).select('favoriteTeams');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ favoriteTeams: user.favoriteTeams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a single team to favorites
router.post('/favorites/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, logo, country } = req.body;

    if (!name || !logo || !country) {
      return res.status(400).json({ 
        message: 'Team name, logo, and country are required' 
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if team already exists
    const teamExists = user.favoriteTeams.some(
      team => team.id === parseInt(teamId)
    );

    if (teamExists) {
      return res.status(400).json({ message: 'Team already in favorites' });
    }

    // Add team to favorites
    user.favoriteTeams.push({
      id: parseInt(teamId),
      name,
      logo,
      country,
    });

    await user.save();

    res.json({ favoriteTeams: user.favoriteTeams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove a team from favorites
router.delete('/favorites/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove team from favorites
    user.favoriteTeams = user.favoriteTeams.filter(
      team => team.id !== parseInt(teamId)
    );

    await user.save();

    res.json({ favoriteTeams: user.favoriteTeams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
