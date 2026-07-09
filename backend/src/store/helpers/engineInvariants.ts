// Tabela de invariantes — fonte única para testes e harness (Seção 0.4 da checklist)
// Cada constante nomeada é consumida por testes de balanceamento e pelo headless_sim.

export const PERF_BUDGET_MATCH_MS = 50;   // orçamento de perf para 1 partida (90')
export const PERF_BUDGET_ROUND_MS = 1000; // orçamento de perf para 1 rodada de liga (partidas de fundo)

export const INVARIANTS = {
  goalsPerMatch:    { min: 2.5, max: 2.9 },
  homeWinPct:       { min: 45,  max: 48  },
  drawPct:          { min: 24,  max: 28  },
  championPoints:   { min: 75,  max: 88  },
  setPieceGoalPct:  { min: 25,  max: 30  },
  counterGoalPct:   { min: 10,  max: 100 }, // >10%, sem teto superior rígido
  upsetRatePct:     { min: 25,  max: 35  },
  perfMatchMs:      PERF_BUDGET_MATCH_MS,
  perfRoundMs:      PERF_BUDGET_ROUND_MS,
} as const;

// Seeds fixas para reprodutibilidade do harness v1×v2
export const HARNESS_SEEDS: number[] = Array.from({ length: 50 }, (_, i) => 1000 + i);

// Gap de força fixo para o teste de upset: time A (incoerente) = 130% de B (coerente)
export const UPSET_STRENGTH_GAP = 1.30;
export const UPSET_TARGET_PCT = 25; // winRate(B_coeso) >= 25%
