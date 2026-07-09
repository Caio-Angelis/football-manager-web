// Roles & Atributos por função — Fase 1 da checklist do motor v2
// Define ROLE_WEIGHTS (key attributes por role/duty), FORMATION_LAYOUT (coordenadas por slot),
// familiaridade posicional e effectiveStrength (a "forçaEfetiva" do blueprint).
//
// Nomes de atributos batem EXATAMENTE com PlayerAttribute/GKAttributes em player.ts.
// Reaproveita getMoraleFactor e o padrão ((form)/100)*.5+.5 do motor v1.

import type { Player, PlayerAttribute, GKAttributes } from '../../types/game';

// ============================================================
// TIPOS AUXILIARES
// ============================================================

// Chaves de atributo que podem ser ponderadas (técnicos + mentais + físicos + GK)
export type AttrKey = keyof PlayerAttribute | keyof GKAttributes;

// Peso de cada atributo para um par (role, duty)
export type RoleWeightMap = Partial<Record<AttrKey, number>>;

// ============================================================
// 1.1 — ROLE_WEIGHTS: role → duty → Record<atributo, peso>
// ============================================================
// Key attributes com peso alto (3-4); atributos secundários peso médio (1-2);
// atributos não listados têm peso base 0.5 (não zero — todo atributo contribui um pouco).
// 16+ roles cobrindo todas as linhas (Seção 2 do blueprint).

const BASE_WEIGHT = 0.5; // peso de atributos não listados

// Helper: pesos por role (independente de duty — duty ajusta abaixo)
function roleWeights(
  key: Partial<Record<AttrKey, number>>,
  secondary: Partial<Record<AttrKey, number>> = {},
): RoleWeightMap {
  const out: RoleWeightMap = {};
  for (const [k, v] of Object.entries(key)) out[k as AttrKey] = v as number;
  for (const [k, v] of Object.entries(secondary)) out[k as AttrKey] = v as number;
  return out;
}

// Ajuste por duty: Attack aumenta peso de atributos ofensivos, Defend de defensivos
const DUTY_MODIFIERS: Record<string, { boost: AttrKey[]; penalty: AttrKey[] }> = {
  attack: {
    boost: ['finishing', 'dribbling', 'crossing', 'offBall', 'vision', 'technique', 'longShots'],
    penalty: ['tackling', 'marking', 'positioning'],
  },
  defend: {
    boost: ['tackling', 'marking', 'positioning', 'concentration', 'heading'],
    penalty: ['finishing', 'dribbling', 'offBall', 'longShots'],
  },
  support: {
    boost: ['passing', 'decisions', 'teamWork', 'workRate'],
    penalty: [],
  },
  balance: {
    boost: [],
    penalty: [],
  },
};

