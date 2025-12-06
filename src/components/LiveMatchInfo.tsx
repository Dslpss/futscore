import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EspnLiveEvent, EspnLiveCompetitor } from '../types';

interface LiveMatchInfoProps {
  event: EspnLiveEvent;
}

export const LiveMatchInfo: React.FC<LiveMatchInfoProps> = ({ event }) => {
  const homeTeam = event.competitors.find(c => c.homeAway === 'home');
  const awayTeam = event.competitors.find(c => c.homeAway === 'away');
  const isLive = event.status === 'in';

  // Get all scorers from both teams
  const getScorers = (competitor: EspnLiveCompetitor | undefined) => {
    if (!competitor?.scoringSummary) return [];
    return competitor.scoringSummary.map(s => ({
      name: s.athlete.shortName,
      goals: s.displayValue,
      team: competitor.abbreviation,
    }));
  };

  const allScorers = [
    ...getScorers(homeTeam),
    ...getScorers(awayTeam),
  ];

  // Get goalies
  const getGoalie = (competitor: EspnLiveCompetitor | undefined) => {
    if (!competitor?.goalieSummary?.[0]) return null;
    const goalie = competitor.goalieSummary[0];
    return {
      name: goalie.athlete.shortName,
      stats: goalie.displayValue,
      team: competitor.abbreviation,
    };
  };

  const homeGoalie = getGoalie(homeTeam);
  const awayGoalie = getGoalie(awayTeam);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.gradient}
      >
        {/* Last Play - Live Updates */}
        {isLive && event.situation?.lastPlay && (
          <View style={styles.lastPlaySection}>
            <View style={styles.lastPlayHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>ÚLTIMA JOGADA</Text>
              </View>
              <Text style={styles.clockText}>
                {event.situation.lastPlay.clock.displayValue}
              </Text>
            </View>
            <Text style={styles.lastPlayText}>
              {event.situation.lastPlay.text}
            </Text>
          </View>
        )}

        {/* Scorers Section */}
        {allScorers.length > 0 && (
          <View style={styles.scorersSection}>
            <Text style={styles.sectionTitle}>⚽ ARTILHEIROS</Text>
            <View style={styles.scorersList}>
              {allScorers.map((scorer, index) => (
                <View key={index} style={styles.scorerItem}>
                  <Text style={styles.scorerTeam}>{scorer.team}</Text>
                  <Text style={styles.scorerName}>{scorer.name}</Text>
                  <View style={styles.goalsTag}>
                    <Text style={styles.goalsText}>{scorer.goals}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Goalies Section */}
        {(homeGoalie || awayGoalie) && (
          <View style={styles.goaliesSection}>
            <Text style={styles.sectionTitle}>🧤 GOLEIROS</Text>
            <View style={styles.goaliesList}>
              {homeGoalie && (
                <View style={styles.goalieItem}>
                  <Text style={styles.goalieTeam}>{homeGoalie.team}</Text>
                  <Text style={styles.goalieName}>{homeGoalie.name}</Text>
                  <Text style={styles.goalieStats}>{homeGoalie.stats}</Text>
                </View>
              )}
              {awayGoalie && (
                <View style={styles.goalieItem}>
                  <Text style={styles.goalieTeam}>{awayGoalie.team}</Text>
                  <Text style={styles.goalieName}>{awayGoalie.name}</Text>
                  <Text style={styles.goalieStats}>{awayGoalie.stats}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Match finished message */}
        {event.status === 'post' && allScorers.length === 0 && (
          <View style={styles.noDataSection}>
            <Text style={styles.noDataText}>Partida finalizada</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  gradient: {
    padding: 16,
  },
  lastPlaySection: {
    marginBottom: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  lastPlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  clockText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },
  lastPlayText: {
    fontSize: 13,
    color: '#e4e4e7',
    lineHeight: 18,
  },
  scorersSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#71717a',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  scorersList: {
    gap: 8,
  },
  scorerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  scorerTeam: {
    fontSize: 10,
    fontWeight: '700',
    color: '#71717a',
    width: 36,
  },
  scorerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  goalsTag: {
    backgroundColor: '#22c55e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goalsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  goaliesSection: {
    marginTop: 4,
  },
  goaliesList: {
    gap: 8,
  },
  goalieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  goalieTeam: {
    fontSize: 10,
    fontWeight: '700',
    color: '#71717a',
    width: 36,
  },
  goalieName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  goalieStats: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  noDataSection: {
    alignItems: 'center',
    padding: 16,
  },
  noDataText: {
    fontSize: 13,
    color: '#71717a',
    fontStyle: 'italic',
  },
});
