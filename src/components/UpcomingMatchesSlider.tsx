import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Match } from "../types";
import { Clock, Bell } from "lucide-react-native";
import { TeamLogo } from "./TeamLogo";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75; // 75% da largura da tela
const CARD_GAP = 12;

interface UpcomingMatchesSliderProps {
  matches: Match[];
  onPressMatch?: (match: Match) => void;
}

export const UpcomingMatchesSlider: React.FC<UpcomingMatchesSliderProps> = ({
  matches,
  onPressMatch,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Filter matches starting within 2 hours
  const upcomingMatches = matches
    .filter((match) => {
      const matchTime = new Date(match.fixture.date).getTime();
      const now = Date.now();
      const twoHoursFromNow = now + 2 * 60 * 60 * 1000;
      const isNotStarted = match.fixture.status.short === "NS";
      return isNotStarted && matchTime > now && matchTime <= twoHoursFromNow;
    })
    .sort(
      (a, b) =>
        new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
    );

  // Pulse animation for urgency
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Auto-scroll to show different matches
  useEffect(() => {
    if (upcomingMatches.length <= 1) return;

    const autoScrollInterval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % upcomingMatches.length;
      const offsetX = nextIndex * (CARD_WIDTH + CARD_GAP);

      scrollViewRef.current?.scrollTo({
        x: offsetX,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(autoScrollInterval);
  }, [activeIndex, upcomingMatches.length]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (CARD_WIDTH + CARD_GAP));
    setActiveIndex(index);
  };

  const getTimeUntilMatch = (dateString: string) => {
    const matchTime = new Date(dateString).getTime();
    const now = Date.now();
    const diff = matchTime - now;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  const getUrgencyLevel = (dateString: string) => {
    const matchTime = new Date(dateString).getTime();
    const now = Date.now();
    const diff = matchTime - now;
    const minutes = diff / (1000 * 60);

    if (minutes <= 30) return "urgent"; // Red - very soon
    if (minutes <= 60) return "soon"; // Orange - soon
    return "upcoming"; // Yellow - upcoming
  };

  const getUrgencyColors = (
    level: string
  ): readonly [string, string, string] => {
    switch (level) {
      case "urgent":
        return ["#4a1515", "#2d1010", "#1a0a0a"] as const;
      case "soon":
        return ["#4a3215", "#2d1f10", "#1a120a"] as const;
      default:
        return ["#3d4a15", "#252d10", "#161a0a"] as const;
    }
  };

  const getUrgencyBadgeColors = (level: string): readonly [string, string] => {
    switch (level) {
      case "urgent":
        return ["#ef4444", "#dc2626"] as const;
      case "soon":
        return ["#f97316", "#ea580c"] as const;
      default:
        return ["#eab308", "#ca8a04"] as const;
    }
  };

  const getUrgencyText = (level: string) => {
    switch (level) {
      case "urgent":
        return "COMEÇA EM BREVE!";
      case "soon":
        return "COMEÇANDO LOGO";
      default:
        return "EM BREVE";
    }
  };

  if (upcomingMatches.length === 0) {
    // Return empty container with same height to prevent layout shift
    return <View style={styles.emptyContainer} />;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Animated.View
            style={[
              styles.bellIconWrapper,
              { transform: [{ scale: pulseAnim }] },
            ]}>
            <Bell size={18} color="#eab308" fill="#eab308" />
          </Animated.View>
          <Text style={styles.sectionTitle}>Próximos a Começar</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{upcomingMatches.length}</Text>
        </View>
      </View>

      {/* Cards Slider */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}>
        {upcomingMatches.map((match, index) => {
          const urgencyLevel = getUrgencyLevel(match.fixture.date);
          const gradientColors = getUrgencyColors(urgencyLevel);
          const badgeColors = getUrgencyBadgeColors(urgencyLevel);

          return (
            <TouchableOpacity
              key={match.fixture.id}
              activeOpacity={0.9}
              onPress={() => onPressMatch?.(match)}
              style={styles.cardWrapper}>
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}>
                {/* Urgency Badge */}
                <View style={styles.topRow}>
                  <View style={styles.leagueInfo}>
                    <Image
                      source={{ uri: match.league.logo }}
                      style={styles.leagueLogo}
                    />
                    <Text style={styles.leagueName} numberOfLines={1}>
                      {match.league.name}
                    </Text>
                  </View>
                  <LinearGradient
                    colors={badgeColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.urgencyBadge}>
                    <Text style={styles.urgencyText}>
                      {getUrgencyText(urgencyLevel)}
                    </Text>
                  </LinearGradient>
                </View>

                {/* Teams */}
                <View style={styles.teamsContainer}>
                  {/* Home Team */}
                  <View style={styles.teamSection}>
                    <View style={styles.teamLogoContainer}>
                      <View
                        style={[
                          styles.teamLogoGlow,
                          { backgroundColor: "rgba(234, 179, 8, 0.3)" },
                        ]}
                      />
                      <TeamLogo
                        uri={match.teams.home.logo}
                        size={50}
                        style={styles.teamLogo}
                      />
                    </View>
                    <Text style={styles.teamName} numberOfLines={2}>
                      {match.teams.home.name}
                    </Text>
                  </View>

                  {/* VS / Time */}
                  <View style={styles.centerSection}>
                    <View style={styles.vsContainer}>
                      <Text style={styles.vsText}>VS</Text>
                    </View>
                    <View style={styles.timeContainer}>
                      <Clock size={14} color="#a1a1aa" />
                      <Text style={styles.matchTime}>
                        {new Date(match.fixture.date).toLocaleTimeString(
                          "pt-BR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* Away Team */}
                  <View style={styles.teamSection}>
                    <View style={styles.teamLogoContainer}>
                      <View
                        style={[
                          styles.teamLogoGlow,
                          { backgroundColor: "rgba(234, 179, 8, 0.3)" },
                        ]}
                      />
                      <TeamLogo
                        uri={match.teams.away.logo}
                        size={50}
                        style={styles.teamLogo}
                      />
                    </View>
                    <Text style={styles.teamName} numberOfLines={2}>
                      {match.teams.away.name}
                    </Text>
                  </View>
                </View>

                {/* Countdown */}
                <View style={styles.countdownContainer}>
                  <LinearGradient
                    colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.2)"]}
                    style={styles.countdownBadge}>
                    <Animated.View
                      style={{
                        transform: [
                          { scale: urgencyLevel === "urgent" ? pulseAnim : 1 },
                        ],
                      }}>
                      <Text
                        style={[
                          styles.countdownText,
                          urgencyLevel === "urgent" &&
                            styles.countdownTextUrgent,
                        ]}>
                        ⏱️ Começa em {getTimeUntilMatch(match.fixture.date)}
                      </Text>
                    </Animated.View>
                  </LinearGradient>
                </View>

                {/* Tap hint */}
                <Text style={styles.tapHint}>Toque para ver detalhes</Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Pagination Dots */}
      {upcomingMatches.length > 1 && (
        <View style={styles.pagination}>
          {upcomingMatches.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bellIconWrapper: {
    padding: 4,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: "rgba(234, 179, 8, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  countText: {
    color: "#eab308",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  leagueInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  leagueLogo: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  leagueName: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  urgencyText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  teamsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  teamSection: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  teamLogoContainer: {
    position: "relative",
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  teamLogoGlow: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    opacity: 0.5,
  },
  teamLogo: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },
  teamName: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 90,
  },
  centerSection: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  vsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  vsText: {
    color: "#71717a",
    fontSize: 14,
    fontWeight: "800",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  matchTime: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  countdownContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  countdownBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  countdownText: {
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: "600",
  },
  countdownTextUrgent: {
    color: "#fca5a5",
  },
  tapHint: {
    textAlign: "center",
    color: "#52525b",
    fontSize: 11,
    fontWeight: "500",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: "#eab308",
  },
  emptyContainer: {
    height: 20, // Minimal height when no matches - maintains marginBottom space
    marginBottom: 20,
  },
});
