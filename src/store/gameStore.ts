import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  GameStore, Player, Team, Match, MatchEvent, MatchStats,
  InboxMessage, IncomingTransfer, ScoutReport, WeeklyTrainingPlan, CounterOffer,
  InstallmentClause, PlayerBonus, TransferAgreement, ContractClause, InstallmentPayment,
  InjuryReport, BoardReply, FinancialReport,
  PreventionSession, FatigueLogEntry, Recommendation,
  SocialTree, SocialNode, Promise as PlayerPromise,
  SaveSlot, SaveSlotMetadata,
} from '../types/game';
import { generateTeam, generateYouthIntake } from '../utils/playerGenerator';

// ============================================================
// CÁLCULO DE FORÇA DO TIME
// ============================================================

function getTacticalBonus(team: Team): number {
  let bonus = 0;
  if (team.tactic === 'attacking') bonus += 0.08;
  if (team.tactic === 'defensive') bonus += 0.05;
  if (team.teamMentality === 'offensive' || team.teamMentality === 'very offensive') bonus += 0.05;
  if (team.teamMentality === 'defensive' || team.teamMentality === 'very defensive') bonus += 0.04;

  const counterPress = team.afterLosingPossession === 'counterPress'
    || (!team.afterLosingPossession && team.counterPress);
  const counterAttack = team.afterGainingPossession === 'counterAttack';
  const highPress = team.pressIntensity === 'high'
    || (!team.pressIntensity && team.highPress);
  const highLine = team.engagementLine === 'high' || team.defensiveLine === 'high'
    || (!team.engagementLine && team.highLine);
  const aggressiveTackling = team.tacklingStyle === 'aggressive'
    || (!team.tacklingStyle && team.aggressiveTackling);

  if (highPress) bonus += 0.03;
  if (counterPress) bonus += 0.03;
  if (counterAttack) bonus += 0.04;
  if (highLine) bonus += 0.02;
  if (aggressiveTackling) bonus += 0.02;
  if (team.trapOffside) bonus += 0.01;
  if (team.workBallIntoBox) bonus += 0.02;
  if (team.tempo === 'fast') bonus += 0.03;
  if (team.passingStyle === 'short') bonus += 0.02;
  return bonus;
}

function calculateTeamStrength(team: Team): number {
  const starting11 = team.squad.slice(0, 11);
  let totalStrength = 0;

  starting11.forEach(player => {
    let sum = 0;
    let count = 0;

    if (player.technical) {
      [player.technical.passing, player.technical.technique, player.technical.finishing,
        player.technical.dribbling, player.technical.crossing].forEach(v => {
        if (v) { sum += v * 4; count++; }
      });
    }
    if (player.mental) {
      [player.mental.vision, player.mental.decisions, player.mental.composure,
        player.mental.anticipation, player.mental.positioning].forEach(v => {
        if (v) { sum += v * 5; count++; }
      });
    }
    if (player.physical) {
      [player.physical.speed, player.physical.stamina, player.physical.strength,
        player.physical.agility, player.physical.acceleration].forEach(v => {
        if (v) { sum += v * 3; count++; }
      });
    }

    const playerStrength = (player.currentAbility * 0.6 + (sum / Math.max(count, 1)) * 5.5) * 1.2;
    totalStrength += playerStrength * (player.form / 100) * (player.fitness / 100);
  });

  return (totalStrength / Math.max(starting11.length, 1)) * (1 + getTacticalBonus(team));
}

function getPossessionBias(home: Team, away: Team): number {
  const homePass = home.squad.slice(0, 11).reduce((s, p) => s + (p.technical?.passing ?? 10), 0);
  const awayPass = away.squad.slice(0, 11).reduce((s, p) => s + (p.technical?.passing ?? 10), 0);
  const homeTactic = home.passingStyle === 'short' ? 0.05 : home.passingStyle === 'direct' ? -0.03 : 0;
  const awayTactic = away.passingStyle === 'short' ? 0.05 : away.passingStyle === 'direct' ? -0.03 : 0;
  const total = homePass + awayPass + 1;
  return (homePass / total) + homeTactic - awayTactic + 0.02;
}

// ============================================================
// MOTOR DE PARTIDA
// ============================================================

function simulateMatchResult(homeTeam: Team, awayTeam: Team, homeBoost = 0, awayBoost = 0): {
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  stats: MatchStats;
} {
  const homeStrength = calculateTeamStrength(homeTeam) * (1 + homeBoost);
  const awayStrength = calculateTeamStrength(awayTeam) * (1 + awayBoost);
  const homeAdvantage = 0.12;

  const homeGoalChance = (homeStrength + homeAdvantage) / (homeStrength + awayStrength + homeAdvantage);
  const awayGoalChance = 1 - homeGoalChance;

  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeShotsOnTarget = 0;
  let awayShotsOnTarget = 0;
  let homePasses = 0;
  let awayPasses = 0;

  const homePossession = Math.min(0.75, Math.max(0.25, getPossessionBias(homeTeam, awayTeam)));

  for (let minute = 1; minute <= 90; minute++) {
    const eventProbability = 0.05 + Math.random() * 0.1;

    if (Math.random() < eventProbability) {
      if (Math.random() < homePossession) {
        homeShots += Math.floor(Math.random() * 3) + 1;
        homePasses += Math.floor(Math.random() * 15) + 5;

        if (Math.random() < 0.15 * homeGoalChance) {
          homeShotsOnTarget++;
          if (Math.random() < 0.4) {
            homeGoals++;
            const scorer = homeTeam.squad[Math.floor(Math.random() * Math.min(11, homeTeam.squad.length))];
            events.push({
              minute,
              type: 'goal',
              team: 'home',
              player: scorer?.name,
              description: `GOOOL! ${scorer?.name ?? homeTeam.name} marca!`,
            });
          } else {
            events.push({ minute, type: 'shot', team: 'home', description: 'Chute perigoso' });
          }
        }
      } else {
        awayShots += Math.floor(Math.random() * 3) + 1;
        awayPasses += Math.floor(Math.random() * 15) + 5;

        if (Math.random() < 0.15 * awayGoalChance) {
          awayShotsOnTarget++;
          if (Math.random() < 0.4) {
            awayGoals++;
            const scorer = awayTeam.squad[Math.floor(Math.random() * Math.min(11, awayTeam.squad.length))];
            events.push({
              minute,
              type: 'goal',
              team: 'away',
              player: scorer?.name,
              description: `GOOOL! ${scorer?.name ?? awayTeam.name} marca!`,
            });
          } else {
            events.push({ minute, type: 'shot', team: 'away', description: 'Chute perigoso' });
          }
        }
      }

      if (Math.random() < 0.05) {
        events.push({
          minute,
          type: 'save',
          team: Math.random() < 0.5 ? 'away' : 'home',
          description: 'Grande defesa!',
        });
      }
      if (Math.random() < 0.06) {
        events.push({
          minute,
          type: 'corner',
          team: Math.random() < 0.5 ? 'home' : 'away',
          description: 'Escanteio',
        });
      }
      if (Math.random() < 0.04) {
        events.push({
          minute,
          type: 'foul',
          team: Math.random() < 0.5 ? 'home' : 'away',
          description: 'Falta',
        });
      }
    }
  }

  const stats: MatchStats = {
    homeXG: Math.round(homeGoals * (0.8 + Math.random() * 0.4) * 100) / 100,
    awayXG: Math.round(awayGoals * (0.8 + Math.random() * 0.4) * 100) / 100,
    homePossession: Math.round(homePossession * 100),
    awayPossession: 100 - Math.round(homePossession * 100),
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homePasses,
    awayPasses,
    homePassAccuracy: Math.round(70 + Math.random() * 20),
    awayPassAccuracy: Math.round(70 + Math.random() * 20),
  };

  return { homeGoals, awayGoals, events, stats };
}

function generateWeekMatches(teams: Team[], week: number): Match[] {
  const matches: Match[] = [];
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      const day = (i / 2) % 5 + 1;
      matches.push({
        homeTeam: shuffled[i].id,
        awayTeam: shuffled[i + 1].id,
        homeGoals: 0,
        awayGoals: 0,
        date: `Semana ${week} - Dia ${day}`,
        completed: false,
        isLive: false,
        liveMinute: 0,
        liveEvents: [],
        liveStats: {
          homeXG: 0,
          awayXG: 0,
          homePossession: 50,
          awayPossession: 50,
          homeShots: 0,
          awayShots: 0,
          homeShotsOnTarget: 0,
          awayShotsOnTarget: 0,
          homePasses: 0,
          awayPasses: 0,
          homePassAccuracy: 70,
          awayPassAccuracy: 70,
        },
        homeSubstitutions: 0,
        awaySubstitutions: 0,
        events: [],
        stats: undefined,
      });
    }
  }

  return matches;
}

function generateInboxMessage(week: number): InboxMessage {
  const types: InboxMessage['type'][] = ['transfer', 'injury', 'suggestion', 'training', 'financial', 'board', 'youth'];
  const type = types[Math.floor(Math.random() * types.length)];

  const messages = {
    transfer: { subject: `Semana ${week}: Proposta de Transferência Recebida`, body: 'Um clube está interessado em um jogador do seu plantel.' },
    injury: { subject: 'Relatório Médico - Lesão', body: 'Um jogador sofreu uma lesão durante o treino.' },
    suggestion: { subject: 'Recomendação de Treino', body: 'O auxiliar técnico sugere foco em treino físico esta semana.' },
    training: { subject: 'Relatório de Treino', body: 'Os jogadores responderam bem ao treino físico.' },
    financial: { subject: 'Relatório Financeiro', body: 'Os gastos da equipe estão dentro do orçamento.' },
    board: { subject: 'Comunicado da Diretoria', body: 'A diretoria faz um comunicado sobre as expectativas do clube.' },
    youth: { subject: 'Jovem Promessa Identificada', body: 'Um jovem talento foi identificado nas categorias de base. Convocar para o plantel?' },
  };

  const msg = messages[type];

  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    subject: msg.subject,
    body: msg.body,
    priority: Math.random() < 0.3 ? 'high' : Math.random() < 0.6 ? 'medium' : 'low',
    timestamp: Date.now(),
    read: false,
  };
}

// ============================================================
// CÁLCULO DE RISCO DE LESÃO MELHORADO
// ============================================================

function calculateFatigueLevel(player: Player, currentWeek: number): number {
  const last3Days = (player.fatigueLog || []).filter(
    (entry) => entry.week === currentWeek && Math.abs(entry.day - player.lastTrainingDay) <= 3
  );
  const avgFatigue = last3Days.reduce((sum, entry) => sum + entry.fatigue, 0) / Math.max(last3Days.length, 1);
  return avgFatigue;
}

