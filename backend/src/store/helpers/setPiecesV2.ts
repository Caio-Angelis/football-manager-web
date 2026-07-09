// Bola parada & árbitro — Fase 7 da checklist do motor v2
// Bola parada responde por ~25-30% dos gols.
// Faltas/cartões emergem de duelos + aggression/dirtiness, não sorteio puro.
// Expulsão dispara reorganização estrutural por zona, não só -1 força.

import type { Team, Player, MatchAction, MatchEvent, LiveMatchState } from '../../types/game';
import { effectiveStrength } from './roles';
import { computeZoneOccupancy, occupantsInZone, type ZoneOccupant } from './zones';

// ============================================================
// 7.1 — Bola parada (escanteios, faltas, pênaltis)
// ============================================================

/**
 * Simula cobrança de escanteio no v2.
 * xG base de escanteio: ~0.03 (baixo, mas volume alto).
 */
export function simulateCornerV2(
  attackingTeam: Team,
  defendingTeam: Team,
  state: LiveMatchState,
  minute: number,
  side: 'home' | 'away',
  rng: () => number,
): { actions: MatchAction[]; events: MatchEvent[]; state: LiveMatchState; isGoal: boolean } {
  const actions: MatchAction[] = [];
  const events: MatchEvent[] = [];
  let newState = { ...state };
  let isGoal = false;

  const setPieces = attackingTeam.tacticsConfig?.setPieces;
  const corner = setPieces?.corners;
  const taker = attackingTeam.squad.find(p => p.id === corner?.takerId)
    ?? attackingTeam.squad.find(p => p.position === 'MID' || p.position === 'DEF')
    ?? attackingTeam.squad[0];
  const target = attackingTeam.squad.find(p => p.id === corner?.targetId)
    ?? attackingTeam.squad.find(p => p.position === 'FWD')
    ?? attackingTeam.squad[0];

  // Qualidade do cruzamento
  const crossingAttr = taker.technical?.crossing ?? 10;
  const headingAttr = target.technical?.heading ?? 10;
  const jumpingAttr = target.physical?.jumping ?? 10;

  // Defensor mais forte na área
  const defOccupants = computeZoneOccupancy(defendingTeam, side !== 'home');
  const areaDefenders = occupantsInZone(defOccupants, { third: 'attacking', flank: 'center' }, 0.30);
  const bestDefender = areaDefenders.reduce((best, o) =>
    o.strength > (best?.strength ?? 0) ? o : best, null as ZoneOccupant | null);

  const defMarking = bestDefender
    ? (bestDefender.player.technical?.marking ?? 10) + (bestDefender.player.technical?.heading ?? 10)
    : 15;

  // xG do escanteio
  const baseXG = 0.03;
  const deliveryMod = corner?.delivery === 'near_post' ? 1.2
    : corner?.delivery === 'far_post' ? 1.1
    : corner?.delivery === 'penalty_area' ? 1.0
    : corner?.delivery === 'short' ? 0.5
    : 1.0;
  const xg = baseXG * deliveryMod * ((headingAttr + jumpingAttr) / 30) * (20 / (defMarking + 10));

  // Resultado
  const goalRoll = rng();
  const goalThreshold = xg * 1.5; // escanteios convertem menos que xG puro
  isGoal = goalRoll < goalThreshold;

  actions.push({
    minute,
    type: 'cross',
    team: side,
    playerId: taker.id,
    playerName: taker.name,
    success: isGoal,
    description: isGoal
      ? `GOL de escanteio! ${target.name} cabeceia o cruzamento de ${taker.name}!`
      : `${taker.name} cobra escanteio — ${bestDefender?.player.name ?? 'defesa'} afasta`,
    ballPos: side === 'home' ? 0.85 : 0.15,
  });

  if (isGoal) {
    if (side === 'home') newState.homeGoals = state.homeGoals + 1;
    else newState.awayGoals = state.awayGoals + 1;

    events.push({
      minute,
      type: 'goal',
      team: side,
      player: target.name,
      description: `GOOOL! ${target.name} marca de cabeça em escanteio de ${taker.name}!`,
    });

    newState.goalDetails = [...(state.goalDetails ?? []), {
      team: side,
      minute,
      scorerId: target.id,
      scorerName: target.name,
      assistId: taker.id,
      assistName: taker.name,
    }];

    // Marca origem como bola parada
    newState.chancesByOrigin = {
      ...newState.chancesByOrigin,
      bolaParada: (newState.chancesByOrigin?.bolaParada ?? 0) + 1,
    };

    // Reinicia
    newState.possession = side === 'home' ? 'away' : 'home';
    newState.ballPos = 0.5;
    newState.ballPosY = 0.5;
    newState.ballHolderId = (side === 'home' ? defendingTeam : attackingTeam).squad[0].id;
    newState.passChain = 0;
  } else {
    // Defesa — posse para o goleiro ou contra-ataque
    if (rng() < 0.15 && defendingTeam.afterGainingPossession === 'counterAttack') {
      // Contra-ataque após escanteio defendido
      newState.possession = side === 'home' ? 'away' : 'home';
      const gk = defendingTeam.squad.find(p => p.position === 'GK') ?? defendingTeam.squad[0];
      newState.ballHolderId = gk.id;
      newState.passChain = 0;
      newState.transitionTicks = 3;
    } else {
      newState.possession = side === 'home' ? 'away' : 'home';
      const gk = defendingTeam.squad.find(p => p.position === 'GK') ?? defendingTeam.squad[0];
      newState.ballHolderId = gk.id;
      newState.passChain = 0;
      newState.ballPos = side === 'home' ? 0.85 : 0.15;
    }
  }

  return { actions, events, state: newState, isGoal };
}

