import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { User } from 'lucide-react-native';
import { Match, MatchInjuries } from '../../../types';
import { SoccerField } from '../SoccerField';

interface LineupsTabProps {
  lineups?: Match['lineups'];
  homeTeam: Match['teams']['home'];
  awayTeam: Match['teams']['away'];
  injuries: MatchInjuries | null;
}

export const LineupsTab: React.FC<LineupsTabProps> = ({ lineups, homeTeam, awayTeam, injuries }) => {
  const [lineupView, setLineupView] = useState<"list" | "field">("field");

  if (!lineups || lineups.length === 0) {
    return (
      <View style={styles.noStatsContainer}>
        <Text style={styles.noStatsText}>
          Escalações não disponíveis para este jogo.
        </Text>
      </View>
    );
  }

  const getPlayerInjuryStatus = (playerName: string, teamSide: 'home' | 'away'): { isInjured: boolean; status?: string; description?: string } => {
    if (!injuries) return { isInjured: false };
    
    const teamInjuries = teamSide === 'home' ? injuries.home : injuries.away;
    const injuredPlayer = teamInjuries.injuredPlayers.find(
      (p) => playerName.toLowerCase().includes(p.lastName.toLowerCase()) ||
             p.name.toLowerCase().includes(playerName.toLowerCase().split(' ').pop() || '')
    );
    
    if (injuredPlayer) {
      return {
        isInjured: true,
        status: injuredPlayer.injuryStatus,
        description: injuredPlayer.injuryDescription,
      };
    }
    return { isInjured: false };
  };

  const renderTeamList = (lineup: any, team: any, side: 'home' | 'away') => (
    <View style={styles.teamLineup}>
      <View style={styles.lineupHeader}>
        <Image
          source={{ uri: team.logo }}
          style={styles.smallTeamLogo}
        />
        <Text style={styles.lineupTeamName}>
          {team.name}
        </Text>
        <Text style={styles.formation}>
          {lineup.formation}
        </Text>
      </View>

      <Text style={styles.lineupSectionTitle}>Titulares</Text>
      {lineup.startXI.map((player: any) => {
        const injuryInfo = getPlayerInjuryStatus(player.name, side);
        return (
          <View key={player.id || player.name} style={styles.playerRow}>
            {player.photo ? (
              <Image
                source={{ uri: player.photo }}
                style={styles.playerPhoto}
              />
            ) : (
              <View style={styles.playerPhotoPlaceholder}>
                <User size={16} color="#71717a" />
              </View>
            )}
            <Text style={styles.playerNumber}>
              {player.number}
            </Text>
            <Text style={[styles.playerName, injuryInfo.isInjured && styles.playerNameInjured]}>
              {player.name}
            </Text>
            {injuryInfo.isInjured && (
              <Text style={styles.playerInjuryBadge}>
                {injuryInfo.status === 'Out' ? '🔴' : injuryInfo.status === 'Doubtful' ? '🟡' : '⚕️'}
              </Text>
            )}
            <Text style={styles.playerPosition}>
              {player.pos}
            </Text>
          </View>
        );
      })}

      <Text style={styles.lineupSectionTitle}>Reservas</Text>
      {lineup.substitutes.map((player: any) => {
        const injuryInfo = getPlayerInjuryStatus(player.name, side);
        return (
          <View key={player.id || player.name} style={styles.playerRow}>
            {player.photo ? (
              <Image
                source={{ uri: player.photo }}
                style={styles.playerPhoto}
              />
            ) : (
              <View style={styles.playerPhotoPlaceholder}>
                <User size={16} color="#71717a" />
              </View>
            )}
            <Text style={styles.playerNumber}>
              {player.number}
            </Text>
            <Text style={[styles.playerName, injuryInfo.isInjured && styles.playerNameInjured]}>
              {player.name}
            </Text>
            {injuryInfo.isInjured && (
              <Text style={styles.playerInjuryBadge}>
                {injuryInfo.status === 'Out' ? '🔴' : injuryInfo.status === 'Doubtful' ? '🟡' : '⚕️'}
              </Text>
            )}
            <Text style={styles.playerPosition}>
              {player.pos}
            </Text>
          </View>
        );
      })}

      <View style={styles.coachContainer}>
        <Text style={styles.coachLabel}>Técnico:</Text>
        <Text style={styles.coachName}>
          {lineup.coach.name}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.lineupsContainer}>
      {/* View Toggle */}
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity 
          style={[styles.viewToggleButton, lineupView === "list" && styles.viewToggleButtonActive]}
          onPress={() => setLineupView("list")}
        >
          <Text style={[styles.viewToggleText, lineupView === "list" && styles.viewToggleTextActive]}>Lista</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewToggleButton, lineupView === "field" && styles.viewToggleButtonActive]}
          onPress={() => setLineupView("field")}
        >
          <Text style={[styles.viewToggleText, lineupView === "field" && styles.viewToggleTextActive]}>Campo</Text>
        </TouchableOpacity>
      </View>

      {lineupView === "field" ? (
        <SoccerField 
          homeLineup={lineups[0]} 
          awayLineup={lineups[1]}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      ) : (
        <View>
          {renderTeamList(lineups[0], homeTeam, 'home')}
          <View style={styles.lineupDivider} />
          {renderTeamList(lineups[1], awayTeam, 'away')}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  lineupsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  viewToggleButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  viewToggleText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: '#fff',
  },
  teamLineup: {
    marginBottom: 24,
  },
  lineupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  smallTeamLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  lineupTeamName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  formation: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lineupSectionTitle: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  playerPhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
  },
  playerPhotoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  playerNumber: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "600",
    width: 24,
  },
  playerName: {
    color: "#d4d4d8",
    fontSize: 13,
    flex: 1,
  },
  playerNameInjured: {
    color: "#ef4444",
    opacity: 0.8,
  },
  playerInjuryBadge: {
    fontSize: 10,
    marginLeft: 4,
    marginRight: 4,
  },
  playerPosition: {
    color: "#52525b",
    fontSize: 11,
    fontWeight: "600",
    width: 30,
    textAlign: "right",
  },
  coachContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  coachLabel: {
    color: "#71717a",
    fontSize: 12,
    marginRight: 8,
  },
  coachName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  lineupDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 16,
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
