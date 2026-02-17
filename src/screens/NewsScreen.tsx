import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { EditorialNewsCard } from "../components/EditorialNewsCard";
import { msnSportsApi } from "../services/msnSportsApi";

const { width, height } = Dimensions.get("window");

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
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Header Animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const backButtonBackground = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: ["rgba(0,0,0,0.3)", "transparent"],
    extrapolate: "clamp",
  });

  const fetchNews = async (skip: number = 0) => {
    try {
      if (skip === 0) setLoading(true);
      else setLoadingMore(true);

      const news = await msnSportsApi.getSportsNews(15, skip);
      
      setArticles(prev => skip === 0 ? news : [...prev, ...news]);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const renderItem = ({ item, index }: { item: NewsArticle; index: number }) => {
    // 1. HERO ITEM (First article) - Full Screen Impact
    if (index === 0) {
      return (
        <EditorialNewsCard
          article={item}
          variant="hero"
          index={index}
        />
      );
    }

    // 2. FEATURED ITEM (Every 5th item) - Visual Breaker
    if (index % 5 === 0) {
      return (
        <EditorialNewsCard
          article={item}
          variant="featured"
          index={index}
        />
      );
    }

    // 3. STANDARD ITEMS - Minimalist List
    return (
      <EditorialNewsCard
        article={item}
        variant="standard"
        index={index}
      />
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 100 }} />; // Padding bottom
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator color="#22c55e" />
      </View>
    );
  };

  if (loading && articles.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Animated Sticky Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View style={styles.headerBackground} />
        <Text style={styles.headerTitle}>MANCHETES</Text>
      </Animated.View>

      {/* Floating Back Button */}
      <Animated.View style={[styles.backButtonWrapper, { backgroundColor: backButtonBackground }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.FlatList
        data={articles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={() => fetchNews(articles.length)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b", // Zinc 950
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#09090b",
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    zIndex: 10,
    justifyContent: "flex-end",
    paddingBottom: 16,
    alignItems: "center",
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 9, 11, 0.9)", // Semi-transparent black
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  
  // Back Button
  backButtonWrapper: {
    position: "absolute",
    top: 48,
    left: 16,
    zIndex: 20,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
  },

  loadingMore: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default NewsScreen;
