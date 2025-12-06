import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_LIVE_CHANNELS, LiveChannel } from '../data/mockLiveChannels';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const CARD_WIDTH = (width - 48) / COLUMN_COUNT;

export default function LiveTvScreen({ navigation }: any) {
  const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus>({} as AVPlaybackStatus);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const handleChannelPress = async (channel: LiveChannel) => {
    setSelectedChannel(channel);
    setLoading(true);
    // Force landscape orientation when video opens
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  };

  const handleClosePlayer = async () => {
    setSelectedChannel(null);
    setLoading(false);
    // Revert to portrait orientation
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  };

  const renderChannelItem = ({ item }: { item: LiveChannel }) => (
    <TouchableOpacity 
      style={styles.channelCard}
      onPress={() => handleChannelPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.posterContainer}>
        <Image 
          source={{ uri: item.logo || item.poster }} 
          style={styles.poster} 
          resizeMode="contain"
        />
        <View style={styles.playButtonOverlay}>
          <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
        </View>
      </View>
      <View style={styles.channelInfo}>
        <Text style={styles.channelName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.channelCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TV Ao Vivo</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>ON AIR</Text>
        </View>
      </View>

      <FlatList
        data={MOCK_LIVE_CHANNELS}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      {selectedChannel && (
        <View style={styles.playerModal}>
          <View style={styles.playerContainer}>
            <View style={styles.playerHeader}>
              <Text style={styles.playingTitle} numberOfLines={1}>{selectedChannel.name}</Text>
              <TouchableOpacity onPress={handleClosePlayer} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.videoWrapper}>
              <Video
                ref={videoRef}
                style={styles.video}
                source={{
                  uri: selectedChannel.url,
                  headers: selectedChannel.headers
                }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
                shouldPlay={true}
                onPlaybackStatusUpdate={status => setStatus(() => status)}
                onLoadStart={() => setLoading(true)}
                onLoad={() => setLoading(false)}
                onError={(e) => {
                  console.error("Video Error:", e);
                  setLoading(false);
                }}
              />
              {loading && (
                <View style={styles.loaderOverlay}>
                  <ActivityIndicator size="large" color="#00ff87" />
                </View>
              )}
            </View>
            
            <View style={styles.playerFooter}>
              <Text style={styles.footerText}>Transmissão fornecida por terceiros</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  liveText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  channelCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  posterContainer: {
    height: 100,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  poster: {
    width: '80%',
    height: '80%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfo: {
    padding: 12,
  },
  channelName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  channelCategory: {
    color: '#94a3b8',
    fontSize: 12,
  },
  playerModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    zIndex: 100,
  },
  playerContainer: {
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
  },
  playerHeader: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  playingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  playerFooter: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  }
});
