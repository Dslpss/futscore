import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { WarningCard } from "../components/WarningCard";
import { UpdateModal } from "../components/UpdateModal";
import { EspnLiveCard } from "../components/EspnLiveCard";
import { OndeAssistirCard } from "../components/OndeAssistirCard";
import { PremiumFeaturesModal } from "../components/PremiumFeaturesModal";
import { WorldCupModal } from "../components/WorldCupModal";
import { TeamSearchBar } from "../components/TeamSearchBar";
import { TVCardsSection } from "../components/TVCardsSection";
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

const { width } = Dimensions.get("window");

// Separate memoized search input component to prevent keyboard dismissal
interface TeamSearchInputProps {
  onSearchChange: (query: string) => void;
  searchResults: Array<{ id: number; name: string; logo: string; country: string; msnId?: string }>;
  searchingTeams: boolean;
  isFavoriteTeam: (id: number) => boolean;
  toggleFavoriteTeam: (id: number, info: { name: string; logo: string; country: string; msnId?: string }) => void;
}

const TeamSearchInput = React.memo(({ 
  onSearchChange, 
  searchResults, 
  searchingTeams,
  isFavoriteTeam,
  toggleFavoriteTeam,
}: TeamSearchInputProps) => {
  const [localQuery, setLocalQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const handleChange = (text: string) => {
    setLocalQuery(text);
    onSearchChange(text);
  };

  const handleFocus = () => {
    setFocused(true);
    animValue.stopAnimation(() => {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  };

  const handleBlur = () => {
    setFocused(false);
    animValue.stopAnimation(() => {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  };

  return (
    <View style={teamSearchStyles.wrapper}>
      <Animated.View
        style={[
          teamSearchStyles.container,
          {
            borderColor: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: ["rgba(255,255,255,0.05)", "#22c55e"],
            }),
          },
        ]}>
        <Search size={18} color={focused ? "#22c55e" : "#71717a"} />
        <TextInput
          style={teamSearchStyles.input}
          placeholder="Buscar time para favoritar..."
          placeholderTextColor="#71717a"
          value={localQuery}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {localQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setLocalQuery(""); onSearchChange(""); }}>
            <Ionicons name="close-circle" size={18} color="#71717a" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Search Results Dropdown */}
      {(searchResults.length > 0 || searchingTeams) && localQuery.length >= 2 && (
        <View style={teamSearchStyles.resultsContainer}>
          {searchingTeams ? (
            <View style={teamSearchStyles.loadingContainer}>
              <Text style={teamSearchStyles.loadingText}>Buscando times...</Text>
            </View>
          ) : (
            searchResults.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={teamSearchStyles.resultItem}
                onPress={() => {
                  toggleFavoriteTeam(team.id, {
                    name: team.name,
                    logo: team.logo,
                    country: team.country,
                    msnId: team.msnId,
                  });
                }}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: team.logo }}
                  style={teamSearchStyles.resultLogo}
                  resizeMode="contain"
                />
                <View style={teamSearchStyles.resultInfo}>
                  <Text style={teamSearchStyles.resultName} numberOfLines={1}>
                    {team.name}
                  </Text>
                  <Text style={teamSearchStyles.resultCountry}>{team.country}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    teamSearchStyles.resultFavorite,
                    isFavoriteTeam(team.id) && teamSearchStyles.resultFavoriteActive,
                  ]}
                  onPress={() => {
                    toggleFavoriteTeam(team.id, {
                      name: team.name,
                      logo: team.logo,
                      country: team.country,
                      msnId: team.msnId,
                    });
                  }}
                >
                  <Heart
                    size={18}
                    color={isFavoriteTeam(team.id) ? "#22c55e" : "#71717a"}
                    fill={isFavoriteTeam(team.id) ? "#22c55e" : "transparent"}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
});

const teamSearchStyles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    marginBottom: 8,
  },
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
  input: {
    flex: 1,
    color: "#e4e4e7",
    fontSize: 15,
    padding: 0,
  },
  resultsContainer: {
    backgroundColor: "#1f1f23",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  loadingContainer: {
    padding: 16,
    alignItems: "center",
  },
  loadingText: {
    color: "#71717a",
    fontSize: 14,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  resultLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "600",
  },
  resultCountry: {
    color: "#71717a",
    fontSize: 12,
    marginTop: 2,
  },
  resultFavorite: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  resultFavoriteActive: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
});

