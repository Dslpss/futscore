import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
} from "react-native";
import { TeamLogo } from "./TeamLogo";
import { LinearGradient } from "expo-linear-gradient";
import {
  MatchTimeline,
  MatchEvent,
  GoalEvent,
  CardEvent,
  SubstitutionEvent,
  VAREvent,
} from "../utils/msnTimelineTransformer";

interface MatchTimelineSectionProps {
  timeline: MatchTimeline;
  homeTeam: {
    id: number | string;
    name: string;
    logo: string;
    msnId?: string;
  };
  awayTeam: {
    id: number | string;
    name: string;
    logo: string;
    msnId?: string;
  };
}

/** Determine if event belongs to home team */
function isHomeTeamEvent(
  teamId: string,
  homeTeam: MatchTimelineSectionProps["homeTeam"]
): boolean {
  if (!teamId) return true; // default to center/home
  const homeIdStr = homeTeam.id?.toString() || "";
  const homeMsnId = homeTeam.msnId || "";
  return (
    teamId.includes(homeIdStr) ||
    teamId === homeMsnId ||
    teamId.toLowerCase().includes("home")
  );
}

/** Get event icon */
function getEventIcon(event: MatchEvent): string {
  switch (event.type) {
    case "goal": {
      const goal = event.data as GoalEvent;
      if (goal.isDisallowed) return "❌";
      if (goal.isPenalty) return "⚽";
      if (goal.isOwnGoal) return "🥅";
      return "⚽";
    }
    case "card": {
      const card = event.data as CardEvent;
      if (card.cardType === "red") return "🟥";
      if (card.cardType === "yellow-red") return "🟨🟥";
      return "🟨";
    }
    case "substitution":
      return "🔄";
    case "var":
      return "📺";
    case "penalty-missed":
      return "❌";
    case "period-start":
      return "🏁";
    case "period-end":
      return "🔔";
    default:
      return "📌";
  }
}

/** Get event accent color */
function getEventAccentColor(event: MatchEvent): string {
  switch (event.type) {
    case "goal": {
      const goal = event.data as GoalEvent;
      if (goal.isDisallowed) return "#6b7280";
      return "#22c55e";
    }
    case "card": {
      const card = event.data as CardEvent;
      if (card.cardType === "red" || card.cardType === "yellow-red")
        return "#ef4444";
      return "#eab308";
    }
    case "substitution":
      return "#3b82f6";
    case "var":
      return "#8b5cf6";
    case "penalty-missed":
      return "#ef4444";
    case "period-start":
    case "period-end":
      return "#71717a";
    default:
      return "#71717a";
  }
}

/** Get event gradient colors */
function getEventGradient(event: MatchEvent): [string, string] {
  switch (event.type) {
    case "goal": {
      const goal = event.data as GoalEvent;
      if (goal.isDisallowed)
        return ["rgba(107,114,128,0.15)", "rgba(107,114,128,0.05)"];
      return ["rgba(34,197,94,0.15)", "rgba(34,197,94,0.05)"];
    }
    case "card": {
      const card = event.data as CardEvent;
      if (card.cardType === "red" || card.cardType === "yellow-red")
        return ["rgba(239,68,68,0.15)", "rgba(239,68,68,0.05)"];
      return ["rgba(234,179,8,0.15)", "rgba(234,179,8,0.05)"];
    }
    case "substitution":
      return ["rgba(59,130,246,0.15)", "rgba(59,130,246,0.05)"];
    case "var":
      return ["rgba(139,92,246,0.15)", "rgba(139,92,246,0.05)"];
    case "penalty-missed":
      return ["rgba(239,68,68,0.15)", "rgba(239,68,68,0.05)"];
    default:
      return ["rgba(113,113,122,0.15)", "rgba(113,113,122,0.05)"];
  }
}

