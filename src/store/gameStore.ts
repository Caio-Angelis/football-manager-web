import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameState, Player, Team, Match, MatchEvent, MatchStats, PlayerAttribute, GKAttributes } from '../types/game';
import { generatePlayer, generateTeam, generateYouthIntake } from '../utils/playerGenerator';

// ============================================================
// CÁLCULO DE FORÇA DO TIME - Baseado em atributos 1-20
// ============================================================

function calculateTeamStrength(team: Team): number {
  const starting11 = team.squad.slice(0, 11);
  let totalStrength = 0;
  
  starting11.forEach(player => {
    // Calcular média dos atributos 1-20 e converter para escala 1-100
    let sum = 0;
    let count = 0;
    
    // Técnicos
    if (player.technical) {
      const techValues = [player.technical.passing, player.technical.technique, player.technical.finishing, player.technical.dribbling, player.technical.crossing];
      techValues.forEach(v => { if (v) { sum += v * 4; count++; } });
    }
    
    // Mentais
    if (player.mental) {
      const mentalValues = [player.mental.vision, player.mental.decisions, player.mental.composure, player.mental.anticipation, player.mental.positioning];
      mentalValues.forEach(v => { if (v) { sum += v * 5; count++; } });
    }
    
    // Físicos
    if (player.physical) {
      const physicalValues = [player.physical.speed, player.physical.stamina, player.physical.strength, player.physical.agility, player.physical.acceleration];
      physicalValues.forEach(v => { if (v) { sum += v * 3; count++; } });
    }
    
    // CA contribui mais que overall
    const playerStrength = (player.currentAbility * 0.6 + (sum / count) * 5.5) * 1.2;
    totalStrength += playerStrength;
  });
  
  // Bônus de tática
  const tacticBonus = team.tactic === 'attacking' ? 0.15 : team.tactic === 'defensive' ? 0.1 : 0.125;
  const mentalityBonus = team.teamMentality === 'offensive' ? 0.05 : team.teamMentality === 'defensive' ? 0.08 : 0;
  
  return (totalStrength / starting11.length) * (1 + tacticBonus + mentalityBonus);
}

// ============================================================
// MOTOR DE PARTIDA - Algoritmo baseado em turnos
// ============================================================

function simulateMatchResult(homeTeam: Team, awayTeam: Team): { 
  homeGoals: number; 
  awayGoals: number; 
  events: MatchEvent[];
  stats: MatchStats;
} {
  const homeStrength = calculateTeamStrength(homeTeam);
  const awayStrength = calculateTeamStrength(awayTeam);
  const homeAdvantage = 0.12; // Casa
  
  // Probabilidade de gol baseada em força relativa
  const homeGoalChance = (homeStrength + homeAdvantage) / (homeStrength + awayStrength + homeAdvantage);
  const awayGoalChance = 1 - homeGoalChance;
  
  // Simular 90 minutos virtuais
  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeShotsOnTarget = 0;
  let awayShotsOnTarget = 0;
  let homePasses = 0;
  let awayPasses = 0;
  
  for (let minute = 0; minute < 90; minute++) {
    // Chance de evento baseado no minuto
    const eventProbability = 0.05 + Math.random() * 0.1;
    
    // Posse baseada em tática e atributos de passe
    const homePossession = homeGoalChance + (Math.random() * 0.1 - 0.05);
    
    if (Math.random() < eventProbability) {
      // Chance de chute
      if (Math.random() < homePossession) {
        homeShots += Math.floor(Math.random() * 3) + 1;
        homePasses += Math.floor(Math.random() * 15) + 5;
        
        // Chance de gol
        if (Math.random() < 0.15 * homeGoalChance) {
          homeShotsOnTarget++;
          if (Math.random() < 0.4) {
            homeGoals++;
            events.push({
              minute,
              type: 'goal',
              team: 'home',
              description: `GOOOL! ${homeTeam.name} marca!`
            });
          }
        }
      } else {
        awayShots += Math.floor(Math.random() * 3) + 1;
        awayPasses += Math.floor(Math.random() * 15) + 5;
        
        if (Math.random() < 0.15 * awayGoalChance) {
          awayShotsOnTarget++;
          if (Math.random() < 0.4) {
            awayGoals++;
            events.push({
              minute,
              type: 'goal',
              team: 'away',
              description: `GOOOL! ${awayTeam.name} marca!`
            });
          }
        }
      }
      
      // Eventos aleatórios
      if (Math.random() < 0.08) {
        events.push({
          minute,
          type: 'shot',
          team: Math.random() < 0.5 ? 'home' : 'away',
          description: 'Chute perigoso'
        });
      }
      
      if (Math.random() < 0.05) {
        events.push({
          minute,
          type: 'save',
          team: Math.random() < 0.5 ? 'away' : 'home',
          description: 'Grande defesa!'
        });
      }
      
      if (Math.random() < 0.06) {
        events.push({
          minute,
          type: 'corner',
          team: Math.random() < 0.5 ? 'home' : 'away',
          description: 'Escanteio'
        });
      }
      
      if (Math.random() < 0.04) {
        events.push({
          minute,
          type: 'foul',
          team: Math.random() < 0.5 ? 'home' : 'away',
          description: 'Falta'
        });
      }
    }
  }
  
  // Gerar estatísticas
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
    awayPassAccuracy: Math.round(70 + Math.random() * 20)
  };
  
  return { homeGoals, awayGoals, events, stats };
}

