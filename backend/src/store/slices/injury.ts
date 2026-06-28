import type { GameStore, Player, PreventionSession, FatigueLogEntry, Recommendation, InjuryReport } from '../../types/game';
import { calculatePlayerInjuryRisk, getRiskLevel } from '../helpers/injury';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createInjurySlice = (set: Set, get: Get) => ({
  getInjuryReport: (playerId: string): InjuryReport | null => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return null;

    const player = team.squad.find(p => p.id === playerId);
    if (!player || !player.injury?.active) return null;

    // Map injury type deterministically based on playerId
    const injuryTypes = ['muscle', 'ligament', 'joint', 'ankle', 'knee', 'groin'];
    const hash = playerId.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const injuryType = injuryTypes[hash % injuryTypes.length];

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
});
