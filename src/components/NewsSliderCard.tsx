import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Newspaper, ChevronRight, Clock, ExternalLink } from 'lucide-react-native';
import { msnSportsApi } from '../services/msnSportsApi';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 80;
const CARD_MARGIN = 12;

interface NewsArticle {
  id: string;
  title: string;
  abstract?: string;
  publishedDateTime: string;
  url: string;
  images?: Array<{ url: string }>;
  provider?: { name: string };
}

const NewsSliderCardContent: React.FC = () => {
  const navigation = useNavigation<any>();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasLoadedRef = useRef(false);
  const isMountedRef = useRef(true);

  const fetchNews = useCallback(async () => {
    // Only fetch once
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    try {
      const news = await msnSportsApi.getSportsNews(5, 0);
      if (!isMountedRef.current) return;
      
      setArticles(news.slice(0, 5));
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('[NewsSliderCard] Error fetching news:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fadeAnim]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchNews();
    
    return () => {
      isMountedRef.current = false;
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [fetchNews]);

  // Auto-scroll carousel
  useEffect(() => {
    if (articles.length > 1) {
      autoScrollTimer.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const nextIndex = (prev + 1) % articles.length;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * (CARD_WIDTH + CARD_MARGIN),
            animated: true,
          });
          return nextIndex;
        });
      }, 5000);
    }

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [articles.length]);

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (CARD_WIDTH + CARD_MARGIN));
    if (index !== currentIndex && index >= 0 && index < articles.length) {
      setCurrentIndex(index);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      
      if (diffMins < 60) return `${diffMins}min`;
      if (diffHours < 24) return `${diffHours}h`;
      return `${Math.floor(diffHours / 24)}d`;
    } catch {
      return '';
    }
  };

  const handleArticlePress = (article: NewsArticle) => {
    if (article.url) {
      Linking.openURL(article.url);
    }
  };

  const handleSeeAll = () => {
    navigation.navigate('News');
  };

  if (loading || articles.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Newspaper size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Notícias</Text>
            <Text style={styles.headerSubtitle}>Esportes em destaque</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.seeAllBtn} onPress={handleSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>Ver todas</Text>
          <ChevronRight size={14} color="#22c55e" />
        </TouchableOpacity>
      </View>

      {/* News Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_MARGIN}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {articles.map((article, index) => (
          <TouchableOpacity
            key={article.id || index}
            style={styles.newsCard}
            onPress={() => handleArticlePress(article)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f0f1a']}
              style={styles.cardGradient}
            >
              {/* Image */}
              {article.images?.[0]?.url && (
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: article.images[0].url }}
                    style={styles.newsImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.imageOverlay}
                  />
                </View>
              )}

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.newsTitle} numberOfLines={2}>
                  {article.title}
                </Text>

                <View style={styles.metaRow}>
                  {article.provider?.name && (
                    <View style={styles.providerBadge}>
                      <Text style={styles.providerText}>{article.provider.name}</Text>
                    </View>
                  )}
                  <View style={styles.timeBadge}>
                    <Clock size={10} color="#71717a" />
                    <Text style={styles.timeText}>{formatTimeAgo(article.publishedDateTime)}</Text>
                  </View>
                </View>

                <View style={styles.readMoreRow}>
                  <ExternalLink size={12} color="#22c55e" />
                  <Text style={styles.readMoreText}>Ler mais</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {articles.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

// Export wrapped component with memo to prevent re-renders
export const NewsSliderCard: React.FC = React.memo(NewsSliderCardContent);

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  seeAllText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingRight: 20,
  },
  newsCard: {
    width: CARD_WIDTH,
    marginRight: CARD_MARGIN,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  imageContainer: {
    height: 140,
    position: 'relative',
  },
  newsImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  cardContent: {
    padding: 16,
  },
  newsTitle: {
    color: '#e4e4e7',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  providerBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  providerText: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '500',
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  readMoreText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#22c55e',
  },
});
