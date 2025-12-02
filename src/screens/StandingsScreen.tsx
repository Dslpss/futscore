import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { msnSportsApi } from '../services/msnSportsApi';
import { transformMsnStandings, StandingTeam } from '../utils/msnStandingsTransformer';
import { LEAGUES } from '../constants/leagues';

interface StandingsScreenProps {
  navigation: any;
  route: any;
}

export const StandingsScreen: React.FC<StandingsScreenProps> = ({ navigation, route }) => {
  const [standings, setStandings] = useState<StandingTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(route.params?.leagueId || 'Soccer_EnglandPremierLeague');

  const loadStandings = async () => {
    try {
      const data = await msnSportsApi.getStandings(selectedLeague);
      if (data && data.standings) {
        const transformed = transformMsnStandings(data);
        setStandings(transformed);
      } else {
        setStandings([]);
      }
    } catch (error) {
      console.error('[StandingsScreen] Error loading standings:', error);
      setStandings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStandings();
  }, [selectedLeague]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStandings();
  };

  const getPositionColor = (position: number) => {
    // Champions League spots (top 4 for most leagues)
    if (position <= 4) return '#22c55e';
    // Europa League spots
    if (position <= 6) return '#3b82f6';
    // Relegation zone (bottom 3)
    if (position >= standings.length - 2) return '#ef4444';
    return 'transparent';
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Classificação</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* League Selector */}
      <View style={styles.leagueSelectorContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leagueSelectorContent}
        >
          {LEAGUES.map((league) => (
            <TouchableOpacity
              key={league.id}
              style={[
                styles.leagueItem,
                selectedLeague === league.id && styles.leagueItemActive
              ]}
              onPress={() => {
                setLoading(true);
                setSelectedLeague(league.id);
              }}
            >
              <Image source={{ uri: league.logo }} style={styles.leagueSelectorLogo} />
              <Text style={[
                styles.leagueSelectorName,
                selectedLeague === league.id && styles.leagueSelectorNameActive
              ]}>
                {league.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : standings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Classificação indisponível</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
          }
        >
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.positionCell]}>#</Text>
            <Text style={[styles.headerCell, { flex: 1, textAlign: 'left' }]}>TIME</Text>
            <Text style={[styles.headerCell, styles.statCell]}>J</Text>
            <Text style={[styles.headerCell, styles.statCell]}>V</Text>
            <Text style={[styles.headerCell, styles.statCell]}>E</Text>
            <Text style={[styles.headerCell, styles.statCell]}>D</Text>
            <Text style={[styles.headerCell, styles.statCell]}>SG</Text>
            <Text style={[styles.headerCell, styles.pointsCell]}>PTS</Text>
          </View>

          {/* Standings */}
          {standings.map((team, index) => (
            <View key={team.team.id || index} style={styles.row}>
              <View style={[styles.positionIndicator, { backgroundColor: getPositionColor(team.position) }]} />
              <Text style={[styles.cell, styles.positionCell]}>{team.position}</Text>
              <View style={[styles.teamCellContainer]}>
                <Image source={{ uri: team.team.logo }} style={styles.teamLogo} />
                <Text style={styles.teamName} numberOfLines={1}>
                  {team.team.shortName || team.team.name}
                </Text>
              </View>
              <Text style={[styles.cell, styles.statCell]}>{team.played}</Text>
              <Text style={[styles.cell, styles.statCell]}>{team.won}</Text>
              <Text style={[styles.cell, styles.statCell]}>{team.draw}</Text>
              <Text style={[styles.cell, styles.statCell]}>{team.lost}</Text>
              <Text style={[styles.cell, styles.statCell, team.goalDifference > 0 && styles.positiveGD]}>
                {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
              </Text>
              <Text style={[styles.cell, styles.pointsCell, styles.pointsText]}>{team.points}</Text>
            </View>
          ))}

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.legendText}>Champions League</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.legendText}>Europa League</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>Rebaixamento</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  placeholder: {
    width: 40,
  },
  leagueSelectorContainer: {
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  leagueSelectorContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  leagueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  leagueItemActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22c55e',
  },
  leagueSelectorLogo: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  leagueSelectorName: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  leagueSelectorNameActive: {
    color: '#22c55e',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerCell: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  positionIndicator: {
    width: 3,
    height: '100%',
    position: 'absolute',
    left: 0,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  cell: {
    color: '#e4e4e7',
    fontSize: 13,
    textAlign: 'center',
  },
  positionCell: {
    width: 32,
    fontWeight: '700',
  },
  teamCellContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  teamName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  statCell: {
    width: 28,
  },
  pointsCell: {
    width: 36,
  },
  pointsText: {
    fontWeight: '800',
    color: '#22c55e',
  },
  positiveGD: {
    color: '#22c55e',
  },
  legend: {
    padding: 20,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    color: '#a1a1aa',
    fontSize: 13,
  },
});
