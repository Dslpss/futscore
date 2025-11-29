import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Match } from '../types';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import { useFavorites } from '../context/FavoritesContext';
import { MatchStatsModal } from './MatchStatsModal';

interface MatchCardProps {
  match: Match;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const isLive = match.fixture.status.short === '1H' || match.fixture.status.short === '2H' || match.fixture.status.short === 'HT';
  const { isFavoriteTeam, toggleFavoriteTeam } = useFavorites();
  const [modalVisible, setModalVisible] = React.useState(false);
  
  const isHomeFavorite = isFavoriteTeam(match.teams.home.id);
  const isAwayFavorite = isFavoriteTeam(match.teams.away.id);

  return (
    <>
      <TouchableOpacity 
        style={styles.container} 
        activeOpacity={0.9}
        onPress={() => setModalVisible(true)}
      >
        <LinearGradient
          colors={['#1c1c1e', '#121212']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Header: League & Status */}
          <View style={styles.header}>
            <View style={styles.leagueContainer}>
                <Image source={{ uri: match.league.logo }} style={styles.leagueLogo} />
                <Text style={styles.league}>{match.league.name}</Text>
            </View>
            {isLive ? (
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>AO VIVO • {match.fixture.status.elapsed}'</Text>
                </View>
            ) : (
                <View style={styles.timeContainer}>
                  <Text style={styles.status}>{format(new Date(match.fixture.date), 'HH:mm')}</Text>
                </View>
            )}
          </View>
          
          {/* Match Content */}
          <View style={styles.matchContent}>
            {/* Home Team */}
            <View style={styles.teamContainer}>
              <TouchableOpacity onPress={() => toggleFavoriteTeam(match.teams.home.id)} style={styles.favoriteButton}>
                 <Star size={16} color={isHomeFavorite ? "#FBBF24" : "rgba(255,255,255,0.2)"} fill={isHomeFavorite ? "#FBBF24" : "transparent"} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Image source={{ uri: match.teams.home.logo }} style={styles.teamLogo} />
              </View>
              <Text style={styles.teamName} numberOfLines={2}>{match.teams.home.name}</Text>
            </View>

            {/* Score / VS */}
            <View style={styles.scoreContainer}>
              {['NS', 'TBD', 'TIMED', 'PST', 'CANC', 'ABD', 'WO'].includes(match.fixture.status.short) ? (
                 <Text style={styles.vsText}>VS</Text>
              ) : (
                <View style={styles.scoreBoard}>
                  <Text style={[styles.score, isLive && styles.liveScore]}>
                    {match.goals.home ?? 0}
                  </Text>
                  <Text style={[styles.scoreDivider, isLive && styles.liveScore]}>:</Text>
                  <Text style={[styles.score, isLive && styles.liveScore]}>
                    {match.goals.away ?? 0}
                  </Text>
                </View>
              )}
              <Text style={styles.statusText}>{match.fixture.status.long}</Text>
            </View>

            {/* Away Team */}
            <View style={styles.teamContainer}>
              <TouchableOpacity onPress={() => toggleFavoriteTeam(match.teams.away.id)} style={styles.favoriteButton}>
                 <Star size={16} color={isAwayFavorite ? "#FBBF24" : "rgba(255,255,255,0.2)"} fill={isAwayFavorite ? "#FBBF24" : "transparent"} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Image source={{ uri: match.teams.away.logo }} style={styles.teamLogo} />
              </View>
              <Text style={styles.teamName} numberOfLines={2}>{match.teams.away.name}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <MatchStatsModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        matchId={match.fixture.id} 
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  leagueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  leagueLogo: {
      width: 24,
      height: 24,
      resizeMode: 'contain',
      marginRight: 10,
  },
  league: {
    color: '#a1a1aa',
    fontSize: 10, // Reduced from 13
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  timeContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 6,
    borderRadius: 8,
    width: 80, // Fixed width
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  status: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center', // Ensure text is centered
    width: '100%', // Ensure text takes full width of container
  },
  liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#22c55e',
      marginRight: 6,
  },
  liveText: {
      color: '#22c55e',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
  },
  matchContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align to top to handle long names
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: -10,
    right: 10,
    zIndex: 20,
    padding: 4,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  teamLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  teamName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 100,
  },
  scoreContainer: {
    alignItems: 'center',
    width: 100, // Increased from 80
    paddingTop: 10,
    zIndex: 10,
  },
  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  score: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  scoreDivider: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 24,
    fontWeight: '300',
    marginHorizontal: 4,
    marginTop: -4,
  },
  liveScore: {
      color: '#22c55e',
      textShadowColor: 'rgba(34, 197, 94, 0.5)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
  },
  vsText: {
    color: '#52525b',
    fontSize: 20,
    fontWeight: '900',
    // fontStyle: 'italic', // Removed to prevent clipping
    marginBottom: 4,
    paddingHorizontal: 10, // Added padding
    textAlign: 'center',
  },
  statusText: {
      color: '#71717a',
      fontSize: 11,
      fontWeight: '500',
      textTransform: 'uppercase',
      textAlign: 'center',
  },
});
