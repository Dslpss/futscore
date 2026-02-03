import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Sparkles, TrendingUp, Target } from "lucide-react-native";

interface PremiumTeaserCardProps {
  onPress: () => void;
}

export const PremiumTeaserCard: React.FC<PremiumTeaserCardProps> = ({ onPress }) => {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <LinearGradient
        colors={["#0f172a", "#1e293b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <LinearGradient
          colors={["rgba(168, 85, 247, 0.1)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <View style={styles.headerRow}>
              <View style={styles.iconBadge}>
                <TrendingUp size={16} color="#fbbf24" />
              </View>
              <Text style={styles.title}>IA PRO & Streaks</Text>
            </View>
            
            <Text style={styles.description}>
              Descubra as zebras, jogos seguros e sequências estatísticas para lucrar hoje.
            </Text>

            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <Target size={12} color="#a855f7" />
                <Text style={styles.featureText}>Scout IA</Text>
              </View>
              <View style={styles.featureItem}>
                <Sparkles size={12} color="#22c55e" />
                <Text style={styles.featureText}>Dicas Vencedoras</Text>
              </View>
            </View>
          </View>

          <View style={styles.rightContent}>
            <LinearGradient
              colors={["#a855f7", "#7c3aed"]}
              style={styles.lockButton}
            >
              <Lock size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.ctaText}>DESBLOQUEAR</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    overflow: "hidden",
  },
  content: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  leftContent: {
    flex: 1,
    paddingRight: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  iconBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    padding: 6,
    borderRadius: 8,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  description: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  featuresRow: {
    flexDirection: "row",
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featureText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "600",
  },
  rightContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.1)",
  },
  lockButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: "#a855f7",
    fontSize: 10,
    fontWeight: "800",
  },
});