function calculatePlayerInjuryRisk(player: Player, facilitiesLevel: number, staffLevel: number, currentWeek: number): number {
  let risk = 0;
  
  // Base risk from injuryProneness (1-10 maps to 0-30%)
  risk += player.hidden.injuryProneness * 3;
  
  // Consecutive physical training days increase risk exponentially
  const consecutiveBonus = Math.pow(1.5, player.consecutivePhysicalDays) * 5;
  risk += consecutiveBonus;
  
  // Cumulative load penalty
  const loadPenalty = Math.max(0, player.cumulativeLoad - 5) * 3;
  risk += loadPenalty;
  
  // Low fitness increases risk
  if (player.fitness < 50) {
    risk += (50 - player.fitness) * 0.3;
  }
  
  // Recovery needed penalty
  if (player.recoveryNeeded) {
    risk += 15;
  }
  
  // Active injury increases risk significantly
  if (player.injury?.active) {
    risk += 40;
  }
  
  // Previous injuries increase recurrence risk (especially if recent)
  const previousInjuries = player.injuryHistory?.filter(ih => !ih.fullyRecovered).length || 0;
  risk += previousInjuries * 10;
  
  // Fatigue accumulation risk (new)
  const fatigueLevel = calculateFatigueLevel(player, currentWeek);
  if (fatigueLevel > 60) {
    risk += 15;
  } else if (fatigueLevel > 40) {
    risk += 8;
  }
  
  // Degraded condition penalty (post-injury)
  if (player.degradedCondition) {
    if (player.degradedCondition === 'minimal') risk += 20;
    else if (player.degradedCondition === 'low') risk += 12;
    else if (player.degradedCondition === 'moderate') risk += 6;
  }
  
  // Facilities and staff reduce risk
  const facilityReduction = Math.min(20, facilitiesLevel * 2);
  const staffReduction = Math.min(15, staffLevel * 1.5);
  risk = Math.max(0, risk - facilityReduction - staffReduction);
  
  return Math.min(100, risk);
}

function getRiskLevel(risk: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (risk >= 80) return 'critical';
  if (risk >= 60) return 'high';
  if (risk >= 30) return 'moderate';
  return 'low';
}

function updatePlayerAttributes(player: Player, trainingType: string): Player {
  const updated = { ...player };
  const improvement = Math.random() * 0.8 + 0.2;

  if (trainingType === 'physical') {
    if (updated.physical) {
      updated.physical.stamina = Math.min(20, (updated.physical.stamina ?? 0) + improvement);
      updated.physical.speed = Math.min(20, (updated.physical.speed ?? 0) + improvement * 0.5);
    }
    updated.fitness = Math.max(0, updated.fitness - 8);
    updated.consecutivePhysicalDays = (updated.consecutivePhysicalDays || 0) + 1;
    updated.cumulativeLoad = (updated.cumulativeLoad || 0) + 8;
    updated.recoveryNeeded = updated.fitness < 30;
    
    // Injury probability now based on calculated risk
    const risk = 0.05 + (updated.hidden.injuryProneness * 0.01);
    const loadPenalty = (updated.cumulativeLoad || 0) * 0.005;
    const fitnessPenalty = updated.fitness < 40 ? 0.03 : 0;
    
    if (Math.random() < risk + loadPenalty + fitnessPenalty) {
      const days = updated.fitness < 40 ? 14 + Math.floor(Math.random() * 14) : 7 + Math.floor(Math.random() * 10);
      updated.injury = { active: true, days };
      
      // Record injury history
      updated.injuryHistory = [...(updated.injuryHistory || [])];
    }
  } else if (trainingType === 'technical') {
    if (updated.technical) {
      updated.technical.passing = Math.min(20, updated.technical.passing + improvement * 0.8);
      updated.technical.technique = Math.min(20, updated.technical.technique + improvement * 0.8);
      updated.technical.finishing = Math.min(20, updated.technical.finishing + improvement * 0.5);
    }
    updated.fitness = Math.max(0, updated.fitness - 3);
    updated.consecutivePhysicalDays = 0; // Reset consecutive physical days
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 4);
  } else if (trainingType === 'cohesion') {
    updated.morale = Math.min(100, updated.morale + 5);
    updated.fitness = Math.max(0, updated.fitness - 2);
    updated.consecutivePhysicalDays = 0;
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 2);
  } else if (trainingType === 'medical' || trainingType === 'recovery') {
    // Recovery sessions
    updated.fitness = Math.min(100, updated.fitness + 10);
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 10);
    updated.consecutivePhysicalDays = 0;
    updated.recoveryNeeded = false;
    
    // If injured, reduce injury duration
    if (updated.injury?.active) {
      updated.injury.days = Math.max(0, updated.injury.days - 2);
    }
  } else if (trainingType === 'light') {
    // Light recovery training
    updated.fitness = Math.min(100, updated.fitness + 3);
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 5);
    updated.consecutivePhysicalDays = 0;
  }

  return updated;
}

function applyMatchResultToTeams(
  teams: Team[],
  homeId: string,
  awayId: string,
  result: ReturnType<typeof simulateMatchResult>,
): Team[] {
  const updated = [...teams];
  const homeIdx = updated.findIndex(t => t.id === homeId);
  const awayIdx = updated.findIndex(t => t.id === awayId);
  if (homeIdx === -1 || awayIdx === -1) return teams;

  const homeTeam = { ...updated[homeIdx] };
  const awayTeam = { ...updated[awayIdx] };

  homeTeam.played++;
  awayTeam.played++;
  homeTeam.goalsFor += result.homeGoals;
  awayTeam.goalsFor += result.awayGoals;
  homeTeam.goalsAgainst += result.awayGoals;
  awayTeam.goalsAgainst += result.homeGoals;

  if (result.homeGoals > result.awayGoals) {
    homeTeam.points += 3;
    homeTeam.won++;
    awayTeam.lost++;
  } else if (result.homeGoals < result.awayGoals) {
    awayTeam.points += 3;
    awayTeam.won++;
    homeTeam.lost++;
  } else {
    homeTeam.points += 1;
    awayTeam.points += 1;
    homeTeam.drawn++;
    awayTeam.drawn++;
  }

  updated[homeIdx] = homeTeam;
  updated[awayIdx] = awayTeam;
  return updated;
}

function generateScoutReport(player: Player): ScoutReport {
  const reliability = Math.min(5, Math.floor(Math.random() * 3) + 2);
  const fuzz = (val: number) => {
    const range = Math.max(2, 6 - reliability);
    return [Math.max(1, val - range), Math.min(20, val + range)] as [number, number];
  };

  return {
    playerId: player.id,
    playerName: `${player.name} ${player.surname}`,
    position: player.position,
    age: player.age,
    nationality: player.nationality,
    currentAbility: player.currentAbility,
    potentialAbility: player.potentialAbility,
    attributesRange: {
      passing: fuzz(player.technical.passing),
      technique: fuzz(player.technical.technique),
      finishing: fuzz(player.technical.finishing),
      speed: fuzz(player.physical.speed ?? 10),
      stamina: fuzz(player.physical.stamina ?? 10),
    },
    stars: Math.min(5, Math.ceil(player.potentialAbility / 40)),
    reliability,
  };
}

function maybeGenerateIncomingTransfer(teams: Team[], selectedTeamId: string): IncomingTransfer | null {
  if (Math.random() > 0.35) return null;

  const userTeam = teams.find(t => t.id === selectedTeamId);
  if (!userTeam || userTeam.squad.length === 0) return null;

  const player = userTeam.squad[Math.floor(Math.random() * userTeam.squad.length)];
  const buyerTeams = teams.filter(t => t.id !== selectedTeamId);
  const buyer = buyerTeams[Math.floor(Math.random() * buyerTeams.length)];
  if (!buyer) return null;

  const offerPrice = Math.round(player.marketValue * (0.8 + Math.random() * 0.4) * 10) / 10;
  let paymentMethod: 'cash' | 'installments' = Math.random() < 0.6 ? 'cash' : 'installments';
  let installmentClause: InstallmentClause | undefined;
  let bonuses: PlayerBonus[] | undefined;

  if (paymentMethod === 'installments' && offerPrice > 10) {
    // Generate installment clause for expensive transfers
    const installmentCount = Math.min(6, Math.max(3, Math.floor(offerPrice / 5) + 1));
    const installmentAmount = Math.round(offerPrice / installmentCount * 10) / 10;

    installmentClause = {
      totalAmount: offerPrice,
      installmentCount,
      installmentAmount,
      payments: [],
      status: 'active',
    };

    for (let i = 0; i < installmentCount; i++) {
      const amount = i === 0 ? Math.round((offerPrice - installmentAmount * (installmentCount - 1)) * 10) / 10 : installmentAmount;
      installmentClause.payments.push({
        installmentNumber: i + 1,
        amount,
        dueWeek: 1 + i * 4, // weeks from start
        paid: false,
      });
    }
  }

  // Generate random bonuses
  if (Math.random() < 0.5) {
    bonuses = [];
    const bonusTypes: PlayerBonus['type'][] = ['goals', 'appearances', 'assists', 'titles'];
    for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
      bonuses.push({
        playerId: player.id,
        type: bonusTypes[Math.floor(Math.random() * bonusTypes.length)],
        threshold: Math.floor(Math.random() * 30) + 10,
        bonusAmount: Math.floor(Math.random() * 200) + 50,
        triggered: false,
      });
    }
  }

  return {
    playerId: player.id,
    offerPrice,
    fromTeam: buyer.id,
    contractProposal: {
      salary: Math.round(player.salary * 1.1),
      duration: 52 + Math.floor(Math.random() * 104),
      clause: Math.round(player.marketValue * 1.5 * 10) / 10,
    },
    paymentMethod,
    installmentClause,
    bonuses,
  };
}

function recalcWageBill(team: Team): number {
  return team.squad.reduce((sum, p) => sum + p.salary, 0) / 1000;
}

