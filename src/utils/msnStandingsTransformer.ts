export interface StandingTeam {
  position: number;
  team: {
    id: string;
    name: string;
    logo: string;
    shortName: string;
  };
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

/**
 * Build MSN image URL from image ID
 * Uses Bing thumbnail service which works reliably
 */
function buildMsnImageUrl(imageId: string | undefined): string {
  if (!imageId) return "";
  return `https://www.bing.com/th?id=${imageId}&w=80&h=80`;
}

/**
 * Transform MSN Sports standings to app format
 */
export function transformMsnStandings(msnStandingsData: any): StandingTeam[] {
  if (
    !msnStandingsData ||
    !msnStandingsData.standings ||
    !Array.isArray(msnStandingsData.standings)
  ) {
    return [];
  }

  const standings: StandingTeam[] = msnStandingsData.standings.map(
    (teamData: any) => ({
      position: teamData.overallRank || 0,
      team: {
        id: teamData.team?.id || "",
        name:
          teamData.team?.name?.rawName ||
          teamData.team?.name?.localizedName ||
          "Unknown",
        shortName:
          teamData.team?.shortName?.rawName ||
          teamData.team?.shortName?.localizedName ||
          "",
        logo: buildMsnImageUrl(teamData.team?.image?.id),
      },
      played: teamData.gamesPlayed || 0,
      won: teamData.winLoss?.wins || 0,
      draw: teamData.winLoss?.ties || 0,
      lost: teamData.winLoss?.losses || 0,
      goalsFor: teamData.pointsFor || 0,
      goalsAgainst: teamData.pointsAgainst || 0,
      goalDifference: teamData.pointsDifference || 0,
      points: teamData.points || 0,
    })
  );

  // Sort by position
  standings.sort((a, b) => a.position - b.position);

  return standings;
}
