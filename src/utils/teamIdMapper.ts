/**
 * Helper to infer MSN Team ID from team data
 * This is a temporary solution until we have a complete mapping
 */

// Known team ID mappings (football-data.org ID → MSN Sports ID)
const KNOWN_TEAM_MSN_IDS: Record<number, string> = {
  // Brasileirão Serie A teams (examples from standings API)
  // Note: Some teams have multiple IDs from different sources
  1783: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5981', // Flamengo (alt ID)
  5981: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5981', // Flamengo
  2001: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2001', // Ceará
  1963: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1963', // Palmeiras
  1954: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1954', // Cruzeiro
  21982: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_21982', // Mirassol
  1961: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1961', // Fluminense
  1958: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1958', // Botafogo
  1955: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1955', // Bahia
  1981: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1981', // São Paulo
  5926: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_5926', // Grêmio
  1957: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1957', // Corinthians
  1977: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1977', // Atlético Mineiro
  1974: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1974', // Vasco da Gama
  1999: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1999', // Bragantino
  1962: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1962', // Vitória
  1968: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1968', // Santos
  1966: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1966', // Internacional
  2020: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_2020', // Fortaleza
  1980: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1980', // Juventude
  1959: 'SportRadar_Soccer_BrazilBrasileiroSerieA_2025_Team_1959', // Sport Recife
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
