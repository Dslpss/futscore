import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Check, Trophy, Star } from "lucide-react-native";
import { useFavorites, AVAILABLE_LEAGUES, FavoriteLeague } from "../context/FavoritesContext";

const { width } = Dimensions.get("window");

interface FavoriteLeaguesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FavoriteLeaguesModal: React.FC<FavoriteLeaguesModalProps> = ({
  visible,
  onClose,
}) => {
  const { favoriteLeagues, toggleFavoriteLeague, isFavoriteLeague } = useFavorites();

  // Agrupar ligas por país
  const groupedLeagues = AVAILABLE_LEAGUES.reduce((acc, league) => {
    const country = league.country || "Other";
    if (!acc[country]) acc[country] = [];
    acc[country].push(league);
    return acc;
  }, {} as Record<string, FavoriteLeague[]>);

  // Ordem dos países
  const countryOrder = ["Brazil", "Europe", "South America", "England", "Spain", "Germany", "Italy", "France", "Portugal", "Argentina"];
  const sortedCountries = Object.keys(groupedLeagues).sort((a, b) => {
    const indexA = countryOrder.indexOf(a);
    const indexB = countryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const renderLeagueItem = (league: FavoriteLeague) => {
    const isFollowing = isFavoriteLeague(league.id);

    return (
      <TouchableOpacity
        key={league.id}
        style={[styles.leagueItem, isFollowing && styles.leagueItemActive]}
        onPress={() => toggleFavoriteLeague(league.id)}
        activeOpacity={0.7}
      >
        {/* Logo */}
        {league.logo && (
          <Image source={{ uri: league.logo }} style={styles.leagueLogo} />
        )}

        {/* Info */}
        <View style={styles.leagueInfo}>
          <Text style={styles.leagueName}>{league.name}</Text>
        </View>

        {/* Check */}
        <View style={[styles.checkBox, isFollowing && styles.checkBoxActive]}>
          {isFollowing && <Check size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={["#22c55e", "#16a34a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Trophy size={24} color="#fff" />
                <View>
                  <Text style={styles.headerTitle}>Ligas Favoritas</Text>
                  <Text style={styles.headerSubtitle}>
                    {favoriteLeagues.length} selecionadas
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Star size={16} color="#fbbf24" fill="#fbbf24" />
            <Text style={styles.descriptionText}>
              Receba notificações e veja jogos das competições que você segue
            </Text>
          </View>

          {/* Leagues List */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {sortedCountries.map((country) => (
              <View key={country} style={styles.countrySection}>
                <Text style={styles.countryTitle}>{country}</Text>
                <View style={styles.leaguesGrid}>
                  {groupedLeagues[country].map(renderLeagueItem)}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Confirm Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#22c55e", "#16a34a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmGradient}
              >
                <Text style={styles.confirmText}>Confirmar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    overflow: "hidden",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  descriptionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  descriptionText: {
    color: "#a1a1aa",
    fontSize: 13,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  countrySection: {
    marginBottom: 20,
  },
  countryTitle: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  leaguesGrid: {
    gap: 8,
  },
  leagueItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  leagueItemActive: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  leagueLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 12,
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3f3f46",
    justifyContent: "center",
    alignItems: "center",
  },
  checkBoxActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  confirmButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  confirmGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default FavoriteLeaguesModal;
