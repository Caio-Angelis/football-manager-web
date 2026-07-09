// headless_v1v2.ts — Harness comparativo v1×v2 (Pilar A) + benchmark de perf (Pilar B)
// Roda os mesmos confrontos com as mesmas seeds nos dois motores e emite relatório lado a lado.
// Uso: npx tsx headless_v1v2.ts
// Comando para batch: python run_batch.py (roda 30× e agrega)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { useGameStore } from './src/store/gameStore';
import * as engine from './src/store/helpers/matchEngine';
import { HARNESS_SEEDS, INVARIANTS, PERF_BUDGET_MATCH_MS, PERF_BUDGET_ROUND_MS, UPSET_STRENGTH_GAP, UPSET_TARGET_PCT } from './src/store/helpers/engineInvariants';
import { buildUpsetMatchup, applyRefCoeso, applyRefIncoerente } from './src/store/helpers/engineSetups';
import type { Team } from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// TIPOS PARA MÉTRICAS
// ============================================================

interface EngineMetrics {
  engine: 'v1' | 'v2';
  avgGoals: number;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  avgMatchMs: number;
  roundMs: number;
  totalMatches: number;
}

interface UpsetResult {
  engine: 'v1' | 'v2';
  winsB: number;
  draws: number;
  winsA: number;
  total: number;
  winRateB: number;
}

interface HarnessOutput {
  v1: EngineMetrics;
  v2: EngineMetrics;
  upset: { v1: UpsetResult; v2: UpsetResult };
  perf: {
    v1MatchMs: number;
    v2MatchMs: number;
    v1RoundMs: number;
    v2RoundMs: number;
    budgetMatchMs: number;
    budgetRoundMs: number;
    v1WithinBudget: boolean;
    v2WithinBudget: boolean;
  };
  invariants: typeof INVARIANTS;
}

// ============================================================
// SIMULAÇÃO COMPARATIVA
// ============================================================

function runEngineComparison(teams: Team[], seeds: number[], engineFn: typeof engine.simulateFullMatchV1 | typeof engine.simulateFullMatchV2, label: 'v1' | 'v2'): EngineMetrics {
  let totalGoals = 0;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let totalMs = 0;

  for (let i = 0; i < seeds.length; i++) {
    const home = teams[i % teams.length];
    const away = teams[(i + 1) % teams.length];
    const seed = seeds[i];

    const t0 = performance.now();
    const result = engineFn(home, away, 0, 0, seed);
    const ms = performance.now() - t0;

    totalMs += ms;
    totalGoals += result.homeGoals + result.awayGoals;

    if (result.homeGoals > result.awayGoals) homeWins++;
    else if (result.homeGoals < result.awayGoals) awayWins++;
    else draws++;
  }

  const n = seeds.length;
  return {
    engine: label,
    avgGoals: totalGoals / n,
    homeWinPct: (homeWins / n) * 100,
    drawPct: (draws / n) * 100,
    awayWinPct: (awayWins / n) * 100,
    avgMatchMs: totalMs / n,
    roundMs: 0, // preenchido abaixo
    totalMatches: n,
  };
}

function measureRoundPerf(teams: Team[], engineFn: typeof engine.simulateFullMatchV1 | typeof engine.simulateFullMatchV2): number {
  // Simula 1 rodada de liga: N/2 partidas (todos contra todos em 1 semana)
  const n = teams.length;
  const half = Math.floor(n / 2);
  const t0 = performance.now();
  for (let i = 0; i < half; i++) {
    const home = teams[i];
    const away = teams[n - 1 - i];
    engineFn(home, away, 0, 0, 2000 + i);
  }
  return performance.now() - t0;
}

