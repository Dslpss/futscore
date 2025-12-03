import { Statistics } from "../types";

/**
 * Transform MSN Sports statistics to app Statistics format
 */
export function transformMsnStatsToStatistics(
  msnStatsData: any,
  homeTeamId: string,
  awayTeamId: string
): Statistics[] {
  if (
    !msnStatsData ||
    !msnStatsData.statistics ||
    !Array.isArray(msnStatsData.statistics)
  ) {
    return [];
  }

  const stats = msnStatsData.statistics;

  // Find home and away team stats
  const homeStats = stats.find((s: any) => s.teamId === homeTeamId);
  const awayStats = stats.find((s: any) => s.teamId === awayTeamId);

  if (!homeStats || !awayStats) {
    return [];
  }

  // Helper to format percentage
  const formatPercent = (value: any) => {
    if (value === undefined || value === null) return null;
    return typeof value === "number" ? `${value}%` : value;
  };

  // Helper to safely get value
  const getValue = (obj: any, key: string) => {
    return obj?.[key] !== undefined ? obj[key] : null;
  };

  // Define all statistics to collect
  const statsConfig = [
    // Posse e Passes
    {
      type: "Posse de Bola",
      homeKey: "ballPossessionPercentage",
      awayKey: "ballPossessionPercentage",
      format: formatPercent,
    },
    { type: "Passes", homeKey: "passes", awayKey: "passes" },
    {
      type: "Passes Certos",
      homeKey: "passesAccurate",
      awayKey: "passesAccurate",
    },
    {
      type: "Precisão de Passes",
      homeKey: "passAccuracy",
      awayKey: "passAccuracy",
      format: formatPercent,
    },

    // Finalizações
    { type: "Finalizações", homeKey: "shotsTotal", awayKey: "shotsTotal" },
    {
      type: "Chutes no Gol",
      homeKey: "shotsOnTarget",
      awayKey: "shotsOnTarget",
    },
    {
      type: "Chutes para Fora",
      homeKey: "shotsOffTarget",
      awayKey: "shotsOffTarget",
    },
    {
      type: "Chutes Bloqueados",
      homeKey: "shotsBlocked",
      awayKey: "shotsBlocked",
    },

    // Defesa
    {
      type: "Defesas do Goleiro",
      homeKey: "shotsSaved",
      awayKey: "shotsSaved",
    },
    { type: "Desarmes", homeKey: "tackles", awayKey: "tackles" },
    {
      type: "Interceptações",
      homeKey: "interceptions",
      awayKey: "interceptions",
    },
    { type: "Cortes", homeKey: "clearances", awayKey: "clearances" },

    // Bola Parada
    { type: "Escanteios", homeKey: "cornerKicks", awayKey: "cornerKicks" },
    { type: "Cruzamentos", homeKey: "crosses", awayKey: "crosses" },
    { type: "Cobranças de Falta", homeKey: "freeKicks", awayKey: "freeKicks" },

    // Infrações
    { type: "Impedimentos", homeKey: "offsides", awayKey: "offsides" },
    { type: "Faltas", homeKey: "fouls", awayKey: "fouls" },
    {
      type: "Cartões Amarelos",
      homeKey: "yellowCards",
      awayKey: "yellowCards",
    },
    { type: "Cartões Vermelhos", homeKey: "redCards", awayKey: "redCards" },

    // Duelos
    { type: "Duelos Ganhos", homeKey: "duelsWon", awayKey: "duelsWon" },
    {
      type: "Duelos Aéreos Ganhos",
      homeKey: "aerialDuelsWon",
      awayKey: "aerialDuelsWon",
    },

    // Outros
    { type: "Grandes Chances", homeKey: "bigChances", awayKey: "bigChances" },
    {
      type: "Grandes Chances Perdidas",
      homeKey: "bigChancesMissed",
      awayKey: "bigChancesMissed",
    },
    {
      type: "Toques na Área",
      homeKey: "touchesInBox",
      awayKey: "touchesInBox",
    },
    {
      type: "Dribles Certos",
      homeKey: "dribblesSuccessful",
      awayKey: "dribblesSuccessful",
    },
  ];

  // Build statistics array - only include stats that have values
  const homeStatistics: { type: string; value: any }[] = [];
  const awayStatistics: { type: string; value: any }[] = [];

  for (const config of statsConfig) {
    let homeValue = getValue(homeStats, config.homeKey);
    let awayValue = getValue(awayStats, config.awayKey);

    // Skip if both values are null/undefined
    if (homeValue === null && awayValue === null) continue;

    // Apply formatting if specified
    if (config.format) {
      homeValue = config.format(homeValue);
      awayValue = config.format(awayValue);
    }

    // Skip if both formatted values are null
    if (homeValue === null && awayValue === null) continue;

    // Default to 0 if one side has value and other doesn't
    homeValue = homeValue ?? 0;
    awayValue = awayValue ?? 0;

    homeStatistics.push({ type: config.type, value: homeValue });
    awayStatistics.push({ type: config.type, value: awayValue });
  }

  if (homeStatistics.length === 0) {
    return [];
  }

  return [
    {
      team: { id: 0, name: "home", logo: "" },
      statistics: homeStatistics,
    },
    {
      team: { id: 1, name: "away", logo: "" },
      statistics: awayStatistics,
    },
  ];
}
