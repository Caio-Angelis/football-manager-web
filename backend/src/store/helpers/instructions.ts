// Instruções relacionais — Fase 5 da checklist do motor v2
// Substitui o multiplicador tático fixo (getTacticalBonus/tacticAttackMult) por
// uma matriz de interações: pressão alta vs saída de bola, etc.
// Mentalidade global desloca a régua de risco dos duties (não é multiplicador de gols).

import type { Team, Player } from '../../types/game';

// ============================================================
// 5.1 — Matriz de instruções relacionais
// ============================================================
// Cada par (instruçãoA, instruçãoB) tem um modificador relacional.
// Ex: pressão alta GANHA contra saída de bola ruim e PERDE contra boa saída + ataque rápido.

export interface RelationalMatchup {
  attInstruction: string;  // instrução do time atacante (com a bola)
  defInstruction: string;  // instrução do time defensor (sem a bola)
  modifier: number;        // modificador no duelo/pressão (-0.15 a +0.15)
  description: string;
}

// Matriz de interações principais (Seção 5 do blueprint)
const RELATIONAL_MATRIX: RelationalMatchup[] = [
  // Pressão alta vs saída de bola
  { attInstruction: 'shortBuildup', defInstruction: 'highPress', modifier: -0.08, description: 'pressão alta incomoda saída curta' },
  { attInstruction: 'directBuildup', defInstruction: 'highPress', modifier: 0.06, description: 'saída direta bypassa pressão alta' },
  { attInstruction: 'shortBuildup', defInstruction: 'lowPress', modifier: 0.05, description: 'saída curta confortável contra pressão baixa' },
  { attInstruction: 'directBuildup', defInstruction: 'lowPress', modifier: -0.03, description: 'saída direta desperdiça posse contra bloco baixo' },

  // Linha defensiva alta vs ataque rápido
  { attInstruction: 'counterAttack', defInstruction: 'highLine', modifier: 0.10, description: 'contra-ataque explora linha alta' },
  { attInstruction: 'counterAttack', defInstruction: 'lowLine', modifier: -0.06, description: 'linha baixa anula contra-ataque' },
  { attInstruction: 'possession', defInstruction: 'highLine', modifier: -0.04, description: 'posse lenta sofre com linha alta (menos espaço)' },
  { attInstruction: 'possession', defInstruction: 'lowLine', modifier: 0.03, description: 'posse encontra espaço contra linha baixa' },

  // Flanco vs cobertura
  { attInstruction: 'wideAttack', defInstruction: 'narrowDefense', modifier: 0.08, description: 'ataque pela ponta explora defesa estreita' },
  { attInstruction: 'wideAttack', defInstruction: 'wideDefense', modifier: -0.04, description: 'defesa larga cobre ataque pela ponta' },
  { attInstruction: 'centralAttack', defInstruction: 'narrowDefense', modifier: -0.05, description: 'defesa estreita protege o centro' },
  { attInstruction: 'centralAttack', defInstruction: 'wideDefense', modifier: 0.06, description: 'ataque central explora defesa larga' },

  // Tackling agressivo vs jogo rápido
  { attInstruction: 'fastTempo', defInstruction: 'aggressiveTackling', modifier: 0.04, description: 'jogo rápido evita faltas do tackling agressivo' },
  { attInstruction: 'slowTempo', defInstruction: 'aggressiveTackling', modifier: -0.06, description: 'jogo lento sofre faltas do tackling agressivo' },
  { attInstruction: 'fastTempo', defInstruction: 'containTackling', modifier: -0.03, description: 'contenção neutraliza jogo rápido' },
  { attInstruction: 'slowTempo', defInstruction: 'containTackling', modifier: 0.02, description: 'jogo lento encontra espaço contra contenção' },

  // Offside trap vs through balls
  { attInstruction: 'throughBalls', defInstruction: 'offsideTrap', modifier: -0.07, description: 'armadilha de offside anula passes profundos' },
  { attInstruction: 'throughBalls', defInstruction: 'noOffsideTrap', modifier: 0.05, description: 'sem armadilha, passes profundos funcionam' },
];

/**
 * Deriva a instrução "ativa" de um time a partir de suas configurações táticas.
 */
