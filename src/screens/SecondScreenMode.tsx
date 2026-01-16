import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import {
  X,
  Circle,
  Clock,
  Zap,
  Moon,
  Sun,
  AlertTriangle,
  RefreshCw,
} from "lucide-react-native";
import { useMatches } from "../context/MatchContext";

const { width, height } = Dimensions.get("window");

interface MatchEvent {
  id: string;
  type: "goal" | "yellow" | "red" | "sub" | "var" | "halftime" | "kickoff";
  minute: string;
  team: "home" | "away";
  player?: string;
  detail?: string;
}

export const SecondScreenMode = ({ navigation, route }: any) => {
  const { liveMatches } = useMatches();
  const [selectedMatch, setSelectedMatch] = useState<any>(route?.params?.match || null);
  const [dimMode, setDimMode] = useState(false);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Ativar wake lock quando entrar na tela
  useEffect(() => {
    activateKeepAwakeAsync("second-screen-mode");
    console.log("[SecondScreen] Wake lock ativado");

    return () => {
      deactivateKeepAwake("second-screen-mode");
      console.log("[SecondScreen] Wake lock desativado");
    };
  }, []);

  // Atualizar dados periodicamente
  useEffect(() => {
    refreshInterval.current = setInterval(() => {
      setLastUpdate(new Date());
      
      // Se temos um jogo selecionado, atualizar dados
      if (selectedMatch && liveMatches) {
        const updated = liveMatches.find((m: any) => m.id === selectedMatch.id);
        if (updated) {
          setSelectedMatch(updated);
        }
      }
    }, 30000); // Atualiza a cada 30 segundos

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [selectedMatch, liveMatches]);

  // Simular eventos do jogo (em produção viriam da API)
  useEffect(() => {
    if (selectedMatch) {
      // Criar eventos baseados no placar
      const mockEvents: MatchEvent[] = [];
      
      // Gols do time da casa
      for (let i = 0; i < (selectedMatch.homeScore || 0); i++) {
        mockEvents.push({
          id: `home-goal-${i}`,
          type: "goal",
          minute: `${Math.floor(Math.random() * 45) + (i * 15)}'`,
          team: "home",
          player: "Jogador",
        });
      }
      
      // Gols do visitante
      for (let i = 0; i < (selectedMatch.awayScore || 0); i++) {
        mockEvents.push({
          id: `away-goal-${i}`,
          type: "goal",
          minute: `${Math.floor(Math.random() * 45) + (i * 15)}'`,
          team: "away",
          player: "Jogador",
        });
      }
      
      setEvents(mockEvents.sort((a, b) => parseInt(a.minute) - parseInt(b.minute)));
    }
  }, [selectedMatch?.homeScore, selectedMatch?.awayScore]);

  const getStatusText = (match: any) => {
    if (!match) return "";
    
    // Estrutura do Match: fixture.status.short
    const statusShort = match.fixture?.status?.short?.toUpperCase() || "";
    const elapsed = match.fixture?.status?.elapsed;
    
    // Status ao vivo
    if (["1H", "2H", "ET", "P", "LIVE", "HT", "BT"].includes(statusShort)) {
      if (statusShort === "HT") return "INTERVALO";
      if (elapsed) return `${elapsed}'`;
      return "AO VIVO";
    }
    
    // Finalizado
    if (["FT", "AET", "PEN", "AWD", "WO"].includes(statusShort)) {
      return "ENCERRADO";
    }
    
    // Agendado
    if (["NS", "TBD", "TIMED", "PST", "CANC", "ABD", "SUSP"].includes(statusShort)) {
      const time = new Date(match.fixture?.date);
      return time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    
    return statusShort || "AO VIVO";
  };

  const isLive = (match: any) => {
    const statusShort = match?.fixture?.status?.short?.toUpperCase() || "";
    return ["1H", "2H", "ET", "P", "LIVE", "HT", "BT"].includes(statusShort);
  };

  // Helper para extrair dados do match na estrutura correta
  const getMatchData = (match: any) => ({
    id: match.fixture?.id?.toString() || match.id,
    homeTeam: match.teams?.home?.name || "Time Casa",
    awayTeam: match.teams?.away?.name || "Time Fora",
    homeLogo: match.teams?.home?.logo,
    awayLogo: match.teams?.away?.logo,
    homeScore: match.goals?.home ?? 0,
    awayScore: match.goals?.away ?? 0,
    league: match.league?.name || "",
    elapsed: match.fixture?.status?.elapsed,
  });

  const renderMatchSelector = () => {
    const availableMatches = liveMatches?.filter((m: any) => isLive(m)) || [];
    
    if (availableMatches.length === 0) {
      return (
        <View style={styles.noMatchesContainer}>
          <AlertTriangle size={48} color="#71717a" />
          <Text style={styles.noMatchesText}>Nenhum jogo ao vivo no momento</Text>
          <Text style={styles.noMatchesSubtext}>Volte quando tiver partidas em andamento</Text>
        </View>
      );
    }

    return (
      <View style={styles.matchSelectorContainer}>
        <Text style={styles.selectTitle}>Selecione um jogo para acompanhar:</Text>
        <ScrollView style={styles.matchList} showsVerticalScrollIndicator={false}>
          {availableMatches.map((match: any) => {
            const data = getMatchData(match);
            return (
              <TouchableOpacity
                key={data.id}
                style={styles.matchOption}
                onPress={() => setSelectedMatch(match)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["rgba(34, 197, 94, 0.1)", "rgba(0,0,0,0)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.matchOptionGradient}
                >
                  <View style={styles.matchOptionTeams}>
                    <Text style={styles.matchOptionTeamName}>{data.homeTeam}</Text>
                    <Text style={styles.matchOptionScore}>
                      {data.homeScore} - {data.awayScore}
                    </Text>
                    <Text style={styles.matchOptionTeamName}>{data.awayTeam}</Text>
                  </View>
                  <View style={styles.liveIndicator}>
                    <Circle size={8} color="#22c55e" fill="#22c55e" />
                    <Text style={styles.liveText}>{getStatusText(match)}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSelectedMatch = () => {
    if (!selectedMatch) return null;

    const data = getMatchData(selectedMatch);

    return (
      <View style={[styles.mainMatchContainer, dimMode && styles.dimBackground]}>
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          {isLive(selectedMatch) && (
            <View style={styles.pulseDot}>
              <Circle size={10} color="#22c55e" fill="#22c55e" />
            </View>
          )}
          <Text style={[styles.statusText, dimMode && styles.dimText]}>
            {getStatusText(selectedMatch)}
          </Text>
        </View>

        {/* Main Score Display */}
        <View style={styles.scoreContainer}>
          {/* Home Team */}
          <View style={styles.teamContainer}>
            {data.homeLogo && (
              <Image 
                source={{ uri: data.homeLogo }} 
                style={[styles.teamLogo, dimMode && styles.dimImage]} 
              />
            )}
            <Text style={[styles.teamName, dimMode && styles.dimText]} numberOfLines={2}>
              {data.homeTeam}
            </Text>
          </View>

          {/* Score */}
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreNumber, dimMode && styles.dimScore]}>
              {data.homeScore}
            </Text>
            <Text style={[styles.scoreSeparator, dimMode && styles.dimText]}>:</Text>
            <Text style={[styles.scoreNumber, dimMode && styles.dimScore]}>
              {data.awayScore}
            </Text>
          </View>

          {/* Away Team */}
          <View style={styles.teamContainer}>
            {data.awayLogo && (
              <Image 
                source={{ uri: data.awayLogo }} 
                style={[styles.teamLogo, dimMode && styles.dimImage]} 
              />
            )}
            <Text style={[styles.teamName, dimMode && styles.dimText]} numberOfLines={2}>
              {data.awayTeam}
            </Text>
          </View>
        </View>

        {/* Competition */}
        <Text style={[styles.competitionName, dimMode && styles.dimText]}>
          {data.league}
        </Text>

        {/* Events Timeline */}
        {events.length > 0 && !dimMode && (
          <View style={styles.eventsContainer}>
            <Text style={styles.eventsTitle}>EVENTOS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {events.map((event) => (
                <View 
                  key={event.id} 
                  style={[
                    styles.eventBadge,
                    event.team === "home" ? styles.eventHome : styles.eventAway
                  ]}
                >
                  <Text style={styles.eventIcon}>
                    {event.type === "goal" ? "⚽" : 
                     event.type === "yellow" ? "🟨" : 
                     event.type === "red" ? "🟥" : "📋"}
                  </Text>
                  <Text style={styles.eventMinute}>{event.minute}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Last Update */}
        <View style={styles.updateInfo}>
          <RefreshCw size={12} color="#71717a" />
          <Text style={styles.updateText}>
            Atualizado: {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, dimMode && styles.containerDim]}>
      <StatusBar barStyle="light-content" hidden={dimMode} />

      {/* Header Controls */}
      <View style={[styles.header, dimMode && styles.headerDim]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <X size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Zap size={16} color="#22c55e" />
          <Text style={styles.headerTitle}>Segunda Tela</Text>
        </View>

        <View style={styles.headerRight}>
          {selectedMatch && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setSelectedMatch(null)}
            >
              <RefreshCw size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.headerButton, dimMode && styles.dimModeActive]}
            onPress={() => setDimMode(!dimMode)}
          >
            {dimMode ? (
              <Sun size={20} color="#fbbf24" />
            ) : (
              <Moon size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      {selectedMatch ? renderSelectedMatch() : renderMatchSelector()}

      {/* Wake Lock Indicator */}
      <View style={styles.wakeLockBadge}>
        <View style={styles.wakeLockDot} />
        <Text style={styles.wakeLockText}>Tela sempre ligada</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  containerDim: {
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerDim: {
    opacity: 0.3,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  dimModeActive: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
  },

  // Match Selector
  matchSelectorContainer: {
    flex: 1,
    padding: 16,
  },
  selectTitle: {
    color: "#a1a1aa",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  matchList: {
    flex: 1,
  },
  matchOption: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  matchOptionGradient: {
    padding: 16,
  },
  matchOptionTeams: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  matchOptionTeamName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  matchOptionScore: {
    color: "#22c55e",
    fontSize: 20,
    fontWeight: "800",
    marginHorizontal: 16,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  liveText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
  },

  // No Matches
  noMatchesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  noMatchesText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  noMatchesSubtext: {
    color: "#71717a",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },

  // Main Match Display
  mainMatchContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dimBackground: {
    opacity: 0.6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 40,
  },
  pulseDot: {
    // Animação de pulse pode ser adicionada
  },
  statusText: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // Score Display
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 24,
  },
  teamContainer: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  teamLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  dimImage: {
    opacity: 0.5,
  },
  teamName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 100,
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  },
  scoreNumber: {
    color: "#fff",
    fontSize: 72,
    fontWeight: "800",
    lineHeight: 80,
  },
  dimScore: {
    color: "#4ade80",
    opacity: 0.8,
  },
  scoreSeparator: {
    color: "#71717a",
    fontSize: 48,
    fontWeight: "300",
    marginHorizontal: 8,
  },
  dimText: {
    opacity: 0.5,
  },

  competitionName: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 32,
  },

  // Events
  eventsContainer: {
    width: "100%",
    marginTop: 24,
  },
  eventsTitle: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: "center",
  },
  eventBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 4,
    gap: 6,
  },
  eventHome: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  eventAway: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  eventIcon: {
    fontSize: 14,
  },
  eventMinute: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Update Info
  updateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 32,
  },
  updateText: {
    color: "#71717a",
    fontSize: 11,
  },

  // Wake Lock Badge
  wakeLockBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 32,
  },
  wakeLockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  wakeLockText: {
    color: "#71717a",
    fontSize: 10,
  },
});

export default SecondScreenMode;
