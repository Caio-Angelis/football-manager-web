// As 5 fases do lance — Fase 3 da checklist do motor v2
// Reescreve simulateTickV2 como progressão por fases:
//   buildup → progression → chanceCreation → finishing → transition
//
// Cada fase tem transições determinadas por ballPos, passChain, pressão e _matchRng.
// Volume de chance (chegadas na zona de finalização) é separado de qualidade (xG).
// "Domino posse mas não crio" e "parking the bus" emergem naturalmente.
//
// Este módulo NÃO altera o v1. É consumido por simulateMinuteV2 quando isV2 = true.

import type { Team, Player, MatchAction, MatchEvent, LiveMatchState } from '../../types/game';
import type { BallPhase } from '../../types/match';
import { computeZoneOccupancy, occupantsInZone, resolveDuel, pickZoneDefender, computeOverloadMod, ballToZone, logDuel, resetDuelLog, type ZoneOccupant } from './zones';
import { effectiveStrength } from './roles';
import { relationalModifier, mentalityActionMod } from './instructions';
import { fatigueProductionMod, combinedSwing } from './dynamicState';
import { simulateCornerV2, simulateFreeKickV2, simulatePenaltyV2, foulChanceFromDuel, cardChanceFromFoul } from './setPiecesV2';

// ============================================================
// Helpers locais (reaproveita padrões do v1 sem duplicar)
// ============================================================

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function fatigueMod(state: LiveMatchState, player: Player, minute: number = 0): number {
  return fatigueProductionMod(state, player, minute);
}

function moraleFactor(player: Player): number {
  const morale = player.morale ?? 50;
  return clamp(1.0 + ((morale - 50) / 50) * 0.25, 0.75, 1.20);
}

/**
 * Quão "estacionado" está o bloco defensivo (0–1).
 * Bloco baixo + mentalidade defensiva + contain → parking the bus.
 */
export function lowBlockCompactness(team: Team): number {
  let f = 0;
  if (team.defensiveLine === 'low') f += 0.40;
  if (team.teamMentality === 'very defensive') f += 0.35;
  else if (team.teamMentality === 'defensive') f += 0.20;
  if (team.tacklingStyle === 'contain') f += 0.15;
  if (team.pressIntensity === 'low') f += 0.10;
  return clamp(f, 0, 1);
}

/**
 * Quão "faminto por posse" é o time (0–1).
 * Saída curta + pressão alta + mentalidade ofensiva → domina a bola.
 */
export function possessionHunger(team: Team): number {
  let f = 0;
  if (team.passingStyle === 'short') f += 0.35;
  if (team.pressIntensity === 'high' || team.highPress) f += 0.30;
  if (team.teamMentality === 'very offensive') f += 0.25;
  else if (team.teamMentality === 'offensive') f += 0.18;
  if (team.defensiveLine === 'high') f += 0.10;
  return clamp(f, 0, 1);
}

/**
 * Ticks de transição após perda de posse.
 * Perda adiantada (attackProgress alto) → transição mais longa/perigosa.
 * Counter-attack instruction aumenta a duração.
 */
export function transitionTicksForLoss(
  attackProgress: number,
  recoveringTeam?: Team,
): number {
  // Campo próprio (~0–0.33): 2 ticks; meio: 3; terço ofensivo: 4–5
  let ticks = 2;
  if (attackProgress > 0.60) ticks = 3 + Math.round(attackProgress * 2); // 3–5
  else if (attackProgress > 0.33) ticks = 3;

  if (recoveringTeam?.afterGainingPossession === 'counterAttack') {
    ticks += 1;
  }
  return ticks;
}

/**
 * Exposição na transição: mentalidade ofensiva do time que PERDEU a bola
 * deixa mais espaço nas costas (avanço extra do contra-ataque).
 */
export function transitionMentalityExposure(losingTeam: Team): number {
  const m = losingTeam.teamMentality ?? 'balanced';
  if (m === 'very offensive') return 0.10;
  if (m === 'offensive') return 0.06;
  if (m === 'defensive') return -0.03;
  if (m === 'very defensive') return -0.06;
  return 0;
}

// ============================================================
// Estado de fase — determina qual fase o lance está
// ============================================================

/**
 * Determina a fase do lance baseada em ballPos, passChain e estado anterior.
 *
 * - buildup: ballPos no terço defensivo ou meio-campo, passChain < 3
 * - progression: ballPos no meio-campo, passChain >= 3, avançando
 * - chanceCreation: ballPos no terço ofensivo, passChain >= 2
 * - finishing: ballPos muito próximo do gol (attackProgress > 0.75)
 * - transition: após perda de posse (transitionTicks > 0)
 */
