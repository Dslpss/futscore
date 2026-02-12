import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { BlurView } from "expo-blur";
import { X } from "lucide-react-native";
import { api } from "../services/api";
import { msnSportsApi } from "../services/msnSportsApi";
import { inferMsnTeamId, addTeamMsnIdMapping } from "../utils/teamIdMapper";
import { Player, Match } from "../types";
import { LinearGradient } from "expo-linear-gradient";
import { TeamMatchHistory } from "./TeamMatchHistory";
import { TeamLogo } from "./TeamLogo";

interface TeamDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  team: {
    id: number;
    name: string;
    logo: string;
    country: string;
    msnId?: string; // Optional MSN Sports Team ID
  } | null;
  onMatchPress?: (match: Match) => void;
}

export const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({
  visible,
  onClose,
  team,
  onMatchPress,
}) => {
  const [squad, setSquad] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedMsnId, setResolvedMsnId] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (visible && team) {
      resolveMsnIdAndLoadData();
    } else {
      setSquad([]);
      setResolvedMsnId(undefined);
    }
  }, [visible, team]);

  // Try to find MSN ID by searching in live games from various leagues
  const findMsnIdFromLiveGames = async (
    teamName: string,
    teamId: number
  ): Promise<string | undefined> => {
    const leaguesToSearch = [
      "Soccer_BrazilBrasileiroSerieA",
      "Soccer_EnglandPremierLeague",
      "Soccer_GermanyBundesliga",
      "Soccer_ItalySerieA",
      "Soccer_FranceLigue1",
      "Soccer_SpainLaLiga",
      "Soccer_PortugalPrimeiraLiga",
      "Soccer_UEFAChampionsLeague",
    ];

    const normalizedSearchName = teamName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    for (const leagueId of leaguesToSearch) {
      try {
        const games = await msnSportsApi.getLiveAroundLeague(
          leagueId,
          "Soccer"
        );

        for (const game of games) {
          for (const participant of game.participants || []) {
            const msnTeam = participant.team;
            if (msnTeam && msnTeam.id) {
              const msnTeamName =
                msnTeam.name?.localizedName || msnTeam.name?.rawName || "";
              const normalizedMsnName = msnTeamName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");

              // Check if names match (fuzzy match)
              if (
                normalizedMsnName.includes(normalizedSearchName) ||
                normalizedSearchName.includes(normalizedMsnName) ||
                msnTeamName.toLowerCase().includes(teamName.toLowerCase()) ||
                teamName.toLowerCase().includes(msnTeamName.toLowerCase())
              ) {
                console.log(
                  `[TeamDetailsModal] Found MSN ID for ${teamName}: ${msnTeam.id}`
                );
                // Save mapping for future use
                addTeamMsnIdMapping(teamId, msnTeam.id);
                return msnTeam.id;
              }
            }
          }
        }
      } catch (error) {
        // Continue to next league
      }
    }

    return undefined;
  };

  const resolveMsnIdAndLoadData = async () => {
    if (!team) return;

    // First, try to get MSN ID from props or mapping
    let msnId = team.msnId || inferMsnTeamId(team.id, team.name);

    // If not found, try to discover from live games
    if (!msnId) {
      console.log(
        `[TeamDetailsModal] No MSN ID for ${team.name}, searching in live games...`
      );
      msnId = await findMsnIdFromLiveGames(team.name, team.id);
    }

    setResolvedMsnId(msnId);
    loadSquad(msnId);
  };

  const loadSquad = async (msnId?: string) => {
    if (!team) return;
    setLoading(true);

    // Try MSN Sports API first (getFullSquad) - combines multiple endpoints for complete roster
    if (msnId) {
      try {
        console.log(
          `[TeamDetailsModal] Trying MSN getFullSquad for ${msnId}...`
        );
        const allPlayers = await msnSportsApi.getFullSquad(msnId);

        if (allPlayers && allPlayers.length > 0) {
          // Transform MSN player data to our Player format
          const transformedPlayers: Player[] = allPlayers.map(
            (player: any) => ({
              id: player.id || player.playerId || Math.random(),
              name:
                player.name?.rawName ||
                player.name?.localizedName ||
                (player.firstName?.rawName && player.lastName?.rawName
                  ? `${player.firstName.rawName} ${player.lastName.rawName}`
                  : null) ||
                player.displayName ||
                "Unknown",
              number:
                player.jerseyNumber || player.jersey || player.number || null,
              pos: transformMsnPosition(
                player.playerPosition || player.position || player.role
              ),
              photo: player.image?.id
                ? `https://www.bing.com/th?id=${player.image.id}&w=100&h=100`
                : undefined,
              stats: player.stats,
            })
          );

          console.log(
            `[TeamDetailsModal] Got ${transformedPlayers.length} players from MSN getFullSquad`
          );
          setSquad(transformedPlayers);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log(`[TeamDetailsModal] MSN getFullSquad failed: ${error}`);
      }
    }

    // Fallback to football-data.org API
    try {
      console.log(
        `[TeamDetailsModal] Trying football-data.org for team ${team.id}...`
      );
      const data = await api.getSquad(team.id);
      if (data && data.length > 0) {
        setSquad(data);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.log(
        `[TeamDetailsModal] football-data.org also failed for team ${team.id}`
      );
    }

    setSquad([]);
    setLoading(false);
  };

  // Transform MSN position to our standard format
  const transformMsnPosition = (position: string | undefined): string => {
    if (!position) return "Unknown";

    const posLower = position.toLowerCase();

    if (
      posLower.includes("goalkeeper") ||
      posLower.includes("goleiro") ||
      posLower === "gk"
    ) {
      return "Goalkeeper";
    }
    if (
      posLower.includes("defend") ||
      posLower.includes("back") ||
      posLower.includes("zagueiro") ||
      posLower.includes("lateral") ||
      posLower === "df"
    ) {
      return "Defender";
    }
    if (
      posLower.includes("midfield") ||
      posLower.includes("meio") ||
      posLower.includes("volante") ||
      posLower === "mf"
    ) {
      return "Midfielder";
    }
    if (
      posLower.includes("forward") ||
      posLower.includes("attack") ||
      posLower.includes("striker") ||
      posLower.includes("atacante") ||
      posLower === "fw"
    ) {
      return "Attacker";
    }
    if (
      posLower.includes("coach") ||
      posLower.includes("manager") ||
      posLower.includes("técnico") ||
      posLower.includes("treinador")
    ) {
      return "Coach";
    }

    return position;
  };

  if (!visible || !team) return null;

  const groupedSquad = {
    Goalkeeper: squad.filter((p) => p.pos === "Goalkeeper"),
    Defender: squad.filter((p) => p.pos === "Defence" || p.pos === "Defender"),
    Midfielder: squad.filter(
      (p) => p.pos === "Midfield" || p.pos === "Midfielder"
    ),
    Attacker: squad.filter(
      (p) => p.pos === "Offence" || p.pos === "Attacker" || p.pos === "Forward"
    ),
    Coach: squad.filter((p) => p.pos === "Coach"),
  };

  const renderSection = (title: string, players: Player[]) => {
    if (players.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {players.map((player) => (
          <View key={player.id} style={styles.playerRow}>
            {player.photo ? (
              <Image
                source={{ uri: player.photo }}
                style={styles.playerPhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.playerPhotoPlaceholder}>
                <Text style={styles.playerNumber}>{player.number || "-"}</Text>
              </View>
            )}
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              {player.stats && (player.stats.goals || player.stats.assists) ? (
                <Text style={styles.playerStats}>
                  {player.stats.goals ? `⚽ ${player.stats.goals}` : ""}
                  {player.stats.goals && player.stats.assists ? " · " : ""}
                  {player.stats.assists ? `🅰️ ${player.stats.assists}` : ""}
                </Text>
              ) : (
                <Text style={styles.playerPosition}>{player.pos}</Text>
              )}
            </View>
            {player.number && player.photo && (
              <Text style={styles.playerJersey}>#{player.number}</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Detalhes do Time</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <LinearGradient
              colors={["#1c1c1e", "#121212"]}
              style={styles.teamHeader}>
              <TeamLogo uri={team.logo} size={80} style={styles.teamLogo} />
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamCountry}>{team.country}</Text>
            </LinearGradient>

            {/* Match History Section - Always show */}
            <View style={styles.historyContainer}>
              <TeamMatchHistory
                teamId={team.id}
                teamName={team.name}
                msnId={resolvedMsnId || team.msnId}
                limit={5}
                onMatchPress={onMatchPress}
              />
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22c55e" />
                <Text style={styles.loadingText}>Carregando elenco...</Text>
              </View>
            ) : squad.length > 0 ? (
              <>
                {/* Squad Section */}
                <View style={styles.squadContainer}>
                  {renderSection("Goleiros", groupedSquad.Goalkeeper)}
                  {renderSection("Defensores", groupedSquad.Defender)}
                  {renderSection("Meio-Campistas", groupedSquad.Midfielder)}
                  {renderSection("Atacantes", groupedSquad.Attacker)}
                  {renderSection("Comissão Técnica", groupedSquad.Coach)}
                </View>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Dados do elenco não disponíveis para este time.
                </Text>
                <Text style={styles.emptySubtext}>
                  A API pode não ter informações completas para todas as
                  equipes.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: "flex-end" },
  modalView: {
    backgroundColor: "#09090b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  closeButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  content: { paddingBottom: 40 },
  teamHeader: {
    alignItems: "center",
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  teamLogo: { width: 80, height: 80, marginBottom: 12, resizeMode: "contain" },
  teamName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  teamCountry: { color: "#a1a1aa", fontSize: 14 },
  loadingContainer: { padding: 40, alignItems: "center" },
  loadingText: { color: "#a1a1aa", fontSize: 14, marginTop: 12 },
  historyContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  squadContainer: { paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#22c55e",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  playerPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  playerPhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  playerInfo: {
    flex: 1,
  },
  playerNumber: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  playerName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  playerPosition: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  playerStats: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  playerJersey: { color: "#a1a1aa", fontSize: 14, fontWeight: "700" },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: {
    color: "#71717a",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: { color: "#52525b", fontSize: 14, textAlign: "center" },
});
