import type { GameStore, Team, Player, InboxMessage, SeasonSummary } from '../../types/game';
import { generateTeam, generateYouthIntake } from '../../utils/playerGenerator';
import { loadTeamsFromDatabase, assignBoardExpectations } from '../../utils/dataLoader';
import { healTeamsXI } from '../../utils/lineup';
import {
  simulateFullMatch, simulateMinute, calculatePlayerMatchRatings,
  generateWeekMatches, applyMatchResultToTeams, applyMatchInjuries, generatePostMatchReport,
  performAISubs,
} from '../helpers/matchEngine';
import type { MatchStats, MatchEvent, Match } from '../../types/game';
import { calculateLeagueStandings } from '../helpers/league';
import { generateInboxMessage } from '../helpers/inbox';
import { calculatePlayerInjuryRisk, getRiskLevel, applyFatigueDecayToPlayer, updateDegradedConditionForPlayer, generateInjuryForPlayer, healInjuryForPlayer } from '../helpers/injury';
import { maybeGenerateIncomingTransfer, recalcWageBill, processBiddingWars } from '../helpers/transfer';
import { processScoutMissions, generateDefaultScouts, decayScoutKnowledge, generateScoutRecommendations, processLoans } from '../helpers/scouting';
import { processAIWeeklyDecisions } from '../helpers/aiManager';
import { applyWeeklyMoraleDynamics } from '../helpers/moraleDynamics';
import { calculateTicketRevenue, calculateSponsorshipRevenue, calculateBroadcastingRevenue, calculateFacilityCosts, calculateStaffCosts, weeklyWages, calculateSeasonFinalPrize } from '../helpers/finance';
import { updatePlayerAttributes } from '../helpers/training';
import { weeklyFanMoodDecay, weeklyMediaPressureDecay } from '../helpers/press';
import { getFullName } from '../../utils/playerName';
import { autoSave } from '../../services/saveService.js';
import { CURRENT_SCHEMA_VERSION } from '../../types/saves.js';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

/**
 * Processa features "single-track" (parcelas, bônus, scout, torcida/mídia)
 * para UM time humano. Usado no online para processar o escopo de cada
 * humano não-host após o advanceWeek principal (C6).
 */
