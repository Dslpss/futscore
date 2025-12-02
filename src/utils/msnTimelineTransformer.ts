export interface GoalEvent {
  minute: string;
  player: {
    name: string;
    number: number;
  };
  assist?: {
    name: string;
    number: number;
  };
  teamId: string;
  description: string;
}

/**
 * Transform MSN Sports timeline to goal events
 */
export function transformMsnTimelineToGoals(timelineData: any): GoalEvent[] {
  if (!timelineData || !timelineData.timelines || !Array.isArray(timelineData.timelines)) {
    return [];
  }

  const goals: GoalEvent[] = [];

  for (const timeline of timelineData.timelines) {
    if (!timeline.events || !Array.isArray(timeline.events)) continue;

    for (const event of timeline.events) {
      // Only process goal events
      if (event.eventType !== 'ScoreChange') continue;

      const minute = event.gameClock?.minutes || '0';
      const playerName = event.player?.name?.rawName || 'Unknown';
      const playerNumber = event.player?.jerseyNumber || 0;
      
      let assist = undefined;
      if (event.assistantPlayers && event.assistantPlayers.length > 0) {
        const assistPlayer = event.assistantPlayers[0];
        assist = {
          name: assistPlayer.name?.rawName || assistPlayer.lastName?.rawName || 'Unknown',
          number: assistPlayer.jerseyNumber || 0,
        };
      }

      goals.push({
        minute,
        player: {
          name: playerName,
          number: playerNumber,
        },
        assist,
        teamId: event.teamId || '',
        description: event.description || '',
      });
    }
  }

  return goals;
}