/** Format event title */
function getEventTitle(event: MatchEvent): string {
  switch (event.type) {
    case "goal": {
      const goal = event.data as GoalEvent;
      if (goal.isDisallowed) return "GOL ANULADO";
      if (goal.isPenalty) return "GOL DE PÊNALTI";
      if (goal.isOwnGoal) return "GOL CONTRA";
      return "GOOOOL!";
    }
    case "card": {
      const card = event.data as CardEvent;
      if (card.cardType === "red") return "CARTÃO VERMELHO";
      if (card.cardType === "yellow-red") return "2º AMARELO";
      return "CARTÃO AMARELO";
    }
    case "substitution":
      return "SUBSTITUIÇÃO";
    case "var":
      return "VAR";
    case "penalty-missed":
      return "PÊNALTI PERDIDO";
    case "period-start":
      return "INÍCIO";
    case "period-end":
      return "FIM";
    default:
      return "";
  }
}

/** Get event details */
function getEventDetails(event: MatchEvent): {
  primary: string;
  secondary?: string;
  extra?: string;
} {
  switch (event.type) {
    case "goal": {
      const goal = event.data as GoalEvent;
      return {
        primary: `${goal.player.number ? goal.player.number + ". " : ""}${goal.player.name}`,
        secondary: goal.assist
          ? `Assist: ${goal.assist.name}`
          : undefined,
        extra: goal.isDisallowed ? goal.description : undefined,
      };
    }
    case "card": {
      const card = event.data as CardEvent;
      return {
        primary: `${card.player.number ? card.player.number + ". " : ""}${card.player.name}`,
        secondary: card.reason || undefined,
      };
    }
    case "substitution": {
      const sub = event.data as SubstitutionEvent;
      return {
        primary: `⬆️ ${sub.playerIn.name}`,
        secondary: `⬇️ ${sub.playerOut.name}`,
      };
    }
    case "var": {
      const varEv = event.data as VAREvent;
      return {
        primary: varEv.decision,
        secondary: varEv.description,
      };
    }
    case "penalty-missed":
      return {
        primary: event.data.player || "Desconhecido",
        secondary: event.data.description,
      };
    case "period-start":
    case "period-end": {
      const periodNum = event.data.period;
      const pName =
        periodNum === 1 || periodNum === "1"
          ? "1º Tempo"
          : periodNum === 2 || periodNum === "2"
          ? "2º Tempo"
          : `Período ${periodNum}`;
      return { primary: pName };
    }
    default:
      return { primary: "" };
  }
}

