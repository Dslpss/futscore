import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Clock, Calendar, Tv } from "lucide-react-native";
import { widgetService, WidgetData } from "../services/widgetService";

const { width } = Dimensions.get("window");
const WIDGET_WIDTH = width - 32;

interface NextMatchWidgetPreviewProps {
  onPress?: () => void;
  compact?: boolean;
}

/**
 * Widget Preview Component
 * 
 * This component shows what the home screen widget will look like.
 * The actual widget needs to be implemented in native code:
 * - Android: AppWidgetProvider in Kotlin/Java
 * - iOS: WidgetKit in Swift
 */
export const NextMatchWidgetPreview: React.FC<NextMatchWidgetPreviewProps> = ({
  onPress,
  compact = false,
}) => {
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    loadWidgetData();
    
    // Refresh every minute
    const interval = setInterval(loadWidgetData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadWidgetData = async () => {
    const widgetData = await widgetService.getWidgetData();
    setData(widgetData);
  };

  if (!data?.match) {
    return (
      <TouchableOpacity
        style={[styles.container, compact && styles.containerCompact]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#1a1a2e", "#0f0f1a"]}
          style={styles.gradient}
        >
          <View style={styles.emptyState}>
            <Clock size={32} color="#888" />
            <Text style={styles.emptyTitle}>Próximo Jogo</Text>
            <Text style={styles.emptySubtitle}>
              {data?.favoriteTeamName
                ? "Sem jogos agendados"
                : "Adicione um time favorito"}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const { match, countdown } = data;

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.containerCompact]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#1a1a2e", "#0f0f1a"]}
          style={styles.gradient}
        >
          {/* Compact Layout */}
          <View style={styles.compactContent}>
            <View style={styles.compactTeams}>
              <Image
                source={{ uri: match.homeTeam.logo }}
                style={styles.compactLogo}
              />
              <Text style={styles.compactVs}>×</Text>
              <Image
                source={{ uri: match.awayTeam.logo }}
                style={styles.compactLogo}
              />
            </View>
            <View style={styles.compactInfo}>
              <Text style={styles.compactCountdown}>{countdown}</Text>
              <Text style={styles.compactDate}>{match.date}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={["#1a1a2e", "#0f0f1a"]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.countdownBadge}>
            <Clock size={12} color="#22c55e" />
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
          {match.competition?.logo && (
            <Image
              source={{ uri: match.competition.logo }}
              style={styles.competitionLogo}
            />
          )}
        </View>

        {/* Teams */}
        <View style={styles.teamsContainer}>
          {/* Home Team */}
          <View style={styles.team}>
            <Image
              source={{ uri: match.homeTeam.logo }}
              style={styles.teamLogo}
            />
            <Text style={styles.teamName} numberOfLines={1}>
              {match.homeTeam.shortName}
            </Text>
          </View>

          {/* VS */}
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
            <Text style={styles.timeText}>{match.time}</Text>
          </View>

          {/* Away Team */}
          <View style={styles.team}>
            <Image
              source={{ uri: match.awayTeam.logo }}
              style={styles.teamLogo}
            />
            <Text style={styles.teamName} numberOfLines={1}>
              {match.awayTeam.shortName}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.dateInfo}>
            <Calendar size={12} color="#888" />
            <Text style={styles.dateText}>{match.date}</Text>
          </View>
          {match.channel && (
            <View style={styles.channelInfo}>
              <Tv size={12} color="#22c55e" />
              <Text style={styles.channelText}>{match.channel}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: WIDGET_WIDTH,
    height: 160,
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  containerCompact: {
    height: 80,
  },
  gradient: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  countdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  countdownText: {
    color: "#22c55e",
    fontSize: 13,
    fontWeight: "bold",
  },
  competitionLogo: {
    width: 24,
    height: 24,
  },
  teamsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    flex: 1,
  },
  team: {
    alignItems: "center",
    flex: 1,
  },
  teamLogo: {
    width: 48,
    height: 48,
    marginBottom: 6,
  },
  teamName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  vsContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  vsText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },
  timeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    color: "#888",
    fontSize: 11,
  },
  channelInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  channelText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  emptySubtitle: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  compactContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactTeams: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactLogo: {
    width: 36,
    height: 36,
  },
  compactVs: {
    color: "#666",
    fontSize: 16,
  },
  compactInfo: {
    alignItems: "flex-end",
  },
  compactCountdown: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "bold",
  },
  compactDate: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
});

export default NextMatchWidgetPreview;
