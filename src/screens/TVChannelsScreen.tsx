import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getSportsChannels, checkTVAccess } from '../services/channelService';
import { useAuth } from '../context/AuthContext';
import { Channel } from '../types/Channel';
import TVPlayerModal from '../components/TVPlayerModal';
import { PremiumGate } from '../components/PremiumGate';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Componente de badge "AO VIVO" animado
const LiveBadge = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.liveBadge}>
      <Animated.View style={[styles.badgeLiveDot, { opacity: pulseAnim }]} />
      <Text style={styles.liveText}>AO VIVO</Text>
    </View>
  );
};

export default function TVChannelsScreen({ navigation }: any) {
  const { token } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string>('');
  const [blockedMessage, setBlockedMessage] = useState<string>('');

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    filterChannels();
  }, [searchQuery, channels]);

  const checkAccess = async () => {
    try {
      const result = await checkTVAccess(token);
      
      if (!result.hasAccess) {
        setAccessBlocked(true);
        setBlockedReason(result.reason || '');
        setBlockedMessage(result.message || '');
        setLoading(false);
        return;
      }
      
      loadChannels();
    } catch (error) {
      // If check fails, try to load channels anyway (fail open unless explicit block)
      console.error('Check access failed', error);
      loadChannels();
    }
  };

  const loadChannels = async () => {
    try {
      setLoading(true);
      const data = await getSportsChannels(300);
      setChannels(data);
      setFilteredChannels(data);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível carregar os canais');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChannels();
    setRefreshing(false);
  };

  const filterChannels = () => {
    if (!searchQuery.trim()) {
      setFilteredChannels(channels);
      return;
    }

    // Divide a busca em palavras e busca cada uma
    const words = searchQuery.toLowerCase().trim().split(/\s+/);
    
    const filtered = channels.filter((channel) => {
      // Combina todos os campos pesquisáveis
      const searchText = `${channel.name} ${channel.groupTitle || ''} ${channel.country || ''}`.toLowerCase();
      
      // Verifica se TODAS as palavras estão presentes
      return words.every(word => searchText.includes(word));
    });
    
    setFilteredChannels(filtered);
  };

  const handleChannelPress = (channel: Channel) => {
    setSelectedChannel(channel);
    setPlayerVisible(true);
  };

  const handleClosePlayer = () => {
    setPlayerVisible(false);
    setSelectedChannel(null);
  };

  const renderChannelItem = ({ item, index }: { item: Channel; index: number }) => (
    <TouchableOpacity
      style={[styles.channelCard, { marginLeft: index % 2 === 0 ? 0 : 8 }]}
      onPress={() => handleChannelPress(item)}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={['#18181b', '#1f1f23']}
        style={styles.channelGradient}
      >
        {/* Live Badge */}
        <View style={styles.cardHeader}>
          <LiveBadge />
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          {item.logo ? (
            <Image
              source={{ uri: item.logo }}
              style={styles.channelLogo}
              resizeMode="contain"
            />
          ) : (
            <LinearGradient
              colors={['#22c55e20', '#22c55e10']}
              style={styles.placeholderLogo}
            >
              <Ionicons name="tv" size={36} color="#22c55e" />
            </LinearGradient>
          )}
        </View>

        {/* Info */}
        <View style={styles.channelInfo}>
          <Text style={styles.channelName} numberOfLines={2}>
            {item.name}
          </Text>

          {item.groupTitle && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.groupTitle}</Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            {item.country && (
              <View style={styles.metaItem}>
                <Ionicons name="globe-outline" size={12} color="#71717a" />
                <Text style={styles.metaText}>{item.country}</Text>
              </View>
            )}
            
            <TouchableOpacity style={styles.playButton} onPress={() => handleChannelPress(item)}>
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={styles.playGradient}
              >
                <Ionicons name="play" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['#22c55e20', '#22c55e05']}
        style={styles.emptyIconContainer}
      >
        <Ionicons name={searchQuery ? "search-outline" : "wifi-outline"} size={48} color="#22c55e" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Nenhum canal encontrado' : 'Lista vazia ou sem conexão'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Tente buscar por outro termo'
          : 'Verifique sua conexão e puxe para baixo para recarregar.'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity style={styles.reloadButton} onPress={handleRefresh}>
          <Text style={styles.reloadButtonText}>Recarregar Canais</Text>
          <Ionicons name="refresh" size={16} color="#09090b" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#09090b', '#18181b']}
        style={styles.headerGradient}
      >
        {/* Back Button and Title */}
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation?.goBack?.()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTitleWrapper}>
              <Text style={styles.headerTitle}>TV ao Vivo</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveCount}>{filteredChannels.length}</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              Canais de esporte em alta definição
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#71717a" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar canais, países..."
            placeholderTextColor="#52525b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#71717a" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{channels.length}</Text>
            <Text style={styles.statLabel}>Canais</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statLive}>
              <View style={styles.statLiveDot} />
              <Text style={styles.statNumber}>{channels.length}</Text>
            </View>
            <Text style={styles.statLabel}>Ao Vivo</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>⚽</Text>
            <Text style={styles.statLabel}>Esportes</Text>
          </View>
        </View>

        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <View style={styles.warningIconContainer}>
            <Ionicons name="warning" size={16} color="#eab308" />
          </View>
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningText}>
              Os canais são de fontes externas e podem ficar indisponíveis a qualquer momento. 
              O desenvolvedor não tem controle sobre a disponibilidade dos streams.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  if (accessBlocked) {
    const isMaintenance = blockedReason === 'maintenance';

    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={isMaintenance ? ['#eab30820', '#eab30805'] : ['#ef444420', '#ef444405']}
          style={styles.loadingIconContainer}
        >
          <Ionicons 
            name={isMaintenance ? "construct" : "lock-closed"} 
            size={48} 
            color={isMaintenance ? "#eab308" : "#ef4444"} 
          />
        </LinearGradient>
        <Text style={styles.loadingText}>
          {isMaintenance ? "Sistema em Manutenção" : "Acesso Bloqueado"}
        </Text>
        <Text style={[styles.loadingSubtext, { textAlign: 'center', paddingHorizontal: 32 }]}>
          {isMaintenance 
            ? (blockedMessage || "O sistema de canais está em manutenção. Voltaremos em breve.")
            : "Você não tem permissão para acessar os canais de TV."}
        </Text>
        
        {!isMaintenance && (
          <>
            <Text style={[styles.loadingSubtext, { marginTop: 8 }]}>
              Entre em contato para solicitar acesso:
            </Text>
            
            <TouchableOpacity
              style={styles.instagramButton}
              onPress={() => Linking.openURL('https://www.instagram.com/programadorpro_/')}
            >
              <Ionicons name="logo-instagram" size={20} color="#fff" />
              <Text style={styles.instagramButtonText}>@programadorpro_</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.backButtonBlocked}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonBlockedText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#22c55e20', '#22c55e05']}
          style={styles.loadingIconContainer}
        >
          <ActivityIndicator size="large" color="#22c55e" />
        </LinearGradient>
        <Text style={styles.loadingText}>Carregando canais...</Text>
        <Text style={styles.loadingSubtext}>Preparando transmissões ao vivo</Text>
      </View>
    );
  }


  return (
    <PremiumGate navigation={navigation} featureName="TV ao Vivo">
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderHeader()}

        <FlatList
          data={filteredChannels}
          renderItem={renderChannelItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#22c55e"
              colors={['#22c55e']}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />

        {selectedChannel && (
          <TVPlayerModal
            visible={playerVisible}
            channel={selectedChannel}
            onClose={handleClosePlayer}
          />
        )}
      </View>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
  loadingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    color: '#e4e4e7',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#71717a',
    fontSize: 14,
    marginTop: 8,
  },
  header: {
    paddingTop: 48,
  },
  headerGradient: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    marginTop: 2,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#3f3f46',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#e4e4e7',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  statLabel: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#27272a',
  },
  statLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  channelCard: {
    width: CARD_WIDTH,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3f3f46',
    backgroundColor: '#18181b', // Fallback color
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  channelGradient: {
    padding: 12,
    minHeight: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  channelLogo: {
    width: '100%',
    height: 70,
    borderRadius: 8,
  },
  placeholderLogo: {
    width: '100%',
    height: 70,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000040',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e4e4e7',
    marginBottom: 8,
    lineHeight: 17,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#22c55e20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    color: '#22c55e',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#71717a',
  },
  playButton: {
    marginLeft: 'auto',
  },
  playGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e4e4e7',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  reloadButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  reloadButtonText: {
    color: '#09090b',
    fontSize: 14,
    fontWeight: '700',
  },
  backButtonBlocked: {
    marginTop: 16,
    backgroundColor: '#27272a',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  backButtonBlockedText: {
    color: '#e4e4e7',
    fontSize: 16,
    fontWeight: '600',
  },
  instagramButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E1306C',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  instagramButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eab30815',
    borderWidth: 1,
    borderColor: '#eab30830',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  warningIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#eab30820',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningTextContainer: {
    flex: 1,
  },
  warningText: {
    fontSize: 12,
    color: '#eab308',
    lineHeight: 18,
    fontWeight: '500',
  },
});
