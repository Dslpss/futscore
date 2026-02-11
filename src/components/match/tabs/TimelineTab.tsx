import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MatchTimeline } from '../../../utils/msnTimelineTransformer';
import { MatchTimelineSection } from '../../MatchTimelineSection';

interface TeamInfo {
  id: number;
  name: string;
  logo: string;
  msnId?: string;
}

interface TimelineTabProps {
  timelineData: MatchTimeline | null;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ timelineData, homeTeam, awayTeam }) => {
  if (!timelineData) {
    return (
      <View style={styles.noStatsContainer}>
        <Text style={styles.noStatsText}>
          Linha do tempo não disponível para este jogo.
        </Text>
      </View>
    );
  }

  return (
    <MatchTimelineSection
      timeline={timelineData}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
    />
  );
};

const styles = StyleSheet.create({
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