export function determinePhase(
  state: LiveMatchState,
  attackProgress: number,
  passChain: number,
): BallPhase {
  // Transição tem prioridade — sobrepõe tudo
  if ((state.transitionTicks ?? 0) > 0) {
    return 'transition';
  }

  // Finalização: bola na zona de gol
  if (attackProgress > 0.75) {
    return 'finishing';
  }

  // Criação: terço ofensivo com posse estabelecida
  if (attackProgress > 0.60 && passChain >= 2) {
    return 'chanceCreation';
  }

  // Progressão: meio-campo com sequência de passes
  if (attackProgress > 0.33 && passChain >= 3) {
    return 'progression';
  }

  // Construção: resto
  return 'buildup';
}

// ============================================================
// xG por fase — qualidade da chance depende da fase
// ============================================================

// xG base por fase (calibrado para ~2.7 gols/jogo)
const PHASE_XG_BASE: Record<BallPhase, number> = {
  buildup: 0.0,
  progression: 0.01,
  chanceCreation: 0.06,
  finishing: 0.15,
  transition: 0.14, // contra-ataque gera chance de qualidade média
};

/**
 * Calcula xG de uma finalização baseado na fase, distância, ângulo e atributos.
 */
export function calculateXG(
  phase: BallPhase,
  attackProgress: number,
  wide: number,
  holder: Player,
): number {
  const base = PHASE_XG_BASE[phase] ?? 0.02;
  // Mais perto do gol = mais xG
  const distMod = clamp(attackProgress, 0, 1);
  // Mais central = mais xG
  const angleMod = 1 - wide * 0.4;
  // Finalização do jogador
  const fin = (holder.technical?.finishing ?? 10) / 20;
  // Compostura
  const comp = (holder.mental?.composure ?? 10) / 20;

  return clamp(base * distMod * angleMod * (0.5 + fin * 0.3 + comp * 0.2), 0.01, 0.85);
}

// ============================================================
// simulateTickV2 — progressão por fases
// ============================================================

// Cache de ocupação de zona por partida (recalculado quando startingXI muda)
let _homeOccupancy: ZoneOccupant[] = [];
let _awayOccupancy: ZoneOccupant[] = [];
let _homeTeamRef: Team | null = null;
let _awayTeamRef: Team | null = null;

function ensureOccupancy(homeTeam: Team, awayTeam: Team): void {
  if (_homeTeamRef !== homeTeam) {
    _homeOccupancy = computeZoneOccupancy(homeTeam, true);
    _homeTeamRef = homeTeam;
  }
  if (_awayTeamRef !== awayTeam) {
    _awayOccupancy = computeZoneOccupancy(awayTeam, false);
    _awayTeamRef = awayTeam;
  }
}

export function resetPhaseState(): void {
  _homeOccupancy = [];
  _awayOccupancy = [];
  _homeTeamRef = null;
  _awayTeamRef = null;
  resetDuelLog();
}

/**
 * Simula UM lance no motor v2 — progressão por fases.
 * Retorna o estado atualizado + novas ações + novos eventos.
 */
