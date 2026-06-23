import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateTeam, generatePlayer, generateYouthIntake } from '../utils/playerGenerator';
import { useGameStore } from '../store/gameStore';
import type { WeeklyTrainingPlan, Player } from '../types/game';

function recalcWageBillFromSquad(squad: Player[]) {
  return squad.reduce((sum, p) => sum + p.salary, 0) / 1000;
}

function getState() {
  return useGameStore.getState();
}

function selectFirstTeam() {
  const teamId = getState().teams[0]?.id;
  if (!teamId) throw new Error('Nenhum time gerado');
  getState().selectTeam(teamId);
  return teamId;
}

// 15.2 — Geração procedural
describe('15.2 Geração procedural de times e jogadores', () => {
  it('gera jogador com atributos válidos', () => {
    const player = generatePlayer({ teamReputation: 50, position: 'MID' });
    expect(player.id).toBeTruthy();
    expect(player.currentAbility).toBeGreaterThan(0);
    expect(Number.isFinite(player.currentAbility)).toBe(true);
    expect(player.technical.passing).toBeGreaterThanOrEqual(1);
    expect(player.technical.passing).toBeLessThanOrEqual(20);
  });

  it('gera time com elenco e finanças', () => {
    const team = generateTeam({ division: 'Série A', league: 'Brasileirão', reputation: 60 });
    expect(team.squad.length).toBeGreaterThanOrEqual(18);
    expect(team.budget).toBeGreaterThan(0);
    expect(team.tacticsConfig).toBeDefined();
  });

  it('gera fornada de jovens', () => {
    const youth = generateYouthIntake(3, 5);
    expect(youth).toHaveLength(5);
    youth.forEach((p) => expect(p.age).toBeLessThanOrEqual(18));
  });

  it('initGame cria 8 times procedurais', () => {
    const { teams } = getState();
    expect(teams).toHaveLength(8);
    const divisions = new Set(teams.map((t) => t.division));
    expect(divisions.has('Série A')).toBe(true);
    expect(divisions.has('Série B')).toBe(true);
  });
});

// 15.3 — Simulação de partidas
describe('15.3 Simulação de partidas', () => {
  it('inicia partida ao vivo do time selecionado', () => {
    const teamId = selectFirstTeam();
    const matchIndex = getState().matches.findIndex(
      (m) => m.homeTeam === teamId || m.awayTeam === teamId,
    );
    expect(matchIndex).toBeGreaterThanOrEqual(0);

    getState().simulateMatch(matchIndex);
    const match = getState().matches[matchIndex];
    expect(match.isLive).toBe(true);
    expect(match.liveMinute).toBe(1);
  });

  it('avança minuto a minuto e finaliza em 90', () => {
    const teamId = selectFirstTeam();
    const matchIndex = getState().matches.findIndex(
      (m) => m.homeTeam === teamId || m.awayTeam === teamId,
    );
    getState().simulateMatch(matchIndex);

    for (let i = 0; i < 95; i++) {
      getState().generateLiveMatchMinute(matchIndex);
    }

    const match = getState().matches[matchIndex];
    expect(match.completed).toBe(true);
    expect(match.isLive).toBe(false);
    expect(match.stats).toBeDefined();
  });

  it('advanceWeek simula partidas dos outros times', () => {
    selectFirstTeam();
    const before = getState().currentWeek;
    getState().advanceWeek();
    expect(getState().currentWeek).toBe(before + 1);
    const aiMatches = getState().matches.filter(
      (m) => m.homeTeam !== getState().selectedTeam && m.awayTeam !== getState().selectedTeam,
    );
    expect(aiMatches.some((m) => m.completed)).toBe(true);
  });
});