/**
 * Simula cobrança de falta no v2.
 */
export function simulateFreeKickV2(
  attackingTeam: Team,
  defendingTeam: Team,
  state: LiveMatchState,
  minute: number,
  side: 'home' | 'away',
  attackProgress: number,
  rng: () => number,
): { actions: MatchAction[]; events: MatchEvent[]; state: LiveMatchState; isGoal: boolean } {
  const actions: MatchAction[] = [];
  const events: MatchEvent[] = [];
  let newState = { ...state };
  let isGoal = false;

  const setPieces = attackingTeam.tacticsConfig?.setPieces;
  const fk = setPieces?.freeKicks;
  const taker = attackingTeam.squad.find(p => p.id === fk?.takerId)
    ?? attackingTeam.squad.find(p => p.position === 'MID')
    ?? attackingTeam.squad[0];

  const delivery = fk?.delivery ?? 'cross_into_box';
  const gk = defendingTeam.squad.find(p => p.position === 'GK') ?? defendingTeam.squad[0];

  if (delivery === 'shot_on_goal' && attackProgress > 0.7) {
    // Tiro direto
    const freeKickAttr = taker.technical?.freeKicks ?? 10;
    const gkReflexes = gk.goalkeeping?.reflexes ?? 10;
    const xg = 0.08 * (freeKickAttr / 20) * (20 / (gkReflexes + 10));
    isGoal = rng() < xg * 1.2;

    actions.push({
      minute,
      type: 'shot',
      team: side,
      playerId: taker.id,
      playerName: taker.name,
      success: isGoal,
      description: isGoal
        ? `GOL! ${taker.name} acerta um golaço de falta!`
        : `${taker.name} cobra a falta — ${gk.name} defende!`,
      ballPos: side === 'home' ? 0.85 : 0.15,
    });

    if (isGoal) {
      if (side === 'home') newState.homeGoals = state.homeGoals + 1;
      else newState.awayGoals = state.awayGoals + 1;

      events.push({
        minute,
        type: 'goal',
        team: side,
        player: taker.name,
        description: `GOOOL! ${taker.name} marca de falta!`,
      });

      newState.goalDetails = [...(state.goalDetails ?? []), {
        team: side,
        minute,
        scorerId: taker.id,
        scorerName: taker.name,
      }];

      newState.chancesByOrigin = {
        ...newState.chancesByOrigin,
        bolaParada: (newState.chancesByOrigin?.bolaParada ?? 0) + 1,
      };

      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballPos = 0.5;
      newState.ballPosY = 0.5;
      newState.ballHolderId = (side === 'home' ? defendingTeam : attackingTeam).squad[0].id;
      newState.passChain = 0;
    } else {
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballHolderId = gk.id;
      newState.passChain = 0;
    }
  } else {
    // Cruzamento da falta — similar a escanteio mas com menos xG
    const result = simulateCornerV2(attackingTeam, defendingTeam, state, minute, side, rng);
    return { ...result, isGoal: result.isGoal };
  }

  return { actions, events, state: newState, isGoal };
}

/**
 * Simula pênalti no v2.
 */
