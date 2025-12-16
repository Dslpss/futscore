import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Newspaper, X } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { NewsCard } from "../components/NewsCard";
import { msnSportsApi } from "../services/msnSportsApi";

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

export const NewsScreen = () => {
  const navigation = useNavigation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchNews = async (skip: number = 0, isRefresh: boolean = false) => {
    try {
      if (skip === 0) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }

      const news = await msnSportsApi.getSportsNews(10, skip);
      
      if (news.length < 10) {
        setHasMore(false);
      }

      if (skip === 0) {
        setArticles(news);
      } else {
        // Deduplicate articles by ID
        setArticles((prev) => {
          const existingIds = new Set(prev.map(a => a.id));
          const newArticles = news.filter((a: NewsArticle) => !existingIds.has(a.id));
          return [...prev, ...newArticles];
        });
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = useCallback(async () => {
    setHasMore(true);
    await msnSportsApi.clearCache();
    await fetchNews(0, true);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore && articles.length > 0) {
      fetchNews(articles.length);
    }
  };

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={["rgba(34, 197, 94, 0.1)", "transparent"]}
          style={styles.headerGradient}
        />
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconWrapper}>
              <LinearGradient
                colors={["#22c55e", "#16a34a"]}
                style={styles.headerIconGradient}
              >
                <Newspaper size={20} color="#fff" />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.headerTitle}>Notícias</Text>
              <Text style={styles.headerSubtitle}>Esportes em destaque</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#27272a", "#18181b"]}
              style={styles.closeButtonGradient}
            >
              <X size={20} color="#a1a1aa" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured News Carousel */}
      {articles.length > 0 && (
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>🔥 Destaques</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
          >
            {articles.slice(0, 3).map((article) => (
              <NewsCard key={`featured_${article.id}`} article={article} variant="featured" />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section Title for list */}
      {articles.length > 3 && (
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>📰 Últimas Notícias</Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item, index }: { item: NewsArticle; index: number }) => {
    // Skip first 3 items as they are in the featured carousel
    if (index < 3) return null;
    return <NewsCard article={item} variant="compact" />;
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator color="#22c55e" />
        <Text style={styles.loadingText}>Carregando mais...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📰</Text>
        <Text style={styles.emptyText}>Nenhuma notícia encontrada</Text>
        <Text style={styles.emptySubtext}>
          Puxe para baixo para atualizar
        </Text>
      </View>
    );
  };

  if (loading && articles.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#09090b" />
        <LinearGradient
          colors={["#09090b", "#18181b"]}
          style={styles.background}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={styles.loadingText}>Carregando notícias...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <LinearGradient
        colors={["#09090b", "#18181b"]}
        style={styles.background}
      />
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={articles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#22c55e"
              colors={["#22c55e"]}
              progressBackgroundColor="#18181b"
            />
          }
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Header styles
  header: {
    marginBottom: 24,
    position: "relative",
  },
  headerGradient: {
    position: "absolute",
    left: -16,
    right: -16,
    top: -50,
    height: 150,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  closeButton: {
    marginLeft: 16,
  },
  closeButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerIconWrapper: {
    marginRight: 16,
  },
  headerIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#71717a",
    marginTop: 2,
  },

  // Featured section
  featuredSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e4e4e7",
    marginBottom: 12,
  },
  featuredScroll: {
    paddingRight: 16,
  },

  // List section
  listHeader: {
    marginBottom: 8,
  },

  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#71717a",
    fontSize: 14,
    marginTop: 12,
  },
  loadingMore: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: "#e4e4e7",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#71717a",
    fontSize: 14,
  },
});

export default NewsScreen;