interface Warning {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "danger";
}

export const HomeScreen = ({ navigation }: any) => {
  const {
    liveMatches,
    todaysMatches,
    loading: contextLoading,
    refreshMatches: contextRefresh,
  } = useMatches();
  const { favoriteTeams, backendFavorites, toggleFavoriteTeam, isFavoriteTeam } = useFavorites();
  const { user, signOut } = useAuth();
  const [selectedLeague, setSelectedLeague] = useState<string>("ALL");
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showWorldCupModal, setShowWorldCupModal] = useState(false);

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
  const [searchResults, setSearchResults] = useState<Array<{
    id: number;
    name: string;
    logo: string;
    country: string;
    msnId?: string;
  }>>([]);
  const [searchingTeams, setSearchingTeams] = useState(false);

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
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      
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
        "Basketball_NBA",
        "Soccer_BrazilCarioca",
        "Soccer_BrazilMineiro",
        "Soccer_BrazilPaulistaSerieA1",
        "Soccer_BrazilGaucho",
      ];
      
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      
      // Clear calendar caches
      for (const leagueId of leagueIds) {
        await AsyncStorage.removeItem(`msn_sports_cache_calendar_v2_${leagueId}_${todayStr}`);
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
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
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
          "Basketball_NBA",
          "Soccer_BrazilCarioca",
          "Soccer_BrazilMineiro",
          "Soccer_BrazilPaulistaSerieA1",
          "Soccer_BrazilGaucho",
        ];
        
        // Clear schedule cache for selected date
        for (const leagueId of leagueIds) {
          await AsyncStorage.removeItem(`msn_sports_cache_schedule_v3_${leagueId}_${dateStr}`);
        }
        console.log(`[HomeScreen] Cleared schedule cache for ${dateStr}`);
        
        fetchMatchesForDate(selectedDate);
      };
      clearAndFetch();
    }
  }, [selectedDate]);

  const fetchMatchesForDate = async (date: Date) => {
    setLoadingCustom(true);
    console.log(`[HomeScreen] ========== fetchMatchesForDate STARTED ==========`);
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
        "Basketball_NBA",
        "Soccer_BrazilCarioca",
        "Soccer_BrazilMineiro",
        "Soccer_BrazilPaulistaSerieA1",
        "Soccer_BrazilGaucho",
      ];

      let msnMatches: Match[] = [];

      // Fetch all leagues in parallel for faster loading
      console.log(`[HomeScreen] Fetching ${msnLeagueIds.length} leagues in parallel for ${dateStr}...`);
      
      const leaguePromises = msnLeagueIds.map(async (leagueId) => {
        try {
          const games = await msnSportsApi.getScheduleByDate(leagueId, dateStr);

          // Special logging for Copa do Brasil
          if (leagueId === "Soccer_BrazilCopaDoBrasil") {
            console.log(`[HomeScreen] ⚽ COPA DO BRASIL - Date: ${dateStr}`);
            console.log(`[HomeScreen] ⚽ COPA DO BRASIL - Games fetched: ${games.length}`);
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

      console.log(`[HomeScreen] Fetched ${msnMatches.length} total MSN matches for ${dateStr}`);

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
          
          console.log(`[HomeScreen] ⚽ ESPN Intercontinental: ${filtered.length}/${espnEvents.length} games for ${dateStr}`);
          
          // Transform ESPN events to Match format
          const intercontinentalMatches: Match[] = filtered.map((event) => {
            const homeCompetitor = event.competitors?.find((c: any) => c.homeAway === "home");
            const awayCompetitor = event.competitors?.find((c: any) => c.homeAway === "away");
            
            let statusShort = "NS";
            let statusLong = "Não Iniciado";
            if (event.status === "in") {
              statusShort = event.period === 1 ? "1H" : "2H";
              statusLong = event.period === 1 ? "Primeiro Tempo" : "Segundo Tempo";
            } else if (event.status === "post") {
              statusShort = "FT";
              statusLong = "Encerrado";
            }
            
            // Extract scoring summary from ESPN format
            const scoringSummary: Match["scoringSummary"] = [];
            if (homeCompetitor?.scoringSummary) {
              homeCompetitor.scoringSummary.forEach((s: any) => {
                scoringSummary.push({
                  player: s.athlete?.shortName || s.athlete?.displayName || "Unknown",
                  minute: s.displayValue || "",
                  team: "home" as const,
                });
              });
            }
            if (awayCompetitor?.scoringSummary) {
              awayCompetitor.scoringSummary.forEach((s: any) => {
                scoringSummary.push({
                  player: s.athlete?.shortName || s.athlete?.displayName || "Unknown",
                  minute: s.displayValue || "",
                  team: "away" as const,
                });
              });
            }
            
            return {
              fixture: {
                id: parseInt(event.id) || Math.floor(Math.random() * 1000000),
                date: event.date,
                status: { short: statusShort, long: statusLong, elapsed: event.clock ? parseInt(event.clock) : undefined },
                venue: event.location ? { name: event.location, city: "" } : undefined,
              },
              league: { id: "FIC", name: "Copa Intercontinental", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/22902.png", country: "Internacional" },
              teams: {
                home: { id: parseInt(homeCompetitor?.id || "0"), name: homeCompetitor?.displayName || "Unknown", logo: homeCompetitor?.logo || "", form: homeCompetitor?.form, record: homeCompetitor?.record },
                away: { id: parseInt(awayCompetitor?.id || "0"), name: awayCompetitor?.displayName || "Unknown", logo: awayCompetitor?.logo || "", form: awayCompetitor?.form, record: awayCompetitor?.record },
              },
              goals: {
                home: homeCompetitor?.score ? parseInt(homeCompetitor.score) : null,
                away: awayCompetitor?.score ? parseInt(awayCompetitor.score) : null,
              },
              score: {
                halftime: { home: null, away: null },
                fulltime: { home: homeCompetitor?.score ? parseInt(homeCompetitor.score) : null, away: awayCompetitor?.score ? parseInt(awayCompetitor.score) : null },
              },
              scoringSummary: scoringSummary.length > 0 ? scoringSummary : undefined,
            };
          });
          
          if (intercontinentalMatches.length > 0) {
            msnMatches = [...msnMatches, ...intercontinentalMatches];
            console.log(`[HomeScreen] ✓ Copa Intercontinental: ${intercontinentalMatches.length} matches from ESPN`);
          }
        }
      } catch (error) {
        console.log("[HomeScreen] ✗ Copa Intercontinental: ESPN fetch failed", error);
      }

      // 4. Combine all matches (no need to filter by date since getScheduleByDate already does that)
      const allMatches = [...footballDataMatches, ...msnMatches];

      // Log Copa do Brasil matches before deduplication
      const copaDoBrasilBeforeDedupe = allMatches.filter(m => m.league.name === "Copa do Brasil" || m.league.id?.toString().includes("CopaDoBrasil"));
      console.log(`[HomeScreen] ⚽ COPA DO BRASIL in allMatches (before dedupe): ${copaDoBrasilBeforeDedupe.length}`);

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
      const copaDoBrasilAfterDedupe = uniqueMatches.filter(m => m.league.name === "Copa do Brasil" || m.league.id?.toString().includes("CopaDoBrasil"));
      console.log(`[HomeScreen] ⚽ COPA DO BRASIL in uniqueMatches (after dedupe): ${copaDoBrasilAfterDedupe.length}`);
      if (copaDoBrasilAfterDedupe.length > 0) {
        copaDoBrasilAfterDedupe.forEach((match, idx) => {
          console.log(`[HomeScreen] ⚽ COPA DO BRASIL Final Match ${idx + 1}:`, {
            home: match.teams.home.name,
            away: match.teams.away.name,
            leagueName: match.league.name,
      leagueId: match.league.id,
          });
        });
      }

      // Map league logos using MSN_LEAGUE_MAP directly - same as LeaguesExplorer
      const matchesWithLogos = uniqueMatches.map(match => {
        // Try to find logo from MSN_LEAGUE_MAP using league name
        const leagueName = match.league.name?.toLowerCase() || "";
        let logo = match.league.logo || "";
        
        // Search MSN_LEAGUE_MAP for matching league
        for (const [key, leagueData] of Object.entries(MSN_LEAGUE_MAP)) {
          if (
            leagueData.name.toLowerCase() === leagueName ||
            key.toLowerCase().includes(leagueName.replace(/\s+/g, "")) ||
            (leagueName.includes("copa do brasil") && key.includes("CopaDoBrasil")) ||
            (leagueName.includes("brasileir") && key.includes("BrasileiroSerieA")) ||
            (leagueName.includes("premier") && key.includes("PremierLeague")) ||
            (leagueName.includes("champions") && key.includes("ChampionsLeague")) ||
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
    // backendFavorites is loaded automatically by FavoritesContext
  }, []);

  useEffect(() => {
    // Use backend favorites if available (from context, updates automatically)
    if (backendFavorites.length > 0) {
      console.log(`[HomeScreen] Using ${backendFavorites.length} favorites from context:`, backendFavorites.map(f => f.name));
      fetchNextMatchesForFavorites(backendFavorites);
    } else if (favoriteTeams.length > 0) {
      // Fall back to local context (just IDs, no msnId)
      const localFavs = favoriteTeams.map(id => ({ id, name: '', logo: '', country: '' }));
      fetchNextMatchesForFavorites(localFavs);
    } else {
      setFavoriteNextMatches([]);
    }
  }, [backendFavorites, favoriteTeams, todaysMatches, liveMatches]);

  const fetchNextMatchesForFavorites = async (favorites: Array<{ id: number; name?: string; msnId?: string }>) => {
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
          console.log(`[HomeScreen] Processing favorite team: ${teamId} (${fav.name || 'unknown'})`);
          
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
            console.log(`[HomeScreen] Team ${teamId} MSN ID: ${msnId || 'NOT FOUND'} (stored: ${!!fav.msnId})`);
            
            if (msnId) {
              let msnGames = await msnSportsApi.getTeamLiveSchedule(msnId, 5);
              console.log(`[HomeScreen] Team ${teamId} MSN games fetched: ${msnGames?.length || 0}`);
              
              // If no games found via team schedule, try fetching from league and filtering
              if (!msnGames || msnGames.length === 0) {
                // Try to find the league from the msnId
                const leagueMatch = msnId.match(/Soccer_([^_]+_[^_]+)/);
                if (leagueMatch) {
                  const leagueId = `Soccer_${leagueMatch[1]}`;
                  console.log(`[HomeScreen] Team ${teamId} trying league fallback: ${leagueId}`);
                  
                  try {
                    const leagueGames = await msnSportsApi.getLiveAroundLeague(leagueId, "Soccer");
                    // Filter games where this team is playing (by team name)
                    const teamName = fav.name?.toLowerCase() || "";
                    const teamGames = leagueGames.filter((game: any) => {
                      const homeName = game.participants?.[0]?.team?.name?.localizedName?.toLowerCase() || 
                                       game.participants?.[0]?.team?.name?.rawName?.toLowerCase() || "";
                      const awayName = game.participants?.[1]?.team?.name?.localizedName?.toLowerCase() || 
                                       game.participants?.[1]?.team?.name?.rawName?.toLowerCase() || "";
                      return homeName.includes(teamName) || awayName.includes(teamName) ||
                             teamName.includes(homeName) || teamName.includes(awayName);
                    });
                    
                    if (teamGames.length > 0) {
                      msnGames = teamGames;
                      console.log(`[HomeScreen] Team ${teamId} found ${teamGames.length} games via league fallback`);
                    }
                  } catch (leagueError) {
                    console.log(`[HomeScreen] Team ${teamId} league fallback failed:`, leagueError);
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
                   console.log(`[HomeScreen] Team ${teamId} next match: ${match.teams.home.name} vs ${match.teams.away.name}`);
                   results.push({ teamId, match });
                } else {
                   console.log(`[HomeScreen] Team ${teamId} no upcoming PreGame found`);
                }
              }
            } else {
               // Fallback to football-data.org (limited)
               console.log(`[HomeScreen] Team ${teamId} using football-data.org fallback`);
               const fallbackData = await api.getTeamUpcomingMatches(teamId, 1);
               if (fallbackData && fallbackData.length > 0) {
                 const match = fallbackData[0];
                 console.log(`[HomeScreen] Team ${teamId} fallback match found`);
                 results.push({ teamId, match });
               } else {
                 console.log(`[HomeScreen] Team ${teamId} no fallback match found`);
               }
            }
          } catch (err) {
            console.log(`[HomeScreen] Error fetching next match for team ${teamId}`, err);
          }
        })
      );

      // Sort by date soonest first
      results.sort((a, b) => 
        new Date(a.match.fixture.date).getTime() - new Date(b.match.fixture.date).getTime()
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
        "Basketball_NBA",
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
    { code: "NBA", name: "NBA", icon: "🏀" },
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
        { id: "Soccer_BrazilBrasileiroSerieA", sport: "Soccer", country: "Brazil" },
        { id: "Soccer_BrazilCopaDoBrasil", sport: "Soccer", country: "Brazil" },
        { id: "Soccer_InternationalClubsUEFAChampionsLeague", sport: "Soccer", country: "Europe" },
        { id: "Soccer_SpainLaLiga", sport: "Soccer", country: "Spain" },
        { id: "Soccer_EnglandPremierLeague", sport: "Soccer", country: "England" },
        { id: "Soccer_GermanyBundesliga", sport: "Soccer", country: "Germany" },
        { id: "Soccer_ItalySerieA", sport: "Soccer", country: "Italy" },
        { id: "Soccer_FranceLigue1", sport: "Soccer", country: "France" },
        { id: "Soccer_PortugalPrimeiraLiga", sport: "Soccer", country: "Portugal" },
        { id: "Basketball_NBA", sport: "Basketball", country: "USA" },
        { id: "Soccer_BrazilCarioca", sport: "Soccer", country: "Brazil" },
        { id: "Soccer_BrazilMineiro", sport: "Soccer", country: "Brazil" },
        { id: "Soccer_BrazilPaulistaSerieA1", sport: "Soccer", country: "Brazil" },
        { id: "Soccer_BrazilGaucho", sport: "Soccer", country: "Brazil" },
      ];

      const teamsMap = new Map<number, { id: number; name: string; logo: string; country: string; msnId?: string }>();
      const queryLower = query.toLowerCase();

      // Fetch from multiple leagues in parallel
      await Promise.all(
        msnLeagues.map(async (league) => {
          try {
            const games = await msnSportsApi.getLiveAroundLeague(league.id, league.sport);
            games.forEach((game: any) => {
              game.participants?.forEach((participant: any) => {
                const team = participant.team;
                if (team && team.id) {
                  const teamName = team.name?.localizedName || team.name?.rawName || "";
                  // Filter by query
                  if (teamName.toLowerCase().includes(queryLower)) {
                    const teamId = parseInt(team.id.split("_").pop() || "0");
                    if (!teamsMap.has(teamId)) {
                      teamsMap.set(teamId, {
                        id: teamId,
                        name: teamName,
                        logo: team.image?.id ? `https://www.bing.com/th?id=${team.image.id}&w=80&h=80` : "",
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

      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text style={styles.dateText}>
            {selectedDate
              .toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
              .toUpperCase()}
          </Text>
          <View style={styles.titleContainer}>
            <Text style={styles.titleHighlight}>Fut</Text>
            <Text style={styles.title}>Score</Text>
            <View style={styles.liveDotHeader} />
          </View>
        </View>

        <View style={styles.headerButtonsRow}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate("Calendar")}
            activeOpacity={0.8}>
            <LinearGradient
              colors={["#2a2a2a", "#1a1a1a"]}
              style={styles.notificationGradient}>
              <Calendar size={18} color="#22c55e" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate("NotificationSettings")}
            activeOpacity={0.8}>
            <LinearGradient
              colors={["#2a2a2a", "#1a1a1a"]}
              style={styles.notificationGradient}>
              <Bell size={18} color="#a1a1aa" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}>
            <LinearGradient
              colors={["#2a2a2a", "#1a1a1a"]}
              style={styles.profileGradient}>
              <User size={18} color="#a1a1aa" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelectorWrapper}>
        <View style={styles.dateSelectorOuterContainer}>
          <LinearGradient
            colors={[
              "rgba(34,197,94,0.12)",
              "rgba(22,163,74,0.05)",
              "transparent",
            ]}
            style={styles.dateSelectorGradientBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.dateSelectorHeader}>
            <View style={styles.dateSelectorTitleRow}>
              <View style={styles.dateSelectorIconWrapper}>
                <LinearGradient
                  colors={["#22c55e", "#16a34a"]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Calendar size={14} color="#fff" />
              </View>
              <Text style={styles.dateSelectorTitle}>Selecionar Data</Text>
            </View>
            <Text style={styles.dateSelectorMonth}>
              {selectedDate
                .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
                .replace(/^\w/, (c) => c.toUpperCase())}
            </Text>
          </View>
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
                // Use local date formatting to avoid timezone shift issues
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
                    activeOpacity={0.7}>
                    {isSelected && (
                      <LinearGradient
                        colors={["#4ade80", "#22c55e"]}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    )}
                    {isSelected && <View style={styles.dateButtonGlow} />}
                    <Text
                      style={[
                        styles.dateDayText,
                        isSelected && styles.dateTextActive,
                        isDateToday && !isSelected && styles.dateDayTextToday,
                      ]}>
                      {isDateToday
                        ? "HOJE"
                        : date
                            .toLocaleDateString("pt-BR", { weekday: "short" })
                            .toUpperCase()
                            .replace(".", "")}
                    </Text>
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
                    {hasMatches && !isSelected && (
                      <View style={styles.matchIndicatorDot}>
                        <View style={styles.matchIndicatorDotInner} />
                      </View>
                    )}
                    {hasMatches && isSelected && (
                      <View style={styles.matchIndicatorDotActive}>
                        <View style={styles.matchIndicatorDotActiveInner} />
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

      {/* Action Buttons - Favorites, Standings, and Leagues Explorer */}
      <View style={styles.actionButtonsContainer}>
        <View style={styles.actionButtonsHeader}>
          <Text style={styles.actionButtonsTitle}>Ações Rápidas</Text>
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>Deslize para ver mais</Text>
            <Text style={styles.swipeHintArrow}>›</Text>
          </View>
        </View>
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
                NBA: "Basketball_NBA",
              };
              
              const targetLeague = 
                selectedLeague !== "ALL" && selectedLeague !== "FAV" && selectedLeague !== "FINISHED"
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
        </ScrollView>
      </View>

      {/* League Selector */}
      <View style={styles.leagueSelectorWrapper}>
        <View style={styles.leagueSelectorHeader}>
          <Text style={styles.leagueSelectorTitle}>Competições</Text>
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>Deslize para ver mais</Text>
            <Text style={styles.swipeHintArrow}>›</Text>
          </View>
        </View>
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
            // Restore scroll position after re-render
            if (leagueSelectorRef.current && leagueScrollPosition.current > 0) {
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
            
            return (
              <TouchableOpacity
                key={league.code}
                style={[
                  styles.leagueChip,
                  isFirst && styles.leagueChipFirst,
                  isLast && styles.leagueChipLast,
                  isSelected && styles.leagueChipActive,
                ]}
                onPress={() => setSelectedLeague(league.code)}
                activeOpacity={0.7}>
                {isSelected && (
                  <LinearGradient
                    colors={["#22c55e", "#16a34a"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
                  />
                )}
                <View style={styles.leagueChipContent}>
                  <Text style={styles.leagueChipIcon}>{league.icon}</Text>
                  <Text
                    style={[
                      styles.leagueChipText,
                      isSelected && styles.leagueChipTextActive,
                    ]}>
                    {league.name}
                  </Text>
                </View>
                {isSelected && <View style={styles.leagueChipGlow} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  const memoizedHeader = useMemo(() => renderHeader(), [
    selectedDate,
    warnings,
    daysWithMatches,
    selectedLeague,
    loadingFavorites,
    favoriteNextMatches,
  ]);

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
          NBA: "Basketball_NBA",
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
      ["1H", "2H", "HT", "ET", "BT", "P", "Q1", "Q2", "Q3", "Q4"].includes(status) ||
      status.startsWith("OT")
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
    NBA: "Basketball_NBA",
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
    Basketball_NBA: "Basketball_NBA",
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
    overflow: 'hidden',
  },
  actionButtonsContainer: {
    marginBottom: 16,
  },
  actionButtonsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionButtonsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  actionButtonsContent: {
    paddingRight: 20,
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
    marginBottom: 28,
  },
  dateText: {
    color: "#e4e4e7",
    fontSize: 11,
    fontWeight: "700",
    // letterSpacing: 1.5, // Removed to prevent truncation
    marginBottom: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  titleHighlight: {
    fontSize: 32,
    fontWeight: "300",
    color: "#fff",
    letterSpacing: -1,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -1,
  },
  liveDotHeader: {
    width: 6,
    height: 6,
    borderRadius: 3,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
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
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
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
  profileButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  profileGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 20,
    marginHorizontal: -4,
  },
  dateSelectorOuterContainer: {
    backgroundColor: "#18181b",
    borderRadius: 28,
    padding: 18,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dateSelectorGradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dateSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  dateSelectorTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateSelectorIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  dateSelectorTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dateSelectorMonth: {
    color: "#4ade80",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "capitalize",
    letterSpacing: 0.5,
  },
  dateSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateSelectorContainer: {
    paddingHorizontal: 0,
    flexGrow: 1,
  },
  dateButton: {
    width: 60,
    height: 76,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  dateButtonActive: {
    backgroundColor: "#22c55e",
    borderColor: "rgba(74, 222, 128, 0.5)",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  dateButtonToday: {
    borderColor: "rgba(34,197,94,0.4)",
    borderWidth: 1.5,
  },
  dateButtonGlow: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 100,
  },
  dateDayText: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dateDayTextToday: {
    color: "#22c55e",
  },
  dateNumberText: {
    color: "#a1a1aa",
    fontSize: 22,
    fontWeight: "800",
  },
  dateNumberTextToday: {
    color: "#22c55e",
  },
  dateTextActive: {
    color: "#fff",
  },
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
    marginTop: 8,
    marginBottom: 4,
  },
  leagueSelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  leagueSelectorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 1.5,
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
    paddingRight: 20,
  },
  leagueChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
    borderColor: "rgba(34, 197, 94, 0.3)",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  leagueChipContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
    gap: 6,
  },
  leagueChipIcon: {
    fontSize: 14,
  },
  leagueChipText: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "600",
  },
  leagueChipTextActive: {
    color: "#fff",
    fontWeight: "700",
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
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 12,
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
});