// 15.4 — Caixa de entrada
describe('15.4 Sistema de caixa de entrada', () => {
  it('advanceWeek adiciona mensagens ao inbox', () => {
    selectFirstTeam();
    const before = getState().inbox.length;
    getState().advanceWeek();
    expect(getState().inbox.length).toBeGreaterThan(before);
  });

  it('handleInboxAction marca mensagem como lida', () => {
    selectFirstTeam();
    getState().advanceWeek();
    const message = getState().inbox[0];
    expect(message).toBeDefined();
    getState().handleInboxAction(message.id, 'Marcar como Lido');
    expect(getState().inbox.find((m) => m.id === message.id)?.read).toBe(true);
  });

  it('getInjuryReport retorna dados para jogador lesionado', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find((t) => t.id === teamId)!;
    const player = team.squad[0];
    getState().updateTeam(teamId, (t) => ({
      ...t,
      squad: t.squad.map((p, i) =>
        i === 0 ? { ...p, injury: { active: true, days: 14 } } : p,
      ),
    }));
    const report = getState().getInjuryReport(player.id);
    expect(report).not.toBeNull();
    expect(report?.playerId).toBe(player.id);
  });
});

// 15.5 — Treino
describe('15.5 Sistema de treino', () => {
  it('salva e aplica plano semanal', () => {
    selectFirstTeam();
    const plan: WeeklyTrainingPlan = {
      week: getState().currentWeek,
      teamFocus: 'technical',
      sessions: [],
    };
    getState().setTrainingPlan(plan);
    expect(getState().trainingPlan?.teamFocus).toBe('technical');

    const teamBefore = getState().teams.find((t) => t.id === getState().selectedTeam)!;
    const caBefore = teamBefore.squad[0].currentAbility;
    getState().applyWeeklyTraining();
    const teamAfter = getState().teams.find((t) => t.id === getState().selectedTeam)!;
    expect(teamAfter.squad[0].currentAbility).toBeGreaterThanOrEqual(caBefore);
  });

  it('captureWeeklyAttributeSnapshot registra histórico', () => {
    const teamId = selectFirstTeam();
    getState().captureWeeklyAttributeSnapshot();
    const player = getState().teams.find((t) => t.id === teamId)!.squad[0];
    expect(player.attributeHistory?.length).toBeGreaterThan(0);
  });
});

// 15.6 — Transferências
describe('15.6 Sistema de transferência', () => {
  it('compra jogador de outro clube', () => {
    const buyerId = selectFirstTeam();
    const seller = getState().teams.find((t) => t.id !== buyerId)!;
    const player = seller.squad[0];
    const buyerBefore = getState().teams.find((t) => t.id === buyerId)!;
    buyerBefore.budget = player.marketValue + 10;

    getState().updateTeam(buyerId, () => ({ ...buyerBefore }));

    const ok = getState().buyPlayer(player.id, seller.id);
    expect(ok).toBe(true);

    const buyerAfter = getState().teams.find((t) => t.id === buyerId)!;
    expect(buyerAfter.squad.some((p) => p.id === player.id)).toBe(true);
    expect(getState().transferAgreements.length).toBeGreaterThan(0);
  });

  it('assignScout gera relatórios', () => {
    selectFirstTeam();
    const before = getState().scoutReports.length;
    getState().assignScout();
    expect(getState().scoutReports.length).toBeGreaterThan(before);
  });
});

// 15.7 — Táticas
describe('15.7 Sistema de táticas', () => {
  it('updateTeam persiste mentalidade e formação', () => {
    const teamId = selectFirstTeam();
    getState().updateTeam(teamId, (t) => ({
      ...t,
      teamMentality: 'very offensive',
      formation: '4-3-3',
      tempo: 'fast',
    }));
    const team = getState().teams.find((t) => t.id === teamId)!;
    expect(team.teamMentality).toBe('very offensive');
    expect(team.formation).toBe('4-3-3');
    expect(team.tempo).toBe('fast');
  });
});

