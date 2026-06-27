import type { BoardReply } from '../../types/game';

// ============================================================
// CATEGORIAS DE RESPOSTA DA DIRETORIA (Item 9.8.3)
// ============================================================

export const BOARD_REPLY_CATEGORIES: { id: BoardReply['category']; label: string }[] = [
  { id: 'general', label: 'Geral' },
  { id: 'budget', label: 'Orçamento' },
  { id: 'transfer', label: 'Transferências' },
  { id: 'expectation', label: 'Expectativas' },
  { id: 'performance', label: 'Desempenho' },
];
