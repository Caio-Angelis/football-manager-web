import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  GameStore, Player, Team, Match, MatchEvent, MatchStats,
  InboxMessage, IncomingTransfer, ScoutReport, WeeklyTrainingPlan,
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
  if (team.highPress) bonus += 0.03;
  if (team.counterPress) bonus += 0.03;
  if (team.highLine) bonus += 0.02;
  if (team.aggressiveTackling) bonus += 0.02;
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
    transfer: { subject: 'Proposta de Transferência Recebida', body: 'Um clube está interessado em um jogador do seu plantel.' },
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

function updatePlayerAttributes(player: Player, trainingType: string): Player {
  const updated = { ...player };
  const improvement = Math.random() * 0.8 + 0.2;

  if (trainingType === 'physical') {
    if (updated.physical) {
      updated.physical.stamina = Math.min(20, (updated.physical.stamina ?? 0) + improvement);
      updated.physical.speed = Math.min(20, (updated.physical.speed ?? 0) + improvement * 0.5);
    }
    updated.fitness = Math.max(0, updated.fitness - 8);
    if (Math.random() < 0.05 + (updated.hidden.injuryProneness * 0.01)) {
      updated.injury = { active: true, days: 7 + Math.floor(Math.random() * 14) };
    }
  } else if (trainingType === 'technical') {
    if (updated.technical) {
      updated.technical.passing = Math.min(20, updated.technical.passing + improvement * 0.8);
      updated.technical.technique = Math.min(20, updated.technical.technique + improvement * 0.8);
      updated.technical.finishing = Math.min(20, updated.technical.finishing + improvement * 0.5);
    }
    updated.fitness = Math.max(0, updated.fitness - 3);
  } else if (trainingType === 'cohesion') {
    updated.morale = Math.min(100, updated.morale + 5);
    updated.fitness = Math.max(0, updated.fitness - 2);
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

  return {
    playerId: player.id,
    offerPrice: Math.round(player.marketValue * (0.8 + Math.random() * 0.4) * 10) / 10,
    fromTeam: buyer.id,
    contractProposal: {
      salary: Math.round(player.salary * 1.1),
      duration: 52 + Math.floor(Math.random() * 104),
      clause: Math.round(player.marketValue * 1.5 * 10) / 10,
    },
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
      inbox: [],
      trainingPlan: null,
      youthIntakeCompleted: false,
      scoutReports: [],

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

        set({
          currentWeek: newWeek,
          currentSeason: newSeason,
          matches: updatedMatches,
          teams: updatedTeams,
          inbox: [inboxMessage, ...state.inbox],
          youthIntakeCompleted,
          incomingTransfers: newIncoming
            ? [...state.incomingTransfers, newIncoming]
            : state.incomingTransfers,
        });
      },

      simulateMatch: (matchIndex: number) => {
        const state = get();
        const match = state.matches[matchIndex];
        if (!match || match.completed) return;

        const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
        const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;

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
        let goalsScored = false;

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
                goalsScored = true;
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
                goalsScored = true;
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
        const boost = type === 'shout' ? 0.08 : 0.04;

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
          const team = isHome ? updatedMatches[matchIndex].homeTeam : updatedMatches[matchIndex].awayTeam;
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
          return updatePlayerAttributes(p, focus === 'cohesion' ? 'cohesion' : focus === 'physical' ? 'physical' : 'technical');
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

        const userTeam = state.teams.find(t => t.id === state.selectedTeam)!;
        const candidates = state.teams
          .filter(t => t.id !== state.selectedTeam)
          .flatMap(t => t.squad)
          .filter(p => !state.scoutReports.some(r => r.playerId === p.id))
          .slice(0, 3);

        if (candidates.length === 0) return;

        const newReports = candidates.map(generateScoutReport);
        set({ scoutReports: [...state.scoutReports, ...newReports] });
      },

      buyPlayer: (playerId: string, sellerTeamId: string) => {
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

        if (buyer.budget < fee) return false;

        buyer.budget -= fee;
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
          buyer.budget -= offer.offerPrice;
          buyer.wageBill = recalcWageBill(buyer);
          updatedTeams[buyerIdx] = buyer;
        }

        set({
          teams: updatedTeams,
          incomingTransfers: state.incomingTransfers.filter(o => o.playerId !== playerId),
        });
      },

      rejectIncomingTransfer: (playerId: string) => {
        set({ incomingTransfers: get().incomingTransfers.filter(o => o.playerId !== playerId) });
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

        get().markAsRead(messageId);
      },
    }),
    {
      name: 'fm-game-storage-v3',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
