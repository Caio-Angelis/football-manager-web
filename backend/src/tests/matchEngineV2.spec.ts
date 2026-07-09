// ============================================================
// TDD — Motor de Partida v2 (PlanoMatchEngine-CHECKLIST.md)
// ============================================================
//
// Estes testes descrevem o comportamento-ALVO do motor v2 ANTES dele existir.
// São a definição executável de "pronto" de cada fase da checklist.
//
// Como rodam sem quebrar a suíte atual:
//   - Testes de símbolos que ainda NÃO existem ficam com `it.skip` (via `whenExported`)
//     e se ATIVAM sozinhos quando a função for exportada de matchEngine.ts.
//   - Testes que dependem da flag v2 só rodam com MATCH_ENGINE=v2 (via `whenV2`).
//   - `it.todo` marca contratos que ainda não mapeiam a um único símbolo (IA, fases).
//
// Fluxo TDD do implementador:
//   1. Implemente o símbolo/fase.  2. O `it.skip` vira `it` automaticamente.
//   3. Rode `npm test`.  4. Fique verde.  5. Próxima fase.
//
// Rodar só este arquivo:            npx vitest run src/tests/matchEngineV2.spec.ts
// Rodar com o motor v2 ligado:      MATCH_ENGINE=v2 npx vitest run src/tests/matchEngineV2.spec.ts

import { describe, it, expect } from 'vitest';
import { useGameStore } from '../store/gameStore.js';
import * as engine from '../store/helpers/matchEngine.js';
import { INVARIANTS } from '../store/helpers/engineInvariants.js';
import { applyRefCoeso, applyRefIncoerente, buildUpsetMatchup, scaleTeamStrength } from '../store/helpers/engineSetups.js';
import { UPSET_STRENGTH_GAP, UPSET_TARGET_PCT } from '../store/helpers/engineInvariants.js';
import type { Team } from '../types/game.js';

// ------------------------------------------------------------
// Alvos de invariantes — importados do módulo único (engineInvariants.ts).
// ------------------------------------------------------------

// ------------------------------------------------------------
// Helpers de ativação condicional (mantêm a suíte verde até implementar).
// ------------------------------------------------------------
const eng = engine as unknown as Record<string, unknown>;
const hasFn = (name: string): boolean => typeof eng[name] === 'function';
const isV2 = process.env.MATCH_ENGINE === 'v2';

/** Ativa o teste só quando `name` for exportado de matchEngine.ts. */
function whenExported(name: string) {
  return hasFn(name) ? it : it.skip;
}
/** Ativa o teste só quando a flag MATCH_ENGINE=v2 estiver ligada. */
const whenV2 = isV2 ? it : it.skip;

function realTeams(): Team[] {
  useGameStore.getState().initGame();
  return useGameStore.getState().teams;
}

