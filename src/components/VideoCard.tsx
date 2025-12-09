import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LucidePlay, LucideClock, LucideCalendar } from "lucide-react-native";
import { MsnVideo } from "../types/video";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

interface VideoCardProps {
  video: MsnVideo;
  onPress: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
};

const getVideoTypeBadge = (type: string) => {
  switch (type) {
    case "Highlight":
      return { label: "Melhores Momentos", color: "#22c55e" };
    case "Recap":
      return { label: "Resumo", color: "#3b82f6" };
    default:
      return { label: type, color: "#8b5cf6" };
  }
};

export const VideoCard: React.FC<VideoCardProps> = ({ video, onPress }) => {

  const typeBadge = getVideoTypeBadge(video.videoType);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Thumbnail with Overlay */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: video.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.gradient}
        />
        
        {/* Play Button */}
        <View style={styles.playButton}>
          <LinearGradient
            colors={["#22c55e", "#16a34a"]}
            style={styles.playButtonGradient}
          >
            <LucidePlay color="#fff" size={24} fill="#fff" />
          </LinearGradient>
        </View>
        
        {/* Duration Badge */}
        <View style={styles.durationBadge}>
          <LucideClock color="#fff" size={12} />
          <Text style={styles.durationText}>
            {formatDuration(video.durationInSeconds)}
          </Text>
        </View>
        
        {/* Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: typeBadge.color }]}>
          <Text style={styles.typeBadgeText}>{typeBadge.label}</Text>
        </View>
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>
        
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <LucideCalendar color="#888" size={14} />
            <Text style={styles.metaText}>{formatDate(video.published)}</Text>
          </View>
          
          <Text style={styles.provider}>{video.dataProvider}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  thumbnailContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  playButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  durationBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  durationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  typeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  content: {
    padding: 16,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#888",
    fontSize: 13,
  },
  provider: {
    color: "#666",
    fontSize: 12,
    fontWeight: "500",
  },
});
