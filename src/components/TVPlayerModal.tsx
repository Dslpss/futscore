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
  Linking,
  Share,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { Channel } from '../types/Channel';
import { incrementViewCount } from '../services/channelService';

const { width, height } = Dimensions.get('window');

// Opções de formato de tela
type AspectRatioMode = 'auto' | '16:9' | '4:3' | 'stretch';
const ASPECT_RATIO_OPTIONS: { key: AspectRatioMode; label: string; ratio?: number }[] = [
  { key: 'auto', label: 'Auto' },
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: 'stretch', label: 'Esticar' },
];

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatioMode, setAspectRatioMode] = useState<AspectRatioMode>('16:9');
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showCastMenu, setShowCastMenu] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-reload system refs
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stallCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<number>(0);
  const stallCountRef = useRef<number>(0);
  const isBufferingRef = useRef<boolean>(false);
  
  // Configuration for auto-reload
  const MAX_BUFFERING_TIME = 15000; // 15 seconds of buffering triggers reload
  const STALL_CHECK_INTERVAL = 3000; // Check every 3 seconds
  const MAX_STALL_COUNT = 6; // 6 consecutive stalls trigger reload (more tolerant)
  const MAX_RECONNECT_ATTEMPTS = 5; // Maximum auto-reconnect attempts

  useEffect(() => {
    if (visible && channel) {
      // Start in portrait mode
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      // Show navigation bar initially
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setBehaviorAsync('overlay-swipe');
      // Hide status bar initially (player should always be immersive)
      StatusBar.setHidden(true, 'fade');
      // Reset reconnect attempts
      setReconnectAttempts(0);
      setIsReconnecting(false);
      stallCountRef.current = 0;
      lastPositionRef.current = 0;
      // Increment view count
      incrementViewCount(channel._id);
    }
    
    // Cleanup: restore portrait and reset fullscreen when closing
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setBehaviorAsync('inset-touch');
      StatusBar.setHidden(false, 'fade');
      setIsFullscreen(false);
      setShowAspectMenu(false);
      setShowCastMenu(false);
      // Clear auto-reload timeouts
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
      if (stallCheckIntervalRef.current) {
        clearInterval(stallCheckIntervalRef.current);
        stallCheckIntervalRef.current = null;
      }
    };
  }, [visible, channel]);

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      // Exit fullscreen - go back to portrait
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      await NavigationBar.setVisibilityAsync('visible');
      await NavigationBar.setBehaviorAsync('overlay-swipe');
      StatusBar.setHidden(true, 'fade'); // Keep hidden in portrait player mode too
      setIsFullscreen(false);
      setAspectRatioMode('16:9'); // Reset to 16:9 when exiting fullscreen
    } else {
      // Enter fullscreen - go landscape and hide nav bar + gesture bar completely
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      await NavigationBar.setBehaviorAsync('overlay-swipe');
      await NavigationBar.setVisibilityAsync('hidden');
      StatusBar.setHidden(true, 'fade');
      setIsFullscreen(true);
      setAspectRatioMode('stretch'); // Switch to stretch when entering fullscreen
    }
    setShowControls(true);
  };

  const getVideoStyle = () => {
    const option = ASPECT_RATIO_OPTIONS.find(o => o.key === aspectRatioMode);
    
    if (aspectRatioMode === 'stretch') {
      return { width: '100%' as const, height: '100%' as const };
    }
    
    if (option?.ratio) {
      return { width: '100%' as const, aspectRatio: option.ratio };
    }
    
    // Auto mode - use contain
    return { width: '100%' as const, aspectRatio: 16 / 9 };
  };

  const getResizeMode = () => {
    if (aspectRatioMode === 'stretch') return ResizeMode.STRETCH;
    if (aspectRatioMode === 'auto') return ResizeMode.CONTAIN;
    return ResizeMode.CONTAIN;
  };

  useEffect(() => {
    if (showControls) {
      // Clear existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      // Don't auto-hide if a menu is open
      if (showCastMenu || showAspectMenu) {
        return;
      }

      // Auto-hide controls after 3 seconds
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, showCastMenu, showAspectMenu]);

  // Auto-reload function - called when stall/buffering is detected
  const autoReload = async () => {
    // Prevent multiple simultaneous reloads
    if (isReconnecting) {
      console.log('Already reconnecting, skipping...');
      return;
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnect attempts reached');
      setIsReconnecting(false);
      setError('Conexão perdida. Toque em "Tentar novamente" para reconectar.');
      return;
    }

    // Check if videoRef is still valid
    if (!videoRef.current) {
      console.log('Video ref is null, skipping reload');
      return;
    }

    console.log(`Auto-reload attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`);
    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    stallCountRef.current = 0;
    lastPositionRef.current = 0;
    isBufferingRef.current = false;

    // Clear any existing buffering timeout
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }

    try {
      // Double check ref is still valid
      if (!videoRef.current) {
        setIsReconnecting(false);
        return;
      }

      await videoRef.current.unloadAsync();
      
      // Longer delay before reloading to prevent rapid loops
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check again after delay
      if (!videoRef.current) {
        setIsReconnecting(false);
        return;
      }

      await videoRef.current.loadAsync(
        { uri: channel.url },
        { shouldPlay: true },
        false
      );
      
      // Success - will be confirmed by playback status update
      console.log('Reload successful, waiting for playback...');
    } catch (err: any) {
      console.error('Error auto-reloading video:', err);
      setIsReconnecting(false);
      
      // Only retry if we haven't hit max attempts and ref is still valid
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && videoRef.current) {
        setTimeout(() => {
          autoReload();
        }, 3000);
      }
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setIsPlaying(status.isPlaying);
      
      // If we were reconnecting and now loaded, mark as successful
      if (isReconnecting && status.isPlaying && !status.isBuffering) {
        console.log('Reconnection successful!');
        setIsReconnecting(false);
        setReconnectAttempts(0);
        stallCountRef.current = 0;
      }
      
      // Check for buffering state - but only if not already reconnecting
      const isCurrentlyBuffering = status.isBuffering;
      
      if (isCurrentlyBuffering && !isBufferingRef.current && !isReconnecting) {
        // Started buffering - set timeout for auto-reload
        isBufferingRef.current = true;
        console.log('Started buffering...');
        
        bufferingTimeoutRef.current = setTimeout(() => {
          console.log('Buffering timeout reached - auto-reloading');
          autoReload();
        }, MAX_BUFFERING_TIME);
      } else if (!isCurrentlyBuffering && isBufferingRef.current) {
        // Stopped buffering - clear timeout
        isBufferingRef.current = false;
        if (bufferingTimeoutRef.current) {
          clearTimeout(bufferingTimeoutRef.current);
          bufferingTimeoutRef.current = null;
        }
        // Reset stall count on successful playback resume
        stallCountRef.current = 0;
      }
      
      // Check for stalled playback - but NOT during buffering or reconnecting
      if (status.isPlaying && !isCurrentlyBuffering && !isReconnecting && status.positionMillis !== undefined) {
        const currentPosition = status.positionMillis;
        
        // Only count as stall if position exactly same AND we've been playing for a bit
        if (currentPosition === lastPositionRef.current && currentPosition > 1000) {
          // Position hasn't changed - might be stalled
          stallCountRef.current++;
          
          // Only log every few stalls to reduce noise
          if (stallCountRef.current % 2 === 0) {
            console.log(`Stall detected: ${stallCountRef.current}/${MAX_STALL_COUNT}`);
          }
          
          if (stallCountRef.current >= MAX_STALL_COUNT) {
            console.log('Max stalls reached - auto-reloading');
            stallCountRef.current = 0; // Reset before reload to prevent immediate re-trigger
            autoReload();
          }
        } else if (currentPosition !== lastPositionRef.current) {
          // Position is advancing - reset stall count
          stallCountRef.current = 0;
          lastPositionRef.current = currentPosition;
          // Successful playback - reset reconnect attempts
          if (reconnectAttempts > 0 && !isCurrentlyBuffering) {
            setReconnectAttempts(0);
          }
        }
      }
    } else {
      // Handle error state
      if (status.error) {
        console.error('Video error:', status.error);
        setIsLoading(false);
        // Auto-reload on error instead of showing error immediately
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !isReconnecting) {
          autoReload();
        } else {
          setError(`Erro: ${status.error}`);
        }
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
    setIsReconnecting(false);
    setReconnectAttempts(0);
    stallCountRef.current = 0;
    lastPositionRef.current = 0;
    
    // Clear buffering timeout
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }
    
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
    // Stop video
    if (videoRef.current) {
      await videoRef.current.stopAsync();
      await videoRef.current.unloadAsync();
    }
    
    // Reset orientation to portrait
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    
    // Show navigation bar and status bar
    await NavigationBar.setVisibilityAsync('visible');
    await NavigationBar.setBehaviorAsync('inset-touch');
    StatusBar.setHidden(false, 'fade');
    
    // Reset states
    setError(null);
    setIsLoading(true);
    setIsFullscreen(false);
    setShowAspectMenu(false);
    
    onClose();
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    // Close any open menus when toggling controls
    setShowAspectMenu(false);
    setShowCastMenu(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Não foi possível reproduzir este canal. Verifique sua conexão ou tente outro canal.');
  };

  // =============================================
  // CAST / EXTERNAL PLAYER FUNCTIONS
  // =============================================

  // Copy stream URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await Clipboard.setStringAsync(channel.url);
      Alert.alert('URL Copiada', 'O link do stream foi copiado para a área de transferência.');
      setShowCastMenu(false);
    } catch (err) {
      console.error('Error copying URL:', err);
      Alert.alert('Erro', 'Não foi possível copiar o link.');
    }
  };

  // Share stream URL
  const handleShareUrl = async () => {
    try {
      await Share.share({
        message: `Assistir ${channel.name}: ${channel.url}`,
        title: channel.name,
        url: channel.url, // iOS only
      });
      setShowCastMenu(false);
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Open in Web Video Caster (popular casting app)
  const handleOpenWebVideoCaster = async () => {
    try {
      // Web Video Caster deep link scheme
      const webVideoCasterUrl = `webvideocaster://play?url=${encodeURIComponent(channel.url)}&title=${encodeURIComponent(channel.name)}`;
      const canOpen = await Linking.canOpenURL(webVideoCasterUrl);
      
      if (canOpen) {
        await Linking.openURL(webVideoCasterUrl);
        setShowCastMenu(false);
      } else {
        // Try alternative scheme
        const altUrl = `intent://play?url=${encodeURIComponent(channel.url)}#Intent;scheme=webvideocaster;package=com.nickthecoder.webvideocaster;end`;
        const canOpenAlt = await Linking.canOpenURL(altUrl);
        
        if (canOpenAlt) {
          await Linking.openURL(altUrl);
        } else {
          Alert.alert(
            'Web Video Caster',
            'O aplicativo Web Video Caster não está instalado. Deseja baixar da Play Store?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Baixar', 
                onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.nickthecoder.webvideocaster') 
              },
            ]
          );
        }
      }
    } catch (err) {
      console.error('Error opening Web Video Caster:', err);
      Alert.alert('Erro', 'Não foi possível abrir o Web Video Caster.');
    }
  };

  // Open in VLC Player
  const handleOpenVLC = async () => {
    try {
      // VLC deep link
      const vlcUrl = `vlc://${channel.url}`;
      const canOpen = await Linking.canOpenURL(vlcUrl);
      
      if (canOpen) {
        await Linking.openURL(vlcUrl);
        setShowCastMenu(false);
      } else {
        Alert.alert(
          'VLC Player',
          'O VLC Player não está instalado. Deseja baixar da Play Store?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Baixar', 
              onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=org.videolan.vlc') 
            },
          ]
        );
      }
    } catch (err) {
      console.error('Error opening VLC:', err);
      Alert.alert('Erro', 'Não foi possível abrir o VLC.');
    }
  };

  // Open in MX Player
  const handleOpenMXPlayer = async () => {
    try {
      // MX Player intent
      const mxUrl = `intent:${channel.url}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;S.title=${encodeURIComponent(channel.name)};end`;
      const canOpen = await Linking.canOpenURL(mxUrl);
      
      if (canOpen) {
        await Linking.openURL(mxUrl);
        setShowCastMenu(false);
      } else {
        Alert.alert(
          'MX Player',
          'O MX Player não está instalado. Deseja baixar da Play Store?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Baixar', 
              onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad') 
            },
          ]
        );
      }
    } catch (err) {
      console.error('Error opening MX Player:', err);
      Alert.alert('Erro', 'Não foi possível abrir o MX Player.');
    }
  };

  // Open stream URL directly (let system choose app)
  const handleOpenExternal = async () => {
    try {
      await Linking.openURL(channel.url);
      setShowCastMenu(false);
    } catch (err) {
      console.error('Error opening external:', err);
      Alert.alert('Erro', 'Não foi possível abrir o stream em um aplicativo externo.');
    }
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
            style={[styles.video, getVideoStyle()]}
            resizeMode={getResizeMode()}
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={handleError}
            useNativeControls={false}
          />

          {/* Loading Indicator */}
          {isLoading && !error && !isReconnecting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Carregando stream...</Text>
            </View>
          )}

          {/* Reconnecting Indicator */}
          {isReconnecting && !error && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#22c55e" />
              <Text style={styles.reconnectingText}>Reconectando...</Text>
              <Text style={styles.reconnectingSubtext}>
                Tentativa {reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS}
              </Text>
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
                
                <View style={styles.bottomActions}>
                  {/* Cast Button */}
                  <TouchableOpacity
                    style={[styles.actionButton, showCastMenu && styles.actionButtonActive]}
                    onPress={() => {
                      setShowCastMenu(!showCastMenu);
                      setShowAspectMenu(false);
                    }}
                  >
                    <Ionicons name="tv-outline" size={22} color="#fff" />
                  </TouchableOpacity>

                  {/* Aspect Ratio Button */}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setShowAspectMenu(!showAspectMenu);
                      setShowCastMenu(false);
                    }}
                  >
                    <Ionicons name="resize" size={22} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleReload}
                  >
                    <Ionicons name="refresh" size={22} color="#fff" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={toggleFullscreen}
                  >
                    <Ionicons 
                      name={isFullscreen ? "contract" : "expand"} 
                      size={22} 
                      color="#fff" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Aspect Ratio Menu */}
              {showAspectMenu && (
                <View style={styles.aspectMenu}>
                  <Text style={styles.aspectMenuTitle}>Formato de Tela</Text>
                  <View style={styles.aspectOptions}>
                    {ASPECT_RATIO_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.aspectOption,
                          aspectRatioMode === option.key && styles.aspectOptionActive,
                        ]}
                        onPress={() => {
                          setAspectRatioMode(option.key);
                          setShowAspectMenu(false);
                          setShowControls(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.aspectOptionText,
                            aspectRatioMode === option.key && styles.aspectOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Cast Menu */}
              {showCastMenu && (
                <View style={styles.castMenu}>
                  {/* Premium Header */}
                  <View style={styles.castMenuHeader}>
                    <View style={styles.castMenuIconWrapper}>
                      <Ionicons name="tv-outline" size={24} color="#22c55e" />
                    </View>
                    <View style={styles.castMenuTitleWrapper}>
                      <Text style={styles.castMenuTitle}>Abrir em outro app</Text>
                      <Text style={styles.castMenuSubtitle}>Escolha como reproduzir</Text>
                    </View>
                  </View>
                  
                  <View style={styles.castDivider} />
                  <TouchableOpacity
                    style={styles.castOption}
                    onPress={handleOpenVLC}
                  >
                    <Ionicons name="play-circle-outline" size={20} color="#f97316" />
                    <View style={styles.castOptionInfo}>
                      <Text style={styles.castOptionText}>VLC Player</Text>
                      <Text style={styles.castOptionSubtext}>Player avançado</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.castOption}
                    onPress={handleOpenMXPlayer}
                  >
                    <Ionicons name="videocam-outline" size={20} color="#8b5cf6" />
                    <View style={styles.castOptionInfo}>
                      <Text style={styles.castOptionText}>MX Player</Text>
                      <Text style={styles.castOptionSubtext}>Player popular</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.castDivider} />

                  <TouchableOpacity
                    style={styles.castOption}
                    onPress={handleShareUrl}
                  >
                    <Ionicons name="share-outline" size={20} color="#3b82f6" />
                    <View style={styles.castOptionInfo}>
                      <Text style={styles.castOptionText}>Compartilhar</Text>
                      <Text style={styles.castOptionSubtext}>Abre o Web Video Caster e outros apps</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.castOption}
                    onPress={handleCopyUrl}
                  >
                    <Ionicons name="copy-outline" size={20} color="#94a3b8" />
                    <View style={styles.castOptionInfo}>
                      <Text style={styles.castOptionText}>Copiar URL</Text>
                      <Text style={styles.castOptionSubtext}>Copiar link do stream</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.castDivider} />

                  {/* Web Video Caster Tip */}
                  <TouchableOpacity
                    style={styles.castTip}
                    onPress={() => {
                      setShowCastMenu(false);
                      Linking.openURL('https://play.google.com/store/apps/details?id=com.instantbits.cast.webvideo');
                    }}
                  >
                    <View style={styles.castTipIcon}>
                      <Text style={styles.castTipEmoji}>💡</Text>
                    </View>
                    <View style={styles.castTipContent}>
                      <Text style={styles.castTipTitle}>Dica: Transmita para TV!</Text>
                      <Text style={styles.castTipText}>
                        Baixe o Web Video Caster para transmitir via Chromecast, Smart TV, Fire TV e mais!
                      </Text>
                    </View>
                    <Ionicons name="download-outline" size={20} color="#22c55e" />
                  </TouchableOpacity>
                </View>
              )}
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
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
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
  reconnectingText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  reconnectingSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 32,
  },
  categoryBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aspectMenu: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 12,
    minWidth: 150,
  },
  aspectMenuTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  aspectOptions: {
    gap: 4,
  },
  aspectOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  aspectOptionActive: {
    backgroundColor: '#22c55e',
  },
  aspectOptionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  aspectOptionTextActive: {
    fontWeight: '700',
  },
  // Cast Menu Styles
  actionButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.5)',
  },
  castMenu: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  castMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  castMenuIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  castMenuTitleWrapper: {
    flex: 1,
  },
  castMenuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  castMenuSubtitle: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  castOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  castOptionInfo: {
    marginLeft: 14,
    flex: 1,
  },
  castOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  castOptionSubtext: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  castDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
  },
  // Web Video Caster Tip Styles
  castTip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderStyle: 'dashed',
  },
  castTipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  castTipEmoji: {
    fontSize: 16,
  },
  castTipContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  castTipTitle: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '700',
  },
  castTipText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
});
