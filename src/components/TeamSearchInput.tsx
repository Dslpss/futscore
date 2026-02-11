import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, Search } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";

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

export const TeamSearchInput = React.memo(
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
            ]}
          >
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
                style={teamSearchStyles.clearButton}
              >
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
                        activeOpacity={0.7}
                      >
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
                            numberOfLines={1}
                          >
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
                          }}
                        >
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
});