// ============================================================
// GERADOR DE PARTIDAS DA SEMANA
// ============================================================

function generateWeekMatches(teams: Team[]): Match[] {
  const matches: Match[] = [];
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      const weekNumber = Math.floor(shuffled.length / 2) + 1;
      const day = (i + 1) % 5 + 1; // Dias da semana
      matches.push({
        homeTeam: shuffled[i].id,
        awayTeam: shuffled[i + 1].id,
        homeGoals: 0,
        awayGoals: 0,
        date: `Semana ${weekNumber} - Dia ${day}`,
        completed: false,
        events: [],
        stats: undefined
      });
    }
  }
  
  return matches;
}

// ============================================================
// GERADOR DE EVENTOS DA CAIXA DE ENTRADA
// ============================================================

function generateInboxMessage(week: number): { id: string; type: string; subject: string; body: string; priority: 'low' | 'medium' | 'high' } {
  const types = ['transfer', 'injury', 'suggestion', 'training', 'financial'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  const messages = {
    transfer: {
      subject: 'Proposta de Transferência Recebida',
      body: 'Um clube está interessado em um jogador do seu plantel.'
    },
    injury: {
      subject: 'Relatório Médico - Lesão',
      body: 'Um jogador sofreu uma lesão durante o treino.'
    },
    suggestion: {
      subject: 'Recomendação de Treino',
      body: 'O auxiliar técnico sugere mudanças no treinamento.'
    },
    training: {
      subject: 'Relatório de Treino',
      body: 'Os jogadores responderam bem ao treino físico.'
    },
    financial: {
      subject: 'Relatório Financeiro',
      body: 'Os gastos da equipe estão dentro do orçamento.'
    }
  };
  
  const msg = messages[type as keyof typeof messages];
  
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    subject: msg.subject,
    body: msg.body,
    priority: Math.random() < 0.3 ? 'high' : Math.random() < 0.6 ? 'medium' : 'low'
  };
}

// ============================================================
// ATUALIZAÇÃO DE ATRIBUTOS DOS JOGADORES
// ============================================================

function updatePlayerAttributes(player: Player, trainingType: string): Player {
  const updated = { ...player };
  const improvement = Math.random() * 0.8 + 0.2;
  
  if (trainingType === 'physical') {
    if (updated.physical) {
      updated.physical.stamina = Math.min(20, updated.physical.stamina + improvement);
      updated.physical.speed = Math.min(20, updated.physical.speed + improvement * 0.5);
    }
    updated.fitness = Math.max(0, updated.fitness - 5); // Fadiga
  } else if (trainingType === 'technical') {
    if (updated.technical) {
      updated.technical.passing = Math.min(20, updated.technical.passing + improvement * 0.8);
      updated.technical.technique = Math.min(20, updated.technical.technique + improvement * 0.8);
    }
  } else if (trainingType === 'cohesion') {
    // Melhora moral sem alterar atributos
    updated.morale = Math.min(100, updated.morale + 5);
  }
  
  return updated;
}

// ============================================================
// STORE DO JOGO
// ============================================================