// Definições base por role (sem duty — duty aplica modificadores em cima)
const ROLE_DEFINITIONS: Record<string, RoleWeightMap> = {
  // GK
  goalkeeper: roleWeights(
    { reflexes: 4, positioning: 3, handballing: 3, oneOnOne: 3, commandOfArea: 2, aerialReach: 2, communication: 2 },
  ),
  sweeperKeeper: roleWeights(
    { reflexes: 3, positioning: 3, rushing: 3, throwing: 2, oneOnOne: 3, aerialReach: 2, commandOfArea: 2, passing: 2 },
  ),

  // DEF central
  centralDefender: roleWeights(
    { tackling: 4, marking: 4, heading: 3, positioning: 4, strength: 3, concentration: 3, anticipation: 2 },
  ),
  ballPlayingDefender: roleWeights(
    { tackling: 3, marking: 3, positioning: 3, passing: 4, technique: 3, vision: 3, composure: 3, heading: 2 },
  ),

  // DEF lateral
  fullBack: roleWeights(
    { tackling: 3, marking: 3, positioning: 3, speed: 3, stamina: 3, crossing: 2, anticipation: 2 },
  ),
  wingBack: roleWeights(
    { crossing: 4, speed: 4, stamina: 4, dribbling: 3, tackling: 2, positioning: 2, acceleration: 3 },
  ),
  invertedFullBack: roleWeights(
    { tackling: 3, positioning: 3, passing: 3, technique: 3, vision: 2, dribbling: 2, composure: 2, marking: 2 },
  ),

  // MID defensivo
  defensiveMidfielder: roleWeights(
    { tackling: 4, marking: 3, positioning: 4, stamina: 3, strength: 3, anticipation: 3, passing: 2, decisions: 3 },
  ),
  deepLyingPlaymaker: roleWeights(
    { passing: 4, vision: 4, technique: 3, composure: 3, decisions: 3, positioning: 2, anticipation: 2, firstTouch: 3 },
  ),
  anchor: roleWeights(
    { positioning: 4, marking: 3, tackling: 3, strength: 3, concentration: 3, anticipation: 2, stamina: 2 },
  ),

  // MID central
  centralMidfielder: roleWeights(
    { passing: 3, stamina: 3, decisions: 3, technique: 2, positioning: 2, teamWork: 3, workRate: 2 },
  ),
  boxToBox: roleWeights(
    { stamina: 4, workRate: 4, passing: 3, tackling: 2, technique: 2, acceleration: 2, positioning: 2, decisions: 2 },
  ),
  mezzala: roleWeights(
    { dribbling: 3, technique: 3, passing: 3, offBall: 3, agility: 2, vision: 2, acceleration: 2 },
  ),

  // MID ofensivo
  attackingMidfielder: roleWeights(
    { vision: 3, technique: 3, passing: 3, dribbling: 2, offBall: 2, composure: 2, finishing: 2 },
  ),
  advancedPlaymaker: roleWeights(
    { vision: 4, passing: 4, technique: 3, composure: 3, firstTouch: 3, decisions: 2, offBall: 2 },
  ),

  // Flanco
  winger: roleWeights(
    { dribbling: 4, crossing: 3, speed: 4, acceleration: 3, technique: 2, agility: 2, offBall: 2 },
  ),
  invertedWinger: roleWeights(
    { dribbling: 4, technique: 3, finishing: 2, vision: 2, composure: 2, agility: 2, offBall: 2 },
  ),

  // ATA
  advancedForward: roleWeights(
    { finishing: 4, composure: 3, offBall: 3, technique: 2, heading: 2, speed: 2, anticipation: 2 },
  ),
  targetMan: roleWeights(
    { heading: 4, strength: 4, jumping: 3, finishing: 3, bravery: 2, balance: 2, offBall: 2 },
  ),
  poacher: roleWeights(
    { finishing: 4, offBall: 4, composure: 3, anticipation: 3, acceleration: 2, positioning: 2, speed: 2 },
  ),
  falseNine: roleWeights(
    { technique: 3, vision: 3, passing: 3, dribbling: 3, composure: 2, offBall: 2, firstTouch: 2, decisions: 2 },
  ),
  completeForward: roleWeights(
    { finishing: 3, technique: 3, dribbling: 3, heading: 2, strength: 2, vision: 2, offBall: 2, composure: 2, passing: 2 },
  ),
};

// Constrói ROLE_WEIGHTS aplicando modificadores de duty
export const ROLE_WEIGHTS: Record<string, Record<string, RoleWeightMap>> = {};

for (const [roleName, baseWeights] of Object.entries(ROLE_DEFINITIONS)) {
  ROLE_WEIGHTS[roleName] = {};
  for (const duty of ['defend', 'support', 'attack', 'balance']) {
    const mod = DUTY_MODIFIERS[duty] ?? DUTY_MODIFIERS.balance;
    const adjusted: RoleWeightMap = { ...baseWeights };
    for (const attr of mod.boost) {
      adjusted[attr] = (adjusted[attr] ?? BASE_WEIGHT) + 1;
    }
    for (const attr of mod.penalty) {
      adjusted[attr] = Math.max(0.1, (adjusted[attr] ?? BASE_WEIGHT) - 0.5);
    }
    ROLE_WEIGHTS[roleName][duty] = adjusted;
  }
}

// ============================================================
// 1.2 — Familiaridade posicional (consome positionProficiency)
// ============================================================

// Mapa role → posição granular (para cruzar com positionProficiency)
// Posições granulares: GK, DL, DC, DR, DML, DMC, DMR, ML, MC, MR, AML, AMC, AMR, FL, FC, FR
const ROLE_POSITION_MAP: Record<string, string> = {
  goalkeeper: 'GK',
  sweeperKeeper: 'GK',
  centralDefender: 'DC',
  ballPlayingDefender: 'DC',
  fullBack: 'DL',
  wingBack: 'DL',
  invertedFullBack: 'DL',
  defensiveMidfielder: 'DMC',
  deepLyingPlaymaker: 'DMC',
  anchor: 'DMC',
  centralMidfielder: 'MC',
  boxToBox: 'MC',
  mezzala: 'MC',
  attackingMidfielder: 'AMC',
  advancedPlaymaker: 'AMC',
  winger: 'FL',
  invertedWinger: 'FL',
  advancedForward: 'FC',
  targetMan: 'FC',
  poacher: 'FC',
  falseNine: 'FC',
  completeForward: 'FC',
};

// Mapa posição granular → posição grosseira (GK/DEF/MID/FWD)
const GRANULAR_TO_COARSE: Record<string, string> = {
  GK: 'GK',
  DL: 'DEF', DC: 'DEF', DR: 'DEF',
  DML: 'DEF', DMC: 'DEF', DMR: 'DEF',
  ML: 'MID', MC: 'MID', MR: 'MID',
  AML: 'MID', AMC: 'MID', AMR: 'MID',
  FL: 'FWD', FC: 'FWD', FR: 'FWD',
};

