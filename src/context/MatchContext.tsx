import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useRef,
} from "react";
import { api } from "../services/api";
import { Match, League } from "../types";
import { CONFIG } from "../constants/config";
// registerForPushNotificationsAsync removido - já é chamado pelo AuthContext para evitar duplicatas
import { clearCache } from "../utils/clearCache";
import { useFavorites } from "./FavoritesContext";
import { matchService } from "../services/matchService";
import { registerBackgroundFetchAsync } from "../services/backgroundTask";

interface MatchContextData {
  liveMatches: Match[];
  todaysMatches: Match[];
  leagues: League[];
  loading: boolean;
  refreshMatches: () => Promise<void>;
}

const MatchContext = createContext<MatchContextData>({} as MatchContextData);

export const MatchProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [todaysMatches, setTodaysMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const { favoriteTeams } = useFavorites();

  // Refs para evitar inicialização duplicada
  const isInitialized = useRef(false);
  const favoriteTeamsRef = useRef(favoriteTeams);

  // Atualizar ref quando favoritos mudam
  useEffect(() => {
    favoriteTeamsRef.current = favoriteTeams;
  }, [favoriteTeams]);

  const fetchLeagues = async () => {
    const data = await api.getLeagues();
    setLeagues(data);
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      // Use the shared service - usar ref para evitar dependência no useEffect
      const { liveMatches: live, todaysMatches: today } =
        await matchService.checkMatchesAndNotify(favoriteTeamsRef.current);

      setLiveMatches(live);
      setTodaysMatches(today);
    } catch (error) {
      console.error("Error fetching matches", error);
    } finally {
      setLoading(false);
    }
  };

  // Efeito de INICIALIZAÇÃO - executa apenas uma vez
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    // Clear cache on first mount to ensure we get fresh data after API migration
    clearCache().then(() => {
      // NOTA: registerForPushNotificationsAsync() é chamado pelo AuthContext
      // Não chamar aqui para evitar notificações duplicadas
      registerBackgroundFetchAsync(); // Register background task
      fetchLeagues();
      fetchMatches();
    });

    // Polling every 60 seconds to respect API limits (10 req/min)
    const interval = setInterval(() => {
      fetchMatches();
    }, 60000);

    return () => clearInterval(interval);
  }, []); // Sem dependências - executa apenas na montagem

  return (
    <MatchContext.Provider
      value={{
        liveMatches,
        todaysMatches,
        leagues,
        loading,
        refreshMatches: fetchMatches,
      }}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatches = () => useContext(MatchContext);
