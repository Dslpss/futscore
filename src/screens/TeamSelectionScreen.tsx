import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  Search,
  Heart,
  ChevronLeft,
  Check,
  Users,
  Star,
} from "lucide-react-native";
import { api } from "../services/api";
import { authApi, FavoriteTeam } from "../services/authApi";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { TeamCard } from "../components/TeamCard";
import { TeamDetailsModal } from "../components/TeamDetailsModal";

const { width } = Dimensions.get("window");

interface TeamWithCountry {
  id: number;
  name: string;
  logo: string;
  country: string;
  msnId?: string; // MSN Sports Team ID for better data fetching
}

export const TeamSelectionScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { user, signOut } = useAuth();
  const { refreshFromBackend } = useFavorites();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [teams, setTeams] = useState<TeamWithCountry[]>([]);
  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithCountry | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchAnimation = useRef(new Animated.Value(0)).current;

  const leagues = [
    { code: "all", name: "Todas" },
    { code: "favorites", name: "Favoritos" },
    { code: "BSA", name: "Brasileirão" },
    { code: "CDB", name: "Copa do Brasil" },
    { code: "CL", name: "Champions" },
    { code: "EL", name: "Europa League" },
    { code: "PD", name: "La Liga" },
    { code: "PL", name: "Premier League" },
    { code: "BL1", name: "Bundesliga" },
    { code: "SA", name: "Serie A" },
    { code: "FL1", name: "Ligue 1" },
    { code: "PPL", name: "Liga Portugal" },
    { code: "NBA", name: "NBA" },
  ];

  useEffect(() => {
    if (user) {
      loadFavoriteTeams();
    }
    loadAllTeams();
  }, [user]);

  const loadFavoriteTeams = async () => {
    try {
      const favorites = await authApi.getFavoriteTeams();
      setFavoriteTeams(favorites);
    } catch (error: any) {
      console.error("Error loading favorites:", error);
      if (
        error.message.includes("401") ||
        error.message.includes("authorization denied")
      ) {
        Alert.alert("Sessão Expirada", "Por favor, faça login novamente.");
        signOut();
        navigation.goBack();
      }
    }
  };

  const loadAllTeams = async () => {
    setLoading(true);
    try {
      // Load teams ONLY from MSN Sports API (so msnId is always available)
      const { msnSportsApi } = await import("../services/msnSportsApi");
      let allTeams: TeamWithCountry[] = [];

      const msnLeagues = [
        {
          id: "Soccer_BrazilBrasileiroSerieA",
          sport: "Soccer",
          name: "BSA",
          country: "Brazil",
        },
        {
          id: "Soccer_InternationalClubsUEFAChampionsLeague",
          sport: "Soccer",
          name: "CL",
          country: "Europe",
        },
        {
          id: "Soccer_SpainLaLiga",
          sport: "Soccer",
          name: "PD",
          country: "Spain",
        },
        {
          id: "Soccer_EnglandPremierLeague",
          sport: "Soccer",
          name: "PL",
          country: "England",
        },
        {
          id: "Soccer_GermanyBundesliga",
          sport: "Soccer",
          name: "BL1",
          country: "Germany",
        },
        {
          id: "Soccer_ItalySerieA",
          sport: "Soccer",
          name: "SA",
          country: "Italy",
        },
        {
          id: "Soccer_FranceLigue1",
          sport: "Soccer",
          name: "FL1",
          country: "France",
        },
        {
          id: "Soccer_PortugalPrimeiraLiga",
          sport: "Soccer",
          name: "PPL",
          country: "Portugal",
        },
        {
          id: "Soccer_UEFAEuropaLeague",
          sport: "Soccer",
          name: "EL",
          country: "Europe",
        },
        {
          id: "Basketball_NBA",
          sport: "Basketball",
          name: "NBA",
          country: "USA",
        },
      ];

      for (const league of msnLeagues) {
        try {
          const games = await msnSportsApi.getLiveAroundLeague(
            league.id,
            league.sport
          );

          // Extract unique teams from games
          const teamsSet = new Map<number, TeamWithCountry>();

          games.forEach((game: any) => {
            game.participants?.forEach((participant: any) => {
              const team = participant.team;
              if (team && team.id) {
                const teamId = parseInt(team.id.split("_").pop() || "0");
                const teamName =
                  team.name?.localizedName || team.name?.rawName || "Unknown";
                const teamLogo = team.image?.id
                  ? `https://www.bing.com/th?id=${team.image.id}&w=80&h=80`
                  : "";
                const msnId = team.id; // Save full MSN ID

                if (!teamsSet.has(teamId)) {
                  teamsSet.set(teamId, {
                    id: teamId,
                    name: teamName,
                    logo: teamLogo,
                    country: league.country,
                    msnId: msnId,
                  });
                }
              }
            });
          });

          allTeams = [...allTeams, ...Array.from(teamsSet.values())];
        } catch (error) {
          console.error(`Error loading teams from ${league.name}:`, error);
        }
      }

      // Deduplicate teams by ID
      const uniqueTeams = Array.from(
        new Map(allTeams.map((team) => [team.id, team])).values()
      );

      setTeams(uniqueTeams);
    } catch (error) {
      console.error("Error loading teams:", error);
      Alert.alert("Erro", "Não foi possível carregar os times");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      loadAllTeams();
      return;
    }

    setLoading(true);
    try {
      const leagueCodes =
        selectedLeague === "all"
          ? ["BSA", "CL", "PD", "PL", "BL1", "SA", "FL1", "PPL", "NBA"]
          : [selectedLeague];

      const results = await api.searchTeams(query, leagueCodes);
      setTeams(results);
    } catch (error) {
      console.error("Error searching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueFilter = async (leagueCode: string) => {
    setSelectedLeague(leagueCode);
    setLoading(true);

    try {
      if (leagueCode === "all") {
        await loadAllTeams();
      } else if (leagueCode === "favorites") {
        setTeams(favoriteTeams);
      } else {
        // All leagues now use MSN Sports API only
        const msnLeagueMap: Record<
          string,
          { id: string; sport: string; country: string }
        > = {
          BSA: {
            id: "Soccer_BrazilBrasileiroSerieA",
            sport: "Soccer",
            country: "Brazil",
          },
          CDB: {
            id: "Soccer_BrazilCopaDoBrasil",
            sport: "Soccer",
            country: "Brazil",
          },
          CL: {
            id: "Soccer_InternationalClubsUEFAChampionsLeague",
            sport: "Soccer",
            country: "Europe",
          },
          PD: {
            id: "Soccer_SpainLaLiga",
            sport: "Soccer",
            country: "Spain",
          },
          PL: {
            id: "Soccer_EnglandPremierLeague",
            sport: "Soccer",
            country: "England",
          },
          BL1: {
            id: "Soccer_GermanyBundesliga",
            sport: "Soccer",
            country: "Germany",
          },
          SA: { id: "Soccer_ItalySerieA", sport: "Soccer", country: "Italy" },
          FL1: {
            id: "Soccer_FranceLigue1",
            sport: "Soccer",
            country: "France",
          },
          PPL: {
            id: "Soccer_PortugalPrimeiraLiga",
            sport: "Soccer",
            country: "Portugal",
          },
          EL: {
            id: "Soccer_UEFAEuropaLeague",
            sport: "Soccer",
            country: "Europe",
          },
          NBA: { id: "Basketball_NBA", sport: "Basketball", country: "USA" },
        };

        if (msnLeagueMap[leagueCode]) {
          // Load from MSN Sports
          const { msnSportsApi } = await import("../services/msnSportsApi");
          const msnLeague = msnLeagueMap[leagueCode];

          const games = await msnSportsApi.getLiveAroundLeague(
            msnLeague.id,
            msnLeague.sport
          );

          // Extract unique teams from games
          const teamsSet = new Map<number, TeamWithCountry>();

          games.forEach((game: any) => {
            game.participants?.forEach((participant: any) => {
              const team = participant.team;
              if (team && team.id) {
                const teamId = parseInt(team.id.split("_").pop() || "0");
                const teamName =
                  team.name?.localizedName || team.name?.rawName || "Unknown";
                const teamLogo = team.image?.id
                  ? `https://www.bing.com/th?id=${team.image.id}&w=80&h=80`
                  : "";
                const msnId = team.id; // Save full MSN ID

                if (!teamsSet.has(teamId)) {
                  teamsSet.set(teamId, {
                    id: teamId,
                    name: teamName,
                    logo: teamLogo,
                    country: msnLeague.country,
                    msnId: msnId,
                  });
                }
              }
            });
          });

          setTeams(Array.from(teamsSet.values()));
        }
      }
    } catch (error) {
      console.error("Error filtering teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (team: TeamWithCountry) => {
    const isFavorite = favoriteTeams.some((fav) => fav.id === team.id);

    if (isFavorite) {
      setFavoriteTeams(favoriteTeams.filter((fav) => fav.id !== team.id));
    } else {
      setFavoriteTeams([...favoriteTeams, team]);
    }
  };

  const saveFavorites = async () => {
    setSaving(true);
    try {
      await authApi.saveFavoriteTeams(favoriteTeams);
      // Refresh the context so HomeScreen updates immediately
      await refreshFromBackend();
      Alert.alert("Sucesso", "Times favoritos salvos com sucesso!");
    } catch (error) {
      console.error("Error saving favorites:", error);
      Alert.alert("Erro", "Não foi possível salvar os times favoritos");
    } finally {
      setSaving(false);
    }
  };

  const handleTeamPress = (team: TeamWithCountry) => {
    setSelectedTeam(team);
    setModalVisible(true);
  };

  const handleSearchFocus = (focused: boolean) => {
    setSearchFocused(focused);
    Animated.timing(searchAnimation, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const filteredTeams = teams;

  const searchBorderColor = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.05)", "#22c55e"],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      {/* Header Premium */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <LinearGradient
            colors={["#2a2a2a", "#1a1a1a"]}
            style={styles.backButtonGradient}>
            <ChevronLeft size={22} color="#e4e4e7" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Meus Times</Text>
          <Text style={styles.headerSubtitle}>Selecione seus favoritos</Text>
        </View>

        <TouchableOpacity
          onPress={saveFavorites}
          style={styles.saveButton}
          disabled={saving}
          activeOpacity={0.7}>
          <LinearGradient
            colors={saving ? ["#2a2a2a", "#1a1a1a"] : ["#22c55e", "#16a34a"]}
            style={styles.saveButtonGradient}>
            {saving ? (
              <ActivityIndicator color="#22c55e" size="small" />
            ) : (
              <Check size={20} color="#FFFFFF" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats Card */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={["#18181b", "#1f1f23"]}
          style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.statIconWrapper}>
              <LinearGradient
                colors={["#22c55e20", "#22c55e10"]}
                style={styles.statIconBg}>
                <Heart size={18} color="#22c55e" fill="#22c55e" />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.statNumber}>{favoriteTeams.length}</Text>
              <Text style={styles.statLabel}>Favoritos</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconWrapper}>
              <LinearGradient
                colors={["#3b82f620", "#3b82f610"]}
                style={styles.statIconBg}>
                <Users size={18} color="#3b82f6" />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.statNumber}>{teams.length}</Text>
              <Text style={styles.statLabel}>Times</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Search Bar Premium */}
      <View style={styles.searchWrapper}>
        <Animated.View
          style={[styles.searchContainer, { borderColor: searchBorderColor }]}>
          <Search size={18} color={searchFocused ? "#22c55e" : "#71717a"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar times..."
            placeholderTextColor="#71717a"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => handleSearchFocus(true)}
            onBlur={() => handleSearchFocus(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#71717a" />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {/* League Filter Premium */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}>
          {leagues.map((item) => (
            <TouchableOpacity
              key={item.code}
              style={[
                styles.filterButton,
                selectedLeague === item.code && styles.filterButtonActive,
              ]}
              onPress={() => handleLeagueFilter(item.code)}
              activeOpacity={0.7}>
              {selectedLeague === item.code && (
                <LinearGradient
                  colors={["#22c55e", "#16a34a"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <Text
                style={[
                  styles.filterButtonText,
                  selectedLeague === item.code && styles.filterButtonTextActive,
                ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Teams Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
          <Text style={styles.loadingText}>Carregando times...</Text>
          <Text style={styles.loadingSubtext}>Aguarde um momento</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTeams}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TeamCard
              team={item}
              isFavorite={favoriteTeams.some((fav) => fav.id === item.id)}
              onToggleFavorite={() => toggleFavorite(item)}
              onPress={() => handleTeamPress(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <LinearGradient
                  colors={["#22c55e20", "#22c55e05"]}
                  style={styles.emptyIconBg}>
                  <Star size={40} color="#22c55e" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>Nenhum time encontrado</Text>
              <Text style={styles.emptyText}>
                Tente buscar por outro termo ou selecione uma liga diferente
              </Text>
            </View>
          }
        />
      )}

      <TeamDetailsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        team={selectedTeam}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  backButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#e4e4e7",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 2,
  },
  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIconWrapper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#e4e4e7",
  },
  statLabel: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 16,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
  filterWrapper: {
    marginBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#18181b",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  filterButtonActive: {
    borderColor: "transparent",
  },
  filterButtonText: {
    color: "#71717a",
    fontSize: 13,
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    justifyContent: "space-between",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loadingText: {
    color: "#e4e4e7",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  loadingSubtext: {
    color: "#71717a",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    marginBottom: 20,
  },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  emptyTitle: {
    color: "#e4e4e7",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    color: "#71717a",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