export function processWeeklyScopedFeatures(
  get: Get,
  set: Set,
  teamId: string,
  newWeek: number,
  updatedTeams: Team[],
): { teams: Team[]; inboxMessages: InboxMessage[] } {
  const state = get();
  let teams = [...updatedTeams];
  const inboxMessages: InboxMessage[] = [];
  const teamIdx = teams.findIndex(t => t.id === teamId);
  if (teamIdx === -1) return { teams, inboxMessages };

  // 1. Processar parcelas vencidas
  let updatedPendingInstallments = state.pendingInstallments;
  if (state.pendingInstallments.length > 0) {
    const userTeam = { ...teams[teamIdx] };
    updatedPendingInstallments = state.pendingInstallments.map(inst => {
      if (inst.status !== 'active') return inst;
      const isReceivable = inst.direction === 'receivable';
      const updatedPayments = inst.payments.map(p => {
        if (p.paid || p.dueWeek > newWeek) return p;
        if (isReceivable) {
          userTeam.budget += p.amount;
          return { ...p, paid: true, paidWeek: newWeek };
        }
        if (userTeam.budget >= p.amount) {
          userTeam.budget -= p.amount;
          return { ...p, paid: true, paidWeek: newWeek };
        }
        inboxMessages.push({
          id: `inst_default_${Date.now()}_${p.installmentNumber}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'suggestion',
          subject: '⚠️ Parcela Vencida',
          body: `Não foi possível pagar a parcela ${p.installmentNumber} de R$ ${p.amount}M. Verifique o orçamento do clube.`,
          timestamp: Date.now(),
          read: false,
          priority: 'high',
        });
        return p;
      });
      const allPaid = updatedPayments.every(p => p.paid);
      return { ...inst, payments: updatedPayments, status: allPaid ? 'completed' as const : inst.status };
    });
    userTeam.wageBill = recalcWageBill(userTeam);
    teams[teamIdx] = userTeam;
  }

  // 2. Auto-check bonuses
  if (state.incomingBonuses.length > 0) {
    const userTeamForBonus = teams[teamIdx];
    const userStandingForBonus = state.leagueTable.find(s => s.teamId === teamId);
    const updatedBonuses = state.incomingBonuses.map(b => {
      if (b.triggered || b.claimed) return b;
      const player = teams.flatMap(t => t.squad).find(p => p.id === b.playerId);
      if (!player) return b;
      let shouldTrigger = false;
      if (b.type === 'goals') shouldTrigger = (player.seasonGoals ?? 0) >= b.threshold;
      else if (b.type === 'assists') shouldTrigger = (player.seasonAssists ?? 0) >= b.threshold;
      else if (b.type === 'appearances') shouldTrigger = (userTeamForBonus?.played ?? 0) >= b.threshold;
      else if (b.type === 'titles') shouldTrigger = (userStandingForBonus?.position ?? 99) === 1;
      else if (b.type === 'performance') shouldTrigger = (player.form ?? 0) >= b.threshold;
      if (shouldTrigger) return { ...b, triggered: true, triggeredWeek: newWeek };
      return b;
    });
    const newlyTriggered = updatedBonuses.filter(b => b.triggered && !state.incomingBonuses.find(old => old.id === b.id)?.triggered);
    newlyTriggered.forEach(b => {
      inboxMessages.push({
        id: `bonus_triggered_${Date.now()}_${b.playerId}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'news',
        subject: '💰 Bónus Ativado!',
        body: `Um bónus de R$ ${b.bonusAmount}K foi ativado. Vá em Transferências > Bónus para reclamá-lo.`,
        timestamp: Date.now(),
        read: false,
        priority: 'medium',
      });
    });
    set({ incomingBonuses: updatedBonuses });
  }

  // 3. Processar missões de scouting
  let updatedScoutKnowledge = state.scoutKnowledge;
  let updatedScoutMissions = state.scoutMissions;
  let updatedScoutReports = state.scoutReports;
  let updatedRecommendations = state.scoutRecommendations;

  if (state.scoutMissions.length > 0) {
    const scoutResult = processScoutMissions(
      state.scoutMissions, state.scoutKnowledge, teams, teamId, newWeek,
    );
    updatedScoutKnowledge = scoutResult.updatedKnowledge;
    updatedScoutMissions = scoutResult.updatedMissions;
    inboxMessages.push(...scoutResult.newInboxMessages);
    const reportIds = new Set(scoutResult.newScoutReports.map(r => r.playerId));
    updatedScoutReports = [
      ...scoutResult.newScoutReports,
      ...state.scoutReports.filter(r => !reportIds.has(r.playerId)),
    ];
    if (scoutResult.updatedScouts) {
      teams[teamIdx] = { ...teams[teamIdx], scouts: scoutResult.updatedScouts };
    } else {
      const activeScoutIds = new Set(updatedScoutMissions.map(m => m.scoutId));
      if (teams[teamIdx].scouts) {
        teams[teamIdx] = {
          ...teams[teamIdx],
          scouts: teams[teamIdx].scouts.map(s => ({ ...s, assigned: activeScoutIds.has(s.id) })),
        };
      }
    }
  }

  // Scout knowledge decay
  const activeTargetIds = new Set(updatedScoutMissions.map(m => m.targetId));
  const shortlistPlayerIds = new Set(state.shortlist.map(s => s.playerId));
  updatedScoutKnowledge = decayScoutKnowledge(updatedScoutKnowledge, activeTargetIds, shortlistPlayerIds);

  // Scout recommendations
  const isTransferWindowWeek = (newWeek >= 1 && newWeek <= 12) || (newWeek >= 20 && newWeek <= 26);
  if (isTransferWindowWeek && newWeek % 4 === 0) {
    const userTeam = teams[teamIdx];
    if (userTeam) {
      const existingRecIds = new Set(state.scoutRecommendations.map(r => r.id));
      const newRecs = generateScoutRecommendations(userTeam, teams, newWeek, existingRecIds, updatedScoutKnowledge);
      if (newRecs.length > 0) {
        updatedRecommendations = [...state.scoutRecommendations, ...newRecs];
        for (const rec of newRecs) {
          inboxMessages.push({
            id: `scout_rec_${rec.id}_${newWeek}`,
            type: 'suggestion',
            subject: `💡 Recomendação do ${rec.scoutName}: ${rec.playerName} (Nota ${rec.grade})`,
            body: `${rec.scoutName} recomenda ${rec.playerName} (${rec.position}, ${rec.age} anos) do ${rec.currentTeamName}. CA estimado: ${rec.estimatedCA}, PA estimado: ${rec.estimatedPA}. Valor estimado: R$ ${rec.estimatedValue}M. ${rec.reason}`,
            timestamp: Date.now(),
            read: false,
            priority: rec.grade === 'A' ? 'high' : 'medium',
            relatedPlayerId: rec.playerId,
          });
        }
      }
    }
  }

  // 4. Press decay (fan mood, media pressure)
  let updatedFanMood = state.fanMood;
  let updatedMediaPressure = state.mediaPressure;
  const teamForPress = teams[teamIdx];
  if (teamForPress) {
    updatedFanMood = weeklyFanMoodDecay(state.fanMood, teamForPress.leagueForm ?? []);
    updatedMediaPressure = weeklyMediaPressureDecay(state.mediaPressure);
  }

  // 5. Commit scoped state updates
  set({
    pendingInstallments: updatedPendingInstallments,
    scoutKnowledge: updatedScoutKnowledge,
    scoutMissions: updatedScoutMissions,
    scoutReports: updatedScoutReports,
    scoutRecommendations: updatedRecommendations,
    fanMood: updatedFanMood,
    mediaPressure: updatedMediaPressure,
  });

  return { teams, inboxMessages };
}

// Auto-finaliza a partida pendente do usuário (caso ele avance sem jogá-la ao vivo).
// Muta `matches` no lugar (marca a partida como completed) e retorna o novo array de teams
// com o resultado aplicado. Usado tanto no avanço normal quanto no fim da temporada.
function finalizePendingUserMatch(matches: Match[], teams: Team[], selectedTeam: string | null, currentWeek: number): Team[] {
  if (!selectedTeam) return teams;
  const idx = matches.findIndex(
    pm => !pm.completed && (pm.homeTeam === selectedTeam || pm.awayTeam === selectedTeam),
  );
  if (idx === -1) return teams;

  const pending = matches[idx];
  const ph = teams.find(t => t.id === pending.homeTeam);
  const pa = teams.find(t => t.id === pending.awayTeam);
  if (!ph || !pa) return teams;

  let result;
  if (pending.isLive && pending.liveMatchState) {
    let ht = ph;
    let at = pa;
    let liveState = pending.liveMatchState;
    for (let m = pending.liveMinute + 1; m <= 90 + (liveState.addedTime ?? 0); m++) {
      liveState = simulateMinute(ht, at, liveState, m);
      const subResult = performAISubs(ht, at, liveState, m, ['home', 'away']);
      ht = subResult.homeTeam;
      at = subResult.awayTeam;
      liveState = subResult.state;
    }
    const events: MatchEvent[] = liveState.events.sort((a, b) => a.minute - b.minute);
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const stats: MatchStats = {
      ...liveState.stats,
      homePossession: clamp(liveState.stats.homePossession, 25, 75),
      awayPossession: 100 - clamp(liveState.stats.homePossession, 25, 75),
    };
    const baseResult = {
      homeGoals: liveState.homeGoals,
      awayGoals: liveState.awayGoals,
      events,
      stats,
      goalDetails: liveState.goalDetails,
    };
    const withRatings = calculatePlayerMatchRatings(ht, at, baseResult);
    const postMatchReport = generatePostMatchReport(ht, at, baseResult, liveState.actions);
    result = { ...withRatings, postMatchReport, matchInjuries: liveState.matchInjuries ?? [] };
  } else {
    result = simulateFullMatch(ph, pa);
  }

  const teamsWithInjuries = applyMatchInjuries(teams, pending.homeTeam, pending.awayTeam, result.matchInjuries ?? [], currentWeek);
  const newTeams = applyMatchResultToTeams(teamsWithInjuries, pending.homeTeam, pending.awayTeam, result);
  matches[idx] = {
    ...pending,
    completed: true,
    isLive: false,
    homeGoals: result.homeGoals,
    awayGoals: result.awayGoals,
    events: result.events,
    stats: result.stats,
    playerRatings: result.playerRatings,
    bestPlayer: result.bestPlayer,
    postMatchReport: result.postMatchReport,
  };
  return newTeams;
}

export const createCoreSlice = (set: Set, get: Get) => ({
  deselectTeam: () => {
    set({ selectedTeam: null });
  },
  selectTeam: (teamId: string) => set({ selectedTeam: teamId }),

  initGame: () => {
    let teams: Team[] = loadTeamsFromDatabase();

    if (teams.length === 0) {
      console.warn('[initGame] No teams loaded from database, falling back to procedural generation');
      teams = [];
      for (let i = 0; i < 8; i++) {
        const reputation = 30 + Math.floor(Math.random() * 60);
        const team = generateTeam({
          division: i < 4 ? 'Série A' : 'Série B',
          league: 'Brasileirão',
          reputation,
        });
        team.wageBill = recalcWageBill(team);
        teams.push(team);
      }
    } else {
      teams.forEach(team => {
        team.wageBill = recalcWageBill(team);
        if (!team.scouts || team.scouts.length === 0) {
          team.scouts = generateDefaultScouts(team.id);
        }
      });
    }

    assignBoardExpectations(teams);
    teams = healTeamsXI(teams);

    // E-14: Não gerar partidas no initGame — o primeiro advanceWeek gera a semana 1.
    // Antes, initGame criava partidas para semana 1 (currentWeek=0) e advanceWeek
    // gerava outra semana 1, causando rodada duplicada e 39 jogos para o usuário.
    const initialStandings = calculateLeagueStandings(teams, [], 0);

    set({
      teams,
      matches: [],
      currentWeek: 0,
      currentSeason: 1,
      selectedTeam: null,
      inbox: [],
      transfers: [],
      incomingTransfers: [],
      counterOffers: [],
      scoutReports: [],
      deferredTransfers: [],
      youthIntakeCompleted: false,
      trainingPlan: null,
      transferAgreements: [],
      boardReplies: [],
      boardSatisfaction: 50,
      financialReports: [],
      injuryHistory: [],
      preventionSessions: [],
      fatigueLog: [],
      recommendations: [],
      degradedConditions: [],
      socialTree: null,
      pendingInstallments: [],
      incomingBonuses: [],
      completedTransfers: [],
      youthAcademy: { players: [], level: 1, weeklySlots: 3, currentTraining: 'technical', graduationRate: 20 },
      reserveTeam: [],
      saveSlots: [],
      leagueTable: initialStandings,
      scoutKnowledge: {},
      scoutMissions: [],
      shortlist: [],
      scoutRecommendations: [],
      activeLoans: [],
      biddingWars: [],
      seasonSummary: null,
      gameOver: false,
      pressConferences: [],
      fanMood: { value: 50, trend: 'stable', sentiment: 'neutral' },
      mediaPressure: { value: 20, level: 'low' },
      isAdvancing: false,
    });
  },

  updateTeam: (teamId: string, updater: (team: Team) => Team) => {
    const state = get();
    set({
      teams: state.teams.map(t => (t.id === teamId ? updater({ ...t }) : t)),
    });
  },

  // No modo online (Fase 5), `humanTeamIds` traz TODOS os times humanos da sala;
  // o avanço é coordenado por ready-check. Sem o argumento = single-player (1 humano).
  advanceWeek: (humanTeamIds?: string[], trainingByTeam?: Record<string, import('../../types/game').WeeklyTrainingPlan | null>) => {
    const state = get();
    if (state.isAdvancing) return;

    // Temporada encerrada: bloqueia avançar até iniciar a próxima temporada.
    // Sem isto, reentrar no bloco championshipEnded repagaria o prêmio de
    // colocação e a receita semanal a cada clique. startNextSeason limpa ambos.
    if (state.seasonSummary || state.gameOver) return;

    // Times controlados por humanos nesta semana. Online: a lista passada.
    // Single-player: apenas o time selecionado.
    const isOnline = !!(humanTeamIds && humanTeamIds.length > 0);
    const humans: string[] = isOnline
      ? humanTeamIds!
      : (state.selectedTeam ? [state.selectedTeam] : []);

    // Bloqueia avanço se houver jogador lesionado no XI — só no single-player.
    // Online não trava a rodada inteira por um jogador (a partida é simulada).
    if (!isOnline && state.selectedTeam) {
      const userTeam = state.teams.find(t => t.id === state.selectedTeam);
      if (userTeam) {
        const injuredInXI = (userTeam.startingXI ?? [])
          .map(id => userTeam.squad.find(p => p.id === id))
          .find(p => p?.injury?.active);
        if (injuredInXI) {
          set({ matchBlockMessage: `Partida não pode iniciar: ${getFullName(injuredInXI)} lesionado` });
          return;
        }
      }
    }

    set({ isAdvancing: true, matchBlockMessage: null });
    try {
    const newWeek = state.currentWeek + 1;
    const newSeason = state.currentSeason;
    const youthReset = state.youthIntakeCompleted;
    const championshipEnded = newWeek > 38;

    // E-05: Garantir que todo time tenha 11 titulares válidos antes de simular.
    // Jogadores vendidos/emprestados podem ter saído do squad mas ficado no startingXI.
    const teamsWithValidXI = healTeamsXI(state.teams);

    if (championshipEnded) {
      // Campeonato encerrado após 38 rodadas - não gerar novas partidas
      const inboxMessage = generateInboxMessage(38, {
        teams: teamsWithValidXI,
        selectedTeamId: state.selectedTeam,
        hasIncomingTransfer: false,
      });
      let updatedTeams = [...teamsWithValidXI];

      // Manter partidas existentes sem gerar novas, mas auto-finalizar a partida
      // pendente da rodada 38 do usuário para que a classificação final seja justa.
      const updatedMatches = [...state.matches];
      updatedTeams = finalizePendingUserMatch(updatedMatches, updatedTeams, state.selectedTeam, 38);
      const leagueStandings = calculateLeagueStandings(updatedTeams, updatedMatches, 38);

      // Prêmio por colocação final da temporada (Fase 6.2)
      const totalTeams = updatedTeams.length;
      leagueStandings.forEach(standing => {
        const teamIdx = updatedTeams.findIndex(t => t.id === standing.teamId);
        if (teamIdx !== -1) {
          const prize = calculateSeasonFinalPrize(standing.position, updatedTeams[teamIdx].reputation, totalTeams);
          updatedTeams[teamIdx] = {
            ...updatedTeams[teamIdx],
            budget: Math.max(-50, updatedTeams[teamIdx].budget + prize),
          };
        }
      });

      // Atualizar orçamento das equipes humanas
      for (const hid of humans) {
        const teamIdx = updatedTeams.findIndex(t => t.id === hid);
        if (teamIdx !== -1) {
          const team = updatedTeams[teamIdx];
          const ticketRevenue = calculateTicketRevenue(team.reputation);
          const sponsorship = calculateSponsorshipRevenue(team.reputation);
          const broadcasting = calculateBroadcastingRevenue(team.reputation);
          const facilityCosts = calculateFacilityCosts(team.facilitiesLevel);
          const staffCosts = calculateStaffCosts(team.staffLevel);
          const wageCost = weeklyWages(team.wageBill);
          updatedTeams[teamIdx] = {
            ...team,
            budget: Math.max(-50, team.budget + ticketRevenue + sponsorship + broadcasting - wageCost - facilityCosts - staffCosts),
          };
        }
      }

      // Processamento de fadiga dos times humanos (sem gerar novas partidas)
      for (const hid of humans) {
        const teamIdx = updatedTeams.findIndex(t => t.id === hid);
        if (teamIdx !== -1) {
          const team = updatedTeams[teamIdx];
          team.squad = team.squad.map(player => applyFatigueDecayToPlayer(player));
          updatedTeams[teamIdx] = team;
        }
      }

      // Morale dynamics for all teams (#45)
      updatedTeams.forEach((team, idx) => {
        const result = applyWeeklyMoraleDynamics(team);
        updatedTeams[idx] = result.team;
      });

      // Process active loans (#45)
      let endOfSeasonLoans = state.activeLoans;
      if (state.activeLoans.length > 0) {
        const loanResult = processLoans(state.activeLoans, updatedTeams, 38);
        endOfSeasonLoans = loanResult.updatedLoans;
        for (let i = 0; i < updatedTeams.length; i++) {
          updatedTeams[i] = loanResult.updatedTeams[i] ?? updatedTeams[i];
        }
      }

      // ============================================================
      // GERAR RESUMO DE FIM DE TEMPORADA
      // ============================================================
      let seasonSummary: SeasonSummary | null = null;
      let gameOver: boolean = state.gameOver ?? false;

      if (state.selectedTeam) {
        const userStanding = leagueStandings.find(s => s.teamId === state.selectedTeam);
        const userTeam = updatedTeams.find(t => t.id === state.selectedTeam);
        if (userStanding && userTeam) {
          const zoneLabels: Record<string, string> = {
            title: 'Libertadores',
            europe: 'Sul-Americana',
            safe: 'Meio de Tabela',
            relegation: 'Rebaixamento',
          };

          // Artilheiro e líder de assistências do time
          let topScorer: { name: string; goals: number } | null = null;
          let topAssister: { name: string; assists: number } | null = null;

          userTeam.squad.forEach(player => {
            const goals = player.seasonGoals ?? 0;
            const assists = player.seasonAssists ?? 0;
            if (goals > 0 && (!topScorer || goals > topScorer.goals)) {
              topScorer = { name: `${player.name} ${player.surname}`.trim(), goals };
            }
            if (assists > 0 && (!topAssister || assists > topAssister.assists)) {
              topAssister = { name: `${player.name} ${player.surname}`.trim(), assists };
            }
          });

          const isFinalSeason = newSeason >= 3;
          seasonSummary = {
            season: newSeason,
            teamName: userTeam.name,
            position: userStanding.position,
            zone: userStanding.zone ?? 'safe',
            zoneLabel: zoneLabels[userStanding.zone ?? 'safe'] ?? 'Meio de Tabela',
            points: userStanding.points,
            wins: userStanding.wins,
            draws: userStanding.draws,
            losses: userStanding.losses,
            goalsFor: userStanding.goalsFor,
            goalsAgainst: userStanding.goalsAgainst,
            topScorer,
            topAssister,
            isFinalSeason,
          };

          if (isFinalSeason) {
            gameOver = true;
          }
        }
      }

      set({
        currentWeek: 38,
        currentSeason: newSeason,
        matches: updatedMatches,
        teams: updatedTeams,
        youthIntakeCompleted: false,
        inbox: [...(state.inbox || []), inboxMessage].slice(0, 100),
        leagueTable: leagueStandings,
        seasonSummary,
        gameOver,
        activeLoans: endOfSeasonLoans,
        isAdvancing: false,
      });
      return;
    }

    // Comportamento normal - campeonato em andamento
    let updatedTeams = [...teamsWithValidXI];

    // Auto-finaliza partida pendente do usuário da rodada anterior (mantém a
    // classificação justa caso ele avance a semana sem jogá-la ao vivo).
    // Online: todas as partidas são simuladas frescas a cada rodada (nada fica
    // pendente), então NÃO finalizamos — senão o host jogaria a partida duas vezes.
    const previousMatches = [...state.matches];
    if (!isOnline) {
      updatedTeams = finalizePendingUserMatch(previousMatches, updatedTeams, state.selectedTeam, newWeek);
    }

    // Acumular partidas completadas de semanas anteriores para que a
    // classificação reflita toda a temporada, não apenas a rodada atual.
    // Limitar a últimas 200 para evitar crescimento indefinido (#49).
    const previousCompleted = previousMatches.filter(m => m.completed).slice(-200);
    const newMatches = generateWeekMatches(updatedTeams, newWeek);

    const updatedMatches = [...previousCompleted, ...newMatches.map(m => {
      const match = { ...m };
      // Single-player: a partida do usuário fica pendente para jogar ao vivo.
      // Online (MVP): TODAS as partidas são simuladas no fechamento da rodada.
      const leaveForLive = !isOnline && (m.homeTeam === state.selectedTeam || m.awayTeam === state.selectedTeam);
      if (!leaveForLive) {
        const homeTeam = updatedTeams.find(t => t.id === m.homeTeam);
        const awayTeam = updatedTeams.find(t => t.id === m.awayTeam);
        if (!homeTeam || !awayTeam) return match;
        const result = simulateFullMatch(homeTeam, awayTeam);
        match.homeGoals = result.homeGoals;
        match.awayGoals = result.awayGoals;
        match.completed = true;
        match.events = result.events;
        match.stats = result.stats;
        match.playerRatings = result.playerRatings;
        match.bestPlayer = result.bestPlayer;
        match.postMatchReport = result.postMatchReport;
        updatedTeams = applyMatchInjuries(updatedTeams, m.homeTeam, m.awayTeam, result.matchInjuries ?? [], newWeek);
        updatedTeams = applyMatchResultToTeams(updatedTeams, m.homeTeam, m.awayTeam, result);
      } else {
        // Partida do usuário: fica PENDENTE para ser jogada ao vivo no Centro de Partidas.
        // Será auto-finalizada na próxima rodada se não for jogada.
        match.completed = false;
        match.isLive = false;
      }
      return match;
    })];

    let youthIntakeCompleted = youthReset;

    // Receitas/despesas semanais de cada time humano
    for (const hid of humans) {
      const teamIdx = updatedTeams.findIndex(t => t.id === hid);
      if (teamIdx !== -1) {
        const team = updatedTeams[teamIdx];
        const ticketRevenue = calculateTicketRevenue(team.reputation);
        const sponsorship = calculateSponsorshipRevenue(team.reputation);
        const broadcasting = calculateBroadcastingRevenue(team.reputation);
        const facilityCosts = calculateFacilityCosts(team.facilitiesLevel);
        const staffCosts = calculateStaffCosts(team.staffLevel);
        const wageCost = weeklyWages(team.wageBill);
        updatedTeams[teamIdx] = {
          ...team,
          budget: Math.max(-50, team.budget + ticketRevenue + sponsorship + broadcasting - wageCost - facilityCosts - staffCosts),
        };
      }
    }

    // Generate incoming transfer BEFORE inbox message so context can be passed
    const newIncoming = state.selectedTeam
      ? maybeGenerateIncomingTransfer(updatedTeams, state.selectedTeam, newWeek)
      : null;

    // Generate context-aware inbox message with proper relatedPlayerId
    const inboxMessage = generateInboxMessage(newWeek, {
      teams: updatedTeams,
      selectedTeamId: state.selectedTeam,
      hasIncomingTransfer: !!newIncoming,
      incomingTransferPlayerId: newIncoming?.playerId,
    });

    // Apply injury to the player if the message is an injury type
    // (Injuries are now generated via risk-based system below, not from inbox)
    const inboxToSend = inboxMessage;

    // ============================================================
    // PROCESSAMENTO DE FADIGA E RECOMENDAÇÕES (AVANCE WEEK)
    // ============================================================
    const newInboxMessages: InboxMessage[] = [];
    // E-10: Mapa de inbox por time humano para distribuição no online.
    const inboxByTeam: Record<string, InboxMessage[]> = {};

    // Processamento de fadiga/cura/lesões/contratos para CADA time humano.
    for (const hid of humans) {
      inboxByTeam[hid] = [];
      const teamIdx = updatedTeams.findIndex(t => t.id === hid);
      if (teamIdx !== -1) {
        const team = updatedTeams[teamIdx];

        // 1. Aplicar decaimento de fadiga e curar lesões (via helpers centralizados)
        team.squad = team.squad.map(player => {
          let updated = applyFatigueDecayToPlayer(player);
          // Heal injuries using centralized helper (considers staff, facilities, age, severity)
          if (updated.injury?.active) {
            updated = healInjuryForPlayer(updated, team.facilitiesLevel, team.staffLevel);
          }
          // Decrement contract countdown
          if (updated.contractEnd > 0) {
            updated.contractEnd -= 1;
            if (updated.contractEnd === 4) {
              inboxByTeam[hid].push({
                id: `contract_warn4_${Date.now()}_${updated.id}`,
                type: 'suggestion',
                subject: `⏰ Contrato expira em 4 semanas: ${getFullName(updated)}`,
                body: `${getFullName(updated)} tem o contrato vencendo em 4 semanas. Considere renovar ou planejar a saída.`,
                timestamp: Date.now(),
                read: false,
                priority: 'medium',
                relatedPlayerId: updated.id,
              });
            } else if (updated.contractEnd === 2) {
              inboxByTeam[hid].push({
                id: `contract_warn2_${Date.now()}_${updated.id}`,
                type: 'suggestion',
                subject: `🚨 Contrato expira em 2 semanas: ${getFullName(updated)}`,
                body: `${getFullName(updated)} tem o contrato vencendo em 2 semanas — renove ou perca o jogador gratuitamente.`,
                timestamp: Date.now(),
                read: false,
                priority: 'high',
                relatedPlayerId: updated.id,
              });
            }
            if (updated.contractEnd === 0) {
              inboxByTeam[hid].push({
                id: `contract_exp_${Date.now()}_${updated.id}`,
                type: 'suggestion',
                subject: `📋 Contrato Expirado: ${getFullName(updated)}`,
                body: `${getFullName(updated)} teve seu contrato expirado. Renove ou libere o jogador.`,
                timestamp: Date.now(),
                read: false,
                priority: 'high',
                relatedPlayerId: updated.id,
              });
            }
          }
          return updated;
        });
        updatedTeams[teamIdx] = team;

        // 2. Atualizar condições degradadas (via standalone helper, using newWeek)
        team.squad = team.squad.map(player =>
          updateDegradedConditionForPlayer(player, newWeek),
        );
        updatedTeams[teamIdx] = team;

        // 3. Verificar jogadores em risco e gerar lesões + recomendações
        const injuryRecommendations: InboxMessage[] = [];
        const substitutionRecommendations: InboxMessage[] = [];
        const injuryInboxMessages: InboxMessage[] = [];

        team.squad = team.squad.map(player => {
          if (player.injury?.active) return player;

          const risk = calculatePlayerInjuryRisk(player, team.facilitiesLevel, team.staffLevel, newWeek);
          const riskLevel = getRiskLevel(risk);

          // Generate recommendations for high/critical risk
          if (riskLevel === 'critical') {
            substitutionRecommendations.push({
              id: `rec_sub_${Date.now()}_${player.id}`,
              type: 'suggestion',
              subject: `⚠️ URGENTE: ${getFullName(player)} em Risco Crítico`,
              body: `${getFullName(player)} está com risco de lesão CRÍTICO (${risk}%). Recomendo substituição imediata nos treinos e possivelmente na próxima partida.`,
              timestamp: Date.now(),
              read: false,
              priority: 'high',
              relatedPlayerId: player.id,
            });
          } else if (riskLevel === 'high') {
            injuryRecommendations.push({
              id: `rec_rest_${Date.now()}_${player.id}`,
              type: 'suggestion',
              subject: `🟠 ${getFullName(player)} — Risco Alto de Lesão`,
              body: `${getFullName(player)} apresenta risco alto de lesão (${risk}%). Sugiro descanso ou treino leve. Verificar no painel de Treino.`,
              timestamp: Date.now(),
              read: false,
              priority: 'medium',
              relatedPlayerId: player.id,
            });
          }

          // Risk-based injury generation: weekly roll (reduced — primary source is now in-match)
          // Base chance 0.5%, modified by risk level
          const injuryChance = 0.005 + (risk / 100) * 0.03;
          if (Math.random() < injuryChance) {
            const injuredPlayer = generateInjuryForPlayer(player, 'random', team.facilitiesLevel, team.staffLevel, newWeek);
            injuryInboxMessages.push({
              id: `injury_${Date.now()}_${player.id}`,
              type: 'injury',
              subject: `🏥 Relatório Médico — ${getFullName(player)} lesionado`,
              body: `${getFullName(player)} sofreu uma lesão (${injuredPlayer.injury?.type}) durante a semana. Afastamento estimado: ${injuredPlayer.injury?.daysRemaining} dias. Verifique o relatório médico para detalhes.`,
              timestamp: Date.now(),
              read: false,
              priority: injuredPlayer.injury?.severity === 'severe' ? 'high' : injuredPlayer.injury?.severity === 'moderate' ? 'medium' : 'low',
              relatedPlayerId: player.id,
            });
            return injuredPlayer;
          }

          return player;
        });
        updatedTeams[teamIdx] = team;

        // 5. Adicionar recomendações e notificações de lesão ao inbox
        inboxByTeam[hid].push(...injuryRecommendations, ...substitutionRecommendations, ...injuryInboxMessages);
      }
    }

    // E-10: Mesclar mensagens do time selecionado (host no online) de volta em newInboxMessages.
    // As mensagens dos outros humanos ficam em inboxByTeam para distribuição via advanceRoomWeek.
    if (state.selectedTeam && inboxByTeam[state.selectedTeam]) {
      newInboxMessages.push(...inboxByTeam[state.selectedTeam]);
    }

    // ============================================================
    // PROCESSAMENTO DE PARCELAS VENCIDAS E BÓNUS (Transferências)
    // ============================================================
    let updatedPendingInstallments = state.pendingInstallments;

    if (state.selectedTeam && state.pendingInstallments.length > 0) {
      const teamIdx2 = updatedTeams.findIndex(t => t.id === state.selectedTeam);
      if (teamIdx2 !== -1) {
        const userTeam2 = { ...updatedTeams[teamIdx2] };

        updatedPendingInstallments = state.pendingInstallments.map(inst => {
          if (inst.status !== 'active') return inst;

          const isReceivable = inst.direction === 'receivable';

          const updatedPayments = inst.payments.map(p => {
            if (p.paid || p.dueWeek > newWeek) return p;

            if (isReceivable) {
              // Receivable: user receives money
              userTeam2.budget += p.amount;
              return { ...p, paid: true, paidWeek: newWeek };
            }

            // Payable: auto-pay if budget allows
            if (userTeam2.budget >= p.amount) {
              userTeam2.budget -= p.amount;
              return { ...p, paid: true, paidWeek: newWeek };
            }

            // Mark as defaulted if can't pay
            newInboxMessages.push({
              id: `inst_default_${Date.now()}_${p.installmentNumber}_${Math.random().toString(36).substr(2, 5)}`,
              type: 'suggestion',
              subject: '⚠️ Parcela Vencida',
              body: `Não foi possível pagar a parcela ${p.installmentNumber} de R$ ${p.amount}M. Verifique o orçamento do clube.`,
              timestamp: Date.now(),
              read: false,
              priority: 'high',
            });
            return p;
          });

          const allPaid = updatedPayments.every(p => p.paid);

          // Uma parcela sem saldo fica apenas VENCIDA (não paga) e será
          // retentada nas próximas semanas quando o orçamento se recuperar.
          // Não marcamos a cláusula inteira como 'defaulted' — isso a congelaria
          // (o filtro no topo pula tudo que não está 'active') e daria o jogador de graça.
          return {
            ...inst,
            payments: updatedPayments,
            status: allPaid ? 'completed' as const : inst.status,
          };
        });

        userTeam2.wageBill = recalcWageBill(userTeam2);
        updatedTeams[teamIdx2] = userTeam2;
      }
    }

    // ============================================================
    // ATUALIZAR TABELA DE CLASSIFICAÇÃO (P1.1)
    // ============================================================
    const leagueStandings = calculateLeagueStandings(updatedTeams, updatedMatches, newWeek);

    // Sincronizar leaguePosition real em todos os times
    const positionMap = new Map(leagueStandings.map(s => [s.teamId, s.position]));
    updatedTeams = updatedTeams.map(t => ({ ...t, leaguePosition: positionMap.get(t.id) ?? t.leaguePosition }));

    // Auto-check bonuses using real player stats
    if (state.incomingBonuses.length > 0) {
      const userTeamForBonus = state.selectedTeam
        ? updatedTeams.find(t => t.id === state.selectedTeam)
        : undefined;
      const userStandingForBonus = state.selectedTeam
        ? leagueStandings.find(s => s.teamId === state.selectedTeam)
        : undefined;

      const updatedBonuses = state.incomingBonuses.map(b => {
        if (b.triggered || b.claimed) return b;
        const player = updatedTeams.flatMap(t => t.squad).find(p => p.id === b.playerId);
        if (!player) return b;

        let shouldTrigger = false;
        if (b.type === 'goals') {
          shouldTrigger = (player.seasonGoals ?? 0) >= b.threshold;
        } else if (b.type === 'assists') {
          shouldTrigger = (player.seasonAssists ?? 0) >= b.threshold;
        } else if (b.type === 'appearances') {
          shouldTrigger = (userTeamForBonus?.played ?? 0) >= b.threshold;
        } else if (b.type === 'titles') {
          shouldTrigger = (userStandingForBonus?.position ?? 99) === 1;
        } else if (b.type === 'performance') {
          shouldTrigger = (player.form ?? 0) >= b.threshold;
        }

        if (shouldTrigger) {
          return { ...b, triggered: true, triggeredWeek: newWeek };
        }
        return b;
      });

      // Triggered bonus notifications
      const newlyTriggered = updatedBonuses.filter(b => b.triggered && !state.incomingBonuses.find(old => old.id === b.id)?.triggered);
      newlyTriggered.forEach(b => {
        newInboxMessages.push({
          id: `bonus_triggered_${Date.now()}_${b.playerId}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'news',
          subject: '💰 Bónus Ativado!',
          body: `Um bónus de R$ ${b.bonusAmount}K foi ativado. Vá em Transferências > Bónus para reclamá-lo.`,
          timestamp: Date.now(),
          read: false,
          priority: 'medium',
        });
      });

      set({ incomingBonuses: updatedBonuses });
    }

    // Decrementa o contrato dos jogadores dos times AI (o time do usuário já foi
    // decrementado acima). Sem isto, contractEnd fica estático e as renovações
    // automáticas da IA (processAIContracts) quase nunca disparam.
    updatedTeams = updatedTeams.map(team => {
      if (humans.includes(team.id)) return team; // humanos já decrementados acima
      return {
        ...team,
        squad: team.squad.map(p => (p.contractEnd > 0 ? { ...p, contractEnd: p.contractEnd - 1 } : p)),
      };
    });

    // ============================================================
    // ROTINA SEMANAL DA IA — Clubes AI tomam decisões ativas
    // (transferências entre si, ajustes táticos, renovações)
    // ============================================================
    const aiResult = processAIWeeklyDecisions(updatedTeams, leagueStandings, newWeek, state.selectedTeam, state.freeAgents || []);
    updatedTeams = aiResult.teams;
    const aiCompletedTransfers = aiResult.completedTransfers;
    const updatedFreeAgents = aiResult.freeAgents;

    // E-13: Resolução de contrapropostas pendentes — a IA decide aceitar ou rejeitar.
    let updatedCounterOffers = state.counterOffers;
    const counterOfferMessages: InboxMessage[] = [];
    if (state.counterOffers.length > 0) {
      updatedCounterOffers = state.counterOffers.map(co => {
        if (co.status !== 'pending') return co;
        const player = updatedTeams.flatMap(t => t.squad).find(p => p.id === co.originalPlayerId);
        const buyerTeam = updatedTeams.find(t => t.id === co.originalFromTeam);
        const buyerName = buyerTeam ? buyerTeam.name : 'Time interessado';
        const playerName = player ? getFullName(player) : 'jogador';
        if (!player) return { ...co, status: 'rejected' as const };
        // Aceita se o preço contraposto for <= 130% do valor de mercado
        const ratio = co.counterPrice / Math.max(player.marketValue, 1);
        const acceptChance = Math.max(0, 0.8 - (ratio - 1.1) * 2);
        if (Math.random() < acceptChance) {
          // Aceitar: executar a venda via acceptIncomingTransfer
          get().acceptIncomingTransfer(co.originalPlayerId);
          counterOfferMessages.push({
            id: `msg_cor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'news',
            subject: 'Contra-oferta Aceita!',
            body: `O ${buyerName} aceitou a sua contra-oferta de R$ ${co.counterPrice}M por ${playerName}. A transferência foi concluída.`,
            timestamp: Date.now(),
            read: false,
            priority: 'high',
            relatedPlayerId: co.originalPlayerId,
          });
          return { ...co, status: 'accepted' as const };
        }
        counterOfferMessages.push({
          id: `msg_cor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'news',
          subject: 'Contra-oferta Recusada',
          body: `O ${buyerName} recusou a sua contra-oferta de R$ ${co.counterPrice}M por ${playerName}.`,
          timestamp: Date.now(),
          read: false,
          priority: 'medium',
          relatedPlayerId: co.originalPlayerId,
        });
        return { ...co, status: 'rejected' as const };
      });
    }

    // ============================================================
    // DINÂMICA SOCIAL — Consequências do vestiário
    // Moral cai por promessas não cumpridas, tempo de jogo, forma do time
    // Cascata: capitão infeliz arrasta aliados e grupo social
    // ============================================================
    updatedTeams = updatedTeams.map(team => {
      const result = applyWeeklyMoraleDynamics(team);
      return result.team;
    });

    // Apply basic fatigue decay to AI teams (#44) — humanos já tratados no loop acima
    updatedTeams = updatedTeams.map(team => {
      if (humans.includes(team.id)) return team;
      return {
        ...team,
        squad: team.squad.map(player => applyFatigueDecayToPlayer(player)),
      };
    });

    // ============================================================
    // PROCESSAMENTO DE MISSÕES DE SCOUTING
    // ============================================================
    let updatedScoutKnowledge = state.scoutKnowledge;
    let updatedScoutMissions = state.scoutMissions;
    const scoutInboxMessages: InboxMessage[] = [];
    let updatedScoutReports = state.scoutReports;

    if (state.scoutMissions.length > 0) {
      const scoutResult = processScoutMissions(
        state.scoutMissions,
        state.scoutKnowledge,
        updatedTeams,
        state.selectedTeam,
        newWeek,
      );
      updatedScoutKnowledge = scoutResult.updatedKnowledge;
      updatedScoutMissions = scoutResult.updatedMissions;
      scoutInboxMessages.push(...scoutResult.newInboxMessages);

      // Merge new scout reports (replace existing for same player)
      const reportIds = new Set(scoutResult.newScoutReports.map(r => r.playerId));
      updatedScoutReports = [
        ...scoutResult.newScoutReports,
        ...state.scoutReports.filter(r => !reportIds.has(r.playerId)),
      ];

      // Aplicar desenvolvimento de scouts (experiência, judgingAbility)
      if (scoutResult.updatedScouts && state.selectedTeam) {
        const teamIdx3 = updatedTeams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx3 !== -1) {
          updatedTeams[teamIdx3] = {
            ...updatedTeams[teamIdx3],
            scouts: scoutResult.updatedScouts,
          };
        }
      } else if (state.selectedTeam) {
        // Fallback: liberar olheiros cujas missões terminaram
        const activeScoutIds = new Set(updatedScoutMissions.map(m => m.scoutId));
        const teamIdx3 = updatedTeams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx3 !== -1 && updatedTeams[teamIdx3].scouts) {
          updatedTeams[teamIdx3] = {
            ...updatedTeams[teamIdx3],
            scouts: updatedTeams[teamIdx3].scouts.map(s => ({
              ...s,
              assigned: activeScoutIds.has(s.id),
            })),
          };
        }
      }
    }

    // === DECAIMENTO DE CONHECIMENTO ===
    const activeTargetIds = new Set(updatedScoutMissions.map(m => m.targetId));
    const shortlistPlayerIds = new Set(state.shortlist.map(s => s.playerId));
    updatedScoutKnowledge = decayScoutKnowledge(updatedScoutKnowledge, activeTargetIds, shortlistPlayerIds);

    // === RECOMENDAÇÕES AUTOMÁTICAS DE SCOUTS ===
    // Gerar a cada 4 semanas durante janelas de transferência
    const isTransferWindowWeek = (newWeek >= 1 && newWeek <= 12) || (newWeek >= 20 && newWeek <= 26);
    let updatedRecommendations = state.scoutRecommendations;
    if (isTransferWindowWeek && newWeek % 4 === 0 && state.selectedTeam) {
      const userTeam = updatedTeams.find(t => t.id === state.selectedTeam);
      if (userTeam) {
        const existingRecIds = new Set(state.scoutRecommendations.map(r => r.id));
        const newRecs = generateScoutRecommendations(
          userTeam,
          updatedTeams,
          newWeek,
          existingRecIds,
          updatedScoutKnowledge,
        );
        if (newRecs.length > 0) {
          updatedRecommendations = [...state.scoutRecommendations, ...newRecs];
          for (const rec of newRecs) {
            scoutInboxMessages.push({
              id: `scout_rec_${rec.id}_${newWeek}`,
              type: 'suggestion',
              subject: `💡 Recomendação do ${rec.scoutName}: ${rec.playerName} (Nota ${rec.grade})`,
              body: `${rec.scoutName} recomenda ${rec.playerName} (${rec.position}, ${rec.age} anos) do ${rec.currentTeamName}. CA estimado: ${rec.estimatedCA}, PA estimado: ${rec.estimatedPA}. Valor estimado: R$ ${rec.estimatedValue}M. ${rec.reason}`,
              timestamp: Date.now(),
              read: false,
              priority: rec.grade === 'A' ? 'high' : 'medium',
              relatedPlayerId: rec.playerId,
            });
          }
        }
      }
    }

    // === PROCESSAMENTO DE EMPRÉSTIMOS ===
    // E-06: Mesclar novos empréstimos IA antes de processLoans, para que sejam rastreados.
    let updatedActiveLoans = [...(state.activeLoans ?? []), ...(aiResult.newLoans ?? [])];
    if (updatedActiveLoans.length > 0) {
      const loanResult = processLoans(updatedActiveLoans, updatedTeams, newWeek);
      updatedActiveLoans = loanResult.updatedLoans;
      updatedTeams = loanResult.updatedTeams;
      scoutInboxMessages.push(...loanResult.inboxMessages);
    }

    // === PROCESSAMENTO DE GUERRAS DE OFERTAS ===
    let updatedBiddingWars = state.biddingWars;
    if (state.biddingWars.length > 0) {
      const bwResult = processBiddingWars(state.biddingWars, updatedTeams, state.selectedTeam ?? '', newWeek);
      updatedBiddingWars = bwResult.updatedBiddingWars;
      scoutInboxMessages.push(...bwResult.inboxMessages);
    }

    // Build final inbox: all new messages (injury, installment, bonus, scout, AI) + weekly message + existing
    // Limit to last 100 messages to prevent unbounded growth (#52)
    const finalInbox = [
      ...counterOfferMessages,
      ...newInboxMessages,
      ...scoutInboxMessages,
      ...aiResult.inboxMessages,
      inboxToSend,
      ...state.inbox,
    ].slice(0, 100);

    // ============================================================
    // BATCHED POST-WEEK UPDATES (Promise countdown, training,
    // attribute snapshot, press decay, youth intake)
    // Computed before set() to avoid multiple re-renders (#27)
    // ============================================================

    // Youth intake at week 1 — uses same logic as completeYouthIntake (#24/#25)
    if (newWeek === 1 && !youthIntakeCompleted && state.selectedTeam) {
      const teamIdx = updatedTeams.findIndex(t => t.id === state.selectedTeam);
      if (teamIdx !== -1) {
        const team = updatedTeams[teamIdx];
        const youthPlayers = generateYouthIntake(team.youthFacilitiesLevel, 6);
        updatedTeams[teamIdx] = {
          ...team,
          squad: [...team.squad, ...youthPlayers],
          wageBill: recalcWageBill({ ...team, squad: [...team.squad, ...youthPlayers] }),
        };
        youthIntakeCompleted = true;
      }
    }

    // Promise countdown + weekly training + attribute snapshot
    let updatedFanMood = state.fanMood;
    let updatedMediaPressure = state.mediaPressure;

    // Promise countdown + treino + snapshot de atributos para CADA time humano.
    for (const hid of humans) {
      const teamIdx = updatedTeams.findIndex(t => t.id === hid);
      if (teamIdx !== -1) {
        const team = { ...updatedTeams[teamIdx] };

        // Promise countdown — decrement deadlines
        team.squad = team.squad.map(player => {
          const updatedPromises = player.promises.map(promise => {
            if (!promise.fulfilled && promise.deadline > 0) {
              const originalDeadline = promise.originalDeadline ?? promise.deadline;
              return { ...promise, deadline: promise.deadline - 1, originalDeadline };
            }
            return promise;
          });
          return { ...player, promises: updatedPromises };
        });

        // Weekly training — cada humano usa o SEU plano (online); single-player usa o global
        const trainingPlan = trainingByTeam?.[hid] ?? state.trainingPlan;
        if (trainingPlan) {
          const focus = trainingPlan.teamFocus;
          team.squad = team.squad.map(p => {
            if (p.injury?.active) return p;
            const updated = updatePlayerAttributes(p, focus, newWeek, team.facilitiesLevel, team.staffLevel);
            const fatigueLevel = Math.max(0, (updated.cumulativeLoad || 0) * 2 + (100 - updated.fitness));
            updated.fatigueLog = [
              ...(updated.fatigueLog || []),
              {
                week: newWeek,
                day: 0,
                fatigue: Math.min(100, fatigueLevel),
                cumulativeLoad: updated.cumulativeLoad,
                trainingType: focus,
              },
            ].slice(-20);
            return updated;
          });
        }

        // Attribute snapshot
        team.squad = team.squad.map(player => {
          const updated = { ...player };
          updated.attributeHistory = [...(updated.attributeHistory || []), {
            week: newWeek,
            technical: { ...updated.technical },
            mental: { ...updated.mental },
            physical: { ...updated.physical },
            currentAbility: updated.currentAbility,
            potentialAbility: updated.potentialAbility,
            morale: updated.morale,
            form: updated.form,
            fitness: updated.fitness,
          }].slice(-20);
          return updated;
        });

        updatedTeams[teamIdx] = team;
      }
    }

    // Press decay — single-track (torcida/mídia do time em foco). Fase 6 refina por jogador.
    if (state.selectedTeam) {
      const teamForPress = updatedTeams.find(t => t.id === state.selectedTeam);
      if (teamForPress) {
        updatedFanMood = weeklyFanMoodDecay(state.fanMood, teamForPress.leagueForm ?? []);
        updatedMediaPressure = weeklyMediaPressureDecay(state.mediaPressure);
      }
    }

    set({
      currentWeek: newWeek,
      currentSeason: newSeason,
      matches: updatedMatches,
      teams: updatedTeams,
      inbox: finalInbox,
      youthIntakeCompleted,
      counterOffers: updatedCounterOffers,
      incomingTransfers: newIncoming
        ? [...state.incomingTransfers, newIncoming]
        : state.incomingTransfers,
      leagueTable: leagueStandings,
      pendingInstallments: updatedPendingInstallments,
      scoutKnowledge: updatedScoutKnowledge,
      scoutMissions: updatedScoutMissions,
      scoutReports: updatedScoutReports,
      scoutRecommendations: updatedRecommendations,
      activeLoans: updatedActiveLoans,
      biddingWars: updatedBiddingWars,
      completedTransfers: [...state.completedTransfers, ...aiCompletedTransfers],
      fanMood: updatedFanMood,
      mediaPressure: updatedMediaPressure,
      isAdvancing: false,
      freeAgents: updatedFreeAgents,
    });

    // C9: Autosave não-bloqueante após avanço de semana
    const autosaveState = get();
    const userTeam = autosaveState.selectedTeam
      ? autosaveState.teams.find(t => t.id === autosaveState.selectedTeam)
      : undefined;
    // Construir gameState sem funções (extractState espera GameStoreApi, não GameStore)
    const stateKeys = Object.keys(autosaveState).filter(k => typeof (autosaveState as any)[k] !== 'function');
    const gameState: any = {};
    for (const k of stateKeys) gameState[k] = (autosaveState as any)[k];
    autoSave({
      metadata: {
        slotNumber: 0,
        teamName: userTeam?.name ?? 'Unknown',
        currentWeek: newWeek,
        currentSeason: newSeason,
        savedAt: new Date().toISOString(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      },
      gameState,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    }).catch(() => {});

    return inboxByTeam;
    } finally {
      set({ isAdvancing: false });
    }
  },

  startNextSeason: () => {
    const state = get();
    const nextSeason = state.currentSeason + 1;

    // Remover jogadores com contrato expirado (agentes livres)
    const expiredInbox: InboxMessage[] = [];
    const newFreeAgents: Player[] = [...(state.freeAgents || [])];

    let updatedTeams = state.teams.map(team => {
      const expiredPlayers = team.squad.filter(p => p.contractEnd === 0);
      const remainingSquad = team.squad.filter(p => p.contractEnd !== 0);

      if (expiredPlayers.length > 0) {
        for (const p of expiredPlayers) {
          newFreeAgents.push({
            ...p,
            freeAgent: true,
            contractEnd: 52,
            squadStatus: 'Excess',
            seasonGoals: 0,
            seasonAssists: 0,
            lastInjuryWeek: undefined,
            degradedCondition: undefined,
          });
          expiredInbox.push({
            id: `fa_leave_${Date.now()}_${p.id}`,
            type: 'news',
            subject: `🚪 ${getFullName(p)} deixou o clube — contrato expirado`,
            body: `${getFullName(p)} (${p.position}, ${p.age} anos) deixou o ${team.name} após a expiração do contrato. O jogador agora é agente livre.`,
            timestamp: Date.now(),
            read: false,
            priority: 'high',
            relatedPlayerId: p.id,
            relatedTeamId: team.id,
          });
        }
      }

      return {
        ...team,
        points: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        squad: remainingSquad.map(player => ({
          ...player,
          seasonGoals: 0,
          seasonAssists: 0,
          // E-19: Limpar condição degradada pós-lesão para a nova temporada.
          lastInjuryWeek: undefined,
          degradedCondition: undefined,
        })),
      };
    });

    const newMatches = generateWeekMatches(updatedTeams, 1);
    const newStandings = calculateLeagueStandings(updatedTeams, newMatches, 0);

    // Sincronizar leaguePosition real em todos os times para a nova temporada
    const newPositionMap = new Map(newStandings.map(s => [s.teamId, s.position]));
    updatedTeams = updatedTeams.map(t => ({ ...t, leaguePosition: newPositionMap.get(t.id) ?? t.leaguePosition }));

    set({
      currentWeek: 0,
      currentSeason: nextSeason,
      teams: updatedTeams,
      matches: newMatches,
      leagueTable: newStandings,
      seasonSummary: null,
      gameOver: false,
      pressConferences: [],
      incomingTransfers: [],
      transfers: [],
      counterOffers: [],
      deferredTransfers: [],
      inbox: expiredInbox,
      scoutReports: [],
      pendingInstallments: [],
      incomingBonuses: [],
      transferAgreements: [],
      scoutMissions: [],
      shortlist: [],
      scoutRecommendations: [],
      activeLoans: [],
      biddingWars: [],
      fanMood: { value: 50, trend: 'stable', sentiment: 'neutral' },
      mediaPressure: { value: 20, level: 'low' },
      freeAgents: newFreeAgents,
    });
  },
});
