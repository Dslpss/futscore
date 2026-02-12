import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Search, Heart, Plus, Star } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { TeamLogo } from "./TeamLogo";
import { useFavorites } from "../context/FavoritesContext";
import { msnSportsApi } from "../services/msnSportsApi";

interface TeamResult {
  id: number;
  name: string;
  logo: string;
  country: string;
  msnId?: string;
}

interface TeamSearchBarProps {
  onTeamAdded?: () => void;
}

export const TeamSearchBar: React.FC<TeamSearchBarProps> = ({ onTeamAdded }) => {
  const { isFavoriteTeam, toggleFavoriteTeam } = useFavorites();
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TeamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  
  const animValue = useRef(new Animated.Value(0)).current;
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchTeams = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const msnLeagues = [
        { id: "Soccer_BrazilBrasileiroSerieA", sport: "Soccer", country: "Brasil" },
        { id: "Soccer_BrazilCopaDoBrasil", sport: "Soccer", country: "Brasil" },
        { id: "Soccer_InternationalClubsUEFAChampionsLeague", sport: "Soccer", country: "Europa" },
        { id: "Soccer_SpainLaLiga", sport: "Soccer", country: "Espanha" },
        { id: "Soccer_EnglandPremierLeague", sport: "Soccer", country: "Inglaterra" },
        { id: "Soccer_GermanyBundesliga", sport: "Soccer", country: "Alemanha" },
        { id: "Soccer_ItalySerieA", sport: "Soccer", country: "Itália" },
        { id: "Soccer_FranceLigue1", sport: "Soccer", country: "França" },
        { id: "Soccer_PortugalPrimeiraLiga", sport: "Soccer", country: "Portugal" },
      ];

      const teamsMap = new Map<number, TeamResult>();
      const queryLower = searchQuery.toLowerCase();

      await Promise.all(
        msnLeagues.map(async (league) => {
          try {
            const games = await msnSportsApi.getLiveAroundLeague(league.id, league.sport);
            games.forEach((game: any) => {
              game.participants?.forEach((participant: any) => {
                const team = participant.team;
                if (team && team.id) {
                  const teamName = team.name?.localizedName || team.name?.rawName || "";
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

      setResults(Array.from(teamsMap.values()).slice(0, 6));
    } catch (error) {
      console.error("Error searching teams:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchTeams(text);
    }, 400);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
  };

  const handleFocus = () => {
    setFocused(true);
    animValue.stopAnimation(() => {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 250,
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

  const handleToggleFavorite = (team: TeamResult) => {
    toggleFavoriteTeam(team.id, {
      name: team.name,
      logo: team.logo,
      country: team.country,
      msnId: team.msnId,
    });
    onTeamAdded?.();
  };

  const borderColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(34, 197, 94, 0.15)", "#22c55e"],
  });

  const shadowOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <View style={styles.container}>
      {/* Header with icon */}
      <View style={styles.headerRow}>
        <View style={styles.headerIconWrapper}>
          <LinearGradient
            colors={["#22c55e", "#16a34a"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Plus size={12} color="#fff" strokeWidth={3} />
        </View>
        <Text style={styles.headerTitle}>Adicionar Time Favorito</Text>
      </View>

      {/* Search Input */}
      <Animated.View 
        style={[
          styles.searchBox, 
          { 
            borderColor,
          }
        ]}
      >
        <LinearGradient
          colors={focused ? ["rgba(34, 197, 94, 0.08)", "rgba(22, 163, 74, 0.03)"] : ["transparent", "transparent"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.searchIconWrapper}>
          <Search size={16} color={focused ? "#22c55e" : "#52525b"} />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Digite o nome do time..."
          placeholderTextColor="#52525b"
          value={query}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color="#52525b" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Results Dropdown */}
      {(results.length > 0 || loading) && query.length >= 2 && (
        <View style={styles.resultsContainer}>
          <LinearGradient
            colors={["rgba(34, 197, 94, 0.05)", "transparent"]}
            style={styles.resultsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={styles.loadingText}>Buscando times...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultsTitle}>
                {results.length} time{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
              </Text>
              {results.map((team, index) => {
                const isFav = isFavoriteTeam(team.id);
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.resultItem,
                      index === results.length - 1 && styles.resultItemLast,
                      isFav && styles.resultItemFavorite,
                    ]}
                    onPress={() => handleToggleFavorite(team)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.teamLogoWrapper}>
                      <TeamLogo
                        uri={team.logo}
                        size={42}
                        style={styles.teamLogo}
                      />
                      {isFav && (
                        <View style={styles.favBadge}>
                          <Star size={8} color="#fff" fill="#fff" />
                        </View>
                      )}
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={[styles.teamName, isFav && styles.teamNameFav]} numberOfLines={1}>
                        {team.name}
                      </Text>
                      <View style={styles.countryRow}>
                        <View style={styles.countryDot} />
                        <Text style={styles.teamCountry}>{team.country}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.favoriteBtn, isFav && styles.favoriteBtnActive]}
                      onPress={() => handleToggleFavorite(team)}
                    >
                      <Heart
                        size={18}
                        color={isFav ? "#22c55e" : "#71717a"}
                        fill={isFav ? "#22c55e" : "transparent"}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && query.length >= 2 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhum time encontrado</Text>
          <Text style={styles.emptySubtext}>Tente buscar por outro nome</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  headerIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  headerTitle: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  searchIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#e4e4e7",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  clearBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsContainer: {
    backgroundColor: "#1a1a1e",
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.15)",
    overflow: "hidden",
  },
  resultsGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  resultsTitle: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  loadingContainer: {
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  resultItemLast: {
    borderBottomWidth: 0,
  },
  resultItemFavorite: {
    backgroundColor: "rgba(34, 197, 94, 0.06)",
  },
  teamLogoWrapper: {
    position: "relative",
  },
  teamLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  favBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1a1a1e",
  },
  teamInfo: {
    flex: 1,
    marginLeft: 14,
  },
  teamName: {
    color: "#e4e4e7",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  teamNameFav: {
    color: "#22c55e",
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  countryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#52525b",
  },
  teamCountry: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "500",
  },
  favoriteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  favoriteBtnActive: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  emptyState: {
    backgroundColor: "#1a1a1e",
    borderRadius: 16,
    marginTop: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  emptyText: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#52525b",
    fontSize: 12,
    marginTop: 4,
  },
});
