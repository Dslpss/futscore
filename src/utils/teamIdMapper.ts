/**
 * Helper to infer MSN Team ID from team data
 * This is a temporary solution until we have a complete mapping
 */

// Known team ID mappings (football-data.org ID → MSN Sports ID)
const KNOWN_TEAM_MSN_IDS: Record<number, string> = {
  // Brasileirão Serie A teams
  // Note: Some teams have multiple IDs from different sources (football-data.org vs MSN)

  // Flamengo
  1783: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5981",
  5981: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5981",

  // Palmeiras
  1769: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1963",
  1963: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1963",

  // Corinthians
  1778: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1957",
  1957: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1957",

  // São Paulo
  1779: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1981",
  1981: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1981",

  // Santos
  1775: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1968",
  1968: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1968",

  // Athletico Paranaense (Note: Not in 2025 Serie A based on API - may need update)
  1776: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1949",
  1949: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1949",

  // Atlético Mineiro MG (CORRECTED: API shows 1977)
  1764: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1977",
  1977: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1977",

  // Fluminense (football-data.org uses 1765)
  1765: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1961",
  1772: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1961",
  1961: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1961",

  // Botafogo (football-data.org uses 1770)
  1770: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1958",
  1958: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1958",

  // Vasco
  1771: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1974",
  1974: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1974",

  // Grêmio
  1784: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5926",
  5926: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5926",

  // Internacional
  1785: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1966",
  1966: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1966",

  // Bahia
  1759: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1955",
  1955: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1955",

  // Fortaleza
  2020: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2020",
  1767: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2020",

  // Ceará
  2001: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2001",
  1766: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2001",

  // Cruzeiro
  1754: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1954",
  1954: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1954",

  // Bragantino
  1999: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1999",

  // Vitória
  1962: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1962",

  // Juventude
  1980: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1980",

  // Sport Recife
  1959: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1959",

  // Mirassol (football-data.org uses 4364, MSN uses 21982)
  4364: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_21982",
  21982: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_21982",

  // Cuiabá
  6684: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_6684",

  // Goiás
  1960: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1960",

  // Coritiba
  1782: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1982",
  1982: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1982",

  // América MG
  1973: "SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1973",

  // ============================================
  // BUNDESLIGA (Germany)
  // ============================================

  // Bayern Munich
  5: "SportRadar_Soccer_GermanyBundesliga_2025_Team_2672",
  2672: "SportRadar_Soccer_GermanyBundesliga_2025_Team_2672",

  // Borussia Dortmund
  4: "SportRadar_Soccer_GermanyBundesliga_2025_Team_2673",
  2673: "SportRadar_Soccer_GermanyBundesliga_2025_Team_2673",

  // Bayer Leverkusen
  3: "SportRadar_Soccer_GermanyBundesliga_2025_Team_2681",
  2681: "SportRadar_Soccer_GermanyBundesliga_2025_Team_2681",

  // RB Leipzig
  721: "SportRadar_Soccer_GermanyBundesliga_2025_Team_36360",
  36360: "SportRadar_Soccer_GermanyBundesliga_2025_Team_36360",

  // Eintracht Frankfurt
  19: "SportRadar_Soccer_GermanyBundesliga_2025_Team_2675",
  2675: "SportRadar_Soccer_GermanyBundesliga_2025_Team_2675",

  // ============================================
  // PREMIER LEAGUE (England)
  // ============================================

  // Manchester City
  65: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_17",
  17: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_17",

  // Arsenal
  57: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_18",
  18: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_18",

  // Liverpool
  64: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_44",
  44: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_44",

  // Chelsea
  61: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_38",
  38: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_38",

  // Manchester United
  66: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_35",
  35: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_35",

  // Tottenham
  73: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_33",
  33: "SportRadar_Soccer_EnglandPremierLeague_2025_Team_33",

  // ============================================
  // LA LIGA (Spain)
  // ============================================

  // Real Madrid
  86: "SportRadar_Soccer_SpainLaLiga_2025_Team_2829",
  2829: "SportRadar_Soccer_SpainLaLiga_2025_Team_2829",

  // Barcelona
  81: "SportRadar_Soccer_SpainLaLiga_2025_Team_2817",
  2817: "SportRadar_Soccer_SpainLaLiga_2025_Team_2817",

  // Atletico Madrid
  78: "SportRadar_Soccer_SpainLaLiga_2025_Team_2836",
  2836: "SportRadar_Soccer_SpainLaLiga_2025_Team_2836",

  // ============================================
  // SERIE A (Italy)
  // ============================================

  // Inter Milan
  108: "SportRadar_Soccer_ItalySerieA_2025_Team_2687",
  2687: "SportRadar_Soccer_ItalySerieA_2025_Team_2687",

  // AC Milan
  98: "SportRadar_Soccer_ItalySerieA_2025_Team_2692",
  2692: "SportRadar_Soccer_ItalySerieA_2025_Team_2692",

  // Juventus
  109: "SportRadar_Soccer_ItalySerieA_2025_Team_2685",
  2685: "SportRadar_Soccer_ItalySerieA_2025_Team_2685",

  // Napoli
  113: "SportRadar_Soccer_ItalySerieA_2025_Team_2714",
  2714: "SportRadar_Soccer_ItalySerieA_2025_Team_2714",

  // ============================================
  // LIGUE 1 (France) - IDs from MSN Sports API
  // ============================================

  // PSG (Paris Saint-Germain)
  524: "SportRadar_Soccer_FranceLigue1_2025_Team_1644",
  1644: "SportRadar_Soccer_FranceLigue1_2025_Team_1644",

  // Marseille (Olympique de Marseille)
  516: "SportRadar_Soccer_FranceLigue1_2025_Team_1641",
  1641: "SportRadar_Soccer_FranceLigue1_2025_Team_1641",

  // Lyon (Olympique Lyonnais)
  523: "SportRadar_Soccer_FranceLigue1_2025_Team_1649",
  1649: "SportRadar_Soccer_FranceLigue1_2025_Team_1649",

  // Monaco (AS Monaco)
  548: "SportRadar_Soccer_FranceLigue1_2025_Team_1653",
  1653: "SportRadar_Soccer_FranceLigue1_2025_Team_1653",

  // Lille (LOSC Lille)
  521: "SportRadar_Soccer_FranceLigue1_2025_Team_1643",
  1643: "SportRadar_Soccer_FranceLigue1_2025_Team_1643",

  // Nice (OGC Nice)
  522: "SportRadar_Soccer_FranceLigue1_2025_Team_1661",
  1661: "SportRadar_Soccer_FranceLigue1_2025_Team_1661",

  // Lens (RC Lens)
  546: "SportRadar_Soccer_FranceLigue1_2025_Team_1648",
  1648: "SportRadar_Soccer_FranceLigue1_2025_Team_1648",

  // Rennes (Stade Rennais)
  529: "SportRadar_Soccer_FranceLigue1_2025_Team_1658",
  1658: "SportRadar_Soccer_FranceLigue1_2025_Team_1658",

  // Toulouse FC
  1681: "SportRadar_Soccer_FranceLigue1_2025_Team_1681",

  // Strasbourg Alsace
  1659: "SportRadar_Soccer_FranceLigue1_2025_Team_1659",

  // FC Nantes
  1647: "SportRadar_Soccer_FranceLigue1_2025_Team_1647",

  // FC Lorient
  1656: "SportRadar_Soccer_FranceLigue1_2025_Team_1656",

  // Stade Brest 29
  1715: "SportRadar_Soccer_FranceLigue1_2025_Team_1715",

  // AJ Auxerre
  1646: "SportRadar_Soccer_FranceLigue1_2025_Team_1646",

  // Le Havre AC
  1662: "SportRadar_Soccer_FranceLigue1_2025_Team_1662",

  // Angers SCO
  1684: "SportRadar_Soccer_FranceLigue1_2025_Team_1684",

  // FC Metz
  1651: "SportRadar_Soccer_FranceLigue1_2025_Team_1651",

  // Paris FC
  6070: "SportRadar_Soccer_FranceLigue1_2025_Team_6070",

  // ============================================
  // PORTUGAL
  // ============================================

  // Benfica
  1903: "SportRadar_Soccer_PortugalPrimeiraLiga_2025_Team_2995",
  2995: "SportRadar_Soccer_PortugalPrimeiraLiga_2025_Team_2995",

  // Porto
  503: "SportRadar_Soccer_PortugalPrimeiraLiga_2025_Team_3002",
  3002: "SportRadar_Soccer_PortugalPrimeiraLiga_2025_Team_3002",

  // Sporting CP
  498: "SportRadar_Soccer_PortugalPrimeiraLiga_2025_Team_3008",
  3008: "SportRadar_Soccer_PortugalPrimeiraLiga_2025_Team_3008",

  // Add more as needed...
};

