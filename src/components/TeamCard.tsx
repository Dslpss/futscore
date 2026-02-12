import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Heart } from "lucide-react-native";
import { TeamLogo } from "./TeamLogo";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface TeamCardProps {
  team: {
    id: number;
    name: string;
    logo: string;
    country: string;
  };
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  isFavorite,
  onToggleFavorite,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}>
      <LinearGradient
        colors={isFavorite ? ["#18181b", "#1a2e1a"] : ["#18181b", "#1f1f23"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, isFavorite && styles.gradientFavorite]}>
        {/* Favorite Badge */}
        <TouchableOpacity
          style={[
            styles.favoriteButton,
            isFavorite && styles.favoriteButtonActive,
          ]}
          onPress={onToggleFavorite}
          activeOpacity={0.7}>
          <Heart
            size={16}
            color={isFavorite ? "#22c55e" : "#71717a"}
            fill={isFavorite ? "#22c55e" : "transparent"}
          />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <TeamLogo
              uri={team.logo}
              size={48}
              style={styles.logo}
            />
          </View>
          <Text style={styles.teamName} numberOfLines={2}>
            {team.name}
          </Text>
          <View style={styles.countryBadge}>
            <Text style={styles.country} numberOfLines={1}>
              {team.country}
            </Text>
          </View>
        </View>

        {/* Glow effect for favorites */}
        {isFavorite && <View style={styles.glowEffect} />}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    padding: 16,
    minHeight: 160,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
  },
  gradientFavorite: {
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingTop: 8,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 48,
    height: 48,
  },
  teamName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e4e4e7",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  countryBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  country: {
    fontSize: 10,
    color: "#71717a",
    textAlign: "center",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  favoriteButtonActive: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  glowEffect: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "transparent",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    opacity: 0.3,
  },
});
