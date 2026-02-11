import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { User } from 'lucide-react-native';
import { MatchTopPlayers, MatchLeagueStats } from '../../../types';

interface PlayersTabProps {
  topPlayers: MatchTopPlayers | null;
  playerLeagueStats: MatchLeagueStats | null;
  homeTeamName: string;
  awayTeamName: string;
}

export const PlayersTab: React.FC<PlayersTabProps> = ({ 
  topPlayers, 
  playerLeagueStats, 
  homeTeamName, 
  awayTeamName 
}) => {
  
  if (!topPlayers) {
    return (
      <View style={styles.noStatsContainer}>
        <Text style={styles.noStatsText}>
          Destaques não disponíveis.
        </Text>
      </View>
    );
  }

  const getPlayerGoalsRank = (playerName: string, teamSide: 'home' | 'away'): number | undefined => {
    if (!playerLeagueStats) return undefined;
    
    const teamStats = teamSide === 'home' ? playerLeagueStats.home : playerLeagueStats.away;
    const player = teamStats.players.find(
      (p) => playerName.toLowerCase().includes(p.lastName.toLowerCase()) ||
             p.name.toLowerCase().includes(playerName.toLowerCase().split(' ').pop() || '')
    );
    
    return player?.goalsScoredRank;
  };

  return (
    <View style={styles.playersContainer}>
        <Text style={styles.sectionTitle}>Destaques do Jogo</Text>
        
        {/* Team Stats Summary */}
        {playerLeagueStats && (
        <View style={styles.teamStatsSummary}>
            <Text style={styles.comparisonTitle}>📊 Temporada</Text>
            <View style={styles.teamStatsGrid}>
            <View style={styles.teamStatsColumn}>
                <Text style={styles.teamStatsValue}>{playerLeagueStats.home.totalGoals}</Text>
                <Text style={styles.teamStatsLabel}>Gols</Text>
            </View>
            <View style={styles.teamStatsColumn}>
                <Text style={styles.teamStatsValue}>{playerLeagueStats.home.totalAssists}</Text>
                <Text style={styles.teamStatsLabel}>Assist.</Text>
            </View>
            <View style={styles.teamStatsDivider}>
                <Text style={styles.teamStatsVs}>vs</Text>
            </View>
            <View style={styles.teamStatsColumn}>
                <Text style={styles.teamStatsValue}>{playerLeagueStats.away.totalGoals}</Text>
                <Text style={styles.teamStatsLabel}>Gols</Text>
            </View>
            <View style={styles.teamStatsColumn}>
                <Text style={styles.teamStatsValue}>{playerLeagueStats.away.totalAssists}</Text>
                <Text style={styles.teamStatsLabel}>Assist.</Text>
            </View>
            </View>
            <View style={styles.teamCardsRow}>
            <Text style={styles.teamCardsText}>
                🟨 {playerLeagueStats.home.totalYellowCards} | 🟥 {playerLeagueStats.home.totalRedCards}
            </Text>
            <Text style={styles.teamCardsText}>
                🟨 {playerLeagueStats.away.totalYellowCards} | 🟥 {playerLeagueStats.away.totalRedCards}
            </Text>
            </View>
        </View>
        )}
        
        {/* Scorer Comparison Bar */}
        {topPlayers.home.goalScorer && topPlayers.away.goalScorer && (
        <View style={styles.comparisonSection}>
            <Text style={styles.comparisonTitle}>⚽ Artilheiros</Text>
            <View style={styles.comparisonRow}>
            <View style={styles.comparisonPlayer}>
                {topPlayers.home.goalScorer.photo ? (
                <Image 
                    source={{ uri: topPlayers.home.goalScorer.photo }}
                    style={styles.comparisonPhoto}
                />
                ) : (
                <View style={[styles.comparisonPhoto, styles.photoPlaceholder]}>
                    <User size={20} color="#71717a" />
                </View>
                )}
                <Text style={styles.comparisonName} numberOfLines={1}>
                {topPlayers.home.goalScorer.lastName}
                </Text>
                <Text style={styles.comparisonStats}>
                {topPlayers.home.goalScorer.stats.goalsScored} gols
                </Text>
                {getPlayerGoalsRank(topPlayers.home.goalScorer.lastName, 'home') && (
                <Text style={styles.rankBadge}>
                    {getPlayerGoalsRank(topPlayers.home.goalScorer.lastName, 'home')}º na liga
                </Text>
                )}
            </View>
            
            <View style={styles.comparisonBarContainer}>
                <View style={styles.comparisonBar}>
                <View 
                    style={[
                    styles.comparisonBarSegment,
                    styles.comparisonBarHome,
                    { 
                        flex: topPlayers.home.goalScorer.stats.goalsScored || 1 
                    }
                    ]} 
                />
                <View 
                    style={[
                    styles.comparisonBarSegment,
                    styles.comparisonBarAway,
                    { 
                        flex: topPlayers.away.goalScorer.stats.goalsScored || 1 
                    }
                    ]} 
                />
                </View>
            </View>
            
            <View style={styles.comparisonPlayer}>
                {topPlayers.away.goalScorer.photo ? (
                <Image 
                    source={{ uri: topPlayers.away.goalScorer.photo }}
                    style={styles.comparisonPhoto}
                />
                ) : (
                <View style={[styles.comparisonPhoto, styles.photoPlaceholder]}>
                    <User size={20} color="#71717a" />
                </View>
                )}
                <Text style={styles.comparisonName} numberOfLines={1}>
                {topPlayers.away.goalScorer.lastName}
                </Text>
                <Text style={styles.comparisonStats}>
                {topPlayers.away.goalScorer.stats.goalsScored} gols
                </Text>
                {getPlayerGoalsRank(topPlayers.away.goalScorer.lastName, 'away') && (
                <Text style={styles.rankBadge}>
                    {getPlayerGoalsRank(topPlayers.away.goalScorer.lastName, 'away')}º na liga
                </Text>
                )}
            </View>
            </View>
        </View>
        )}

        {/* Assist Leaders */}
        {topPlayers.home.assistLeader && topPlayers.away.assistLeader && (
        <View style={styles.comparisonSection}>
            <Text style={styles.comparisonTitle}>🅰️ Assistências</Text>
            <View style={styles.comparisonRow}>
            <View style={styles.comparisonPlayer}>
                {topPlayers.home.assistLeader.photo ? (
                <Image 
                    source={{ uri: topPlayers.home.assistLeader.photo }}
                    style={styles.comparisonPhoto}
                />
                ) : (
                <View style={[styles.comparisonPhoto, styles.photoPlaceholder]}>
                    <User size={20} color="#71717a" />
                </View>
                )}
                <Text style={styles.comparisonName} numberOfLines={1}>
                {topPlayers.home.assistLeader.lastName}
                </Text>
                <Text style={styles.comparisonStats}>
                {topPlayers.home.assistLeader.stats.assists} assists
                </Text>
            </View>
            
            <View style={styles.comparisonBarContainer}>
                <View style={styles.comparisonBar}>
                <View 
                    style={[
                    styles.comparisonBarSegment,
                    styles.comparisonBarHome,
                    { flex: topPlayers.home.assistLeader.stats.assists || 1 }
                    ]} 
                />
                <View 
                    style={[
                    styles.comparisonBarSegment,
                    styles.comparisonBarAway,
                    { flex: topPlayers.away.assistLeader.stats.assists || 1 }
                    ]} 
                />
                </View>
            </View>
            
            <View style={styles.comparisonPlayer}>
                {topPlayers.away.assistLeader.photo ? (
                <Image 
                    source={{ uri: topPlayers.away.assistLeader.photo }}
                    style={styles.comparisonPhoto}
                />
                ) : (
                <View style={[styles.comparisonPhoto, styles.photoPlaceholder]}>
                    <User size={20} color="#71717a" />
                </View>
                )}
                <Text style={styles.comparisonName} numberOfLines={1}>
                {topPlayers.away.assistLeader.lastName}
                </Text>
                <Text style={styles.comparisonStats}>
                {topPlayers.away.assistLeader.stats.assists} assists
                </Text>
            </View>
            </View>
        </View>
        )}

        {/* Card Alert Section */}
        {((topPlayers.home.cardLeader?.stats.yellowCards || 0) >= 4 ||
        (topPlayers.away.cardLeader?.stats.yellowCards || 0) >= 4) && (
        <View style={styles.cardAlertSection}>
            <Text style={styles.cardAlertTitle}>⚠️ Alerta de Suspensão</Text>
            
            {(topPlayers.home.cardLeader?.stats.yellowCards || 0) >= 4 && (
            <View style={styles.cardAlertRow}>
                <View style={styles.cardAlertBadge}>
                <Text style={styles.cardAlertIcon}>🟨</Text>
                <Text style={styles.cardAlertCount}>
                    {topPlayers.home.cardLeader?.stats.yellowCards}
                </Text>
                </View>
                <Text style={styles.cardAlertPlayer}>
                {topPlayers.home.cardLeader?.lastName} ({homeTeamName})
                </Text>
            </View>
            )}
            
            {(topPlayers.away.cardLeader?.stats.yellowCards || 0) >= 4 && (
            <View style={styles.cardAlertRow}>
                <View style={styles.cardAlertBadge}>
                <Text style={styles.cardAlertIcon}>🟨</Text>
                <Text style={styles.cardAlertCount}>
                    {topPlayers.away.cardLeader?.stats.yellowCards}
                </Text>
                </View>
                <Text style={styles.cardAlertPlayer}>
                {topPlayers.away.cardLeader?.lastName} ({awayTeamName})
                </Text>
            </View>
            )}
        </View>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  playersContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  teamStatsSummary: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  teamStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 12,
  },
  teamStatsColumn: {
    alignItems: "center",
    minWidth: 50,
  },
  teamStatsValue: {
    color: "#22c55e",
    fontSize: 24,
    fontWeight: "700",
  },
  teamStatsLabel: {
    color: "#a1a1aa",
    fontSize: 11,
    marginTop: 2,
  },
  teamStatsDivider: {
    paddingHorizontal: 12,
  },
  teamStatsVs: {
    color: "#52525b",
    fontSize: 14,
    fontWeight: "600",
  },
  teamCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  teamCardsText: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  rankBadge: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comparisonSection: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  comparisonTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  comparisonPlayer: {
    alignItems: "center",
    width: 80,
  },
  comparisonPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  photoPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  comparisonName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  comparisonStats: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  comparisonBarContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  comparisonBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  comparisonBarSegment: {
    height: "100%",
  },
  comparisonBarHome: {
    backgroundColor: "#22c55e",
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  comparisonBarAway: {
    backgroundColor: "#3b82f6",
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  cardAlertSection: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  cardAlertTitle: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  cardAlertRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(251, 191, 36, 0.1)",
  },
  cardAlertBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  cardAlertIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  cardAlertCount: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "700",
  },
  cardAlertPlayer: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  noStatsContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    margin: 16,
    borderRadius: 16,
  },
  noStatsText: {
    color: "#71717a",
    fontSize: 14,
    textAlign: "center",
  },
});