/**
 * Fator de familiaridade posicional (0.60 – 1.00).
 * Usa positionProficiency (1-20) quando disponível; cai para secondaryPositions;
 * cai para posição grosseira (GK/DEF/MID/FWD) como último recurso.
 */
export function positionFamiliarity(player: Player, role: string): number {
  const granular = ROLE_POSITION_MAP[role];
  if (!granular) return 0.85; // role desconhecida → penalidade moderada

  const coarse = GRANULAR_TO_COARSE[granular] ?? player.position;

  // 1. Proficiency direta na posição granular (1-20 → 0.60-1.00)
  const prof = player.positionProficiency?.[granular];
  if (typeof prof === 'number' && prof > 0) {
    return 0.60 + (prof / 20) * 0.40;
  }

  // 2. Posição granular está em secondaryPositions
  if (player.secondaryPositions?.includes(granular)) {
    return 0.87; // posição secundária/aprendida
  }

  // 3. Posição grosseira bate (GK/DEF/MID/FWD)
  if (player.position === coarse) {
    return 0.92; // mesma linha, posição aproximada
  }

  // 4. Posição grosseira em secondaryPositions
  if (player.secondaryPositions?.includes(coarse)) {
    return 0.75;
  }

  // 5. Posição estranha
  return 0.65;
}

// ============================================================
// 1.3 — FORMATION_LAYOUT: formação → Array<{x, y, zone}> por slotIndex
// ============================================================

export interface SlotCoord {
  x: number;      // profundidade: 0 = próprio gol, 1 = gol adversário
  y: number;      // lateralidade: 0 = esquerda, 0.5 = centro, 1 = direita
  zone: string;   // identificador de zona granular (ex: 'DC', 'MR')
}

// 4-4-2: GK, DL, DC, DC, DR, ML, MC, MC, MR, FC, FC
const LAYOUT_442: SlotCoord[] = [
  { x: 0.05, y: 0.50, zone: 'GK' },
  { x: 0.20, y: 0.10, zone: 'DL' },
  { x: 0.20, y: 0.40, zone: 'DC' },
  { x: 0.20, y: 0.60, zone: 'DC' },
  { x: 0.20, y: 0.90, zone: 'DR' },
  { x: 0.45, y: 0.10, zone: 'ML' },
  { x: 0.45, y: 0.40, zone: 'MC' },
  { x: 0.45, y: 0.60, zone: 'MC' },
  { x: 0.45, y: 0.90, zone: 'MR' },
  { x: 0.75, y: 0.40, zone: 'FC' },
  { x: 0.75, y: 0.60, zone: 'FC' },
];

// 4-3-3: GK, DL, DC, DC, DR, MC, MC, MC, FL, FC, FR
const LAYOUT_433: SlotCoord[] = [
  { x: 0.05, y: 0.50, zone: 'GK' },
  { x: 0.20, y: 0.10, zone: 'DL' },
  { x: 0.20, y: 0.40, zone: 'DC' },
  { x: 0.20, y: 0.60, zone: 'DC' },
  { x: 0.20, y: 0.90, zone: 'DR' },
  { x: 0.42, y: 0.35, zone: 'MC' },
  { x: 0.42, y: 0.50, zone: 'MC' },
  { x: 0.42, y: 0.65, zone: 'MC' },
  { x: 0.70, y: 0.15, zone: 'FL' },
  { x: 0.75, y: 0.50, zone: 'FC' },
  { x: 0.70, y: 0.85, zone: 'FR' },
];

// 3-5-2: GK, DC, DC, DC, DML, MC, MC, MC, DMR, FC, FC
const LAYOUT_352: SlotCoord[] = [
  { x: 0.05, y: 0.50, zone: 'GK' },
  { x: 0.18, y: 0.30, zone: 'DC' },
  { x: 0.18, y: 0.50, zone: 'DC' },
  { x: 0.18, y: 0.70, zone: 'DC' },
  { x: 0.30, y: 0.10, zone: 'DML' },
  { x: 0.45, y: 0.35, zone: 'MC' },
  { x: 0.45, y: 0.50, zone: 'MC' },
  { x: 0.45, y: 0.65, zone: 'MC' },
  { x: 0.30, y: 0.90, zone: 'DMR' },
  { x: 0.75, y: 0.40, zone: 'FC' },
  { x: 0.75, y: 0.60, zone: 'FC' },
];

