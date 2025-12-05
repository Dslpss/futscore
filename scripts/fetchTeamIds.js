// Script to fetch all Brasileirão teams from MSN API and show correct IDs
const axios = require('axios');

// From config.ts - use the correct MSN API settings
const MSN_BASE_URL = 'https://api.msn.com/sports';
const API_KEY = 'kO1dI4ptCTTylLkPL1ZTHYP8JhLKb8mRDoA5yotmNJ';
const BASE_PARAMS = {
  version: '1.0',
  cm: 'pt-br',
  scn: 'ANON',
  it: 'web',
};

const generateActivityId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

async function fetchBrasileiroTeams() {
  try {
    const now = new Date();
    const params = {
      ...BASE_PARAMS,
      apikey: API_KEY,
      activityId: generateActivityId(),
      id: 'Soccer_BrazilBrasileiroSerieA',
      sport: 'Soccer',
      datetime: now.toISOString().split('.')[0],
      tzoffset: '-3',
      withleaguereco: 'true',
      ocid: 'sports-league-landing',
    };

    console.log('Fetching Brasileirão teams from MSN API...\n');

    const response = await axios.get(`${MSN_BASE_URL}/livearoundtheleague`, { params });

    if (!response.data?.value?.[0]?.schedules) {
      console.log('No data found');
      return;
    }

    const schedules = response.data.value[0].schedules;
    const teamsMap = new Map();
    
    // Extract all unique teams from games
    schedules.forEach(schedule => {
      if (schedule.games) {
        schedule.games.forEach(game => {
          if (game.participants) {
            game.participants.forEach(participant => {
              const team = participant.team;
              if (team && team.id) {
                const fullMsnId = team.id;
                const numericId = fullMsnId.split('_').pop();
                const teamName = team.name?.localizedName || team.name?.rawName || 'Unknown';
                teamsMap.set(numericId, { name: teamName, fullId: fullMsnId });
              }
            });
          }
        });
      }
    });
    
    console.log('=== TIMES DO BRASILEIRÃO - IDs DA API MSN ===\n');
    console.log('// Copie isso para teamIdMapper.ts:\n');
    
    const sortedTeams = [...teamsMap.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
    
    sortedTeams.forEach(([numericId, data]) => {
      console.log(`  // ${data.name}`);
      console.log(`  ${numericId}: "${data.fullId}",`);
      console.log('');
    });
    
    console.log(`\nTotal: ${teamsMap.size} times encontrados`);

  } catch (error) {
    console.error('Error:', error.response?.status, error.message);
  }
}

fetchBrasileiroTeams();