export function simulatePenaltyV2(
  attackingTeam: Team,
  defendingTeam: Team,
  state: LiveMatchState,
  minute: number,
  side: 'home' | 'away',
  rng: () => number,
): { actions: MatchAction[]; events: MatchEvent[]; state: LiveMatchState; isGoal: boolean } {
  const actions: MatchAction[] = [];
  const events: MatchEvent[] = [];
  let newState = { ...state };
  let isGoal = false;

  const setPieces = attackingTeam.tacticsConfig?.setPieces;
  const taker = attackingTeam.squad.find(p => p.id === setPieces?.penalties?.takerId)
    ?? attackingTeam.squad.find(p => p.position === 'FWD')
    ?? attackingTeam.squad[0];
  const gk = defendingTeam.squad.find(p => p.position === 'GK') ?? defendingTeam.squad[0];

  const finAttr = taker.technical?.finishing ?? 10;
  const composure = taker.mental?.composure ?? 10;
  const gkReflexes = gk.goalkeeping?.reflexes ?? 10;
  const gkOneOnOne = gk.goalkeeping?.oneOnOne ?? 10;

  // xG de pênalti: ~0.75 base
  const xg = 0.75 * (0.7 + finAttr / 40 + composure / 40) * (20 / (gkReflexes + gkOneOnOne + 10));
  isGoal = rng() < xg;

  actions.push({
    minute,
    type: 'shot',
    team: side,
    playerId: taker.id,
    playerName: taker.name,
    success: isGoal,
    description: isGoal
      ? `GOL! ${taker.name} converte o pênalti!`
      : `${gk.name} defende o pênalti de ${taker.name}!`,
    ballPos: side === 'home' ? 0.88 : 0.12,
  });

  if (isGoal) {
    if (side === 'home') newState.homeGoals = state.homeGoals + 1;
    else newState.awayGoals = state.awayGoals + 1;

    events.push({
      minute,
      type: 'goal',
      team: side,
      player: taker.name,
      description: `GOOOL! ${taker.name} converte o pênalti!`,
    });

    newState.goalDetails = [...(state.goalDetails ?? []), {
      team: side,
      minute,
      scorerId: taker.id,
      scorerName: taker.name,
    }];

    newState.chancesByOrigin = {
      ...newState.chancesByOrigin,
      bolaParada: (newState.chancesByOrigin?.bolaParada ?? 0) + 1,
    };
  }

  // Reinicia do meio-campo
  newState.possession = side === 'home' ? 'away' : 'home';
  newState.ballPos = 0.5;
  newState.ballPosY = 0.5;
  newState.ballHolderId = (side === 'home' ? defendingTeam : attackingTeam).squad[0].id;
  newState.passChain = 0;

  return { actions, events, state: newState, isGoal };
}

// ============================================================
// 7.2 — Faltas/cartões emergem de duelos + aggression/dirtiness
// ============================================================

/**
 * Probabilidade de falta em um duelo, baseada em aggression e dirtiness do defensor.
 */
export function foulChanceFromDuel(defender: Player, tacklingStyle: string): number {
  const aggression = defender.mental?.aggression ?? 10;
  // dirtiness é um hidden attribute (se existir)
  const dirtiness = (defender.hidden as Record<string, number | undefined> | undefined)?.dirtiness ?? 5;
  const base = 0.15;
  const aggrMod = (aggression - 10) / 100; // ±0.10
  const dirtMod = (dirtiness - 5) / 100; // ±0.05
  const styleMod = tacklingStyle === 'aggressive' ? 0.05 : 0;

  return Math.max(0.05, Math.min(0.40, base + aggrMod + dirtMod + styleMod));
}

/**
 * Probabilidade de cartão após falta, baseada em aggression + severidade do duelo.
 */
export function cardChanceFromFoul(offender: Player, isDangerousArea: boolean): { yellow: number; red: number } {
  const aggression = offender.mental?.aggression ?? 10;
  const baseYellow = 0.22;
  const baseRed = 0.012;

  const aggrMod = (aggression - 10) / 200; // ±0.05
  const areaMod = isDangerousArea ? 0.08 : 0;

  return {
    yellow: Math.max(0.05, Math.min(0.50, baseYellow + aggrMod + areaMod * 0.5)),
    red: Math.max(0.002, Math.min(0.05, baseRed + aggrMod * 0.3 + areaMod * 0.02)),
  };
}

// ============================================================
// 7.3 — Expulsão dispara reorganização estrutural por zona
// ============================================================

/**
 * Reorganiza a ocupação de zona após expulsão.
 * O time com 10 reorganiza: remove o jogador menos importante da zona
 * menos crítica e realoca os restantes para cobrir.
 */
export function reorganizeAfterRedCard(
  team: Team,
  sentOffPlayerId: string,
  attacksTowardOne: boolean,
): ZoneOccupant[] {
  const occupants = computeZoneOccupancy(team, attacksTowardOne);
  // Remove o expulso
  const remaining = occupants.filter(o => o.player.id !== sentOffPlayerId);

  // Realoca: desloca jogadores de zonas menos críticas para cobrir o buraco
  // (simplificado — na Fase 8 a IA fará isso de forma inteligente)
  return remaining;
}
