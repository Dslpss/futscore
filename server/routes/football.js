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

// ESPN API configuration
const ESPN_API_URL = 'https://site.web.api.espn.com';

// List of ESPN league slugs that we support
const ESPN_LEAGUES = [
  'fifa.intercontinental_cup',
  'bra.copa_do_brazil',
  'uefa.champions',
  'uefa.europa',
];

// Helper to fetch ESPN event details
async function fetchEspnEventDetails(eventId, leagueSlug = 'fifa.intercontinental_cup') {
  try {
    const url = `${ESPN_API_URL}/apis/site/v2/sports/soccer/${leagueSlug}/scoreboard`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });
    
    // Find the specific event
    const events = response.data?.events || [];
    const event = events.find(e => e.id === String(eventId));
    
    if (event) {
      return {
        source: 'espn',
        id: event.id,
        name: event.name,
        date: event.date,
        status: event.status?.type?.state || 'pre',
        statusDetail: event.status?.type?.detail,
        venue: event.competitions?.[0]?.venue?.fullName,
        competitors: event.competitions?.[0]?.competitors?.map(c => ({
          id: c.id,
          name: c.team?.displayName,
          abbreviation: c.team?.abbreviation,
          logo: c.team?.logo,
          homeAway: c.homeAway,
          score: c.score,
          winner: c.winner,
          form: c.form,
          record: c.records?.[0]?.summary,
        })),
        league: {
          id: leagueSlug,
          name: response.data?.leagues?.[0]?.name || 'Copa Intercontinental',
          logo: response.data?.leagues?.[0]?.logos?.[0]?.href,
        },
      };
    }
    return null;
  } catch (error) {
    console.error('[ESPN API] Error fetching event:', error.message);
    return null;
  }
}

// GET /api/football/matches/:id
// Proxy for fetching match details (supports both football-data.org and ESPN)
router.get('/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { source } = req.query; // Optional: 'espn' to force ESPN lookup

    console.log(`[Football API] Fetching match details for ${id}`);

    // If source is ESPN or ID is in ESPN range (>700000), try ESPN first
    if (source === 'espn' || parseInt(id) > 700000) {
      console.log(`[Football API] Trying ESPN API for match ${id}`);
      
      // Try each ESPN league until we find the match
      for (const leagueSlug of ESPN_LEAGUES) {
        const espnData = await fetchEspnEventDetails(id, leagueSlug);
        if (espnData) {
          console.log(`[Football API] Found match ${id} in ESPN ${leagueSlug}`);
          return res.json(espnData);
        }
      }
      
      console.log(`[Football API] Match ${id} not found in ESPN, trying football-data.org`);
    }

    // Fallback to football-data.org
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

// GET /api/football/espn/scoreboard/:league
// Fetch ESPN scoreboard for a specific league
router.get('/espn/scoreboard/:league', async (req, res) => {
  try {
    const { league } = req.params;
    
    console.log(`[ESPN API] Fetching scoreboard for ${league}`);
    
    const response = await axios.get(`${ESPN_API_URL}/apis/site/v2/sports/soccer/${league}/scoreboard`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('[ESPN API] Error fetching scoreboard:', error.message);
    res.status(500).json({ error: 'Error fetching ESPN scoreboard' });
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
