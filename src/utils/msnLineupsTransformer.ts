import { Lineup, Player } from "../types";

/**
 * Transform MSN Sports lineup data to app Lineup format
 */
export function transformMsnLineupsToLineups(msnLineupsData: any): Lineup[] {
  console.log(
    "[LineupsTransformer] Input data:",
    JSON.stringify(msnLineupsData)?.substring(0, 500)
  );

  if (
    !msnLineupsData ||
    !msnLineupsData.lineups ||
    !Array.isArray(msnLineupsData.lineups)
  ) {
    console.log("[LineupsTransformer] No lineups array found");
    return [];
  }

  console.log(
    `[LineupsTransformer] Found ${msnLineupsData.lineups.length} lineups`
  );

  return msnLineupsData.lineups.map((lineupData: any) => {
    // Separate starters and substitutes
    const allPlayers = lineupData.players || [];
    const starters = allPlayers.filter((p: any) => p.isStarter === true);
    const substitutes = allPlayers.filter((p: any) => p.isStarter === false);

    console.log(
      `[LineupsTransformer] Team: ${lineupData.team?.name?.rawName}, Starters: ${starters.length}, Subs: ${substitutes.length}`
    );

    // Transform players
    const transformPlayer = (player: any): Player => ({
      id: parseInt(player.id?.split("_").pop() || "0"),
      name: player.name?.rawName || player.lastName?.rawName || "Unknown",
      number: player.jerseyNumber || 0,
      pos: player.playerPosition || null,
      grid: player.lineupOrder ? `${player.lineupOrder}` : null,
      photo: player.image?.id
        ? `https://www.bing.com/th?id=${player.image.id}&w=100&h=100`
        : undefined,
    });

    return {
      team: {
        id: parseInt(lineupData.team?.id?.split("_").pop() || "0"),
        name:
          lineupData.team?.name?.localizedName ||
          lineupData.team?.name?.rawName ||
          "Unknown",
        logo: lineupData.team?.image?.id
          ? `https://www.bing.com/th?id=${lineupData.team.image.id}&w=80&h=80`
          : "",
        colors: lineupData.team?.colors
          ? {
              player: {
                primary: lineupData.team.colors.primaryColorHex || "#000000",
                number: "#FFFFFF",
                border: "#000000",
              },
              goalkeeper: {
                primary: lineupData.team.colors.secondaryColorHex || "#FFFF00",
                number: "#000000",
                border: "#000000",
              },
            }
          : undefined,
      },
      coach: {
        id: 0, // MSN doesn't provide coach in lineups endpoint
        name: "Não informado",
        photo: null,
      },
      formation: lineupData.formation || "",
      startXI: starters.map(transformPlayer),
      substitutes: substitutes.map(transformPlayer),
    };
  });
}