// 5-2-2: GK, DL, DC, DC, DC, DR, MC, MC, AML, AMR, FC
const LAYOUT_522: SlotCoord[] = [
  { x: 0.05, y: 0.50, zone: 'GK' },
  { x: 0.18, y: 0.10, zone: 'DL' },
  { x: 0.18, y: 0.35, zone: 'DC' },
  { x: 0.18, y: 0.50, zone: 'DC' },
  { x: 0.18, y: 0.65, zone: 'DC' },
  { x: 0.18, y: 0.90, zone: 'DR' },
  { x: 0.42, y: 0.40, zone: 'MC' },
  { x: 0.42, y: 0.60, zone: 'MC' },
  { x: 0.60, y: 0.15, zone: 'AML' },
  { x: 0.60, y: 0.85, zone: 'AMR' },
  { x: 0.75, y: 0.50, zone: 'FC' },
];

export const FORMATION_LAYOUT: Record<string, SlotCoord[]> = {
  '4-4-2': LAYOUT_442,
  '4-3-3': LAYOUT_433,
  '3-5-2': LAYOUT_352,
  '5-2-2': LAYOUT_522,
};

// ============================================================
// 1.4 — effectiveStrength(jogador, role, duty)
// ============================================================

// Helper: extrai valor de atributo do jogador (técnico, mental, físico ou GK)
function getAttr(player: Player, key: AttrKey): number {
  const t = player.technical as unknown as Record<string, number | undefined>;
  const m = player.mental as unknown as Record<string, number | undefined>;
  const p = player.physical as unknown as Record<string, number | undefined>;
  const gk = player.goalkeeping as unknown as Record<string, number | undefined> | undefined;

  // Tenta técnico, depois mental, depois físico, depois GK
  const val = t[key] ?? m[key] ?? p[key] ?? gk?.[key];
  return typeof val === 'number' && Number.isFinite(val) ? val : 10;
}

// Helper: moral (reaproveita lógica do motor v1)
function moraleFactor(player: Player): number {
  const morale = player.morale ?? 50;
  return Math.max(0.75, Math.min(1.20, 1.0 + ((morale - 50) / 50) * 0.25));
}

/**
 * Calcula a força efetiva de um jogador numa role+duty específicas.
 *
 * forçaEfetiva = Σ (atributo_i × peso_i(role, duty)) × familiaridade × fitness × moral × forma
 *
 * Retorna um número na mesma escala do calculateTeamStrength do v1 (~50-100).
 */
export function effectiveStrength(
  player: Player,
  role: string,
  duty: string,
): number {
  const weights = ROLE_WEIGHTS[role]?.[duty] ?? ROLE_WEIGHTS[role]?.['balance'] ?? {};

  // Soma ponderada de todos os atributos relevantes
  let weightedSum = 0;
  let totalWeight = 0;

  // Atributos técnicos
  const techKeys: AttrKey[] = ['heading', 'crossing', 'tackling', 'technique', 'finishing', 'passing', 'firstTouch', 'dribbling', 'marking', 'freeKicks', 'longShots', 'throwIns'];
  // Atributos mentais
  const mentalKeys: AttrKey[] = ['aggression', 'anticipation', 'bravery', 'composure', 'concentration', 'decisions', 'determination', 'improvise', 'positioning', 'leadership', 'teamWork', 'vision', 'offBall', 'workRate'];
  // Atributos físicos
  const physKeys: AttrKey[] = ['acceleration', 'speed', 'strength', 'stamina', 'agility', 'naturalFitness', 'jumping', 'balance'];
  // Atributos GK
  const gkKeys: AttrKey[] = ['aerialReach', 'commandOfArea', 'communication', 'eccentricity', 'handballing', 'punching', 'throwing', 'reflexes', 'rushing', 'tendencyToCome', 'oneOnOne'];

  const allKeys = [...techKeys, ...mentalKeys, ...physKeys, ...gkKeys];

  for (const key of allKeys) {
    const w = weights[key] ?? BASE_WEIGHT;
    const val = getAttr(player, key);
    weightedSum += val * w;
    totalWeight += w;
  }

  if (totalWeight === 0) totalWeight = 1;
  const avgWeighted = weightedSum / totalWeight; // ~1-20

  // Familiaridade posicional (0.60-1.00)
  const fam = positionFamiliarity(player, role);

  // Condição física (fitness 0-100 → 0.5-1.0)
  const fitness = player.fitness ?? 50;
  const fitnessMod = (fitness / 100) * 0.5 + 0.5;

  // Moral (0.75-1.20)
  const morale = moraleFactor(player);

  // Forma (0-100 → 0.5-1.0)
  const form = player.form ?? 50;
  const formMod = (form / 100) * 0.5 + 0.5;

  // CA como modificador base (1-200 → normalizado 0.5-1.5)
  const ca = player.currentAbility ?? 50;
  const caMod = 0.5 + (ca / 200) * 1.0;

  // Combina: média ponderada (1-20) × 5 (escala ~5-100) × familiaridade × fitness × moral × forma × CA
  const strength = avgWeighted * 5 * fam * fitnessMod * morale * formMod * caMod;

  return Math.max(1, Math.min(200, strength));
}
