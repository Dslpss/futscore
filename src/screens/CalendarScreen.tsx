import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
  StatusBar,
  Platform,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Star,
  Clock,
  MapPin,
} from "lucide-react-native";
import { useFavorites } from "../context/FavoritesContext";
import { msnSportsApi } from "../services/msnSportsApi";
import { transformMsnGameToMatch } from "../utils/msnTransformer";
import { Match } from "../types";

// Configurar locale para português
LocaleConfig.locales["pt-br"] = {
  monthNames: [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ],
  monthNamesShort: [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ],
  dayNames: [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ],
  dayNamesShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  today: "Hoje",
};
LocaleConfig.defaultLocale = "pt-br";

// Mapeamento de times favoritos para ligas MSN
const LEAGUE_MAPPINGS: Record<string, string[]> = {
  // Brasileirão
  Soccer_BrazilBrasileiroSerieA: [
    "Flamengo",
    "Palmeiras",
    "Corinthians",
    "São Paulo",
    "Santos",
    "Grêmio",
    "Internacional",
    "Cruzeiro",
    "Atlético Mineiro",
    "Fluminense",
    "Vasco",
    "Botafogo",
    "Bahia",
    "Fortaleza",
    "Athletico Paranaense",
    "Sport",
    "Ceará",
    "Goiás",
    "Coritiba",
    "América Mineiro",
  ],
  // Premier League
  Soccer_EnglandPremierLeague: [
    "Manchester United",
    "Manchester City",
    "Liverpool",
    "Arsenal",
    "Chelsea",
    "Tottenham",
    "Newcastle",
    "Aston Villa",
    "Brighton",
    "West Ham",
  ],
  // La Liga
  Soccer_SpainLaLiga: [
    "Real Madrid",
    "Barcelona",
    "Atletico Madrid",
    "Sevilla",
    "Valencia",
    "Real Betis",
    "Athletic Bilbao",
    "Real Sociedad",
    "Villarreal",
  ],
  // Serie A
  Soccer_ItalySerieA: [
    "Juventus",
    "Inter Milan",
    "AC Milan",
    "Napoli",
    "Roma",
    "Lazio",
    "Atalanta",
    "Fiorentina",
  ],
  // Bundesliga
  Soccer_GermanyBundesliga: [
    "Bayern Munich",
    "Borussia Dortmund",
    "RB Leipzig",
    "Bayer Leverkusen",
    "Eintracht Frankfurt",
  ],
  // Ligue 1
  Soccer_FranceLigue1: [
    "PSG",
    "Paris Saint-Germain",
    "Marseille",
    "Lyon",
    "Monaco",
    "Lille",
  ],
  // Champions League
  Soccer_InternationalClubsUEFAChampionsLeague: [],
  // Europa League
  Soccer_UEFAEuropaLeague: [],
  // Liga Portugal
  Soccer_PortugalPrimeiraLiga: ["Benfica", "Porto", "Sporting CP", "Braga"],
};

const ALL_LEAGUES = Object.keys(LEAGUE_MAPPINGS);

interface MarkedDate {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  customStyles?: any;
}

interface MatchDay {
  date: string;
  matches: Match[];
}

