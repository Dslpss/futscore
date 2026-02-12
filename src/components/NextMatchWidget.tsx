import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Home, Plane, Calendar, ChevronRight } from "lucide-react-native";
import { Match } from "../types";
import { TeamLogo } from "./TeamLogo";

const { width } = Dimensions.get('window');

interface NextMatchWidgetProps {
  matches: Array<{ teamId: number; match: Match }>;
  onPressMatch?: (match: Match) => void;
}

export const NextMatchWidget: React.FC<NextMatchWidgetProps> = ({
  matches,
  onPressMatch,
}) => {
  if (!matches || matches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={["rgba(24, 24, 27, 0.6)", "rgba(24, 24, 27, 0.4)"]}
          style={styles.emptyGradient}>
          <View style={styles.emptyIconContainer}>
            <Calendar size={24} color="#52525b" />
          </View>
          <Text style={styles.emptyText}>Sem jogos programados</Text>
          <Text style={styles.emptySubText}>Adicione times aos favoritos</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.widgetContainer}>
      <View style={styles.widgetHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={["#22c55e", "#15803d"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Calendar size={14} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>SEUS TIMES</Text>
        </View>
        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.matchCount}>
            {matches.length} {matches.length === 1 ? "jogo" : "jogos"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={280 + 12} // Card width + gap
        decelerationRate="fast"
      >
        {matches.map(({ teamId, match }) => (
          <MatchCard
            key={match.fixture.id}
            match={match}
            onPress={() => onPressMatch?.(match)}
            isNext={true}
          />
        ))}
      </ScrollView>
    </View>
  );
};

// Individual Match Card Component
const MatchCard: React.FC<{ match: Match; onPress: () => void; isNext?: boolean }> = ({
  match,
  onPress,
  isNext
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const matchTime = new Date(match.fixture.date).getTime();
      const difference = matchTime - now;

      if (difference <= 0) {
        setTimeRemaining("EM ANDAMENTO");
        setIsLive(true);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`Faltam ${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`Faltam ${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`Faltam ${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute to save resources

    return () => clearInterval(interval);
  }, [match]);

  const matchDate = new Date(match.fixture.date);
  const formattedDate = matchDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  const formattedWeekDay = matchDate.toLocaleDateString("pt-BR", {
    weekday: "short",
  }).toUpperCase().replace('.', '');
  
  const formattedTime = matchDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}>
      <LinearGradient
        colors={["#18181b", "#111113"]} // Dark subtle background
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardContent}>
        
        {/* Glow Effect */}
        <View style={styles.cardGlow} />
        <View style={styles.cardBorder} />

        {/* League Header */}
        <View style={styles.cardHeader}>
          <View style={styles.leagueContainer}>
            {match.league.logo && (
              <Image source={{ uri: match.league.logo }} style={styles.leagueLogo} />
            )}
            <Text style={styles.leagueName} numberOfLines={1}>{match.league.name}</Text>
          </View>
          
          <View style={[styles.statusBadge, isLive && styles.statusBadgeLive]}>
            <View style={[styles.statusDot, isLive && styles.statusDotLive]} />
            <Text style={[styles.statusText, isLive && styles.statusTextLive]}>
              {timeRemaining}
            </Text>
          </View>
        </View>

        {/* Teams Display */}
        <View style={styles.teamsWrapper}>
          {/* Home */}
          <View style={styles.teamColumn}>
            <View style={styles.logoWrapper}>
              <View style={[styles.logoGlow, { backgroundColor: '#22c55e' }]} />
              <TeamLogo
                uri={match.teams.home.logo}
                size={48}
                style={styles.teamLogo}
              />
            </View>
            <Text style={styles.teamName} numberOfLines={2}>
              {match.teams.home.name}
            </Text>
          </View>

          {/* VS/Time Center */}
          <View style={styles.vsColumn}>
            <Text style={styles.timeText}>{formattedTime}</Text>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>{formattedDate}</Text>
            </View>
          </View>

          {/* Away */}
          <View style={styles.teamColumn}>
            <View style={styles.logoWrapper}>
              <View style={[styles.logoGlow, { backgroundColor: '#3b82f6' }]} />
              <TeamLogo
                uri={match.teams.away.logo}
                size={48}
                style={styles.teamLogo}
              />
            </View>
            <Text style={styles.teamName} numberOfLines={2}>
              {match.teams.away.name}
            </Text>
          </View>
        </View>

        {/* Bottom Info */}
        <View style={styles.cardFooter}>
           <Text style={styles.stadiumText} numberOfLines={1}>
             {match.fixture.venue?.name || 'Estádio não definido'}
           </Text>
        </View>

      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Widget Container
  widgetContainer: {
    marginBottom: 24,
  },
  widgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    color: "#e4e4e7",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  seeAllButton: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  matchCount: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },

  // Card Styles
  container: {
    width: 280,
    height: 170,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  cardContent: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(34, 197, 94, 0.03)',
    borderRadius: 24,
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leagueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  leagueLogo: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  leagueName: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeLive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#71717a',
  },
  statusDotLive: {
    backgroundColor: '#22c55e',
  },
  statusText: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statusTextLive: {
    color: '#22c55e',
  },

  // Teams Area
  teamsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamColumn: {
    alignItems: 'center',
    width: 80,
    gap: 8,
  },
  logoWrapper: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.1,
  },
  teamLogo: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
  teamName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  vsColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  dateBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dateBadgeText: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "500",
  },

  // Footer
  cardFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 8,
    alignItems: 'center',
  },
  stadiumText: {
    color: "#52525b",
    fontSize: 10,
    fontWeight: "500",
  },

  // Empty State
  emptyContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  emptyGradient: {
    padding: 20,
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderStyle: "dashed",
  },
  emptyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyText: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySubText: {
    color: "#a1a1aa",
    fontSize: 12,
  },
});
