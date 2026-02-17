import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface League {
  code: string;
  name: string;
  icon: string;
}

interface LeagueSelectorProps {
  leagues: League[];
  selectedLeague: string;
  onSelect: (code: string) => void;
  leagueLogos: Record<string, string>;
}

const LeagueItem = ({
  league,
  isSelected,
  onSelect,
  logoUrl,
  activeColors,
}: {
  league: League;
  isSelected: boolean;
  onSelect: () => void;
  logoUrl: string | null;
  activeColors: readonly [string, string, ...string[]];
}) => {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1 : 0.9)).current;
  const opacityAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: isSelected ? 1.1 : 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isSelected ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.7}
      style={[
        styles.itemContainer,
        isSelected && styles.itemContainerActive, // Apply static style change
      ]}>
      {/* Background Glow for Active Item */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            borderRadius: 24,
            overflow: 'hidden'
          },
        ]}>
        <LinearGradient
          colors={activeColors} // Cast as const array in prop
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Content */}
      <View style={styles.iconWrapper}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={[
              styles.leagueLogo,
              !isSelected && styles.leagueLogoInactive,
            ]}
            resizeMode="contain"
          />
        ) : (
          <Text
            style={[styles.fallbackIcon, !isSelected && { opacity: 0.5 }]}>
            {league.icon}
          </Text>
        )}
      </View>

      {/* Label - Only show if selected */}
      {isSelected && (
        <Animated.View
          style={[
            styles.labelContainer,
            {
              opacity: opacityAnim,
              transform: [
                {
                  translateY: opacityAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [5, 0],
                  }),
                },
              ],
            },
          ]}>
          <Text style={styles.labelText} numberOfLines={1}>
            {league.name}
          </Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

export const LeagueSelector: React.FC<LeagueSelectorProps> = ({
  leagues,
  selectedLeague,
  onSelect,
  leagueLogos,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to selected item if needed (optional improvement)
  useEffect(() => {
    // Logic to scroll could be added here if we had item positions
  }, [selectedLeague]);

  const getLeagueLogo = (leagueCode: string) => {
    const map: Record<string, string> = {
      BSA: "Soccer_BrazilBrasileiroSerieA",
      CDB: "Soccer_BrazilCopaDoBrasil",
      LIB: "Soccer_InternationalClubsCopaLibertadores",
      CL: "Soccer_InternationalClubsUEFAChampionsLeague",
      EL: "Soccer_UEFAEuropaLeague",
      PD: "Soccer_SpainLaLiga",
      PL: "Soccer_EnglandPremierLeague",
      BL1: "Soccer_GermanyBundesliga",
      SA: "Soccer_ItalySerieA",
      FL1: "Soccer_FranceLigue1",
      PPL: "Soccer_PortugalPrimeiraLiga",
      NBA: "Basketball_NBA",
      CAR: "Soccer_BrazilCarioca",
    };

    const key = map[leagueCode];
    if (key && leagueLogos[key]) {
      return leagueLogos[key];
    }
    return null;
  };

  const getLeagueColor = (leagueCode: string): readonly [string, string, ...string[]] => {
    const colors: Record<string, readonly [string, string, ...string[]]> = {
      ALL: ["#3f3f46", "#27272a"], // Zinc
      FAV: ["#eab308", "#ca8a04"], // Yellow
      BSA: ["#22c55e", "#16a34a"], // Green
      CDB: ["#22c55e", "#15803d"], // Green Darker
      CAR: ["#ef4444", "#b91c1c"], // Red
      FIC: ["#3b82f6", "#1d4ed8"], // Blue
      LIB: ["#f59e0b", "#d97706"], // Amber
      CL: ["#1e3a8a", "#172554"], // Blue Dark
      PL: ["#7c3aed", "#5b21b6"], // Purple
      PD: ["#ef4444", "#991b1b"], // Red
      BL1: ["#ef4444", "#b91c1c"], // Red
      SA: ["#0ea5e9", "#0284c7"], // Sky
      FL1: ["#84cc16", "#4d7c0f"], // Lime
      NBA: ["#ea580c", "#c2410c"], // Orange
      FINISHED: ["#71717a", "#52525b"], // Zinc
    };
    return colors[leagueCode] || ["#3f3f46", "#27272a"];
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToAlignment="center">
        {leagues.map((league) => {
          const isSelected = selectedLeague === league.code;
          const logoUrl = getLeagueLogo(league.code);
          const activeColors = getLeagueColor(league.code);

          return (
            <LeagueItem
              key={league.code}
              league={league}
              isSelected={isSelected}
              onSelect={() => onSelect(league.code)}
              logoUrl={logoUrl}
              activeColors={activeColors}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 90, // Fixed height area
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 12,
  },
  itemContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)", // Subtle background for inactive
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  itemContainerActive: {
    width: 80, // Expands
    height: 80, // Expands
    borderRadius: 24, // Squircle shaped when active
    borderWidth: 0, // No border for active
    marginHorizontal: 4,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  leagueLogo: {
    width: 32,
    height: 32,
  },
  leagueLogoInactive: {
    opacity: 0.6, // Increased opacity slightly
    // tintColor removed to show original logo colors
  },
  fallbackIcon: {
    fontSize: 24,
  },
  labelContainer: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  labelText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
