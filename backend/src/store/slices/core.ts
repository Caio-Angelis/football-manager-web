import type { GameStore, Team, InboxMessage } from '../../types/game';
import { generateTeam, generateYouthIntake } from '../../utils/playerGenerator';
import { loadTeamsFromDatabase } from '../../utils/dataLoader';
import {
  simulateFullMatch, simulateMinute, calculatePlayerMatchRatings,
  generateWeekMatches, applyMatchResultToTeams,
} from '../helpers/matchEngine';
import type { MatchStats, MatchEvent } from '../../types/game';
import { calculateLeagueStandings } from '../helpers/league';
import { generateInboxMessage } from '../helpers/inbox';
import { calculatePlayerInjuryRisk, getRiskLevel } from '../helpers/injury';
import { maybeGenerateIncomingTransfer, recalcWageBill } from '../helpers/transfer';
import { processScoutMissions, generateDefaultScouts, getBestScout } from '../helpers/scouting';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

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

    const initialMatches = generateWeekMatches(teams, 1);
    const initialStandings = calculateLeagueStandings(teams, initialMatches, 0);

    set({
      teams,
      matches: initialMatches,
      currentWeek: 0,
      currentSeason: 1,
      selectedTeam: null,
      inbox: [],
      incomingTransfers: [],
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
      saveSlots: [],
      leagueTable: initialStandings,
      scoutKnowledge: {},
      scoutMissions: [],
    });
  },

  updateTeam: (teamId: string, updater: (team: Team) => Team) => {
    const state = get();
    set({
      teams: state.teams.map(t => (t.id === teamId ? updater({ ...t }) : t)),
    });
  },

  advanceWeek: () => {
    const state = get();
    let newWeek = state.currentWeek + 1;
    let newSeason = state.currentSeason;
    let youthReset = state.youthIntakeCompleted;
    const championshipEnded = newWeek > 38;

    if (championshipEnded) {
      // Campeonato encerrado após 38 rodadas - não gerar novas partidas
      const inboxMessage = generateInboxMessage(0, {
        teams: state.teams,
        selectedTeamId: state.selectedTeam,
        hasIncomingTransfer: false,
      });
      let updatedTeams = [...state.teams];

      // Manter partidas existentes sem gerar novas
      const updatedMatches = [...state.matches];
      const leagueStandings = calculateLeagueStandings(updatedTeams, updatedMatches, 38);

      // Atualizar orçamento das equipes
      if (state.selectedTeam) {
        const teamIdx = updatedTeams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx !== -1) {
          const team = updatedTeams[teamIdx];
          const ticketRevenue = (team.reputation / 100) * 0.5;
          const sponsorship = (team.reputation / 100) * 0.3;
          updatedTeams[teamIdx] = {
            ...team,
            budget: Math.max(0, team.budget + ticketRevenue + sponsorship - team.wageBill * (12 / 52)),
          };
        }
      }

      // Processamento de fadiga (sem gerar novas partidas)
      if (state.selectedTeam) {
        const teamIdx = updatedTeams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx !== -1) {
          const team = updatedTeams[teamIdx];
          team.squad = team.squad.map(player => {
            const updated = { ...player };
            const fatigueDecayRate = 0.15;
            const decay = Math.max(0, (updated.cumulativeLoad || 0) - 10) * fatigueDecayRate;
            updated.fitness = Math.max(0, updated.fitness - decay * 0.3);
            updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 5);
            updated.consecutivePhysicalDays = Math.max(0, (updated.consecutivePhysicalDays || 0) - 1);
            return updated;
          });
          updatedTeams[teamIdx] = team;
        }
      }

      set({
        currentWeek: 38,
        currentSeason: newSeason,
        matches: updatedMatches,
        teams: updatedTeams,
        youthIntakeCompleted: false,
        inbox: [...(state.inbox || []), inboxMessage],
        leagueTable: leagueStandings,
      });
      return;
    }

    // Comportamento normal - campeonato em andamento
    let updatedTeams = [...state.teams];

    // Auto-finaliza partida pendente do usuário da rodada anterior (mantém a
    // classificação justa caso ele avance a semana sem jogá-la ao vivo).
    let previousMatches = [...state.matches];
    if (state.selectedTeam) {
      const pendingIdx = previousMatches.findIndex(
        pm => !pm.completed && (pm.homeTeam === state.selectedTeam || pm.awayTeam === state.selectedTeam),
      );
      if (pendingIdx !== -1) {
        const pending = previousMatches[pendingIdx];
        const ph = updatedTeams.find(t => t.id === pending.homeTeam);
        const pa = updatedTeams.find(t => t.id === pending.awayTeam);
        if (ph && pa) {
          let result;
          if (pending.isLive && pending.liveMatchState) {
            // Continua simulação do estado atual até o minuto 90
            let liveState = pending.liveMatchState;
            for (let m = pending.liveMinute + 1; m <= 90; m++) {
              liveState = simulateMinute(ph, pa, liveState, m);
            }
            const events: MatchEvent[] = liveState.events.sort((a, b) => a.minute - b.minute);
            const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
            const stats: MatchStats = {
              ...liveState.stats,
              homePossession: clamp(liveState.stats.homePossession, 25, 75),
              awayPossession: 100 - clamp(liveState.stats.homePossession, 25, 75),
            };
            result = {
              homeGoals: liveState.homeGoals,
              awayGoals: liveState.awayGoals,
              events,
              stats,
              goalDetails: liveState.goalDetails,
            };
          } else {
            // Partida não iniciada — simula do zero
            result = simulateFullMatch(ph, pa);
          }
          updatedTeams = applyMatchResultToTeams(updatedTeams, pending.homeTeam, pending.awayTeam, result);
          // Marcar a partida como finalizada para que entre na classificação
          previousMatches[pendingIdx] = {
            ...pending,
            completed: true,
            isLive: false,
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals,
            events: result.events,
            stats: result.stats,
          };
        }
      }
    }

    // Acumular partidas completadas de semanas anteriores para que a
    // classificação reflita toda a temporada, não apenas a rodada atual.
    const previousCompleted = previousMatches.filter(m => m.completed);
    const newMatches = generateWeekMatches(updatedTeams, newWeek);

    const updatedMatches = [...previousCompleted, ...newMatches.map(m => {
      const match = { ...m };
      const isUserMatch = m.homeTeam === state.selectedTeam || m.awayTeam === state.selectedTeam;
      if (!isUserMatch) {
        const result = simulateFullMatch(
          updatedTeams.find(t => t.id === m.homeTeam)!,
          updatedTeams.find(t => t.id === m.awayTeam)!,
        );
        match.homeGoals = result.homeGoals;
        match.awayGoals = result.awayGoals;
        match.completed = true;
        match.events = result.events;
        match.stats = result.stats;
        match.playerRatings = result.playerRatings;
        match.bestPlayer = result.bestPlayer;
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

    if (state.trainingPlan) {
      get().applyWeeklyTraining();
    }

    if (state.selectedTeam) {
      const teamIdx = updatedTeams.findIndex(t => t.id === state.selectedTeam);
      if (teamIdx !== -1) {
        const team = updatedTeams[teamIdx];
        const ticketRevenue = (team.reputation / 100) * 0.5;
        const sponsorship = (team.reputation / 100) * 0.3;
        updatedTeams[teamIdx] = {
          ...team,
          budget: Math.max(0, team.budget + ticketRevenue + sponsorship - team.wageBill * (12 / 52)),
        };
      }
    }

    // Generate incoming transfer BEFORE inbox message so context can be passed
    const newIncoming = state.selectedTeam
      ? maybeGenerateIncomingTransfer(updatedTeams, state.selectedTeam)
      : null;

    // Generate context-aware inbox message with proper relatedPlayerId
    const inboxMessage = generateInboxMessage(newWeek, {
      teams: updatedTeams,
      selectedTeamId: state.selectedTeam,
      hasIncomingTransfer: !!newIncoming,
      incomingTransferPlayerId: newIncoming?.playerId,
    });

    // Apply injury to the player if the message is an injury type
    if (inboxMessage.type === 'injury' && inboxMessage.relatedPlayerId && state.selectedTeam) {
      const teamIdx = updatedTeams.findIndex(t => t.id === state.selectedTeam);
      if (teamIdx !== -1) {
        const team = updatedTeams[teamIdx];
        const injuryDays = 7 + Math.floor(Math.random() * 28);
        updatedTeams[teamIdx] = {
          ...team,
          squad: team.squad.map(p =>
            p.id === inboxMessage.relatedPlayerId
              ? { ...p, injury: { active: true, days: injuryDays }, lastInjuryWeek: newWeek }
              : p
          ),
        };
      }
    }

    let inboxToSend = inboxMessage;

    // ============================================================
    // PROCESSAMENTO DE FADIGA E RECOMENDAÇÕES (AVANCE WEEK)
    // ============================================================
    const newInboxMessages: InboxMessage[] = [];

    if (state.selectedTeam) {
      const teamIdx = updatedTeams.findIndex(t => t.id === state.selectedTeam);
      if (teamIdx !== -1) {
        const team = updatedTeams[teamIdx];

        // 1. Aplicar decaimento de fadiga
        team.squad = team.squad.map(player => {
          const updated = { ...player };
          const fatigueDecayRate = 0.15;
          const decay = Math.max(0, (updated.cumulativeLoad || 0) - 10) * fatigueDecayRate;
          updated.fitness = Math.max(0, updated.fitness - decay * 0.3);
          updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 5);
          updated.consecutivePhysicalDays = Math.max(0, (updated.consecutivePhysicalDays || 0) - 1);
          return updated;
        });
        updatedTeams[teamIdx] = team;

        // 2. Atualizar condições degradadas
        team.squad = team.squad.map(player => {
          const updated = { ...player };
          if (updated.degradedCondition && updated.lastInjuryWeek) {
            const weeksRecovering = newWeek - updated.lastInjuryWeek;
            if (weeksRecovering > 4 && updated.degradedCondition === 'minimal') {
              updated.degradedCondition = 'low';
            } else if (weeksRecovering > 2 && updated.degradedCondition === 'low') {
              updated.degradedCondition = 'moderate';
            } else if (weeksRecovering >= 1 && updated.degradedCondition === 'moderate') {
              updated.degradedCondition = 'good';
            } else if (weeksRecovering > 8) {
              updated.degradedCondition = undefined;
            }
          }
          return updated;
        });
        updatedTeams[teamIdx] = team;

        // 3. Verificar jogadores em risco e gerar recomendações
        const injuryRecommendations: InboxMessage[] = [];
        const substitutionRecommendations: InboxMessage[] = [];

        team.squad.forEach(player => {
          const risk = calculatePlayerInjuryRisk(player, team.facilitiesLevel, team.staffLevel, newWeek);
          const riskLevel = getRiskLevel(risk);

          if (riskLevel === 'high' || riskLevel === 'critical') {
            if (riskLevel === 'critical') {
              substitutionRecommendations.push({
                id: `rec_sub_${Date.now()}_${player.id}`,
                type: 'suggestion',
                subject: `⚠️ URGENTE: ${player.name} em Risco Crítico`,
                body: `${player.name} está com risco de lesão CRÍTICO (${risk}%). Recomendo substituição imediata nos treinos e possivelmente na próxima partida.`,
                timestamp: Date.now(),
                read: false,
                priority: 'high',
                relatedPlayerId: player.id,
              });
            } else {
              injuryRecommendations.push({
                id: `rec_rest_${Date.now()}_${player.id}`,
                type: 'suggestion',
                subject: `🟠 ${player.name} — Risco Alto de Lesão`,
                body: `${player.name} apresenta risco alto de lesão (${risk}%). Sugiro descanso ou treino leve. Verificar no painel de Treino.`,
                timestamp: Date.now(),
                read: false,
                priority: 'medium',
                relatedPlayerId: player.id,
              });
            }
          }
        });

        // 5. Adicionar recomendações ao inbox
        updatedTeams[teamIdx] = team;
        newInboxMessages.push(...injuryRecommendations, ...substitutionRecommendations);
      }
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

          const updatedPayments = inst.payments.map(p => {
            if (p.paid || p.dueWeek > newWeek) return p;

            // Auto-pay if budget allows
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
          const anyUnpaidOverdue = updatedPayments.some(p => !p.paid && p.dueWeek <= newWeek);

          return {
            ...inst,
            payments: updatedPayments,
            status: allPaid ? 'completed' as const : anyUnpaidOverdue ? 'defaulted' as const : inst.status,
          };
        });

        userTeam2.wageBill = recalcWageBill(userTeam2);
        updatedTeams[teamIdx2] = userTeam2;
      }
    }

    // Auto-check bonuses
    if (state.incomingBonuses.length > 0) {
      const updatedBonuses = state.incomingBonuses.map(b => {
        if (b.triggered || b.claimed) return b;
        const chance = Math.random();
        if (b.type === 'goals' && chance > 0.7) {
          return { ...b, triggered: true, triggeredWeek: newWeek };
        } else if (b.type === 'appearances' && chance > 0.5) {
          return { ...b, triggered: true, triggeredWeek: newWeek };
        } else if (b.type === 'assists' && chance > 0.8) {
          return { ...b, triggered: true, triggeredWeek: newWeek };
        } else if (b.type === 'titles' && chance > 0.9) {
          return { ...b, triggered: true, triggeredWeek: newWeek };
        } else if (b.type === 'performance' && chance > 0.6) {
          return { ...b, triggered: true, triggeredWeek: newWeek };
        }
        return b;
      });

      // Triggered bonus notifications
      const newlyTriggered = updatedBonuses.filter(b => b.triggered && !state.incomingBonuses.find(old => old === b)?.triggered);
      newlyTriggered.forEach(b => {
        newInboxMessages.push({
          id: `bonus_triggered_${Date.now()}_${b.playerId}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'transfer',
          subject: '💰 Bónus Ativado!',
          body: `Um bónus de R$ ${b.bonusAmount}K foi ativado. Vá em Transferências > Bónus para reclamá-lo.`,
          timestamp: Date.now(),
          read: false,
          priority: 'medium',
        });
      });

      set({ incomingBonuses: updatedBonuses });
    }

    // ============================================================
    // ATUALIZAR TABELA DE CLASSIFICAÇÃO (P1.1)
    // ============================================================
    const leagueStandings = calculateLeagueStandings(updatedTeams, updatedMatches, newWeek);

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

      // Liberar olheiros cujas missões terminaram
      if (state.selectedTeam) {
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

    // Build final inbox: all new messages (injury, installment, bonus, scout) + weekly message + existing
    const finalInbox = [
      ...newInboxMessages,
      ...scoutInboxMessages,
      inboxToSend,
      ...state.inbox,
    ];

    set({
      currentWeek: newWeek,
      currentSeason: newSeason,
      matches: updatedMatches,
      teams: updatedTeams,
      inbox: finalInbox,
      youthIntakeCompleted,
      incomingTransfers: newIncoming
        ? [...state.incomingTransfers, newIncoming]
        : state.incomingTransfers,
      leagueTable: leagueStandings,
      pendingInstallments: updatedPendingInstallments,
      scoutKnowledge: updatedScoutKnowledge,
      scoutMissions: updatedScoutMissions,
      scoutReports: updatedScoutReports,
    });

    get().updatePromiseCountdown();
    get().captureWeeklyAttributeSnapshot();
  },
});
