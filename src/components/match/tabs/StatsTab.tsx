import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Match } from "../../../types";

interface StatsTabProps {
  statistics?: Match['statistics'];
}

export const StatsTab: React.FC<StatsTabProps> = ({ statistics }) => {
  if (!statistics || statistics.length === 0) {
    return (
      <View style={styles.noStatsContainer}>
        <Text style={styles.noStatsText}>
          Estatísticas não disponíveis para este jogo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Estatísticas</Text>
      {statistics[0].statistics.map((stat, index) => {
        const homeValue = stat.value ?? 0;
        const awayValue = statistics[1]?.statistics[index]?.value ?? 0;

        // Calculate percentages for bar
        const total =
          (typeof homeValue === "number" ? homeValue : 0) +
          (typeof awayValue === "number" ? awayValue : 0);
        const homePercent =
          total === 0
            ? 50
            : ((typeof homeValue === "number" ? homeValue : 0) / total) * 100;
        const awayPercent =
          total === 0
            ? 50
            : ((typeof awayValue === "number" ? awayValue : 0) / total) * 100;

        return (
          <View key={index} style={styles.statRow}>
            <View style={styles.statValues}>
              <Text style={styles.statValue}>{homeValue}</Text>
              <Text style={styles.statLabel}>{stat.type}</Text>
              <Text style={styles.statValue}>{awayValue}</Text>
            </View>
            <View style={styles.statBarContainer}>
              <View
                style={[
                  styles.statBar,
                  {
                    width: `${homePercent}%`,
                    backgroundColor: "#22c55e",
                    borderTopLeftRadius: 4,
                    borderBottomLeftRadius: 4,
                  },
                ]}
              />
              <View
                style={[
                  styles.statBar,
                  {
                    width: `${awayPercent}%`,
                    backgroundColor: "#ef4444",
                    borderTopRightRadius: 4,
                    borderBottomRightRadius: 4,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  statRow: {
    marginBottom: 16,
  },
  statValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    width: 40,
    textAlign: "center",
  },
  statLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    flex: 1,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statBarContainer: {
    flexDirection: "row",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  statBar: {
    height: "100%",
  },
  noStatsContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    margin: 16,
    borderRadius: 16,
  },
  noStatsText: {
    color: "#71717a",
    fontSize: 14,
    textAlign: "center",
  },
});
