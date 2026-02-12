import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Share,
} from "react-native";
import { BlurView } from "expo-blur";
import { X, Calendar, MapPin, Share2, AlertTriangle, ChevronRight, User, Tv, Sun, CloudRain, CloudSnow, CloudFog, Thermometer, Cloud } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Match, Team } from "../types";
import { TeamDetailsModal } from "./TeamDetailsModal";
import { HeadToHeadSection } from "./HeadToHeadSection";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { TeamLogo } from "./TeamLogo";

// Lazy load tabs
const StatsTab = lazy(() => import("./match/tabs/StatsTab").then(module => ({ default: module.StatsTab })));
const LineupsTab = lazy(() => import("./match/tabs/LineupsTab").then(module => ({ default: module.LineupsTab })));
const TimelineTab = lazy(() => import("./match/tabs/TimelineTab").then(module => ({ default: module.TimelineTab })));
const PlayersTab = lazy(() => import("./match/tabs/PlayersTab").then(module => ({ default: module.PlayersTab })));

interface MatchStatsModalProps {
  visible: boolean;
  onClose: () => void;
  match: Match | null;
  onMatchSelect?: (match: Match) => void;
}

export const MatchStatsModal: React.FC<MatchStatsModalProps> = ({
  visible,
  onClose,
  match: initialMatch,
  onMatchSelect,
}) => {
  const {
    match,
    loading,
    timelineData,
    gameDetails,
    topPlayers,
    injuries,
    playerLeagueStats,
    teamPositions,
    recentMatches,
    pollData
  } = useMatchDetails(initialMatch, visible);

  const [activeTab, setActiveTab] = useState<"stats" | "lineups" | "timeline" | "players">("stats");
  const [lineupView, setLineupView] = useState<"list" | "field">("field");
  const [selectedTeam, setSelectedTeam] = useState<{ id: number; name: string; logo: string; country: string; msnId?: string } | null>(null);

  if (!visible) return null;

  // Helper function to check if a player is injured
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

  // Helper function to get player's goals rank from league stats
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
    <>
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.modalView}>
          {/* Header with Close Button */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Detalhes da Partida</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#22c55e" />
            </View>
          ) : match ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}>
              {/* Scoreboard - Modern Design */}
              <View style={styles.scoreCardWrapper}>
                <LinearGradient
                  colors={["#1a1a2e", "#16213e", "#0f0f1a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scoreCard}>
                  {/* League Badge */}
                  <View style={styles.leagueBadge}>
                    <Image
                      source={{ uri: match.league.logo }}
                      style={styles.leagueLogo}
                    />
                    <Text style={styles.leagueName}>{match.league.name}</Text>
                  </View>

                  {/* Teams and Score Section */}
                  <View style={styles.matchupSection}>
                    {/* Home Team */}
                    <View style={styles.teamSection}>
                      <View style={styles.teamLogoContainer}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setSelectedTeam({
                            id: match.teams.home.id,
                            name: match.teams.home.name,
                            logo: match.teams.home.logo,
                            country: match.league.country || '',
                            msnId: (match.teams.home as any).msnId,
                          })}
                        >
                          <LinearGradient
                            colors={[
                              "rgba(255,255,255,0.1)",
                              "rgba(255,255,255,0.05)",
                            ]}
                            style={styles.teamLogoGlow}>
                            <TeamLogo
                              uri={match.teams.home.logo}
                              size={56}
                              style={styles.teamLogo}
                            />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.teamName} numberOfLines={2}>
                        {match.teams.home.name}
                      </Text>
                      {teamPositions.home && (
                        <View style={styles.positionBadge}>
                          <Text style={styles.positionText}>{teamPositions.home}º</Text>
                        </View>
                      )}
                    </View>

                    {/* Score Display */}
                    <View style={styles.scoreSection}>
                      <View style={styles.scoreBox}>
                        <View style={styles.scoreWithPenalty}>
                          <Text style={styles.scoreNumber}>
                            {match.goals.home ?? 0}
                          </Text>
                          {match.score?.penalties && match.score.penalties.home !== null && (
                            <Text style={styles.penaltyScoreModal}>
                              ({match.score.penalties.home})
                            </Text>
                          )}
                        </View>
                        <View style={styles.scoreDivider} />
                        <View style={styles.scoreWithPenalty}>
                          {match.score?.penalties && match.score.penalties.away !== null && (
                            <Text style={styles.penaltyScoreModal}>
                              ({match.score.penalties.away})
                            </Text>
                          )}
                          <Text style={styles.scoreNumber}>
                            {match.goals.away ?? 0}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.statusBadge}>
                        <View
                          style={[
                            styles.statusDot,
                            match.fixture.status.short === "LIVE" ||
                            match.fixture.status.short === "1H" ||
                            match.fixture.status.short === "2H" ||
                            match.fixture.status.short === "HT" ||
                            match.fixture.status.short === "Q1" ||
                            match.fixture.status.short === "Q2" ||
                            match.fixture.status.short === "Q3" ||
                            match.fixture.status.short === "Q4" ||
                            match.fixture.status.short.startsWith("OT")
                              ? styles.statusDotLive
                              : styles.statusDotFinished,
                          ]}
                        />
                        <Text style={styles.statusText}>
                          {match.fixture.status.short === "FT"
                            ? "Encerrado"
                            : match.fixture.status.short === "PEN"
                            ? "Pênaltis"
                            : match.fixture.status.long}
                        </Text>
                      </View>
                      {match.fixture.status.elapsed && (
                        <Text style={styles.elapsedTime}>
                          {match.fixture.status.elapsed}'
                        </Text>
                      )}
                    </View>

                    {/* Away Team */}
                    <View style={styles.teamSection}>
                      <View style={styles.teamLogoContainer}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setSelectedTeam({
                            id: match.teams.away.id,
                            name: match.teams.away.name,
                            logo: match.teams.away.logo,
                            country: match.league.country || '',
                            msnId: (match.teams.away as any).msnId,
                          })}
                        >
                          <LinearGradient
                            colors={[
                              "rgba(255,255,255,0.1)",
                              "rgba(255,255,255,0.05)",
                            ]}
                            style={styles.teamLogoGlow}>
                            <TeamLogo
                              uri={match.teams.away.logo}
                              size={56}
                              style={styles.teamLogo}
                            />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.teamName} numberOfLines={2}>
                        {match.teams.away.name}
                      </Text>
                      {teamPositions.away && (
                        <View style={styles.positionBadge}>
                          <Text style={styles.positionText}>{teamPositions.away}º</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Venue Info */}
                  {match.fixture.venue &&
                    match.fixture.venue.name &&
                    match.fixture.venue.name !== "Estádio não informado" && (
                      <View style={styles.venueContainer}>
                        <MapPin color="#71717a" size={12} />
                        <Text style={styles.venueText}>
                          {match.fixture.venue.name}
                          {match.fixture.venue.city
                            ? `, ${match.fixture.venue.city}`
                            : ""}
                        </Text>
                      </View>
                    )}
                </LinearGradient>
              </View>

              {/* Game Details Card (Venue, Channels, Weather) */}
              {gameDetails &&
                (gameDetails.venue ||
                  gameDetails.channels?.length ||
                  gameDetails.weather) && (
                  <View style={styles.gameDetailsCard}>
                    {/* Stadium/Venue */}
                    {gameDetails.venue && (
                      <View style={styles.gameDetailRow}>
                        <View style={styles.gameDetailIcon}>
                          <MapPin color="#22c55e" size={18} />
                        </View>
                        <View style={styles.gameDetailContent}>
                          <Text style={styles.gameDetailTitle}>Estádio</Text>
                          <Text style={styles.gameDetailValue}>
                            {gameDetails.venue.name}
                          </Text>
                          {gameDetails.venue.city && (
                            <Text style={styles.gameDetailSubtext}>
                              {gameDetails.venue.city}
                              {gameDetails.venue.country
                                ? `, ${gameDetails.venue.country}`
                                : ""}
                            </Text>
                          )}
                          {gameDetails.venue.capacity && (
                            <Text style={styles.gameDetailSubtext}>
                              Capacidade:{" "}
                              {parseInt(
                                gameDetails.venue.capacity
                              ).toLocaleString("pt-BR")}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* TV/Streaming Channels */}
                    {gameDetails.channels &&
                      gameDetails.channels.length > 0 &&
                      gameDetails.channels.some(
                        (ch) => ch.names.length > 0
                      ) && (
                        <View style={styles.gameDetailRow}>
                          <View style={styles.gameDetailIcon}>
                            <Tv color="#3b82f6" size={18} />
                          </View>
                          <View style={styles.gameDetailContent}>
                            <Text style={styles.gameDetailTitle}>
                              Onde Assistir
                            </Text>
                            {gameDetails.channels.map(
                              (channel, idx) =>
                                channel.names.length > 0 && (
                                  <Text
                                    key={idx}
                                    style={styles.gameDetailValue}>
                                    {channel.names.join(", ")}
                                  </Text>
                                )
                            )}
                          </View>
                        </View>
                      )}

                    {/* Weather */}
                    {gameDetails.weather && (
                      <View style={styles.gameDetailRow}>
                        <View style={styles.gameDetailIcon}>
                          {gameDetails.weather.condition
                            ?.toLowerCase()
                            .includes("sun") ||
                          gameDetails.weather.condition
                            ?.toLowerCase()
                            .includes("clear") ? (
                            <Sun color="#f59e0b" size={18} />
                          ) : gameDetails.weather.condition
                              ?.toLowerCase()
                              .includes("rain") ? (
                            <CloudRain color="#60a5fa" size={18} />
                          ) : gameDetails.weather.condition
                              ?.toLowerCase()
                              .includes("snow") ? (
                            <CloudSnow color="#e5e7eb" size={18} />
                          ) : gameDetails.weather.condition
                              ?.toLowerCase()
                              .includes("fog") ? (
                            <CloudFog color="#9ca3af" size={18} />
                          ) : (
                            <Cloud color="#9ca3af" size={18} />
                          )}
                        </View>
                        <View style={styles.gameDetailContent}>
                          <Text style={styles.gameDetailTitle}>
                            Clima no Dia
                          </Text>
                          <View style={styles.weatherInfo}>
                            <Text style={styles.weatherTemp}>
                              {gameDetails.weather.temperature}°
                              {gameDetails.weather.unit === "Celsius"
                                ? "C"
                                : "F"}
                            </Text>
                            <Text style={styles.gameDetailValue}>
                              {gameDetails.weather.summary ||
                                gameDetails.weather.condition}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Win/Loss Record */}
                    {(gameDetails.homeTeam?.winLossRecord ||
                      gameDetails.awayTeam?.winLossRecord) && (
                      <View style={styles.gameDetailRow}>
                        <View style={styles.gameDetailIcon}>
                          <Text style={{ fontSize: 16 }}>📊</Text>
                        </View>
                        <View style={styles.gameDetailContent}>
                          <Text style={styles.gameDetailTitle}>
                            Retrospecto na Temporada
                          </Text>
                          <View style={styles.recordContainer}>
                            {gameDetails.homeTeam?.winLossRecord && (
                              <View style={styles.teamRecord}>
                                <Text style={styles.recordTeamName}>
                                  {match.teams.home.name}
                                </Text>
                                <Text style={styles.recordStats}>
                                  {gameDetails.homeTeam.winLossRecord.wins}V{" "}
                                  {gameDetails.homeTeam.winLossRecord.ties}E{" "}
                                  {gameDetails.homeTeam.winLossRecord.losses}D
                                </Text>
                              </View>
                            )}
                            {gameDetails.awayTeam?.winLossRecord && (
                              <View style={styles.teamRecord}>
                                <Text style={styles.recordTeamName}>
                                  {match.teams.away.name}
                                </Text>
                                <Text style={styles.recordStats}>
                                  {gameDetails.awayTeam.winLossRecord.wins}V{" "}
                                  {gameDetails.awayTeam.winLossRecord.ties}E{" "}
                                  {gameDetails.awayTeam.winLossRecord.losses}D
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )}

              {/* Injuries Section - Departamento Médico */}
              {injuries && (injuries.home.injuredPlayers.length > 0 || injuries.away.injuredPlayers.length > 0) && (
                <View style={styles.injuriesCard}>
                  <Text style={styles.injuriesTitle}>🏥 Departamento Médico</Text>
                  <View style={styles.injuryLegend}>
                    <View style={styles.legendItem}>
                      <Text style={styles.legendEmoji}>🔴</Text>
                      <Text style={styles.legendText}>Fora</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <Text style={styles.legendEmoji}>🟡</Text>
                      <Text style={styles.legendText}>Dúvida</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <Text style={styles.legendEmoji}>⚕️</Text>
                      <Text style={styles.legendText}>Recuperação</Text>
                    </View>
                  </View>
                  
                  {/* Home Team Injuries */}
                  {injuries.home.injuredPlayers.length > 0 && (
                    <View style={styles.teamInjuries}>
                      <View style={styles.teamInjuryHeader}>
                        <TeamLogo
                          uri={match.teams.home.logo}
                          size={24}
                          style={styles.injuryTeamLogo}
                        />
                        <Text style={styles.teamInjuryName}>{match.teams.home.name}</Text>
                        <View style={styles.injuryCountBadge}>
                          <Text style={styles.injuryCountText}>{injuries.home.injuredPlayers.length}</Text>
                        </View>
                      </View>
                      {injuries.home.injuredPlayers.map((player) => (
                        <View key={player.id} style={styles.injuredPlayerRow}>
                          <View style={[
                            styles.injuryStatusIcon,
                            player.injuryStatus === 'Out' && styles.injuryStatusOut,
                            player.injuryStatus === 'Doubtful' && styles.injuryStatusDoubtful,
                            (player.injuryStatus === 'Injured' || player.injuryStatus === 'GameTimeDecision') && styles.injuryStatusInjured,
                          ]}>
                            <Text style={styles.injuryStatusEmoji}>
                              {player.injuryStatus === 'Out' ? '🔴' : 
                               player.injuryStatus === 'Doubtful' ? '🟡' : '⚕️'}
                            </Text>
                          </View>
                          <View style={styles.injuredPlayerInfo}>
                            <Text style={styles.injuredPlayerName}>
                              {player.jerseyNumber && `${player.jerseyNumber}. `}{player.lastName || player.name}
                            </Text>
                            <Text style={styles.injuryDescription}>
                              {player.injuryDescription || player.injuryStatus}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Away Team Injuries */}
                  {injuries.away.injuredPlayers.length > 0 && (
                    <View style={styles.teamInjuries}>
                      <View style={styles.teamInjuryHeader}>
                        <TeamLogo
                          uri={match.teams.away.logo}
                          size={24}
                          style={styles.injuryTeamLogo}
                        />
                        <Text style={styles.teamInjuryName}>{match.teams.away.name}</Text>
                        <View style={styles.injuryCountBadge}>
                          <Text style={styles.injuryCountText}>{injuries.away.injuredPlayers.length}</Text>
                        </View>
                      </View>
                      {injuries.away.injuredPlayers.map((player) => (
                        <View key={player.id} style={styles.injuredPlayerRow}>
                          <View style={[
                            styles.injuryStatusIcon,
                            player.injuryStatus === 'Out' && styles.injuryStatusOut,
                            player.injuryStatus === 'Doubtful' && styles.injuryStatusDoubtful,
                            (player.injuryStatus === 'Injured' || player.injuryStatus === 'GameTimeDecision') && styles.injuryStatusInjured,
                          ]}>
                            <Text style={styles.injuryStatusEmoji}>
                              {player.injuryStatus === 'Out' ? '🔴' : 
                               player.injuryStatus === 'Doubtful' ? '🟡' : '⚕️'}
                            </Text>
                          </View>
                          <View style={styles.injuredPlayerInfo}>
                            <Text style={styles.injuredPlayerName}>
                              {player.jerseyNumber && `${player.jerseyNumber}. `}{player.lastName || player.name}
                            </Text>
                            <Text style={styles.injuryDescription}>
                              {player.injuryDescription || player.injuryStatus}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Head-to-Head Section */}
              {(recentMatches.home.length > 0 || recentMatches.away.length > 0) && (
                <HeadToHeadSection
                  homeTeamName={match.teams.home.name}
                  awayTeamName={match.teams.away.name}
                  homeLogo={match.teams.home.logo}
                  awayLogo={match.teams.away.logo}
                  homeRecentGames={recentMatches.home}
                  awayRecentGames={recentMatches.away}
                  homeTeamId={(match.teams.home as any).msnId}
                  awayTeamId={(match.teams.away as any).msnId}
                />
              )}

              {/* Recent Matches History */}
              {(recentMatches.home.length > 0 || recentMatches.away.length > 0) && (
                <View style={styles.recentMatchesCard}>
                  <Text style={styles.recentMatchesTitle}>📅 Últimos Jogos</Text>
                  
                  <View style={styles.recentMatchesContainer}>
                    {/* Home Team Column */}
                    <View style={styles.recentMatchesColumn}>
                      <View style={styles.recentMatchesHeader}>
                        <TeamLogo uri={match.teams.home.logo} size={24} style={styles.recentTeamLogo} />
                        <Text style={styles.recentTeamName} numberOfLines={1}>
                          {match.teams.home.name}
                        </Text>
                      </View>
                      {recentMatches.home.slice(0, 5).map((game, index) => {
                        const myParticipant = game.participants?.find((p: any) => 
                          p.team?.id?.includes(match.teams.home.id?.toString()) || 
                          p.team?.name?.rawName?.includes(match.teams.home.name) ||
                          match.teams.home.name.includes(p.team?.name?.rawName || "xyz")
                        ) || game.participants?.[0];
                        
                        const opponent = game.participants?.find((p: any) => p !== myParticipant);
                        const outcome = myParticipant?.gameOutcome;
                        const myScore = myParticipant?.result?.score || 0;
                        const opScore = opponent?.result?.score || 0;
                        
                        const outcomeLetter = outcome === 'Won' ? 'V' : outcome === 'Lost' ? 'D' : 'E';
                        const outcomeColor = outcome === 'Won' ? '#22c55e' : outcome === 'Lost' ? '#ef4444' : '#eab308';
                        
                        return (
                          <View key={game.id || index} style={styles.recentMatchRow}>
                            <View style={[styles.recentOutcomeBadge, { backgroundColor: outcomeColor }]}>
                              <Text style={styles.recentOutcomeText}>{outcomeLetter}</Text>
                            </View>
                            <Text style={styles.recentScoreText}>{myScore}-{opScore}</Text>
                            <Text style={styles.recentVsText}>vs</Text>
                            <Text style={styles.recentOpponentName}>{opponent?.team?.abbreviation || opponent?.team?.shortName?.rawName || '???'}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Divider */}
                    <View style={styles.recentMatchesDivider} />

                    {/* Away Team Column */}
                    <View style={styles.recentMatchesColumn}>
                      <View style={styles.recentMatchesHeader}>
                        <TeamLogo uri={match.teams.away.logo} size={24} style={styles.recentTeamLogo} />
                        <Text style={styles.recentTeamName} numberOfLines={1}>
                          {match.teams.away.name}
                        </Text>
                      </View>
                      {recentMatches.away.slice(0, 5).map((game, index) => {
                        const myParticipant = game.participants?.find((p: any) => 
                          p.team?.id?.includes(match.teams.away.id?.toString()) || 
                          p.team?.name?.rawName?.includes(match.teams.away.name) ||
                          match.teams.away.name.includes(p.team?.name?.rawName || "xyz")
                        ) || game.participants?.[0];
                        
                        const opponent = game.participants?.find((p: any) => p !== myParticipant);
                        const outcome = myParticipant?.gameOutcome;
                        const myScore = myParticipant?.result?.score || 0;
                        const opScore = opponent?.result?.score || 0;
                        
                        const outcomeLetter = outcome === 'Won' ? 'V' : outcome === 'Lost' ? 'D' : 'E';
                        const outcomeColor = outcome === 'Won' ? '#22c55e' : outcome === 'Lost' ? '#ef4444' : '#eab308';
                        
                        return (
                          <View key={game.id || index} style={styles.recentMatchRow}>
                            <View style={[styles.recentOutcomeBadge, { backgroundColor: outcomeColor }]}>
                              <Text style={styles.recentOutcomeText}>{outcomeLetter}</Text>
                            </View>
                            <Text style={styles.recentScoreText}>{myScore}-{opScore}</Text>
                            <Text style={styles.recentVsText}>vs</Text>
                            <Text style={styles.recentOpponentName}>{opponent?.team?.abbreviation || opponent?.team?.shortName?.rawName || '???'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}

              {/* Fan Voting / Poll Section */}
              {pollData && pollData.options?.length >= 2 && (() => {
                const homeTeamMsnId = match.teams.home.msnId || '';
                const awayTeamMsnId = match.teams.away.msnId || '';
                
                const homeOption = pollData.options.find(o => 
                  o.id?.includes(homeTeamMsnId) || homeTeamMsnId?.includes(o.id?.split('_').pop() || '')
                );
                const awayOption = pollData.options.find(o => 
                  o.id?.includes(awayTeamMsnId) || awayTeamMsnId?.includes(o.id?.split('_').pop() || '')
                );
                
                const homeVotes = homeOption?.count || 0;
                const awayVotes = awayOption?.count || 0;
                const totalVotes = homeVotes + awayVotes;
                
                if (totalVotes === 0) return null;
                
                const homePercent = Math.round((homeVotes / totalVotes) * 100);
                const awayPercent = Math.round((awayVotes / totalVotes) * 100);
                
                return (
                  <View style={styles.pollCard}>
                    <Text style={styles.pollTitle}>🗳️ Palpite da Torcida</Text>
                    
                    <View style={styles.pollContainer}>
                      {/* Home Team */}
                      <View style={styles.pollTeamRow}>
                        <TeamLogo uri={match.teams.home.logo} size={24} style={styles.pollTeamLogo} />
                        <Text style={styles.pollTeamName} numberOfLines={1}>{match.teams.home.name}</Text>
                        <Text style={styles.pollPercent}>{homePercent}%</Text>
                      </View>
                      <View style={styles.pollBarContainer}>
                        <View style={[styles.pollBar, styles.pollBarHome, { width: `${homePercent}%` }]} />
                      </View>
                      
                      {/* Away Team */}
                      <View style={styles.pollTeamRow}>
                        <TeamLogo uri={match.teams.away.logo} size={24} style={styles.pollTeamLogo} />
                        <Text style={styles.pollTeamName} numberOfLines={1}>{match.teams.away.name}</Text>
                        <Text style={styles.pollPercent}>{awayPercent}%</Text>
                      </View>
                      <View style={styles.pollBarContainer}>
                        <View style={[styles.pollBar, styles.pollBarAway, { width: `${awayPercent}%` }]} />
                      </View>
                      
                      <Text style={styles.pollVoteCount}>{totalVotes.toLocaleString('pt-BR')} votos</Text>
                    </View>
                  </View>
                );
              })()}

              {/* Probabilities (if available from MSN Sports) */}
              {match.probabilities && (
                <View style={styles.probabilitiesCard}>
                  <Text style={styles.probabilitiesTitle}>
                    Probabilidades de Vitória
                  </Text>
                  <View style={styles.probabilitiesContainer}>
                    <View style={styles.probabilityItem}>
                      <Text style={styles.probabilityLabel}>
                        {match.teams.home.name}
                      </Text>
                      <View style={styles.probabilityBarContainer}>
                        <View
                          style={[
                            styles.probabilityBar,
                            styles.homeBar,
                            { width: `${match.probabilities.home}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.probabilityValue}>
                        {match.probabilities.home.toFixed(1)}%
                      </Text>
                    </View>

                    <View style={styles.probabilityItem}>
                      <Text style={styles.probabilityLabel}>Empate</Text>
                      <View style={styles.probabilityBarContainer}>
                        <View
                          style={[
                            styles.probabilityBar,
                            styles.drawBar,
                            { width: `${match.probabilities.draw}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.probabilityValue}>
                        {match.probabilities.draw.toFixed(1)}%
                      </Text>
                    </View>

                    <View style={styles.probabilityItem}>
                      <Text style={styles.probabilityLabel}>
                        {match.teams.away.name}
                      </Text>
                      <View style={styles.probabilityBarContainer}>
                        <View
                          style={[
                            styles.probabilityBar,
                            styles.awayBar,
                            { width: `${match.probabilities.away}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.probabilityValue}>
                        {match.probabilities.away.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.probabilitySource}>
                    Fonte: SportRadar
                  </Text>
                </View>
              )}

              {/* Tabs or Not Started Message */}
              {["NS", "TBD", "PST"].includes(match.fixture.status.short) ? (
                <View style={styles.noStatsContainer}>
                  <View style={styles.emptyIconContainer}>
                    <Text style={styles.emptyIcon}>⏳</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Aguardando Início</Text>
                  <Text style={styles.noStatsText}>
                    Estatísticas e escalações estarão disponíveis assim que a
                    partida começar.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Tabs */}
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[
                        styles.tabButton,
                        activeTab === "stats" && styles.activeTabButton,
                      ]}
                      onPress={() => setActiveTab("stats")}>
                      <Text
                        style={[
                          styles.tabText,
                          activeTab === "stats" && styles.activeTabText,
                        ]}>
                        Estatísticas
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tabButton,
                        activeTab === "timeline" && styles.activeTabButton,
                      ]}
                      onPress={() => setActiveTab("timeline")}>
                      <Text
                        style={[
                          styles.tabText,
                          activeTab === "timeline" && styles.activeTabText,
                        ]}>
                        Timeline
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tabButton,
                        activeTab === "lineups" && styles.activeTabButton,
                      ]}
                      onPress={() => setActiveTab("lineups")}>
                      <Text
                        style={[
                          styles.tabText,
                          activeTab === "lineups" && styles.activeTabText,
                        ]}>
                        Escalações
                      </Text>
                    </TouchableOpacity>
                    {topPlayers && (
                      <TouchableOpacity
                        style={[
                          styles.tabButton,
                          activeTab === "players" && styles.activeTabButton,
                        ]}
                        onPress={() => setActiveTab("players")}>
                        <Text
                          style={[
                            styles.tabText,
                            activeTab === "players" && styles.activeTabText,
                          ]}>
                          Destaques
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Suspense fallback={
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#22c55e" />
                    </View>
                  }>
                    {activeTab === "stats" && (
                      <StatsTab statistics={match.statistics} />
                    )}

                    {activeTab === "timeline" && (
                      <TimelineTab 
                        timelineData={timelineData} 
                        homeTeam={{
                          ...match.teams.home,
                          msnId: (match.teams.home as any).msnId
                        }} 
                        awayTeam={{
                          ...match.teams.away,
                          msnId: (match.teams.away as any).msnId
                        }} 
                      />
                    )}

                    {activeTab === "lineups" && (
                      <LineupsTab 
                        lineups={match.lineups} 
                        homeTeam={match.teams.home} 
                        awayTeam={match.teams.away} 
                        injuries={injuries} 
                      />
                    )}

                    {activeTab === "players" && (
                      <PlayersTab 
                        topPlayers={topPlayers} 
                        playerLeagueStats={playerLeagueStats} 
                        homeTeamName={match.teams.home.name} 
                        awayTeamName={match.teams.away.name} 
                      />
                    )}
                  </Suspense>
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Não foi possível carregar os detalhes.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>

      {/* Team Details Modal - opens when clicking team logo */}
      <TeamDetailsModal
        visible={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
        team={selectedTeam}
        onMatchPress={(m) => {
          setSelectedTeam(null);
          if (onMatchSelect) onMatchSelect(m);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalView: {
    backgroundColor: "#09090b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
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
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingBottom: 40,
  },

  // Scorecard - Modern Design
  scoreCardWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scoreCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  leagueBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 20,
  },
  leagueLogo: {
    width: 18,
    height: 18,
    marginRight: 8,
    resizeMode: "contain",
  },
  leagueName: {
    color: "#d4d4d8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  matchupSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  teamSection: {
    alignItems: "center",
    flex: 1,
    maxWidth: 100,
  },
  teamLogoContainer: {
    marginBottom: 12,
  },
  teamLogoGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },
  teamLogo: {
    width: 52,
    height: 52,
    resizeMode: "contain",
  },
  teamName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },
  scoreSection: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scoreNumber: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    minWidth: 30,
    textAlign: "center",
  },
  scoreDivider: {
    width: 3,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 12,
    borderRadius: 2,
  },
  // Score with penalty container
  scoreWithPenalty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  // Penalty shootout score style for modal
  penaltyScoreModal: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 3,
    opacity: 0.9,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusDotLive: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusDotFinished: {
    backgroundColor: "#22c55e",
  },
  statusText: {
    color: "#d4d4d8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  elapsedTime: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6,
  },
  venueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  venueText: {
    color: "#71717a",
    fontSize: 11,
    marginLeft: 6,
    fontWeight: "500",
  },

  // Legacy styles (keeping for compatibility)
  teamsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  team: {
    alignItems: "center",
    flex: 1,
  },
  scoreContainer: {
    alignItems: "center",
    width: 100,
  },
  score: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 4,
  },
  status: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  time: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "600",
  },
  venue: {
    color: "#71717a",
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  statRow: {
    marginBottom: 16,
  },
  statValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    width: 40,
    textAlign: "center",
  },
  statLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  statBarContainer: {
    flexDirection: "row",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  statBar: {
    height: "100%",
  },
  noStatsContainer: {
    padding: 40,
    alignItems: "center",
  },
  noStatsText: {
    color: "#71717a",
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tabText: {
    color: "#71717a",
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#fff",
  },
  lineupsContainer: {
    paddingHorizontal: 20,
  },
  teamLineup: {
    marginBottom: 24,
  },
  lineupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
    borderRadius: 12,
  },
  smallTeamLogo: {
    width: 24,
    height: 24,
    marginRight: 10,
    resizeMode: "contain",
  },
  lineupTeamName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  formation: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "600",
  },
  lineupSectionTitle: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 8,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  playerPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  playerPhotoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  playerNumber: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "700",
    width: 30,
  },
  playerName: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  playerPosition: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "600",
    width: 30,
    textAlign: "right",
  },
  lineupDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 24,
  },
  coachContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  coachLabel: {
    color: "#a1a1aa",
    fontSize: 14,
    marginRight: 8,
  },
  coachName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  probabilitiesCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  probabilitiesTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  probabilitiesContainer: {
    gap: 12,
  },
  probabilityItem: {
    gap: 6,
  },
  probabilityLabel: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "600",
  },
  probabilityBarContainer: {
    height: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    overflow: "hidden",
  },
  probabilityBar: {
    height: "100%",
    borderRadius: 12,
  },
  homeBar: {
    backgroundColor: "#22c55e",
  },
  drawBar: {
    backgroundColor: "#f59e0b",
  },
  awayBar: {
    backgroundColor: "#ef4444",
  },
  probabilityValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  probabilitySource: {
    color: "#71717a",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
  },
  // Game Details Styles
  gameDetailsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  gameDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  gameDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  gameDetailContent: {
    flex: 1,
  },
  gameDetailTitle: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gameDetailValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  gameDetailSubtext: {
    color: "#a1a1aa",
    fontSize: 13,
  },
  weatherInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  weatherTemp: {
    color: "#f59e0b",
    fontSize: 20,
    fontWeight: "800",
  },
  recordContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  teamRecord: {
    flex: 1,
    alignItems: "center",
  },
  recordTeamName: {
    color: "#a1a1aa",
    fontSize: 12,
    marginBottom: 4,
  },
  recordStats: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Players / Destaques Tab Styles
  // Injuries / Departamento Médico Styles
  injuriesCard: {
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.15)",
  },
  injuriesTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  teamInjuries: {
    marginBottom: 16,
  },
  teamInjuryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  injuryTeamLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  teamInjuryName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  injuryCountBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  injuryCountText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "700",
  },
  injuredPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingLeft: 8,
  },
  injuryStatusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  injuryStatusOut: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  injuryStatusDoubtful: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
  },
  injuryStatusInjured: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  injuryStatusEmoji: {
    fontSize: 14,
  },
  injuredPlayerInfo: {
    flex: 1,
  },
  injuredPlayerName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  injuryDescription: {
    color: "#a1a1aa",
    fontSize: 12,
    marginTop: 2,
  },

  // Lineup injury indicator styles
  playerNameInjured: {
    color: "#ef4444",
    opacity: 0.8,
  },
  playerInjuryBadge: {
    fontSize: 10,
    marginLeft: 4,
    marginRight: 4,
  },

  // Injury Legend Styles
  injuryLegend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendEmoji: {
    fontSize: 12,
  },
  legendText: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "500",
  },

  // Team Stats Summary Styles
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
  positionBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  positionText: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "700",
  },

  // Recent Matches Styles
  recentMatchesCard: {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  recentMatchesTitle: {
    color: "#e4e4e7",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  recentMatchesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recentMatchesColumn: {
    flex: 1,
  },
  recentMatchesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 6,
  },
  recentTeamLogo: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  recentTeamName: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "600",
    maxWidth: 80,
  },
  recentMatchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    gap: 6,
  },
  recentOutcomeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  recentOutcomeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  recentScoreText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "600",
    minWidth: 28,
    textAlign: "center",
  },
  recentVsText: {
    color: "#52525b",
    fontSize: 9,
  },
  recentOpponentLogo: {
    width: 16,
    height: 16,
    resizeMode: "contain",
  },
  recentMatchesDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 8,
  },
  recentOpponentName: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "600",
    minWidth: 30,
  },

  // Poll / Fan Voting Styles
  pollCard: {
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  pollTitle: {
    color: "#e4e4e7",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  pollContainer: {
    gap: 8,
  },
  pollTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  pollTeamLogo: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  pollTeamName: {
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  pollPercent: {
    color: "#a78bfa",
    fontSize: 14,
    fontWeight: "700",
  },
  pollBarContainer: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  pollBar: {
    height: "100%",
    borderRadius: 4,
  },
  pollBarHome: {
    backgroundColor: "#22c55e",
  },
  pollBarAway: {
    backgroundColor: "#ef4444",
  },
  pollVoteCount: {
    color: "#71717a",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
});
