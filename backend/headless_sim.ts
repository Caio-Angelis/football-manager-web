// headless_sim.ts — Simulação headless de 3 temporadas completas (114 semanas)
// Roda o motor de partida, avanço de semana, finanças e treino sem servidor Express e sem frontend.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { useGameStore } from './src/store/gameStore';
import { updatePlayerAttributes } from './src/store/helpers/training';
import { calculateTicketRevenue, calculateSponsorshipRevenue, calculateFacilityCosts, weeklyWages } from './src/store/helpers/finance';
import type { Team } from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// TIPOS PARA MÉTRICAS DE SAÍDA
// ============================================================

interface SeasonResult {
  season: number;
  champion: { teamName: string; tactic: string };
  relegated: { teamName: string; tactic: string }[];
}

interface SimOutput {
  seasons: SeasonResult[];
  avgGoalsPerMatch: number;
  top4AvgFinalBudget: number;
  bottom4AvgFinalBudget: number;
  maxCAUnder21: { playerName: string; ca: number; teamName: string; startAge: number } | null;
}

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const TOTAL_SEASONS = 3;
const WEEKS_PER_SEASON = 38;
const TOTAL_WEEKS = TOTAL_SEASONS * WEEKS_PER_SEASON; // 114

// ============================================================
// TRACKING DE MÉTRICAS
// ============================================================

let totalGoals = 0;
let totalMatches = 0;
const tacticTracker: Record<string, Record<string, number>> = {}; // teamId -> { tactic: count }
const youngPlayerIds = new Set<string>();
const youngPlayerStartInfo: Record<string, { name: string; startCA: number; startAge: number }> = {};

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function trackTactics(teams: Team[]): void {
  for (const team of teams) {
    if (!tacticTracker[team.id]) tacticTracker[team.id] = {};
    const tactic = team.tactic || 'balanced';
    tacticTracker[team.id][tactic] = (tacticTracker[team.id][tactic] || 0) + 1;
  }
}

function getMostUsedTactic(teamId: string): string {
  const tactics = tacticTracker[teamId];
  if (!tactics) return 'balanced';
  let maxCount = 0;
  let maxTactic = 'balanced';
  for (const [tactic, count] of Object.entries(tactics)) {
    if (count > maxCount) {
      maxCount = count;
      maxTactic = tactic;
    }
  }
  return maxTactic;
}

function resetTacticTracker(): void {
  for (const key of Object.keys(tacticTracker)) {
    delete tacticTracker[key];
  }
}

function applyFinancesToAllTeams(teams: Team[]): Team[] {
  return teams.map(team => {
    const ticketRevenue = calculateTicketRevenue(team.reputation);
    const sponsorship = calculateSponsorshipRevenue(team.reputation);
    const facilityCosts = calculateFacilityCosts(team.facilitiesLevel);
    const wageCost = weeklyWages(team.wageBill);
    return {
      ...team,
      budget: Math.max(0, team.budget + ticketRevenue + sponsorship - wageCost - facilityCosts),
    };
  });
}

function applyTrainingToAllTeams(teams: Team[], week: number): Team[] {
  const trainingTypes = ['technical', 'physical', 'cohesion', 'light'];
  return teams.map(team => {
    const focus = trainingTypes[week % trainingTypes.length];
    const updatedSquad = team.squad.map(player => {
      if (player.injury?.active) return player;
      return updatePlayerAttributes(player, focus);
    });
    return { ...team, squad: updatedSquad };
  });
}

function applyFatigueDecayToAllTeams(teams: Team[]): Team[] {
  return teams.map(team => {
    const updatedSquad = team.squad.map(player => {
      const updated = { ...player };
      const fatigueDecayRate = 0.15;
      const decay = Math.max(0, (updated.cumulativeLoad || 0) - 10) * fatigueDecayRate;
      updated.fitness = Math.max(0, updated.fitness - decay * 0.3);
      updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 5);
      updated.consecutivePhysicalDays = Math.max(0, (updated.consecutivePhysicalDays || 0) - 1);
      return updated;
    });
    return { ...team, squad: updatedSquad };
  });
}

function recordYoungPlayers(teams: Team[]): void {
  for (const team of teams) {
    for (const player of team.squad) {
      if (player.age < 21) {
        youngPlayerIds.add(player.id);
        youngPlayerStartInfo[player.id] = {
          name: `${player.name} ${player.surname}`.trim(),
          startCA: player.currentAbility,
          startAge: player.age,
        };
      }
    }
  }
}

// ============================================================
// SIMULAÇÃO PRINCIPAL
// ============================================================