export const useGameStore = create<GameState>()(
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
      
      // Selecionar time
      selectTeam: (teamId: string) => set({ selectedTeam: teamId }),
      
      // Iniciar jogo com times gerados
      initGame: () => {
        const numTeams = 8;
        const teams: Team[] = [];
        
        for (let i = 0; i < numTeams; i++) {
          const reputation = 30 + Math.floor(Math.random() * 60);
          teams.push(generateTeam({
            division: i < 4 ? 'Série A' : 'Série B',
            league: 'Brasileirão',
            reputation
          }));
        }
        
        const matches = generateWeekMatches(teams);
        
        set({
          teams,
          matches,
          currentWeek: 0,
          currentSeason: 1
        });
      },
      
      // Avançar semana
      advanceWeek: () => {
        const state = get();
        const newWeek = state.currentWeek + 1;
        const newSeason = newWeek >= 38 ? state.currentSeason + 1 : state.currentSeason;
        
        // Gerar nova rodada
        const newMatches = generateWeekMatches(state.teams);
        
        // Simular partidas dos outros times automaticamente
        const updatedTeams = [...state.teams];
        const updatedMatches = newMatches.map(m => {
          const match = { ...m };
          
          // Simular partidas que não envolvem o time do jogador
          if (m.homeTeam !== state.selectedTeam && m.awayTeam !== state.selectedTeam) {
            const result = simulateMatchResult(
              updatedTeams.find(t => t.id === m.homeTeam)!,
              updatedTeams.find(t => t.id === m.awayTeam)!
            );
            
            match.homeGoals = result.homeGoals;
            match.awayGoals = result.awayGoals;
            match.completed = true;
            match.events = result.events;
            match.stats = result.stats;
            
            // Atualizar classificações
            const homeIdx = updatedTeams.findIndex(t => t.id === m.homeTeam);
            const awayIdx = updatedTeams.findIndex(t => t.id === m.awayTeam);
            
            const homeTeam = { ...updatedTeams[homeIdx] };
            const awayTeam = { ...updatedTeams[awayIdx] };
            
            homeTeam.played++;
            awayTeam.played++;
            homeTeam.goalsFor += result.homeGoals;
            awayTeam.goalsFor += result.awayGoals;
            homeTeam.goalsAgainst += result.awayGoals;
            awayTeam.goalsAgainst += result.homeGoals;
            
            if (result.homeGoals > result.awayGoals) {
              homeTeam.points += 3;
              awayTeam.lost++;
            } else if (result.homeGoals < result.awayGoals) {
              awayTeam.points += 3;
              homeTeam.lost++;
            } else {
              homeTeam.points += 1;
              awayTeam.points += 1;
              homeTeam.drawn++;
              awayTeam.drawn++;
            }
            
            updatedTeams[homeIdx] = homeTeam;
            updatedTeams[awayIdx] = awayTeam;
          }
          
          return match;
        });
        
        // Gerar mensagem na caixa de entrada
        const inboxMessage = generateInboxMessage(newWeek);
        
        // Verificar youth intake
        const youthIntake = newWeek === 0 && !state.youthIntakeCompleted;
        
        set({
          currentWeek: newWeek,
          currentSeason: newSeason,
          matches: updatedMatches,
          teams: updatedTeams,
          inbox: [inboxMessage, ...state.inbox],
          youthIntakeCompleted: youthIntake ? true : state.youthIntakeCompleted
        });
      },
      
      // Simular partida específica
      simulateMatch: (matchIndex: number) => {
        const state = get();
        const match = state.matches[matchIndex];
        if (match.completed) return;
        
        const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
        const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;
        
        const result = simulateMatchResult(homeTeam, awayTeam);
        
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = {
          ...updatedMatches[matchIndex],
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          completed: true,
          events: result.events,
          stats: result.stats
        };
        
        // Atualizar times
        const homeTeamIdx = state.teams.findIndex(t => t.id === match.homeTeam);
        const awayTeamIdx = state.teams.findIndex(t => t.id === match.awayTeam);
        
        const homeTeamUpdated = { ...state.teams[homeTeamIdx] };
        const awayTeamUpdated = { ...state.teams[awayTeamIdx] };
        
        homeTeamUpdated.played += 1;
        awayTeamUpdated.played += 1;
        homeTeamUpdated.goalsFor += result.homeGoals;
        awayTeamUpdated.goalsFor += result.awayGoals;
        homeTeamUpdated.goalsAgainst += result.awayGoals;
        awayTeamUpdated.goalsAgainst += result.homeGoals;
        
        if (result.homeGoals > result.awayGoals) {
          homeTeamUpdated.points += 3;
          homeTeamUpdated.won += 1;
          awayTeamUpdated.lost += 1;
        } else if (result.homeGoals < result.awayGoals) {
          awayTeamUpdated.points += 3;
          awayTeamUpdated.won += 1;
          homeTeamUpdated.lost += 1;
        } else {
          homeTeamUpdated.points += 1;
          awayTeamUpdated.points += 1;
          homeTeamUpdated.drawn += 1;
          awayTeamUpdated.drawn += 1;
        }
        
        const updatedTeams = [...state.teams];
        updatedTeams[homeTeamIdx] = homeTeamUpdated;
        updatedTeams[awayTeamIdx] = awayTeamUpdated;
        
        set({ matches: updatedMatches, teams: updatedTeams });
      },
      
      // Atualizar atributos do jogador
      updatePlayerAttributes: (playerId: string, trainingType: string) => {
        const state = get();
        const teamIdx = state.teams.findIndex(t => t.squad.some(p => p.id === playerId));
        if (teamIdx === -1) return;
        
        const team = { ...state.teams[teamIdx] };
        const playerIdx = team.squad.findIndex(p => p.id === playerId);
        const player = team.squad[playerIdx];
        
        if (!player) return;
        
        team.squad[playerIdx] = updatePlayerAttributes(player, trainingType);
        
        set({ teams: [...state.teams] });
      },
      
      // Completar youth intake
      completeYouthIntake: () => {
        const state = get();
        const player = state.teams.find(t => t.id === state.selectedTeam);
        if (!player) return;
        
        const youthPlayers = generateYouthIntake(player.youthFacilitiesLevel, 8);
        set({
          teams: state.teams.map(t => t.id === state.selectedTeam ? { ...t, squad: [...t.squad, ...youthPlayers] } : t),
          youthIntakeCompleted: true
        });
      }
    }),
    {
      name: 'fm-game-storage-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
