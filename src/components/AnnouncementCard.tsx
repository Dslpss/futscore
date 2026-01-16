import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, ChevronRight, Sparkles, Bell, Gift, AlertTriangle, Newspaper } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CONFIG } from "../constants/config";

const { width } = Dimensions.get("window");

interface Announcement {
  _id: string;
  title: string;
  message: string;
  type: "update" | "feature" | "promo" | "alert" | "news";
  icon: string;
  primaryColor: string;
  secondaryColor: string;
  actionType: "none" | "link" | "screen" | "dismiss";
  actionTarget?: string;
  actionLabel: string;
  imageUrl?: string;
  priority: number;
}

interface AnnouncementCardProps {
  onNavigate?: (screen: string) => void;
}

const TYPE_CONFIG = {
  update: {
    Icon: Sparkles,
    defaultColors: ["#8b5cf6", "#6366f1"],
    label: "ATUALIZAÇÃO",
  },
  feature: {
    Icon: Sparkles,
    defaultColors: ["#22c55e", "#16a34a"],
    label: "NOVIDADE",
  },
  promo: {
    Icon: Gift,
    defaultColors: ["#f59e0b", "#d97706"],
    label: "PROMOÇÃO",
  },
  alert: {
    Icon: AlertTriangle,
    defaultColors: ["#ef4444", "#dc2626"],
    label: "IMPORTANTE",
  },
  news: {
    Icon: Newspaper,
    defaultColors: ["#3b82f6", "#2563eb"],
    label: "NOVIDADES",
  },
};

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ onNavigate }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = await AsyncStorage.getItem("@FutScore:token");
      if (!token) return;

      const response = await fetch(`${CONFIG.BACKEND_URL}/api/announcements/active`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.announcements && data.announcements.length > 0) {
          setAnnouncements(data.announcements);
          setVisible(true);
          
          // Record view for first announcement
          recordView(data.announcements[0]._id);
        }
      }
    } catch (error) {
      console.error("[Announcements] Error fetching:", error);
    }
  };

  const recordView = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("@FutScore:token");
      if (!token) return;

      await fetch(`${CONFIG.BACKEND_URL}/api/announcements/${id}/view`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      // Silently fail
    }
  };

  const dismissAnnouncement = async () => {
    if (!announcements[currentIndex]) return;

    try {
      const token = await AsyncStorage.getItem("@FutScore:token");
      if (!token) return;

      await fetch(
        `${CONFIG.BACKEND_URL}/api/announcements/${announcements[currentIndex]._id}/dismiss`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -width,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (currentIndex < announcements.length - 1) {
          // Show next announcement
          setCurrentIndex(currentIndex + 1);
          slideAnim.setValue(width);
          fadeAnim.setValue(0);
          
          Animated.parallel([
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
          
          recordView(announcements[currentIndex + 1]._id);
        } else {
          setVisible(false);
        }
      });
    } catch (error) {
      console.error("[Announcements] Error dismissing:", error);
    }
  };

  const handleAction = () => {
    const current = announcements[currentIndex];
    if (!current) return;

    switch (current.actionType) {
      case "link":
        if (current.actionTarget) {
          Linking.openURL(current.actionTarget);
        }
        break;
      case "screen":
        if (current.actionTarget && onNavigate) {
          onNavigate(current.actionTarget);
        }
        break;
      case "dismiss":
      default:
        dismissAnnouncement();
        break;
    }
  };

  if (!visible || announcements.length === 0) return null;

  const current = announcements[currentIndex];
  const typeConfig = TYPE_CONFIG[current.type] || TYPE_CONFIG.news;
  const IconComponent = typeConfig.Icon;
  const colors = [current.primaryColor, current.secondaryColor];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <LinearGradient
        colors={[`${colors[0]}20`, `${colors[1]}10`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Glow Effect */}
        <View style={[styles.glowEffect, { backgroundColor: `${colors[0]}30` }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.labelContainer}>
            <LinearGradient
              colors={colors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.labelGradient}
            >
              <IconComponent size={12} color="#fff" />
              <Text style={styles.labelText}>{typeConfig.label}</Text>
            </LinearGradient>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={dismissAnnouncement}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#71717a" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon/Emoji */}
          <View style={[styles.iconContainer, { backgroundColor: `${colors[0]}30` }]}>
            <Text style={styles.iconEmoji}>{current.icon}</Text>
          </View>

          <View style={styles.textContent}>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.message} numberOfLines={2}>
              {current.message}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        {current.actionType !== "none" && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAction}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={colors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>{current.actionLabel}</Text>
              <ChevronRight size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Pagination Dots */}
        {announcements.length > 1 && (
          <View style={styles.pagination}>
            {announcements.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && [styles.dotActive, { backgroundColor: colors[0] }],
                ]}
              />
            ))}
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    overflow: "hidden",
  },
  cardGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    position: "relative",
  },
  glowEffect: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  labelContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  labelGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  labelText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  iconEmoji: {
    fontSize: 24,
  },
  textContent: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  message: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 18,
  },
  actionButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 4,
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: {
    width: 16,
    borderRadius: 3,
  },
});

export default AnnouncementCard;
