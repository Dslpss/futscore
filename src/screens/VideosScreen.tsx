import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import {
  LucideArrowLeft,
  LucideVideo,
  LucideFilm,
  LucidePlayCircle,
} from "lucide-react-native";
import { msnSportsApi } from "../services/msnSportsApi";
import { VideoCard } from "../components/VideoCard";
import { VideoPlayerModal } from "../components/VideoPlayerModal";
import { MsnVideo } from "../types/video";
import { LEAGUES } from "../constants/leagues";

type VideoFilter = "all" | "Highlight" | "Recap";

export const VideosScreen = () => {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<MsnVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<MsnVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0]);
  const [selectedFilter, setSelectedFilter] = useState<VideoFilter>("all");
  
  // Video player modal state
  const [selectedVideo, setSelectedVideo] = useState<MsnVideo | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // League logos cache
  const [leagueLogos, setLeagueLogos] = useState<Record<string, string>>({});

  const handleVideoPress = (video: MsnVideo) => {
    setSelectedVideo(video);
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedVideo(null);
  };

  // Fetch league logos from API - same method as HomeScreen
  const fetchLeagueLogos = async () => {
    try {
      const leagues = await msnSportsApi.getPersonalizationStrip();

      const logos: Record<string, string> = {};
      leagues.forEach((league: any) => {
        if (league.sportWithLeague && league.image?.id) {
          const imageUrl = msnSportsApi.getLeagueImageUrl(league.image.id);
          logos[league.sportWithLeague] = imageUrl;
        }
      });

      setLeagueLogos(logos);
      console.log(`[VideosScreen] Loaded ${Object.keys(logos).length} league logos`);
    } catch (error) {
      console.error("[VideosScreen] Error fetching league logos:", error);
    }
  };

  const loadVideos = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await msnSportsApi.getVideos(selectedLeague.id);
      setVideos(data);
      applyFilter(data, selectedFilter);
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLeague, selectedFilter]);

  const applyFilter = (videoList: MsnVideo[], filter: VideoFilter) => {
    if (filter === "all") {
      setFilteredVideos(videoList);
    } else {
      setFilteredVideos(videoList.filter((v) => v.videoType === filter));
    }
  };

  useEffect(() => {
    loadVideos();
  }, [selectedLeague]);

  useEffect(() => {
    applyFilter(videos, selectedFilter);
  }, [selectedFilter, videos]);

  useEffect(() => {
    fetchLeagueLogos();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadVideos(false);
  };

  const renderLeaguePill = ({ item }: { item: typeof LEAGUES[0] }) => {
    const isSelected = item.id === selectedLeague.id;
    
    // Use logo from API cache, fallback to static logo from LEAGUES constant
    const logoUrl = leagueLogos[item.id] || item.logo;
    
    return (
      <TouchableOpacity
        style={[styles.leaguePill, isSelected && styles.leaguePillSelected]}
        onPress={() => setSelectedLeague(item)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: logoUrl }} style={styles.leagueLogo} />
        <Text
          style={[
            styles.leaguePillText,
            isSelected && styles.leaguePillTextSelected,
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFilterTab = (
    filter: VideoFilter,
    label: string,
    Icon: React.ComponentType<any>
  ) => {
    const isSelected = selectedFilter === filter;
    
    return (
      <TouchableOpacity
        onPress={() => setSelectedFilter(filter)}
        activeOpacity={0.8}
        style={styles.filterTabWrapper}
      >
        <LinearGradient
          colors={
            isSelected 
              ? ["#22c55e", "#16a34a"] 
              : ["#1a1a1a", "#1a1a1a"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.filterTab,
            isSelected ? styles.filterTabSelected : styles.filterTabUnselected
          ]}
        >
          <Icon
            size={18}
            color={isSelected ? "#fff" : "#888"}
            style={isSelected && styles.filterTabIconSelected}
          />
          <Text
            style={[
              styles.filterTabText,
              isSelected && styles.filterTabTextSelected,
            ]}
          >
            {label}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LucideVideo color="#444" size={64} />
      <Text style={styles.emptyTitle}>Nenhum vídeo encontrado</Text>
      <Text style={styles.emptySubtitle}>
        Não há vídeos disponíveis para esta liga no momento.
      </Text>
    </View>
  );

  return (
    <LinearGradient colors={["#0a0a0a", "#121212", "#0a0a0a"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={styles.backButtonWrapper}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
              style={styles.backButton}
            >
              <LucideArrowLeft color="#fff" size={20} />
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={["#22c55e", "#16a34a"]}
                style={styles.iconGradient}
              >
                <LucideVideo color="#fff" size={14} />
              </LinearGradient>
            </View>
            <Text style={styles.headerTitle}>Vídeos</Text>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>

        {/* League Selector */}
        <View style={styles.leagueSelector}>
          <FlatList
            data={LEAGUES}
            renderItem={renderLeaguePill}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.leagueList}
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsContent}
          >
            {renderFilterTab("all", "Todos", LucidePlayCircle)}
            {renderFilterTab("Highlight", "Melhores Momentos", LucideVideo)}
            {renderFilterTab("Recap", "Resumos", LucideFilm)}
          </ScrollView>
        </View>

        {/* Video List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={styles.loadingText}>Carregando vídeos...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredVideos}
            renderItem={({ item }) => (
              <VideoCard video={item} onPress={() => handleVideoPress(item)} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.videoList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#22c55e"]}
                tintColor="#22c55e"
                progressBackgroundColor="#1a1a1a"
              />
            }
          />
        )}

        {/* Video Player Modal */}
        <VideoPlayerModal
          visible={showPlayer}
          video={selectedVideo}
          onClose={handleClosePlayer}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 5 : 10,
  },
  backButtonWrapper: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrapper: {
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  iconGradient: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSpacer: {
    width: 42,
  },
  leagueSelector: {
    marginBottom: 12,
  },
  leagueList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  leaguePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  leaguePillSelected: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "#22c55e",
  },
  leagueLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  leaguePillText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    maxWidth: 100,
  },
  leaguePillTextSelected: {
    color: "#22c55e",
  },
  filterTabsContainer: {
    marginBottom: 20,
  },
  filterTabsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterTabWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#22c55e",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
    borderRadius: 20,
  },
  filterTabUnselected: {
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#111",
  },
  filterTabSelected: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  filterTabIconSelected: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  filterTabText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  filterTabTextSelected: {
    color: "#fff",
    fontWeight: "700",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
  },
  videoList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySubtitle: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