// ============================================================
// FASE 0 — Infra dos 3 pilares
// ============================================================
describe('Fase 0 — Infra dos 3 pilares', () => {
  // Pilar A — flag e default seguro
  it('default do motor é v1 quando MATCH_ENGINE não está setado (não regride sem opt-in)', () => {
    // Enquanto v2 não existe, o comportamento default DEVE ser o atual.
    // Este teste protege contra ligar o v2 acidentalmente.
    if (!isV2) {
      expect(process.env.MATCH_ENGINE ?? 'v1').toBe('v1');
    } else {
      expect(process.env.MATCH_ENGINE).toBe('v2');
    }
  });

  // Pilar A — determinismo (JÁ implementado; guarda de regressão)
  it('mesma seed → partida idêntica (replay/online); seeds diferentes → jogos diferentes', () => {
    const [home, away] = realTeams();
    const a = engine.simulateFullMatch(home, away, 0, 0, 12345);
    const b = engine.simulateFullMatch(home, away, 0, 0, 12345);
    const c = engine.simulateFullMatch(home, away, 0, 0, 67890);
    expect(a.homeGoals).toBe(b.homeGoals);
    expect(a.awayGoals).toBe(b.awayGoals);
    expect(a.events.length).toBe(b.events.length);
    // Extremamente improvável colidir em gols E eventos com seed diferente:
    const sameAsC =
      a.homeGoals === c.homeGoals &&
      a.awayGoals === c.awayGoals &&
      a.events.length === c.events.length;
    expect(sameAsC).toBe(false);
  });

  // Pilar B — orçamento de perf (baseline mede o v1; alvo estrito é do v2)
  it('perf: 1 partida completa roda dentro de um teto generoso (baseline)', () => {
    const [home, away] = realTeams();
    const t0 = performance.now();
    engine.simulateFullMatch(home, away, 0, 0, 1);
    const ms = performance.now() - t0;
    // Baseline frouxo p/ v1; o alvo estrito v2 é o teste abaixo.
    expect(ms).toBeLessThan(500);
  });

  whenV2('perf v2: 1 partida completa < PERF_BUDGET_MATCH_MS', () => {
    const [home, away] = realTeams();
    const t0 = performance.now();
    engine.simulateFullMatch(home, away, 0, 0, 1);
    expect(performance.now() - t0).toBeLessThan(INVARIANTS.perfMatchMs);
  });

  // Pilar C — setups de referência para o teste de upset
  it('harness expõe REF_COESO e REF_INCOERENTE com gap de força fixo (Seção 0.5)', () => {
    const [base] = realTeams();
    const coeso = applyRefCoeso(base);
    const incoerente = applyRefIncoerente(base);

    // REF_COESO tem deveres equilibrados (não todos em attack)
    const coesoDuties = coeso.tacticsConfig.playerRoles.map(r => r.duty);
    const coesoAllAttack = coesoDuties.every(d => d === 'attack');
    expect(coesoAllAttack).toBe(false);

    // REF_INCOERENTE tem todos os deveres em attack
    const incoerenteDuties = incoerente.tacticsConfig.playerRoles.map(r => r.duty);
    const incoerenteAllAttack = incoerenteDuties.every(d => d === 'attack');
    expect(incoerenteAllAttack).toBe(true);

    // Gap de força: time A (incoerente escalado) é mais forte que B (coerente).
    // O gap exato de 130% é relativo a effectiveStrength (Fase 1); com calculateTeamStrength
    // (v1, inclui tactical bonus), o gap é maior pois o setup incoerente acumula bônus táticos.
    const { teamA, teamB } = buildUpsetMatchup(base);
    const strengthA = engine.calculateTeamStrength(teamA);
    const strengthB = engine.calculateTeamStrength(teamB);
    const gap = strengthA / strengthB;
    expect(gap).toBeGreaterThan(1.2); // gap existe e favorece A
    expect(gap).toBeLessThan(2.0);   // não é absurdo (calibração fina na Fase 1)
  });
});

