import React, { useEffect, useState, useRef, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tv, RefreshCw, X, Calendar, MapPin, Clock, Trophy } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { olharDigitalApi, OlharDigitalGame } from '../services/olharDigitalApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Error Boundary to prevent crashes
interface ErrorBoundaryState {
  hasError: boolean;
  error?: string;
}

class ErrorBoundaryWrapper extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[OndeAssistirCard] Error caught by boundary:', error.message, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Show error for debugging - remove in production
      return (
        <View style={{ padding: 16, backgroundColor: '#1a1a2e', margin: 8, borderRadius: 12 }}>
          <Text style={{ color: '#22c55e', fontSize: 12 }}>
            Onde Assistir Error: {this.state.error}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Main Component - Wrapped for safety
const OndeAssistirCardContent: React.FC = () => {
  const [games, setGames] = useState<OlharDigitalGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<OlharDigitalGame | null>(null);
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const isMountedRef = useRef(true);

  const loadGames = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[OndeAssistirCard] Already loading, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    
    try {
      const data = await olharDigitalApi.getTodayGames();
      
      if (!isMountedRef.current) return;
      
      // Safely filter games
      const gamesWithChannels = (data || []).filter(g => 
        g && Array.isArray(g.channels) && g.channels.length > 0
      );
      
      // Always update data
      setGames(gamesWithChannels.slice(0, 15));
      hasLoadedRef.current = true;
    } catch (e) {
      console.error('[OndeAssistirCard] Error loading games:', e);
      // Don't clear existing data on error
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial load
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        loadGames();
      }
    }, 1000);
    
    // Auto-refresh every 5 minutes silently
    const refreshInterval = setInterval(() => {
      if (isMountedRef.current) {
        loadGames();
      }
    }, 300000);
    
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      clearInterval(refreshInterval);
    };
  }, [loadGames]);

  // Show minimal placeholder only on first load when there's no data
  if (loading && games.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.badge}>
              <Tv size={12} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Onde Assistir</Text>
          </View>
        </View>
        <View style={styles.scrollWrapper}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#22c55e" />
          </View>
        </View>
      </View>
    );
  }

  // Show empty state only when we've loaded and there's no data
  if (!loading && games.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.badge}>
              <Tv size={12} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Onde Assistir</Text>
          </View>
        </View>
        <View style={styles.scrollWrapper}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum jogo com transmissão hoje</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - removed refresh button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Tv size={12} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Onde Assistir</Text>
        </View>
      </View>

      {/* Horizontal Scroll */}
      <View style={styles.scrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {games.map((game, index) => (
            <GameCard 
              key={game.id || `game-${index}`} 
              game={game} 
              onPress={() => setSelectedGame(game)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Game Details Modal */}
      <GameModal 
        game={selectedGame} 
        visible={!!selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </View>
  );
};

// Export wrapped component with memo to prevent re-renders
export const OndeAssistirCard: React.FC = React.memo(() => (
  <ErrorBoundaryWrapper>
    <OndeAssistirCardContent />
  </ErrorBoundaryWrapper>
));

interface GameCardProps {
  game: OlharDigitalGame;
  onPress: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onPress }) => {
  const isNBA = game.sport === 'Basketball';
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={isNBA ? ['#0f172a', '#1e1b4b', '#0f0f1a'] : ['#0f1a0f', '#1a2e1a', '#0f0f1a']}
        style={styles.gameCard}
      >
        {/* Time */}
        <View style={styles.timeRow}>
          <View style={styles.timeBadge}>
            <Clock size={10} color="#22c55e" />
            <Text style={styles.timeText}>{game.time}</Text>
          </View>
        </View>

        {/* Teams */}
        <View style={styles.teamsContainer}>
          <Text style={styles.teamName} numberOfLines={1}>{game.homeTeam}</Text>
          <Text style={styles.vsText}>vs</Text>
          <Text style={styles.teamName} numberOfLines={1}>{game.awayTeam}</Text>
        </View>

        {/* Competition */}
        <Text style={styles.competitionText} numberOfLines={1}>
          {game.competition.replace(/\s*\d{4}\/\d{2,4}/, '')}
        </Text>

        {/* Channels */}
        <View style={styles.channelsRow}>
          {game.channels.slice(0, 2).map((channel, idx) => (
            <View 
              key={idx} 
              style={[
                styles.channelBadge,
                { backgroundColor: olharDigitalApi.getChannelColor(channel) + '30' }
              ]}
            >
              <Text 
                style={[
                  styles.channelText,
                  { color: olharDigitalApi.getChannelColor(channel) }
                ]} 
                numberOfLines={1}
              >
                {channel}
              </Text>
            </View>
          ))}
          {game.channels.length > 2 && (
            <Text style={styles.moreChannels}>+{game.channels.length - 2}</Text>
          )}
        </View>

        <Text style={styles.tapHint}>Toque para detalhes</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Modal Component
interface GameModalProps {
  game: OlharDigitalGame | null;
  visible: boolean;
  onClose: () => void;
}

const GameModal: React.FC<GameModalProps> = ({ game, visible, onClose }) => {
  if (!game) return null;

  const formatFullDate = () => {
    try {
      return format(new Date(game.startDate), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch {
      return game.time;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <BlurView intensity={25} tint="dark" style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f0f1a']}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalBadge}>
                <Tv size={14} color="#fff" />
                <Text style={styles.modalBadgeText}>Onde Assistir</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={22} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            {/* Teams */}
            <View style={styles.modalTeamsContainer}>
              <Text style={styles.modalTeamName}>{game.homeTeam}</Text>
              <View style={styles.modalVsContainer}>
                <Text style={styles.modalVsText}>VS</Text>
              </View>
              <Text style={styles.modalTeamName}>{game.awayTeam}</Text>
            </View>

            {/* Details */}
            <View style={styles.modalDetailsContainer}>
              {/* Competition */}
              <View style={styles.modalDetailRow}>
                <Trophy size={18} color="#fbbf24" />
                <View style={styles.modalDetailContent}>
                  <Text style={styles.modalDetailLabel}>Competição</Text>
                  <Text style={styles.modalDetailValue}>{game.competition}</Text>
                </View>
              </View>

              {/* Date */}
              <View style={styles.modalDetailRow}>
                <Calendar size={18} color="#22c55e" />
                <View style={styles.modalDetailContent}>
                  <Text style={styles.modalDetailLabel}>Data e Horário</Text>
                  <Text style={styles.modalDetailValue}>{formatFullDate()}</Text>
                </View>
              </View>

              {/* Venue */}
              {game.venue && (
                <View style={styles.modalDetailRow}>
                  <MapPin size={18} color="#3b82f6" />
                  <View style={styles.modalDetailContent}>
                    <Text style={styles.modalDetailLabel}>Local</Text>
                    <Text style={styles.modalDetailValue}>{game.venue}</Text>
                  </View>
                </View>
              )}

              {/* Channels */}
              <View style={styles.modalDetailRow}>
                <Tv size={18} color="#dc2626" />
                <View style={styles.modalDetailContent}>
                  <Text style={styles.modalDetailLabel}>Onde Assistir</Text>
                  <View style={styles.modalChannelsGrid}>
                    {game.channels.map((channel, idx) => (
                      <View 
                        key={idx}
                        style={[
                          styles.modalChannelBadge,
                          { backgroundColor: olharDigitalApi.getChannelColor(channel) + '20',
                            borderColor: olharDigitalApi.getChannelColor(channel) + '40' }
                        ]}
                      >
                        <Text 
                          style={[
                            styles.modalChannelText,
                            { color: olharDigitalApi.getChannelColor(channel) }
                          ]}
                        >
                          {channel}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Text style={styles.modalCloseButtonText}>Fechar</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    minHeight: 200, // Fixed minimum height to prevent layout shift
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 16,
    borderRadius: 16,
  },
  emptyText: {
    color: '#52525b',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#22c55e',
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '700',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  scrollWrapper: {
    height: 180,
    position: 'relative',
  },
  refreshOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  gameCard: {
    width: 200,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  timeRow: {
    marginBottom: 10,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  timeText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
  },
  teamsContainer: {
    marginBottom: 8,
  },
  teamName: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '700',
  },
  vsText: {
    color: '#52525b',
    fontSize: 10,
    fontWeight: '600',
    marginVertical: 2,
  },
  competitionText: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 10,
  },
  channelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  channelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  moreChannels: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    alignSelf: 'center',
  },
  tapHint: {
    color: '#3f3f46',
    fontSize: 8,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  modalBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  modalTeamsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTeamName: {
    color: '#e4e4e7',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalVsContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginVertical: 8,
  },
  modalVsText: {
    color: '#52525b',
    fontSize: 14,
    fontWeight: '800',
  },
  modalDetailsContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalDetailContent: {
    flex: 1,
  },
  modalDetailLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalDetailValue: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '600',
  },
  modalChannelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  modalChannelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalChannelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalCloseButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  modalCloseButtonText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
