import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { olharDigitalApi, OlharDigitalGame } from '../services/olharDigitalApi';
import { espnApi, EspnEvent } from '../services/espnApi';
import { getSportsChannels, getChannels } from '../services/channelService';
import { Channel } from '../types/Channel';
import TVPlayerModal from './TVPlayerModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;

// Unified game type combining both sources
interface UnifiedGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  competition: string;
  time: string;
  startDate: string;
  channels: string[];
  isLive: boolean;
  score?: { home: string; away: string };
  source: 'olharDigital' | 'espn';
}

// Map EXACT channel names from broadcasts to keywords for matching in our M3U
// ONLY include channels that we actually have in our app!
const CHANNEL_KEYWORDS: Record<string, string[]> = {
  // ESPN - temos no app
  'espn': ['espn'],
  'espn 2': ['espn 2', 'espn2'],
  'espn 3': ['espn 3', 'espn3'],
  'espn 4': ['espn 4', 'espn4'],
  'espn brasil': ['espn brasil', 'espn br'],
  'espn extra': ['espn extra'],
  // SporTV - temos no app
  'sportv': ['sportv'],
  'sportv 2': ['sportv 2', 'sportv2'],
  'sportv 3': ['sportv 3', 'sportv3'],
  // Premiere - temos no app
  'premiere': ['premiere'],
  'premiere 2': ['premiere 2', 'premiere2'],
  'premiere 3': ['premiere 3', 'premiere3'],
  'premiere 4': ['premiere 4', 'premiere4'],
  'premiere 5': ['premiere 5', 'premiere5'],
  'premiere 6': ['premiere 6', 'premiere6'],
  'premiere 7': ['premiere 7', 'premiere7'],
  'premiere 8': ['premiere 8', 'premiere8'],
  // TNT - temos no app
  'tnt sports': ['tnt sport', 'tnt sports'],
  'tnt sports 2': ['tnt 2', 'tnt2', 'tnt sports 2'],
  // Band - temos no app
  'band': ['band sport', 'bandsport'],
  'bandsports': ['band sport', 'bandsport'],
  // Globo - temos no app
  'globo': ['globo'],
  'tv globo': ['globo'],
  // Disney+ e Star+ - temos no app
  'disney+': ['disney +', 'disney+'],
  'star+': ['star+', 'star +'],
  'disney+ / star+': ['disney +', 'star+'],
  // CazéTV - temos no app (nome EXATO)
  'cazétv': ['cazé tv', 'cazetv', 'cazétv'],
  'cazetv': ['cazé tv', 'cazetv', 'cazétv'],
  // Canal GOAT - temos no app
  'canal goat': ['goat', 'canal goat'],
};

// Canais que NÃO temos no app - usado para filtrar jogos
const UNAVAILABLE_CHANNELS = [
  'youtube',
  'dazn',
  'paramount+',
  'paramount plus',
  'hbo max',
  'max',
  'pluto tv',
  'nba league pass',
  'onefootball',
  'one football',
  'xsports',
  'x sports',
  'amazon prime',
  'prime video',
  'record',
  'sbt',
  'redetv',
];

