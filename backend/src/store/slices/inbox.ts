import type { GameStore, BoardReply } from '../../types/game';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createInboxSlice = (set: Set, get: Get) => ({
  markAsRead: (messageId: string) => {
    const state = get();
    set({
      inbox: state.inbox.map(m => (m.id === messageId ? { ...m, read: true } : m)),
    });
  },

  removeMessage: (messageId: string) => {
    set({ inbox: get().inbox.filter(m => m.id !== messageId) });
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

    // Treino: Ver Detalhes — marca como lido (o modal de detalhe é aberto no frontend)
    if (actionLabel === 'Ver Detalhes') {
      get().markAsRead(messageId);
      return;
    }

    get().markAsRead(messageId);
  },

  // ============================================================
  // ITEM 9.8.3 - DIRETORIA: RESPONDER COM OPÇÕES
  // ============================================================

  handleBoardReply: (messageId: string, optionId: string) => {
    const state = get();
    const message = state.inbox.find(m => m.id === messageId);
    if (!message) return;

    const option = message.boardReplyOptions?.find(o => o.id === optionId);
    if (!option) return;

    const effects = option.effects;
    const userTeamId = state.selectedTeam;
    const teamIdx = state.teams.findIndex(t => t.id === userTeamId);

    // Apply budget change
    let updatedTeams = state.teams;
    if (effects.budgetChange && teamIdx !== -1) {
      updatedTeams = [...state.teams];
      updatedTeams[teamIdx] = {
        ...updatedTeams[teamIdx],
        budget: Math.max(0, updatedTeams[teamIdx].budget + (effects.budgetChange || 0)),
      };
    }

    // Apply transfer budget change (also affects team budget)
    if (effects.transferBudgetChange && teamIdx !== -1) {
      updatedTeams = [...updatedTeams];
      updatedTeams[teamIdx] = {
        ...updatedTeams[teamIdx],
        budget: Math.max(0, updatedTeams[teamIdx].budget + (effects.transferBudgetChange || 0)),
      };
    }

    // Apply morale change to all squad players of user team
    if (effects.moraleChange && teamIdx !== -1) {
      const moraleDelta = effects.moraleChange;
      updatedTeams = [...updatedTeams];
      updatedTeams[teamIdx] = {
        ...updatedTeams[teamIdx],
        squad: updatedTeams[teamIdx].squad.map(p => ({
          ...p,
          morale: Math.max(0, Math.min(100, p.morale + moraleDelta)),
        })),
      };
    }

    // Apply fan mood change
    let updatedFanMood = state.fanMood;
    if (effects.fanMoodChange) {
      updatedFanMood = {
        ...state.fanMood,
        value: Math.max(0, Math.min(100, state.fanMood.value + (effects.fanMoodChange || 0))),
        trend: (effects.fanMoodChange || 0) > 0 ? 'rising' : (effects.fanMoodChange || 0) < 0 ? 'falling' : state.fanMood.trend,
      };
    }

    // Add board promise if specified
    let updatedBoardPromises = [] as { goal: string; deadline: number; fulfilled: boolean }[];
    if (effects.addBoardPromise && teamIdx !== -1) {
      updatedTeams = [...updatedTeams];
      updatedTeams[teamIdx] = {
        ...updatedTeams[teamIdx],
        boardPromises: [
          ...updatedTeams[teamIdx].boardPromises,
          { goal: effects.addBoardPromise.goal, deadline: effects.addBoardPromise.deadline, fulfilled: false },
        ],
      };
    }

    // Determine category from option id prefix
    const category: BoardReply['category'] = optionId.startsWith('expect') ? 'expectation'
      : optionId.startsWith('comm') ? 'general'
      : optionId.startsWith('meeting') ? 'performance'
      : optionId.startsWith('eval') ? 'performance'
      : 'general';

    const boardReply: BoardReply = {
      messageId,
      subject: message.subject,
      optionId,
      optionLabel: option.label,
      timestamp: Date.now(),
      sent: true,
      satisfactionChange: effects.satisfactionChange,
      budgetChange: effects.budgetChange,
      moraleChange: effects.moraleChange,
      transferBudgetChange: effects.transferBudgetChange,
      fanMoodChange: effects.fanMoodChange,
      category,
    };

    set({
      inbox: state.inbox.map(m => m.id === messageId ? { ...m, boardReply, read: true } : m),
      boardReplies: [...state.boardReplies, boardReply],
      boardSatisfaction: Math.max(-100, Math.min(100, state.boardSatisfaction + effects.satisfactionChange)),
      teams: updatedTeams,
      fanMood: updatedFanMood,
    });
  },
});
