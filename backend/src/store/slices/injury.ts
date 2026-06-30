import type { GameStore, Player, PreventionSession, FatigueLogEntry, Recommendation, InjuryReport } from '../../types/game';
import { calculatePlayerInjuryRisk, getRiskLevel, applyFatigueDecayToPlayer, updateDegradedConditionForPlayer, INJURY_TYPE_LABELS } from '../helpers/injury';
import { getFullName } from '../../utils/playerName';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createInjurySlice = (set: Set, get: Get) => ({
  getInjuryReport: (playerId: string): InjuryReport | null => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return null;

    const player = team.squad.find(p => p.id === playerId);
    if (!player || !player.injury?.active) return null;

    // Use stored injury data
    const injuryType = player.injury.type || 'muscle';
    const days = player.injury.daysRemaining;
    const severity = player.injury.severity;

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
      playerName: getFullName(player),
      position: player.position,
      injuryType,
      severity,
      daysOut: days,
      recoveryProgress: player.injury.totalDays > 0
        ? Math.max(0, Math.round(100 - (days / player.injury.totalDays) * 100))
        : 100,
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
        const updated = { ...player };
        
        // Medical sessions reduce injury duration
        if (latestSession.type === 'medical' && updated.injury?.active) {
          updated.injury = { ...updated.injury, daysRemaining: Math.max(0, updated.injury.daysRemaining - 3) };
          if (updated.injury.daysRemaining <= 0) updated.injury = null;
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
    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const playerIdx = team.squad.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return;
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
    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const playerIdx = team.squad.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return;
    const player = team.squad[playerIdx];

    const updatedPlayer = { ...player };
    updatedPlayer.injury = null;

    // Mark most recent unrecovered injury as recovered
    updatedPlayer.injuryHistory = [...(updatedPlayer.injuryHistory || [])];
    const lastUnrecoveredIdx = [...updatedPlayer.injuryHistory].reverse().findIndex(
      ih => ih.playerId === playerId && !ih.fullyRecovered
    );
    if (lastUnrecoveredIdx !== -1) {
      const actualIdx = updatedPlayer.injuryHistory.length - 1 - lastUnrecoveredIdx;
      updatedPlayer.injuryHistory[actualIdx] = { ...updatedPlayer.injuryHistory[actualIdx], fullyRecovered: true };
    }

    // Partial fitness restoration on manual recovery
    updatedPlayer.fitness = Math.min(100, Math.max(updatedPlayer.fitness, 40) + 10);

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

    team.squad = team.squad.map(player => {
      const updated = applyFatigueDecayToPlayer(player);
      
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
      ].slice(-20);
      
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
      { riskThreshold: 60, message: `${getFullName(player)} está com risco alto de lesão. Sugiro descanso imediato.`, type: 'rest', urgency: 'high' },
      { riskThreshold: 80, message: `${getFullName(player)} está em risco CRÍTICO! Substituição obrigatória nos treinos.`, type: 'substitution', urgency: 'critical' },
    ];

    const recommendation = recommendationTypes.find(r => risk >= r.riskThreshold);
    if (!recommendation) return;

    const newRecommendation: Recommendation = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...recommendation,
      playerId,
      playerName: getFullName(player),
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
    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const playerIdx = team.squad.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return;
    const player = team.squad[playerIdx];

    const updatedPlayer = { ...player };
    updatedPlayer.lastInjuryWeek = state.currentWeek;

    // Set degraded condition based on injury severity
    const severity = player.injury?.severity || 'minor';
    if (severity === 'severe') updatedPlayer.degradedCondition = 'minimal';
    else if (severity === 'moderate') updatedPlayer.degradedCondition = 'low';
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

  // Standalone: uses state.currentWeek. When called from advanceWeek, the inline
  // version in core.ts uses newWeek instead — both are correct for their context.
  updateDegradedConditions: () => {
    const state = get();
    if (!state.selectedTeam) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };

    team.squad = team.squad.map(player =>
      updateDegradedConditionForPlayer(player, state.currentWeek),
    );

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },
});
