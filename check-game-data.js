// Verificar se os dados do jogo no livearoundtheleague já incluem detalhes
const axios = require('axios');

const checkGameData = async () => {
  try {
    const now = new Date();
    const params = {
      version: '1.0',
      cm: 'pt-br',
      scn: 'ANON',
      it: 'web',
      apikey: 'kO1dI4ptCTTylLkPL1ZTHYP8JhLKb8mRDoA5yotmNJ',
      activityId: 'test',
      id: 'Soccer_BrazilBrasileiroSerieA',
      sport: 'Soccer',
      datetime: now.toISOString().split('.')[0],
      tzoffset: Math.floor(-now.getTimezoneOffset() / 60).toString(),
      withleaguereco: 'true',
      ocid: 'sports-league-landing',
    };

    const response = await axios.get('https://api.msn.com/sports/livearoundtheleague', {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    const games = response.data.value[0].schedules || [];
    let firstGame = null;
    
    for (const schedule of games) {
      if (schedule.games && schedule.games.length > 0) {
        firstGame = schedule.games[0];
        break;
      }
    }

    if (firstGame) {
      console.log('\n📊 Dados disponíveis em um jogo:');
      console.log('Keys:', Object.keys(firstGame).join(', '));
      
      console.log('\n✅ Tem statistics?', !!firstGame.statistics);
      console.log('✅ Tem lineups?', !!firstGame.lineups);
      console.log('✅ Tem events?', !!firstGame.events);
      console.log('✅ Tem gameState?', !!firstGame.gameState);
      console.log('✅ Tem participants?', !!firstGame.participants);
      
      // Salvar um jogo completo para análise
      const fs = require('fs');
      fs.writeFileSync('sample-game-data.json', JSON.stringify(firstGame, null, 2));
      console.log('\n💾 Sample game saved to: sample-game-data.json');
      
      // Mostrar estrutura do gameState se existir
      if (firstGame.gameState) {
        console.log('\n📈 gameState keys:', Object.keys(firstGame.gameState).join(', '));
      }
      
      // Mostrar estrutura dos participants
      if (firstGame.participants && firstGame.participants.length > 0) {
        console.log('\n👥 participant keys:', Object.keys(firstGame.participants[0]).join(', '));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

checkGameData();
