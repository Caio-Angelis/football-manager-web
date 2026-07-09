// Estado dinâmico — Fase 6 da checklist do motor v2
// Fadiga acumulada afeta produção após ~70'.
// Swing combinado de fadiga+moral+momentum+casa é limitado (clamp ±0.15).
// Vantagem de casa é variável (torcida/importância), não constante.

import type { Team, Player, LiveMatchState } from '../../types/game';

// ============================================================
// 6.1 — Fadiga acumulada afeta produção após ~70'
// ============================================================

/**
 * Calcula o modificador de fadiga para um jogador.
 * Antes dos 70': fadiga tem efeito leve.
 * Após os 70': fadiga acumulada derruba a produção mais rapidamente.
 */
export function fatigueProductionMod(state: LiveMatchState, player: Player, minute: number): number {
  const fatigue = state.fatigue?.[player.id] ?? 0;
  if (fatigue <= 0) return 1.0;

  // Antes dos 70': penalidade leve (até -5%)
  if (minute < 70) {
    return Math.max(0.95, 1 - fatigue * 0.08);
  }

  // Após os 70': penalidade escalada (até -25%)
  const lateGameScale = 1 + (minute - 70) / 20 * 0.5; // 70'=1.0, 90'=1.5
  return Math.max(0.75, 1 - fatigue * 0.15 * lateGameScale);
}

// ============================================================
// 6.2 — Swing combinado limitado (clamp ±0.15)
// ============================================================

/**
 * Calcula o swing combinado de fadiga + moral + momentum + casa.
 * O total é limitado a ±0.15 para evitar outliers por sorte empilhada.
 */
export function combinedSwing(
  state: LiveMatchState,
  team: Team,
  side: 'home' | 'away',
  minute: number,
  isHome: boolean,
): number {
  // Fadiga média do XI
  const xi = team.startingXI;
  let avgFatigue = 0;
  for (const id of xi) {
    avgFatigue += state.fatigue?.[id] ?? 0;
  }
  avgFatigue /= Math.max(xi.length, 1);
  const fatigueSwing = -avgFatigue * 0.08 * (minute >= 70 ? 1.5 : 1.0);

  // Moral média do XI
  let avgMorale = 0;
  for (const p of team.squad) {
    if (xi.includes(p.id)) avgMorale += p.morale ?? 50;
  }
  avgMorale /= Math.max(xi.length, 1);
  const moraleSwing = ((avgMorale - 50) / 50) * 0.06;

  // Momentum (-1..1, positivo = casa embalada)
  const momentum = state.momentum ?? 0;
  const momentumSwing = (isHome ? momentum : -momentum) * 0.05;

  // Vantagem de casa variável (mandante ganha, visitante perde)
  const homeAdv = isHome ? homeAdvantageMod(team, state) : awayDisadvantageMod(team, state);

  // Soma e clamp ±0.15 (blueprint Seção 7: qualidade+duelo dominam, estado tempera)
  const total = fatigueSwing + moraleSwing + momentumSwing + homeAdv;
  return Math.max(-0.15, Math.min(0.15, total));
}

// ============================================================
// 6.3 — Vantagem de casa variável (torcida/importância)
// ============================================================

/**
 * Calcula a vantagem de casa para o time mandante.
 * Não é constante — varia por:
 *   - Reputação do clube (torcida maior = mais pressão)
 *   - Forma recente (time embalado em casa é mais forte)
 *   - Importância do jogo (derby/clássico = mais pressão)
 *   - Moral da torcida (fanMood)
 */
export function homeAdvantageMod(team: Team, state: LiveMatchState): number {
  // Base: +0.04 a +0.10
  const reputation = team.reputation ?? 50;
  const baseAdv = 0.057 + (reputation / 100) * 0.07; // 0.057-0.127

  // Forma recente: time em boa forma em casa é mais forte
  const formRating = team.formRating ?? 'average';
  const formMod = formRating === 'excellent' ? 0.03
    : formRating === 'good' ? 0.015
    : formRating === 'poor' ? -0.015
    : formRating === 'terrible' ? -0.03
    : 0;

  // Moral da torcida não está disponível em Team (está no GameStore global).
  // Usa reputation como proxy para tamanho de torcida.

  return Math.max(0.03, Math.min(0.14, baseAdv + formMod));
}

/**
 * Modificador de vantagem de casa para o visitante (negativo).
 */
export function awayDisadvantageMod(team: Team, state: LiveMatchState): number {
  // Visitante sofre pressão, mas time de maior reputação sofre menos
  const reputation = team.reputation ?? 50;
  const baseDis = -0.05 - (1 - reputation / 100) * 0.06; // -0.05 a -0.11

  // Time em boa forma fora de casa sofre menos
  const formRating = team.formRating ?? 'average';
  const formMod = formRating === 'excellent' ? 0.015
    : formRating === 'good' ? 0.008
    : formRating === 'poor' ? -0.008
    : 0;

  return Math.max(-0.14, Math.min(-0.02, baseDis + formMod));
}
