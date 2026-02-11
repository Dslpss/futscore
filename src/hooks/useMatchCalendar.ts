import { useState, useCallback, useEffect } from "react";
import { msnSportsApi } from "../services/msnSportsApi";

const LEAGUE_IDS = [
  "Soccer_BrazilBrasileiroSerieA",
  "Soccer_BrazilCopaDoBrasil",
  "Soccer_InternationalClubsUEFAChampionsLeague",
  "Soccer_UEFAEuropaLeague",
  "Soccer_EnglandPremierLeague",
  "Soccer_GermanyBundesliga",
  "Soccer_ItalySerieA",
  "Soccer_FranceLigue1",
  "Soccer_SpainLaLiga",
  "Soccer_PortugalPrimeiraLiga",
  "Basketball_NBA",
  "Soccer_BrazilCarioca",
  "Soccer_BrazilMineiro",
  "Soccer_BrazilPaulistaSerieA1",
  "Soccer_BrazilGaucho",
];

export const useMatchCalendar = () => {
  const [daysWithMatches, setDaysWithMatches] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchMatchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      console.log("[useMatchCalendar] Fetching match calendar...");
      const allDates = new Set<string>();

      // Fetch calendars in parallel
      const calendarPromises = LEAGUE_IDS.map((id) =>
        msnSportsApi.getLeagueCalendar(id).catch(() => ({ dates: [] }))
      );

      const results = await Promise.all(calendarPromises);

      results.forEach((result) => {
        if (result && result.dates) {
          result.dates.forEach((date: string) => allDates.add(date));
        }
      });

      setDaysWithMatches(allDates);
      console.log(
        `[useMatchCalendar] Found ${allDates.size} days with matches`
      );
    } catch (error) {
      console.error("[useMatchCalendar] Error fetching match calendar:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    daysWithMatches,
    fetchMatchCalendar,
    loading,
  };
};
