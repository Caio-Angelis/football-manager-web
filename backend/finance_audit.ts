// finance_audit.ts — Auditoria financeira headless
// Carrega os 20 times reais, simula 1 temporada (38 semanas) SEM contratar,
// e loga por semana: budget, receita total, folha, infra, premiação, saldo da semana.
// Saída: backend/finance_report_before.txt

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { useGameStore } from './src/store/gameStore';
import {
  calculateTicketRevenue,
  calculateSponsorshipRevenue,
  calculateBroadcastingRevenue,
  calculateFacilityCosts,
  calculateStaffCosts,
  weeklyWages,
} from './src/store/helpers/finance';
import type { Team } from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEEKS_PER_SEASON = 38;

// ============================================================
// TIPOS PARA MÉTRICAS
// ============================================================

interface WeeklySnapshot {
  week: number;
  teamId: string;
  teamName: string;
  budgetStart: number;
  budgetEnd: number;
  ticketRevenue: number;
  sponsorship: number;
  broadcasting: number;
  facilityCosts: number;
  wageCost: number;
  prizeMoney: number;
  weeklyBalance: number;
}

interface TeamSummary {
  teamId: string;
  teamName: string;
  reputation: number;
  initialBudget: number;
  finalBudget: number;
  avgWeeklyBalance: number;
  avgWeeklyRevenue: number;
  avgWeeklyWages: number;
  avgWeeklyFacility: number;
  avgWeeklyPrize: number;
  weeksToBankrupt: number | null;
  wageBill: number;
  squadSize: number;
  totalSalarySum: number;
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function applyFinancesToAllTeams(teams: Team[]): { teams: Team[]; deltas: Record<string, { ticket: number; sponsorship: number; broadcasting: number; facility: number; staff: number; wages: number }> } {
  const deltas: Record<string, { ticket: number; sponsorship: number; broadcasting: number; facility: number; staff: number; wages: number }> = {};
  const updated = teams.map(team => {
    const ticketRevenue = calculateTicketRevenue(team.reputation);
    const sponsorship = calculateSponsorshipRevenue(team.reputation);
    const broadcasting = calculateBroadcastingRevenue(team.reputation);
    const facilityCosts = calculateFacilityCosts(team.facilitiesLevel);
    const staffCosts = calculateStaffCosts(team.staffLevel);
    const wageCost = weeklyWages(team.wageBill);
    deltas[team.id] = { ticket: ticketRevenue, sponsorship, broadcasting, facility: facilityCosts, staff: staffCosts, wages: wageCost };
    return {
      ...team,
      budget: Math.max(-50, team.budget + ticketRevenue + sponsorship + broadcasting - wageCost - facilityCosts - staffCosts),
    };
  });
  return { teams: updated, deltas };
}

// ============================================================
// SIMULAÇÃO PRINCIPAL
// ============================================================

async function main() {
  const startTime = Date.now();
  console.log('=== FINANCE AUDIT: 1 SEASON (38 WEEKS, NO TRANSFERS) ===\n');

  const store = useGameStore;

  // 1. Inicializar o jogo
  console.log('Initializing game...');
  store.getState().initGame();

  let state = store.getState();
  console.log(`Loaded ${state.teams.length} teams\n`);

  // Registrar orçamentos iniciais
  const initialBudgets: Record<string, number> = {};
  for (const team of state.teams) {
    initialBudgets[team.id] = team.budget;
  }

  const snapshots: WeeklySnapshot[] = [];
  const weeksToBankrupt: Record<string, number | null> = {};
  const bankruptTracking: Record<string, { budget: number; week: number | null }> = {};

  for (const team of state.teams) {
    weeksToBankrupt[team.id] = null;
    bankruptTracking[team.id] = { budget: team.budget, week: null };
  }

  // 2. Simular 38 semanas
  for (let week = 1; week <= WEEKS_PER_SEASON; week++) {
    // Registrar budgets antes do advanceWeek (para capturar premiação via delta)
    const budgetsBefore: Record<string, number> = {};
    for (const team of state.teams) {
      budgetsBefore[team.id] = team.budget;
    }

    // advanceWeek simula partidas e adiciona prêmios ao budget
    store.getState().advanceWeek();
    state = store.getState();

    // Capturar delta de budget = premiação por partida
    const prizeDeltas: Record<string, number> = {};
    for (const team of state.teams) {
      const delta = team.budget - budgetsBefore[team.id];
      prizeDeltas[team.id] = delta;
    }

    // Aplicar finanças (ticket + sponsorship + broadcasting - wages - facility)
    let updatedTeams = [...state.teams];
    const { teams: financedTeams, deltas } = applyFinancesToAllTeams(updatedTeams);
    updatedTeams = financedTeams;
    store.setState({ teams: updatedTeams });

    // Registrar snapshots
    for (const team of updatedTeams) {
      const d = deltas[team.id];
      const prize = prizeDeltas[team.id] || 0;
      const budgetEnd = team.budget;
      const budgetStart = budgetsBefore[team.id];
      const weeklyBalance = budgetEnd - budgetStart;

      snapshots.push({
        week,
        teamId: team.id,
        teamName: team.name,
        budgetStart,
        budgetEnd,
        ticketRevenue: d.ticket,
        sponsorship: d.sponsorship,
        broadcasting: d.broadcasting,
        facilityCosts: d.facility,
        wageCost: d.wages,
        prizeMoney: prize,
        weeklyBalance,
      });

      // Tracking de falência
      if (bankruptTracking[team.id].week === null && budgetEnd <= 0) {
        bankruptTracking[team.id].week = week;
        weeksToBankrupt[team.id] = week;
      }
      bankruptTracking[team.id].budget = budgetEnd;
    }

    state = store.getState();

    if (week % 10 === 0 || week === WEEKS_PER_SEASON) {
      console.log(`  Week ${week} completed`);
    }
  }

  // 3. Calcular sumários por time
  state = store.getState();
  const summaries: TeamSummary[] = state.teams.map(team => {
    const teamSnaps = snapshots.filter(s => s.teamId === team.id);
    const avgWeeklyBalance = teamSnaps.reduce((sum, s) => sum + s.weeklyBalance, 0) / teamSnaps.length;
    const avgWeeklyRevenue = teamSnaps.reduce((sum, s) => sum + s.ticketRevenue + s.sponsorship + s.broadcasting, 0) / teamSnaps.length;
    const avgWeeklyWages = teamSnaps.reduce((sum, s) => sum + s.wageCost, 0) / teamSnaps.length;
    const avgWeeklyFacility = teamSnaps.reduce((sum, s) => sum + s.facilityCosts, 0) / teamSnaps.length;
    const avgWeeklyPrize = teamSnaps.reduce((sum, s) => sum + s.prizeMoney, 0) / teamSnaps.length;
    const totalSalarySum = team.squad.reduce((sum, p) => sum + p.salary, 0);

    return {
      teamId: team.id,
      teamName: team.name,
      reputation: team.reputation,
      initialBudget: initialBudgets[team.id],
      finalBudget: team.budget,
      avgWeeklyBalance: parseFloat(avgWeeklyBalance.toFixed(2)),
      avgWeeklyRevenue: parseFloat(avgWeeklyRevenue.toFixed(2)),
      avgWeeklyWages: parseFloat(avgWeeklyWages.toFixed(2)),
      avgWeeklyFacility: parseFloat(avgWeeklyFacility.toFixed(2)),
      avgWeeklyPrize: parseFloat(avgWeeklyPrize.toFixed(2)),
      weeksToBankrupt: weeksToBankrupt[team.id],
      wageBill: team.wageBill,
      squadSize: team.squad.length,
      totalSalarySum,
    };
  });

  // Ordenar por reputação (maior → menor) para facilitar leitura
  summaries.sort((a, b) => b.reputation - a.reputation);

  // 4. Gerar relatório texto
  const lines: string[] = [];
  lines.push('============================================================');
  lines.push('RELATÓRIO DE AUDITORIA FINANCEIRA — ANTES DO REBALANCEAMENTO');
  lines.push('Simulação: 1 temporada (38 semanas), sem contratações');
  lines.push(`Data: ${new Date().toISOString()}`);
  lines.push('============================================================\n');

  lines.push('SUMÁRIO POR TIME (ordenado por reputação)');
  lines.push('-------------------------------------------');
  lines.push('');
  lines.push(
    'Team'.padEnd(22) +
    'Rep'.padStart(4) +
    'BudgetIni'.padStart(10) +
    'BudgetFim'.padStart(10) +
    'SaldoSem'.padStart(9) +
    'Receita'.padStart(8) +
    'Folha'.padStart(8) +
    'Infra'.padStart(7) +
    'Premio'.padStart(8) +
    'WageBill'.padStart(9) +
    'ΣSalary'.padStart(9) +
    'Falir?'.padStart(7),
  );
  lines.push('-'.repeat(120));

  for (const s of summaries) {
    lines.push(
      s.teamName.padEnd(22) +
      String(s.reputation).padStart(4) +
      s.initialBudget.toFixed(1).padStart(10) +
      s.finalBudget.toFixed(1).padStart(10) +
      (s.avgWeeklyBalance >= 0 ? '+' : '').padStart(1) +
      s.avgWeeklyBalance.toFixed(2).padStart(8) +
      s.avgWeeklyRevenue.toFixed(2).padStart(8) +
      s.avgWeeklyWages.toFixed(2).padStart(8) +
      s.avgWeeklyFacility.toFixed(2).padStart(7) +
      s.avgWeeklyPrize.toFixed(2).padStart(8) +
      s.wageBill.toFixed(2).padStart(9) +
      String(s.totalSalarySum).padStart(9) +
      (s.weeksToBankrupt ? `Sem${s.weeksToBankrupt}` : 'Não').padStart(7),
    );
  }

  lines.push('');
  lines.push('ANÁLISE DE UNIDADES');
  lines.push('--------------------');
  lines.push('');
  for (const s of summaries.slice(0, 5)) {
    lines.push(`${s.teamName} (rep ${s.reputation}):`);
    lines.push(`  wageBill (recalc) = ${s.wageBill.toFixed(2)} (Σ salary / 1000 = ${s.totalSalarySum} / 1000)`);
    lines.push(`  weeklyWages(wageBill) = ${s.avgWeeklyWages.toFixed(2)} (= wageBill direto, sem conversão)`);
    lines.push(`  Folha semanal % da receita = ${((s.avgWeeklyWages / s.avgWeeklyRevenue) * 100).toFixed(1)}%`);
    lines.push(`  Saldo semanal médio = ${s.avgWeeklyBalance >= 0 ? '+' : ''}${s.avgWeeklyBalance.toFixed(2)}M/semana`);
    lines.push('');
  }

  lines.push('DIAGNÓSTICO');
  lines.push('-----------');
  const allSurplus = summaries.filter(s => s.avgWeeklyBalance > 0);
  const allDeficit = summaries.filter(s => s.avgWeeklyBalance < 0);
  const avgBalance = summaries.reduce((sum, s) => sum + s.avgWeeklyBalance, 0) / summaries.length;
  lines.push(`Times com superávit semanal: ${allSurplus.length}/${summaries.length}`);
  lines.push(`Times com déficit semanal: ${allDeficit.length}/${summaries.length}`);
  lines.push(`Saldo semanal médio (geral): ${avgBalance.toFixed(2)}M/semana`);
  lines.push(`Times que faliram: ${summaries.filter(s => s.weeksToBankrupt !== null).length}/${summaries.length}`);

  const avgWagePct = summaries.reduce((sum, s) => sum + (s.avgWeeklyWages / s.avgWeeklyRevenue) * 100, 0) / summaries.length;
  lines.push(`Folha semanal média como % da receita: ${avgWagePct.toFixed(1)}% (alvo: 50-70%)`);
  lines.push('');

  // Detalhar 3 times representativos (maior rep, médio, menor rep)
  const representative = [summaries[0], summaries[Math.floor(summaries.length / 2)], summaries[summaries.length - 1]];
  lines.push('CURVA DE BUDGET (3 times representativos)');
  lines.push('------------------------------------------');
  for (const s of representative) {
    lines.push(`\n${s.teamName} (rep ${s.reputation}):`);
    const teamSnaps = snapshots.filter(sn => sn.teamId === s.teamId);
    for (const sn of teamSnaps) {
      lines.push(
        `  Sem ${String(sn.week).padStart(2)}: budget=${sn.budgetEnd.toFixed(2).padStart(8)} ` +
        `saldo=${(sn.weeklyBalance >= 0 ? '+' : '')}${sn.weeklyBalance.toFixed(2).padStart(7)} ` +
        `(rec=${(sn.ticketRevenue + sn.sponsorship + sn.broadcasting).toFixed(2)}, ` +
        `folha=${sn.wageCost.toFixed(2)}, infra=${sn.facilityCosts.toFixed(2)}, premio=${sn.prizeMoney.toFixed(2)})`,
      );
    }
  }

  lines.push('');
  lines.push('============================================================');
  lines.push('FIM DO RELATÓRIO');
  lines.push('============================================================');

  const reportText = lines.join('\n');
  const outputPath = path.join(__dirname, 'finance_report_before.txt');
  fs.writeFileSync(outputPath, reportText, 'utf-8');

  // Também salvar snapshots detalhados em JSON para análise posterior
  const jsonPath = path.join(__dirname, 'finance_audit_data.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ summaries, snapshots }, null, 2), 'utf-8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== AUDIT COMPLETE (${elapsed}s) ===`);
  console.log(`Report: ${outputPath}`);
  console.log(`Data: ${jsonPath}`);
  console.log(`\nKey findings:`);
  console.log(`  Avg weekly balance: ${avgBalance.toFixed(2)}M/semana`);
  console.log(`  Teams with surplus: ${allSurplus.length}/${summaries.length}`);
  console.log(`  Wage as % of revenue: ${avgWagePct.toFixed(1)}% (target: 50-70%)`);
  console.log(`  Teams bankrupted: ${summaries.filter(s => s.weeksToBankrupt !== null).length}/${summaries.length}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Finance audit failed:', err);
  process.exit(1);
});