// 15.8 — Dinâmica
describe('15.8 Sistema de dinâmica', () => {
  it('gera árvore social', () => {
    selectFirstTeam();
    getState().generateSocialTree();
    expect(getState().socialTree).not.toBeNull();
    expect(getState().socialTree!.nodes.length).toBeGreaterThan(0);
  });

  it('decrementa promessas no advanceWeek', () => {
    const teamId = selectFirstTeam();
    getState().updateTeam(teamId, (t) => ({
      ...t,
      squad: t.squad.map((p, i) =>
        i === 0
          ? { ...p, promises: [{ goal: 'Mais tempo de jogo', deadline: 5, fulfilled: false }] }
          : p,
      ),
    }));

    const before = getState().getActivePromises()[0]?.weeksLeft ?? 0;
    getState().advanceWeek();
    const after = getState().getActivePromises()[0]?.weeksLeft ?? 0;
    expect(after).toBe(before - 1);
  });
});

// 15.9 — Finanças
describe('15.9 Sistema de finanças', () => {
  it('adjustPlayerSalary recalcula wageBill', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find((t) => t.id === teamId)!;
    const player = team.squad[0];
    const wageBefore = team.wageBill;
    const targetSalary = 120;

    getState().adjustPlayerSalary(player.id, targetSalary);
    const updated = getState().teams.find((t) => t.id === teamId)!;
    const updatedPlayer = updated.squad.find((p) => p.id === player.id)!;
    expect(updatedPlayer.salary).toBe(targetSalary);
    const expectedWageBill = recalcWageBillFromSquad(updated.squad);
    expect(updated.wageBill).toBeCloseTo(expectedWageBill, 3);
    expect(updated.wageBill).not.toBe(wageBefore);
  });

  it('getFinancialReport retorna relatório válido', () => {
    selectFirstTeam();
    const report = getState().getFinancialReport();
    expect(report).not.toBeNull();
    expect(report!.budget).toBeGreaterThanOrEqual(0);
    expect(report!.teamName).toBeTruthy();
  });
});

// 15.10 — Persistência localStorage
describe('15.10 Persistência no localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.persist.clearStorage();
  });

  it('persiste estado após rehydrate', async () => {
    getState().initGame();
    const teamId = getState().teams[0].id;
    getState().selectTeam(teamId);
    getState().advanceWeek();

    const stored = localStorage.getItem('fm-game-storage-v3');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.selectedTeam).toBe(teamId);
    expect(parsed.state.currentWeek).toBe(1);

    useGameStore.persist.clearStorage();
    localStorage.setItem('fm-game-storage-v3', stored!);
    await useGameStore.persist.rehydrate();

    expect(getState().selectedTeam).toBe(teamId);
    expect(getState().currentWeek).toBe(1);
  });
});

// 15.11 — Performance mobile (métricas estáticas)
describe('15.11 Performance em dispositivos móveis', () => {
  it('bundle de produção dentro do limite aceitável', () => {
    const distJs = resolve(process.cwd(), 'dist/assets');
    if (!existsSync(distJs)) {
      console.warn('dist/ não encontrado — rode npm run build antes');
      return;
    }
    const jsFiles = readFileSync(resolve(process.cwd(), 'dist/index.html'), 'utf-8').match(/assets\/index-[^"]+\.js/g) ?? [];
    expect(jsFiles.length).toBeGreaterThan(0);

    const jsPath = resolve(process.cwd(), 'dist', jsFiles[0]);
    const sizeKb = statSync(jsPath).size / 1024;
    expect(sizeKb).toBeLessThan(500);
  });

  it('CSS usa layout responsivo (grid/flex adaptativo)', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf-8');
    expect(css).toMatch(/grid-template-columns:\s*repeat\(auto-fill/);
  });

  it('SquadTable adapta colunas em telas estreitas', () => {
    const squadTable = readFileSync(resolve(process.cwd(), 'src/components/squad/SquadTable.tsx'), 'utf-8');
    expect(squadTable).toMatch(/isNarrow/);
  });
});