function runUpsetTest(teams: Team[], engineFn: typeof engine.simulateFullMatchV1 | typeof engine.simulateFullMatchV2, label: 'v1' | 'v2'): UpsetResult {
  // Usa o primeiro time como base para o confronto de upset
  const baseTeam = teams[0];
  const { teamA, teamB } = buildUpsetMatchup(baseTeam);

  let winsB = 0;
  let draws = 0;
  let winsA = 0;
  const N = 100;

  for (let i = 0; i < N; i++) {
    // B (coerente) como mandante, A (incoerente + forte) como visitante
    const result = engineFn(teamB, teamA, 0, 0, 3000 + i);
    if (result.homeGoals > result.awayGoals) winsB++;
    else if (result.homeGoals < result.awayGoals) winsA++;
    else draws++;
  }

  return {
    engine: label,
    winsB,
    draws,
    winsA,
    total: N,
    winRateB: (winsB / N) * 100,
  };
}

// ============================================================
// RELATÓRIO
// ============================================================

function formatReport(output: HarnessOutput): string {
  const lines: string[] = [];
  lines.push('=' .repeat(70));
  lines.push('HARNESS v1×v2 — Football Manager Web');
  lines.push(`Seeds: ${HARNESS_SEEDS.length} | Upset sims: 100 | Gap: ${UPSET_STRENGTH_GAP}x`);
  lines.push('=' .repeat(70));
  lines.push('');

  // Tabela de invariantes
  lines.push('INVARIANTES — v1 vs v2 vs alvo');
  lines.push('-'.repeat(70));
  lines.push('  Métrica              v1          v2          Alvo');
  lines.push('  ' + '-'.repeat(66));

  const fmt = (v: number, decimals = 2) => v.toFixed(decimals).padStart(10);

  lines.push(`  Gols/jogo           ${fmt(output.v1.avgGoals)}     ${fmt(output.v2.avgGoals)}     ${INVARIANTS.goalsPerMatch.min}–${INVARIANTS.goalsPerMatch.max}`);
  lines.push(`  % vitória mandante  ${fmt(output.v1.homeWinPct, 1)}%    ${fmt(output.v2.homeWinPct, 1)}%    ${INVARIANTS.homeWinPct.min}–${INVARIANTS.homeWinPct.max}%`);
  lines.push(`  % empates           ${fmt(output.v1.drawPct, 1)}%    ${fmt(output.v2.drawPct, 1)}%    ${INVARIANTS.drawPct.min}–${INVARIANTS.drawPct.max}%`);
  lines.push(`  % vitória visitante ${fmt(output.v1.awayWinPct, 1)}%    ${fmt(output.v2.awayWinPct, 1)}%    —`);
  lines.push('');

  // Performance
  lines.push('PERFORMANCE — v1 vs v2 vs orçamento');
  lines.push('-'.repeat(70));
  lines.push(`  1 partida (média)   ${fmt(output.perf.v1MatchMs)}ms   ${fmt(output.perf.v2MatchMs)}ms   < ${PERF_BUDGET_MATCH_MS}ms`);
  lines.push(`  1 rodada (total)    ${fmt(output.perf.v1RoundMs)}ms   ${fmt(output.perf.v2RoundMs)}ms   < ${PERF_BUDGET_ROUND_MS}ms`);
  lines.push(`  v1 dentro do orçamento: ${output.perf.v1WithinBudget ? 'SIM' : 'NÃO'}`);
  lines.push(`  v2 dentro do orçamento: ${output.perf.v2WithinBudget ? 'SIM' : 'NÃO'}`);
  lines.push('');

  // Upset
  lines.push('TESTE DE UPSET — B (coerente, 100% força) vs A (incoerente, 130% força)');
  lines.push('-'.repeat(70));
  lines.push(`  Engine   vitórias B   empates   vitórias A   winRate B   alvo ≥ ${UPSET_TARGET_PCT}%`);
  lines.push(`  v1       ${String(output.upset.v1.winsB).padStart(5)}       ${String(output.upset.v1.draws).padStart(5)}    ${String(output.upset.v1.winsA).padStart(5)}       ${output.upset.v1.winRateB.toFixed(1).padStart(6)}%   ${output.upset.v1.winRateB >= UPSET_TARGET_PCT ? 'PASS' : 'FAIL'}`);
  lines.push(`  v2       ${String(output.upset.v2.winsB).padStart(5)}       ${String(output.upset.v2.draws).padStart(5)}    ${String(output.upset.v2.winsA).padStart(5)}       ${output.upset.v2.winRateB.toFixed(1).padStart(6)}%   ${output.upset.v2.winRateB >= UPSET_TARGET_PCT ? 'PASS' : 'FAIL'}`);
  lines.push('');

  lines.push('=' .repeat(70));
  lines.push('Fim do relatório');
  lines.push('=' .repeat(70));

  return lines.join('\n');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const startTime = Date.now();
  console.log('=== HARNESS v1×v2 — Comparativo de motores ===\n');

  // Inicializa o jogo
  const store = useGameStore;
  store.getState().initGame();
  const teams = store.getState().teams;
  console.log(`Loaded ${teams.length} teams`);
  console.log(`Seeds: ${HARNESS_SEEDS.length} confrontos por engine\n`);

  // Métricas de invariantes (v1 e v2)
  console.log('Running v1 comparison...');
  const v1Metrics = runEngineComparison(teams, HARNESS_SEEDS, engine.simulateFullMatchV1, 'v1');
  console.log(`  avgGoals: ${v1Metrics.avgGoals.toFixed(2)}, homeWin: ${v1Metrics.homeWinPct.toFixed(1)}%, draws: ${v1Metrics.drawPct.toFixed(1)}%`);

  console.log('Running v2 comparison...');
  const v2Metrics = runEngineComparison(teams, HARNESS_SEEDS, engine.simulateFullMatchV2, 'v2');
  console.log(`  avgGoals: ${v2Metrics.avgGoals.toFixed(2)}, homeWin: ${v2Metrics.homeWinPct.toFixed(1)}%, draws: ${v2Metrics.drawPct.toFixed(1)}%`);

  // Performance de rodada
  console.log('Measuring round performance...');
  const v1RoundMs = measureRoundPerf(teams, engine.simulateFullMatchV1);
  const v2RoundMs = measureRoundPerf(teams, engine.simulateFullMatchV2);
  v1Metrics.roundMs = v1RoundMs;
  v2Metrics.roundMs = v2RoundMs;

  // Teste de upset
  console.log('Running upset test (100 sims per engine)...');
  const upsetV1 = runUpsetTest(teams, engine.simulateFullMatchV1, 'v1');
  const upsetV2 = runUpsetTest(teams, engine.simulateFullMatchV2, 'v2');
  console.log(`  v1 winRate B: ${upsetV1.winRateB.toFixed(1)}%`);
  console.log(`  v2 winRate B: ${upsetV2.winRateB.toFixed(1)}%`);

  // Monta output
  const output: HarnessOutput = {
    v1: v1Metrics,
    v2: v2Metrics,
    upset: { v1: upsetV1, v2: upsetV2 },
    perf: {
      v1MatchMs: v1Metrics.avgMatchMs,
      v2MatchMs: v2Metrics.avgMatchMs,
      v1RoundMs,
      v2RoundMs,
      budgetMatchMs: PERF_BUDGET_MATCH_MS,
      budgetRoundMs: PERF_BUDGET_ROUND_MS,
      v1WithinBudget: v1Metrics.avgMatchMs < PERF_BUDGET_MATCH_MS && v1RoundMs < PERF_BUDGET_ROUND_MS,
      v2WithinBudget: v2Metrics.avgMatchMs < PERF_BUDGET_MATCH_MS && v2RoundMs < PERF_BUDGET_ROUND_MS,
    },
    invariants: INVARIANTS,
  };

  // Relatório
  const report = formatReport(output);
  console.log('\n' + report);

  // Salva JSON
  const outputPath = path.join(__dirname, 'v1v2_output.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nOutput: ${outputPath}`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Elapsed: ${elapsed}s`);

  process.exit(0);
}

main().catch(err => {
  console.error('Harness failed:', err);
  process.exit(1);
});
