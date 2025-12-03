import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Plane } from 'lucide-react-native';
import { Match } from '../types';

interface NextMatchWidgetProps {
  matches: Array<{ teamId: number; match: Match }>;
  onPressMatch?: (match: Match) => void;
}

export const NextMatchWidget: React.FC<NextMatchWidgetProps> = ({ matches, onPressMatch }) => {
  if (!matches || matches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.05)', 'rgba(34, 197, 94, 0.02)']}
          style={styles.emptyGradient}
        >
          <Text style={styles.emptyIcon}>⚽</Text>
          <Text style={styles.emptyText}>Adicione times favoritos</Text>
          <Text style={styles.emptySubText}>para ver os próximos jogos</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.widgetContainer}>
      <View style={styles.widgetHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.headerTitle}>PRÓXIMOS JOGOS</Text>
        </View>
        <Text style={styles.matchCount}>{matches.length} {matches.length === 1 ? 'jogo' : 'jogos'}</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {matches.map(({ teamId, match }) => (
          <MatchCard key={match.fixture.id} match={match} onPress={() => onPressMatch?.(match)} />
        ))}
      </ScrollView>
    </View>
  );
};

// Individual Match Card Component
const MatchCard: React.FC<{ match: Match; onPress: () => void }> = ({ match, onPress }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const matchTime = new Date(match.fixture.date).getTime();
      const difference = matchTime - now;

      if (difference <= 0) {
        setTimeRemaining('Ao Vivo!');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [match]);

  const matchDate = new Date(match.fixture.date);
  const formattedDate = matchDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  const formattedTime = matchDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f1419']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.leagueBadge}>
            <Text style={styles.leagueText}>{match.league.name}</Text>
          </View>
        </View>

        {/* Teams Section */}
        <View style={styles.teamsContainer}>
          {/* Home Team */}
          <View style={styles.teamSection}>
            <View style={styles.teamLogoContainer}>
              <Image
                source={{ uri: match.teams.home.logo }}
                style={styles.teamLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.teamName} numberOfLines={1}>
              {match.teams.home.name}
            </Text>
            <View style={styles.homeBadge}>
              <Home size={8} color="#22c55e" />
              <Text style={styles.homeBadgeText}>Casa</Text>
            </View>
          </View>

          {/* VS Divider */}
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Away Team */}
          <View style={styles.teamSection}>
            <View style={styles.teamLogoContainer}>
              <Image
                source={{ uri: match.teams.away.logo }}
                style={styles.teamLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.teamName} numberOfLines={1}>
              {match.teams.away.name}
            </Text>
            <View style={styles.awayBadge}>
              <Plane size={8} color="#f59e0b" />
              <Text style={styles.awayBadgeText}>Fora</Text>
            </View>
          </View>
        </View>

        {/* Countdown & Date */}
        <View style={styles.footer}>
          <View style={styles.countdownContainer}>
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.1)']}
              style={styles.countdownGradient}
            >
              <Text style={styles.countdownIcon}>⏱️</Text>
              <Text style={styles.countdownText}>{timeRemaining}</Text>
            </LinearGradient>
          </View>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.dateText}>{formattedDate} • {formattedTime}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Widget Container
  widgetContainer: {
    marginBottom: 20,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  matchCount: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    gap: 12,
  },

  // Individual Card
  container: {
    width: 280,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  gradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 20,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  headerTitle: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  leagueBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  leagueText: {
    color: '#e4e4e7',
    fontSize: 10,
    fontWeight: '600',
  },

  // Teams
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  teamLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  teamLogo: {
    width: 40,
    height: 40,
  },
  teamName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  homeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  homeBadgeText: {
    color: '#22c55e',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  awayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  awayBadgeText: {
    color: '#f59e0b',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // VS
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  countdownContainer: {
    flex: 1,
  },
  countdownGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  countdownIcon: {
    fontSize: 14,
  },
  countdownText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateTimeContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '500',
  },
});
