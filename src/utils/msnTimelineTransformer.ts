export interface GoalEvent {
  minute: string;
  period: 1 | 2; // 1 = primeiro tempo, 2 = segundo tempo
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
  isPenalty?: boolean;
  isOwnGoal?: boolean;
  isDisallowed?: boolean; // Gol anulado (VAR, impedimento, etc.)
}

export interface CardEvent {
  minute: string;
  player: {
    name: string;
    number: number;
  };
  teamId: string;
  cardType: "yellow" | "red" | "yellow-red"; // yellow-red = segundo amarelo
  reason?: string;
}

export interface SubstitutionEvent {
  minute: string;
  playerIn: {
    name: string;
    number: number;
  };
  playerOut: {
    name: string;
    number: number;
  };
  teamId: string;
}

export interface VAREvent {
  minute: string;
  description: string;
  teamId: string;
  decision: string; // "Goal Confirmed", "Penalty Awarded", "Goal Disallowed", etc.
}

export interface MatchEvent {
  type:
    | "goal"
    | "card"
    | "substitution"
    | "var"
    | "penalty-missed"
    | "period-start"
    | "period-end";
  minute: string;
  teamId: string;
  data: GoalEvent | CardEvent | SubstitutionEvent | VAREvent | any;
}

export interface MatchTimeline {
  goals: GoalEvent[];
  cards: CardEvent[];
  substitutions: SubstitutionEvent[];
  varDecisions: VAREvent[];
  allEvents: MatchEvent[];
}

/**
 * Transform MSN Sports timeline to structured match events
 */
export function transformMsnTimeline(timelineData: any): MatchTimeline {
  const result: MatchTimeline = {
    goals: [],
    cards: [],
    substitutions: [],
    varDecisions: [],
    allEvents: [],
  };

  if (
    !timelineData ||
    !timelineData.timelines ||
    !Array.isArray(timelineData.timelines)
  ) {
    return result;
  }

  for (const timeline of timelineData.timelines) {
    if (!timeline.events || !Array.isArray(timeline.events)) continue;

    for (const event of timeline.events) {
      const minute = event.gameClock?.minutes?.toString() || event.time || "0";
      const teamId = event.teamId || "";

      // Determinar o período baseado no minuto ou no campo period da API
      const eventPeriod = event.period?.number || event.playingPeriod?.number;
      const minuteNum = parseInt(minute) || 0;
      const period: 1 | 2 =
        eventPeriod === "2" || eventPeriod === 2 || minuteNum > 45 ? 2 : 1;

      switch (event.eventType) {
        case "ScoreChange": {
          // GOL
          const playerName =
            event.player?.name?.rawName ||
            `${event.player?.firstName?.rawName || ""} ${
              event.player?.lastName?.rawName || ""
            }`.trim() ||
            "Desconhecido";
          const playerNumber = parseInt(event.player?.jerseyNumber) || 0;

          let assist = undefined;
          if (event.assistantPlayers && event.assistantPlayers.length > 0) {
            const assistPlayer = event.assistantPlayers[0];
            assist = {
              name:
                assistPlayer.name?.rawName ||
                `${assistPlayer.firstName?.rawName || ""} ${
                  assistPlayer.lastName?.rawName || ""
                }`.trim() ||
                "Desconhecido",
              number: parseInt(assistPlayer.jerseyNumber) || 0,
            };
          }

          const isPenalty =
            event.scoreChangeType === "Penalty" ||
            event.description?.toLowerCase().includes("penalty") ||
            event.description?.toLowerCase().includes("pênalti");

          const isOwnGoal =
            event.scoreChangeType === "OwnGoal" ||
            event.description?.toLowerCase().includes("own goal") ||
            event.description?.toLowerCase().includes("gol contra");

          // Detectar gol anulado
          const descLower = (event.description || "").toLowerCase();
          const isDisallowed =
            event.scoreChangeType === "Disallowed" ||
            event.isDisallowed === true ||
            event.status === "Disallowed" ||
            descLower.includes("disallowed") ||
            descLower.includes("anulado") ||
            descLower.includes("offside") ||
            descLower.includes("impedimento") ||
            (descLower.includes("var") && descLower.includes("no goal")) ||
            descLower.includes("ruled out");

          const goal: GoalEvent = {
            minute,
            period,
            player: { name: playerName, number: playerNumber },
            assist,
            teamId,
            description: event.description || "",
            isPenalty,
            isOwnGoal,
            isDisallowed,
          };

          result.goals.push(goal);
          result.allEvents.push({ type: "goal", minute, teamId, data: goal });
          break;
        }

        case "Card": {
          // CARTÃO (amarelo, vermelho, segundo amarelo)
          const playerName =
            event.player?.name?.rawName ||
            `${event.player?.firstName?.rawName || ""} ${
              event.player?.lastName?.rawName || ""
            }`.trim() ||
            "Desconhecido";
          const playerNumber = parseInt(event.player?.jerseyNumber) || 0;

          let cardType: "yellow" | "red" | "yellow-red" = "yellow";
          if (event.cardType === "Red" || event.cardColor === "Red") {
            cardType = "red";
          } else if (
            event.cardType === "YellowRed" ||
            event.cardType === "SecondYellow"
          ) {
            cardType = "yellow-red";
          }

          const card: CardEvent = {
            minute,
            player: { name: playerName, number: playerNumber },
            teamId,
            cardType,
            reason: event.description || event.foulDescription || undefined,
          };

          result.cards.push(card);
          result.allEvents.push({ type: "card", minute, teamId, data: card });
          break;
        }

        case "Substitution": {
          // SUBSTITUIÇÃO
          const playerInName =
            event.playerIn?.name?.rawName ||
            `${event.playerIn?.firstName?.rawName || ""} ${
              event.playerIn?.lastName?.rawName || ""
            }`.trim() ||
            "Desconhecido";
          const playerInNumber = parseInt(event.playerIn?.jerseyNumber) || 0;

          const playerOutName =
            event.playerOut?.name?.rawName ||
            `${event.playerOut?.firstName?.rawName || ""} ${
              event.playerOut?.lastName?.rawName || ""
            }`.trim() ||
            "Desconhecido";
          const playerOutNumber = parseInt(event.playerOut?.jerseyNumber) || 0;

          const substitution: SubstitutionEvent = {
            minute,
            playerIn: { name: playerInName, number: playerInNumber },
            playerOut: { name: playerOutName, number: playerOutNumber },
            teamId,
          };

          result.substitutions.push(substitution);
          result.allEvents.push({
            type: "substitution",
            minute,
            teamId,
            data: substitution,
          });
          break;
        }

        case "VAR":
        case "VideoAssistantReferee": {
          // DECISÃO VAR
          const varEvent: VAREvent = {
            minute,
            description: event.description || "Revisão VAR",
            teamId,
            decision: event.varDecision || event.decision || "Em análise",
          };

          result.varDecisions.push(varEvent);
          result.allEvents.push({
            type: "var",
            minute,
            teamId,
            data: varEvent,
          });
          break;
        }

        case "PenaltyMissed":
        case "PenaltySaved": {
          // PÊNALTI PERDIDO
          const playerName = event.player?.name?.rawName || "Desconhecido";
          result.allEvents.push({
            type: "penalty-missed",
            minute,
            teamId,
            data: {
              player: playerName,
              description: event.description || "Pênalti perdido",
            },
          });
          break;
        }

        case "PeriodStart":
        case "PeriodEnd": {
          // INÍCIO/FIM DE PERÍODO
          result.allEvents.push({
            type:
              event.eventType === "PeriodStart" ? "period-start" : "period-end",
            minute,
            teamId: "",
            data: {
              period: event.period || event.periodNumber || 1,
              description: event.description || "",
            },
          });
          break;
        }

        case "GoalDisallowed":
        case "DisallowedGoal": {
          // GOL ANULADO (evento específico)
          const playerName =
            event.player?.name?.rawName ||
            `${event.player?.firstName?.rawName || ""} ${
              event.player?.lastName?.rawName || ""
            }`.trim() ||
            "Desconhecido";
          const playerNumber = parseInt(event.player?.jerseyNumber) || 0;

          const goal: GoalEvent = {
            minute,
            period,
            player: { name: playerName, number: playerNumber },
            teamId,
            description: event.description || "Gol anulado",
            isDisallowed: true,
          };

          result.goals.push(goal);
          result.allEvents.push({ type: "goal", minute, teamId, data: goal });
          break;
        }
      }
    }
  }

  // Ordenar todos os eventos por minuto
  result.allEvents.sort((a, b) => parseInt(a.minute) - parseInt(b.minute));

  return result;
}

