import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TeamLogo } from "../TeamLogo";

interface Player {
  id?: string | number;
  name?: string;
  number?: string | number | null;
  pos?: string | null;
  grid?: string | null;
  photo?: string;
}

interface Team {
  name: string;
  logo: string;
}

interface Lineup {
  startXI: Player[];
}

interface SoccerFieldProps {
  homeLineup: Lineup;
  awayLineup: Lineup;
  homeTeam: Team;
  awayTeam: Team;
}

export const SoccerField: React.FC<SoccerFieldProps> = ({ 
  homeLineup, 
  awayLineup, 
  homeTeam, 
  awayTeam 
}) => {
  const getPlayerPosition = (index: number, total: number, lineIndex: number, isHome: boolean) => {
    // Normalized Y coordinate (0-100 from top)
    // Home (Bottom to Top): GK=90, DEF=75, MID=55, FWD=35
    // Away (Top to Bottom): GK=10, DEF=25, MID=45, FWD=65
    
    // Horizontal X (0-100 left to right)
    const x = (100 / (total + 1)) * (index + 1);
    
    let y = 50;
    if (isHome) {
      if (lineIndex === 0) y = 92; // GK
      else if (lineIndex === 1) y = 80; // DEF
      else if (lineIndex === 2) y = 62; // MID
      else if (lineIndex === 3) y = 45; // FWD
    } else {
      if (lineIndex === 0) y = 8; // GK
      else if (lineIndex === 1) y = 20; // DEF
      else if (lineIndex === 2) y = 38; // MID
      else if (lineIndex === 3) y = 55; // FWD
    }
    
    return { left: `${x}%`, top: `${y}%` };
  };

  const organizeByLine = (players: Player[]) => {
     // Regex for positions
     const GK = /^(G|GK|Goalkeeper)$/i;
     const DEF = /^(D|CB|LB|RB|WB|LWB|RWB|Back)$/i;
     const MID = /^(M|CM|DM|AM|LM|RM|Mid)$/i;
     const FWD = /^(F|A|ST|CF|RW|LW|Wing|Forward|Attacker)$/i;
     
     const lines = [[], [], [], []] as Player[][];
     
     players.forEach(p => {
       const pos = p.pos || 'M'; // Default to mid
       if (GK.test(pos)) lines[0].push(p);
       else if (DEF.test(pos) || pos.includes('Back') || pos.includes('Defender')) lines[1].push(p);
       else if (MID.test(pos) || pos.includes('Mid')) lines[2].push(p);
       else lines[3].push(p); // FWD
     });
     
     // Fallback if everyone is in one bucket (e.g. no pos data or unrecognized)
     // If GKs not found, try to find jersey #1 or first player
     if (lines[0].length === 0 && players.length > 0) {
        // Assume first player is GK if position is missing
        lines[0].push(players[0]);
        // Note: In a real app we might want to clone the array first to avoid mutation issues, 
        // but here players is likely a new array from props
     }

     if (lines[1].length === 0 && lines[2].length === 0 && lines[3].length === 0) {
       // Distribute remaining
       // Filter out the GK we just ostensibly found
       const remainingPlayers = lines[0].length > 0 && players[0] === lines[0][0] ? players.slice(1) : players;
       
       const remaining = remainingPlayers.length;
       const defCount = Math.floor(remaining * 0.4);
       const midCount = Math.floor(remaining * 0.35);
       
       let cursor = 0;
       lines[1] = remainingPlayers.slice(cursor, cursor + defCount); cursor += defCount;
       lines[2] = remainingPlayers.slice(cursor, cursor + midCount); cursor += midCount;
       lines[3] = remainingPlayers.slice(cursor);
     }
     
     return lines;
  };

  const renderTeam = (players: Player[], isHome: boolean) => {
    const lines = organizeByLine(players);
    return lines.map((line, lineIdx) => (
      line.map((player, pIdx) => {
        const { left, top } = getPlayerPosition(pIdx, line.length, lineIdx, isHome);
        return (
          <View key={player.id || `${lineIdx}-${pIdx}`} style={[styles.fieldPlayer, { left: left as any, top: top as any }]}>
             <View style={[styles.fieldPlayerMarker, { borderColor: isHome ? '#fff' : '#ef4444' }]}>
               {player.photo ? (
                 <Image source={{ uri: player.photo }} style={styles.fieldPlayerImage} />
               ) : (
                 <Text style={styles.fieldPlayerInitial}>{player.name ? player.name.charAt(0) : '?'}</Text>
               )}
               <View style={styles.fieldPlayerNumberBadge}>
                 <Text style={styles.fieldPlayerNumber}>{player.number}</Text>
               </View>
             </View>
             <Text style={styles.fieldPlayerName} numberOfLines={1}>{player.name ? player.name.split(' ').pop() : ''}</Text>
          </View>
        );
      })
    ));
  };

  return (
    <View style={styles.soccerFieldContainer}>
      <LinearGradient
        colors={['#1a472a', '#2e7d32', '#1a472a']}
        style={styles.soccerField}
      >
        {/* Field Lines */}
        <View style={styles.fieldCenterLine} />
        <View style={styles.fieldCenterCircle} />
        <View style={styles.fieldBoxTop} />
        <View style={styles.fieldBoxBottom} />
        
        {/* Teams */}
        {renderTeam(homeLineup.startXI, true)}
        {renderTeam(awayLineup.startXI, false)}
        
        {/* Team Info Markers - Overlay */}
        <View style={styles.fieldTeamInfoHome}>
          <TeamLogo uri={homeTeam.logo} size={20} style={styles.fieldTeamLogo} />
          <Text style={styles.fieldTeamNameTitle}>{homeTeam.name}</Text>
        </View>

        <View style={styles.fieldTeamInfoAway}>
          <TeamLogo uri={awayTeam.logo} size={20} style={styles.fieldTeamLogo} />
          <Text style={styles.fieldTeamNameTitle}>{awayTeam.name}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  soccerFieldContainer: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  soccerField: {
    flex: 1,
    position: 'relative',
  },
  fieldCenterLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  fieldCenterCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  fieldBoxTop: {
    position: 'absolute',
    top: 0,
    left: '25%',
    width: '50%',
    height: '15%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopWidth: 0,
  },
  fieldBoxBottom: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    width: '50%',
    height: '15%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderBottomWidth: 0,
  },
  fieldPlayer: {
    position: 'absolute',
    alignItems: 'center',
    width: 60,
    transform: [{ translateX: -30 }, { translateY: -15 }],
  },
  fieldPlayerMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 2,
  },
  fieldPlayerImage: {
    width: '100%',
    height: '100%',
  },
  fieldPlayerInitial: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldPlayerName: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  fieldPlayerNumberBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#000',
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  fieldPlayerNumber: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  fieldTeamInfoHome: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  fieldTeamInfoAway: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  fieldTeamLogo: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  fieldTeamNameTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
