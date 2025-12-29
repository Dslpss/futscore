import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getSportsChannels } from '../services/channelService';
import { Channel } from '../types/Channel';
import TVPlayerModal from '../components/TVPlayerModal';

export default function TVChannelsScreen() {
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
      const data = await getSportsChannels(200);
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

  const renderChannelItem = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      style={styles.channelCard}
      onPress={() => handleChannelPress(item)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.channelGradient}
      >
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={styles.channelLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderLogo}>
            <Ionicons name="tv" size={40} color="#6366f1" />
          </View>
        )}
        
        <View style={styles.channelInfo}>
          <Text style={styles.channelName} numberOfLines={2}>
            {item.name}
          </Text>
          
          {item.groupTitle && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.groupTitle}</Text>
            </View>
          )}
          
          <View style={styles.metaInfo}>
            {item.country && (
              <View style={styles.metaItem}>
                <Ionicons name="flag" size={12} color="#94a3b8" />
                <Text style={styles.metaText}>{item.country}</Text>
              </View>
            )}
            
            {item.viewCount > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="eye" size={12} color="#94a3b8" />
                <Text style={styles.metaText}>{item.viewCount}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.playButton}>
          <Ionicons name="play-circle" size={32} color="#6366f1" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="tv-outline" size={80} color="#475569" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Nenhum canal encontrado' : 'Nenhum canal disponível'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Tente outra pesquisa'
          : 'Aguarde enquanto carregamos os canais'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#d946ef']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="tv" size={28} color="#fff" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>TV ao Vivo</Text>
              <Text style={styles.headerSubtitle}>
                {filteredChannels.length} canais disponíveis
              </Text>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar canais..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Carregando canais...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        data={filteredChannels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
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
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingTop: 48,
  },
  headerGradient: {
    paddingBottom: 24,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  channelCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  channelGradient: {
    padding: 12,
    minHeight: 200,
  },
  channelLogo: {
    width: '100%',
    height: 80,
    marginBottom: 12,
    borderRadius: 8,
  },
  placeholderLogo: {
    width: '100%',
    height: 80,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 18,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    color: '#a5b4fc',
    fontWeight: '600',
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 'auto',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  playButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
});