export function CalendarScreen({ navigation }: any) {
  const { favoriteTeams, favoriteMatches } = useFavorites();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [markedDates, setMarkedDates] = useState<Record<string, MarkedDate>>(
    {}
  );
  const [matchesForDate, setMatchesForDate] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allDatesWithMatches, setAllDatesWithMatches] = useState<Set<string>>(
    new Set()
  );

  // Carregar calendário de todas as ligas
  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const allDates = new Set<string>();

      // Buscar calendário de todas as ligas
      const promises = ALL_LEAGUES.map((leagueId) =>
        msnSportsApi.getLeagueCalendar(leagueId)
      );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        result.dates.forEach((date) => allDates.add(date));
      });

      setAllDatesWithMatches(allDates);

      // Marcar datas no calendário
      const marked: Record<string, MarkedDate> = {};
      const today = new Date().toISOString().split("T")[0];

      allDates.forEach((date) => {
        marked[date] = {
          marked: true,
          dotColor: "#22c55e",
        };
      });

      // Destacar data selecionada
      if (marked[selectedDate]) {
        marked[selectedDate] = {
          ...marked[selectedDate],
          selected: true,
          selectedColor: "#22c55e",
        };
      } else {
        marked[selectedDate] = {
          selected: true,
          selectedColor: "#3b82f6",
        };
      }

      // Destacar hoje
      if (today !== selectedDate) {
        marked[today] = {
          ...marked[today],
          customStyles: {
            container: {
              borderWidth: 1,
              borderColor: "#22c55e",
            },
          },
        };
      }

      setMarkedDates(marked);
    } catch (error) {
      console.error("[Calendar] Error loading calendar:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Carregar jogos para uma data específica
  const loadMatchesForDate = useCallback(
    async (date: string) => {
      setLoadingMatches(true);
      try {
        const allMatches: Match[] = [];

        // Buscar jogos de todas as ligas para a data
        const promises = ALL_LEAGUES.map((leagueId) =>
          msnSportsApi.getScheduleByDate(leagueId, date)
        );

        const results = await Promise.all(promises);

        results.forEach((games) => {
          if (games && games.length > 0) {
            const matches = games.map((game: any) =>
              transformMsnGameToMatch(game)
            );
            allMatches.push(...matches);
          }
        });

        // Filtrar por times favoritos se houver
        let filteredMatches = allMatches;

        if (favoriteTeams.length > 0) {
          // Mostrar jogos dos times favoritos primeiro
          const favoriteMatchesList = allMatches.filter(
            (m) =>
              favoriteTeams.includes(m.teams.home.id) ||
              favoriteTeams.includes(m.teams.away.id)
          );
          const otherMatches = allMatches.filter(
            (m) =>
              !favoriteTeams.includes(m.teams.home.id) &&
              !favoriteTeams.includes(m.teams.away.id)
          );
          filteredMatches = [...favoriteMatchesList, ...otherMatches];
        }

        // Ordenar por horário
        filteredMatches.sort((a, b) => {
          return (
            new Date(a.fixture.date).getTime() -
            new Date(b.fixture.date).getTime()
          );
        });

        setMatchesForDate(filteredMatches);
      } catch (error) {
        console.error("[Calendar] Error loading matches for date:", error);
        setMatchesForDate([]);
      } finally {
        setLoadingMatches(false);
      }
    },
    [favoriteTeams]
  );

  useEffect(() => {
    loadCalendarData();
  }, []);

  useEffect(() => {
    loadMatchesForDate(selectedDate);
  }, [selectedDate, loadMatchesForDate]);

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);

    // Atualizar marcações
    const newMarked = { ...markedDates };

    // Remover seleção anterior
    Object.keys(newMarked).forEach((date) => {
      if (newMarked[date].selected) {
        newMarked[date] = {
          ...newMarked[date],
          selected: false,
          selectedColor: undefined,
        };
      }
    });

    // Adicionar nova seleção
    newMarked[day.dateString] = {
      ...newMarked[day.dateString],
      selected: true,
      selectedColor: allDatesWithMatches.has(day.dateString)
        ? "#22c55e"
        : "#3b82f6",
    };

    setMarkedDates(newMarked);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalendarData();
    await loadMatchesForDate(selectedDate);
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
    };
    return date.toLocaleDateString("pt-BR", options);
  };

  const formatMatchTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      NS: "Não iniciado",
      "1H": "1º Tempo",
      HT: "Intervalo",
      "2H": "2º Tempo",
      FT: "Encerrado",
      AET: "Prorrogação",
      PEN: "Pênaltis",
      PST: "Adiado",
      CANC: "Cancelado",
      ABD: "Abandonado",
      TBD: "A definir",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    // Include soccer: 1H, 2H, HT, ET, BT, P and basketball: Q1, Q2, Q3, Q4, OT
    if (["1H", "2H", "HT", "ET", "BT", "P", "Q1", "Q2", "Q3", "Q4"].includes(status) || status.startsWith("OT")) {
      return "#22c55e"; // Verde para ao vivo
    }
    if (["FT", "AET", "PEN"].includes(status)) {
      return "#6b7280"; // Cinza para encerrado
    }
    return "#3b82f6"; // Azul para não iniciado
  };

  const isFavoriteTeam = (teamId: number) => favoriteTeams.includes(teamId);

  const renderMatch = (match: Match) => {
    const isHomeFavorite = isFavoriteTeam(match.teams.home.id);
    const isAwayFavorite = isFavoriteTeam(match.teams.away.id);
    const hasFavorite = isHomeFavorite || isAwayFavorite;
    const statusShort = match.fixture.status.short;
    const isLive =
      ["1H", "2H", "HT", "ET", "BT", "P", "Q1", "Q2", "Q3", "Q4"].includes(
        statusShort
      ) || statusShort.startsWith("OT");
    const isFinished = ["FT", "AET", "PEN"].includes(statusShort);

    return (
      <TouchableOpacity
        key={match.fixture.id}
        style={[
          styles.matchCard,
          hasFavorite && styles.matchCardFavorite,
          isLive && styles.matchCardLive,
        ]}
        activeOpacity={0.7}>
        {/* Header com liga e horário */}
        <View style={styles.matchHeader}>
          <View style={styles.leagueInfo}>
            {match.league?.logo && (
              <Image
                source={{ uri: match.league.logo }}
                style={styles.leagueLogo}
              />
            )}
            <Text style={styles.leagueName} numberOfLines={1}>
              {match.league?.name || "Liga"}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            {isLive ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveIndicator} />
                <Text style={styles.liveText}>AO VIVO</Text>
              </View>
            ) : isFinished ? (
              <Text style={styles.statusText}>
                {getStatusText(match.fixture.status.short)}
              </Text>
            ) : (
              <View style={styles.timeInfo}>
                <Clock size={12} color="#a1a1aa" />
                <Text style={styles.timeText}>
                  {formatMatchTime(match.fixture.date)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Times */}
        <View style={styles.teamsContainer}>
          {/* Time da casa */}
          <View style={styles.teamRow}>
            <View style={styles.teamInfo}>
              {match.teams.home.logo && (
                <Image
                  source={{ uri: match.teams.home.logo }}
                  style={styles.teamLogo}
                />
              )}
              <Text
                style={[
                  styles.teamName,
                  isHomeFavorite && styles.favoriteTeamName,
                ]}
                numberOfLines={1}>
                {match.teams.home.name}
              </Text>
              {isHomeFavorite && (
                <Star size={14} color="#fbbf24" fill="#fbbf24" />
              )}
            </View>
            <Text
              style={[
                styles.score,
                isLive && styles.scoreLive,
                isFinished && styles.scoreFinished,
              ]}>
              {match.goals.home ?? "-"}
            </Text>
          </View>

          {/* Time visitante */}
          <View style={styles.teamRow}>
            <View style={styles.teamInfo}>
              {match.teams.away.logo && (
                <Image
                  source={{ uri: match.teams.away.logo }}
                  style={styles.teamLogo}
                />
              )}
              <Text
                style={[
                  styles.teamName,
                  isAwayFavorite && styles.favoriteTeamName,
                ]}
                numberOfLines={1}>
                {match.teams.away.name}
              </Text>
              {isAwayFavorite && (
                <Star size={14} color="#fbbf24" fill="#fbbf24" />
              )}
            </View>
            <Text
              style={[
                styles.score,
                isLive && styles.scoreLive,
                isFinished && styles.scoreFinished,
              ]}>
              {match.goals.away ?? "-"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <LinearGradient
        colors={["#09090b", "#18181b", "#09090b"]}
        style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <CalendarIcon size={20} color="#22c55e" />
            <Text style={styles.headerTitle}>Calendário de Jogos</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#22c55e"
              colors={["#22c55e"]}
            />
          }>
          {/* Calendário */}
          <View style={styles.calendarContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#22c55e" />
            ) : (
              <Calendar
                current={selectedDate}
                onDayPress={handleDayPress}
                markedDates={markedDates}
                markingType="custom"
                theme={{
                  backgroundColor: "transparent",
                  calendarBackground: "transparent",
                  textSectionTitleColor: "#a1a1aa",
                  selectedDayBackgroundColor: "#22c55e",
                  selectedDayTextColor: "#ffffff",
                  todayTextColor: "#22c55e",
                  dayTextColor: "#ffffff",
                  textDisabledColor: "#3f3f46",
                  dotColor: "#22c55e",
                  selectedDotColor: "#ffffff",
                  arrowColor: "#22c55e",
                  monthTextColor: "#ffffff",
                  indicatorColor: "#22c55e",
                  textDayFontWeight: "500",
                  textMonthFontWeight: "bold",
                  textDayHeaderFontWeight: "600",
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 12,
                }}
                style={styles.calendar}
              />
            )}
          </View>

          {/* Legenda */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#22c55e" }]}
              />
              <Text style={styles.legendText}>Dias com jogos</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#3b82f6" }]}
              />
              <Text style={styles.legendText}>Selecionado</Text>
            </View>
          </View>

          {/* Data selecionada */}
          <View style={styles.selectedDateContainer}>
            <Text style={styles.selectedDateText}>
              {formatDate(selectedDate)}
            </Text>
            <Text style={styles.matchCount}>
              {loadingMatches
                ? "Carregando..."
                : `${matchesForDate.length} jogo${
                    matchesForDate.length !== 1 ? "s" : ""
                  }`}
            </Text>
          </View>

          {/* Lista de jogos */}
          <View style={styles.matchesContainer}>
            {loadingMatches ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22c55e" />
                <Text style={styles.loadingText}>Carregando jogos...</Text>
              </View>
            ) : matchesForDate.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CalendarIcon size={48} color="#3f3f46" />
                <Text style={styles.emptyText}>Nenhum jogo nesta data</Text>
                <Text style={styles.emptySubtext}>
                  Selecione uma data com jogos no calendário
                </Text>
              </View>
            ) : (
              matchesForDate.map(renderMatch)
            )}
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 40 : 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  calendarContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  calendar: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 8,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  selectedDateContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  selectedDateText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  matchCount: {
    color: "#a1a1aa",
    fontSize: 14,
    marginTop: 4,
  },
  matchesContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: "#a1a1aa",
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    color: "#71717a",
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  matchCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  matchCardFavorite: {
    borderColor: "rgba(251, 191, 36, 0.3)",
    backgroundColor: "rgba(251, 191, 36, 0.05)",
  },
  matchCardLive: {
    borderColor: "rgba(34, 197, 94, 0.3)",
    backgroundColor: "rgba(34, 197, 94, 0.05)",
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  leagueInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  leagueLogo: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  leagueName: {
    color: "#a1a1aa",
    fontSize: 12,
    flex: 1,
  },
  timeContainer: {
    alignItems: "flex-end",
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  liveText: {
    color: "#22c55e",
    fontSize: 10,
    fontWeight: "700",
  },
  statusText: {
    color: "#6b7280",
    fontSize: 12,
  },
  teamsContainer: {
    gap: 8,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  teamLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  teamName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  favoriteTeamName: {
    color: "#fbbf24",
  },
  score: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
  },
  scoreLive: {
    color: "#22c55e",
  },
  scoreFinished: {
    color: "#6b7280",
  },
  bottomSpacing: {
    height: 40,
  },
});