export const LiveChannelsSlider: React.FC = () => {
  const [games, setGames] = useState<UnifiedGame[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [selectedGame, setSelectedGame] = useState<UnifiedGame | null>(null);

  // Helper function to check if we have a channel for the broadcast
  const hasMatchingChannel = (broadcastChannel: string, availableChannels: Channel[]): boolean => {
    const searchTerm = broadcastChannel.toLowerCase().trim();
    
    // Se o canal está na lista de indisponíveis, retorna false imediatamente
    if (UNAVAILABLE_CHANNELS.some(unavailable => searchTerm.includes(unavailable))) {
      return false;
    }
    
    // Caso especial para Disney+/Star+
    if (searchTerm.includes('disney') || searchTerm.includes('star+')) {
      return availableChannels.some(ch => {
        const chName = ch.name.toLowerCase();
        return chName.includes('disney +') || chName.includes('disney+') || chName.includes('star+');
      });
    }
    
    // Check keywords map - usar correspondência EXATA da chave
    for (const [key, keywords] of Object.entries(CHANNEL_KEYWORDS)) {
      // Verificar se o termo de busca corresponde EXATAMENTE à chave
      if (searchTerm === key || searchTerm.startsWith(key + ' ') || searchTerm.endsWith(' ' + key)) {
        const match = availableChannels.some(ch => {
          const chName = ch.name.toLowerCase();
          return keywords.some(kw => chName.includes(kw));
        });
        if (match) return true;
      }
      // Ou se contém alguma keyword específica
      if (keywords.some(kw => searchTerm === kw || searchTerm.includes(kw))) {
        const match = availableChannels.some(ch => {
          const chName = ch.name.toLowerCase();
          return keywords.some(kw => chName.includes(kw));
        });
        if (match) return true;
      }
    }
    
    // Busca direta mais restritiva - nome do canal deve ter pelo menos 4 caracteres
    if (searchTerm.length >= 4) {
      return availableChannels.some(ch => {
        const chName = ch.name.toLowerCase();
        // Correspondência mais precisa: o nome do canal deve conter o termo OU vice-versa
        return chName.includes(searchTerm) || (searchTerm.length > 5 && searchTerm.includes(chName));
      });
    }
    
    return false;
  };

  // Check if a game has at least one available channel
  const gameHasAvailableChannel = (gameChannels: string[], availableChannels: Channel[]): boolean => {
    return gameChannels.some(channel => hasMatchingChannel(channel, availableChannels));
  };

  // Fetch games from both sources and channels
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [olharGames, espnGames, channelsData] = await Promise.all([
          olharDigitalApi.getTodayGames(),
          espnApi.getEspnLiveGames(),
          // Buscar todos os canais, não apenas esportes, para incluir Disney+
          getChannels({ limit: 300 }),
        ]);
        
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        
        // Transform OlharDigital games
        const olharUnified: UnifiedGame[] = olharGames
          .filter(game => {
            const gameDate = new Date(game.startDate);
            return gameDate >= twoHoursAgo && gameDate <= twoHoursFromNow && game.channels.length > 0;
          })
          .map(game => ({
            id: `olhar-${game.id}`,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            competition: game.competition,
            time: game.time,
            startDate: game.startDate,
            channels: game.channels,
            isLive: new Date(game.startDate) <= now,
            source: 'olharDigital' as const,
          }));
        
        // Transform ESPN games
        const espnUnified: UnifiedGame[] = espnGames
          .filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= twoHoursAgo && eventDate <= twoHoursFromNow;
          })
          .map(event => {
            const homeTeam = event.competitors?.find(c => c.homeAway === 'home');
            const awayTeam = event.competitors?.find(c => c.homeAway === 'away');
            
            // Get channels from broadcasts
            const channels = event.broadcasts?.map(b => b.shortName || b.name) || [];
            if (event.broadcast && !channels.includes(event.broadcast)) {
              channels.push(event.broadcast);
            }
            
            return {
              id: `espn-${event.id}`,
              homeTeam: homeTeam?.displayName || 'Casa',
              awayTeam: awayTeam?.displayName || 'Fora',
              homeLogo: homeTeam?.logo,
              awayLogo: awayTeam?.logo,
              competition: event.league?.name || '',
              time: new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              startDate: event.date,
              channels: channels.length > 0 ? channels : ['ESPN'],
              isLive: event.status === 'in',
              score: (event.status === 'in' || event.status === 'post') ? {
                home: homeTeam?.score || '0',
                away: awayTeam?.score || '0',
              } : undefined,
              source: 'espn' as const,
            };
          });
        
        // Combine and deduplicate (prefer ESPN for duplicates as it has more data)
        let allGames = [...espnUnified];
        
        // Add OlharDigital games that aren't already in ESPN
        for (const olharGame of olharUnified) {
          const isDuplicate = espnUnified.some(espnGame => 
            espnGame.homeTeam.toLowerCase().includes(olharGame.homeTeam.toLowerCase().slice(0, 5)) ||
            olharGame.homeTeam.toLowerCase().includes(espnGame.homeTeam.toLowerCase().slice(0, 5))
          );
          if (!isDuplicate) {
            allGames.push(olharGame);
          }
        }
        
        // ⚡ NOVO: Filtrar apenas jogos que têm canais disponíveis no app
        allGames = allGames.filter(game => gameHasAvailableChannel(game.channels, channelsData));
        
        console.log(`[LiveChannelsSlider] Filtered to ${allGames.length} games with available channels`);
        
        // Sort: live first, then by time
        allGames.sort((a, b) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });
        
        setGames(allGames.slice(0, 10));
        setChannels(channelsData);
      } catch (error) {
        console.error('[LiveChannelsSlider] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Find a channel that matches the broadcast name
  const findMatchingChannel = useCallback((broadcastChannel: string): Channel | null => {
    const searchTerm = broadcastChannel.toLowerCase().trim();
    
    // Caso especial para Disney+/Star+ - procurar por "disney + 1" etc
    if (searchTerm.includes('disney') || searchTerm.includes('star+')) {
      const disneyMatch = channels.find(ch => {
        const chName = ch.name.toLowerCase();
        return chName.includes('disney +') || chName.includes('disney+');
      });
      if (disneyMatch) return disneyMatch;
    }
    
    // Check keywords map
    for (const [key, keywords] of Object.entries(CHANNEL_KEYWORDS)) {
      if (searchTerm.includes(key) || keywords.some(kw => searchTerm.includes(kw))) {
        const match = channels.find(ch => {
          const chName = ch.name.toLowerCase();
          return keywords.some(kw => chName.includes(kw));
        });
        if (match) return match;
      }
    }
    
    // Direct search
    const directMatch = channels.find(ch => {
      const chName = ch.name.toLowerCase();
      return chName.includes(searchTerm) || searchTerm.includes(chName.split(' ')[0]);
    });
    
    return directMatch || null;
  }, [channels]);

  // Handle card press
  const handleCardPress = (game: UnifiedGame) => {
    if (game.channels.length === 1) {
      const channel = findMatchingChannel(game.channels[0]);
      if (channel) {
        setSelectedChannel(channel);
        setShowPlayer(true);
        return;
      }
    }
    
    setSelectedGame(game);
    setShowChannelPicker(true);
  };

  // Handle channel selection from picker
  const handleChannelSelect = (channel: Channel) => {
    setShowChannelPicker(false);
    setSelectedGame(null);
    setSelectedChannel(channel);
    setShowPlayer(true);
  };

  // Get game status
  const getGameStatus = (game: UnifiedGame) => {
    if (game.isLive) return { text: 'AO VIVO', color: '#22c55e' };
    
    const now = new Date();
    const gameDate = new Date(game.startDate);
    const diffMinutes = Math.round((gameDate.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffMinutes < -90) return { text: 'Finalizando', color: '#ef4444' };
    if (diffMinutes < 0) return { text: 'AO VIVO', color: '#22c55e' };
    if (diffMinutes < 30) return { text: `Em ${diffMinutes} min`, color: '#fbbf24' };
    return { text: game.time, color: '#71717a' };
  };

  // Get channel color
  const getChannelColor = (channel: string): string => {
    const ch = channel.toLowerCase();
    if (ch.includes('espn')) return '#dc2626';
    if (ch.includes('disney')) return '#1d4ed8';
    if (ch.includes('star+') || ch.includes('star plus')) return '#7c3aed';
    if (ch.includes('sportv')) return '#ea580c';
    if (ch.includes('caze') || ch.includes('cazé')) return '#7c3aed';
    if (ch.includes('onefootball')) return '#ec4899';
    if (ch.includes('goat')) return '#059669';
    if (ch.includes('nba')) return '#0891b2';
    if (ch.includes('globo')) return '#dc2626';
    if (ch.includes('premiere')) return '#22c55e';
    if (ch.includes('tnt')) return '#dc2626';
    if (ch.includes('band')) return '#3b82f6';
    if (ch.includes('dazn')) return '#f5f505';
    if (ch.includes('paramount')) return '#0066ff';
    return '#6b7280';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#22c55e" />
      </View>
    );
  }

  if (games.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="tv" size={18} color="#22c55e" />
            </View>
            <View>
              <View style={styles.liveIndicator}>
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.liveBadge}
                >
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>AO VIVO</Text>
                </LinearGradient>
              </View>
              <Text style={styles.title}>Transmitindo Agora</Text>
            </View>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countNumber}>{games.length}</Text>
            <Text style={styles.countLabel}>jogos</Text>
          </View>
        </View>
      </View>

      {/* Cards Slider */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
      >
        {games.map((game, index) => {
          const status = getGameStatus(game);
          const primaryChannel = game.channels[0] || '';
          const matchedChannel = findMatchingChannel(primaryChannel);
          
          return (
            <TouchableOpacity
              key={game.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => handleCardPress(game)}
            >
              <LinearGradient
                colors={game.isLive ? ['#1a0f0f', '#1a1a2e'] : ['#1a1a2e', '#0f1a2e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                {/* Status Badge */}
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    {game.isLive && <View style={[styles.statusDot, { backgroundColor: status.color }]} />}
                    <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                  </View>
                  {game.channels.length > 1 && (
                    <Text style={styles.moreChannels}>+{game.channels.length - 1} canais</Text>
                  )}
                </View>

                {/* Teams with Logos */}
                <View style={styles.teamsContainer}>
                  <View style={styles.teamRow}>
                    {game.homeLogo && (
                      <Image source={{ uri: game.homeLogo }} style={styles.teamLogo} />
                    )}
                    <Text style={styles.teamName} numberOfLines={1}>{game.homeTeam}</Text>
                    {game.score && (
                      <Text style={styles.teamScore}>{game.score.home}</Text>
                    )}
                  </View>
                  <View style={styles.teamRow}>
                    {game.awayLogo && (
                      <Image source={{ uri: game.awayLogo }} style={styles.teamLogo} />
                    )}
                    <Text style={styles.teamName} numberOfLines={1}>{game.awayTeam}</Text>
                    {game.score && (
                      <Text style={styles.teamScore}>{game.score.away}</Text>
                    )}
                  </View>
                </View>

                {/* Competition */}
                <Text style={styles.competition} numberOfLines={1}>
                  {game.competition.replace(/\s*\d{4}\/\d{2,4}/, '')}
                </Text>

                {/* Channel Info */}
                <View style={styles.channelRow}>
                  <View style={[
                    styles.channelBadge,
                    { backgroundColor: getChannelColor(primaryChannel) + '20' }
                  ]}>
                    <Ionicons name="tv-outline" size={12} color={getChannelColor(primaryChannel)} />
                    <Text style={[styles.channelText, { color: getChannelColor(primaryChannel) }]} numberOfLines={1}>
                      {primaryChannel}
                    </Text>
                  </View>
                  
                  {matchedChannel ? (
                    <View style={styles.watchBadge}>
                      <Ionicons name="play" size={12} color="#fff" />
                      <Text style={styles.watchText}>Assistir</Text>
                    </View>
                  ) : (
                    <Text style={styles.noChannelHint}>Ver opções</Text>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* TV Player Modal */}
      {selectedChannel && (
        <TVPlayerModal
          visible={showPlayer}
          channel={selectedChannel}
          onClose={() => {
            setShowPlayer(false);
            setSelectedChannel(null);
          }}
        />
      )}

      {/* Channel Picker Modal */}
      <Modal
        visible={showChannelPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChannelPicker(false)}
      >
        <BlurView intensity={25} tint="dark" style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e']}
              style={styles.pickerContent}
            >
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Escolher Canal</Text>
                <TouchableOpacity onPress={() => setShowChannelPicker(false)}>
                  <Ionicons name="close" size={24} color="#a1a1aa" />
                </TouchableOpacity>
              </View>

              {selectedGame && (
                <View style={styles.pickerGameInfo}>
                  <Text style={styles.pickerGameTeams}>
                    {selectedGame.homeTeam} vs {selectedGame.awayTeam}
                  </Text>
                  <Text style={styles.pickerGameComp}>{selectedGame.competition}</Text>
                </View>
              )}

              <Text style={styles.pickerSubtitle}>Canais transmitindo:</Text>

              <ScrollView style={styles.channelsList}>
                {selectedGame?.channels.map((channelName, idx) => {
                  const matchedChannel = findMatchingChannel(channelName);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.channelOption,
                        !matchedChannel && styles.channelOptionDisabled
                      ]}
                      onPress={() => matchedChannel && handleChannelSelect(matchedChannel)}
                      disabled={!matchedChannel}
                    >
                      <View style={[
                        styles.channelOptionIcon,
                        { backgroundColor: getChannelColor(channelName) + '20' }
                      ]}>
                        <Ionicons 
                          name="tv" 
                          size={20} 
                          color={getChannelColor(channelName)} 
                        />
                      </View>
                      <View style={styles.channelOptionInfo}>
                        <Text style={styles.channelOptionName}>{channelName}</Text>
                        {matchedChannel ? (
                          <Text style={styles.channelOptionAvailable}>Disponível no app</Text>
                        ) : (
                          <Text style={styles.channelOptionUnavailable}>Não disponível</Text>
                        )}
                      </View>
                      {matchedChannel && (
                        <Ionicons name="play-circle" size={28} color="#22c55e" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity 
                style={styles.closePickerBtn}
                onPress={() => setShowChannelPicker(false)}
              >
                <Text style={styles.closePickerText}>Fechar</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 24, // Aumentado para dar mais espaço
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  liveIndicator: {
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  countBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  countNumber: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  countLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    minHeight: 170,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  moreChannels: {
    color: '#71717a',
    fontSize: 10,
  },
  teamsContainer: {
    marginBottom: 8,
    gap: 6,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  teamName: {
    flex: 1,
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '700',
  },
  teamScore: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'right',
  },
  competition: {
    color: '#71717a',
    fontSize: 11,
    marginBottom: 12,
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    maxWidth: '60%',
  },
  channelText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  watchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  watchText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  noChannelHint: {
    color: '#71717a',
    fontSize: 10,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: width - 40,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  pickerContent: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  pickerGameInfo: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  pickerGameTeams: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pickerGameComp: {
    color: '#71717a',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  pickerSubtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 12,
  },
  channelsList: {
    maxHeight: 300,
  },
  channelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  channelOptionDisabled: {
    opacity: 0.5,
  },
  channelOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelOptionInfo: {
    flex: 1,
  },
  channelOptionName: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '600',
  },
  channelOptionAvailable: {
    color: '#22c55e',
    fontSize: 11,
    marginTop: 2,
  },
  channelOptionUnavailable: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2,
  },
  closePickerBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  closePickerText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LiveChannelsSlider;
