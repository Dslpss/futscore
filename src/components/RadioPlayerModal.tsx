// RadioPlayerModal - Audio player for radio streams using expo-av
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Play, Pause, Radio as RadioIcon, Volume2, RefreshCw } from 'lucide-react-native';
import { Radio } from '../types/radio';
import { radioApi } from '../services/radioApi';

const { width } = Dimensions.get('window');

interface RadioPlayerModalProps {
  visible: boolean;
  radio: Radio | null;
  onClose: () => void;
}

export const RadioPlayerModal: React.FC<RadioPlayerModalProps> = ({
  visible,
  radio,
  onClose,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Configure audio for background playback
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.error('[RadioPlayer] Error configuring audio:', err);
      }
    };
    configureAudio();
  }, []);

  // Load and play when radio changes
  useEffect(() => {
    if (visible && radio) {
      setRetryCount(0);
      loadAndPlayStream();
    }

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [visible, radio?.id]);

  const loadAndPlayStream = async () => {
    if (!radio) return;

    setIsLoading(true);
    setIsFetchingUrl(true);
    setError(null);

    try {
      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }

      // Try to get a fresh URL from the API
      let streamUrl = radio.streamUrl;
      
      console.log(`[RadioPlayer] Fetching fresh URL for: ${radio.name}`);
      const freshRadio = await radioApi.getRadioWithFreshUrl(radio.name);
      
      if (freshRadio && freshRadio.streamUrl) {
        streamUrl = freshRadio.streamUrl;
        console.log(`[RadioPlayer] Got fresh URL: ${streamUrl}`);
      } else {
        console.log(`[RadioPlayer] Using fallback URL: ${streamUrl}`);
      }

      setCurrentStreamUrl(streamUrl);
      setIsFetchingUrl(false);

      console.log(`[RadioPlayer] Loading stream: ${streamUrl}`);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error('[RadioPlayer] Error loading stream:', err);
      setIsFetchingUrl(false);
      
      // Auto-retry with different URL if first attempt fails
      if (retryCount < 2) {
        console.log(`[RadioPlayer] Retrying... (attempt ${retryCount + 1})`);
        setRetryCount(prev => prev + 1);
        
        // Clear cache and try again
        await radioApi.clearCache();
        
        // Small delay before retry
        setTimeout(() => loadAndPlayStream(), 1000);
      } else {
        setError('Não foi possível carregar a rádio. Tente outra estação.');
        setIsLoading(false);
      }
    }
  };

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
    }
    if (status.error) {
      console.error('[RadioPlayer] Playback error:', status.error);
      setError('Erro na reprodução. Tente novamente.');
    }
  }, []);

  const togglePlayPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (err) {
      console.error('[RadioPlayer] Error toggling playback:', err);
    }
  };

  const handleClose = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
    setIsLoading(true);
    setError(null);
    onClose();
  };

  if (!radio) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f0f23']}
          style={styles.container}
        >
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X color="#fff" size={24} />
          </TouchableOpacity>

          {/* Live indicator */}
          <View style={styles.liveContainer}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>AO VIVO</Text>
          </View>

          {/* Radio logo */}
          <View style={styles.logoContainer}>
            {radio.logoUrl ? (
              <Image source={{ uri: radio.logoUrl }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <RadioIcon color="#6366f1" size={48} />
              </View>
            )}
          </View>

          {/* Radio info */}
          <Text style={styles.radioName}>{radio.name}</Text>
          <Text style={styles.radioInfo}>
            {radio.city && radio.state ? `${radio.city}, ${radio.state}` : ''}
            {radio.frequency ? ` • ${radio.frequency}` : ''}
          </Text>

          {/* Player controls */}
          <View style={styles.controlsContainer}>
            {isLoading || isBuffering ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>
                  {isFetchingUrl 
                    ? 'Buscando melhor URL...' 
                    : isLoading 
                      ? retryCount > 0 
                        ? `Tentando novamente (${retryCount}/2)...`
                        : 'Conectando...' 
                      : 'Buffering...'}
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={loadAndPlayStream}
                >
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause color="#fff" size={40} />
                ) : (
                  <Play color="#fff" size={40} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Volume indicator */}
          {isPlaying && (
            <View style={styles.volumeIndicator}>
              <Volume2 color="#6366f1" size={20} />
              <View style={styles.volumeBars}>
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.volumeBar,
                      { height: 8 + i * 4, opacity: isPlaying ? 1 : 0.3 },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
    minHeight: 400,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  liveText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#2a2a4a',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a4a',
  },
  radioName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  radioInfo: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
  },
  controlsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  volumeIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 24,
  },
  volumeBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: 8,
    gap: 3,
  },
  volumeBar: {
    width: 4,
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
});
