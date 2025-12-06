import React, { useEffect, useState, useRef, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tv, Play, RefreshCw, X, Calendar, MapPin, Clock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { espnApi, EspnEvent } from '../services/espnApi';
import { EspnLiveEvent } from '../types';
import { LiveMatchInfo } from './LiveMatchInfo';
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
    console.error('[EspnLiveCard] Error caught by boundary:', error.message, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Show error for debugging - remove in production
      return (
        <View style={{ padding: 16, backgroundColor: '#1a1a2e', margin: 8, borderRadius: 12 }}>
          <Text style={{ color: '#dc2626', fontSize: 12 }}>
            ESPN Error: {this.state.error}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Main Component
const EspnLiveCardContent: React.FC = () => {
  const [events, setEvents] = useState<EspnEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EspnEvent | null>(null);
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const isMountedRef = useRef(true);

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isLoadingRef.current) {
      console.log('[EspnLiveCard] Already loading, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    
    if (isMountedRef.current) {
      // Only show full loading on first load
      if (!hasLoadedRef.current) {
        setLoading(true);
      } else if (isRefresh) {
        setRefreshing(true);
      }
    }
    
    try {
      const data = await espnApi.getEspnLiveGames();
      
      if (!isMountedRef.current) return;
      
      const newEvents = (data || []).slice(0, 10);
      // Only update if we got data
      if (newEvents.length > 0) {
        setEvents(newEvents);
      }
      hasLoadedRef.current = true;
    } catch (e) {
      console.error('[EspnLiveCard] Error loading events:', e);
      // Don't clear existing data on error
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    const timer = setTimeout(() => {
      if (!hasLoadedRef.current && isMountedRef.current) {
        loadEvents(false);
      }
    }, 500);
    
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
  }, [loadEvents]);

  // Only show loading on first load
  if (loading && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#dc2626" />
      </View>
    );
  }

  // Hide if no data at all
  if (events.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.espnBadge}>
            <Text style={styles.espnText}>ESPN</Text>
          </View>
          <Text style={styles.headerTitle}>Na ESPN</Text>
        </View>
        <TouchableOpacity onPress={() => loadEvents(true)} style={styles.refreshButton}>
          <RefreshCw size={14} color="#71717a" />
        </TouchableOpacity>
      </View>

      {/* Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {events.map((event) => (
          <EspnEventCard 
            key={event.id} 
            event={event} 
            onPress={() => setSelectedEvent(event)}
          />
        ))}
      </ScrollView>

      {/* Event Details Modal */}
      <EspnEventModal 
        event={selectedEvent} 
        visible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </View>
  );
};

// Export wrapped component with memo to prevent re-renders
export const EspnLiveCard: React.FC = React.memo(() => (
  <ErrorBoundaryWrapper>
    <EspnLiveCardContent />
  </ErrorBoundaryWrapper>
));

interface EspnEventCardProps {
  event: EspnEvent;
  onPress: () => void;
}

const EspnEventCard: React.FC<EspnEventCardProps> = ({ event, onPress }) => {
  const homeTeam = event.competitors?.find((c) => c.homeAway === 'home');
  const awayTeam = event.competitors?.find((c) => c.homeAway === 'away');
  const isLive = event.status === 'in';
  const isFinished = event.status === 'post';
  
  const broadcastText = event.broadcast || 
    (event.broadcasts && event.broadcasts.length > 0 
      ? event.broadcasts.map(b => b.shortName || b.name).slice(0, 2).join(', ')
      : 'ESPN');

  const formatEventTime = () => {
    if (isLive) return 'AO VIVO';
    if (isFinished) return 'FIM';
    try {
      return format(new Date(event.date), "HH:mm", { locale: ptBR });
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={isLive ? ['#1a0a0a', '#1f0f0f', '#140808'] : ['#0f0f1a', '#0a0a14', '#080812']}
        style={styles.eventCard}
      >
        {/* Broadcast Channel */}
        <View style={styles.broadcastRow}>
          <View style={[styles.channelBadge, isLive && styles.channelBadgeLive]}>
            {isLive ? (
              <Play size={10} color="#dc2626" fill="#dc2626" />
            ) : (
              <Tv size={10} color="#a1a1aa" />
            )}
            <Text style={[styles.channelText, isLive && styles.channelTextLive]} numberOfLines={1}>
              {broadcastText}
            </Text>
          </View>
          <Text style={[styles.timeText, isLive && styles.timeTextLive]}>
            {formatEventTime()}
          </Text>
        </View>

        {/* Teams */}
        <View style={styles.teamsContainer}>
          {/* Home Team */}
          <View style={styles.teamRow}>
            {homeTeam?.logo ? (
              <Image source={{ uri: homeTeam.logo }} style={styles.teamLogo} />
            ) : (
              <View style={[styles.teamLogoPlaceholder, { backgroundColor: homeTeam?.color ? `#${homeTeam.color}` : '#333' }]}>
                <Text style={styles.teamLogoText}>{homeTeam?.abbreviation?.[0] || 'H'}</Text>
              </View>
            )}
            <Text style={styles.teamName} numberOfLines={1}>
              {homeTeam?.displayName || homeTeam?.abbreviation || 'Home'}
            </Text>
            {(isLive || isFinished) && homeTeam?.score && (
              <Text style={[styles.scoreText, homeTeam?.winner && styles.scoreTextWinner]}>
                {homeTeam.score}
              </Text>
            )}
          </View>

          {/* Away Team */}
          <View style={styles.teamRow}>
            {awayTeam?.logo ? (
              <Image source={{ uri: awayTeam.logo }} style={styles.teamLogo} />
            ) : (
              <View style={[styles.teamLogoPlaceholder, { backgroundColor: awayTeam?.color ? `#${awayTeam.color}` : '#333' }]}>
                <Text style={styles.teamLogoText}>{awayTeam?.abbreviation?.[0] || 'A'}</Text>
              </View>
            )}
            <Text style={styles.teamName} numberOfLines={1}>
              {awayTeam?.displayName || awayTeam?.abbreviation || 'Away'}
            </Text>
            {(isLive || isFinished) && awayTeam?.score && (
              <Text style={[styles.scoreText, awayTeam?.winner && styles.scoreTextWinner]}>
                {awayTeam.score}
              </Text>
            )}
          </View>
        </View>

        {/* League */}
        {event.league && (
          <Text style={styles.leagueText} numberOfLines={1}>
            {event.league.abbreviation || event.league.name}
          </Text>
        )}

        {/* Tap hint */}
        <Text style={styles.tapHint}>Toque para detalhes</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Modal Component
interface EspnEventModalProps {
  event: EspnEvent | null;
  visible: boolean;
  onClose: () => void;
}

const EspnEventModal: React.FC<EspnEventModalProps> = ({ event, visible, onClose }) => {
  const [liveEventData, setLiveEventData] = useState<EspnLiveEvent | null>(null);
  const [loadingLiveData, setLoadingLiveData] = useState(false);

  useEffect(() => {
    if (visible && event && (event.status === 'in' || event.status === 'post')) {
      loadLiveData();
    } else {
      setLiveEventData(null);
    }
  }, [visible, event]);

  const loadLiveData = async () => {
    if (!event?.league?.slug) return;
    setLoadingLiveData(true);
    try {
      const events = await espnApi.getScoreboardData(event.league.slug);
      const matchingEvent = events.find(e => e.id === event.id);
      if (matchingEvent) {
        setLiveEventData(matchingEvent);
      }
    } catch (error) {
      console.error('[EspnEventModal] Error loading live data:', error);
    } finally {
      setLoadingLiveData(false);
    }
  };

  if (!event) return null;

  const homeTeam = event.competitors?.find((c) => c.homeAway === 'home');
  const awayTeam = event.competitors?.find((c) => c.homeAway === 'away');
  const isLive = event.status === 'in';
  const isFinished = event.status === 'post';

  const formatFullDate = () => {
    try {
      return format(new Date(event.date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch {
      return '';
    }
  };

  const broadcastList = event.broadcasts?.map(b => b.name).join(', ') || event.broadcast || 'ESPN';

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
            {/* Fixed Header */}
            <View style={styles.modalHeader}>
              <View style={styles.espnBadgeLarge}>
                <Text style={styles.espnTextLarge}>ESPN</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={22} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Status Badge */}
              <View style={styles.modalStatusRow}>
                {isLive ? (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>AO VIVO</Text>
                  </View>
                ) : isFinished ? (
                  <View style={styles.finishedBadge}>
                    <Text style={styles.finishedText}>ENCERRADO</Text>
                  </View>
                ) : (
                  <View style={styles.scheduledBadge}>
                    <Clock size={14} color="#a1a1aa" />
                    <Text style={styles.scheduledText}>AGENDADO</Text>
                  </View>
                )}
              </View>

              {/* Teams Section */}
              <View style={styles.modalTeamsContainer}>
                {/* Home Team */}
                <View style={styles.modalTeamCol}>
                  {homeTeam?.logo ? (
                    <Image source={{ uri: homeTeam.logo }} style={styles.modalTeamLogo} />
                  ) : (
                    <View style={[styles.modalTeamLogoPlaceholder, { backgroundColor: homeTeam?.color ? `#${homeTeam.color}` : '#333' }]}>
                      <Text style={styles.modalTeamLogoText}>{homeTeam?.abbreviation?.[0] || 'H'}</Text>
                    </View>
                  )}
                  <Text style={styles.modalTeamName} numberOfLines={2}>
                    {homeTeam?.displayName || 'Home'}
                  </Text>
                  <Text style={styles.modalHomeLabel}>CASA</Text>
                </View>

                {/* Score */}
                <View style={styles.modalScoreContainer}>
                  {(isLive || isFinished) ? (
                    <>
                      <Text style={[styles.modalScore, homeTeam?.winner && styles.modalScoreWinner]}>
                        {homeTeam?.score || '0'}
                      </Text>
                      <Text style={styles.modalScoreSeparator}>-</Text>
                      <Text style={[styles.modalScore, awayTeam?.winner && styles.modalScoreWinner]}>
                        {awayTeam?.score || '0'}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.modalVsText}>VS</Text>
                  )}
                </View>

                {/* Away Team */}
                <View style={styles.modalTeamCol}>
                  {awayTeam?.logo ? (
                    <Image source={{ uri: awayTeam.logo }} style={styles.modalTeamLogo} />
                  ) : (
                    <View style={[styles.modalTeamLogoPlaceholder, { backgroundColor: awayTeam?.color ? `#${awayTeam.color}` : '#333' }]}>
                      <Text style={styles.modalTeamLogoText}>{awayTeam?.abbreviation?.[0] || 'A'}</Text>
                    </View>
                  )}
                  <Text style={styles.modalTeamName} numberOfLines={2}>
                    {awayTeam?.displayName || 'Away'}
                  </Text>
                  <Text style={styles.modalAwayLabel}>FORA</Text>
                </View>
              </View>

              {/* Details */}
              <View style={styles.modalDetailsContainer}>
                {/* League */}
                {event.league && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>🏆</Text>
                    <View style={styles.modalDetailContent}>
                      <Text style={styles.modalDetailLabel}>Competição</Text>
                      <Text style={styles.modalDetailValue}>{event.league.name}</Text>
                    </View>
                  </View>
                )}

                {/* Date */}
                <View style={styles.modalDetailRow}>
                  <Calendar size={18} color="#22c55e" />
                  <View style={styles.modalDetailContent}>
                    <Text style={styles.modalDetailLabel}>Data e Horário</Text>
                    <Text style={styles.modalDetailValue}>{formatFullDate()}</Text>
                  </View>
                </View>

                {/* Broadcast */}
                <View style={styles.modalDetailRow}>
                  <Tv size={18} color="#dc2626" />
                  <View style={styles.modalDetailContent}>
                    <Text style={styles.modalDetailLabel}>Onde Assistir</Text>
                    <Text style={styles.modalDetailValue}>{broadcastList}</Text>
                  </View>
                </View>

                {/* Sport */}
                {event.sport && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>⚽</Text>
                    <View style={styles.modalDetailContent}>
                      <Text style={styles.modalDetailLabel}>Esporte</Text>
                      <Text style={styles.modalDetailValue}>{event.sport.name}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Live Match Info Section */}
              {loadingLiveData ? (
                <View style={styles.liveDataLoading}>
                  <ActivityIndicator size="small" color="#22c55e" />
                  <Text style={styles.liveDataLoadingText}>Carregando detalhes...</Text>
                </View>
              ) : liveEventData && (isLive || isFinished) ? (
                <LiveMatchInfo event={liveEventData} />
              ) : null}

              {/* Close Button */}
              <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                <Text style={styles.modalCloseButtonText}>Fechar</Text>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
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
  espnBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  espnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
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
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  eventCard: {
    width: 180,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  broadcastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    maxWidth: 100,
  },
  channelBadgeLive: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  channelText: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '600',
    flexShrink: 1,
  },
  channelTextLive: {
    color: '#dc2626',
  },
  timeText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
  },
  timeTextLive: {
    color: '#dc2626',
  },
  teamsContainer: {
    gap: 8,
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
    resizeMode: 'contain',
  },
  teamLogoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamLogoText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  teamName: {
    flex: 1,
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '600',
  },
  scoreText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
  },
  scoreTextWinner: {
    color: '#22c55e',
  },
  leagueText: {
    color: '#52525b',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tapHint: {
    color: '#3f3f46',
    fontSize: 8,
    fontWeight: '500',
    marginTop: 6,
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
    maxHeight: '85%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  espnBadgeLarge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  espnTextLarge: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  modalStatusRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  liveText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '800',
  },
  finishedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  finishedText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '800',
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  scheduledText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
  },
  modalTeamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTeamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  modalTeamLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    resizeMode: 'contain',
  },
  modalTeamLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTeamLogoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalTeamName: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalHomeLabel: {
    color: '#22c55e',
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalAwayLabel: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalScore: {
    color: '#e4e4e7',
    fontSize: 32,
    fontWeight: '900',
  },
  modalScoreWinner: {
    color: '#22c55e',
  },
  modalScoreSeparator: {
    color: '#52525b',
    fontSize: 24,
    fontWeight: '700',
  },
  modalVsText: {
    color: '#52525b',
    fontSize: 20,
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
    alignItems: 'center',
    gap: 12,
  },
  modalDetailIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  modalDetailContent: {
    flex: 1,
  },
  modalDetailLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalDetailValue: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  modalCloseButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  liveDataLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    marginBottom: 16,
  },
  liveDataLoadingText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
  },
});