// ============================================================
// STORE
// ============================================================

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      teams: [],
      transfers: [],
      incomingTransfers: [],
      counterOffers: [],
      inbox: [],
      trainingPlan: null,
      youthIntakeCompleted: false,
      scoutReports: [],
      pendingInstallments: [],
      incomingBonuses: [],
      // Acordos contratuais (Item 7.10)
      transferAgreements: [],
      // Item 9.8.3 - Diretoria: Responder
      boardReplies: [],
      boardSatisfaction: 50,
      // Item 9.8.4 - Financeiro: Ver Relatório
      financialReports: [],
      // Prevenção de lesões
      injuryHistory: [],
      preventionSessions: [],
      fatigueLog: [],
      recommendations: [],
      degradedConditions: [],
      socialTree: null,

      deselectTeam: () => {
        // Limpar localStorage para evitar estado corrompido ao recarregar
        try {
          localStorage.removeItem('fm-game-storage-v3');
          localStorage.removeItem('fm-save-slots-v3');
        } catch (e) {
          console.error('Erro ao limpar localStorage no deselectTeam:', e);
        }
        set({ selectedTeam: null });
      },
      selectTeam: (teamId: string) => set({ selectedTeam: teamId }),

      initGame: () => {
        const teams: Team[] = [];
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

        set({
          teams,
          matches: generateWeekMatches(teams, 1),
          currentWeek: 0,
          currentSeason: 1,
          selectedTeam: null,
          inbox: [],
          incomingTransfers: [],
          scoutReports: [],
          youthIntakeCompleted: false,
          trainingPlan: null,
          transferAgreements: [],
          boardReplies: [],
          boardSatisfaction: 50,
          financialReports: [],
          injuryHistory: [],
          preventionSessions: [],
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

        if (newWeek > 38) {
          newWeek = 1;
          newSeason += 1;
          youthReset = false;
        }

        const newMatches = generateWeekMatches(state.teams, newWeek);
        let updatedTeams = [...state.teams];

        const updatedMatches = newMatches.map(m => {
          const match = { ...m };
          if (m.homeTeam !== state.selectedTeam && m.awayTeam !== state.selectedTeam) {
            const result = simulateMatchResult(
              updatedTeams.find(t => t.id === m.homeTeam)!,
              updatedTeams.find(t => t.id === m.awayTeam)!,
            );
            match.homeGoals = result.homeGoals;
            match.awayGoals = result.awayGoals;
            match.completed = true;
            match.events = result.events;
            match.stats = result.stats;
            updatedTeams = applyMatchResultToTeams(updatedTeams, m.homeTeam, m.awayTeam, result);
          }
          return match;
        });

        const inboxMessage = generateInboxMessage(newWeek);
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
              budget: Math.max(0, team.budget + ticketRevenue + sponsorship - team.wageBill * 0.01),
            };
          }
        }

        const newIncoming = state.selectedTeam
          ? maybeGenerateIncomingTransfer(updatedTeams, state.selectedTeam)
          : null;

        // Attach relatedPlayerId to transfer inbox messages so actions work
        let inboxToSend = inboxMessage;
        if (newIncoming && inboxMessage.type === 'transfer') {
          inboxToSend = { ...inboxMessage, relatedPlayerId: newIncoming.playerId };
        }

        // ============================================================
        // PROCESSAMENTO DE FADIGA E RECOMENDAÇÕES (AVANCE WEEK)
        // ============================================================
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
            set({
              teams: updatedTeams,
              inbox: [
                ...injuryRecommendations,
                ...substitutionRecommendations,
                inboxToSend,
                ...state.inbox,
              ],
            });
          }
        }

        set({
          currentWeek: newWeek,
          currentSeason: newSeason,
          matches: updatedMatches,
          teams: updatedTeams,
          inbox: [inboxToSend, ...state.inbox],
          youthIntakeCompleted,
          incomingTransfers: newIncoming
            ? [...state.incomingTransfers, newIncoming]
            : state.incomingTransfers,
        });

        get().updatePromiseCountdown();
        get().captureWeeklyAttributeSnapshot();
      },

      simulateMatch: (matchIndex: number) => {
        const state = get();
        const match = state.matches[matchIndex];
        if (!match || match.completed) return;

        // Start live match instead of finishing immediately
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = {
          ...match,
          isLive: true,
          liveMinute: 1,
          liveEvents: [],
          liveStats: {
            homeXG: 0,
            awayXG: 0,
            homePossession: Math.round(match.liveStats?.homePossession || 50),
            awayPossession: 100 - (match.liveStats?.homePossession || 50),
            homeShots: 0,
            awayShots: 0,
            homeShotsOnTarget: 0,
            awayShotsOnTarget: 0,
            homePasses: 0,
            awayPasses: 0,
            homePassAccuracy: 70,
            awayPassAccuracy: 70,
          },
        };

        set({ matches: updatedMatches });
      },

      generateLiveMatchMinute: (matchIndex: number) => {
        const state = get();
        const match = state.matches[matchIndex];
        if (!match || !match.isLive || match.liveMinute >= 90) {
          // Finish the match if it hasn't been completed
          if (match && !match.completed && match.isLive) {
            const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
            const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;
            const result = simulateMatchResult(homeTeam, awayTeam);

            const updatedMatches = [...state.matches];
            updatedMatches[matchIndex] = {
              ...match,
              completed: true,
              homeGoals: match.homeGoals + result.homeGoals,
              awayGoals: match.awayGoals + result.awayGoals,
              isLive: false,
              events: [...(match.events || []), ...match.liveEvents, ...result.events],
              stats: result.stats,
            };
            const updatedTeams = applyMatchResultToTeams(state.teams, match.homeTeam, match.awayTeam, result);
            set({ matches: updatedMatches, teams: updatedTeams });
          }
          return;
        }

        const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
        const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;

        // Simulate one minute of live play
        const minute = match.liveMinute + 1;
        const homePossession = (match.liveStats?.homePossession || 50) / 100;
        const homeGoalChance = (homeTeam.reputation / 100) / (homeTeam.reputation / 100 + awayTeam.reputation / 100 + 0.12);
        const awayGoalChance = 1 - homeGoalChance;

        const newEvents = [...(match.liveEvents || [])];
        const newStats = { ...match.liveStats };

        // Generate events for this minute
        if (Math.random() < 0.05) {
          if (Math.random() < homePossession) {
            newStats.homeShots += Math.floor(Math.random() * 3) + 1;
            newStats.homePasses += Math.floor(Math.random() * 15) + 5;

            if (Math.random() < 0.15 * homeGoalChance) {
              newStats.homeShotsOnTarget++;
              if (Math.random() < 0.3) {
                const scorer = homeTeam.squad[Math.floor(Math.random() * Math.min(11, homeTeam.squad.length))];
                match.homeGoals++;
                newEvents.push({
                  minute,
                  type: 'goal',
                  team: 'home',
                  player: scorer?.name,
                  description: `GOOOL! ${scorer?.name ?? homeTeam.name} marca!`,
                });
              } else {
                newEvents.push({ minute, type: 'shot', team: 'home', description: 'Chute perigoso' });
              }
            }
          } else {
            newStats.awayShots += Math.floor(Math.random() * 3) + 1;
            newStats.awayPasses += Math.floor(Math.random() * 15) + 5;

            if (Math.random() < 0.15 * awayGoalChance) {
              newStats.awayShotsOnTarget++;
              if (Math.random() < 0.3) {
                const scorer = awayTeam.squad[Math.floor(Math.random() * Math.min(11, awayTeam.squad.length))];
                match.awayGoals++;
                newEvents.push({
                  minute,
                  type: 'goal',
                  team: 'away',
                  player: scorer?.name,
                  description: `GOOOL! ${scorer?.name ?? awayTeam.name} marca!`,
                });
              } else {
                newEvents.push({ minute, type: 'shot', team: 'away', description: 'Chute perigoso' });
              }
            }
          }
        }

        if (Math.random() < 0.05) {
          newEvents.push({
            minute,
            type: 'save',
            team: Math.random() < 0.5 ? 'away' : 'home',
            description: 'Grande defesa!',
          });
        }
        if (Math.random() < 0.06) {
          newEvents.push({
            minute,
            type: 'corner',
            team: Math.random() < 0.5 ? 'home' : 'away',
            description: 'Escanteio',
          });
        }
        if (Math.random() < 0.04) {
          newEvents.push({
            minute,
            type: 'foul',
            team: Math.random() < 0.5 ? 'home' : 'away',
            description: 'Falta',
          });
        }

        // Update stats
        const totalPossession = newStats.homePossession + newStats.awayPossession || 100;
        const homePct = Math.round((newStats.homePossession / totalPossession) * 100);
        newStats.homePossession = homePct;
        newStats.awayPossession = 100 - homePct;

        // Calculate xG
        newStats.homeXG = Math.round((match.homeGoals + newStats.homeShotsOnTarget * 0.3) * 100) / 100;
        newStats.awayXG = Math.round((match.awayGoals + newStats.awayShotsOnTarget * 0.3) * 100) / 100;

        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = {
          ...match,
          liveMinute: minute,
          liveEvents: newEvents,
          liveStats: newStats,
        };

        set({ matches: updatedMatches });
      },

      applyMatchIntervention: (matchIndex: number, type: 'substitution' | 'shout') => {
        const state = get();
        const match = state.matches[matchIndex];
        if (!match || !match.isLive || !state.selectedTeam) {
          // Fallback to old behavior if match is not live
          if (!match || match.completed) return;

          const isHome = match.homeTeam === state.selectedTeam;
          const boost = type === 'shout' ? 0.08 : 0.04;

          const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
          const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;
          const result = simulateMatchResult(
            homeTeam,
            awayTeam,
            isHome ? boost : 0,
            isHome ? 0 : boost,
          );

          const updatedMatches = [...state.matches];
          updatedMatches[matchIndex] = {
            ...match,
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals,
            completed: true,
            events: [
              ...result.events,
              {
                minute: 45,
                type: 'substitution',
                team: isHome ? 'home' : 'away',
                description: type === 'shout' ? 'Gritos à equipa!' : 'Substituição tática',
              },
            ],
            stats: result.stats,
          };

          const updatedTeams = applyMatchResultToTeams(state.teams, match.homeTeam, match.awayTeam, result);

          if (type === 'shout') {
            const teamIdx = updatedTeams.findIndex(t => t.id === state.selectedTeam);
            if (teamIdx !== -1) {
              updatedTeams[teamIdx] = {
                ...updatedTeams[teamIdx],
                squad: updatedTeams[teamIdx].squad.map(p => ({
                  ...p,
                  morale: Math.min(100, p.morale + 3),
                })),
              };
            }
          }

          set({ matches: updatedMatches, teams: updatedTeams });
          return;
        }

        const isHome = match.homeTeam === state.selectedTeam;
        const minute = match.liveMinute;

        // Apply live intervention to ongoing match
        const updatedMatches = [...state.matches];
        const interventionEvent: MatchEvent = {
          minute: minute + 1,
          type: 'substitution',
          team: isHome ? 'home' : 'away',
          description: type === 'shout' ? 'Gritos à equipa!' : 'Substituição tática',
        };

        // For substitution, simulate an extra shot/event
        if (type === 'substitution') {
          const stats = { ...updatedMatches[matchIndex].liveStats };
          if (isHome) {
            stats.homeShots += 2;
            stats.homeShotsOnTarget += 1;
          } else {
            stats.awayShots += 2;
            stats.awayShotsOnTarget += 1;
          }
          updatedMatches[matchIndex] = {
            ...updatedMatches[matchIndex],
            liveMinute: Math.min(90, minute + 5),
            liveEvents: [...updatedMatches[matchIndex].liveEvents, interventionEvent],
            liveStats: stats,
          };
        } else {
          // Shout boosts morale
          const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
          const updatedTeams = [...state.teams];
          if (teamIdx !== -1) {
            updatedTeams[teamIdx] = {
              ...updatedTeams[teamIdx],
              squad: updatedTeams[teamIdx].squad.map(p => ({
                ...p,
                morale: Math.min(100, p.morale + 3),
              })),
            };
          }
          updatedMatches[matchIndex] = {
            ...updatedMatches[matchIndex],
            liveMinute: Math.min(90, minute + 3),
            liveEvents: [...updatedMatches[matchIndex].liveEvents, interventionEvent],
          };
          set({ matches: updatedMatches, teams: updatedTeams });
          return;
        }

        set({ matches: updatedMatches });
      },

      updatePlayerAttributes: (playerId: string, trainingType: string) => {
        const state = get();
        const teamIdx = state.teams.findIndex(t => t.squad.some(p => p.id === playerId));
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        const playerIdx = team.squad.findIndex(p => p.id === playerId);
        team.squad = [...team.squad];
        team.squad[playerIdx] = updatePlayerAttributes(team.squad[playerIdx], trainingType);

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      setTrainingPlan: (plan: WeeklyTrainingPlan) => set({ trainingPlan: plan }),

      applyWeeklyTraining: () => {
        const state = get();
        if (!state.selectedTeam || !state.trainingPlan) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        const focus = state.trainingPlan.teamFocus;

        team.squad = team.squad.map(p => {
          if (p.injury?.active) return p;
          
          const updated = updatePlayerAttributes(p, focus === 'cohesion' ? 'cohesion' : focus === 'physical' ? 'physical' : 'technical');
          
          // Add fatigue log entry
          const fatigueLevel = Math.max(0, (updated.cumulativeLoad || 0) * 2 + (100 - updated.fitness));
          updated.fatigueLog = [
            ...(updated.fatigueLog || []),
            {
              week: state.currentWeek,
              day: 0,
              fatigue: Math.min(100, fatigueLevel),
              cumulativeLoad: updated.cumulativeLoad,
              trainingType: focus === 'cohesion' ? 'cohesion' : focus === 'physical' ? 'physical' : 'technical',
            },
          ];
          
          return updated;
        });

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      markAsRead: (messageId: string) => {
        const state = get();
        set({
          inbox: state.inbox.map(m => (m.id === messageId ? { ...m, read: true } : m)),
        });
      },

      removeMessage: (messageId: string) => {
        set({ inbox: get().inbox.filter(m => m.id !== messageId) });
      },

      completeYouthIntake: () => {
        const state = get();
        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return;

        const youthPlayers = generateYouthIntake(team.youthFacilitiesLevel, 8);
        const newSquad = [...team.squad, ...youthPlayers];
        set({
          teams: state.teams.map(t =>
            t.id === state.selectedTeam
              ? { ...t, squad: newSquad, wageBill: recalcWageBill({ ...t, squad: newSquad }) }
              : t,
          ),
          youthIntakeCompleted: true,
        });
      },

      assignScout: () => {
        const state = get();
        if (!state.selectedTeam) return;

        const candidates = state.teams
          .filter(t => t.id !== state.selectedTeam)
          .flatMap(t => t.squad)
          .filter(p => !state.scoutReports.some(r => r.playerId === p.id))
          .slice(0, 3);

        if (candidates.length === 0) return;

        const newReports = candidates.map(generateScoutReport);
        set({ scoutReports: [...state.scoutReports, ...newReports] });
      },

      // ============================================================
      // ACORDO CONTRATUAL COMPLETO (Item 7.10)
      // ============================================================

      buyPlayer: (playerId: string, sellerTeamId: string, useInstallments = false) => {
        const state = get();
        if (!state.selectedTeam) return false;

        const buyerIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        const sellerIdx = state.teams.findIndex(t => t.id === sellerTeamId);
        if (buyerIdx === -1 || sellerIdx === -1) return false;

        const buyer = { ...state.teams[buyerIdx] };
        const seller = { ...state.teams[sellerIdx] };
        const playerIdx = seller.squad.findIndex(p => p.id === playerId);
        if (playerIdx === -1) return false;

        const player = seller.squad[playerIdx];
        const fee = player.marketValue;

        // Verificar orçamento
        if (!useInstallments && buyer.budget < fee) return false;
        if (useInstallments && buyer.budget < (fee * 0.3)) return false; // Precisa de 30% de entrada

        // Calcular pagamento parcelado se necessário
        let installmentClause: InstallmentClause | undefined;
        if (useInstallments) {
          const downPayment = fee * 0.3;
          const remaining = fee - downPayment;
          const installmentCount = Math.min(4, Math.max(2, Math.ceil(remaining / (fee * 0.1))));
          const installmentAmount = Math.round(remaining / installmentCount * 10) / 10;

          buyer.budget -= downPayment;

          installmentClause = {
            totalAmount: remaining,
            installmentCount,
            installmentAmount,
            payments: [],
            status: 'active',
          };

          for (let i = 0; i < installmentCount; i++) {
            const amount = i === 0 ? Math.round((remaining - installmentAmount * (installmentCount - 1)) * 10) / 10 : installmentAmount;
            installmentClause.payments.push({
              installmentNumber: i + 1,
              amount,
              dueWeek: state.currentWeek + 1 + i * 4,
              paid: false,
            });
          }
        } else {
          buyer.budget -= fee;
        }

        // Criar cláusula contratual completa (Item 7.10)
        const contractWeeks = 52 + Math.floor(Math.random() * 156); // 1-4 anos
        const weeklySalary = Math.round(player.salary * (1.0 + Math.random() * 0.5)); // Salário 100-150% do atual
        const releaseClause = Math.round(fee * (1.2 + Math.random() * 0.3) * 10) / 10;

        const contract: ContractClause = {
          weeklySalary,
          contractWeeks,
          releaseClause,
          performanceBonuses: Math.random() < 0.4 ? [
            {
              type: 'appearances',
              threshold: 15 + Math.floor(Math.random() * 25),
              bonusAmount: Math.floor(Math.random() * 100) + 25,
            },
          ] : undefined,
        };

        // Criar acordo de transferência completo (Item 7.10)
        const transferAgreement: TransferAgreement = {
          id: `ta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          playerId,
          playerName: `${player.name} ${player.surname}`,
          fromTeamId: sellerTeamId,
          toTeamId: state.selectedTeam,
          transferFee: fee,
          paymentMethod: useInstallments ? 'installments' : 'cash',
          contract,
          agreementDate: Date.now(),
          status: 'active',
          installmentClause,
          history: [
            {
              action: 'created',
              timestamp: Date.now(),
              reason: `Compra de ${player.name} por R$ ${fee}M`,
            },
          ],
        };

        // Mover jogador para o plantel do comprador
        buyer.squad = [...buyer.squad, { ...player, squadStatus: 'Rotation' }];
        buyer.wageBill = recalcWageBill(buyer);
        seller.squad = seller.squad.filter(p => p.id !== playerId);
        seller.budget += fee * 0.8;
        seller.wageBill = recalcWageBill(seller);

        const updatedTeams = [...state.teams];
        updatedTeams[buyerIdx] = buyer;
        updatedTeams[sellerIdx] = seller;

        set({
          teams: updatedTeams,
          scoutReports: state.scoutReports.filter(r => r.playerId !== playerId),
          pendingInstallments: useInstallments && installmentClause
            ? [...state.pendingInstallments, installmentClause]
            : state.pendingInstallments,
          transferAgreements: [...state.transferAgreements, transferAgreement],
        });
        return true;
      },

      acceptIncomingTransfer: (playerId: string) => {
        const state = get();
        const offer = state.incomingTransfers.find(o => o.playerId === playerId);
        if (!offer || !state.selectedTeam) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        const playerIdx = team.squad.findIndex(p => p.id === playerId);
        if (playerIdx === -1) return;

        const player = team.squad[playerIdx];
        team.budget += offer.offerPrice;
        team.squad = team.squad.filter(p => p.id !== playerId);
        team.wageBill = recalcWageBill(team);

        const buyerIdx = state.teams.findIndex(t => t.id === offer.fromTeam);
        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;

        if (buyerIdx !== -1) {
          const buyer = { ...state.teams[buyerIdx] };
          buyer.squad = [...buyer.squad, player];

          if (offer.paymentMethod === 'installments' && offer.installmentClause) {
            buyer.budget -= offer.installmentClause.payments[0].amount; // Pay first installment
            // Add remaining installments to pending
            const remainingPayments = offer.installmentClause.payments.slice(1).map(p => ({
              ...p,
              dueWeek: p.dueWeek + state.currentWeek,
            }));
            set({
              pendingInstallments: [...state.pendingInstallments, {
                ...offer.installmentClause,
                payments: remainingPayments,
                status: 'active',
              }],
            });
          } else {
            buyer.budget -= offer.offerPrice;
          }

          buyer.wageBill = recalcWageBill(buyer);
          updatedTeams[buyerIdx] = buyer;
        }

        // Add bonuses to incoming bonuses
        if (offer.bonuses && offer.bonuses.length > 0) {
          set({
            incomingBonuses: [...state.incomingBonuses, ...offer.bonuses],
          });
        }

        set({
          teams: updatedTeams,
          incomingTransfers: state.incomingTransfers.filter(o => o.playerId !== playerId),
        });
      },

      rejectIncomingTransfer: (playerId: string) => {
        set({ incomingTransfers: get().incomingTransfers.filter(o => o.playerId !== playerId) });
      },

      negotiateCounterOffer: (playerId: string) => {
        const state = get();
        const offer = state.incomingTransfers.find(o => o.playerId === playerId);
        if (!offer || !state.selectedTeam) return false;

        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return false;

        // Counter-offer: propose 20-30% less than original offer
        const reduction = 0.2 + Math.random() * 0.1;
        const counterPrice = Math.round(offer.offerPrice * (1 - reduction) * 10) / 10;

        // Determine payment method
        let paymentMethod: 'cash' | 'installments' = Math.random() < 0.6 ? 'cash' : 'installments';
        let installmentClause: InstallmentClause | undefined;
        let bonuses: PlayerBonus[] | undefined;

        if (paymentMethod === 'installments' && counterPrice > 8) {
          const installmentCount = Math.min(6, Math.max(3, Math.ceil(counterPrice / 4) + 1));
          const installmentAmount = Math.round(counterPrice / installmentCount * 10) / 10;

          installmentClause = {
            totalAmount: counterPrice,
            installmentCount,
            installmentAmount,
            payments: [],
            status: 'active',
          };

          for (let i = 0; i < installmentCount; i++) {
            const amount = i === 0 ? Math.round((counterPrice - installmentAmount * (installmentCount - 1)) * 10) / 10 : installmentAmount;
            installmentClause.payments.push({
              installmentNumber: i + 1,
              amount,
              dueWeek: state.currentWeek + 1 + i * 4,
              paid: false,
            });
          }
        }

        // Generate random bonuses
        if (Math.random() < 0.4) {
          bonuses = [];
          const bonusTypes: PlayerBonus['type'][] = ['goals', 'appearances', 'assists'];
          for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
            bonuses.push({
              playerId: offer.playerId,
              type: bonusTypes[Math.floor(Math.random() * bonusTypes.length)],
              threshold: Math.floor(Math.random() * 30) + 10,
              bonusAmount: Math.floor(Math.random() * 200) + 50,
              triggered: false,
            });
          }
        }

        const newCounterOffer: CounterOffer = {
          originalPlayerId: offer.playerId,
          originalFromTeam: offer.fromTeam,
          counterPrice,
          counterSalary: offer.contractProposal.salary,
          counterDuration: offer.contractProposal.duration,
          counterClause: offer.contractProposal.clause * 0.9,
          status: 'pending',
          createdAt: Date.now(),
          paymentMethod,
          installmentClause,
          bonuses,
        };

        const counterMessage: InboxMessage = {
          id: `msg_co_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'transfer',
          subject: 'Contra-oferta Recebida',
          body: `${team.name} fez uma contra-oferta de R$ ${counterPrice}M para o jogador. Aceitar ou recusar?`,
          timestamp: Date.now(),
          read: false,
          priority: 'high',
          relatedPlayerId: offer.playerId,
        };

        set({
          counterOffers: [...state.counterOffers, newCounterOffer],
          incomingTransfers: state.incomingTransfers.filter(o => o.playerId !== playerId),
          inbox: [counterMessage, ...state.inbox],
        });

        return true;
      },

      handleInboxAction: (messageId: string, actionLabel: string) => {
        const state = get();
        const message = state.inbox.find(m => m.id === messageId);
        if (!message) return;

        if (actionLabel === 'Marcar como Lido') {
          get().markAsRead(messageId);
          return;
        }
        if (actionLabel === 'Arquivar' || actionLabel === 'Ignorar' || actionLabel === 'Dispensar') {
          get().removeMessage(messageId);
          return;
        }
        if (actionLabel === 'Convocar' && message.type === 'youth') {
          get().completeYouthIntake();
          get().markAsRead(messageId);
          return;
        }
        if (actionLabel === 'Aplicar' && message.type === 'suggestion') {
          get().setTrainingPlan({
            week: state.currentWeek,
            teamFocus: 'physical',
            sessions: [],
          });
          get().markAsRead(messageId);
          return;
        }
        if (actionLabel === 'Marcar Treino' && message.type === 'injury') {
          get().setTrainingPlan({
            week: state.currentWeek,
            teamFocus: 'cohesion',
            sessions: [],
          });
          get().markAsRead(messageId);
          return;
        }
        if (actionLabel === 'Negociar' && message.type === 'transfer' && message.relatedPlayerId) {
          const offerExists = state.incomingTransfers.some(o => o.playerId === message.relatedPlayerId);
          if (offerExists) {
            get().negotiateCounterOffer(message.relatedPlayerId);
          }
          get().markAsRead(messageId);
          return;
        }

        // Aceitar transferência
        if (actionLabel === 'Aceitar' && message.type === 'transfer' && message.relatedPlayerId) {
          get().acceptIncomingTransfer(message.relatedPlayerId);
          get().markAsRead(messageId);
          return;
        }

        // Recusar transferência
        if (actionLabel === 'Recusar' && message.type === 'transfer' && message.relatedPlayerId) {
          get().rejectIncomingTransfer(message.relatedPlayerId);
          get().markAsRead(messageId);
          return;
        }

        // Item 9.8.2 - Lesão: Ver Relatório (apenas gera o relatório, sem efeito no store)
        if (actionLabel === 'Ver Relatório' && message.type === 'injury' && message.relatedPlayerId) {
          get().getInjuryReport(message.relatedPlayerId);
          get().markAsRead(messageId);
          return;
        }

        // Item 9.8.4 - Financeiro: Ver Relatório
        if (actionLabel === 'Ver Relatório' && message.type === 'financial') {
          get().getFinancialReport();
          get().markAsRead(messageId);
          return;
        }

        get().markAsRead(messageId);
      },

      // ============================================================
      // ITEM 9.8.3 - DIRETORIA: RESPONDER
      // ============================================================

      handleBoardReply: (messageId: string, response: string, category: BoardReply['category']) => {
        const state = get();
        const message = state.inbox.find(m => m.id === messageId);
        if (!message) return;

        // Calcular efeito na satisfação baseado na categoria e na resposta
        let satisfactionChange = 0;
        if (response.length > 50) satisfactionChange += 5;
        if (response.length > 200) satisfactionChange += 10;
        if (category === 'performance') satisfactionChange += 8;
        if (category === 'budget') satisfactionChange -= 3;
        if (category === 'expectation') satisfactionChange += 5;

        // Gerar resposta baseada na categoria
        let subject = message.subject;
        if (category === 'budget') subject = `Re: ${message.subject} - Orçamento`;
        if (category === 'performance') subject = `Re: ${message.subject} - Desempenho`;

        const boardReply: BoardReply = {
          messageId,
          subject,
          response,
          timestamp: Date.now(),
          sent: true,
          satisfactionChange,
          category,
        };

        set({
          inbox: state.inbox.map(m => m.id === messageId ? { ...m, boardReply } : m),
          boardReplies: [...state.boardReplies, boardReply],
          boardSatisfaction: Math.max(-100, Math.min(100, state.boardSatisfaction + satisfactionChange)),
        });
      },

      // ============================================================
      // CLÁUSULAS PARCELADAS E BÓNUS
      // ============================================================

      generateInstallmentClause: (totalAmount: number, count: number): InstallmentClause => {
        const installmentAmount = Math.round(totalAmount / count * 10) / 10;
        const payments: InstallmentPayment[] = [];

        for (let i = 0; i < count; i++) {
          payments.push({
            installmentNumber: i + 1,
            amount: i === 0 ? Math.round((totalAmount - installmentAmount * (count - 1)) * 10) / 10 : installmentAmount,
            dueWeek: get().currentWeek + 1 + i * 4, // cada parcela em 4 semanas
            paid: false,
          });
        }

        return {
          totalAmount,
          installmentCount: count,
          installmentAmount,
          payments,
          status: 'active',
        };
      },

      generatePlayerBonus: (type: PlayerBonus['type'], threshold: number, bonusAmount: number): PlayerBonus => ({
        playerId: '',
        type,
        threshold,
        bonusAmount,
        triggered: false,
      }),

      payInstallment: (installmentId: string) => {
        const state = get();
        const installment = state.pendingInstallments.find(inst =>
          inst.payments.some(p => p.installmentNumber.toString() === installmentId),
        );
        if (!installment) return false;

        const payment = installment.payments.find(p => p.installmentNumber.toString() === installmentId);
        if (!payment || payment.paid) return false;

        // Check budget
        const buyerTeam = state.teams.find(t => t.id === state.selectedTeam);
        if (!buyerTeam || buyerTeam.budget < payment.amount) return false;

        buyerTeam.budget -= payment.amount;

        payment.paid = true;
        payment.paidWeek = state.currentWeek;

        const allPaid = installment.payments.every(p => p.paid);
        if (allPaid) {
          installment.status = 'completed';
        }

        const updatedTeams = [...state.teams];
        const buyerIdx = updatedTeams.findIndex(t => t.id === state.selectedTeam);
        if (buyerIdx !== -1) {
          updatedTeams[buyerIdx] = buyerTeam;
        }

        set({
          teams: updatedTeams,
          pendingInstallments: state.pendingInstallments.map(inst =>
            inst === installment ? { ...inst, payments: [...inst.payments] } : inst,
          ),
        });

        return true;
      },

      checkBonuses: (playerId?: string) => {
        const state = get();
        const bonuses = state.incomingBonuses;
        const updatedBonuses = bonuses.map(b => {
          if (b.triggered || (playerId && b.playerId !== playerId)) return b;

          // Simulate bonus trigger check based on random chance
          const chance = Math.random();
          if (b.type === 'goals' && chance > 0.7) {
            return { ...b, triggered: true, triggeredWeek: state.currentWeek };
          } else if (b.type === 'appearances' && chance > 0.5) {
            return { ...b, triggered: true, triggeredWeek: state.currentWeek };
          }
          return b;
        });

        set({ incomingBonuses: updatedBonuses });

        // Add triggered bonus amounts to buyer's budget
        const buyerTeam = state.teams.find(t => t.id === state.selectedTeam);
        if (buyerTeam) {
          const triggeredBonuses = updatedBonuses.filter(b => b.triggered);
          const totalBonus = triggeredBonuses.reduce((sum, b) => sum + b.bonusAmount / 1000, 0);
          if (totalBonus > 0) {
            set({
              teams: state.teams.map(t =>
                t.id === state.selectedTeam ? { ...t, budget: t.budget + totalBonus } : t,
              ),
            });
          }
        }
      },

      claimBonus: (bonusId: string) => {
        const state = get();
        const bonus = state.incomingBonuses.find(b => b.playerId === bonusId);
        if (!bonus || !bonus.triggered) return;

        const buyerTeam = state.teams.find(t => t.id === state.selectedTeam);
        if (!buyerTeam) return;

        buyerTeam.budget += bonus.bonusAmount / 1000;

        set({
          teams: state.teams.map(t =>
            t.id === state.selectedTeam ? buyerTeam : t,
          ),
        });
      },

      // ============================================================
      // MÉTODOS PARA ACORDOS CONTRATUAIS (Item 7.10)
      // ============================================================

      terminateTransferAgreement: (agreementId: string, reason?: string) => {
        const state = get();
        const agreementIdx = state.transferAgreements.findIndex(a => a.id === agreementId);
        if (agreementIdx === -1) return;

        const agreement = state.transferAgreements[agreementIdx];
        const updatedAgreements = [...state.transferAgreements];
        updatedAgreements[agreementIdx] = {
          ...agreement,
          status: 'terminated',
          history: [
            ...(agreement.history || []),
            {
              action: 'terminated',
              timestamp: Date.now(),
              reason: reason || 'Acordo encerrado pelo usuário',
            },
          ],
        };

        set({ transferAgreements: updatedAgreements });
      },

      getTransferAgreements: (playerId?: string) => {
        const state = get();
        if (playerId) {
          return state.transferAgreements.filter(a => a.playerId === playerId);
        }
        return state.transferAgreements;
      },

      // ============================================================
      // ITEM 9.8.2 - LESÃO: VER RELATÓRIO
      // ============================================================

      getInjuryReport: (playerId: string): InjuryReport | null => {
        const state = get();
        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return null;

        const player = team.squad.find(p => p.id === playerId);
        if (!player || !player.injury?.active) return null;

        // Map injury type based on injury proneness and randomness
        const injuryTypes = ['muscle', 'ligament', 'joint', 'ankle', 'knee', 'groin'];
        const injuryType = injuryTypes[Math.floor(Math.random() * injuryTypes.length)];

        // Severity based on days out
        const days = player.injury.days;
        const severity: InjuryReport['severity'] = days <= 7 ? 'minor' : days <= 21 ? 'moderate' : 'severe';

        // Treatment based on severity
        const treatments = {
          minor: 'Descanso e gelo. Retorno ao treino gradual.',
          moderate: 'Fisioterapia e descanso. Sem participação em partidas.',
          severe: 'Possível necessidade de cirurgia. Longo afastamento.',
        };

        // Prognosis based on severity
        const prognoses = {
          minor: 'Recuperação completa esperada em breve.',
          moderate: 'Recuperação completa, mas com risco de recorrência.',
          severe: 'Recuperação longa. Risco de sequelas.',
        };

        return {
          playerId,
          playerName: `${player.name} ${player.surname}`,
          position: player.position,
          injuryType,
          severity,
          daysOut: days,
          recoveryProgress: Math.max(0, 100 - (days * 5)),
          treatment: treatments[severity],
          prognosis: prognoses[severity],
          injuryProneness: player.hidden.injuryProneness,
        };
      },

      // ============================================================
      // ITEM 9.8.4 - FINANCEIRO: VER RELATÓRIO
      // ============================================================

      generateFinancialReport: (): FinancialReport | null => {
        const state = get();
        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return null;

        // Calculate revenue and expenses
        const ticketRevenue = (team.reputation / 100) * 0.5;
        const sponsorship = (team.reputation / 100) * 0.3;
        const totalIncome = ticketRevenue + sponsorship;
        const totalExpenses = team.wageBill * 0.01;
        const profit = totalIncome - totalExpenses;

        // Calculate transfer-related figures
        const transferSpending = state.transferAgreements
          .filter(a => a.toTeamId === state.selectedTeam)
          .reduce((sum, a) => sum + a.transferFee, 0);
        const transferIncome = state.transferAgreements
          .filter(a => a.fromTeamId === state.selectedTeam)
          .reduce((sum, a) => sum + a.transferFee, 0);

        // Days until deadline (end of season = 38 weeks)
        const daysUntilDeadline = Math.max(0, (38 - state.currentWeek) * 7);

        return {
          teamId: team.id,
          teamName: team.name,
          budget: team.budget,
          wageBill: team.wageBill,
          ticketRevenue,
          sponsorshipRevenue: sponsorship,
          totalIncome,
          totalExpenses,
          profit,
          transferSpending,
          transferIncome,
          season: state.currentSeason,
          week: state.currentWeek,
          daysUntilDeadline,
          currency: 'BRL',
        };
      },

      getFinancialReport: () => {
        const state = get();
        const report = state.generateFinancialReport();
        if (report) {
          set({
            financialReports: [report, ...state.financialReports].slice(0, 50),
          });
        }
        return report;
      },

      // ============================================================
      // PREVENÇÃO DE LESÕES
      // ============================================================

      schedulePreventionSession: (session: PreventionSession) => {
        const state = get();
        set({
          preventionSessions: [...state.preventionSessions, session],
        });
      },

      applyPreventionSession: () => {
        const state = get();
        if (!state.selectedTeam || !state.preventionSessions.length) return;

        const latestSession = state.preventionSessions[state.preventionSessions.length - 1];
        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        
        // Apply prevention effects
        team.squad = team.squad.map(player => {
          if (latestSession.targetPlayerIds.includes(player.id)) {
            let updated = { ...player };
            
            // Medical sessions reduce injury duration
            if (latestSession.type === 'medical' && updated.injury?.active) {
              updated.injury.days = Math.max(0, updated.injury.days - 3);
            }
            
            // Recovery sessions restore fitness
            if (latestSession.type === 'recovery') {
              updated.fitness = Math.min(100, updated.fitness + 15);
              updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 15);
              updated.consecutivePhysicalDays = 0;
              updated.recoveryNeeded = false;
            }
            
            // Light sessions reduce load slightly
            if (latestSession.type === 'light') {
              updated.fitness = Math.min(100, updated.fitness + 5);
              updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 8);
            }
            
            return updated;
          }
          return player;
        });

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;

        set({
          teams: updatedTeams,
          preventionSessions: state.preventionSessions.filter(s => s !== latestSession),
        });
      },

      updatePlayerLoad: (playerId: string, day: number, trainingType: string) => {
        const state = get();
        const teamIdx = state.teams.findIndex(t => t.squad.some(p => p.id === playerId));
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        const playerIdx = team.squad.findIndex(p => p.id === playerId);
        const player = team.squad[playerIdx];
        
        const updatedPlayer = { ...player };
        const isPhysical = trainingType === 'physical';
        
        // Update consecutive days
        if (isPhysical && updatedPlayer.lastTrainingDay === day - 1) {
          updatedPlayer.consecutivePhysicalDays = (updatedPlayer.consecutivePhysicalDays || 0) + 1;
        } else if (!isPhysical) {
          updatedPlayer.consecutivePhysicalDays = 0;
        }
        updatedPlayer.lastTrainingDay = day;
        
        // Update cumulative load
        const loadAddition = isPhysical ? 8 : trainingType === 'technical' ? 3 : 1;
        updatedPlayer.cumulativeLoad = (updatedPlayer.cumulativeLoad || 0) + loadAddition;
        
        // Update recovery flag
        updatedPlayer.recoveryNeeded = updatedPlayer.fitness < 30 || updatedPlayer.cumulativeLoad > 20;
        
        team.squad[playerIdx] = updatedPlayer;
        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      calculateInjuryRisk: (playerId: string): number => {
        const state = get();
        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return 0;

        const player = team.squad.find(p => p.id === playerId);
        if (!player) return 0;

        return calculatePlayerInjuryRisk(player, team.facilitiesLevel, team.staffLevel, state.currentWeek);
      },

      recoverInjuredPlayer: (playerId: string) => {
        const state = get();
        const teamIdx = state.teams.findIndex(t => t.squad.some(p => p.id === playerId));
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        const playerIdx = team.squad.findIndex(p => p.id === playerId);
        const player = team.squad[playerIdx];

        const updatedPlayer = { ...player };
        updatedPlayer.injury = null;
        
        // Mark injury as recovered in history
        updatedPlayer.injuryHistory = [...(updatedPlayer.injuryHistory || [])].map(ih => {
          if (ih.playerId === playerId) {
            return { ...ih, fullyRecovered: true };
          }
          return ih;
        });
        
        // Reduce fitness penalty from recovery
        updatedPlayer.fitness = Math.max(updatedPlayer.fitness, 40);
        updatedPlayer.fitness = Math.min(100, updatedPlayer.fitness + 10);

        team.squad[playerIdx] = updatedPlayer;
        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      getInjuryRiskSummary: () => {
        const state = get();
        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return { critical: [], high: [], moderate: [], low: [] };

        const summary = { critical: [] as Player[], high: [] as Player[], moderate: [] as Player[], low: [] as Player[] };

        team.squad.forEach(player => {
          const risk = calculatePlayerInjuryRisk(player, team.facilitiesLevel, team.staffLevel, state.currentWeek);
          const level = getRiskLevel(risk);
          
          if (level === 'critical') summary.critical.push(player);
          else if (level === 'high') summary.high.push(player);
          else if (level === 'moderate') summary.moderate.push(player);
          else summary.low.push(player);
        });

        return summary;
      },

      // ============================================================
      // NOVOS MÉTODOS - GESTÃO DE FADIGA E RECOMENDAÇÕES
      // ============================================================

      applyFatigueDecay: () => {
        const state = get();
        if (!state.selectedTeam) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        const fatigueDecayRate = 0.15; // 15% de decaimento por semana

        team.squad = team.squad.map(player => {
          const updated = { ...player };
          
          // Fatigue decay from cumulative load
          const decay = Math.max(0, updated.cumulativeLoad - 10) * fatigueDecayRate;
          updated.fitness = Math.max(0, updated.fitness - decay * 0.3);
          
          // Reduce cumulative load naturally
          updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 5);
          
          // Reset consecutive days if enough time passed
          const daysSinceLastTraining = (updated.fatigueLog || []).length > 0 
            ? Math.abs((updated.fatigueLog![updated.fatigueLog!.length - 1].week - state.currentWeek))
            : 0;
          if (daysSinceLastTraining >= 1) {
            updated.consecutivePhysicalDays = Math.max(0, (updated.consecutivePhysicalDays || 0) - 1);
          }
          
          // Log fatigue for tracking
          const fatigueLevel = Math.max(0, (updated.cumulativeLoad || 0) * 2 + (100 - updated.fitness));
          updated.fatigueLog = [
            ...(updated.fatigueLog || []),
            {
              week: state.currentWeek,
              day: 0,
              fatigue: Math.min(100, fatigueLevel),
              cumulativeLoad: updated.cumulativeLoad,
              trainingType: 'decay',
            },
          ];
          
          return updated;
        });

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      generateInjuryRecommendation: (playerId: string) => {
        const state = get();
        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return;

        const player = team.squad.find(p => p.id === playerId);
        if (!player) return;

        const risk = calculatePlayerInjuryRisk(player, team.facilitiesLevel, team.staffLevel, state.currentWeek);
        const riskLevel = getRiskLevel(risk);
        
        if (riskLevel === 'low') return;

        const recommendationTypes: Array<{ riskThreshold: number; message: string; type: Recommendation['type']; urgency: 'high' | 'critical' }> = [
          { riskThreshold: 60, message: `${player.name} está com risco alto de lesão. Sugiro descanso imediato.`, type: 'rest', urgency: 'high' },
          { riskThreshold: 80, message: `${player.name} está em risco CRÍTICO! Substituição obrigatória nos treinos.`, type: 'substitution', urgency: 'critical' },
        ];

        const recommendation = recommendationTypes.find(r => risk >= r.riskThreshold);
        if (!recommendation) return;

        const newRecommendation: Recommendation = {
          id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...recommendation,
          playerId,
          playerName: `${player.name} ${player.surname}`,
          week: state.currentWeek,
          timestamp: Date.now(),
          acknowledged: false,
        };

        set({
          recommendations: [...state.recommendations, newRecommendation],
        });
      },

      applyPostInjuryCondition: (playerId: string) => {
        const state = get();
        const teamIdx = state.teams.findIndex(t => t.squad.some(p => p.id === playerId));
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        const playerIdx = team.squad.findIndex(p => p.id === playerId);
        const player = team.squad[playerIdx];

        const updatedPlayer = { ...player };
        updatedPlayer.lastInjuryWeek = state.currentWeek;
        
        // Set degraded condition based on injury severity
        const severity = player.injury?.days || 7;
        if (severity > 14) updatedPlayer.degradedCondition = 'minimal';
        else if (severity > 7) updatedPlayer.degradedCondition = 'low';
        else updatedPlayer.degradedCondition = 'moderate';

        team.squad[playerIdx] = updatedPlayer;
        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      acknowledgeRecommendation: (recommendationId: string) => {
        const state = get();
        const updatedRecs = state.recommendations.map(r =>
          r.id === recommendationId ? { ...r, acknowledged: true } : r
        );
        set({ recommendations: updatedRecs });
      },

      getFatigueHistory: (playerId: string): FatigueLogEntry[] => {
        const state = get();
        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return [];
        
        const player = team.squad.find(p => p.id === playerId);
        return player?.fatigueLog || [];
      },

      applyTrainingCooldown: (playerId: string, trainingType: string, day: number) => {
        const state = get();
        const teamIdx = state.teams.findIndex(t => t.squad.some(p => p.id === playerId));
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        const playerIdx = team.squad.findIndex(p => p.id === playerId);
        const player = team.squad[playerIdx];

        const updatedPlayer = { ...player };
        
        // Physical training has cooldown requirement
        if (trainingType === 'physical') {
          const fatigueLog = updatedPlayer.fatigueLog || [];
          const lastPhysicalDay = fatigueLog.reduce((last, entry) => {
            if (entry.trainingType === 'physical' && (!last || entry.day > last.day)) return entry;
            return last;
          }, null as { day: number } | null);
          
          // If last physical training was recent, increase risk
          if (lastPhysicalDay && Math.abs(lastPhysicalDay.day - day) <= 1) {
            updatedPlayer.consecutivePhysicalDays = (updatedPlayer.consecutivePhysicalDays || 0) + 2;
          }
        }
        
        team.squad[playerIdx] = updatedPlayer;
        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      updateDegradedConditions: () => {
        const state = get();
        if (!state.selectedTeam) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        const weeksSinceInjury = state.currentWeek;

        team.squad = team.squad.map(player => {
          const updated = { ...player };
          
          // Gradually improve degraded condition over time
          if (updated.degradedCondition && updated.lastInjuryWeek) {
            const weeksRecovering = weeksSinceInjury - updated.lastInjuryWeek;
            
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

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      // ============================================================
      // 10.5 - PROGRESSÃO DE ATRIBUTOS VISÍVEL NA TELA
      // ============================================================

      captureWeeklyAttributeSnapshot: () => {
        const state = get();
        if (!state.selectedTeam) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };

        team.squad = team.squad.map(player => {
          const updated = { ...player };
          const snapshot = {
            week: state.currentWeek,
            technical: { ...updated.technical },
            mental: { ...updated.mental },
            physical: { ...updated.physical },
            currentAbility: updated.currentAbility,
            potentialAbility: updated.potentialAbility,
            morale: updated.morale,
            form: updated.form,
            fitness: updated.fitness,
          };
          updated.attributeHistory = [...(updated.attributeHistory || []), snapshot];
          return updated;
        });

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      getAttributeDelta: (playerId: string, attributeName: string, weekA: number, weekB: number) => {
        const state = get();
        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return 0;

        const player = team.squad.find(p => p.id === playerId);
        if (!player || !player.attributeHistory) return 0;

        const snapA = player.attributeHistory.find(h => h.week === weekA);
        const snapB = player.attributeHistory.find(h => h.week === weekB);
        if (!snapA || !snapB) return 0;

        const from = (snapA as any)[attributeName] ?? 0;
        const to = (snapB as any)[attributeName] ?? 0;
        return Math.round((to - from) * 100) / 100;
      },

      getPlayerAttributeProgression: (playerId: string) => {
        const state = get();
        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team || !team.squad) return [];

        const player = team.squad.find(p => p.id === playerId);
        if (!player || !player.attributeHistory) return [];

        const progression: { week: number; changes: Record<string, { from: number; to: number }> }[] = [];

        for (let i = 1; i < player.attributeHistory.length; i++) {
          const prev = player.attributeHistory[i - 1];
          const curr = player.attributeHistory[i];
          const changes: Record<string, { from: number; to: number }> = {};

          // Compare technical
          const techKeys = Object.keys(prev.technical || {});
          techKeys.forEach(key => {
            const from = (prev.technical as any)[key] ?? 0;
            const to = (curr.technical as any)[key] ?? 0;
            if (from !== to) changes[`technical_${key}`] = { from, to };
          });

          // Compare mental
          const mentalKeys = Object.keys(prev.mental || {});
          mentalKeys.forEach(key => {
            const from = (prev.mental as any)[key] ?? 0;
            const to = (curr.mental as any)[key] ?? 0;
            if (from !== to) changes[`mental_${key}`] = { from, to };
          });

          // Compare physical
          const physKeys = Object.keys(prev.physical || {});
          physKeys.forEach(key => {
            const from = (prev.physical as any)[key] ?? 0;
            const to = (curr.physical as any)[key] ?? 0;
            if (from !== to) changes[`physical_${key}`] = { from, to };
          });

          // Compare CA/PA and other stats
          if (prev.currentAbility !== curr.currentAbility) {
            changes['currentAbility'] = { from: prev.currentAbility, to: curr.currentAbility };
          }
          if (prev.morale !== curr.morale) {
            changes['morale'] = { from: prev.morale, to: curr.morale };
          }
          if (prev.form !== curr.form) {
            changes['form'] = { from: prev.form, to: curr.form };
          }
          if (prev.fitness !== curr.fitness) {
            changes['fitness'] = { from: prev.fitness, to: curr.fitness };
          }

          progression.push({
            week: curr.week,
            changes,
          });
        }

        return progression;
      },

      // ============================================================
      // 11.4 - TRATAMENTO PELO TREINADOR
      // ============================================================

      setCoachTreatment: (playerId: string, treatment: {
        type: 'starter' | 'substitute' | 'bench' | 'training' | 'rest';
        minutesPerWeek: number;
        trustLevel: number;
        lastTrainingLoad: number;
      }) => {
        const state = get();
        if (!state.selectedTeam) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        team.squad = team.squad.map(p => p.id === playerId ? { ...p, coachTreatment: { ...p.coachTreatment, ...treatment } } : p);

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      setPlayerTrustLevel: (playerId: string, trustLevel: number) => {
        const state = get();
        if (!state.selectedTeam) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        team.squad = team.squad.map(p => p.id === playerId ? { ...p, coachTreatment: { ...p.coachTreatment, trustLevel: Math.max(0, Math.min(100, trustLevel)) } } : p);

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      setPlayerTrainingLoad: (playerId: string, trainingLoad: number) => {
        const state = get();
        if (!state.selectedTeam) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        team.squad = team.squad.map(p => p.id === playerId ? { ...p, coachTreatment: { ...p.coachTreatment, lastTrainingLoad: Math.max(0, Math.min(100, trainingLoad)) } } : p);

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      // ============================================================
      // 11.4 - PERFORMANCE DO CLUBE NA TABELA
      // ============================================================

      updateClubPerformance: (updates: {
        leaguePosition?: number;
        leagueForm?: string[];
        formRating?: 'excellent' | 'good' | 'average' | 'poor' | 'terrible';
      }) => {
        const state = get();
        if (!state.selectedTeam) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };

        if (updates.leaguePosition !== undefined) {
          team.leaguePosition = Math.max(1, Math.min(20, updates.leaguePosition));
        }
        if (updates.leagueForm !== undefined) {
          team.leagueForm = updates.leagueForm;
        }
        if (updates.formRating !== undefined) {
          team.formRating = updates.formRating;
        }

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      updateLeagueForm: (result: 'W' | 'D' | 'L') => {
        const state = get();
        if (!state.selectedTeam) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        const newForm = [...team.leagueForm, result].slice(-5); // Keep last 5
        team.leagueForm = newForm;

        // Update form rating based on recent form
        const wins = newForm.filter(f => f === 'W').length;
        const losses = newForm.filter(f => f === 'L').length;
        const total = newForm.length;

        let formRating: typeof team.formRating = 'average';
        if (total > 0 && wins / total >= 0.8) formRating = 'excellent';
        else if (total > 0 && wins / total >= 0.6) formRating = 'good';
        else if (total > 0 && losses / total >= 0.6) formRating = 'terrible';
        else if (total > 0 && losses / total >= 0.4) formRating = 'poor';

        team.formRating = formRating;

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      setLeaguePosition: (position: number) => {
        const state = get();
        if (!state.selectedTeam) return;

        const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx === -1) return;

        const team = { ...state.teams[teamIdx] };
        team.leaguePosition = Math.max(1, Math.min(20, position));

        const updatedTeams = [...state.teams];
        updatedTeams[teamIdx] = team;
        set({ teams: updatedTeams });
      },

      // ============================================================
      // 11.5 - ÁRVORE SOCIAL
      // ============================================================

      generateSocialTree: () => {
        const state = get();
        if (!state.selectedTeam) return;

        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return;

        // Find the most influential player as root
        const mostInfluential = team.squad.reduce((best, p) => {
          const influence = (p.mental?.leadership ?? 0) * 5 +
            (p.squadStatus === 'Key Player' ? 20 : p.squadStatus === 'Regular Starter' ? 15 : 10);
          const bestInfluence = (best.mental?.leadership ?? 0) * 5 +
            (best.squadStatus === 'Key Player' ? 20 : best.squadStatus === 'Regular Starter' ? 15 : 10);
          return influence > bestInfluence ? p : best;
        }, team.squad[0]);

        // Generate social nodes
        const nodes: SocialNode[] = team.squad.map(p => {
          const influence = Math.min(100, (p.mental?.leadership ?? 5) * 5 +
            (p.squadStatus === 'Key Player' ? 20 : p.squadStatus === 'Regular Starter' ? 15 : 10));
          return {
            playerId: p.id,
            playerName: `${p.name} ${p.surname}`,
            position: p.position,
            socialGroup: p.socialGroup || 'Sem grupo',
            influence,
            connections: p.teamMates || [],
          };
        });

        // Generate edges based on teamMates
        const edges: { from: string; to: string; strength: number }[] = [];
        nodes.forEach(node => {
          const teammates = team.squad.find(p => p.id === node.playerId)?.teamMates || [];
          teammates.forEach(teammateId => {
            const strength = Math.random() * 0.6 + 0.3; // 0.3-0.9
            edges.push({
              from: node.playerId,
              to: teammateId,
              strength,
            });
          });
        });

        // Calculate depth based on influence
        const maxInfluence = Math.max(...nodes.map(n => n.influence));
        const minInfluence = Math.min(...nodes.map(n => n.influence));
        nodes.forEach(node => {
          const normalized = (node.influence - minInfluence) / Math.max(maxInfluence - minInfluence, 1);
          node.depth = Math.floor(normalized * 3); // 0-3 levels
        });

        const socialTree: SocialTree = {
          rootNodeId: mostInfluential.id,
          nodes,
          edges,
          generatedWeek: state.currentWeek,
        };

        set({ socialTree });
      },

      getSocialTree: () => {
        const state = get();
        return state.socialTree ?? null;
      },

      updateSocialConnections: (playerIdA: string, playerIdB: string, strength: number) => {
        const state = get();
        if (!state.socialTree) return;

        const tree = { ...state.socialTree };
        const existingEdgeA = tree.edges.find(e => e.from === playerIdA && e.to === playerIdB);
        const existingEdgeB = tree.edges.find(e => e.from === playerIdB && e.to === playerIdA);

        if (existingEdgeA) {
          existingEdgeA.strength = strength;
        } else if (existingEdgeB) {
          existingEdgeB.strength = strength;
        } else {
          tree.edges.push({ from: playerIdA, to: playerIdB, strength });
        }

        set({ socialTree: tree });
      },

      // ============================================================
      // 11.6 - SISTEMA DE PROMESSAS COM CONTADOR DINÂMICO
      // ============================================================

      updatePromiseCountdown: () => {
        const state = get();
        if (!state.selectedTeam) return;

        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return;

        const updatedTeam = { ...team };
        const updatedSquad = updatedTeam.squad.map(player => {
          const updatedPromises = player.promises.map(promise => {
            if (!promise.fulfilled && promise.deadline > 0) {
              return { ...promise, deadline: promise.deadline - 1 };
            }
            return promise;
          });
          return { ...player, promises: updatedPromises };
        });

        updatedTeam.squad = updatedSquad;

        const updatedTeams = [...state.teams];
        const idx = updatedTeams.findIndex(t => t.id === team.id);
        updatedTeams[idx] = updatedTeam;
        set({ teams: updatedTeams });
      },

      getActivePromises: () => {
        const state = get();
        if (!state.selectedTeam) return [];

        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return [];

        const activePromises: { player: Player; promise: PlayerPromise; weeksLeft: number }[] = [];
        team.squad.forEach(player => {
          player.promises.forEach(promise => {
            if (!promise.fulfilled) {
              activePromises.push({ player, promise, weeksLeft: promise.deadline });
            }
          });
        });

        return activePromises;
      },

      checkPromiseDeadlines: () => {
        const state = get();
        if (!state.selectedTeam) return { fulfilled: [], expired: [] };

        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return { fulfilled: [], expired: [] };

        const expired: PlayerPromise[] = [];
        team.squad.forEach(player => {
          player.promises.forEach(promise => {
            if (!promise.fulfilled && promise.deadline <= 0) {
              expired.push(promise);
            }
          });
        });

        return { fulfilled: [], expired };
      },

      adjustPlayerSalary: (playerId: string, newSalary: number) => {
        const state = get();
        if (!state.selectedTeam) return;

        const salary = Math.max(10, Math.min(500, Math.round(newSalary)));
        get().updateTeam(state.selectedTeam, (team) => ({
          ...team,
          squad: team.squad.map((p) =>
            p.id === playerId ? { ...p, salary } : p,
          ),
          wageBill: recalcWageBill({
            ...team,
            squad: team.squad.map((p) =>
              p.id === playerId ? { ...p, salary } : p,
            ),
          }),
        }));
      },

      // ============================================================
      // 12 - SISTEMA DE SAVES (Máximo 2 slots)
      // ============================================================

      saveGame: (slotNumber: 1 | 2) => {
        const state = get();
        if (!state.selectedTeam) return;

        const team = state.teams.find(t => t.id === state.selectedTeam);
        if (!team) return;

        const existingSlot = state.saveSlots?.find(s => s.metadata.slotNumber === slotNumber);
        const timestamp = new Date().toISOString();

        const saveSlot: SaveSlot = {
          metadata: {
            slotNumber,
            teamName: team.name,
            currentWeek: state.currentWeek,
            currentSeason: state.currentSeason,
            savedAt: timestamp,
          },
          gameState: {
            selectedTeam: state.selectedTeam,
            currentWeek: state.currentWeek,
            currentSeason: state.currentSeason,
            matches: state.matches,
            teams: state.teams,
            transfers: state.transfers,
            incomingTransfers: state.incomingTransfers,
            counterOffers: state.counterOffers,
            inbox: state.inbox,
            trainingPlan: state.trainingPlan,
            youthIntakeCompleted: state.youthIntakeCompleted,
            scoutReports: state.scoutReports,
            pendingInstallments: state.pendingInstallments,
            incomingBonuses: state.incomingBonuses,
            transferAgreements: state.transferAgreements,
            boardReplies: state.boardReplies,
            boardSatisfaction: state.boardSatisfaction,
            financialReports: state.financialReports,
            injuryHistory: state.injuryHistory,
            preventionSessions: state.preventionSessions,
            fatigueLog: state.fatigueLog,
            recommendations: state.recommendations,
            degradedConditions: state.degradedConditions,
            socialTree: state.socialTree,
            saveSlots: state.saveSlots,
          },
        };

        const currentSlots = state.saveSlots ?? [];
        const filteredSlots = currentSlots.filter(s => s.metadata.slotNumber !== slotNumber);
        const newSlots = [...filteredSlots, saveSlot];

        set({ saveSlots: newSlots });
      },

      loadGame: (slotNumber: 1 | 2) => {
        const state = get();
        const saveSlot = state.saveSlots?.find(s => s.metadata.slotNumber === slotNumber);

        if (!saveSlot) return;

        const gameState = saveSlot.gameState;
        set({
          selectedTeam: gameState.selectedTeam,
          currentWeek: gameState.currentWeek,
          currentSeason: gameState.currentSeason,
          matches: gameState.matches,
          teams: gameState.teams,
          transfers: gameState.transfers,
          incomingTransfers: gameState.incomingTransfers,
          counterOffers: gameState.counterOffers,
          inbox: gameState.inbox,
          trainingPlan: gameState.trainingPlan,
          youthIntakeCompleted: gameState.youthIntakeCompleted,
          scoutReports: gameState.scoutReports,
          pendingInstallments: gameState.pendingInstallments,
          incomingBonuses: gameState.incomingBonuses,
          transferAgreements: gameState.transferAgreements,
          boardReplies: gameState.boardReplies,
          boardSatisfaction: gameState.boardSatisfaction,
          financialReports: gameState.financialReports,
          injuryHistory: gameState.injuryHistory,
          preventionSessions: gameState.preventionSessions,
          fatigueLog: gameState.fatigueLog,
          recommendations: gameState.recommendations,
          degradedConditions: gameState.degradedConditions,
          socialTree: gameState.socialTree,
          // IMPORTANTE: Não restaurar saveSlots - manter os saves atuais
          saveSlots: state.saveSlots,
        });
      },

      deleteSave: (slotNumber: 1 | 2) => {
        const state = get();
        const filteredSlots = (state.saveSlots ?? []).filter(s => s.metadata.slotNumber !== slotNumber);
        set({ saveSlots: filteredSlots });
      },

      getSaveSlots: () => {
        const state = get();
        return (state.saveSlots ?? []).map(s => s.metadata);
      },
    }),
    {
      name: 'fm-game-storage-v3',
      storage: createJSONStorage(() => {
        // STORAGE CUSTOMIZADO - Remove saveSlots para evitar overflow
        const mainKey = 'fm-game-storage-v3';
        const saveSlotsKey = 'fm-save-slots-v3';

        return {
          getItem(key: string) {
            if (key === mainKey) {
              const data = localStorage.getItem(mainKey);
              if (data) {
                const parsed = JSON.parse(data);
                // Remove saveSlots do estado carregado - eles são gerenciados separadamente
                const { saveSlots: _, ...rest } = parsed;
                return JSON.stringify(rest);
              }
              return null;
            }
            return null;
          },
          setItem(key: string, value: string) {
            if (key === mainKey) {
              try {
                const parsed = JSON.parse(value);
                // Remove saveSlots antes de salvar - eles vão para o storage separado
                const { saveSlots: _, ...rest } = parsed;
                
                // Se falhar por quota, tenta limpar primeiro
                try {
                  localStorage.setItem(mainKey, JSON.stringify(rest));
                } catch (quotaError) {
                  // Tenta limpar e salvar novamente
                  localStorage.removeItem(mainKey);
                  localStorage.setItem(mainKey, JSON.stringify(rest));
                }
              } catch (e) {
                console.error('Erro ao salvar estado principal:', e);
                console.warn('Tentando limpar localStorage e salvar novamente...');
                try {
                  localStorage.removeItem(mainKey);
                  const parsed = JSON.parse(value);
                  const { saveSlots: _, ...rest } = parsed;
                  localStorage.setItem(mainKey, JSON.stringify(rest));
                } catch (retryError) {
                  console.error('Falha ao salvar mesmo após limpeza:', retryError);
                }
              }
            }
          },
          removeItem(key: string) {
            if (key === mainKey) {
              localStorage.removeItem(mainKey);
            }
          },
        };
      }),
    },
  ),
);

// ============================================================
// SISTEMA DE SAVES - PERSISTÊNCIA SEPARADA
// ============================================================

const SAVE_SLOTS_KEY = 'fm-save-slots-v3';
const MAIN_STORAGE_KEY = 'fm-game-storage-v3';

// Tenta limpar localStorage automaticamente quando detecta QuotaExceededError
function tryClearStorageOnQuotaError(): boolean {
  try {
    // Tenta escrever 1KB para testar
    localStorage.setItem('quota-test', 'a'.repeat(100));
    localStorage.removeItem('quota-test');
    return false;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('⚠️ localStorage cheio! Tentando limpar...');
      localStorage.removeItem(MAIN_STORAGE_KEY);
      localStorage.removeItem(SAVE_SLOTS_KEY);
      console.warn('localStorage limpo com sucesso. Recarregue a página.');
      window.location.reload();
      return true;
    }
    return false;
  }
}

// Verifica e limpa se necessário
if (typeof window !== 'undefined') {
  const quotaError = tryClearStorageOnQuotaError();
  if (!quotaError) {
    // Carregar saves ao iniciar
    try {
      const data = localStorage.getItem(SAVE_SLOTS_KEY);
      if (data) {
        const existingSlots: SaveSlot[] = JSON.parse(data);
        useGameStore.setState({ saveSlots: existingSlots });
      }
    } catch (e) {
      console.error('Erro ao carregar saves:', e);
    }
  }
}

// Salvar automaticamente quando os slots mudam
useGameStore.subscribe((state) => {
  try {
    localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(state.saveSlots));
  } catch (e) {
    console.error('Erro ao salvar saves:', e);
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      localStorage.removeItem(MAIN_STORAGE_KEY);
      localStorage.removeItem(SAVE_SLOTS_KEY);
      window.location.reload();
    }
  }
});
