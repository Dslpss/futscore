import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BlurView } from "expo-blur";
import { Clock } from "lucide-react-native";

const { width } = Dimensions.get("window");

interface NewsArticle {
  id: string;
  title: string;
  abstract: string;
  publishedDateTime: string;
  images?: Array<{
    url: string;
    title?: string;
  }>;
  provider?: {
    name: string;
    logoUrl?: string;
  };
  category?: string;
}

interface EditorialNewsCardProps {
  article: NewsArticle;
  variant?: "hero" | "featured" | "standard";
  onPress?: () => void;
  index?: number;
}

export const EditorialNewsCard: React.FC<EditorialNewsCardProps> = ({
  article,
  variant = "standard",
  onPress,
  index = 0,
}) => {
  const imageUrl = article.images?.[0]?.url;
  const timeAgo = formatDistanceToNow(new Date(article.publishedDateTime), {
    addSuffix: true,
    locale: ptBR,
  });

  // Hero Variant (Giant, first item)
  if (variant === "hero") {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.heroContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.placeholderBg]} />
        )}
        
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.95)"]}
          style={styles.heroGradient}
        />

        <View style={styles.heroContent}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>
              {article.category || "DESTAQUE"}
            </Text>
          </View>
          
          <Text style={styles.heroTitle} numberOfLines={3}>
            {article.title}
          </Text>
          
          <View style={styles.metaRow}>
            {article.provider?.name && (
              <Text style={styles.providerText}>{article.provider.name}</Text>
            )}
            <View style={styles.dot} />
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Featured Variant (Medium size, grid breaking)
  if (variant === "featured") {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.featuredContainer}>
        <View style={styles.featuredImageWrapper}>
            {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.featuredImage} />
            ) : (
            <View style={[styles.featuredImage, styles.placeholderBg]} />
            )}
            <View style={styles.imageOverlay} />
        </View>

        <View style={styles.featuredContent}>
            <Text style={styles.featuredCategory}>
                {article.category || "NOTÍCIA"}
            </Text>
            <Text style={styles.featuredTitle} numberOfLines={3}>
                {article.title}
            </Text>
            <View style={styles.metaRowSm}>
                <Clock size={12} color="#a1a1aa" />
                <Text style={styles.timeTextSm}>{timeAgo}</Text>
            </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Standard Minimalist (Typography focused)
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.standardContainer}>
      <View style={styles.standardContent}>
        <Text style={styles.standardTitle} numberOfLines={3}>
          {article.title}
        </Text>
        <View style={styles.metaRowSm}>
            {article.provider?.name && (
              <Text style={styles.providerTextSm}>{article.provider.name}</Text>
            )}
            <Text style={styles.timeTextSm}> • {timeAgo}</Text>
        </View>
      </View>
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.standardImage} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Helper
  placeholderBg: {
    backgroundColor: "#27272a",
  },
  
  // Hero Styles
  heroContainer: {
    height: width * 1.2, // Taller, immersive
    width: width,
    marginBottom: 2, // Minimal gap
    position: "relative",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  heroContent: {
    padding: 24,
    paddingBottom: 48,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 32, // Massive
    fontWeight: "900", // Extra Bold
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  categoryPill: {
    backgroundColor: "#22c55e",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4, // Sharp/Small radius
    marginBottom: 16,
  },
  categoryText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerText: {
    color: "#e4e4e7",
    fontWeight: "600",
    fontSize: 14,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#a1a1aa",
    marginHorizontal: 8,
  },
  timeText: {
    color: "#a1a1aa",
    fontSize: 14,
  },

  // Featured Styles
  featuredContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "#18181b",
    borderRadius: 0, // Sharp edges preferred for editorial
    borderLeftWidth: 4, // Accent line
    borderLeftColor: "#22c55e",
    overflow: "hidden",
    padding: 16,
  },
  featuredImageWrapper: {
      height: 200,
      marginBottom: 16,
      borderRadius: 4,
      overflow: 'hidden',
  },
  featuredImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
  },
  imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.1)',
  },
  featuredContent: {
      gap: 8,
  },
  featuredCategory: {
      color: "#22c55e",
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase",
  },
  featuredTitle: {
      color: "#f4f4f5",
      fontSize: 22,
      fontWeight: "800", // Bold
      lineHeight: 28,
      letterSpacing: -0.5,
  },
  metaRowSm: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
  },
  timeTextSm: {
      color: "#71717a",
      fontSize: 12,
      fontWeight: "500",
  },

  // Standard Styles
  standardContainer: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  standardContent: {
    flex: 1,
    paddingRight: 16,
  },
  standardTitle: {
    color: "#e4e4e7",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 8,
  },
  providerTextSm: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
  },
  standardImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: "#27272a",
  },
});
