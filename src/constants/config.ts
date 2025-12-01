export const CONFIG = {
  BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://futscore-production.up.railway.app',
  CACHE_DURATION: {
    LEAGUES: 7 * 24 * 60 * 60 * 1000, // 7 days
    FIXTURES: 24 * 60 * 60 * 1000, // 24 hours
    TODAY_FIXTURES: 60 * 1000, // 1 minute
    LIVE: 30 * 60 * 1000, // 30 minutes (polling interval)
    COUNTRIES: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  LEAGUE_IDS: {
    BRASILEIRAO: 'BSA',
    CHAMPIONS_LEAGUE: 'CL',
    LA_LIGA: 'PD',
    // Note: Libertadores not available in free tier
  }
};
