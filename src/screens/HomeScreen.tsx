import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "lucide-react-native";
import axios from "axios";
import { api } from "../services/api";
import { CONFIG } from "../constants/config";
import { Match } from "../types";
import {
  getNextFavoriteMatch,
  getNextMatchesForFavorites,
} from "../utils/matchHelpers";

const { width } = Dimensions.get("window");

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
  const { favoriteTeams } = useFavorites();
  const { user, signOut } = useAuth();
  const [selectedLeague, setSelectedLeague] = useState<string>("ALL");
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Date Selection State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [customMatches, setCustomMatches] = useState<Match[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [daysWithMatches, setDaysWithMatches] = useState<Set<string>>(
    new Set()
  );
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // League logos cache
  const [leagueLogos, setLeagueLogos] = useState<Record<string, string>>({});

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
    if (isToday(selectedDate)) {
      await contextRefresh();
    } else {
      await fetchMatchesForDate(selectedDate);
    }
  };

  useEffect(() => {
    if (!isToday(selectedDate)) {
      fetchMatchesForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchMatchesForDate = async (date: Date) => {
    setLoadingCustom(true);
    try {
      const dateStr = date.toISOString().split("T")[0];

      // 1. Fetch from football-data.org (Brasileirão, Champions, La Liga)
      const footballDataIds = ["BSA", "CL", "PD"];
      let footballDataMatches: Match[] = [];

      const footballDataPromises = footballDataIds.map((id) =>
        api.getFixtures(id, dateStr)
      );
      const footballDataResults = await Promise.all(footballDataPromises);

      footballDataResults.forEach((matches) => {
        footballDataMatches = [...footballDataMatches, ...matches];
      });

      // 2. Fetch from MSN Sports API using getScheduleByDate for specific date
      const { msnSportsApi } = await import("../services/msnSportsApi");
      const { transformMsnGameToMatch } = await import(
        "../utils/msnTransformer"
      );

      const msnLeagueIds = [
        "Soccer_BrazilBrasileiroSerieA", // Brasileirão
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

      let msnMatches: Match[] = [];

      // Use getScheduleByDate for fetching matches on specific dates
      for (const leagueId of msnLeagueIds) {
        try {
          const games = await msnSportsApi.getScheduleByDate(leagueId, dateStr);

          const transformedGames = games.map((game: any) =>
            transformMsnGameToMatch({ ...game, seasonId: leagueId })
          );
          msnMatches = [...msnMatches, ...transformedGames];
        } catch (error) {
          console.error(
            `[HomeScreen] Error fetching MSN Sports for ${leagueId}:`,
            error
          );
        }
      }

      // 3. Combine all matches (no need to filter by date since getScheduleByDate already does that)
      const allMatches = [...footballDataMatches, ...msnMatches];

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

      setCustomMatches(uniqueMatches);
      console.log(
        `[HomeScreen] Fetched ${uniqueMatches.length} matches for ${dateStr}`
      );
    } catch (error) {
      console.error("Error fetching custom matches", error);
    } finally {
      setLoadingCustom(false);
    }
  };

  useEffect(() => {
    fetchWarnings();
    checkUpdate();
    fetchMatchCalendar();
    fetchLeagueLogos();
  }, []);

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
        "Soccer_BrazilBrasileiroSerieA",
        "Soccer_InternationalClubsUEFAChampionsLeague",
        "Soccer_UEFAEuropaLeague",
        "Soccer_EnglandPremierLeague",
        "Soccer_GermanyBundesliga",
        "Soccer_ItalySerieA",
        "Soccer_FranceLigue1",
        "Soccer_SpainLaLiga",
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
    { code: "ALL", name: "Todos" },
    { code: "FAV", name: "Favoritos" },
    { code: "BSA", name: "Brasileirão" },
    { code: "CL", name: "Champions" },
    { code: "EL", name: "Europa League" },
    { code: "PD", name: "La Liga" },
    { code: "PL", name: "Premier League" },
    { code: "BL1", name: "Bundesliga" },
    { code: "SA", name: "Serie A" },
    { code: "FL1", name: "Ligue 1" },
    { code: "PPL", name: "Liga Portugal" },
    { code: "NBA", name: "NBA" },
    { code: "FINISHED", name: "Finalizados" },
  ];

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
              const dateStr = date.toISOString().split("T")[0];
              const hasMatches = daysWithMatches.has(dateStr);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateButton,
                    isSelected && styles.dateButtonActive,
                  ]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.7}>
                  {isSelected && (
                    <LinearGradient
                      colors={["#22c55e", "#16a34a"]}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.dateDayText,
                      isSelected && styles.dateTextActive,
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
                    ]}>
                    {date.getDate()}
                  </Text>
                  {hasMatches && !isSelected && (
                    <View style={styles.matchIndicatorDot} />
                  )}
                  {hasMatches && isSelected && (
                    <View style={styles.matchIndicatorDotActive} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Calendar Button */}
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => {
              setCalendarMonth(selectedDate);
              setShowCalendarModal(true);
            }}
            activeOpacity={0.7}>
            <Calendar size={20} color="#22c55e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Next Match Widget */}
      <NextMatchWidget
        matches={(() => {
          const sourceMatches = isToday(selectedDate)
            ? [...liveMatches, ...todaysMatches]
            : customMatches;
          return getNextMatchesForFavorites(sourceMatches, favoriteTeams);
        })()}
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

      {/* Action Buttons - Favorites, Standings, and Leagues Explorer */}
      <View style={styles.actionButtonsContainer}>
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

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("Standings", {
                leagueId:
                  selectedLeague !== "ALL"
                    ? selectedLeague
                    : "Soccer_EnglandPremierLeague",
              })
            }
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
        </ScrollView>
      </View>

      {/* League Selector */}
      <View style={styles.leagueSelectorWrapper}>
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
          {leagues.map((league) => (
            <TouchableOpacity
              key={league.code}
              style={[
                styles.leagueButton,
                selectedLeague === league.code && styles.leagueButtonActive,
              ]}
              onPress={() => setSelectedLeague(league.code)}
              activeOpacity={0.8}>
              {selectedLeague === league.code && (
                <LinearGradient
                  colors={["#22c55e", "#16a34a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Text
                style={[
                  styles.leagueButtonText,
                  selectedLeague === league.code &&
                    styles.leagueButtonTextActive,
                ]}>
                {league.name}
              </Text>
            </TouchableOpacity>
          ))}
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
    return uniqueMatches;
  })();

  // Group matches
  const finishedMatches = filteredMatches.filter((m) =>
    ["FT", "AET", "PEN"].includes(m.fixture.status.short)
  );
  const scheduledMatches = filteredMatches.filter((m) =>
    ["NS", "TBD", "TIMED"].includes(m.fixture.status.short)
  );
  const live = filteredMatches.filter((m) =>
    ["1H", "2H", "HT"].includes(m.fixture.status.short)
  );

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
          ListHeaderComponent={renderHeader}
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

      {/* Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}>
          <View
            style={styles.calendarModalContent}
            onStartShouldSetResponder={() => true}>
            <LinearGradient
              colors={["#18181b", "#09090b"]}
              style={styles.calendarModalGradient}>
              {/* Header */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={() => {
                    const newMonth = new Date(calendarMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    setCalendarMonth(newMonth);
                  }}
                  style={styles.calendarNavButton}>
                  <ChevronLeft size={24} color="#22c55e" />
                </TouchableOpacity>

                <Text style={styles.calendarTitle}>
                  {calendarMonth
                    .toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })
                    .replace(/^\w/, (c) => c.toUpperCase())}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    const newMonth = new Date(calendarMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    setCalendarMonth(newMonth);
                  }}
                  style={styles.calendarNavButton}>
                  <ChevronRight size={24} color="#22c55e" />
                </TouchableOpacity>
              </View>

              {/* Week Days Header */}
              <View style={styles.calendarWeekHeader}>
                {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map(
                  (day) => (
                    <Text key={day} style={styles.calendarWeekDay}>
                      {day}
                    </Text>
                  )
                )}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {(() => {
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const today = new Date();

                  // Helper function to format date as YYYY-MM-DD in local timezone
                  const formatLocalDate = (d: Date) => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    return `${y}-${m}-${day}`;
                  };

                  const days = [];

                  // Empty cells for days before first day of month
                  for (let i = 0; i < firstDay; i++) {
                    days.push(
                      <View
                        key={`empty-${i}`}
                        style={styles.calendarDayEmpty}
                      />
                    );
                  }

                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const dateStr = formatLocalDate(date);
                    const hasMatches = daysWithMatches.has(dateStr);
                    const isSelected =
                      selectedDate.getDate() === day &&
                      selectedDate.getMonth() === month &&
                      selectedDate.getFullYear() === year;
                    const isToday =
                      today.getDate() === day &&
                      today.getMonth() === month &&
                      today.getFullYear() === year;

                    days.push(
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.calendarDaySelected,
                          isToday && !isSelected && styles.calendarDayToday,
                        ]}
                        onPress={() => {
                          setSelectedDate(date);
                          setShowCalendarModal(false);
                        }}
                        activeOpacity={0.7}>
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            isToday &&
                              !isSelected &&
                              styles.calendarDayTextToday,
                          ]}>
                          {day}
                        </Text>
                        {hasMatches && (
                          <View
                            style={[
                              styles.calendarMatchDot,
                              isSelected && styles.calendarMatchDotSelected,
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }

                  return days;
                })()}
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.calendarCloseButton}
                onPress={() => setShowCalendarModal(false)}
                activeOpacity={0.7}>
                <Text style={styles.calendarCloseButtonText}>Fechar</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>
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
  dateSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateSelectorContainer: {
    paddingHorizontal: 4,
    flexGrow: 1,
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#18181b",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginRight: 4,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  dateButton: {
    width: 56,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#18181b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  dateButtonActive: {
    backgroundColor: "#22c55e",
    borderColor: "transparent",
  },
  dateDayText: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  dateNumberText: {
    color: "#e4e4e7",
    fontSize: 18,
    fontWeight: "800",
  },
  dateTextActive: {
    color: "#fff",
  },
  matchIndicatorDot: {
    position: "absolute",
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#22c55e",
  },
  matchIndicatorDotActive: {
    position: "absolute",
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#fff",
  },

  leagueSelectorWrapper: {
    marginHorizontal: -4,
  },
  leagueSelectorContainer: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    padding: 4,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    minWidth: "100%", // Ensure it takes full width if content is small
  },
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
  actionButtonsContainer: {
    marginBottom: 20,
    marginHorizontal: -16,
  },
  actionButtonsContent: {
    paddingHorizontal: 16,
    gap: 12,
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
  // Calendar Modal Styles
  calendarModalContent: {
    backgroundColor: "#18181b",
    borderRadius: 24,
    width: "90%",
    maxWidth: 360,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  calendarModalGradient: {
    padding: 20,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  calendarNavButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  calendarTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  calendarWeekHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: "center",
    color: "#71717a",
    fontSize: 12,
    fontWeight: "600",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayEmpty: {
    width: "14.28%",
    aspectRatio: 1,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDaySelected: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 12,
  },
  calendarDayText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  calendarDayTextSelected: {
    color: "#000000",
    fontWeight: "700",
  },
  calendarDayTextToday: {
    color: "#22c55e",
  },
  calendarMatchDot: {
    position: "absolute",
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#22c55e",
  },
  calendarMatchDotSelected: {
    backgroundColor: "#000000",
  },
  calendarCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    alignItems: "center",
  },
  calendarCloseButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
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
});
