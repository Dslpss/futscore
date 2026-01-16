import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useRef,
} from "react";
import { AppState, AppStateStatus } from "react-native";
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
      const result = await matchService.checkMatchesAndNotify(favoriteTeamsRef.current);

      // Só atualiza o estado se o resultado não for null (chamada não foi ignorada)
      if (result !== null) {
        setLiveMatches(result.liveMatches);
        setTodaysMatches(result.todaysMatches);
      }
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
  }, []); // Sem dependências - executa apenas na montagem inicial

  // Efeito de POLLING DINÂMICO - reage a mudanças nos jogos ao vivo
  useEffect(() => {
    // Dynamic polling based on live matches
    const pollingInterval = liveMatches.length > 0 ? 15000 : 60000;
    
    console.log(`[MatchContext] Setting polling interval to ${pollingInterval}ms`);

    const interval = setInterval(() => {
      if (!loading) {
        // Silent refresh (keep loading=false unless essential)
        // We use a separate internal function or just call matchService directly
        // But for now calling fetchMatches is fine, just be careful with setLoading(true) there
        // Optimized: only fetch if not already loading
        matchService.checkMatchesAndNotify(favoriteTeamsRef.current)
          .then((result) => {
            // Só atualiza se o resultado não for null (chamada não foi ignorada)
            if (result !== null) {
              setLiveMatches(result.liveMatches);
              setTodaysMatches(result.todaysMatches);
            }
          })
          .catch(err => console.error("Polling error", err));
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [liveMatches.length, loading]); // Recria o intervalo quando o número de jogos ao vivo muda

  // Efeito para RECARREGAR quando o app volta do background
  useEffect(() => {
    const appStateRef = { current: AppState.currentState };
    
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // App voltou para foreground (estava em background/inactive e agora está active)
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("[MatchContext] App returned from background, refreshing matches...");
        // Refresh matches silently
        matchService.checkMatchesAndNotify(favoriteTeamsRef.current)
          .then((result) => {
            // Só atualiza se o resultado não for null (chamada não foi ignorada)
            if (result !== null) {
              setLiveMatches(result.liveMatches);
              setTodaysMatches(result.todaysMatches);
              console.log("[MatchContext] Matches refreshed after background return");
            } else {
              console.log("[MatchContext] Refresh skipped (called too soon)");
            }
          })
          .catch(err => console.error("[MatchContext] Error refreshing after background:", err));
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

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
