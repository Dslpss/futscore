import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import Constants from "expo-constants";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Modal,
  Alert,
  Linking,
  Image,
  TextInput,
  Animated,
} from "react-native";
import { useMatches } from "../context/MatchContext";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { MatchCard } from "../components/MatchCard";
import { NextMatchWidget } from "../components/NextMatchWidget";
import { UpcomingMatchesSlider } from "../components/UpcomingMatchesSlider";
import { AIPredictionSlider, AIPrediction } from "../components/AIPredictionSlider";
import { LinearGradient } from "expo-linear-gradient";
import { WarningCard } from "../components/WarningCard";
import { UpdateModal } from "../components/UpdateModal";
import { EspnLiveCard } from "../components/EspnLiveCard";
import { OndeAssistirCard } from "../components/OndeAssistirCard";
import { PremiumFeaturesModal } from "../components/PremiumFeaturesModal";
import { WorldCupModal } from "../components/WorldCupModal";
import { TeamSearchBar } from "../components/TeamSearchBar";
import { TVCardsSection } from "../components/TVCardsSection";
import { AnnouncementCard } from "../components/AnnouncementCard";
import { FavoriteLeaguesModal } from "../components/FavoriteLeaguesModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Bell,
  User,
  LogOut,
  X,
  Instagram,
  Heart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Tv,
  Search,
  Radio,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { api } from "../services/api";
import { authApi, FavoriteTeam } from "../services/authApi";
import { CONFIG } from "../constants/config";
import { Match } from "../types";
import {
  getNextFavoriteMatch,
  getNextMatchesForFavorites,
} from "../utils/matchHelpers";
import { inferMsnTeamId } from "../utils/teamIdMapper";
import { MSN_LEAGUE_MAP } from "../utils/msnTransformer";
import { useSubscription } from "../hooks/useSubscription";
import { PremiumTrialModal } from "../components/PremiumTrialModal";
import { GiftPremiumModal } from "../components/GiftPremiumModal";
import { Crown } from "lucide-react-native";

const { width } = Dimensions.get("window");

// Separate memoized search input component to prevent keyboard dismissal
interface TeamSearchInputProps {
  onSearchChange: (query: string) => void;
  searchResults: Array<{
    id: number;
    name: string;
    logo: string;
    country: string;
    msnId?: string;
  }>;
  searchingTeams: boolean;
  isFavoriteTeam: (id: number) => boolean;
  toggleFavoriteTeam: (
    id: number,
    info: { name: string; logo: string; country: string; msnId?: string }
  ) => void;
}

