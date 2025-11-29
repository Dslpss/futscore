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
  matchId: number;
}

const { width } = Dimensions.get('window');

export const MatchStatsModal: React.FC<MatchStatsModalProps> = ({ visible, onClose, matchId }) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && matchId) {
      loadMatchDetails();
    } else {
        setMatch(null);
    }
  }, [visible, matchId]);

  const loadMatchDetails = async () => {
    setLoading(true);
    const data = await api.getMatchDetails(matchId);
    setMatch(data);
    setLoading(false);
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
                  
                  {match.fixture.venue && (
                      <Text style={styles.venue}>🏟️ {match.fixture.venue.name}, {match.fixture.venue.city}</Text>
                  )}
              </LinearGradient>

              {/* Statistics */}
              {match.statistics && match.statistics.length > 0 ? (
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
});