export function deriveActiveInstruction(team: Team, hasPossession: boolean): string {
  if (hasPossession) {
    // Instruções do time com a bola
    if (team.afterGainingPossession === 'counterAttack') return 'counterAttack';
    if (team.passingStyle === 'direct') return 'directBuildup';
    if (team.passingStyle === 'short') return 'shortBuildup';
    if (team.workBallIntoBox) return 'possession';
    if (team.crossFromWide || team.attackWidth === 'wide') return 'wideAttack';
    if (team.attackWidth === 'narrow') return 'centralAttack';
    if (team.tempo === 'fast') return 'fastTempo';
    if (team.tempo === 'slow') return 'slowTempo';
    return 'shortBuildup';
  } else {
    // Instruções do time sem a bola
    if (team.pressIntensity === 'high' || team.highPress) return 'highPress';
    if (team.pressIntensity === 'low') return 'lowPress';
    if (team.defensiveLine === 'high') return 'highLine';
    if (team.defensiveLine === 'low') return 'lowLine';
    if (team.tacklingStyle === 'aggressive') return 'aggressiveTackling';
    if (team.tacklingStyle === 'contain') return 'containTackling';
    if (team.trapOffside) return 'offsideTrap';
    if (team.attackWidth === 'narrow') return 'narrowDefense';
    if (team.attackWidth === 'wide') return 'wideDefense';
    return 'mediumPress';
  }
}

/**
 * Calcula o modificador relacional entre as instruções dos dois times.
 * Retorna um número entre -0.15 e +0.15 que modula o duelo/pressão.
 */
export function relationalModifier(attackingTeam: Team, defendingTeam: Team): number {
  const attInstr = deriveActiveInstruction(attackingTeam, true);
  const defInstr = deriveActiveInstruction(defendingTeam, false);

  let mod = 0;
  for (const matchup of RELATIONAL_MATRIX) {
    if (matchup.attInstruction === attInstr && matchup.defInstruction === defInstr) {
      mod += matchup.modifier;
    }
  }

  return Math.max(-0.15, Math.min(0.15, mod));
}

// ============================================================
// 5.2 — Sem multiplicador tático fixo no v2
// ============================================================
// No v2, getTacticalBonus e tacticAttackMult NÃO são usados.
// O efeito tático vem de:
//   1. effectiveStrength (role/duty já ponderam atributos)
//   2. relationalModifier (interação entre instruções)
//   3. mentalityRiskShift (régua de risco por mentalidade)
//
// Esta função substitui getTacticalBonus no v2:
export function v2TacticalModifier(attackingTeam: Team, defendingTeam: Team): number {
  const relational = relationalModifier(attackingTeam, defendingTeam);
  const mentality = mentalityRiskShift(attackingTeam);
  return relational + mentality;
}

// ============================================================
// 5.3 — Mentalidade global desloca régua de risco dos duties
// ============================================================
// Mentalidade ofensiva não aumenta gols diretamente — desloca a régua de risco:
// jogadores em 'support' se comportam mais como 'attack', e 'defend' como 'support'.
// Isso muda o DUTY_X_SHIFT efetivo e a probabilidade de ações arriscadas.

export function mentalityRiskShift(team: Team): number {
  const mentality = team.teamMentality ?? 'balanced';
  switch (mentality) {
    case 'very offensive': return 0.06;
    case 'offensive': return 0.03;
    case 'positive': return 0.01;
    case 'cautious': return -0.01;
    case 'defensive': return -0.03;
    case 'very defensive': return -0.06;
    default: return 0;
  }
}

/**
 * Mapeia o duty efetivo de um jogador baseado na mentalidade global do time.
 * 'very offensive' faz 'support' virar 'attack', 'defend' virar 'support'.
 * 'very defensive' faz 'attack' virar 'support', 'support' virar 'defend'.
 */
export function effectiveDuty(duty: string, team: Team): string {
  const mentality = team.teamMentality ?? 'balanced';

  if (mentality === 'very offensive') {
    if (duty === 'support') return 'attack';
    if (duty === 'defend') return 'support';
  } else if (mentality === 'offensive') {
    if (duty === 'defend') return 'support';
  } else if (mentality === 'very defensive') {
    if (duty === 'attack') return 'support';
    if (duty === 'support') return 'defend';
  } else if (mentality === 'defensive') {
    if (duty === 'attack') return 'support';
  }

  return duty;
}

/**
 * Modificador de probabilidade de ações arriscadas baseado na mentalidade.
 * Mentalidade ofensiva aumenta chance de drible/chute, mentalidade defensiva reduz.
 */
export function mentalityActionMod(team: Team): { shotMod: number; dribbleMod: number; passRiskMod: number } {
  const shift = mentalityRiskShift(team);
  return {
    shotMod: 1 + shift * 2,      // mentalidade ofensiva = mais chutes
    dribbleMod: 1 + shift * 1.5, // mentalidade ofensiva = mais dribles
    passRiskMod: 1 + shift,      // mentalidade ofensiva = passes mais arriscados
  };
}
