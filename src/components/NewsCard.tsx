import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Clock, MessageCircle, ThumbsUp, ExternalLink } from "lucide-react-native";

const { width } = Dimensions.get("window");

interface NewsArticle {
  id: string;
  type: string;
  title: string;
  abstract: string;
  readTimeMin?: number;
  url: string;
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
  reactionSummary?: {
    totalCount: number;
  };
  commentSummary?: {
    totalCount: number;
  };
}

interface NewsCardProps {
  article: NewsArticle;
  variant?: "featured" | "compact";
}

export const NewsCard: React.FC<NewsCardProps> = ({
  article,
  variant = "compact",
}) => {
  const handlePress = () => {
    if (article.url) {
      Linking.openURL(article.url);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d atrás`;
    } else if (diffHours > 0) {
      return `${diffHours}h atrás`;
    } else {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m atrás`;
    }
  };

  const imageUrl = article.images?.[0]?.url;
  const providerName = article.provider?.name || "Fonte desconhecida";
  const timeAgo = formatTimeAgo(article.publishedDateTime);

  if (variant === "featured") {
    return (
      <TouchableOpacity
        style={styles.featuredCard}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.featuredImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.featuredImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.featuredImagePlaceholder}>
              <Text style={styles.placeholderText}>📰</Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.9)"]}
            style={styles.featuredGradient}
          />
          <View style={styles.featuredContent}>
            <View style={styles.featuredMeta}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {article.category?.toUpperCase() || "ESPORTES"}
                </Text>
              </View>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>
            <Text style={styles.featuredTitle} numberOfLines={3}>
              {article.title}
            </Text>
            <View style={styles.featuredFooter}>
              <Text style={styles.providerName}>{providerName}</Text>
              <View style={styles.statsRow}>
                {article.reactionSummary && article.reactionSummary.totalCount > 0 && (
                  <View style={styles.statItem}>
                    <ThumbsUp size={12} color="#71717a" />
                    <Text style={styles.statText}>
                      {article.reactionSummary.totalCount}
                    </Text>
                  </View>
                )}
                {article.commentSummary && article.commentSummary.totalCount > 0 && (
                  <View style={styles.statItem}>
                    <MessageCircle size={12} color="#71717a" />
                    <Text style={styles.statText}>
                      {article.commentSummary.totalCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Compact variant
  return (
    <TouchableOpacity
      style={styles.compactCard}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.compactContent}>
        <View style={styles.compactTextContainer}>
          <View style={styles.compactMeta}>
            <Text style={styles.compactProvider}>{providerName}</Text>
            <Text style={styles.compactDot}>•</Text>
            <Text style={styles.compactTime}>{timeAgo}</Text>
          </View>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {article.title}
          </Text>
          <View style={styles.compactFooter}>
            {article.readTimeMin && (
              <View style={styles.readTime}>
                <Clock size={10} color="#71717a" />
                <Text style={styles.readTimeText}>
                  {article.readTimeMin} min
                </Text>
              </View>
            )}
            <ExternalLink size={12} color="#22c55e" />
          </View>
        </View>
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.compactImage}
            resizeMode="cover"
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Featured variant styles
  featuredCard: {
    width: width - 32,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
  },
  featuredImageContainer: {
    flex: 1,
    position: "relative",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 48,
  },
  featuredGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  featuredContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  featuredMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 10,
  },
  categoryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  timeAgo: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 8,
  },
  featuredFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  providerName: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    color: "#71717a",
    fontSize: 12,
  },

  // Compact variant styles
  compactCard: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  compactContent: {
    flexDirection: "row",
  },
  compactTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  compactMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  compactProvider: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "600",
  },
  compactDot: {
    color: "#52525b",
    marginHorizontal: 6,
  },
  compactTime: {
    color: "#71717a",
    fontSize: 11,
  },
  compactTitle: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 8,
  },
  compactFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  readTimeText: {
    color: "#71717a",
    fontSize: 11,
  },
  compactImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
});

export default NewsCard;