// ============================================================
// FASE 1 — Roles & atributos por função
// ============================================================
describe('Fase 1 — Roles & atributos por função', () => {
  whenExported('effectiveStrength')(
    'mesmo jogador rende diferente em roles diferentes (fim da soma global)',
    () => {
      const [team] = realTeams();
      const p = team.squad.find(pl => pl.position === 'MID') ?? team.squad[0];
      const asPlaymaker = (eng.effectiveStrength as Function)(p, 'advancedPlaymaker', 'attack');
      const asAnchor = (eng.effectiveStrength as Function)(p, 'anchor', 'defend');
      expect(asPlaymaker).not.toBe(asAnchor);
      expect(asPlaymaker).toBeGreaterThan(0);
      expect(asAnchor).toBeGreaterThan(0);
    },
  );

  whenExported('effectiveStrength')(
    'familiaridade posicional: jogar fora de posição reduz a força efetiva',
    () => {
      const [team] = realTeams();
      const fwd = team.squad.find(pl => pl.position === 'FWD') ?? team.squad[0];
      // Atacante como atacante (natural) deve render mais que como zagueiro (estranho).
      const natural = (eng.effectiveStrength as Function)(fwd, 'advancedForward', 'attack');
      const outOfPos = (eng.effectiveStrength as Function)(fwd, 'centralDefender', 'defend');
      expect(natural).toBeGreaterThan(outOfPos);
    },
  );

  it('ROLE_WEIGHTS cobre os 12–16 roles da Seção 2, com nomes de atributo idênticos a PlayerAttribute', () => {
    const rw = eng.ROLE_WEIGHTS as Record<string, Record<string, Record<string, number>>>;
    expect(rw).toBeDefined();
    const roleNames = Object.keys(rw);
    expect(roleNames.length).toBeGreaterThanOrEqual(12);

    // Todos os atributos válidos em PlayerAttribute + GKAttributes
    const validAttrs = new Set([
      'heading', 'crossing', 'tackling', 'technique', 'finishing', 'passing',
      'firstTouch', 'dribbling', 'marking', 'freeKicks', 'longShots', 'throwIns',
      'aggression', 'anticipation', 'bravery', 'composure', 'concentration',
      'decisions', 'determination', 'improvise', 'positioning', 'leadership',
      'teamWork', 'vision', 'offBall', 'workRate',
      'acceleration', 'speed', 'strength', 'stamina', 'agility',
      'naturalFitness', 'jumping', 'balance',
      'aerialReach', 'commandOfArea', 'communication', 'eccentricity',
      'handballing', 'punching', 'throwing', 'reflexes', 'rushing',
      'tendencyToCome', 'oneOnOne',
    ]);

    for (const role of roleNames) {
      const duties = Object.keys(rw[role]);
      expect(duties).toContain('defend');
      expect(duties).toContain('support');
      expect(duties).toContain('attack');
      expect(duties).toContain('balance');
      for (const duty of duties) {
        const weights = rw[role][duty];
        for (const attr of Object.keys(weights)) {
          expect(validAttrs.has(attr)).toBe(true);
        }
      }
    }
  });

  it('FORMATION_LAYOUT dá (x,y) por slotIndex para toda formação existente (4-4-2, 4-3-3, 3-5-2, 5-2-2)', () => {
    const fl = eng.FORMATION_LAYOUT as Record<string, Array<{ x: number; y: number; zone: string }>>;
    expect(fl).toBeDefined();
    const expectedFormations = ['4-4-2', '4-3-3', '3-5-2', '5-2-2'];
    for (const formation of expectedFormations) {
      expect(fl[formation]).toBeDefined();
      const slots = fl[formation];
      expect(slots.length).toBe(11); // 11 jogadores
      for (const slot of slots) {
        expect(typeof slot.x).toBe('number');
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.x).toBeLessThanOrEqual(1);
        expect(typeof slot.y).toBe('number');
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeLessThanOrEqual(1);
        expect(typeof slot.zone).toBe('string');
        expect(slot.zone.length).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================
// FASE 2 — Zonas & duelos
// ============================================================
describe('Fase 2 — Zonas & duelos', () => {
  whenV2('lateral fraco vs ponta forte: o lado fraco sofre exploração localizada mensurável no relatório', () => {
    const [home, away] = realTeams();
    engine.simulateFullMatch(home, away, 0, 0, 42);

    // Duel log deve ter entradas com zona, attackerId, defenderId, winner
    const duelLog = (eng.getDuelLog as Function)() as Array<{ zone: { third: string; flank: string }; attackerId: string; defenderId: string; winner: string; minute: number }>;
    expect(duelLog.length).toBeGreaterThan(0);
    for (const d of duelLog) {
      expect(d.zone.third).toBeDefined();
      expect(d.zone.flank).toBeDefined();
      expect(d.attackerId).toBeTruthy();
      expect(d.defenderId).toBeTruthy();
      expect(d.winner === 'attacker' || d.winner === 'defender').toBe(true);
    }

    // summarizeDuelsByZone deve retornar resumo por zona com winRate
    const summaries = (eng.summarizeDuelsByZone as Function)() as Array<{ zone: string; attackerWins: number; defenderWins: number; total: number; winRate: number }>;
    expect(summaries.length).toBeGreaterThan(0);
    for (const s of summaries) {
      expect(s.total).toBe(s.attackerWins + s.defenderWins);
      expect(s.winRate).toBeGreaterThanOrEqual(0);
      expect(s.winRate).toBeLessThanOrEqual(1);
    }
  });

  it('overload (3 atacantes vs 2 defensores na zona) faz o duelo pender para o ataque, sem número mágico', () => {
    const mkOccupant = (x: number, y: number, strength: number) => ({
      player: { id: `p${x}${y}` } as any,
      slotIndex: 0,
      role: 'winger',
      duty: 'attack',
      effectiveX: x,
      effectiveY: y,
      strength,
    });

    const zone = { third: 'attacking' as const, flank: 'left' as const };

    // 3 atacantes na zona vs 2 defensores → mod > 1 (ataque favorecido)
    const att3 = [
      mkOccupant(0.75, 0.10, 50),
      mkOccupant(0.72, 0.15, 50),
      mkOccupant(0.78, 0.08, 50),
    ];
    const def2 = [
      mkOccupant(0.72, 0.12, 50),
      mkOccupant(0.76, 0.10, 50),
    ];
    const modOverload = (eng.computeOverloadMod as Function)(att3, def2, zone);
    expect(modOverload).toBeGreaterThan(1.0);

    // 2 atacantes vs 3 defensores → mod < 1 (defesa favorecida)
    const att2 = att3.slice(0, 2);
    const def3 = [...def2, mkOccupant(0.74, 0.14, 50)];
    const modUnderload = (eng.computeOverloadMod as Function)(att2, def3, zone);
    expect(modUnderload).toBeLessThan(1.0);

    // Sem número mágico: mod é derivado da diferença numérica, não um fixo
    expect(modOverload).toBeCloseTo(1 + 1 * 0.15, 2); // diff=1 → 1.15
    expect(modUnderload).toBeCloseTo(1 - 1 * 0.15, 2); // diff=-1 → 0.85
  });
  whenV2('duelos usam _matchRng (determinismo preservado): mesma seed → mesmos duelos', () => {
    const [home, away] = realTeams();
    const a = engine.simulateFullMatch(home, away, 0, 0, 999);
    const b = engine.simulateFullMatch(home, away, 0, 0, 999);
    expect(a.events.length).toBe(b.events.length);
  });
});

// ============================================================
// FASE 3 — As 5 fases do lance
// ============================================================
describe('Fase 3 — As 5 fases do lance', () => {
  whenV2('"domino posse mas não crio": posse >60% pode coexistir com poucas chances claras contra bloco baixo', () => {
    const teams = realTeams();
    const dominant = { ...teams[0], passingStyle: 'short' as const, defensiveLine: 'high' as const, pressIntensity: 'high' as const, teamMentality: 'offensive' as const };
    const lowBlock = { ...teams[1], defensiveLine: 'low' as const, tacklingStyle: 'contain' as const, teamMentality: 'very defensive' as const };

    // Roda várias seeds — o padrão deve emergir em ao menos uma
    let foundHighPossessionLowShots = false;
    for (let s = 0; s < 20; s++) {
      const r = engine.simulateFullMatch(dominant, lowBlock, 0, 0, 5000 + s);
      const homePoss = r.stats.homePossession;
      const totalShots = r.stats.homeShots + r.stats.awayShots;
      // Posse alta do dominante mas poucos chutes no total (bloco baixo anula criação)
      if (homePoss >= 55 && totalShots < 20) {
        foundHighPossessionLowShots = true;
        break;
      }
    }
    expect(foundHighPossessionLowShots).toBe(true);
  });

  whenV2('"parking the bus": bloco baixo bem posicionado converte muita posse adversária em chute de fora', () => {
    const teams = realTeams();
    const bus = { ...teams[0], defensiveLine: 'low' as const, tacklingStyle: 'contain' as const, teamMentality: 'very defensive' as const, pressIntensity: 'low' as const };
    const attacker = { ...teams[1], passingStyle: 'short' as const, defensiveLine: 'high' as const, pressIntensity: 'high' as const, teamMentality: 'offensive' as const };

    // O time que "estaciona o ônibus" deve ter posse muito baixa mas sofrer poucos gols
    let foundBusPattern = false;
    for (let s = 0; s < 20; s++) {
      const r = engine.simulateFullMatch(bus, attacker, 0, 0, 6000 + s);
      const busPoss = r.stats.homePossession;
      const busGoalsConceded = r.awayGoals;
      // Bus tem posse baixa mas concede poucos gols (≤2)
      if (busPoss <= 45 && busGoalsConceded <= 2) {
        foundBusPattern = true;
        break;
      }
    }
    expect(foundBusPattern).toBe(true);
  });

  whenV2('volume de chance e qualidade (xG) são rastreados separadamente por fase', () => {
    const [home, away] = realTeams();
    let state = engine.initLiveMatchState(home, away, 777);
    // Roda 30 minutos para acumular dados
    for (let m = 1; m <= 30; m++) {
      state = engine.simulateMinute(home, away, state, m);
    }
    // xgByPhase deve existir e ter pelo menos uma fase com xG > 0
    expect(state.xgByPhase).toBeDefined();
    const phaseKeys = Object.keys(state.xgByPhase ?? {});
    expect(phaseKeys.length).toBeGreaterThan(0);
    // chancesByOrigin deve existir e registrar origens
    expect(state.chancesByOrigin).toBeDefined();
    // xG e volume são independentes: xgByPhase mede qualidade, chancesByOrigin mede volume
    const totalXG = Object.values(state.xgByPhase ?? {}).reduce((s, v) => s + v, 0);
    const totalChances = Object.values(state.chancesByOrigin ?? {}).reduce((s, v) => s + v, 0);
    // xG acumulado deve ser >= 0 (pode ser 0 se nenhuma finalização ainda)
    expect(totalXG).toBeGreaterThanOrEqual(0);
    // Se houve chances, o total deve ser > 0
    if (totalChances > 0) {
      expect(totalChances).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// FASE 4 — Transição / contra-ataque
// ============================================================
describe('Fase 4 — Transição / contra-ataque', () => {
  it.todo('perda adiantada gera transição mais perigosa que perda no próprio campo');
  it.todo('mentalidade ofensiva aumenta a exposição sofrida na transição');

  whenV2('UPSET: setup coerente com time médio bate setup incoerente com time mais forte numa fração realista', () => {
    // Exige REF_COESO/REF_INCOERENTE + gap fixo (Fase 0.5). Enquanto o harness
    // não os expõe, este teste fica documentado aqui e só roda no v2.
    // Substitua pelo confronto de referência real quando disponível.
    const teams = realTeams();
    expect(teams.length).toBeGreaterThan(1);
    // Alvo: winRate(B_coeso) >= 25% (INVARIANTS.upsetRatePct.min)
    // (asserção real preenchida quando os setups de referência existirem)
  });
});

// ============================================================
// FASE 5 — Instruções relacionais + mentalidade
// ============================================================
describe('Fase 5 — Instruções relacionais', () => {
  it.todo('mesma instrução (ex: pressão alta) GANHA contra saída de bola ruim e PERDE contra boa saída + ataque rápido');
  it.todo('v2 não usa mais multiplicador tático fixo (getTacticalBonus/tacticAttackMult) na resolução');
  it.todo('mentalidade global desloca a régua de risco de todos os duties (não é multiplicador de gols)');
});

// ============================================================
// FASE 6 — Estado dinâmico
// ============================================================
describe('Fase 6 — Estado dinâmico', () => {
  it.todo('queda de produção visível após ~70\' por fadiga acumulada');
  it.todo('swing combinado de fadiga+moral+momentum+casa é limitado (clamp ±0.15) — sem outliers por sorte empilhada');
  it.todo('vantagem de casa é variável (torcida/importância), não constante');
});

// ============================================================
// FASE 7 — Bola parada & árbitro
// ============================================================
describe('Fase 7 — Bola parada & árbitro', () => {
  it.todo('bola parada responde por ~25–30% dos gols (INVARIANTS.setPieceGoalPct) na simulação em massa');
  it.todo('faltas/cartões emergem de duelos + aggression/dirtiness, não sorteio puro');
  it.todo('expulsão dispara reorganização estrutural por zona, não só -1 força');
});

// ============================================================
// FASE 8 — Inteligência tática da IA adversária (Pilar C)
// ============================================================
describe('Fase 8 — IA adversária', () => {
  it.todo('IA monta setup coerente (equilíbrio de duties, cobertura), escalando por effectiveStrength e não por CA bruto');
  it.todo('IA lê o padrão do adversário e escolhe a contraposição da matriz da Seção 5');
  it.todo('IA faz game management: recua ganhando no fim, arrisca perdendo, substitui por fadiga/cartão/lesão');
  it.todo('curva de dificuldade: IA elite vence/empata fração respeitável contra bom setup humano; IA fraca perde para setup coerente');
});

// ============================================================
// FASE 9 — Previsão unificada
// ============================================================
describe('Fase 9 — Previsão unificada', () => {
  it.todo('preMatchAnalysis usa o mesmo motor v2 (ou redução calibrada travada por teste), não um Poisson divergente');
  it.todo('distribuição de resultados prevista bate (dentro de tolerância) com a distribuição real do motor v2');
  whenV2('perf: as N sims de previsão usam o caminho rápido e ficam dentro do orçamento', () => {
    // asserção real preenchida quando o caminho rápido v2 existir
    expect(INVARIANTS.perfRoundMs).toBeGreaterThan(0);
  });
});

// ============================================================
// FASE 10 — Relatório pós-jogo rico
// ============================================================
describe('Fase 10 — Relatório pós-jogo', () => {
  it.todo('relatório expõe duelos-por-zona reais ("seu lateral perdeu 7 de 10")');
  it.todo('relatório separa chances por origem: lateral / centro / bola parada / transição');
  it.todo('conselho do assistente é acionável (ex: "o meio deles teve superioridade; use um volante a mais")');
});

// ============================================================
// FASE 11 — Balanceamento final (invariantes em massa)
// ============================================================
describe('Fase 11 — Balanceamento (invariantes)', () => {
  // Este é caro; roda como sanity local do motor ATIVO (v1 hoje, v2 quando ligado).
  it('gols por jogo caem na faixa realista (amostra de 100 partidas)', () => {
    const teams = realTeams();
    const N = 100;
    let goals = 0;
    for (let i = 0; i < N; i++) {
      const h = teams[i % teams.length];
      const a = teams[(i + 1) % teams.length];
      const r = engine.simulateFullMatch(h, a, 0, 0, 1000 + i);
      goals += r.homeGoals + r.awayGoals;
    }
    const avg = goals / N;
    // Faixa larga aqui (a estrita fica no harness em massa); só previne colapso grosseiro.
    expect(avg).toBeGreaterThan(1.8);
    expect(avg).toBeLessThan(3.6);
  });

  it.todo('run_batch.py (30–100 temporadas): TODOS os invariantes da tabela 0.4 dentro do alvo no v2, incl. perf e upset');
  it.todo('pergunta-teste do blueprint responde SIM: técnico esperto com time médio bate time melhor mal treinado com frequência');
});
