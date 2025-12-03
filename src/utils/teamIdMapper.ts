/**
 * Helper to infer MSN Team ID from team data
 * This is a temporary solution until we have a complete mapping
 */

// Known team ID mappings (football-data.org ID → MSN Sports ID)
const KNOWN_TEAM_MSN_IDS: Record<number, string> = {
  // Brasileirão Serie A teams
  // Note: Some teams have multiple IDs from different sources (football-data.org vs MSN)
  
  // Flamengo
  1783: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5981',
  5981: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5981',
  
  // Palmeiras
  1769: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1963',
  1963: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1963',
  
  // Corinthians
  1778: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1957',
  1957: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1957',
  
  // São Paulo
  1779: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1981',
  1981: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1981',
  
  // Santos
  1775: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1968',
  1968: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1968',
  
  // Athletico Paranaense  
  1776: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1977',
  1977: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1977',
  
  // Atlético Mineiro
  1764: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1977',
  
  // Fluminense
  1772: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1961',
  1961: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1961',
  
  // Botafogo
  1765: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1958',
  1958: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1958',
  
  // Vasco
  1771: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1974',
  1974: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1974',
  
  // Grêmio
  1784: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5926',
  5926: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5926',
  
  // Internacional
  1785: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1966',
  1966: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1966',
  
  // Bahia
  1759: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1955',
  1955: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1955',
  
  // Fortaleza
  2020: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2020',
  
  // Ceará
  2001: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2001',
  
  // Cruzeiro
  1754: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1954',
  1954: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1954',
  
  // Bragantino
  1999: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1999',
  
  // Vitória
  1962: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1962',
  
  // Juventude
  1980: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1980',
  
  // Sport Recife
  1959: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1959',
  
  // Mirassol
  21982: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_21982',
  
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
    console.log(`[inferMsnTeamId] Found MSN ID for team ${teamId} (${teamName}): ${knownMsnId}`);
    return knownMsnId;
  }

  // Could add fuzzy name matching here in the future
  console.log(`[inferMsnTeamId] No MSN ID found for team ${teamId} (${teamName})`);
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
