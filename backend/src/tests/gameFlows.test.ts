import { describe, it, expect, beforeEach } from 'vitest';
import { generateTeam, generatePlayer, generateYouthIntake } from '../utils/playerGenerator.js';
import { useGameStore } from '../store/gameStore.js';
import { runAction } from '../store/storeHelpers.js';
import type { WeeklyTrainingPlan, Player } from '../types/game.js';

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

// Helper: advanceWeek to generate matches, then find the user's match index
function advanceAndFindUserMatch() {
  const teamId = selectFirstTeam();
  getState().advanceWeek();
  const matchIndex = getState().matches.findIndex(
    (m) => m.homeTeam === teamId || m.awayTeam === teamId,
  );
  if (matchIndex < 0) throw new Error('Nenhuma partida encontrada para o time selecionado');
  return { teamId, matchIndex };
}

// 15.2 — Geração procedural
describe('15.2 Geração procedural de times e jogadores', () => {
  beforeEach(() => {
    useGameStore.setState({
      teams: [],
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      inbox: [],
    });
    getState().initGame();
  });

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

  it('initGame cria times válidos', () => {
    const { teams } = getState();
    expect(teams.length).toBeGreaterThanOrEqual(8);
    const divisions = new Set(teams.map((t) => t.division));
    expect(divisions.has('Série A')).toBe(true);
  });
});

// 15.3 — Simulação de partidas
describe('15.3 Simulação de partidas', () => {
  beforeEach(() => {
    useGameStore.setState({
      teams: [],
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      inbox: [],
    });
    getState().initGame();
  });

  it('inicia partida ao vivo do time selecionado', () => {
    const { matchIndex } = advanceAndFindUserMatch();
    getState().simulateMatch(matchIndex);
    const match = getState().matches[matchIndex];
    expect(match.isLive).toBe(true);
    expect(match.liveMinute).toBe(0);
    // First minute advance moves to 1
    getState().generateLiveMatchMinute(matchIndex);
    expect(getState().matches[matchIndex].liveMinute).toBe(1);
  });

  it('avança minuto a minuto e finaliza em 90', () => {
    const { matchIndex } = advanceAndFindUserMatch();
    getState().simulateMatch(matchIndex);

    for (let i = 0; i < 100; i++) {
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
  beforeEach(() => {
    useGameStore.setState({
      teams: [],
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      inbox: [],
    });
    getState().initGame();
  });

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
        i === 0 ? { ...p, injury: { active: true, daysRemaining: 14, totalDays: 14, type: 'muscle', severity: 'moderate' as const, source: 'training' as const } } : p,
      ),
    }));
    const report = getState().getInjuryReport(player.id);
    expect(report).not.toBeNull();
    expect(report?.playerId).toBe(player.id);
  });
});

// 15.5 — Treino
describe('15.5 Sistema de treino', () => {
  beforeEach(() => {
    useGameStore.setState({
      teams: [],
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      inbox: [],
    });
    getState().initGame();
  });

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
  beforeEach(() => {
    useGameStore.setState({
      teams: [],
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      inbox: [],
    });
    getState().initGame();
  });

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
  beforeEach(() => {
    useGameStore.setState({
      teams: [],
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      inbox: [],
    });
    getState().initGame();
  });

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
  beforeEach(() => {
    useGameStore.setState({
      teams: [],
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      inbox: [],
    });
    getState().initGame();
  });

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
  beforeEach(() => {
    useGameStore.setState({
      teams: [],
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      inbox: [],
    });
    getState().initGame();
  });

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

// 15.10 — updateTeam whitelist (segurança server-side)
describe('15.10 updateTeam whitelist via runAction', () => {
  beforeEach(() => {
    useGameStore.setState({
      teams: [],
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      inbox: [],
    });
    getState().initGame();
  });

  it('não permite alterar budget via updateTeam', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find((t) => t.id === teamId)!;
    const originalBudget = team.budget;

    runAction(useGameStore, 'updateTeam', [teamId, {
      ...team,
      budget: 999999,
      reputation: 100,
    }]);

    const after = getState().teams.find((t) => t.id === teamId)!;
    expect(after.budget).toBe(originalBudget);
    expect(after.reputation).toBe(team.reputation);
  });

  it('permite alterar campos táticos via updateTeam', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find((t) => t.id === teamId)!;

    runAction(useGameStore, 'updateTeam', [teamId, {
      formation: '4-3-3',
      teamMentality: 'very offensive',
      tempo: 'fast',
    }]);

    const after = getState().teams.find((t) => t.id === teamId)!;
    expect(after.formation).toBe('4-3-3');
    expect(after.teamMentality).toBe('very offensive');
    expect(after.tempo).toBe('fast');
  });

  it('preserva squad ao aplicar squadStatus', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find((t) => t.id === teamId)!;
    const playerId = team.squad[0].id;
    const originalSquadLength = team.squad.length;

    runAction(useGameStore, 'updateTeam', [teamId, {
      squadStatus: { [playerId]: 'Key Player' },
    }]);

    const after = getState().teams.find((t) => t.id === teamId)!;
    expect(after.squad.length).toBe(originalSquadLength);
    expect(after.squad[0].squadStatus).toBe('Key Player');
  });
});