/**
 * Try to infer MSN Team ID from existing team data
 * @param teamId - Team ID from football-data.org
 * @param teamName - Team name (for fallback matching)
 * @param existingMsnId - Existing MSN ID if available
 * @returns MSN Team ID or undefined
 */
export function inferMsnTeamId(
  teamId: number,
  teamName?: string,
  existingMsnId?: string
): string | undefined {
  // If we already have an MSN ID, use it
  if (existingMsnId) {
    return existingMsnId;
  }

  // Try to find in known mappings
  const knownMsnId = KNOWN_TEAM_MSN_IDS[teamId];
  if (knownMsnId) {
    console.log(
      `[inferMsnTeamId] Found MSN ID for team ${teamId} (${teamName}): ${knownMsnId}`
    );
    return knownMsnId;
  }

  // Could add fuzzy name matching here in the future
  console.log(
    `[inferMsnTeamId] No MSN ID found for team ${teamId} (${teamName})`
  );
  return undefined;
}

/**
 * Add a new team ID mapping (for runtime discovery)
 * @param teamId - Team ID from football-data.org
 * @param msnId - MSN Sports Team ID
 */
export function addTeamMsnIdMapping(teamId: number, msnId: string) {
  if (!KNOWN_TEAM_MSN_IDS[teamId]) {
    KNOWN_TEAM_MSN_IDS[teamId] = msnId;
    console.log(`[inferMsnTeamId] Added new mapping: ${teamId} → ${msnId}`);
  }
}
