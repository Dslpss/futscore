import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame,
  Shield,
  Zap,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { CONFIG } from "../constants/config";

export interface Streak {
  matchIndex: number;
  matchId: string;
  team: string;
  type: "fire" | "shield" | "alert";
  title: string;
  subtitle: string;
  startTime: string;
}

interface StreakSectionProps {
  onPressMatch?: (matchId: string) => void;
}

export const StreakSection: React.FC<StreakSectionProps> = ({ onPressMatch }) => {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStreak, setSelectedStreak] = useState<Streak | null>(null);

  useEffect(() => {
    fetchStreaks();
  }, []);

  const fetchStreaks = async () => {
    try {
      setLoading(true);
      const output = await fetch(`${CONFIG.BACKEND_URL}/api/ai-predictions/streaks`);
      const data = await output.json();
      if (data.success && data.streaks) {
        setStreaks(data.streaks);
      }
    } catch (error) {
      console.error("Erro fetching streaks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null; // Não mostra loading pra não poluir, só aparece quando tiver dado
  if (streaks.length === 0) return null;

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "fire":
        return {
          icon: <Flame size={16} color="#ef4444" fill="#ef4444" />,
          colors: ["#2d1212", "#1a0d0d"],
          border: "#7f1d1d",
          text: "#fca5a5"
        };
      case "shield":
        return {
          icon: <Shield size={16} color="#3b82f6" fill="#3b82f6" />,
          colors: ["#0f1c2e", "#0a101a"],
          border: "#1e3a8a",
          text: "#93c5fd"
        };
      default:
        return {
          icon: <Zap size={16} color="#eab308" fill="#eab308" />,
          colors: ["#2d240f", "#1a160a"],
          border: "#713f12",
          text: "#fde047"
        };
    }
  };



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TrendingUp size={16} color="#fbbf24" />
          <Text style={styles.title}>Streak Hunter 🔥</Text>
        </View>
        <Text style={styles.subtitle}>Sequências vao quebrar hoje?</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {streaks.map((streak, index) => {
          const config = getTypeConfig(streak.type);
          return (
            <TouchableOpacity 
              key={index}
              activeOpacity={0.8}
              onPress={() => setSelectedStreak(streak)}
            >
              <LinearGradient
                colors={config.colors as any}
                style={[styles.card, { borderColor: config.border }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    {config.icon}
                  </View>
                  <Text style={[styles.teamName, { color: config.text }]}>
                    {streak.team}
                  </Text>
                </View>
                
                <View style={styles.streakContent}>
                  <Text 
                    style={styles.streakTitle} 
                    numberOfLines={3} 
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {streak.title}
                  </Text>
                  <Text style={styles.streakSubtitle} numberOfLines={4}>
                    {streak.subtitle}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.cardButton}>
                    <Text style={styles.cardButtonText}>Ver análise</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

       {/* Detail Modal */}
      {selectedStreak && (
        <Modal
          visible={!!selectedStreak}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedStreak(null)}
        >
           <View style={styles.modalOverlay}>
             <TouchableOpacity 
               style={StyleSheet.absoluteFill} 
               activeOpacity={1} 
               onPress={() => setSelectedStreak(null)}
             />
             <View style={styles.modalContainer}>
               <LinearGradient
                 colors={getTypeConfig(selectedStreak.type).colors as any}
                 style={styles.modalContent}
                 start={{ x: 0, y: 0 }}
                 end={{ x: 1, y: 1 }}
               >
                 <View style={styles.modalHeader}>
                   <View style={[styles.modalIconContainer, { borderColor: getTypeConfig(selectedStreak.type).text + '40' }]}>
                      {getTypeConfig(selectedStreak.type).icon}
                   </View>
                   <View style={styles.modalHeaderInfo}>
                      <Text style={styles.modalContextText}>ANÁLISE DE STREAK</Text>
                      <Text style={[styles.modalTeamName, { color: getTypeConfig(selectedStreak.type).text }]}>
                        {selectedStreak.team}
                      </Text>
                   </View>
                   <TouchableOpacity onPress={() => setSelectedStreak(null)} style={styles.closeButton}>
                     <Text style={styles.closeButtonText}>✕</Text>
                   </TouchableOpacity>
                 </View>

                 <View style={styles.modalDivider} />

                 <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                   <Text style={styles.modalTitle}>{selectedStreak.title}</Text>
                   <Text style={styles.modalSubtitle}>{selectedStreak.subtitle}</Text>
                 </ScrollView>

                 <TouchableOpacity 
                    style={[styles.modalMatchButton, { borderColor: getTypeConfig(selectedStreak.type).text + '60' }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedStreak(null);
                      onPressMatch?.(selectedStreak.matchId);
                    }}
                 >
                    <Text style={[styles.modalMatchButtonText, { color: getTypeConfig(selectedStreak.type).text }]}>
                      VER PARTIDA COMPLETA
                    </Text>
                    <TrendingUp size={16} color={getTypeConfig(selectedStreak.type).text} />
                 </TouchableOpacity>
               </LinearGradient>
             </View>
           </View>
        </Modal>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 13,
    marginLeft: 28,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
  },
  card: {
    width: 240,
    height: 200, // Altura fixa generosa para alinhar todos e caber o texto + botão
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    justifyContent: "flex-start",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  teamName: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  streakContent: {
    flex: 1,
    gap: 4,
    marginBottom: 8, // Garante espaço antes do footer
  },
  streakTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  streakSubtitle: {
    color: "#a1a1aa",
    fontSize: 11, // Fonte levemente menor para caber mais
    lineHeight: 15,
    marginTop: 2,
  },
  cardFooter: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cardButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cardButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)", // Mais escuro para premium feel
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalContextText: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalTeamName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 16,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginBottom: 12,
  },
  modalBody: {
    maxHeight: 300,
    marginBottom: 24,
  },
  modalSubtitle: {
    color: "#d4d4d8",
    fontSize: 16,
    lineHeight: 24,
  },
  modalMatchButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  modalMatchButtonText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