async function main() {
  const startTime = Date.now();
  console.log('=== HEADLESS SIMULATION: 3 SEASONS (114 WEEKS) ===\n');

  const store = useGameStore;

  // 1. Inicializar o jogo com os 20 times do database
  console.log('Initializing game...');
  store.getState().initGame();

  let state = store.getState();
  console.log(`Loaded ${state.teams.length} teams`);

  // Registrar jogadores que começaram com menos de 21 anos
  recordYoungPlayers(state.teams);
  console.log(`Tracking ${youngPlayerIds.size} players who started under age 21`);

  const seasonResults: SeasonResult[] = [];

  // 2. Simular 3 temporadas
  for (let season = 1; season <= TOTAL_SEASONS; season++) {
    console.log(`\n--- Season ${season} ---`);
    resetTacticTracker();

    for (let week = 1; week <= WEEKS_PER_SEASON; week++) {
      // Chamar advanceWeek (motor de partida, IA, moral, etc.)
      store.getState().advanceWeek();
      state = store.getState();

      // Aplicar finanças, treino e fadiga a TODOS os times
      // (selectedTeam é null, então advanceWeek não faz isso automaticamente)
      let updatedTeams = [...state.teams];
      updatedTeams = applyFinancesToAllTeams(updatedTeams);
      updatedTeams = applyTrainingToAllTeams(updatedTeams, week);
      updatedTeams = applyFatigueDecayToAllTeams(updatedTeams);

      store.setState({ teams: updatedTeams });
      trackTactics(updatedTeams);

      if (week % 10 === 0) {
        console.log(`  Week ${week} completed`);
      }
    }

    // Temporada encerrada — coletar métricas
    state = store.getState();

    // Contar gols e partidas da temporada
    for (const match of state.matches) {
      if (match.completed) {
        totalGoals += match.homeGoals + match.awayGoals;
        totalMatches++;
      }
    }

    // Classificação final
    const standings = state.leagueTable;
    const champion = standings[0];
    const championTactic = getMostUsedTactic(champion.teamId);
    const relegated = standings
      .filter(s => s.isRelegated)
      .map(s => ({
        teamName: s.teamName,
        tactic: getMostUsedTactic(s.teamId),
      }));

    seasonResults.push({
      season,
      champion: { teamName: champion.teamName, tactic: championTactic },
      relegated,
    });

    console.log(`  Champion: ${champion.teamName} (${championTactic})`);
    console.log(`  Relegated: ${relegated.map(r => `${r.teamName} (${r.tactic})`).join(', ')}`);
    console.log(`  Goals this season: ${state.matches.filter(m => m.completed).reduce((s, m) => s + m.homeGoals + m.awayGoals, 0)}`);

    // Iniciar próxima temporada (se não for a última)
    if (season < TOTAL_SEASONS) {
      store.getState().startNextSeason();
      console.log(`  Started season ${season + 1}`);
    }
  }

  // 3. Extrair métricas globais finais
  state = store.getState();
  const finalStandings = state.leagueTable;

  // Top 4 e últimos 4 pelo orçamento final
  const top4Ids = finalStandings.slice(0, 4).map(s => s.teamId);
  const bottom4Ids = finalStandings.slice(-4).map(s => s.teamId);

  const top4Budgets = top4Ids.map(id => state.teams.find(t => t.id === id)?.budget ?? 0);
  const bottom4Budgets = bottom4Ids.map(id => state.teams.find(t => t.id === id)?.budget ?? 0);

  const top4AvgFinalBudget = top4Budgets.reduce((a, b) => a + b, 0) / Math.max(top4Budgets.length, 1);
  const bottom4AvgFinalBudget = bottom4Budgets.reduce((a, b) => a + b, 0) / Math.max(bottom4Budgets.length, 1);

  // Maior CA entre jogadores que começaram com < 21 anos
  let maxCA = 0;
  let maxCAPlayer: { playerName: string; ca: number; teamName: string; startAge: number } | null = null;

  for (const team of state.teams) {
    for (const player of team.squad) {
      if (youngPlayerIds.has(player.id) && player.currentAbility > maxCA) {
        maxCA = player.currentAbility;
        maxCAPlayer = {
          playerName: `${player.name} ${player.surname}`.trim(),
          ca: player.currentAbility,
          teamName: team.name,
          startAge: youngPlayerStartInfo[player.id]?.startAge ?? 0,
        };
      }
    }
  }

  // 4. Montar output
  const output: SimOutput = {
    seasons: seasonResults,
    avgGoalsPerMatch: Math.round((totalGoals / Math.max(totalMatches, 1)) * 100) / 100,
    top4AvgFinalBudget: Math.round(top4AvgFinalBudget * 100) / 100,
    bottom4AvgFinalBudget: Math.round(bottom4AvgFinalBudget * 100) / 100,
    maxCAUnder21: maxCAPlayer,
  };

  // 5. Exportar para JSON
  const outputPath = path.join(__dirname, 'sim_output.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== SIMULATION COMPLETE (${elapsed}s) ===`);
  console.log(`Output: ${outputPath}`);
  console.log(`Total matches: ${totalMatches}`);
  console.log(`Avg goals/match: ${output.avgGoalsPerMatch}`);
  console.log(`Top 4 avg final budget: ${output.top4AvgFinalBudget}`);
  console.log(`Bottom 4 avg final budget: ${output.bottom4AvgFinalBudget}`);
  if (maxCAPlayer) {
    console.log(`Max CA (started <21): ${maxCAPlayer.playerName} (CA ${maxCAPlayer.ca}, started at age ${maxCAPlayer.startAge}) — ${maxCAPlayer.teamName}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
