const express = require('express');
const axios = require('axios');
const router = express.Router();

// Football API configuration
const FOOTBALL_API_URL = 'https://api.football-data.org/v4';
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;

// Create axios client for football API
const footballClient = axios.create({
  baseURL: FOOTBALL_API_URL,
  headers: {
    'X-Auth-Token': FOOTBALL_API_KEY,
  },
});

// GET /api/football/competitions/:code/matches
// Proxy for fetching fixtures of a competition
router.get('/competitions/:code/matches', async (req, res) => {
  try {
    const { code } = req.params;
    const { dateFrom, dateTo } = req.query;

    console.log(`[Football API] Fetching matches for ${code} from ${dateFrom} to ${dateTo}`);

    const response = await footballClient.get(`/competitions/${code}/matches`, {
      params: { dateFrom, dateTo },
    });

    res.json(response.data);
  } catch (error) {
    console.error('[Football API] Error fetching matches:', error.response?.data || error.message);
    
    // Return appropriate error to client
    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data.message || 'Error fetching matches',
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/football/matches/:id
// Proxy for fetching match details
router.get('/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[Football API] Fetching match details for ${id}`);

    const response = await footballClient.get(`/matches/${id}`);

    res.json(response.data);
  } catch (error) {
    console.error('[Football API] Error fetching match details:', error.response?.data || error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data.message || 'Error fetching match details',
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/football/competitions/:code/teams
// Proxy for fetching teams in a competition
router.get('/competitions/:code/teams', async (req, res) => {
  try {
    const { code } = req.params;

    console.log(`[Football API] Fetching teams for ${code}`);

    const response = await footballClient.get(`/competitions/${code}/teams`);

    res.json(response.data);
  } catch (error) {
    console.error('[Football API] Error fetching teams:', error.response?.data || error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data.message || 'Error fetching teams',
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/football/teams/:id
// Proxy for fetching team details including squad
router.get('/teams/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[Football API] Fetching team details for ${id}`);

    const response = await footballClient.get(`/teams/${id}`);

    res.json(response.data);
  } catch (error) {
    console.error('[Football API] Error fetching team details:', error.response?.data || error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data.message || 'Error fetching team details',
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

module.exports = router;