export function simulateTickV2(
  homeTeam: Team,
  awayTeam: Team,
  state: LiveMatchState,
  minute: number,
  rng: () => number,
): LiveMatchState {
  const attackingTeam = state.possession === 'home' ? homeTeam : awayTeam;
  const defendingTeam = state.possession === 'home' ? awayTeam : homeTeam;
  const side = state.possession;
  const attackDir = side === 'home' ? 1 : -1;
  const currentBallPos = state.ballPos;
  const currentBallY = state.ballPosY ?? 0.5;

  // Garante ocupação de zona calculada
  ensureOccupancy(homeTeam, awayTeam);

  const attOccupants = side === 'home' ? _homeOccupancy : _awayOccupancy;
  const defOccupants = side === 'home' ? _awayOccupancy : _homeOccupancy;

  // Progresso do ataque (0 = defesa, 1 = gol adversário)
  const attackProgress = side === 'home' ? currentBallPos : 1 - currentBallPos;

  // Determina fase atual
  const phase = determinePhase(state, attackProgress, state.passChain);

  // Portador da bola
  const holder = attackingTeam.squad.find(p => p.id === state.ballHolderId) ?? attackingTeam.squad[0];
  const holderFatigue = fatigueMod(state, holder, minute);

  // Zona atual da bola
  const zone = ballToZone(currentBallPos, currentBallY, side === 'home');

  // Overload na zona atual
  const overloadMod = computeOverloadMod(attOccupants, defOccupants, zone);

  // Fase 5: modificador relacional (pressão alta vs saída de bola, etc)
  const relationalMod = relationalModifier(attackingTeam, defendingTeam);

  // Fase 5: mentalidade do time atacante afeta ações
  const attMentality = mentalityActionMod(attackingTeam);

  // Fase 6: swing combinado de fadiga+moral+momentum+casa (clamp ±0.15)
  // Aplicado em todas as fases — mandante jogando em casa tem vantagem real
  const swing = combinedSwing(state, attackingTeam, side, minute, side === 'home');

  // Novas ações e eventos
  const newActions: MatchAction[] = [];
  const newEvents: MatchEvent[] = [];
  let newState: LiveMatchState = {
    ...state,
    ballPhase: phase,
    xgByPhase: { ...(state.xgByPhase ?? {}) },
    chancesByOrigin: { ...(state.chancesByOrigin ?? {}) },
  };

  // ============================================================
  // FASE: TRANSITION (contra-ataque — perda adiantada gera perigo)
  // ============================================================
  if (phase === 'transition') {
    const ticksLeft = (state.transitionTicks ?? 0) - 1;
    newState.transitionTicks = ticksLeft > 0 ? ticksLeft : undefined;

    // Mentalidade ofensiva do time que PERDEU a posse (defendingTeam) aumenta exposição
    const mentalityExposure = transitionMentalityExposure(defendingTeam);

    // afterGainingPossession === counterAttack: avanço mais vertical
    const counterBoost = attackingTeam.afterGainingPossession === 'counterAttack' ? 0.05 : 0;

    // Na transição, passes são mais rápidos e diretos
    const receiver = attOccupants.find(o => o.player.id !== holder.id);
    if (receiver) {
      const passSuccess = rng() < 0.80 * holderFatigue * (1 + swing * 0.15); // transição = mais arriscado
      if (passSuccess) {
        const advance = 0.15 + rng() * 0.12 + mentalityExposure + counterBoost;
        newState.ballPos = clamp(currentBallPos + advance * attackDir, 0.02, 0.98);
        newState.ballPosY = clamp(currentBallY + (rng() - 0.5) * 0.20, 0.04, 0.96);
        newState.ballHolderId = receiver.player.id;
        newState.passChain = state.passChain + 1;

        // Chance por origem "transição" quando o contra-ataque entra no terço final
        const newProgress = side === 'home' ? newState.ballPos : 1 - newState.ballPos;
        if (newProgress > 0.68) {
          newState.chancesByOrigin = {
            ...newState.chancesByOrigin,
            transição: (newState.chancesByOrigin?.transição ?? 0) + 1,
          };
          const wide = clamp(Math.abs((newState.ballPosY ?? 0.5) - 0.5) * 2, 0, 1);
          const xg = calculateXG('transition', newProgress, wide, holder);
          newState.xgByPhase = {
            ...newState.xgByPhase,
            transition: (newState.xgByPhase?.transition ?? 0) + xg,
          };
        }

        newActions.push({
          minute,
          type: 'pass',
          team: side,
          playerId: holder.id,
          playerName: holder.name,
          success: true,
          description: `${holder.name} lança ${receiver.player.name} em transição rápida!`,
          ballPos: newState.ballPos,
        });
      } else {
        // Transição falhou — posse para o adversário
        newState.possession = side === 'home' ? 'away' : 'home';
        newState.ballHolderId = defOccupants[0]?.player.id ?? defendingTeam.squad[0].id;
        newState.passChain = 0;
        newState.transitionTicks = undefined;

        newActions.push({
          minute,
          type: 'interception',
          team: side === 'home' ? 'away' : 'home',
          playerId: newState.ballHolderId,
          playerName: defendingTeam.squad.find(p => p.id === newState.ballHolderId)?.name ?? '',
          success: true,
          description: `Transição interrompida! ${defendingTeam.squad.find(p => p.id === newState.ballHolderId)?.name ?? ''} recupera a posse`,
          ballPos: currentBallPos,
        });
      }
    }
  }

  // ============================================================
  // FASE: BUILDUP (construção — posse segura no próprio campo)
  // ============================================================
  else if (phase === 'buildup') {
    const block = lowBlockCompactness(attackingTeam); // time com a bola "estacionado"?
    const hunger = possessionHunger(attackingTeam);
    const defBlock = lowBlockCompactness(defendingTeam);

    // Parking the bus: com a bola, limpa mais cedo (cede posse → posse baixa)
    if (block >= 0.5 && state.passChain >= 1 && rng() < 0.35 + block * 0.25) {
      const defender = pickZoneDefender(defOccupants, zone, rng);
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballHolderId = defender?.player.id ?? defendingTeam.squad[0].id;
      newState.passChain = 0;
      newState.ballPos = clamp(currentBallPos + 0.20 * attackDir, 0.02, 0.98); // alívio longo
      newActions.push({
        minute,
        type: 'pass',
        team: side,
        playerId: holder.id,
        playerName: holder.name,
        success: false,
        description: `${holder.name} alivia a bola — bloco baixo cede a posse`,
        ballPos: newState.ballPos,
      });
    } else {
      // Passe seguro, baixo risco; hunger aumenta retenção; defBlock reduz avanço
      const receiver = attOccupants.find(o =>
        o.player.id !== holder.id &&
        Math.abs(o.effectiveX - currentBallPos) < 0.3
      ) ?? attOccupants.find(o => o.player.id !== holder.id);

      if (receiver) {
        const passProb = clamp(0.92 + hunger * 0.06 - block * 0.08, 0.75, 0.97);
        const passSuccess = rng() < passProb * holderFatigue * (1 + swing * 0.15);
        if (passSuccess) {
          // Domino: retenção com pouco avanço contra bloco baixo
          const advance = (0.03 + rng() * 0.06) * (1 - defBlock * 0.45) * (1 - hunger * 0.25);
          newState.ballPos = clamp(currentBallPos + advance * attackDir, 0.02, 0.98);
          newState.ballPosY = clamp(currentBallY + (rng() - 0.5) * 0.10, 0.04, 0.96);
          newState.ballHolderId = receiver.player.id;
          newState.passChain = state.passChain + 1;

          newActions.push({
            minute,
            type: 'pass',
            team: side,
            playerId: holder.id,
            playerName: holder.name,
            success: true,
            description: `${holder.name} troca com ${receiver.player.name}`,
            ballPos: newState.ballPos,
          });
        } else {
          // Perda de posse no buildup — raro mas possível
          const defender = pickZoneDefender(defOccupants, zone, rng);
          if (defender) {
            newState.possession = side === 'home' ? 'away' : 'home';
            newState.ballHolderId = defender.player.id;
            newState.passChain = 0;
            newState.transitionTicks = transitionTicksForLoss(attackProgress, defendingTeam);

            newActions.push({
              minute,
              type: 'interception',
              team: side === 'home' ? 'away' : 'home',
              playerId: defender.player.id,
              playerName: defender.player.name,
              success: true,
              description: `${defender.player.name} rouba a bola no campo de defesa!`,
              ballPos: currentBallPos,
            });
          }
        }
      }
    }
  }

  // ============================================================
  // FASE: PROGRESSION (progressão — meio-campo, avançando)
  // ============================================================
  else if (phase === 'progression') {
    const defBlock = lowBlockCompactness(defendingTeam);
    const hunger = possessionHunger(attackingTeam);
    const attBlock = lowBlockCompactness(attackingTeam);

    // Passe mais arriscado, tenta avançar; duelo se há defensor na zona
    const zoneDefender = pickZoneDefender(defOccupants, zone, rng);

    // Contra bloco baixo: mais duelos (zaga compacta no meio)
    const duelChance = 0.30 + defBlock * 0.25;
    if (zoneDefender && rng() < duelChance) {
      const attackerOccupant = attOccupants.find(o => o.player.id === holder.id) ?? attOccupants[0];
      if (attackerOccupant) {
        // Bloco baixo favorece o defensor no duelo
        const duel = resolveDuel(
          attackerOccupant,
          zoneDefender,
          rng,
          overloadMod * (1 + relationalMod) * (1 + swing * 0.15) * (1 - defBlock * 0.30),
        );
        logDuel({
          zone,
          attackerId: holder.id,
          defenderId: zoneDefender.player.id,
          winner: duel.winner,
          minute,
        });

        if (duel.winner === 'attacker') {
          const advance = (0.08 + rng() * 0.10) * (1 - defBlock * 0.40);
          newState.ballPos = clamp(currentBallPos + advance * attackDir, 0.02, 0.98);
          newState.ballPosY = clamp(currentBallY + (rng() - 0.5) * 0.14, 0.04, 0.96);
          newState.passChain = state.passChain + 1;

          newActions.push({
            minute,
            type: 'dribble',
            team: side,
            playerId: holder.id,
            playerName: holder.name,
            success: true,
            description: `${holder.name} supera ${zoneDefender.player.name} e avança!`,
            ballPos: newState.ballPos,
          });
        } else {
          newState.possession = side === 'home' ? 'away' : 'home';
          newState.ballHolderId = zoneDefender.player.id;
          newState.passChain = 0;
          newState.transitionTicks = transitionTicksForLoss(attackProgress, defendingTeam);

          newActions.push({
            minute,
            type: 'dribble',
            team: side,
            playerId: holder.id,
            playerName: holder.name,
            success: false,
            description: `${zoneDefender.player.name} desarma ${holder.name}!`,
            ballPos: currentBallPos,
          });
        }
      }
    } else {
      // Passe de progressão — hunger retém; bloco baixo reduz avanço
      const receiver = attOccupants.find(o =>
        o.player.id !== holder.id &&
        Math.abs(o.effectiveX - currentBallPos) < 0.35
      ) ?? attOccupants.find(o => o.player.id !== holder.id);

      if (receiver) {
        const passProb = clamp(0.85 + hunger * 0.08 - attBlock * 0.10, 0.70, 0.94);
        const passSuccess = rng() < passProb * holderFatigue * (1 + swing * 0.15);
        if (passSuccess) {
          const advance = (0.05 + rng() * 0.08) * (1 - defBlock * 0.50) * (1 - hunger * 0.20);
          newState.ballPos = clamp(currentBallPos + advance * attackDir, 0.02, 0.98);
          newState.ballPosY = clamp(currentBallY + (rng() - 0.5) * 0.12, 0.04, 0.96);
          newState.ballHolderId = receiver.player.id;
          newState.passChain = state.passChain + 1;

          newActions.push({
            minute,
            type: 'pass',
            team: side,
            playerId: holder.id,
            playerName: holder.name,
            success: true,
            description: `${holder.name} encontra ${receiver.player.name} em progressão`,
            ballPos: newState.ballPos,
          });
        } else {
          const defender = pickZoneDefender(defOccupants, zone, rng);
          if (defender) {
            newState.possession = side === 'home' ? 'away' : 'home';
            newState.ballHolderId = defender.player.id;
            newState.passChain = 0;
            newState.transitionTicks = transitionTicksForLoss(attackProgress, defendingTeam);

            newActions.push({
              minute,
              type: 'interception',
              team: side === 'home' ? 'away' : 'home',
              playerId: defender.player.id,
              playerName: defender.player.name,
              success: true,
              description: `${defender.player.name} intercepta no meio-campo!`,
              ballPos: currentBallPos,
            });
          }
        }
      }
    }
  }

  // ============================================================
  // FASE: CHANCE_CREATION (criação — terço ofensivo, buscando chance)
  // ============================================================
  else if (phase === 'chanceCreation') {
    // "domino posse mas não crio" / parking the bus: bloco baixo anula criação
    const defBlock = lowBlockCompactness(defendingTeam);

    const zoneDefender = pickZoneDefender(defOccupants, zone, rng);

    // Contra bloco baixo bem posicionado, criação quase sempre estagna
    const createThreshold = 0.85 + defBlock * 0.35;
    const createLuck = 0.55 - defBlock * 0.40 + swing * 0.3;
    const canCreate = overloadMod >= createThreshold || rng() < createLuck;

    if (!canCreate && zoneDefender) {
      // Bloco baixo bem posicionado — posse estagnada (recua / circula)
      newState.ballPos = clamp(currentBallPos - (0.04 + defBlock * 0.04) * attackDir, 0.02, 0.98);
      newState.passChain = state.passChain + 1;

      const origin = Math.abs(currentBallY - 0.5) > 0.24 ? 'lateral' : 'centro';
      newState.chancesByOrigin = {
        ...newState.chancesByOrigin,
        [origin]: (newState.chancesByOrigin?.[origin] ?? 0) + 1,
      };

      newActions.push({
        minute,
        type: 'pass',
        team: side,
        playerId: holder.id,
        playerName: holder.name,
        success: true,
        description: `${holder.name} tenta encontrar espaço mas a zaga fecha`,
        ballPos: newState.ballPos,
      });
    } else if (zoneDefender && rng() < 0.45 + defBlock * 0.15) {
      const attackerOccupant = attOccupants.find(o => o.player.id === holder.id) ?? attOccupants[0];
      if (attackerOccupant) {
        const duel = resolveDuel(
          attackerOccupant,
          zoneDefender,
          rng,
          overloadMod * (1 + relationalMod) * (1 + swing * 0.15) * (1 - defBlock * 0.35),
        );
        logDuel({
          zone,
          attackerId: holder.id,
          defenderId: zoneDefender.player.id,
          winner: duel.winner,
          minute,
        });

        if (duel.winner === 'attacker') {
          const advance = (0.06 + rng() * 0.08) * (1 - defBlock * 0.45);
          newState.ballPos = clamp(currentBallPos + advance * attackDir, 0.02, 0.98);
          newState.passChain = state.passChain + 1;

          newActions.push({
            minute,
            type: 'dribble',
            team: side,
            playerId: holder.id,
            playerName: holder.name,
            success: true,
            description: `${holder.name} ganha de ${zoneDefender.player.name} e entra na área!`,
            ballPos: newState.ballPos,
          });
        } else {
          newState.possession = side === 'home' ? 'away' : 'home';
          newState.ballHolderId = zoneDefender.player.id;
          newState.passChain = 0;
          newState.transitionTicks = transitionTicksForLoss(attackProgress, defendingTeam);

          newActions.push({
            minute,
            type: 'dribble',
            team: side,
            playerId: holder.id,
            playerName: holder.name,
            success: false,
            description: `${zoneDefender.player.name} desarma ${holder.name} na zona de criação`,
            ballPos: currentBallPos,
          });
        }
      }
    } else {
      const receiver = attOccupants.find(o =>
        o.player.id !== holder.id &&
        Math.abs(o.effectiveX - currentBallPos) < 0.30
      ) ?? attOccupants.find(o => o.player.id !== holder.id);

      if (receiver) {
        const passSuccess = rng() < (0.78 - defBlock * 0.15) * holderFatigue * (1 + swing * 0.15);
        if (passSuccess) {
          const advance = (0.04 + rng() * 0.08) * (1 - defBlock * 0.50);
          newState.ballPos = clamp(currentBallPos + advance * attackDir, 0.02, 0.98);
          newState.ballPosY = clamp(currentBallY + (rng() - 0.5) * 0.16, 0.04, 0.96);
          newState.ballHolderId = receiver.player.id;
          newState.passChain = state.passChain + 1;

          newActions.push({
            minute,
            type: 'pass',
            team: side,
            playerId: holder.id,
            playerName: holder.name,
            success: true,
            description: `${holder.name} cria para ${receiver.player.name}`,
            ballPos: newState.ballPos,
          });
        } else {
          const defender = pickZoneDefender(defOccupants, zone, rng);
          if (defender) {
            newState.possession = side === 'home' ? 'away' : 'home';
            newState.ballHolderId = defender.player.id;
            newState.passChain = 0;
            newState.transitionTicks = transitionTicksForLoss(attackProgress, defendingTeam);

            newActions.push({
              minute,
              type: 'interception',
              team: side === 'home' ? 'away' : 'home',
              playerId: defender.player.id,
              playerName: defender.player.name,
              success: true,
              description: `${defender.player.name} recupera no terço ofensivo! Contra-ataque!`,
              ballPos: currentBallPos,
            });
          }
        }
      }
    }
  }

  // ============================================================
  // FASE: FINISHING (finalização — bola na zona de gol)
  // ============================================================
  else if (phase === 'finishing') {
    const defBlock = lowBlockCompactness(defendingTeam);
    // Bloco baixo: menos chutes (e os que saem são de fora / bloqueados)
    const shotChance = (0.47 + (attackProgress - 0.75) * 1.0)
      * attMentality.shotMod
      * (1 + swing)
      * (1 - defBlock * 0.65);
    const wide = clamp(Math.abs(currentBallY - 0.5) * 2, 0, 1);

    if (rng() < shotChance) {
      // CHUTE — xG reduzido contra bloco baixo (chute de fora / ângulo ruim)
      const xg = calculateXG('finishing', attackProgress, wide, holder) * (1 - defBlock * 0.45);
      const fin = (holder.technical?.finishing ?? 10) / 20;
      const comp = (holder.mental?.composure ?? 10) / 20;
      const goalRoll = rng();
      const goalThreshold = xg * (0.8 + fin * 0.2 + comp * 0.1) * (1 - defBlock * 0.35);
      const isGoal = goalRoll < goalThreshold;

      newState.xgByPhase = {
        ...newState.xgByPhase,
        finishing: (newState.xgByPhase?.finishing ?? 0) + xg,
      };

      const origin = wide > 0.4 ? 'lateral' : 'centro';
      newState.chancesByOrigin = {
        ...newState.chancesByOrigin,
        [origin]: (newState.chancesByOrigin?.[origin] ?? 0) + 1,
      };

      newActions.push({
        minute,
        type: 'shot',
        team: side,
        playerId: holder.id,
        playerName: holder.name,
        success: isGoal,
        description: isGoal
          ? `GOL! ${holder.name} finaliza com precisão!`
          : defBlock >= 0.5
            ? `${holder.name} chuta de fora — bloqueado pelo bloco baixo`
            : `${holder.name} finaliza — não entrou`,
        ballPos: currentBallPos,
      });

      if (side === 'home') {
        newState.stats = { ...newState.stats, homeShots: state.stats.homeShots + 1, homeXG: Math.round((state.stats.homeXG + xg) * 100) / 100 };
      } else {
        newState.stats = { ...newState.stats, awayShots: state.stats.awayShots + 1, awayXG: Math.round((state.stats.awayXG + xg) * 100) / 100 };
      }

      if (isGoal) {
        if (side === 'home') newState.homeGoals = state.homeGoals + 1;
        else newState.awayGoals = state.awayGoals + 1;

        newState.momentum = clamp((state.momentum ?? 0) * 0.4 + (side === 'home' ? 0.45 : -0.45), -1, 1);

        newEvents.push({
          minute,
          type: 'goal',
          team: side,
          player: holder.name,
          description: `GOOOL! ${holder.name} marca para o ${attackingTeam.name}!`,
        });

        newState.goalDetails = [...state.goalDetails, {
          team: side,
          minute,
          scorerId: holder.id,
          scorerName: holder.name,
        }];

        newState.possession = side === 'home' ? 'away' : 'home';
        newState.ballPos = 0.5;
        newState.ballPosY = 0.5;
        newState.ballHolderId = (side === 'home' ? awayTeam : homeTeam).squad[0].id;
        newState.passChain = 0;
        newState.transitionTicks = undefined;
      } else {
        newState.possession = side === 'home' ? 'away' : 'home';
        const gk = defendingTeam.squad.find(p => p.position === 'GK') ?? defendingTeam.squad[0];
        newState.ballHolderId = gk.id;
        newState.passChain = 0;
        newState.ballPos = side === 'home' ? 0.85 : 0.15;
        newState.ballPosY = 0.4 + rng() * 0.2;
      }
    } else {
      // Não chutou — contra bloco baixo, frequentemente recua em vez de forçar
      if (defBlock >= 0.45 && rng() < 0.55) {
        newState.ballPos = clamp(currentBallPos - 0.06 * attackDir, 0.02, 0.98);
        newState.passChain = state.passChain + 1;
        newActions.push({
          minute,
          type: 'pass',
          team: side,
          playerId: holder.id,
          playerName: holder.name,
          success: true,
          description: `${holder.name} recua — sem ângulo contra o bloco baixo`,
          ballPos: newState.ballPos,
        });
      } else {
        const receiver = attOccupants.find(o =>
          o.player.id !== holder.id &&
          o.effectiveX > currentBallPos * (side === 'home' ? 0.9 : 1.1)
        ) ?? attOccupants.find(o => o.player.id !== holder.id);

        if (receiver) {
          const passSuccess = rng() < 0.70 * holderFatigue * (1 + swing * 0.15);
          if (passSuccess) {
            newState.ballHolderId = receiver.player.id;
            newState.passChain = state.passChain + 1;

            newActions.push({
              minute,
              type: 'pass',
              team: side,
              playerId: holder.id,
              playerName: holder.name,
              success: true,
              description: `${holder.name} toca para ${receiver.player.name} na área`,
              ballPos: currentBallPos,
            });
          } else {
            const defender = pickZoneDefender(defOccupants, zone, rng);
            if (defender) {
              newState.possession = side === 'home' ? 'away' : 'home';
              newState.ballHolderId = defender.player.id;
              newState.passChain = 0;
              newState.transitionTicks = transitionTicksForLoss(attackProgress, defendingTeam);

              newActions.push({
                minute,
                type: 'interception',
                team: side === 'home' ? 'away' : 'home',
                playerId: defender.player.id,
                playerName: defender.player.name,
                success: true,
                description: `${defender.player.name} afasta o perigo!`,
                ballPos: currentBallPos,
              });
            }
          }
        }
      }
    }
  }

  // ============================================================
  // Fase 7: Faltas e bola parada (emergem de duelos + aggression)
  // ============================================================

  // Faltas esparsas baseadas em tackling style + aggression (não sorteio puro)
  if (rng() < 0.018) {
    const foulSide: 'home' | 'away' = rng() < 0.5 ? 'home' : 'away';
    const foulTeam = foulSide === 'home' ? homeTeam : awayTeam;
    const xi = foulTeam.squad.filter(p => foulTeam.startingXI.includes(p.id) && p.position !== 'GK');
    if (xi.length > 0) {
      // Seleciona jogador mais agressivo como candidato a faltador
      const offender = xi.reduce((max, p) =>
        (p.mental?.aggression ?? 10) > (max.mental?.aggression ?? 10) ? p : max, xi[0]);
      const tacklingStyle = foulTeam.tacklingStyle ?? 'contain';
      const foulProb = foulChanceFromDuel(offender, tacklingStyle);
      if (rng() < foulProb * 3) { // amplifica para volume realista
        const isDangerous = attackProgress > 0.65;
        const cardChances = cardChanceFromFoul(offender, isDangerous);
        const cardRoll = rng();

        const cards = { ...(newState.cards ?? {}) };
        const sentOff = {
          home: [...(newState.sentOff?.home ?? [])],
          away: [...(newState.sentOff?.away ?? [])],
        };

        if (cardRoll < cardChances.red) {
          // Vermelho direto
          sentOff[foulSide].push(offender.id);
          newEvents.push({ minute, type: 'red', team: foulSide, player: offender.name, description: `VERMELHO direto para ${offender.name}!` });
        } else if (cardRoll < cardChances.red + cardChances.yellow) {
          const yc = (cards[offender.id] ?? 0) + 1;
          cards[offender.id] = yc;
          if (yc >= 2) {
            sentOff[foulSide].push(offender.id);
            newEvents.push({ minute, type: 'red', team: foulSide, player: offender.name, description: `Segundo amarelo — ${offender.name} expulso!` });
          } else {
            newEvents.push({ minute, type: 'yellow', team: foulSide, player: offender.name, description: `Cartão amarelo para ${offender.name}` });
          }
        }

        newState.cards = cards;
        newState.sentOff = sentOff;

        // Falta em posição perigosa → bola parada
        if (isDangerous) {
          if (attackProgress > 0.9 && rng() < 0.08) {
            // Pênalti
            newEvents.push({ minute, type: 'foul', team: side, description: 'Pênalti marcado!' });
            const penResult = simulatePenaltyV2(attackingTeam, defendingTeam, newState, minute, side, rng);
            newActions.push(...penResult.actions);
            newEvents.push(...penResult.events);
            Object.assign(newState, penResult.state);
          } else if (rng() < 0.40) {
            // Falta cobrada
            const fkResult = simulateFreeKickV2(attackingTeam, defendingTeam, newState, minute, side, attackProgress, rng);
            newActions.push(...fkResult.actions);
            newEvents.push(...fkResult.events);
            Object.assign(newState, fkResult.state);
          }
        }
      }
    }
  }

  // Escanteios: após chute para fora na zona de finalização
  if (phase === 'finishing' && rng() < 0.05) {
    const cornerResult = simulateCornerV2(attackingTeam, defendingTeam, newState, minute, side, rng);
    newActions.push(...cornerResult.actions);
    newEvents.push(...cornerResult.events);
    Object.assign(newState, cornerResult.state);
  }

  // ============================================================
  // Atualização de posse e stats
  // ============================================================

  // Fadiga acumulada por tick
  const newFatigue = { ...(state.fatigue ?? {}) };
  const holderF = (newFatigue[holder.id] ?? 0) + 0.002;
  newFatigue[holder.id] = Math.min(0.6, holderF);
  newState.fatigue = newFatigue;

  // Posse de bola (incremental)
  const homeActionsThisMinute = newActions.filter(a => a.team === 'home').length;
  const awayActionsThisMinute = newActions.filter(a => a.team === 'away').length;
  const totalActions = state.actions.length + newActions.length;
  const homeActionsTotal = state.actions.filter(a => a.team === 'home').length + homeActionsThisMinute;
  const awayActionsTotal = state.actions.filter(a => a.team === 'away').length + awayActionsThisMinute;

  if (totalActions > 0) {
    newState.stats = {
      ...newState.stats,
      homePossession: Math.round((homeActionsTotal / totalActions) * 100),
      awayPossession: Math.round((awayActionsTotal / totalActions) * 100),
    };
  }

  // Combina ações e eventos
  newState.actions = [...state.actions, ...newActions];
  newState.events = [...state.events, ...newEvents];

  return newState;
}