/**
 * Transform MSN Sports timeline to goal events (backward compatibility)
 */
export function transformMsnTimelineToGoals(timelineData: any): GoalEvent[] {
  return transformMsnTimeline(timelineData).goals;
}

/**
 * Get formatted event description for UI
 */
export function getEventDescription(event: MatchEvent): string {
  switch (event.type) {
    case "goal": {
      const goal = event.data as GoalEvent;
      if (goal.isDisallowed) {
        return `❌ ${goal.minute}' - GOL ANULADO: ${goal.player.name}${
          goal.description ? ` (${goal.description})` : ""
        }`;
      }
      let desc = `⚽ ${goal.minute}' - GOL! ${goal.player.name}`;
      if (goal.isPenalty) desc += " (Pênalti)";
      if (goal.isOwnGoal) desc += " (Gol Contra)";
      if (goal.assist) desc += ` | Assistência: ${goal.assist.name}`;
      return desc;
    }
    case "card": {
      const card = event.data as CardEvent;
      const cardEmoji =
        card.cardType === "red"
          ? "🟥"
          : card.cardType === "yellow-red"
          ? "🟨🟥"
          : "🟨";
      const cardName =
        card.cardType === "red"
          ? "VERMELHO"
          : card.cardType === "yellow-red"
          ? "SEGUNDO AMARELO"
          : "AMARELO";
      return `${cardEmoji} ${card.minute}' - ${cardName}: ${card.player.name}${
        card.reason ? ` (${card.reason})` : ""
      }`;
    }
    case "substitution": {
      const sub = event.data as SubstitutionEvent;
      return `🔄 ${sub.minute}' - Substituição: ⬆️ ${sub.playerIn.name} ⬇️ ${sub.playerOut.name}`;
    }
    case "var": {
      const varEvent = event.data as VAREvent;
      return `📺 ${varEvent.minute}' - VAR: ${varEvent.decision}`;
    }
    case "penalty-missed":
      return `❌ ${event.minute}' - Pênalti perdido: ${event.data.player}`;
    default:
      return "";
  }
}
