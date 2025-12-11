// Check multiple ESPN endpoints for future games
async function checkAllEndpoints() {
  console.log("🔍 Verificando múltiplos endpoints ESPN...\n");
  
  const endpoints = [
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.intercontinental_cup/scoreboard",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.intercontinental_cup/scoreboard?dates=20251213",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.intercontinental_cup/scoreboard?limit=50",
    "https://site.api.espn.com/apis/personalized/v2/scoreboard/header?sport=soccer&league=fifa.intercontinental_cup",
  ];

  for (const url of endpoints) {
    console.log(`📡 ${url.split("?")[0].split("/").pop()}?${url.split("?")[1] || ""}`);
    
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const data = await res.json();
      
      // Count events
      const events = data.events || [];
      const sports = data.sports || [];
      
      if (events.length > 0) {
        console.log(`   ✅ ${events.length} eventos encontrados`);
        events.forEach(e => {
          const date = new Date(e.date).toLocaleString('pt-BR');
          console.log(`      - ${e.name || e.shortName} (${date})`);
        });
      } else if (sports.length > 0) {
        // Header format
        let count = 0;
        sports.forEach(s => {
          s.leagues?.forEach(l => {
            l.events?.forEach(e => {
              count++;
              const date = new Date(e.date).toLocaleString('pt-BR');
              console.log(`      - ${e.shortName || e.name} (${date})`);
            });
          });
        });
        if (count > 0) console.log(`   ✅ ${count} eventos via sports/leagues`);
      } else {
        console.log(`   ❌ Sem eventos`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
    console.log("");
  }
}

checkAllEndpoints();
