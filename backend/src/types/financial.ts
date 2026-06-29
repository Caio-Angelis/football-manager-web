// Tipos Financeiros e de Diretoria

// ============================================================
// RELATÓRIO FINANCEIRO (Item 9.8.4)
// ============================================================

export interface FinancialReport {
  teamId: string;
  teamName: string;
  budget: number; // em milhões
  wageBill: number; // em milhões
  ticketRevenue: number; // em milhões
  sponsorshipRevenue: number; // em milhões
  totalIncome: number; // em milhões
  facilityCosts: number; // em milhões (semanal)
  totalExpenses: number; // em milhões
  profit: number; // em milhões
  transferSpending: number; // em milhões
  transferIncome: number; // em milhões
  season: number;
  week: number;
  daysUntilDeadline: number; // dias até o fim do período
  currency: 'BRL';
}

// ============================================================
// RESPOSTA À DIRETORIA (Item 9.8.3)
// ============================================================

export interface BoardReply {
  messageId: string;
  subject: string;
  response: string;
  timestamp: number;
  sent: boolean;
  // Efeito na satisfação da diretoria (-100 a 100)
  satisfactionChange: number;
  category: 'budget' | 'transfer' | 'expectation' | 'performance' | 'general';
}
