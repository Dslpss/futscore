import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Image, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { Match } from '../types';
import { api } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';

interface MatchStatsModalProps {
  visible: boolean;
  onClose: () => void;
  match: Match | null;
}

const { width } = Dimensions.get('window');

export const MatchStatsModal: React.FC<MatchStatsModalProps> = ({ visible, onClose, match: initialMatch }) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'lineups' | 'goals'>('stats');
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    if (visible && initialMatch) {
      loadMatchDetails();
    } else {
        setMatch(null);
    }
  }, [visible, initialMatch]);

  const loadMatchDetails = async () => {
    if (!initialMatch) return;
    
    setLoading(true);
    try {
      const leagueId = initialMatch.league.id?.toString() || '';
      
      // Check if this is an MSN Sports match
      const isMsnMatch = leagueId.includes('Soccer_') || leagueId.includes('Basketball_');
      
      if (isMsnMatch) {
        // For MSN matches, fetch lineups and statistics
        console.log('[MatchStatsModal] MSN Sports match detected, fetching data...');
        
        let enhancedMatch = { ...initialMatch };
        
        try {
          const { msnSportsApi } = await import('../services/msnSportsApi');
          
          // Fetch lineups
          const { transformMsnLineupsToLineups } = await import('../utils/msnLineupsTransformer');
          const gameId = initialMatch.fixture.msnGameId || initialMatch.fixture.id.toString();
          const msnLineupsData = await msnSportsApi.getLineups(gameId);
          
          if (msnLineupsData && msnLineupsData.lineups) {
            const lineups = transformMsnLineupsToLineups(msnLineupsData);
            enhancedMatch.lineups = lineups;
            console.log(`[MatchStatsModal] Fetched ${lineups.length} lineups from MSN`);
          }
          
          // Fetch statistics
          const { transformMsnStatsToStatistics } = await import('../utils/msnStatsTransformer');
          const sport = leagueId.includes('Basketball') ? 'Basketball' : 'Soccer';
          
          // Extract clean league ID (remove SportRadar_ prefix and _2025 suffix)
          // From: SportRadar_Soccer_SpainLaLiga_2025 -> Soccer_SpainLaLiga
          const cleanLeagueId = leagueId
            .replace(/^SportRadar_/, '')  // Remove SportRadar_ prefix
            .replace(/_\d{4}$/, '');       // Remove _2025 suffix
          
          console.log(`[MatchStatsModal] Clean LeagueId: ${cleanLeagueId}`);
          
          const msnStatsData = await msnSportsApi.getStatistics(
            gameId,
            sport,
            cleanLeagueId
          );
          
          if (msnStatsData && msnStatsData.statistics) {
            const homeTeamId = `SportRadar_${leagueId}_${new Date().getFullYear()}_Team_${initialMatch.teams.home.id}`;
            const awayTeamId = `SportRadar_${leagueId}_${new Date().getFullYear()}_Team_${initialMatch.teams.away.id}`;
            
            // Try with full IDs first, if not found, try with just the numeric ID
            let statistics = transformMsnStatsToStatistics(msnStatsData, homeTeamId, awayTeamId);
            
            if (statistics.length === 0) {
              // Try finding by partial match on teamId
              const homeStats = msnStatsData.statistics.find((s: any) => 
                s.teamId && s.teamId.includes(`_${initialMatch.teams.home.id}`)
              );
              const awayStats = msnStatsData.statistics.find((s: any) => 
                s.teamId && s.teamId.includes(`_${initialMatch.teams.away.id}`)
              );
              
              if (homeStats && awayStats) {
                statistics = transformMsnStatsToStatistics(msnStatsData, homeStats.teamId, awayStats.teamId);
              }
            }
            
            if (statistics.length > 0) {
              enhancedMatch.statistics = statistics;
              console.log(`[MatchStatsModal] Fetched ${statistics.length} statistics from MSN`);
            }
          }
          
          // Fetch timeline (goals, events)
          const { transformMsnTimelineToGoals } = await import('../utils/msnTimelineTransformer');
          const msnTimelineData = await msnSportsApi.getTimeline(gameId, sport);
          
          if (msnTimelineData) {
            const goalEvents = transformMsnTimelineToGoals(msnTimelineData);
            setGoals(goalEvents);
            console.log(`[MatchStatsModal] Fetched ${goalEvents.length} goal events from MSN`);
          }
          
        } catch (error) {
          console.error('[MatchStatsModal] Error fetching MSN data:', error);
        }
        
        setMatch(enhancedMatch);
      } else {
        // For football-data.org matches, fetch full details including stats and lineups
        console.log('[MatchStatsModal] Football-data match, fetching full details...');
        const data = await api.getMatchDetails(initialMatch.fixture.id);
        setMatch(data || initialMatch);
      }
    } catch (error) {
      console.error('[MatchStatsModal] Error loading match details:', error);
      // Fallback to initial match data
      setMatch(initialMatch);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.modalView}>
            {/* Header with Close Button */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Detalhes da Partida</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <X color="#fff" size={24} />
                </TouchableOpacity>
            </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#22c55e" />
            </View>
          ) : match ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              
              {/* Scoreboard */}
              <LinearGradient
                colors={['#1c1c1e', '#121212']}
                style={styles.scoreCard}
              >
                  <View style={styles.leagueInfo}>
                      <Image source={{ uri: match.league.logo }} style={styles.leagueLogo} />
                      <Text style={styles.leagueName}>{match.league.name}</Text>
                  </View>

                  <View style={styles.teamsContainer}>
                      <View style={styles.team}>
                          <Image source={{ uri: match.teams.home.logo }} style={styles.teamLogo} />
                          <Text style={styles.teamName}>{match.teams.home.name}</Text>
                      </View>
                      
                      <View style={styles.scoreContainer}>
                          <Text style={styles.score}>
                              {match.goals.home ?? 0} : {match.goals.away ?? 0}
                          </Text>
                          <Text style={styles.status}>{match.fixture.status.long}</Text>
                          {match.fixture.status.elapsed && (
                              <Text style={styles.time}>{match.fixture.status.elapsed}'</Text>
                          )}
                      </View>

                      <View style={styles.team}>
                          <Image source={{ uri: match.teams.away.logo }} style={styles.teamLogo} />
                          <Text style={styles.teamName}>{match.teams.away.name}</Text>
                      </View>
                  </View>
                  
                  
                  {match.fixture.venue && match.fixture.venue.name && match.fixture.venue.name !== 'Estádio não informado' && (
                      <Text style={styles.venue}>
                          🏟️ {match.fixture.venue.name}{match.fixture.venue.city ? ', ' + match.fixture.venue.city : ''}
                      </Text>
                  )}
              </LinearGradient>

              {/* Probabilities (if available from MSN Sports) */}
              {match.probabilities && (
                <View style={styles.probabilitiesCard}>
                  <Text style={styles.probabilitiesTitle}>Probabilidades de Vitória</Text>
                  <View style={styles.probabilitiesContainer}>
                    <View style={styles.probabilityItem}>
                      <Text style={styles.probabilityLabel}>{match.teams.home.name}</Text>
                      <View style={styles.probabilityBarContainer}>
                        <View style={[styles.probabilityBar, styles.homeBar, { width: `${match.probabilities.home}%` }]} />
                      </View>
                      <Text style={styles.probabilityValue}>{match.probabilities.home.toFixed(1)}%</Text>
                    </View>
                    
                    <View style={styles.probabilityItem}>
                      <Text style={styles.probabilityLabel}>Empate</Text>
                      <View style={styles.probabilityBarContainer}>
                        <View style={[styles.probabilityBar, styles.drawBar, { width: `${match.probabilities.draw}%` }]} />
                      </View>
                      <Text style={styles.probabilityValue}>{match.probabilities.draw.toFixed(1)}%</Text>
                    </View>
                    
                    <View style={styles.probabilityItem}>
                      <Text style={styles.probabilityLabel}>{match.teams.away.name}</Text>
                      <View style={styles.probabilityBarContainer}>
                        <View style={[styles.probabilityBar, styles.awayBar, { width: `${match.probabilities.away}%` }]} />
                      </View>
                      <Text style={styles.probabilityValue}>{match.probabilities.away.toFixed(1)}%</Text>
                    </View>
                  </View>
                  <Text style={styles.probabilitySource}>Fonte: SportRadar</Text>
                </View>
              )}

              {/* Tabs */}
              <View style={styles.tabContainer}>
                  <TouchableOpacity 
                      style={[styles.tabButton, activeTab === 'stats' && styles.activeTabButton]}
                      onPress={() => setActiveTab('stats')}
                  >
                      <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>Estatísticas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                      style={[styles.tabButton, activeTab === 'goals' && styles.activeTabButton]}
                      onPress={() => setActiveTab('goals')}
                  >
                      <Text style={[styles.tabText, activeTab === 'goals' && styles.activeTabText]}>Gols</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                      style={[styles.tabButton, activeTab === 'lineups' && styles.activeTabButton]}
                      onPress={() => setActiveTab('lineups')}
                  >
                      <Text style={[styles.tabText, activeTab === 'lineups' && styles.activeTabText]}>Escalações</Text>
                  </TouchableOpacity>
              </View>

              {activeTab === 'stats' ? (
                  /* Statistics */
                  match.statistics && match.statistics.length > 0 ? (
                      <View style={styles.statsContainer}>
                          <Text style={styles.sectionTitle}>Estatísticas</Text>
                          {match.statistics[0].statistics.map((stat, index) => {
                              const homeValue = stat.value ?? 0;
                              const awayValue = match.statistics?.[1].statistics[index].value ?? 0;
                              
                              // Calculate percentages for bar
                              const total = (typeof homeValue === 'number' ? homeValue : 0) + (typeof awayValue === 'number' ? awayValue : 0);
                              const homePercent = total === 0 ? 50 : ((typeof homeValue === 'number' ? homeValue : 0) / total) * 100;
                              const awayPercent = total === 0 ? 50 : ((typeof awayValue === 'number' ? awayValue : 0) / total) * 100;

                              return (
                                  <View key={index} style={styles.statRow}>
                                      <View style={styles.statValues}>
                                          <Text style={styles.statValue}>{homeValue}</Text>
                                          <Text style={styles.statLabel}>{stat.type}</Text>
                                          <Text style={styles.statValue}>{awayValue}</Text>
                                      </View>
                                      <View style={styles.statBarContainer}>
                                          <View style={[styles.statBar, { width: `${homePercent}%`, backgroundColor: '#22c55e', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
                                          <View style={[styles.statBar, { width: `${awayPercent}%`, backgroundColor: '#ef4444', borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
                                      </View>
                                  </View>
                              );
                          })}
                      </View>
                  ) : (
                      <View style={styles.noStatsContainer}>
                          <Text style={styles.noStatsText}>Estatísticas não disponíveis para este jogo.</Text>
                      </View>
                  )
              ) : activeTab === 'goals' ? (
                  /* Goals Tab */
                  <View style={styles.statsContainer}>
                    {goals && goals.length > 0 ? (
                      <>
                        <Text style={styles.sectionTitle}>Gols da Partida</Text>
                        {goals.map((goal, index) => (
                          <View key={index} style={styles.goalCard}>
                            <View style={styles.goalHeader}>
                              <Text style={styles.goalMinute}>{goal.minute}'</Text>
                              <Text style={styles.goalIcon}>⚽</Text>
                            </View>
                            <Text style={styles.goalPlayer}>
                              {goal.player.number}. {goal.player.name}
                            </Text>
                            {goal.assist && (
                              <Text style={styles.goalAssist}>
                                Assistência: {goal.assist.number}. {goal.assist.name}
                              </Text>
                            )}
                            <Text style={styles.goalDescription}>{goal.description}</Text>
                          </View>
                        ))}
                      </>
                    ) : (
                      <View style={styles.noStatsContainer}>
                        <Text style={styles.noStatsText}>Nenhum gol marcado nesta partida</Text>
                      </View>
                    )}
                  </View>
              ) : (
                  /* Lineups */
                  match.lineups && match.lineups.length > 0 ? (
                      <View style={styles.lineupsContainer}>
                          {/* Home Team Lineup */}
                          <View style={styles.teamLineup}>
                              <View style={styles.lineupHeader}>
                                  <Image source={{ uri: match.teams.home.logo }} style={styles.smallTeamLogo} />
                                  <Text style={styles.lineupTeamName}>{match.teams.home.name}</Text>
                                  <Text style={styles.formation}>{match.lineups[0].formation}</Text>
                              </View>
                              
                              <Text style={styles.lineupSectionTitle}>Titulares</Text>
                              {match.lineups[0].startXI.map((player) => (
                                  <View key={player.id} style={styles.playerRow}>
                                      <Text style={styles.playerNumber}>{player.number}</Text>
                                      <Text style={styles.playerName}>{player.name}</Text>
                                      <Text style={styles.playerPosition}>{player.pos}</Text>
                                  </View>
                              ))}

                              <Text style={styles.lineupSectionTitle}>Reservas</Text>
                              {match.lineups[0].substitutes.map((player) => (
                                  <View key={player.id} style={styles.playerRow}>
                                      <Text style={styles.playerNumber}>{player.number}</Text>
                                      <Text style={styles.playerName}>{player.name}</Text>
                                      <Text style={styles.playerPosition}>{player.pos}</Text>
                                  </View>
                              ))}
                              
                              <View style={styles.coachContainer}>
                                  <Text style={styles.coachLabel}>Técnico:</Text>
                                  <Text style={styles.coachName}>{match.lineups[0].coach.name}</Text>
                              </View>
                          </View>

                          {/* Divider */}
                          <View style={styles.lineupDivider} />

                          {/* Away Team Lineup */}
                          <View style={styles.teamLineup}>
                              <View style={styles.lineupHeader}>
                                  <Image source={{ uri: match.teams.away.logo }} style={styles.smallTeamLogo} />
                                  <Text style={styles.lineupTeamName}>{match.teams.away.name}</Text>
                                  <Text style={styles.formation}>{match.lineups[1].formation}</Text>
                              </View>

                              <Text style={styles.lineupSectionTitle}>Titulares</Text>
                              {match.lineups[1].startXI.map((player) => (
                                  <View key={player.id} style={styles.playerRow}>
                                      <Text style={styles.playerNumber}>{player.number}</Text>
                                      <Text style={styles.playerName}>{player.name}</Text>
                                      <Text style={styles.playerPosition}>{player.pos}</Text>
                                  </View>
                              ))}

                              <Text style={styles.lineupSectionTitle}>Reservas</Text>
                              {match.lineups[1].substitutes.map((player) => (
                                  <View key={player.id} style={styles.playerRow}>
                                      <Text style={styles.playerNumber}>{player.number}</Text>
                                      <Text style={styles.playerName}>{player.name}</Text>
                                      <Text style={styles.playerPosition}>{player.pos}</Text>
                                  </View>
                              ))}

                               <View style={styles.coachContainer}>
                                  <Text style={styles.coachLabel}>Técnico:</Text>
                                  <Text style={styles.coachName}>{match.lineups[1].coach.name}</Text>
                              </View>
                          </View>
                      </View>
                  ) : (
                      <View style={styles.noStatsContainer}>
                          <Text style={styles.noStatsText}>Escalações não disponíveis para este jogo.</Text>
                      </View>
                  )
              )}

            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Não foi possível carregar os detalhes.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: '#09090b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    paddingTop: 20,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 20,
  },
  headerTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
  },
  closeButton: {
      padding: 8,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 20,
  },
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  content: {
      paddingBottom: 40,
  },
  scoreCard: {
      margin: 20,
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  leagueInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
  },
  leagueLogo: {
      width: 20,
      height: 20,
      marginRight: 8,
      resizeMode: 'contain',
  },
  leagueName: {
      color: '#a1a1aa',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
  },
  teamsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  team: {
      alignItems: 'center',
      flex: 1,
  },
  teamLogo: {
      width: 60,
      height: 60,
      marginBottom: 8,
      resizeMode: 'contain',
  },
  teamName: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
  },
  scoreContainer: {
      alignItems: 'center',
      width: 100,
  },
  score: {
      color: '#fff',
      fontSize: 36,
      fontWeight: '800',
      marginBottom: 4,
  },
  status: {
      color: '#22c55e',
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 4,
  },
  time: {
      color: '#e4e4e7',
      fontSize: 12,
      fontWeight: '600',
  },
  venue: {
      color: '#71717a',
      fontSize: 11,
      textAlign: 'center',
      marginTop: 16,
  },
  statsContainer: {
      padding: 20,
  },
  sectionTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 16,
  },
  statRow: {
      marginBottom: 16,
  },
  statValues: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  statValue: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
      width: 40,
      textAlign: 'center',
  },
  statLabel: {
      color: '#a1a1aa',
      fontSize: 12,
      fontWeight: '500',
      textTransform: 'uppercase',
  },
  statBarContainer: {
      flexDirection: 'row',
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 4,
      overflow: 'hidden',
  },
  statBar: {
      height: '100%',
  },
  noStatsContainer: {
      padding: 40,
      alignItems: 'center',
  },
  noStatsText: {
      color: '#71717a',
      fontSize: 14,
  },
  errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  errorText: {
      color: '#ef4444',
      fontSize: 16,
  },
  tabContainer: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 20,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      padding: 4,
  },
  tabButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
  },
  activeTabButton: {
      backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabText: {
      color: '#71717a',
      fontSize: 14,
      fontWeight: '600',
  },
  activeTabText: {
      color: '#fff',
  },
  lineupsContainer: {
      paddingHorizontal: 20,
  },
  teamLineup: {
      marginBottom: 24,
  },
  lineupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: 'rgba(255,255,255,0.03)',
      padding: 12,
      borderRadius: 12,
  },
  smallTeamLogo: {
      width: 24,
      height: 24,
      marginRight: 10,
      resizeMode: 'contain',
  },
  lineupTeamName: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
  },
  formation: {
      color: '#a1a1aa',
      fontSize: 14,
      fontWeight: '600',
  },
  lineupSectionTitle: {
      color: '#22c55e',
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 12,
      marginTop: 8,
  },
  playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  playerNumber: {
      color: '#a1a1aa',
      fontSize: 14,
      fontWeight: '700',
      width: 30,
  },
  playerName: {
      color: '#fff',
      fontSize: 14,
      flex: 1,
  },
  playerPosition: {
      color: '#71717a',
      fontSize: 12,
      fontWeight: '600',
      width: 30,
      textAlign: 'right',
  },
  lineupDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginVertical: 24,
  },
  coachContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
  },
  coachLabel: {
      color: '#a1a1aa',
      fontSize: 14,
      marginRight: 8,
  },
  coachName: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
  },
  probabilitiesCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  probabilitiesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  probabilitiesContainer: {
    gap: 12,
  },
  probabilityItem: {
    gap: 6,
  },
  probabilityLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  probabilityBarContainer: {
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  probabilityBar: {
    height: '100%',
    borderRadius: 12,
  },
  homeBar: {
    backgroundColor: '#22c55e',
  },
  drawBar: {
    backgroundColor: '#f59e0b',
  },
  awayBar: {
    backgroundColor: '#ef4444',
  },
  probabilityValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  probabilitySource: {
    color: '#71717a',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  goalCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  goalMinute: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '800',
  },
  goalIcon: {
    fontSize: 20,
  },
  goalPlayer: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalAssist: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 8,
  },
  goalDescription: {
    color: '#71717a',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
