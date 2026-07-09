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

    // Mentalidade ofensiva do time que PERDEU a posse (defendingTeam) aumenta exposição:
    // jogadores mais adiantados demoram a recompor → transição adversária mais perigosa
    const losingTeamMentality = defendingTeam.teamMentality ?? 'balanced';
    const mentalityExposure = losingTeamMentality === 'very offensive' ? 0.08
      : losingTeamMentality === 'offensive' ? 0.05
      : losingTeamMentality === 'defensive' ? -0.03
      : losingTeamMentality === 'very defensive' ? -0.06
      : 0;

    // Na transição, passes são mais rápidos e diretos
    const receiver = attOccupants.find(o => o.player.id !== holder.id);
    if (receiver) {
      const passSuccess = rng() < 0.80 * holderFatigue * (1 + swing * 0.15); // transição = mais arriscado
      if (passSuccess) {
        const advance = 0.15 + rng() * 0.12 + mentalityExposure; // avanço rápido + exposição por mentalidade
        newState.ballPos = clamp(currentBallPos + advance * attackDir, 0.02, 0.98);
        newState.ballPosY = clamp(currentBallY + (rng() - 0.5) * 0.20, 0.04, 0.96);
        newState.ballHolderId = receiver.player.id;
        newState.passChain = state.passChain + 1;

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
    // Passe seguro, baixo risco, baixo avanço
    const receiver = attOccupants.find(o =>
      o.player.id !== holder.id &&
      Math.abs(o.effectiveX - currentBallPos) < 0.3
    ) ?? attOccupants.find(o => o.player.id !== holder.id);

    if (receiver) {
      const passSuccess = rng() < 0.92 * holderFatigue * (1 + swing * 0.15); // buildup = muito seguro
      if (passSuccess) {
        const advance = 0.03 + rng() * 0.06;
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
          // Perda adiantada → transição perigosa para o adversário
          newState.possession = side === 'home' ? 'away' : 'home';
          newState.ballHolderId = defender.player.id;
          newState.passChain = 0;
          // Perda no campo de defesa → transição moderada (2 ticks)
          newState.transitionTicks = 2;

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

  // ============================================================
  // FASE: PROGRESSION (progressão — meio-campo, avançando)
  // ============================================================
  else if (phase === 'progression') {
    // Passe mais arriscado, tenta avançar; duelo se há defensor na zona
    const zoneDefender = pickZoneDefender(defOccupants, zone, rng);

    // 30% chance de duelo se há defensor próximo
    if (zoneDefender && rng() < 0.30) {
      // Duelo na zona
      const attackerOccupant = attOccupants.find(o => o.player.id === holder.id) ?? attOccupants[0];
      if (attackerOccupant) {
        const duel = resolveDuel(attackerOccupant, zoneDefender, rng, overloadMod * (1 + relationalMod) * (1 + swing * 0.15));
        logDuel({
          zone,
          attackerId: holder.id,
          defenderId: zoneDefender.player.id,
          winner: duel.winner,
          minute,
        });

        if (duel.winner === 'attacker') {
          // Venceu o duelo — avança
          const advance = 0.08 + rng() * 0.10;
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
          // Perdeu o duelo — posse para o defensor
          newState.possession = side === 'home' ? 'away' : 'home';
          newState.ballHolderId = zoneDefender.player.id;
          newState.passChain = 0;

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
      // Passe de progressão
      const receiver = attOccupants.find(o =>
        o.player.id !== holder.id &&
        Math.abs(o.effectiveX - currentBallPos) < 0.35
      ) ?? attOccupants.find(o => o.player.id !== holder.id);

      if (receiver) {
        const passSuccess = rng() < 0.85 * holderFatigue * (1 + swing * 0.15);
        if (passSuccess) {
          const advance = 0.05 + rng() * 0.08;
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
          // Perda no meio-campo
          const defender = pickZoneDefender(defOccupants, zone, rng);
          if (defender) {
            newState.possession = side === 'home' ? 'away' : 'home';
            newState.ballHolderId = defender.player.id;
            newState.passChain = 0;

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
    // Mais arriscado ainda; "domino posse mas não crio" emerge quando o bloco
    // adversário está bem posicionado (muitos defensores na zona → overload baixo)

    const zoneDefender = pickZoneDefender(defOccupants, zone, rng);

    // Se há muitos defensores (overload < 1), é difícil criar
    const canCreate = overloadMod >= 0.85 || rng() < 0.55 + swing * 0.3;

    if (!canCreate && zoneDefender) {
      // Bloco baixo bem posicionado — posse estagnada
      // Bola recua um pouco (não há espaço)
      newState.ballPos = clamp(currentBallPos - 0.04 * attackDir, 0.02, 0.98);
      newState.passChain = state.passChain + 1;

      // Registra volume de chegada (sem qualidade)
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
    } else if (zoneDefender && rng() < 0.45) {
      // Duelo ofensivo na zona de criação
      const attackerOccupant = attOccupants.find(o => o.player.id === holder.id) ?? attOccupants[0];
      if (attackerOccupant) {
        const duel = resolveDuel(attackerOccupant, zoneDefender, rng, overloadMod * (1 + relationalMod) * (1 + swing * 0.15));
        logDuel({
          zone,
          attackerId: holder.id,
          defenderId: zoneDefender.player.id,
          winner: duel.winner,
          minute,
        });

        if (duel.winner === 'attacker') {
          // Venceu — chance de finalizar ou cruzar
          const advance = 0.06 + rng() * 0.08;
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
          // Perdeu — posse para o defensor
          newState.possession = side === 'home' ? 'away' : 'home';
          newState.ballHolderId = zoneDefender.player.id;
          newState.passChain = 0;

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
      // Passe de criação — tenta encontrar alguém mais à frente
      const receiver = attOccupants.find(o =>
        o.player.id !== holder.id &&
        Math.abs(o.effectiveX - currentBallPos) < 0.30
      ) ?? attOccupants.find(o => o.player.id !== holder.id);

      if (receiver) {
        const passSuccess = rng() < 0.78 * holderFatigue * (1 + swing * 0.15); // criação = arriscado
        if (passSuccess) {
          const advance = 0.04 + rng() * 0.08;
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
          // Perda na criação — pode gerar contra-ataque
          const defender = pickZoneDefender(defOccupants, zone, rng);
          if (defender) {
            newState.possession = side === 'home' ? 'away' : 'home';
            newState.ballHolderId = defender.player.id;
            newState.passChain = 0;
            // Perda adiantada (terço ofensivo) → transição perigosa (4 ticks)
            // Quanto mais perto do gol adversário a perda acontece, mais perigosa a transição
            newState.transitionTicks = 3 + Math.round(attackProgress * 2); // 3-5 ticks

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
    // Finalização: chance de chute baseada em fase, atributos e posição
    // Fase 6: swing combinado de fadiga+moral+momentum+casa (clamp ±0.15)
    const shotChance = (0.47 + (attackProgress - 0.75) * 1.0) * attMentality.shotMod * (1 + swing);
    const wide = clamp(Math.abs(currentBallY - 0.5) * 2, 0, 1);

    if (rng() < shotChance) {
      // CHUTE — calcula xG
      const xg = calculateXG('finishing', attackProgress, wide, holder);
      const fin = (holder.technical?.finishing ?? 10) / 20;
      const comp = (holder.mental?.composure ?? 10) / 20;
      const goalRoll = rng();
      const goalThreshold = xg * (0.8 + fin * 0.2 + comp * 0.1);
      const isGoal = goalRoll < goalThreshold;

      // Acumula xG por fase
      newState.xgByPhase = {
        ...newState.xgByPhase,
        finishing: (newState.xgByPhase?.finishing ?? 0) + xg,
      };

      // Registra origem da chance
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

        // Reinicia do meio-campo
        newState.possession = side === 'home' ? 'away' : 'home';
        newState.ballPos = 0.5;
        newState.ballPosY = 0.5;
        newState.ballHolderId = (side === 'home' ? awayTeam : homeTeam).squad[0].id;
        newState.passChain = 0;
        newState.transitionTicks = undefined;
      } else {
        // Não foi gol — posse para o goleiro adversário (defesa ou tiro de meta)
        newState.possession = side === 'home' ? 'away' : 'home';
        const gk = defendingTeam.squad.find(p => p.position === 'GK') ?? defendingTeam.squad[0];
        newState.ballHolderId = gk.id;
        newState.passChain = 0;
        newState.ballPos = side === 'home' ? 0.85 : 0.15;
        newState.ballPosY = 0.4 + rng() * 0.2;
      }
    } else {
      // Não chutou — tenta passar para alguém melhor posicionado
      const receiver = attOccupants.find(o =>
        o.player.id !== holder.id &&
        o.effectiveX > currentBallPos * (side === 'home' ? 0.9 : 1.1) // mais à frente
      ) ?? attOccupants.find(o => o.player.id !== holder.id);

      if (receiver) {
        const passSuccess = rng() < 0.70 * holderFatigue * (1 + swing * 0.15); // zona de gol = muito pressão
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
          // Perda na zona de gol — defesa recupera
          const defender = pickZoneDefender(defOccupants, zone, rng);
          if (defender) {
            newState.possession = side === 'home' ? 'away' : 'home';
            newState.ballHolderId = defender.player.id;
            newState.passChain = 0;

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