// Animated timeline event row
const TimelineEventRow: React.FC<{
  event: MatchEvent;
  isHome: boolean;
  isPeriodMarker: boolean;
  index: number;
  teamLogo?: string;
}> = React.memo(({ event, isHome, isPeriodMarker, index, teamLogo }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isPeriodMarker ? 0 : isHome ? -30 : 30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (isPeriodMarker) {
    const details = getEventDetails(event);
    const isStart = event.type === "period-start";
    return (
      <Animated.View
        style={[
          tlStyles.periodMarker,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={tlStyles.periodLine} />
        <View style={tlStyles.periodBadge}>
          <Text style={tlStyles.periodBadgeIcon}>{isStart ? "▶" : "⏸"}</Text>
          <Text style={tlStyles.periodBadgeText}>
            {isStart ? `${details.primary}` : `Fim – ${details.primary}`}
          </Text>
        </View>
        <View style={tlStyles.periodLine} />
      </Animated.View>
    );
  }

  const accentColor = getEventAccentColor(event);
  const gradient = getEventGradient(event);
  const icon = getEventIcon(event);
  const title = getEventTitle(event);
  const details = getEventDetails(event);

  return (
    <Animated.View
      style={[
        tlStyles.eventRow,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      {/* Left side content (home) */}
      <View style={[tlStyles.eventSide, tlStyles.eventSideLeft]}>
        {isHome && (
          <LinearGradient
            colors={gradient}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[tlStyles.eventCard, tlStyles.eventCardLeft]}
          >
            <View style={tlStyles.eventCardHeader}>
              <Text style={[tlStyles.eventTitle, { color: accentColor }]}>
                {title}
              </Text>
              <View style={[tlStyles.minuteBadge, { borderColor: accentColor }]}>
                <Text style={[tlStyles.minuteText, { color: accentColor }]}>
                  {event.minute}'
                </Text>
              </View>
            </View>
            <Text style={tlStyles.eventPrimary} numberOfLines={1}>
              {details.primary}
            </Text>
            {details.secondary && (
              <Text style={tlStyles.eventSecondary} numberOfLines={1}>
                {details.secondary}
              </Text>
            )}
            {details.extra && (
              <Text style={tlStyles.eventExtra} numberOfLines={2}>
                {details.extra}
              </Text>
            )}
          </LinearGradient>
        )}
      </View>

      {/* Center timeline spine */}
      <View style={tlStyles.spineContainer}>
        <View style={[tlStyles.spineLine, { backgroundColor: accentColor + "40" }]} />
        <View style={[tlStyles.spineNode, { backgroundColor: accentColor, borderColor: accentColor + "60" }]}>
          <Text style={tlStyles.spineIcon}>{icon}</Text>
        </View>
        <View style={[tlStyles.spineLine, { backgroundColor: accentColor + "40" }]} />
      </View>

      {/* Right side content (away) */}
      <View style={[tlStyles.eventSide, tlStyles.eventSideRight]}>
        {!isHome && (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[tlStyles.eventCard, tlStyles.eventCardRight]}
          >
            <View style={tlStyles.eventCardHeader}>
              <View style={[tlStyles.minuteBadge, { borderColor: accentColor }]}>
                <Text style={[tlStyles.minuteText, { color: accentColor }]}>
                  {event.minute}'
                </Text>
              </View>
              <Text style={[tlStyles.eventTitle, { color: accentColor }]}>
                {title}
              </Text>
            </View>
            <Text style={tlStyles.eventPrimary} numberOfLines={1}>
              {details.primary}
            </Text>
            {details.secondary && (
              <Text style={tlStyles.eventSecondary} numberOfLines={1}>
                {details.secondary}
              </Text>
            )}
            {details.extra && (
              <Text style={tlStyles.eventExtra} numberOfLines={2}>
                {details.extra}
              </Text>
            )}
          </LinearGradient>
        )}
      </View>
    </Animated.View>
  );
});

export const MatchTimelineSection: React.FC<MatchTimelineSectionProps> = ({
  timeline,
  homeTeam,
  awayTeam,
}) => {
  // Filter out period events that don't add value, keep goals/cards/subs/var/penalty-missed
  const significantEvents = timeline.allEvents.filter(
    (e) =>
      e.type === "goal" ||
      e.type === "card" ||
      e.type === "substitution" ||
      e.type === "var" ||
      e.type === "penalty-missed" ||
      e.type === "period-start" ||
      e.type === "period-end"
  );

  if (significantEvents.length === 0) {
    return (
      <View style={tlStyles.emptyContainer}>
        <Text style={tlStyles.emptyIcon}>📋</Text>
        <Text style={tlStyles.emptyTitle}>Sem eventos registrados</Text>
        <Text style={tlStyles.emptySubtitle}>
          Os eventos aparecerão aqui conforme o jogo acontece
        </Text>
      </View>
    );
  }

  // Summary counters
  const goalCount = timeline.goals.filter((g) => !g.isDisallowed).length;
  const cardCount = timeline.cards.length;
  const subCount = timeline.substitutions.length;
  const varCount = timeline.varDecisions.length;

  return (
    <View style={tlStyles.container}>
      {/* Section Header */}
      <Text style={tlStyles.sectionTitle}>Linha do Tempo</Text>

      {/* Summary badges */}
      <View style={tlStyles.summaryRow}>
        {goalCount > 0 && (
          <View style={[tlStyles.summaryBadge, { backgroundColor: "rgba(34,197,94,0.12)" }]}>
            <Text style={tlStyles.summaryEmoji}>⚽</Text>
            <Text style={[tlStyles.summaryCount, { color: "#22c55e" }]}>
              {goalCount}
            </Text>
          </View>
        )}
        {cardCount > 0 && (
          <View style={[tlStyles.summaryBadge, { backgroundColor: "rgba(234,179,8,0.12)" }]}>
            <Text style={tlStyles.summaryEmoji}>🟨</Text>
            <Text style={[tlStyles.summaryCount, { color: "#eab308" }]}>
              {cardCount}
            </Text>
          </View>
        )}
        {subCount > 0 && (
          <View style={[tlStyles.summaryBadge, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
            <Text style={tlStyles.summaryEmoji}>🔄</Text>
            <Text style={[tlStyles.summaryCount, { color: "#3b82f6" }]}>
              {subCount}
            </Text>
          </View>
        )}
        {varCount > 0 && (
          <View style={[tlStyles.summaryBadge, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
            <Text style={tlStyles.summaryEmoji}>📺</Text>
            <Text style={[tlStyles.summaryCount, { color: "#8b5cf6" }]}>
              {varCount}
            </Text>
          </View>
        )}
      </View>

      {/* Team header row */}
      <View style={tlStyles.teamHeaderRow}>
        <View style={tlStyles.teamHeaderSide}>
          <TeamLogo uri={homeTeam.logo} size={24} style={tlStyles.teamHeaderLogo} />
          <Text style={tlStyles.teamHeaderName} numberOfLines={1}>
            {homeTeam.name}
          </Text>
        </View>
        <View style={tlStyles.teamHeaderCenter}>
          <Text style={tlStyles.vsText}>VS</Text>
        </View>
        <View style={[tlStyles.teamHeaderSide, { alignItems: "flex-end" }]}>
          <Text style={tlStyles.teamHeaderName} numberOfLines={1}>
            {awayTeam.name}
          </Text>
          <TeamLogo uri={awayTeam.logo} size={24} style={tlStyles.teamHeaderLogo} />
        </View>
      </View>

      {/* Timeline events */}
      <View style={tlStyles.timelineContainer}>
        {significantEvents.map((event, index) => {
          const isPeriodMarker =
            event.type === "period-start" || event.type === "period-end";
          const isHome = isPeriodMarker
            ? true
            : isHomeTeamEvent(event.teamId, homeTeam);

          return (
            <TimelineEventRow
              key={`${event.type}-${event.minute}-${index}`}
              event={event}
              isHome={isHome}
              isPeriodMarker={isPeriodMarker}
              index={index}
              teamLogo={isHome ? homeTeam.logo : awayTeam.logo}
            />
          );
        })}
      </View>
    </View>
  );
};

const tlStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },

  // Summary badges
  summaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  summaryEmoji: {
    fontSize: 14,
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Team header
  teamHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  teamHeaderSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamHeaderCenter: {
    width: 40,
    alignItems: "center",
  },
  teamHeaderLogo: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  teamHeaderName: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  vsText: {
    color: "#52525b",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // Timeline
  timelineContainer: {
    position: "relative",
  },

  // Period markers
  periodMarker: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  periodLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(113,113,122,0.3)",
  },
  periodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(113,113,122,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 8,
    gap: 6,
  },
  periodBadgeIcon: {
    fontSize: 10,
    color: "#71717a",
  },
  periodBadgeText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // Event row
  eventRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 72,
    marginVertical: 2,
  },
  eventSide: {
    flex: 1,
    justifyContent: "center",
  },
  eventSideLeft: {
    alignItems: "flex-end",
    paddingRight: 8,
  },
  eventSideRight: {
    alignItems: "flex-start",
    paddingLeft: 8,
  },

  // Spine (center line)
  spineContainer: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  spineLine: {
    width: 2,
    flex: 1,
    minHeight: 8,
  },
  spineNode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  spineIcon: {
    fontSize: 14,
  },

  // Event card
  eventCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    maxWidth: "100%",
    width: "100%",
  },
  eventCardLeft: {
    borderTopRightRadius: 14,
    borderBottomRightRadius: 4,
  },
  eventCardRight: {
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 4,
  },
  eventCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  minuteBadge: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  minuteText: {
    fontSize: 11,
    fontWeight: "800",
  },
  eventTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    flex: 1,
  },
  eventPrimary: {
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: "600",
  },
  eventSecondary: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  eventExtra: {
    color: "#71717a",
    fontSize: 10,
    fontStyle: "italic",
    marginTop: 2,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#a1a1aa",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#71717a",
    fontSize: 13,
    textAlign: "center",
  },
});
