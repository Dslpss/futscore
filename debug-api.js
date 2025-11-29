// Test football-data.org API
require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.EXPO_PUBLIC_API_KEY;
const API_URL = 'https://api.football-data.org/v4';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'X-Auth-Token': API_KEY,
  },
});

async function testBrasileirao() {
  console.log('\n=== Testing Brasileirão Série A ===\n');
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const response = await apiClient.get('/competitions/BSA/matches', {
      params: {
        dateFrom: today,
        dateTo: today,
      },
    });
    
    console.log(`✅ API Working!`);
    console.log(`Total matches today: ${response.data.resultSet.count}`);
    
    if (response.data.matches && response.data.matches.length > 0) {
      console.log('\nMatches found:\n');
      response.data.matches.forEach((match, idx) => {
        console.log(`${idx + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name}`);
        console.log(`   Status: ${match.status}`);
        console.log(`   Time: ${new Date(match.utcDate).toLocaleString()}`);
        console.log(`   Score: ${match.score.fullTime.home ?? '-'} - ${match.score.fullTime.away ?? '-'}\n`);
      });
    } else {
      console.log('\nNo matches found for today.');
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testChampionsLeague() {
  console.log('\n=== Testing Champions League ===\n');
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const response = await apiClient.get('/competitions/CL/matches', {
      params: {
        dateFrom: today,
        dateTo: today,
      },
    });
    
    console.log(`Total matches today: ${response.data.resultSet.count}`);
    
    if (response.data.matches && response.data.matches.length > 0) {
      console.log('\nMatches found:\n');
      response.data.matches.slice(0, 3).forEach((match, idx) => {
        console.log(`${idx + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name}`);
        console.log(`   Status: ${match.status}`);
        console.log(`   Time: ${new Date(match.utcDate).toLocaleString()}\n`);
      });
    } else {
      console.log('\nNo Champions League matches today.');
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function run() {
  await testBrasileirao();
  await testChampionsLeague();
  console.log('\n=== Test Complete ===\n');
}

run();
