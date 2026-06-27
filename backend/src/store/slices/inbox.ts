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
});
