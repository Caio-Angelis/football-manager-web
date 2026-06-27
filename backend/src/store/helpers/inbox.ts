// Geração de Mensagens do Inbox

import type { InboxMessage } from '../../types/game';

export function generateInboxMessage(week: number): InboxMessage {
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
