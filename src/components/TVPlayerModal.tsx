import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Channel } from '../types/Channel';
import { incrementViewCount } from '../services/channelService';

const { width, height } = Dimensions.get('window');

interface TVPlayerModalProps {
  visible: boolean;
  channel: Channel;
  onClose: () => void;
}

export default function TVPlayerModal({
  visible,
  channel,
  onClose,
}: TVPlayerModalProps) {
  const videoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible && channel) {
      // Increment view count
      incrementViewCount(channel._id);
    }
  }, [visible, channel]);

  useEffect(() => {
    if (showControls) {
      // Auto-hide controls after 3 seconds
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setIsPlaying(status.isPlaying);
    } else {
      // Handle error state
      if (status.error) {
        console.error('Video error:', status.error);
        setIsLoading(false);
        setError(`Erro: ${status.error}`);
      }
    }
  };

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const handleReload = async () => {
    setError(null);
    setIsLoading(true);
    
    if (videoRef.current) {
      try {
        await videoRef.current.unloadAsync();
        await videoRef.current.loadAsync(
          { uri: channel.url },
          { shouldPlay: true },
          false
        );
      } catch (err: any) {
        console.error('Error reloading video:', err);
        setError('Falha ao recarregar stream');
        setIsLoading(false);
      }
    }
  };

  const handleClose = async () => {
    if (videoRef.current) {
      await videoRef.current.stopAsync();
      await videoRef.current.unloadAsync();
    }
    setError(null);
    setIsLoading(true);
    onClose();
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Não foi possível reproduzir este canal. Verifique sua conexão ou tente outro canal.');
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Video Player */}
        <TouchableOpacity
          style={styles.videoContainer}
          activeOpacity={1}
          onPress={toggleControls}
        >
          <Video
            ref={videoRef}
            source={{ uri: channel.url }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={handleError}
            useNativeControls={false}
          />

          {/* Loading Indicator */}
          {isLoading && !error && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Carregando stream...</Text>
            </View>
          )}

          {/* Error State */}
          {error && (
            <View style={styles.errorOverlay}>
              <LinearGradient
                colors={['rgba(15, 23, 42, 0.95)', 'rgba(15, 23, 42, 0.9)']}
                style={styles.errorGradient}
              >
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text style={styles.errorTitle}>Erro ao reproduzir</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                
                <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
                  <Ionicons name="reload" size={20} color="#fff" />
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {/* Controls Overlay */}
          {showControls && !error && (
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.7)']}
              style={styles.controlsOverlay}
            >
              {/* Top Bar */}
              <View style={styles.topBar}>
                <View style={styles.channelInfo}>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveIndicator} />
                    <Text style={styles.liveText}>AO VIVO</Text>
                  </View>
                  <Text style={styles.channelName} numberOfLines={1}>
                    {channel.name}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Center Controls */}
              <View style={styles.centerControls}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={handlePlayPause}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={48}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              {/* Bottom Bar */}
              <View style={styles.bottomBar}>
                {channel.groupTitle && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{channel.groupTitle}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width,
    height: height,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  errorGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 48,
  },
  channelInfo: {
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  channelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  centerControls: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    padding: 20,
    paddingBottom: 32,
  },
  categoryBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