const TeamSearchInput = React.memo(
  ({
    onSearchChange,
    searchResults,
    searchingTeams,
    isFavoriteTeam,
    toggleFavoriteTeam,
  }: TeamSearchInputProps) => {
    const [localQuery, setLocalQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const animValue = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    const handleChange = (text: string) => {
      setLocalQuery(text);
      onSearchChange(text);
    };

    const handleFocus = () => {
      setFocused(true);
      Animated.parallel([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    };

    const handleBlur = () => {
      setFocused(false);
      Animated.parallel([
        Animated.timing(animValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    };

    return (
      <View style={teamSearchStyles.wrapper}>
        {/* Premium Card Container */}
        <View style={teamSearchStyles.cardContainer}>
          {/* Background Glow */}
          <View style={teamSearchStyles.cardGlow} />

          {/* Header */}
          <View style={teamSearchStyles.header}>
            <View style={teamSearchStyles.headerLeft}>
              <View style={teamSearchStyles.headerIcon}>
                <LinearGradient
                  colors={["#fbbf24", "#f59e0b"]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Heart size={14} color="#fff" fill="#fff" />
              </View>
              <View>
                <Text style={teamSearchStyles.headerTitle}>
                  Adicionar Favorito
                </Text>
                <Text style={teamSearchStyles.headerSubtitle}>
                  Busque seu time do coração
                </Text>
              </View>
            </View>
          </View>

          {/* Search Input Container */}
          <Animated.View
            style={[
              teamSearchStyles.inputContainer,
              {
                borderColor: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["rgba(255,255,255,0.06)", "#22c55e"],
                }),
                shadowOpacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3],
                }),
              },
            ]}>
            <View style={teamSearchStyles.searchIconWrapper}>
              <Search size={16} color={focused ? "#22c55e" : "#52525b"} />
            </View>
            <TextInput
              style={teamSearchStyles.input}
              placeholder="Digite o nome do time..."
              placeholderTextColor="#52525b"
              value={localQuery}
              onChangeText={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            {localQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setLocalQuery("");
                  onSearchChange("");
                }}
                style={teamSearchStyles.clearButton}>
                <Ionicons name="close-circle" size={18} color="#52525b" />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Search Results */}
          {(searchResults.length > 0 || searchingTeams) &&
            localQuery.length >= 2 && (
              <View style={teamSearchStyles.resultsContainer}>
                {searchingTeams ? (
                  <View style={teamSearchStyles.loadingContainer}>
                    <View style={teamSearchStyles.loadingDot} />
                    <Text style={teamSearchStyles.loadingText}>
                      Buscando times...
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={teamSearchStyles.resultsHeader}>
                      <Text style={teamSearchStyles.resultsCount}>
                        {searchResults.length} time
                        {searchResults.length !== 1 ? "s" : ""} encontrado
                        {searchResults.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    {searchResults.map((team, index) => (
                      <TouchableOpacity
                        key={team.id}
                        style={[
                          teamSearchStyles.resultItem,
                          index === searchResults.length - 1 &&
                            teamSearchStyles.resultItemLast,
                        ]}
                        onPress={() => {
                          toggleFavoriteTeam(team.id, {
                            name: team.name,
                            logo: team.logo,
                            country: team.country,
                            msnId: team.msnId,
                          });
                        }}
                        activeOpacity={0.7}>
                        <View style={teamSearchStyles.resultLogoWrapper}>
                          <Image
                            source={{ uri: team.logo }}
                            style={teamSearchStyles.resultLogo}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={teamSearchStyles.resultInfo}>
                          <Text
                            style={teamSearchStyles.resultName}
                            numberOfLines={1}>
                            {team.name}
                          </Text>
                          <Text style={teamSearchStyles.resultCountry}>
                            {team.country}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            teamSearchStyles.resultFavorite,
                            isFavoriteTeam(team.id) &&
                              teamSearchStyles.resultFavoriteActive,
                          ]}
                          onPress={() => {
                            toggleFavoriteTeam(team.id, {
                              name: team.name,
                              logo: team.logo,
                              country: team.country,
                              msnId: team.msnId,
                            });
                          }}>
                          <Heart
                            size={16}
                            color={
                              isFavoriteTeam(team.id) ? "#22c55e" : "#71717a"
                            }
                            fill={
                              isFavoriteTeam(team.id)
                                ? "#22c55e"
                                : "transparent"
                            }
                          />
                          {isFavoriteTeam(team.id) && (
                            <Text style={teamSearchStyles.favoriteLabel}>
                              Favorito
                            </Text>
                          )}
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>
            )}
        </View>
      </View>
    );
  }
);

const teamSearchStyles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    marginBottom: 12,
  },
  cardContainer: {
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(251, 191, 36, 0.06)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    color: "#e4e4e7",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(39, 39, 42, 0.8)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    gap: 8,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 0,
  },
  searchIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    backgroundColor: "rgba(24, 24, 27, 0.95)",
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  resultsHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  resultsCount: {
    color: "#52525b",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  loadingText: {
    color: "#71717a",
    fontSize: 13,
    fontWeight: "500",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    backgroundColor: "transparent",
  },
  resultItemLast: {
    borderBottomWidth: 0,
  },
  resultLogoWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  resultLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  resultCountry: {
    color: "#71717a",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  resultFavorite: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 6,
  },
  resultFavoriteActive: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  favoriteLabel: {
    color: "#22c55e",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  // Legacy - keeping for backwards compatibility
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },
});

interface Warning {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "danger";
}

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const getWeekday = (date: Date): string => WEEKDAYS[date.getDay()];
const getMonthShort = (date: Date): string => MONTHS[date.getMonth()];

const formatHeaderDate = (date: Date): string => {
  const weekday = getWeekday(date);
  const day = date.getDate();
  const month = getMonthShort(date);
  return `${weekday}, ${day} DE ${month}`;
};

export const HomeScreen = ({ navigation }: any) => {
  const {
    liveMatches,
    todaysMatches,
    loading: contextLoading,
    refreshMatches: contextRefresh,
  } = useMatches();
  const {
    favoriteTeams,
    favoriteLeagues,
    backendFavorites,
    toggleFavoriteTeam,
    toggleFavoriteLeague,
    isFavoriteTeam,
  } = useFavorites();
  const { user, signOut } = useAuth();
  const { isPremium, hasTrialAvailable, refreshSubscription, pendingGift, claimGift, claimingGift } = useSubscription();
  const [selectedLeague, setSelectedLeague] = useState<string>("ALL");
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showWorldCupModal, setShowWorldCupModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showFavoriteLeaguesModal, setShowFavoriteLeaguesModal] = useState(false);

  // Date Selection State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [customMatches, setCustomMatches] = useState<Match[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [daysWithMatches, setDaysWithMatches] = useState<Set<string>>(
    new Set()
  );

  // League logos cache
  const [leagueLogos, setLeagueLogos] = useState<Record<string, string>>({});

  // Next matches for favorites (API fetched)
  const [favoriteNextMatches, setFavoriteNextMatches] = useState<
    Array<{ teamId: number; match: Match }>
  >([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Team Search State
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: number;
      name: string;
      logo: string;
      country: string;
      msnId?: string;
    }>
  >([]);
  const [searchingTeams, setSearchingTeams] = useState(false);

  // AI Predictions State
  const [aiPredictions, setAIPredictions] = useState<AIPrediction[]>([]);
  const [loadingAIPredictions, setLoadingAIPredictions] = useState(false);

  // Ref for league selector ScrollView to maintain position
  const leagueSelectorRef = useRef<ScrollView>(null);
  const leagueScrollPosition = useRef<number>(0);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const loading = isToday(selectedDate) ? contextLoading : loadingCustom;

  const refreshMatches = async () => {
    // Clear calendar cache to force fresh data
    try {
      const { msnSportsApi } = await import("../services/msnSportsApi");
      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default;

      // Clear calendar caches for all leagues
      const leagueIds = [
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
        "Soccer_BrazilCarioca",
        "Soccer_BrazilMineiro",
        "Soccer_BrazilPaulistaSerieA1",
        "Soccer_BrazilGaucho",
      ];

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      // Clear calendar caches
      for (const leagueId of leagueIds) {
        await AsyncStorage.removeItem(
          `msn_sports_cache_calendar_v2_${leagueId}_${todayStr}`
        );
      }

      console.log("[HomeScreen] Cleared calendar caches, refetching...");

      // Refetch calendar with fresh data
      await fetchMatchCalendar();
    } catch (error) {
      console.error("[HomeScreen] Error clearing calendar cache:", error);
    }

    if (isToday(selectedDate)) {
      await contextRefresh();
    } else {
      await fetchMatchesForDate(selectedDate);
    }
  };

  useEffect(() => {
    if (!isToday(selectedDate)) {
      // Clear schedule cache for the selected date to ensure fresh data with date filtering
      const clearAndFetch = async () => {
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default;
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        const leagueIds = [
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
          "Soccer_BrazilCarioca",
          "Soccer_BrazilMineiro",
          "Soccer_BrazilPaulistaSerieA1",
          "Soccer_BrazilGaucho",
        ];

        // Clear schedule cache for selected date
        for (const leagueId of leagueIds) {
          await AsyncStorage.removeItem(
            `msn_sports_cache_schedule_v3_${leagueId}_${dateStr}`
          );
        }
        console.log(`[HomeScreen] Cleared schedule cache for ${dateStr}`);

        fetchMatchesForDate(selectedDate);
      };
      clearAndFetch();
    }
  }, [selectedDate]);

  const fetchMatchesForDate = async (date: Date) => {
    setLoadingCustom(true);
    console.log(
      `[HomeScreen] ========== fetchMatchesForDate STARTED ==========`
    );
    try {
      // Construct date string using local time to avoid timezone shifts
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      console.log(`[HomeScreen] Fetching matches for date: ${dateStr}`);

      // Skip football-data.org for now as it may be slow/blocking
      let footballDataMatches: Match[] = [];

      // 2. Fetch from MSN Sports API using getScheduleByDate for specific date
      const { msnSportsApi } = await import("../services/msnSportsApi");
      const { transformMsnGameToMatch } = await import(
        "../utils/msnTransformer"
      );

      const msnLeagueIds = [
        "Soccer_BrazilBrasileiroSerieA", // Brasileirão
        "Soccer_BrazilCopaDoBrasil", // Copa do Brasil
        "Soccer_InternationalClubsUEFAChampionsLeague", // Champions League
        "Soccer_UEFAEuropaLeague", // Europa League
        "Soccer_EnglandPremierLeague",
        "Soccer_GermanyBundesliga",
        "Soccer_ItalySerieA",
        "Soccer_FranceLigue1",
        "Soccer_SpainLaLiga", // La Liga
        "Soccer_PortugalPrimeiraLiga",
        "Soccer_BrazilCarioca",
        "Soccer_BrazilMineiro",
        "Soccer_BrazilPaulistaSerieA1",
        "Soccer_BrazilGaucho",
      ];

      let msnMatches: Match[] = [];

      // Fetch all leagues in parallel for faster loading
      console.log(
        `[HomeScreen] Fetching ${msnLeagueIds.length} leagues in parallel for ${dateStr}...`
      );

      const leaguePromises = msnLeagueIds.map(async (leagueId) => {
        try {
          const games = await msnSportsApi.getScheduleByDate(leagueId, dateStr);

          // Special logging for Copa do Brasil
          if (leagueId === "Soccer_BrazilCopaDoBrasil") {
            console.log(`[HomeScreen] ⚽ COPA DO BRASIL - Date: ${dateStr}`);
            console.log(
              `[HomeScreen] ⚽ COPA DO BRASIL - Games fetched: ${games.length}`
            );
          }

          const transformedGames = games.map((game: any) =>
            transformMsnGameToMatch({ ...game, seasonId: leagueId })
          );

          return transformedGames;
        } catch (error) {
          console.error(
            `[HomeScreen] Error fetching MSN Sports for ${leagueId}:`,
            error
          );
          return [];
        }
      });

      const leagueResults = await Promise.all(leaguePromises);
      leagueResults.forEach((games) => {
        msnMatches = [...msnMatches, ...games];
      });

      console.log(
        `[HomeScreen] Fetched ${msnMatches.length} total MSN matches for ${dateStr}`
      );

      // 3. SPECIAL: Fetch FIFA Intercontinental Cup from ESPN (not available in MSN)
      try {
        const { espnApi } = await import("../services/espnApi");
        const espnEvents = await espnApi.getIntercontinentalCupEvents();

        if (espnEvents && espnEvents.length > 0) {
          // Filter by date using local time (avoid UTC conversion issues)
          const filtered = espnEvents.filter((event) => {
            const eventDate = new Date(event.date);
            const year = eventDate.getFullYear();
            const month = String(eventDate.getMonth() + 1).padStart(2, "0");
            const day = String(eventDate.getDate()).padStart(2, "0");
            const eventDateStr = `${year}-${month}-${day}`;
            return eventDateStr === dateStr;
          });

          console.log(
            `[HomeScreen] ⚽ ESPN Intercontinental: ${filtered.length}/${espnEvents.length} games for ${dateStr}`
          );

          // Transform ESPN events to Match format
          const intercontinentalMatches: Match[] = filtered.map((event) => {
            const homeCompetitor = event.competitors?.find(
              (c: any) => c.homeAway === "home"
            );
            const awayCompetitor = event.competitors?.find(
              (c: any) => c.homeAway === "away"
            );

            let statusShort = "NS";
            let statusLong = "Não Iniciado";
            if (event.status === "in") {
              statusShort = event.period === 1 ? "1H" : "2H";
              statusLong =
                event.period === 1 ? "Primeiro Tempo" : "Segundo Tempo";
            } else if (event.status === "post") {
              statusShort = "FT";
              statusLong = "Encerrado";
            }

            // Extract scoring summary from ESPN format
            const scoringSummary: Match["scoringSummary"] = [];
            if (homeCompetitor?.scoringSummary) {
              homeCompetitor.scoringSummary.forEach((s: any) => {
                scoringSummary.push({
                  player:
                    s.athlete?.shortName || s.athlete?.displayName || "Unknown",
                  minute: s.displayValue || "",
                  team: "home" as const,
                });
              });
            }
            if (awayCompetitor?.scoringSummary) {
              awayCompetitor.scoringSummary.forEach((s: any) => {
                scoringSummary.push({
                  player:
                    s.athlete?.shortName || s.athlete?.displayName || "Unknown",
                  minute: s.displayValue || "",
                  team: "away" as const,
                });
              });
            }

            return {
              fixture: {
                id: parseInt(event.id) || Math.floor(Math.random() * 1000000),
                date: event.date,
                status: {
                  short: statusShort,
                  long: statusLong,
                  elapsed: event.clock ? parseInt(event.clock) : undefined,
                },
                venue: event.location
                  ? { name: event.location, city: "" }
                  : undefined,
              },
              league: {
                id: "FIC",
                name: "Copa Intercontinental",
                logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/22902.png",
                country: "Internacional",
              },
              teams: {
                home: {
                  id: parseInt(homeCompetitor?.id || "0"),
                  name: homeCompetitor?.displayName || "Unknown",
                  logo: homeCompetitor?.logo || "",
                  form: homeCompetitor?.form,
                  record: homeCompetitor?.record,
                },
                away: {
                  id: parseInt(awayCompetitor?.id || "0"),
                  name: awayCompetitor?.displayName || "Unknown",
                  logo: awayCompetitor?.logo || "",
                  form: awayCompetitor?.form,
                  record: awayCompetitor?.record,
                },
              },
              goals: {
                home: homeCompetitor?.score
                  ? parseInt(homeCompetitor.score)
                  : null,
                away: awayCompetitor?.score
                  ? parseInt(awayCompetitor.score)
                  : null,
              },
              score: {
                halftime: { home: null, away: null },
                fulltime: {
                  home: homeCompetitor?.score
                    ? parseInt(homeCompetitor.score)
                    : null,
                  away: awayCompetitor?.score
                    ? parseInt(awayCompetitor.score)
                    : null,
                },
              },
              scoringSummary:
                scoringSummary.length > 0 ? scoringSummary : undefined,
            };
          });

          if (intercontinentalMatches.length > 0) {
            msnMatches = [...msnMatches, ...intercontinentalMatches];
            console.log(
              `[HomeScreen] ✓ Copa Intercontinental: ${intercontinentalMatches.length} matches from ESPN`
            );
          }
        }
      } catch (error) {
        console.log(
          "[HomeScreen] ✗ Copa Intercontinental: ESPN fetch failed",
          error
        );
      }

      // 4. Combine all matches (no need to filter by date since getScheduleByDate already does that)
      const allMatches = [...footballDataMatches, ...msnMatches];

      // Log Copa do Brasil matches before deduplication
      const copaDoBrasilBeforeDedupe = allMatches.filter(
        (m) =>
          m.league.name === "Copa do Brasil" ||
          m.league.id?.toString().includes("CopaDoBrasil")
      );
      console.log(
        `[HomeScreen] ⚽ COPA DO BRASIL in allMatches (before dedupe): ${copaDoBrasilBeforeDedupe.length}`
      );

      // Remove duplicates based on team names
      const uniqueMatches = allMatches.filter((match, index, self) => {
        const key = `${match.teams.home.name}-${match.teams.away.name}`;
        return (
          index ===
          self.findIndex(
            (m) => `${m.teams.home.name}-${m.teams.away.name}` === key
          )
        );
      });

      // Log Copa do Brasil matches after deduplication
      const copaDoBrasilAfterDedupe = uniqueMatches.filter(
        (m) =>
          m.league.name === "Copa do Brasil" ||
          m.league.id?.toString().includes("CopaDoBrasil")
      );
      console.log(
        `[HomeScreen] ⚽ COPA DO BRASIL in uniqueMatches (after dedupe): ${copaDoBrasilAfterDedupe.length}`
      );
      if (copaDoBrasilAfterDedupe.length > 0) {
        copaDoBrasilAfterDedupe.forEach((match, idx) => {
          console.log(
            `[HomeScreen] ⚽ COPA DO BRASIL Final Match ${idx + 1}:`,
            {
              home: match.teams.home.name,
              away: match.teams.away.name,
              leagueName: match.league.name,
              leagueId: match.league.id,
            }
          );
        });
      }

      // Map league logos using MSN_LEAGUE_MAP directly - same as LeaguesExplorer
      const matchesWithLogos = uniqueMatches.map((match) => {
        // Try to find logo from MSN_LEAGUE_MAP using league name
        const leagueName = match.league.name?.toLowerCase() || "";
        let logo = match.league.logo || "";

        // Search MSN_LEAGUE_MAP for matching league
        for (const [key, leagueData] of Object.entries(MSN_LEAGUE_MAP)) {
          if (
            leagueData.name.toLowerCase() === leagueName ||
            key.toLowerCase().includes(leagueName.replace(/\s+/g, "")) ||
            (leagueName.includes("copa do brasil") &&
              key.includes("CopaDoBrasil")) ||
            (leagueName.includes("brasileir") &&
              key.includes("BrasileiroSerieA")) ||
            (leagueName.includes("premier") && key.includes("PremierLeague")) ||
            (leagueName.includes("champions") &&
              key.includes("ChampionsLeague")) ||
            (leagueName.includes("europa") && key.includes("EuropaLeague")) ||
            (leagueName.includes("la liga") && key.includes("LaLiga")) ||
            (leagueName.includes("bundesliga") && key.includes("Bundesliga")) ||
            (leagueName.includes("serie a") && key.includes("SerieA")) ||
            (leagueName.includes("ligue 1") && key.includes("Ligue1")) ||
            (leagueName.includes("portugal") && key.includes("Portugal")) ||
            (leagueName.includes("nba") && key.includes("NBA"))
          ) {
            logo = leagueData.logo;
            break;
          }
        }

        return {
          ...match,
          league: {
            ...match.league,
            logo: logo,
          },
        };
      });

      setCustomMatches(matchesWithLogos);
      console.log(
        `[HomeScreen] Fetched ${uniqueMatches.length} matches for ${dateStr}`
      );
    } catch (error) {
      console.error("Error fetching custom matches", error);
    } finally {
      setLoadingCustom(false);
    }
  };

  // Premium Modal - check if user dismissed it
  const PREMIUM_MODAL_KEY = "@futscore_hide_premium_modal";

  const checkPremiumModal = async () => {
    try {
      const hidden = await AsyncStorage.getItem(PREMIUM_MODAL_KEY);
      if (!hidden) {
        setShowPremiumModal(true);
      }
    } catch (error) {
      console.error("Error checking premium modal preference:", error);
    }
  };

  const handleDontShowAgainHome = async () => {
    try {
      await AsyncStorage.setItem(PREMIUM_MODAL_KEY, "true");
    } catch (error) {
      console.error("Error saving premium modal preference:", error);
    }
  };

  useEffect(() => {
    fetchWarnings();
    checkUpdate();
    fetchMatchCalendar();
    fetchLeagueLogos();
    checkPremiumModal();
    fetchAIPredictions();
    // backendFavorites is loaded automatically by FavoritesContext
  }, []);

  // Fetch AI predictions from backend
  const fetchAIPredictions = async () => {
    setLoadingAIPredictions(true);
    try {
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/ai-predictions/upcoming`);
      if (response.data.success && response.data.predictions) {
        setAIPredictions(response.data.predictions);
        console.log(`[HomeScreen] Loaded ${response.data.predictions.length} AI predictions`);
      }
    } catch (error: any) {
      console.log("[HomeScreen] AI predictions not available:", error.message);
      // Silently fail - feature is optional
    } finally {
      setLoadingAIPredictions(false);
    }
  };

  // Check for pending gift and show modal
  useEffect(() => {
    if (pendingGift && pendingGift.days > 0) {
      console.log(`[HomeScreen] Pending gift found: ${pendingGift.days} days`);
      setShowGiftModal(true);
    }
  }, [pendingGift]);

  useEffect(() => {
    // Use backend favorites if available (from context, updates automatically)
    if (backendFavorites.length > 0) {
      console.log(
        `[HomeScreen] Using ${backendFavorites.length} favorites from context:`,
        backendFavorites.map((f) => f.name)
      );
      fetchNextMatchesForFavorites(backendFavorites);
    } else if (favoriteTeams.length > 0) {
      // Fall back to local context (just IDs, no msnId)
      const localFavs = favoriteTeams.map((id) => ({
        id,
        name: "",
        logo: "",
        country: "",
      }));
      fetchNextMatchesForFavorites(localFavs);
    } else {
      setFavoriteNextMatches([]);
    }
  }, [backendFavorites, favoriteTeams, todaysMatches, liveMatches]);

  const fetchNextMatchesForFavorites = async (
    favorites: Array<{ id: number; name?: string; msnId?: string }>
  ) => {
    if (favorites.length === 0) {
      setFavoriteNextMatches([]);
      return;
    }

    setLoadingFavorites(true);
    try {
      const results: Array<{ teamId: number; match: Match }> = [];
      const { msnSportsApi } = await import("../services/msnSportsApi");
      const { transformMsnGameToMatch } = await import(
        "../utils/msnTransformer"
      );

      // 1. Check if we already have the match in today's list or live list
      const availableMatches = [...liveMatches, ...todaysMatches];

      // Process each favorite team
      await Promise.all(
        favorites.map(async (fav) => {
          const teamId = fav.id;
          console.log(
            `[HomeScreen] Processing favorite team: ${teamId} (${
              fav.name || "unknown"
            })`
          );

          // Check local first
          const localMatch = availableMatches.find(
            (m) => m.teams.home.id === teamId || m.teams.away.id === teamId
          );

          if (localMatch) {
            // Check if it's upcoming or live
            const status = localMatch.fixture.status.short;
            const isFinished = ["FT", "AET", "PEN"].includes(status);

            if (!isFinished) {
              console.log(`[HomeScreen] Found local match for team ${teamId}`);
              results.push({ teamId, match: localMatch });
              return;
            }
          }

          // If not found or finished locally, fetch from API
          try {
            // Use stored msnId first, then try to infer from mapper
            const msnId = fav.msnId || inferMsnTeamId(teamId);
            console.log(
              `[HomeScreen] Team ${teamId} MSN ID: ${
                msnId || "NOT FOUND"
              } (stored: ${!!fav.msnId})`
            );

            if (msnId) {
              let msnGames = await msnSportsApi.getTeamLiveSchedule(msnId, 5);
              console.log(
                `[HomeScreen] Team ${teamId} MSN games fetched: ${
                  msnGames?.length || 0
                }`
              );

              // If no games found via team schedule, try fetching from league and filtering
              if (!msnGames || msnGames.length === 0) {
                // Try to find the league from the msnId
                const leagueMatch = msnId.match(/Soccer_([^_]+_[^_]+)/);
                if (leagueMatch) {
                  const leagueId = `Soccer_${leagueMatch[1]}`;
                  console.log(
                    `[HomeScreen] Team ${teamId} trying league fallback: ${leagueId}`
                  );

                  try {
                    const leagueGames = await msnSportsApi.getLiveAroundLeague(
                      leagueId,
                      "Soccer"
                    );
                    // Filter games where this team is playing (by team name)
                    const teamName = fav.name?.toLowerCase() || "";
                    const teamGames = leagueGames.filter((game: any) => {
                      const homeName =
                        game.participants?.[0]?.team?.name?.localizedName?.toLowerCase() ||
                        game.participants?.[0]?.team?.name?.rawName?.toLowerCase() ||
                        "";
                      const awayName =
                        game.participants?.[1]?.team?.name?.localizedName?.toLowerCase() ||
                        game.participants?.[1]?.team?.name?.rawName?.toLowerCase() ||
                        "";
                      return (
                        homeName.includes(teamName) ||
                        awayName.includes(teamName) ||
                        teamName.includes(homeName) ||
                        teamName.includes(awayName)
                      );
                    });

                    if (teamGames.length > 0) {
                      msnGames = teamGames;
                      console.log(
                        `[HomeScreen] Team ${teamId} found ${teamGames.length} games via league fallback`
                      );
                    }
                  } catch (leagueError) {
                    console.log(
                      `[HomeScreen] Team ${teamId} league fallback failed:`,
                      leagueError
                    );
                  }
                }
              }

              if (msnGames && msnGames.length > 0) {
                // Find next upcoming game
                const upcomingGame = msnGames.find(
                  (game: any) => game.gameState?.gameStatus === "PreGame"
                );

                if (upcomingGame) {
                  const match = transformMsnGameToMatch(upcomingGame);
                  console.log(
                    `[HomeScreen] Team ${teamId} next match: ${match.teams.home.name} vs ${match.teams.away.name}`
                  );
                  results.push({ teamId, match });
                } else {
                  console.log(
                    `[HomeScreen] Team ${teamId} no upcoming PreGame found`
                  );
                }
              }
            } else {
              // Fallback to football-data.org (limited)
              console.log(
                `[HomeScreen] Team ${teamId} using football-data.org fallback`
              );
              const fallbackData = await api.getTeamUpcomingMatches(teamId, 1);
              if (fallbackData && fallbackData.length > 0) {
                const match = fallbackData[0];
                console.log(`[HomeScreen] Team ${teamId} fallback match found`);
                results.push({ teamId, match });
              } else {
                console.log(
                  `[HomeScreen] Team ${teamId} no fallback match found`
                );
              }
            }
          } catch (err) {
            console.log(
              `[HomeScreen] Error fetching next match for team ${teamId}`,
              err
            );
          }
        })
      );

      // Sort by date soonest first
      results.sort(
        (a, b) =>
          new Date(a.match.fixture.date).getTime() -
          new Date(b.match.fixture.date).getTime()
      );

      setFavoriteNextMatches(results);
    } catch (error) {
      console.error("Error fetching favorite next matches", error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  // Fetch league logos from API - same method as LeaguesExplorer
  const fetchLeagueLogos = async () => {
    try {
      const { msnSportsApi } = await import("../services/msnSportsApi");

      // Clear personalization cache to get fresh data with encoded URLs
      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default;
      await AsyncStorage.removeItem("@msn_sports_personalization_strip");

      // Use getPersonalizationStrip - same as LeaguesExplorer screen
      const leagues = await msnSportsApi.getPersonalizationStrip();

      const logos: Record<string, string> = {};
      leagues.forEach((league: any) => {
        if (league.sportWithLeague && league.image?.id) {
          // Use getLeagueImageUrl - same as LeaguesExplorer
          const imageUrl = msnSportsApi.getLeagueImageUrl(league.image.id);
          logos[league.sportWithLeague] = imageUrl;
          console.log(
            `[HomeScreen] Logo for ${league.sportWithLeague}: ${imageUrl}`
          );
        }
      });

      setLeagueLogos(logos);
      console.log(
        `[HomeScreen] Loaded ${Object.keys(logos).length} league logos`
      );
    } catch (error) {
      console.error("Error fetching league logos:", error);
    }
  };

  // Fetch calendar to know which days have matches
  const fetchMatchCalendar = async () => {
    try {
      const { msnSportsApi } = await import("../services/msnSportsApi");

      const leagueIds = [
        "Soccer_BrazilBrasileiroSerieA", // Brasileirão
        "Soccer_BrazilCopaDoBrasil", // Copa do Brasil
        "Soccer_InternationalClubsUEFAChampionsLeague", // Champions League
        "Soccer_UEFAEuropaLeague", // Europa League
        "Soccer_EnglandPremierLeague",
        "Soccer_GermanyBundesliga",
        "Soccer_ItalySerieA",
        "Soccer_FranceLigue1",
        "Soccer_SpainLaLiga", // La Liga
        "Soccer_PortugalPrimeiraLiga",
      ];

      const allDates = new Set<string>();

      // Fetch calendars in parallel
      const calendarPromises = leagueIds.map((id) =>
        msnSportsApi.getLeagueCalendar(id).catch(() => ({ dates: [] }))
      );

      const results = await Promise.all(calendarPromises);

      results.forEach((result) => {
        result.dates.forEach((date: string) => allDates.add(date));
      });

      setDaysWithMatches(allDates);
      console.log(
        `[HomeScreen] Found ${allDates.size} days with matches:`,
        Array.from(allDates).slice(0, 10)
      );
    } catch (error) {
      console.error("Error fetching match calendar:", error);
    }
  };

  const fetchWarnings = async () => {
    try {
      const response = await axios.get(`${CONFIG.BACKEND_URL}/admin/warnings`);
      // Deduplicate warnings
      const uniqueWarnings = Array.from(
        new Map(response.data.map((w: Warning) => [w._id, w])).values()
      );
      setWarnings(uniqueWarnings as Warning[]);
    } catch (error) {
      console.error("Error fetching warnings", error);
    }
  };

  const checkUpdate = async () => {
    try {
      const response = await axios.get(`${CONFIG.BACKEND_URL}/admin/version`);
      const latestVersion = response.data;
      const currentVersion = Constants.expoConfig?.version || "1.0.0";

      if (
        latestVersion &&
        latestVersion.active &&
        latestVersion.version > currentVersion
      ) {
        setUpdateInfo(latestVersion);
        setShowUpdateModal(true);
      }
    } catch (error) {
      console.error("Error checking update", error);
    }
  };

  const leagues = [
    { code: "ALL", name: "Todos", icon: "🌍" },
    { code: "FAV", name: "Favoritos", icon: "⭐" },
    { code: "MYLIG", name: "Minhas Ligas", icon: "🏆" },
    { code: "BSA", name: "Brasileirão", icon: "🇧🇷" },
    { code: "CDB", name: "Copa do Brasil", icon: "🏆" },
    { code: "CAR", name: "Carioca", icon: "🏟️" },
    { code: "FIC", name: "Intercontinental", icon: "🌎" },
    { code: "CL", name: "Champions", icon: "⚽" },
    { code: "EL", name: "Europa League", icon: "🔶" },
    { code: "PD", name: "La Liga", icon: "🇪🇸" },
    { code: "PL", name: "Premier", icon: "🦁" },
    { code: "BL1", name: "Bundesliga", icon: "🇩🇪" },
    { code: "SA", name: "Serie A", icon: "🇮🇹" },
    { code: "FL1", name: "Ligue 1", icon: "🇫🇷" },
    { code: "PPL", name: "Portugal", icon: "🇵🇹" },
    { code: "FINISHED", name: "Finalizados", icon: "✅" },
  ];

  // Search teams for adding favorites
  const searchTeamsForFavorite = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchingTeams(true);
    try {
      const { msnSportsApi } = await import("../services/msnSportsApi");

      const msnLeagues = [
        {
          id: "Soccer_BrazilBrasileiroSerieA",
          sport: "Soccer",
          country: "Brazil",
        },
        { id: "Soccer_BrazilCopaDoBrasil", sport: "Soccer", country: "Brazil" },
        {
          id: "Soccer_InternationalClubsUEFAChampionsLeague",
          sport: "Soccer",
          country: "Europe",
        },
        { id: "Soccer_SpainLaLiga", sport: "Soccer", country: "Spain" },
        {
          id: "Soccer_EnglandPremierLeague",
          sport: "Soccer",
          country: "England",
        },
        { id: "Soccer_GermanyBundesliga", sport: "Soccer", country: "Germany" },
        { id: "Soccer_ItalySerieA", sport: "Soccer", country: "Italy" },
        { id: "Soccer_FranceLigue1", sport: "Soccer", country: "France" },
        {
          id: "Soccer_PortugalPrimeiraLiga",
          sport: "Soccer",
          country: "Portugal",
        },
        { id: "Soccer_BrazilCarioca", sport: "Soccer", country: "Brazil" },
        { id: "Soccer_BrazilMineiro", sport: "Soccer", country: "Brazil" },
        {
          id: "Soccer_BrazilPaulistaSerieA1",
          sport: "Soccer",
          country: "Brazil",
        },
        { id: "Soccer_BrazilGaucho", sport: "Soccer", country: "Brazil" },
      ];

      const teamsMap = new Map<
        number,
        {
          id: number;
          name: string;
          logo: string;
          country: string;
          msnId?: string;
        }
      >();
      const queryLower = query.toLowerCase();

      // Fetch from multiple leagues in parallel
      await Promise.all(
        msnLeagues.map(async (league) => {
          try {
            const games = await msnSportsApi.getLiveAroundLeague(
              league.id,
              league.sport
            );
            games.forEach((game: any) => {
              game.participants?.forEach((participant: any) => {
                const team = participant.team;
                if (team && team.id) {
                  const teamName =
                    team.name?.localizedName || team.name?.rawName || "";
                  // Filter by query
                  if (teamName.toLowerCase().includes(queryLower)) {
                    const teamId = parseInt(team.id.split("_").pop() || "0");
                    if (!teamsMap.has(teamId)) {
                      teamsMap.set(teamId, {
                        id: teamId,
                        name: teamName,
                        logo: team.image?.id
                          ? `https://www.bing.com/th?id=${team.image.id}&w=80&h=80`
                          : "",
                        country: league.country,
                        msnId: team.id,
                      });
                    }
                  }
                }
              });
            });
          } catch (error) {
            // Ignore errors for individual leagues
          }
        })
      );

      setSearchResults(Array.from(teamsMap.values()).slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error("Error searching teams:", error);
      setSearchResults([]);
    } finally {
      setSearchingTeams(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (teamSearchQuery.length >= 2) {
        searchTeamsForFavorite(teamSearchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [teamSearchQuery]);

  const generateDates = () => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={["rgba(34, 197, 94, 0.1)", "transparent"]}
        style={styles.headerGradient}
      />

      {/* Premium Header Card */}
      <View style={styles.headerCard}>
        {/* Background Glow Effects */}
        <View style={styles.headerGlowGreen} />
        <View style={styles.headerGlowPurple} />

        <View style={styles.topBar}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoTextContainer}>
              <View style={styles.titleContainer}>
                <Text style={styles.titleHighlight}>Fut</Text>
                <Text style={styles.title}>Score</Text>
                <View style={styles.liveDotHeader} />
              </View>
              <View style={styles.dateBadge}>
                <Text style={styles.dateText} numberOfLines={1}>
                  {formatHeaderDate(selectedDate)}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.headerButtonsRow}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => navigation.navigate("Calendar")}
              activeOpacity={0.8}>
              <LinearGradient
                colors={["rgba(34, 197, 94, 0.15)", "rgba(34, 197, 94, 0.05)"]}
                style={styles.headerActionGradient}>
                <Calendar size={18} color="#22c55e" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => navigation.navigate("NotificationSettings")}
              activeOpacity={0.8}>
              <LinearGradient
                colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]}
                style={styles.headerActionGradient}>
                <Bell size={18} color="#a1a1aa" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => setShowProfileModal(true)}
              activeOpacity={0.8}>
              <LinearGradient
                colors={["#3f3f46", "#27272a"]}
                style={styles.profileGradient}>
                <User size={18} color="#e4e4e7" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Selector - Premium Calendar Card */}
      <View style={styles.dateSelectorWrapper}>
        <View style={styles.dateSelectorOuterContainer}>
          {/* Background Gradient Effects */}
          <LinearGradient
            colors={[
              "rgba(34,197,94,0.08)",
              "rgba(22,163,74,0.03)",
              "rgba(0,0,0,0)",
            ]}
            style={styles.dateSelectorGradientBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.calendarGlowEffect} />

          {/* Compact Header */}
          <View style={styles.dateSelectorHeader}>
            <View style={styles.dateSelectorTitleRow}>
              <View style={styles.dateSelectorIconWrapper}>
                <LinearGradient
                  colors={["#4ade80", "#22c55e"]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Calendar size={12} color="#fff" />
              </View>
              <Text style={styles.dateSelectorTitle}>Calendário</Text>
            </View>
            <View style={styles.monthBadge}>
              <Text style={styles.dateSelectorMonth}>
                {getMonthShort(selectedDate)}
              </Text>
              <Text style={styles.yearText}>{selectedDate.getFullYear()}</Text>
            </View>
          </View>

          {/* Date Scroll Container */}
          <View style={styles.dateSelectorRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateSelectorContainer}>
              {dates.map((date, index) => {
                const isSelected =
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth();
                const isDateToday = isToday(date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateStr = `${year}-${month}-${day}`;
                const hasMatches = daysWithMatches.has(dateStr);

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateButton,
                      isSelected && styles.dateButtonActive,
                      isDateToday && !isSelected && styles.dateButtonToday,
                    ]}
                    onPress={() => setSelectedDate(date)}
                    activeOpacity={0.8}>
                    {isSelected && (
                      <LinearGradient
                        colors={["#22c55e", "#16a34a"]}
                        style={[
                          StyleSheet.absoluteFillObject,
                          { borderRadius: 16 },
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                    )}
                    {isSelected && <View style={styles.dateButtonGlow} />}

                    {/* Day Label */}
                    <Text
                      style={[
                        styles.dateDayText,
                        isSelected && styles.dateTextActive,
                        isDateToday && !isSelected && styles.dateDayTextToday,
                      ]}>
                      {isDateToday ? "HOJE" : getWeekday(date)}
                    </Text>

                    {/* Date Number */}
                    <Text
                      style={[
                        styles.dateNumberText,
                        isSelected && styles.dateTextActive,
                        isDateToday &&
                          !isSelected &&
                          styles.dateNumberTextToday,
                      ]}>
                      {date.getDate()}
                    </Text>

                    {/* Match Indicator */}
                    {hasMatches && (
                      <View
                        style={[
                          styles.matchIndicatorContainer,
                          isSelected && styles.matchIndicatorContainerActive,
                        ]}>
                        {isSelected ? (
                          <Text style={styles.matchIndicatorText}>⚽</Text>
                        ) : (
                          <View style={styles.matchIndicatorBar} />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Team Search Bar */}
      <TeamSearchBar />

      {/* Next Match Widget */}
      <NextMatchWidget
        matches={favoriteNextMatches}
        onPressMatch={(match) => {
          console.log("Next match clicked:", match);
        }}
      />

      {/* AI Predictions Slider */}
      <AIPredictionSlider
        predictions={aiPredictions}
        loading={loadingAIPredictions}
        onPressPrediction={(prediction) => {
          console.log("AI Prediction clicked:", prediction);
        }}
      />

      {/* Upcoming Matches Slider - Games starting soon */}
      <UpcomingMatchesSlider
        matches={
          isToday(selectedDate)
            ? [...liveMatches, ...todaysMatches]
            : customMatches
        }
        onPressMatch={(match) => {
          console.log("Upcoming match clicked:", match);
        }}
      />

      {/* ESPN, OndeAssistir, and News Cards - Fully isolated component */}
      <TVCardsSection />

      {/* Announcements */}
      <AnnouncementCard onNavigate={(screen) => navigation.navigate(screen)} />

      {/* Action Buttons - Premium Card Container */}
      <View style={styles.actionButtonsWrapper}>
        <View style={styles.actionButtonsCard}>
          {/* Background Glow Effect */}
          <View style={styles.actionButtonsGlow} />

          {/* Header */}
          <View style={styles.actionButtonsHeader}>
            <View style={styles.actionTitleRow}>
              <View style={styles.actionTitleIcon}>
                <Text style={{ fontSize: 12 }}>⚡</Text>
              </View>
              <Text style={styles.actionButtonsTitle}>Ações Rápidas</Text>
            </View>
            <View style={styles.actionCountBadge}>
              <Text style={styles.actionCountText}>10 atalhos</Text>
            </View>
          </View>

          {/* Buttons ScrollView */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionButtonsContent}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("TeamSelection")}
              activeOpacity={0.85}>
              <LinearGradient
                colors={["#2d1f4e", "#1a1a2e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}>
                <View style={styles.actionButtonIconWrapper}>
                  <LinearGradient
                    colors={["#fbbf24", "#f59e0b"]}
                    style={styles.actionIconGradient}>
                    <Text style={styles.actionButtonIcon}>⭐</Text>
                  </LinearGradient>
                </View>
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonText}>Favoritos</Text>
                  <Text style={styles.actionButtonSubtext}>Seus times</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* TV Channels Button - Premium Highlight */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("TVChannels")}
              activeOpacity={0.85}>
              <LinearGradient
                colors={["#350b0b", "#1a1a2e"]} // Vinho muito escuro para o tema base
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.actionButtonGradient, styles.tvButtonBorder]}>
                {/* Badge Flutuante Discreto */}
                <View style={styles.liveBadgeContainer}>
                  <LinearGradient
                    colors={["#dc2626", "#991b1b"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </LinearGradient>
                </View>

                <View style={styles.actionButtonIconWrapper}>
                  <LinearGradient
                    colors={["#f87171", "#dc2626"]} // Gradiente vermelho/salmão mais suave
                    style={styles.actionIconGradient}>
                    <Text style={styles.actionButtonIcon}>📺</Text>
                  </LinearGradient>
                </View>

                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonText}>TV ao Vivo</Text>
                  <Text style={styles.actionButtonSubtext}>Assista Agora</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const leagueMap: Record<string, string> = {
                  BSA: "Soccer_BrazilBrasileiroSerieA",
                  CDB: "Soccer_BrazilCopaDoBrasil",
                  CL: "Soccer_InternationalClubsUEFAChampionsLeague",
                  EL: "Soccer_UEFAEuropaLeague",
                  PD: "Soccer_SpainLaLiga",
                  PL: "Soccer_EnglandPremierLeague",
                  BL1: "Soccer_GermanyBundesliga",
                  SA: "Soccer_ItalySerieA",
                  FL1: "Soccer_FranceLigue1",
                  PPL: "Soccer_PortugalPrimeiraLiga",
                };

                const targetLeague =
                  selectedLeague !== "ALL" &&
                  selectedLeague !== "FAV" &&
                  selectedLeague !== "FINISHED"
                    ? leagueMap[selectedLeague] || "Soccer_EnglandPremierLeague"
                    : "Soccer_EnglandPremierLeague";

                navigation.navigate("Standings", {
                  leagueId: targetLeague,
                });
              }}
              activeOpacity={0.85}>
              <LinearGradient
                colors={["#1e3a5f", "#1a1a2e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}>
                <View style={styles.actionButtonIconWrapper}>
                  <LinearGradient
                    colors={["#3b82f6", "#2563eb"]}
                    style={styles.actionIconGradient}>
                    <Text style={styles.actionButtonIcon}>📊</Text>
                  </LinearGradient>
                </View>
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonText}>Tabela</Text>
                  <Text style={styles.actionButtonSubtext}>Classificação</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("LeaguesExplorer")}
              activeOpacity={0.85}>
              <LinearGradient
                colors={["#1e4d3a", "#1a1a2e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}>
                <View style={styles.actionButtonIconWrapper}>
                  <LinearGradient
                    colors={["#22c55e", "#16a34a"]}
                    style={styles.actionIconGradient}>
                    <Text style={styles.actionButtonIcon}>🏆</Text>
                  </LinearGradient>
                </View>
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonText}>Ligas</Text>
                  <Text style={styles.actionButtonSubtext}>Explorar</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Videos")}
              activeOpacity={0.85}>
              <LinearGradient
                colors={["#4a1e4d", "#1a1a2e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}>
                <View style={styles.actionButtonIconWrapper}>
                  <LinearGradient
                    colors={["#ec4899", "#db2777"]}
                    style={styles.actionIconGradient}>
                    <Text style={styles.actionButtonIcon}>🎬</Text>
                  </LinearGradient>
                </View>
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonText}>Vídeos</Text>
                  <Text style={styles.actionButtonSubtext}>Highlights</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* World Cup 2026 Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowWorldCupModal(true)}
              activeOpacity={0.85}>
              <LinearGradient
                colors={["#1a3a4d", "#0f2027"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}>
                <View style={styles.actionButtonIconWrapper}>
                  <LinearGradient
                    colors={["#FFD700", "#FFA500"]}
                    style={styles.actionIconGradient}>
                    <Text style={styles.actionButtonIcon}>🏆</Text>
                  </LinearGradient>
                </View>
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonText}>Copa 2026</Text>
                  <Text style={styles.actionButtonSubtext}>Calendário</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* News Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("News")}
              activeOpacity={0.85}>
              <LinearGradient
                colors={["#1e3a5f", "#1a1a2e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}>
                <View style={styles.actionButtonIconWrapper}>
                  <LinearGradient
                    colors={["#3b82f6", "#2563eb"]}
                    style={styles.actionIconGradient}>
                    <Text style={styles.actionButtonIcon}>📰</Text>
                  </LinearGradient>
                </View>
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonText}>Notícias</Text>
                  <Text style={styles.actionButtonSubtext}>Esportes</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Radios Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Radios")}
              activeOpacity={0.85}>
              <LinearGradient
                colors={["#3d1e5f", "#1a1a2e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}>
                <View style={styles.actionButtonIconWrapper}>
                  <LinearGradient
                    colors={["#8b5cf6", "#6366f1"]}
                    style={styles.actionIconGradient}>
                    <Text style={styles.actionButtonIcon}>📻</Text>
                  </LinearGradient>
                </View>
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonText}>Rádios</Text>
                  <Text style={styles.actionButtonSubtext}>Ao Vivo</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Predictions Button - NEW */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Pass upcoming matches to predictions screen
                const upcomingForPredictions = [
                  ...liveMatches,
                  ...todaysMatches,
                  ...customMatches,
                ]
                  .filter(m => ["NS", "TBD", "TIMED"].includes(m.fixture.status.short))
                  .slice(0, 20)
                  .map(m => ({
                    id: m.fixture.id.toString(),
                    homeTeam: {
                      name: m.teams.home.name,
                      logo: m.teams.home.logo,
                      id: m.teams.home.id?.toString(),
                    },
                    awayTeam: {
                      name: m.teams.away.name,
                      logo: m.teams.away.logo,
                      id: m.teams.away.id?.toString(),
                    },
                    competition: {
                      name: m.league.name,
                      logo: m.league.logo,
                    },
                    date: m.fixture.date,
                    status: m.fixture.status.short,
                  }));

                navigation.navigate("Predictions", { matches: upcomingForPredictions });
              }}
              activeOpacity={0.85}>
              <LinearGradient
                colors={["#1e4a3f", "#1a1a2e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}>
                <View style={styles.actionButtonIconWrapper}>
                  <LinearGradient
                    colors={["#34d399", "#10b981"]}
                    style={styles.actionIconGradient}>
                    <Text style={styles.actionButtonIcon}>🎯</Text>
                  </LinearGradient>
                </View>
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonText}>Palpites</Text>
                  <Text style={styles.actionButtonSubtext}>Aposte</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Second Screen Button - NEW */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("SecondScreen")}
              activeOpacity={0.85}>
              <LinearGradient
                colors={["#1a1a3e", "#1a1a2e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}>
                <View style={styles.actionButtonIconWrapper}>
                  <LinearGradient
                    colors={["#60a5fa", "#3b82f6"]}
                    style={styles.actionIconGradient}>
                    <Text style={styles.actionButtonIcon}>📺</Text>
                  </LinearGradient>
                </View>
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonText}>2ª Tela</Text>
                  <Text style={styles.actionButtonSubtext}>Minimalista</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* League Selector - Premium Chips */}
      <View style={styles.leagueSelectorWrapper}>
        <View style={styles.leagueSelectorCard}>
          {/* Background Glow */}
          <View style={styles.leagueSelectorGlow} />

          {/* Header */}
          <View style={styles.leagueSelectorHeader}>
            <View style={styles.leagueTitleRow}>
              <View style={styles.leagueTitleIcon}>
                <Text style={{ fontSize: 12 }}>⚽</Text>
              </View>
              <Text style={styles.leagueSelectorTitle}>Competições</Text>
            </View>
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{leagues.length} ligas</Text>
            </View>
          </View>

          {/* Chips ScrollView */}
          <ScrollView
            ref={leagueSelectorRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.leagueSelectorContainer}
            onScroll={(e) => {
              leagueScrollPosition.current = e.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={16}
            onContentSizeChange={() => {
              if (
                leagueSelectorRef.current &&
                leagueScrollPosition.current > 0
              ) {
                leagueSelectorRef.current.scrollTo({
                  x: leagueScrollPosition.current,
                  animated: false,
                });
              }
            }}>
            {leagues.map((league, index) => {
              const isSelected = selectedLeague === league.code;
              const isFirst = index === 0;
              const isLast = index === leagues.length - 1;
              const isMYLIG = league.code === "MYLIG";

              return (
                <TouchableOpacity
                  key={league.code}
                  style={[
                    styles.leagueChip,
                    isFirst && styles.leagueChipFirst,
                    isLast && styles.leagueChipLast,
                    isSelected && styles.leagueChipActive,
                  ]}
                  onPress={() => {
                    if (isMYLIG) {
                      // Toque sempre abre o modal para gerenciar ligas favoritas
                      console.log("[HomeScreen] Abrindo modal de ligas favoritas...");
                      setShowFavoriteLeaguesModal(true);
                    } else {
                      setSelectedLeague(league.code);
                    }
                  }}
                  onLongPress={() => {
                    if (isMYLIG) {
                      // Long press também abre o modal
                      setShowFavoriteLeaguesModal(true);
                    }
                  }}
                  activeOpacity={0.8}>
                  {isSelected && (
                    <LinearGradient
                      colors={["#22c55e", "#15803d"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        StyleSheet.absoluteFillObject,
                        { borderRadius: 14 },
                      ]}
                    />
                  )}

                  <View style={styles.leagueChipContent}>
                    {/* Icon Container */}
                    <View
                      style={[
                        styles.leagueIconContainer,
                        isSelected && styles.leagueIconContainerActive,
                      ]}>
                      <Text
                        style={[
                          styles.leagueChipIcon,
                          isSelected && styles.leagueChipIconActive,
                        ]}>
                        {league.icon}
                      </Text>
                    </View>

                    {/* Text with count for MYLIG */}
                    <Text
                      style={[
                        styles.leagueChipText,
                        isSelected && styles.leagueChipTextActive,
                      ]}>
                      {isMYLIG && favoriteLeagues.length > 0 
                        ? `${league.name} (${favoriteLeagues.length})`
                        : league.name}
                    </Text>
                  </View>

                  {/* Selection Indicator Dot */}
                  {isSelected && <View style={styles.leagueSelectedDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* System Warnings */}
      {warnings.map((warning) => (
        <WarningCard
          key={warning._id}
          title={warning.title}
          message={warning.message}
          type={warning.type}
        />
      ))}
    </View>
  );

  // Memoize the header element to prevent FlatList from remounting it
  // Only re-create when essential values change
  const memoizedHeader = useMemo(
    () => renderHeader(),
    [
      selectedDate,
      warnings,
      daysWithMatches,
      selectedLeague,
      loadingFavorites,
      favoriteNextMatches,
    ]
  );

  // Filter matches by selected league
  const filteredMatches = (() => {
    let matches = [];
    const sourceMatches = isToday(selectedDate)
      ? [...liveMatches, ...todaysMatches]
      : customMatches;

    if (selectedLeague === "ALL") {
      matches = sourceMatches;
    } else if (selectedLeague === "FAV") {
      matches = sourceMatches.filter(
        (m) =>
          favoriteTeams.includes(m.teams.home.id) ||
          favoriteTeams.includes(m.teams.away.id)
      );
    } else if (selectedLeague === "MYLIG") {
      // Filtrar por ligas favoritas do usuário
      const msnMapping: Record<string, string> = {
        BSA: "BrazilBrasileiroSerieA",
        BSB: "BrazilBrasileiroSerieB",
        CDB: "BrazilCopaDoBrasil",
        CAR: "BrazilCarioca",
        SPA: "BrazilPaulistaSerieA1",
        MIN: "BrazilMineiro",
        GAU: "BrazilGaucho",
        CL: "InternationalClubsUEFAChampionsLeague",
        EL: "UEFAEuropaLeague",
        PL: "EnglandPremierLeague",
        PD: "SpainLaLiga",
        BL1: "GermanyBundesliga",
        SA: "ItalySerieA",
        FL1: "FranceLigue1",
        PPL: "PortugalPrimeiraLiga",
        ARG: "ArgentinaPrimeraDivision",
        LIB: "CONMEBOLLibertadores",
        SUL: "CONMEBOLSudamericana",
      };
      
      matches = sourceMatches.filter((m) => {
        const leagueId = m.league.id?.toString() || "";
        // Verificar se a liga está nas favoritas
        return favoriteLeagues.some((favLeagueCode) => {
          if (leagueId === favLeagueCode) return true;
          if (msnMapping[favLeagueCode] && leagueId.includes(msnMapping[favLeagueCode])) return true;
          return false;
        });
      });
    } else if (selectedLeague === "FINISHED") {
      matches = sourceMatches.filter((m) =>
        ["FT", "AET", "PEN"].includes(m.fixture.status.short)
      );
    } else {
      // Handle both API formats:
      // football-data.org: league.id = "BSA", "CL", "PD"
      // MSN Sports: league.id = "Soccer_EnglandPremierLeague", "Basketball_NBA", etc.
      // We match either exact ID or if the league ID contains the selected code
      matches = sourceMatches.filter((m) => {
        const leagueId = m.league.id?.toString() || "";
        // Direct match
        if (leagueId === selectedLeague) return true;

        // MSN Sports format mapping
        const msnMapping: Record<string, string> = {
          BSA: "BrazilBrasileiroSerieA", // Brasileirão also in MSN
          CDB: "BrazilCopaDoBrasil", // Copa do Brasil
          CAR: "BrazilCarioca", // Campeonato Carioca
          FIC: "FIFAIntercontinentalCup", // Copa Intercontinental
          CL: "InternationalClubsUEFAChampionsLeague", // Champions League
          EL: "UEFAEuropaLeague", // Europa League
          PD: "SpainLaLiga", // La Liga
          PL: "EnglandPremierLeague",
          BL1: "GermanyBundesliga",
          SA: "ItalySerieA",
          FL1: "FranceLigue1",
          PPL: "PortugalPrimeiraLiga",
        };

        if (msnMapping[selectedLeague]) {
          return leagueId.includes(msnMapping[selectedLeague]);
        }

        return false;
      });
    }

    // Deduplicate matches and ensure valid ID
    const uniqueMatches = Array.from(
      new Map(
        matches
          .filter((item) => item?.fixture?.id)
          .map((item) => [item.fixture.id, item])
      ).values()
    );

    // Filter by team search query
    if (teamSearchQuery.trim().length > 0) {
      const query = teamSearchQuery.toLowerCase().trim();
      return uniqueMatches.filter(
        (m) =>
          m.teams.home.name.toLowerCase().includes(query) ||
          m.teams.away.name.toLowerCase().includes(query)
      );
    }

    return uniqueMatches;
  })();

  // Group matches
  const finishedMatches = filteredMatches.filter((m) =>
    ["FT", "AET", "PEN"].includes(m.fixture.status.short)
  );
  const scheduledMatches = filteredMatches.filter((m) =>
    ["NS", "TBD", "TIMED"].includes(m.fixture.status.short)
  );
  const live = filteredMatches.filter((m) => {
    const status = m.fixture.status.short;
    // Include soccer statuses: 1H, 2H, HT, ET (Extra Time), BT (Break Time), P (Penalties)
    // Include basketball statuses: Q1, Q2, Q3, Q4, and OT (Overtime)
    return (
      ["1H", "2H", "HT", "ET", "BT", "P", "Q1", "Q2", "Q3", "Q4"].includes(
        status
      ) || status.startsWith("OT")
    );
  });

  // Map league IDs to sportWithLeague format for logo lookup
  const leagueIdToSportWithLeague: Record<string, string> = {
    // Short IDs
    BSA: "Soccer_BrazilBrasileiroSerieA",
    CL: "Soccer_InternationalClubsUEFAChampionsLeague",
    EL: "Soccer_UEFAEuropaLeague",
    PL: "Soccer_EnglandPremierLeague",
    BL1: "Soccer_GermanyBundesliga",
    SA: "Soccer_ItalySerieA",
    FL1: "Soccer_FranceLigue1",
    PD: "Soccer_SpainLaLiga",
    PPL: "Soccer_PortugalPrimeiraLiga",
    CAR: "Soccer_BrazilCarioca",
    // Full IDs (in case match.league.id comes in this format)
    Soccer_BrazilBrasileiroSerieA: "Soccer_BrazilBrasileiroSerieA",
    Soccer_InternationalClubsUEFAChampionsLeague:
      "Soccer_InternationalClubsUEFAChampionsLeague",
    Soccer_UEFAEuropaLeague: "Soccer_UEFAEuropaLeague",
    Soccer_EnglandPremierLeague: "Soccer_EnglandPremierLeague",
    Soccer_GermanyBundesliga: "Soccer_GermanyBundesliga",
    Soccer_ItalySerieA: "Soccer_ItalySerieA",
    Soccer_FranceLigue1: "Soccer_FranceLigue1",
    Soccer_SpainLaLiga: "Soccer_SpainLaLiga",
    Soccer_PortugalPrimeiraLiga: "Soccer_PortugalPrimeiraLiga",
    Soccer_BrazilCarioca: "Soccer_BrazilCarioca",
    MIN: "Soccer_BrazilMineiro",
    Soccer_BrazilMineiro: "Soccer_BrazilMineiro",
    PAU: "Soccer_BrazilPaulistaSerieA1",
    Soccer_BrazilPaulistaSerieA1: "Soccer_BrazilPaulistaSerieA1",
    GAU: "Soccer_BrazilGaucho",
    Soccer_BrazilGaucho: "Soccer_BrazilGaucho",
  };

  // Group scheduled matches by league
  const groupMatchesByLeague = (matches: Match[]) => {
    const grouped: Record<
      string,
      {
        name: string;
        logo: string;
        country: string;
        matches: Match[];
        sportWithLeague: string;
      }
    > = {};

    matches.forEach((match) => {
      const leagueId = match.league.id?.toString() || "unknown";
      if (!grouped[leagueId]) {
        // Try to get logo from match data or from cached league logos
        let sportWithLeague = leagueIdToSportWithLeague[leagueId] || "";
        let cachedLogo = leagueLogos[sportWithLeague] || "";

        // If no logo found, try to find by league name in leagueLogos keys
        if (!cachedLogo && Object.keys(leagueLogos).length > 0) {
          const leagueName = match.league.name?.toLowerCase() || "";
          for (const [key, logoUrl] of Object.entries(leagueLogos)) {
            const keyLower = key.toLowerCase();
            if (
              (leagueName.includes("brasileiro") &&
                keyLower.includes("brazil")) ||
              (leagueName.includes("premier") &&
                keyLower.includes("premier")) ||
              (leagueName.includes("champions") &&
                keyLower.includes("champions")) ||
              (leagueName.includes("europa league") &&
                keyLower.includes("europalea")) ||
              (leagueName.includes("la liga") && keyLower.includes("laliga")) ||
              (leagueName.includes("bundesliga") &&
                keyLower.includes("bundesliga")) ||
              (leagueName.includes("serie a") && keyLower.includes("seriea")) ||
              (leagueName.includes("ligue 1") && keyLower.includes("ligue1")) ||
              (leagueName.includes("nba") && keyLower.includes("nba"))
            ) {
              cachedLogo = logoUrl;
              sportWithLeague = key;
              break;
            }
          }
        }

        console.log(
          `[GroupByLeague] League: ${
            match.league.name
          }, ID: ${leagueId}, SportWith: ${sportWithLeague}, CachedLogo: ${
            cachedLogo ? "YES" : "NO"
          }`
        );

        grouped[leagueId] = {
          name: match.league.name || "Liga Desconhecida",
          // Always prefer cachedLogo from API (correct URLs) over match.league.logo (may have old/wrong URLs)
          logo: cachedLogo || match.league.logo || "",
          country: match.league.country || "",
          matches: [],
          sportWithLeague,
        };
      }
      grouped[leagueId].matches.push(match);
    });

    // Sort by league name
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Use useMemo to recalculate when leagueLogos changes
  const scheduledByLeague = useMemo(
    () => groupMatchesByLeague(scheduledMatches),
    [scheduledMatches, leagueLogos]
  );
  const finishedByLeague = useMemo(
    () => groupMatchesByLeague(finishedMatches),
    [finishedMatches, leagueLogos]
  );

  const sections = [
    { title: "AO VIVO", data: live, type: "live", byLeague: null },
    {
      title: "Agendados",
      data: scheduledMatches,
      type: "scheduled",
      byLeague: scheduledByLeague,
    },
    {
      title: "Finalizados",
      data: finishedMatches,
      type: "finished",
      byLeague: finishedByLeague,
    },
  ].filter((section) => section.data.length > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <LinearGradient
        colors={["#09090b", "#18181b", "#09090b"]}
        style={styles.background}
      />

      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={sections}
          keyExtractor={(item) => item.title}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                {item.type === "live" && (
                  <View style={styles.liveIndicatorContainer}>
                    <View style={styles.pulsingDot} />
                  </View>
                )}
                <Text
                  style={[
                    styles.sectionTitle,
                    item.type === "live" && styles.liveTitle,
                  ]}>
                  {item.title}
                </Text>
                <View style={styles.sectionLine} />
              </View>

              {/* Show grouped by league for scheduled/finished, flat for live */}
              {item.byLeague && item.byLeague.length > 0
                ? item.byLeague.map((league) => (
                    <View key={league.name} style={styles.leagueGroup}>
                      <View style={styles.leagueHeaderWrapper}>
                        <LinearGradient
                          colors={["#1a1a2e", "#16213e"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.leagueHeader}>
                          {/* Logo Container with glow effect */}
                          <View style={styles.leagueLogoContainer}>
                            {league.logo ? (
                              <Image
                                source={{ uri: league.logo }}
                                style={styles.leagueHeaderLogo}
                                resizeMode="contain"
                                onError={(e) =>
                                  console.log(
                                    "[Image Error]",
                                    league.name,
                                    e.nativeEvent.error
                                  )
                                }
                              />
                            ) : (
                              <View style={styles.leagueHeaderLogoPlaceholder}>
                                <Text style={styles.leagueHeaderLogoText}>
                                  ⚽
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* League Info */}
                          <View style={styles.leagueHeaderInfo}>
                            <Text style={styles.leagueHeaderName}>
                              {league.name}
                            </Text>
                            {league.country && (
                              <Text style={styles.leagueHeaderCountry}>
                                {league.country}
                              </Text>
                            )}
                          </View>

                          {/* Match Count Badge */}
                          <View style={styles.leagueCountBadge}>
                            <Text style={styles.leagueCountNumber}>
                              {league.matches.length}
                            </Text>
                            <Text style={styles.leagueCountLabel}>
                              {league.matches.length === 1 ? "jogo" : "jogos"}
                            </Text>
                          </View>
                        </LinearGradient>
                      </View>
                      {league.matches.map((match) => (
                        <MatchCard
                          key={`${item.type}-${match.fixture.id}`}
                          match={match}
                        />
                      ))}
                    </View>
                  ))
                : item.data.map((match) => (
                    <MatchCard
                      key={`${item.type}-${match.fixture.id}`}
                      match={match}
                    />
                  ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={memoizedHeader}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshMatches}
              tintColor="#22c55e"
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Text style={styles.emptyIcon}>⚽</Text>
                </View>
                <Text style={styles.emptyTitle}>Nenhum Jogo Encontrado</Text>
                <Text style={styles.emptyText}>
                  Não há partidas para a seleção atual.
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>

      {updateInfo && (
        <UpdateModal
          visible={showUpdateModal}
          version={updateInfo.version}
          downloadLink={updateInfo.downloadLink}
          forceUpdate={updateInfo.forceUpdate}
          notes={updateInfo.notes}
          onClose={() => setShowUpdateModal(false)}
        />
      )}

      {/* Premium Features Modal */}
      <PremiumFeaturesModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        showDontShowAgain={true}
        onDontShowAgain={handleDontShowAgainHome}
      />

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileModal(false)}>
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}>
            <LinearGradient
              colors={["#18181b", "#09090b"]}
              style={styles.profileModalGradient}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowProfileModal(false)}
                activeOpacity={0.7}>
                <X size={20} color="#71717a" />
              </TouchableOpacity>

              <View style={styles.profileModalHeader}>
                <LinearGradient
                  colors={["#22c55e", "#16a34a"]}
                  style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {user?.name?.charAt(0).toUpperCase() || "?"}
                  </Text>
                </LinearGradient>
                <Text style={styles.profileName}>
                  {user?.name || "Usuário"}
                </Text>
                <Text style={styles.profileEmail}>{user?.email || ""}</Text>
                {/* Premium Badge */}
                <TouchableOpacity
                  style={[styles.premiumBadge, isPremium ? styles.premiumBadgeActive : styles.premiumBadgeInactive]}
                  onPress={() => {
                    setShowProfileModal(false);
                    if (!isPremium && hasTrialAvailable) {
                      setShowTrialModal(true);
                    } else {
                      navigation.navigate('Subscription');
                    }
                  }}
                  activeOpacity={0.8}>
                  <Crown size={14} color={isPremium ? "#fbbf24" : "#71717a"} />
                  <Text style={[styles.premiumBadgeText, isPremium && styles.premiumBadgeTextActive]}>
                    {isPremium ? 'Premium' : hasTrialAvailable ? '7 Dias Grátis' : 'Seja Premium'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.profileModalDivider} />

              {/* Menu Options */}
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setShowProfileModal(false);
                  navigation.navigate("TeamSelection");
                }}
                activeOpacity={0.7}>
                <View style={styles.menuOptionIcon}>
                  <User size={18} color="#22c55e" />
                </View>
                <View style={styles.menuOptionContent}>
                  <Text style={styles.menuOptionTitle}>Meus Times</Text>
                  <Text style={styles.menuOptionSubtitle}>
                    Gerenciar favoritos
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Suporte */}
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  Linking.openURL("https://www.instagram.com/programadorpro_/");
                }}
                activeOpacity={0.7}>
                <View style={[styles.menuOptionIcon, styles.instagramIcon]}>
                  <Instagram size={18} color="#E1306C" />
                </View>
                <View style={styles.menuOptionContent}>
                  <Text style={styles.menuOptionTitle}>Suporte</Text>
                  <Text style={styles.menuOptionSubtitle}>
                    Fale conosco no Instagram
                  </Text>
                </View>
                <Heart size={14} color="#71717a" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  setShowProfileModal(false);
                  Alert.alert("Sair da Conta", "Tem certeza que deseja sair?", [
                    {
                      text: "Cancelar",
                      style: "cancel",
                    },
                    {
                      text: "Sair",
                      style: "destructive",
                      onPress: async () => {
                        await signOut();
                      },
                    },
                  ]);
                }}
                activeOpacity={0.7}>
                <View style={styles.logoutIconWrapper}>
                  <LogOut size={18} color="#ef4444" />
                </View>
                <View style={styles.menuOptionContent}>
                  <Text style={styles.logoutTitle}>Sair da Conta</Text>
                  <Text style={styles.logoutSubtitle}>Encerrar sessão</Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* World Cup 2026 Modal */}
      <WorldCupModal
        visible={showWorldCupModal}
        onClose={() => setShowWorldCupModal(false)}
      />

      {/* Favorite Leagues Modal */}
      <FavoriteLeaguesModal
        visible={showFavoriteLeaguesModal}
        onClose={() => setShowFavoriteLeaguesModal(false)}
      />

      {/* Premium Trial Modal */}
      <PremiumTrialModal
        visible={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onTrialActivated={() => {
          setShowTrialModal(false);
          refreshSubscription();
        }}
        featureName="Recursos Premium"
      />

      {/* Gift Premium Modal */}
      {pendingGift && (
        <GiftPremiumModal
          visible={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          onClaim={async () => {
            const result = await claimGift();
            if (result.success) {
              setShowGiftModal(false);
              Alert.alert(
                "🎉 Presente Ativado!",
                result.message,
                [{ text: "OK", style: "default" }]
              );
            } else {
              Alert.alert("Erro", result.message);
            }
          }}
          days={pendingGift.days}
          message={pendingGift.message}
          loading={claimingGift}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  headerContainer: {
    marginBottom: 32,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 20 : 10,
    position: "relative",
  },
  tvCardsContainer: {
    minHeight: 420,
    overflow: "hidden",
  },
  actionButtonsWrapper: {
    marginBottom: 20,
  },
  actionButtonsCard: {
    backgroundColor: "rgba(24, 24, 27, 0.85)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
    position: "relative",
  },
  actionButtonsGlow: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
  },
  actionButtonsContainer: {
    marginBottom: 16,
  },
  actionButtonsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  actionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionTitleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e4e4e7",
    letterSpacing: 0.2,
  },
  actionCountBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionCountText: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: "600",
  },
  actionButtonsContent: {
    paddingRight: 4,
    gap: 10,
  },
  headerGradient: {
    position: "absolute",
    top: -100,
    left: -20,
    right: -20,
    height: 200,
    opacity: 0.5,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerCard: {
    backgroundColor: "rgba(24, 24, 27, 0.85)",
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    overflow: "hidden",
    position: "relative",
  },
  headerGlowGreen: {
    position: "absolute",
    top: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  headerGlowPurple: {
    position: "absolute",
    bottom: -40,
    right: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(139, 92, 246, 0.06)",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logoContainer: {
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  logoGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  logoIcon: {
    fontSize: 22,
  },
  logoTextContainer: {
    justifyContent: "center",
  },
  dateBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  dateText: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  titleHighlight: {
    fontSize: 26,
    fontWeight: "300",
    color: "#fff",
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  liveDotHeader: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginLeft: 6,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  headerButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerActionGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  profileButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  profileGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // Legacy notification styles - keeping for backwards compatibility
  notificationButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  notificationGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  favoritesButtonContainer: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 4,
  },
  favoritesButtonCentered: {
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  favoritesButton: {
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  favoritesGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  favoritesIcon: {
    fontSize: 16,
  },
  favoritesText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
  },
  profileModalGradient: {
    padding: 24,
    paddingTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  profileModalHeader: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e4e4e7",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: "#71717a",
  },
  profileModalDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 16,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  menuOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  instagramIcon: {
    backgroundColor: "rgba(225, 48, 108, 0.1)",
  },
  menuOptionContent: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e4e4e7",
    marginBottom: 2,
  },
  menuOptionSubtitle: {
    fontSize: 12,
    color: "#71717a",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  logoutIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoutTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
    marginBottom: 2,
  },
  logoutSubtitle: {
    fontSize: 12,
    color: "#71717a",
  },

  dateSelectorWrapper: {
    marginBottom: 16,
    marginHorizontal: 0,
  },
  dateSelectorOuterContainer: {
    backgroundColor: "rgba(24, 24, 27, 0.95)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  dateSelectorGradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  calendarGlowEffect: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  dateSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  dateSelectorTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dateSelectorIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    overflow: "hidden",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dateSelectorTitle: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  monthBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
    gap: 4,
  },
  dateSelectorMonth: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  yearText: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "600",
  },
  dateSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateSelectorContainer: {
    paddingHorizontal: 0,
    flexGrow: 1,
    gap: 8,
  },
  dateButton: {
    width: 52,
    height: 72,
    borderRadius: 16,
    backgroundColor: "rgba(39, 39, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
    position: "relative",
  },
  dateButtonActive: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    transform: [{ scale: 1.05 }],
  },
  dateButtonToday: {
    borderColor: "rgba(34,197,94,0.35)",
    borderWidth: 1.5,
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  dateButtonGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 16,
  },
  dateDayText: {
    color: "#52525b",
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  dateDayTextToday: {
    color: "#4ade80",
    fontWeight: "800",
  },
  dateNumberText: {
    color: "#a1a1aa",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  dateNumberTextToday: {
    color: "#4ade80",
    fontWeight: "800",
  },
  dateTextActive: {
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  matchIndicatorContainer: {
    position: "absolute",
    bottom: 6,
    width: "100%",
    alignItems: "center",
  },
  matchIndicatorContainerActive: {
    bottom: 8,
  },
  matchIndicatorBar: {
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#22c55e",
  },
  matchIndicatorText: {
    fontSize: 8,
    opacity: 0.9,
  },
  // Legacy styles kept for compatibility
  matchIndicatorDot: {
    position: "absolute",
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(34,197,94,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  matchIndicatorDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#22c55e",
  },
  matchIndicatorDotActive: {
    position: "absolute",
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  matchIndicatorDotActiveInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#fff",
  },

  leagueSelectorWrapper: {
    marginTop: 12,
    marginBottom: 8,
  },
  leagueSelectorCard: {
    backgroundColor: "rgba(24, 24, 27, 0.85)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  leagueSelectorGlow: {
    position: "absolute",
    top: -40,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(34, 197, 94, 0.06)",
  },
  leagueSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  leagueTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leagueTitleIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  leagueSelectorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e4e4e7",
    letterSpacing: 0.3,
  },
  filterBadge: {
    backgroundColor: "rgba(63, 63, 70, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  swipeHintText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#22c55e",
    letterSpacing: 0.3,
  },
  swipeHintArrow: {
    fontSize: 14,
    fontWeight: "700",
    color: "#22c55e",
    marginLeft: 4,
  },
  leagueSelectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginLeft: 12,
  },
  leagueSelectorContainer: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 4,
  },
  leagueChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    paddingRight: 14,
    borderRadius: 14,
    backgroundColor: "rgba(39, 39, 42, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    position: "relative",
  },
  leagueChipFirst: {
    marginLeft: 0,
  },
  leagueChipLast: {
    marginRight: 0,
  },
  leagueChipActive: {
    borderColor: "rgba(34, 197, 94, 0.4)",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  leagueChipContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
    gap: 8,
  },
  leagueIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  leagueIconContainerActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  leagueChipIcon: {
    fontSize: 14,
  },
  leagueChipIconActive: {
    // Keep same size for active
  },
  leagueChipText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  leagueChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  leagueSelectedDot: {
    position: "absolute",
    bottom: 4,
    left: "50%",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.6)",
    marginLeft: -2,
  },
  leagueChipGlow: {
    position: "absolute",
    top: -10,
    left: "50%",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    transform: [{ translateX: -20 }],
  },
  // Legacy styles (keep for backwards compatibility)
  leagueButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 34,
    overflow: "hidden",
    position: "relative",
  },
  leagueButtonActive: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    shadowColor: "transparent",
    elevation: 0,
  },
  leagueButtonText: {
    color: "#71717a",
    fontSize: 13,
    fontWeight: "600",
    zIndex: 1,
  },
  leagueButtonTextActive: {
    color: "#fff",
    fontWeight: "800",
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#e4e4e7",
    letterSpacing: 0.5,
    marginRight: 12,
  },
  liveTitle: {
    color: "#22c55e",
  },
  liveIndicatorContainer: {
    marginRight: 8,
    width: 8,
    height: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.03)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    color: "#71717a",
    fontSize: 14,
    textAlign: "center",
  },
  actionButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
  },
  actionButtonIconWrapper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  actionIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  actionButtonTextContainer: {
    flexDirection: "column",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  actionButtonSubtext: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  // League Grouping Styles - Premium Design
  leagueGroup: {
    marginBottom: 20,
  },
  leagueHeaderWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  leagueHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  leagueLogoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  leagueHeaderLogo: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  leagueHeaderLogoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  leagueHeaderLogoText: {
    fontSize: 20,
  },
  leagueHeaderInfo: {
    flex: 1,
    marginLeft: 14,
  },
  leagueHeaderName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  leagueHeaderCountry: {
    color: "#a1a1aa",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  leagueCountBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  leagueCountNumber: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "800",
  },
  leagueCountLabel: {
    color: "#22c55e",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Team Search Styles
  searchWrapper: {
    marginTop: 16,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#e4e4e7",
    fontSize: 15,
    padding: 0,
  },
  fixedSearchWrapper: {
    paddingHorizontal: 20,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 12,
    backgroundColor: "#09090b",
  },
  // Search Results Dropdown Styles
  searchResultsContainer: {
    backgroundColor: "#1f1f23",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  searchLoadingContainer: {
    padding: 16,
    alignItems: "center",
  },
  searchLoadingText: {
    color: "#71717a",
    fontSize: 14,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  searchResultLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "600",
  },
  searchResultCountry: {
    color: "#71717a",
    fontSize: 12,
    marginTop: 2,
  },
  searchResultFavorite: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchResultFavoriteActive: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  // TV Button Styles
  tvButtonBorder: {
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)", // Borda vermelha bem sutil
  },
  liveBadgeContainer: {
    position: "absolute",
    top: 5,
    right: 5,
    zIndex: 10,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    backgroundColor: "rgba(220, 38, 38, 0.95)",
  },
  liveDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#fff",
  },
  liveBadgeText: {
    color: "#fff",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
  },
  premiumBadgeActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  premiumBadgeInactive: {
    backgroundColor: 'rgba(113, 113, 122, 0.1)',
    borderColor: 'rgba(113, 113, 122, 0.3)',
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
  },
  premiumBadgeTextActive: {
    color: '#fbbf24',
  },
});
