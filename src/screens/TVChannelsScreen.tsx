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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getSportsChannels } from '../services/channelService';
import { Channel } from '../types/Channel';
import TVPlayerModal from '../components/TVPlayerModal';

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
      <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
      <Text style={styles.liveText}>AO VIVO</Text>
    </View>
  );
};

export default function TVChannelsScreen({ navigation }: any) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [playerVisible, setPlayerVisible] = useState(false);

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    filterChannels();
  }, [searchQuery, channels]);

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

    const query = searchQuery.toLowerCase();
    const filtered = channels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(query) ||
        channel.groupTitle?.toLowerCase().includes(query) ||
        channel.country?.toLowerCase().includes(query)
    );
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
            
            <TouchableOpacity style={styles.playButton}>
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
        <Ionicons name="tv-outline" size={64} color="#22c55e" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Nenhum canal encontrado' : 'Carregando canais...'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Tente outra pesquisa'
          : 'Aguarde enquanto carregamos os canais de esporte'}
      </Text>
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
            <View style={styles.headerIconBadge}>
              <Ionicons name="tv" size={20} color="#22c55e" />
            </View>
            <View>
              <Text style={styles.headerTitle}>TV ao Vivo</Text>
              <Text style={styles.headerSubtitle}>
                {filteredChannels.length} canais de esporte
              </Text>
            </View>
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
      </LinearGradient>
    </View>
  );

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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#22c55e15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#22c55e30',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 2,
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
    borderColor: '#27272a',
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
    borderColor: '#27272a',
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
  liveDot: {
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
});
