// Geração de Mensagens do Inbox — context-aware

import type { InboxMessage, Team } from '../../types/game';
import { getFullName } from '../../utils/playerName';

export interface GenerateInboxContext {
  teams: Team[];
  selectedTeamId: string | null;
  hasIncomingTransfer: boolean;
  incomingTransferPlayerId?: string;
}

export function generateInboxMessage(week: number, context?: GenerateInboxContext): InboxMessage {
  const userTeam = context?.selectedTeamId
    ? context.teams.find(t => t.id === context.selectedTeamId)
    : null;

  // Build list of possible types based on what makes sense in-context
  const possibleTypes: InboxMessage['type'][] = ['suggestion', 'board', 'financial'];

  if (context?.hasIncomingTransfer && context.incomingTransferPlayerId) {
    possibleTypes.push('transfer');
  }

  if (userTeam) {
    possibleTypes.push('training');
  }

  if (userTeam) {
    possibleTypes.push('youth');
  }

  const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
  const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const ts = Date.now();
  const r = Math.random();
  const randomPriority: InboxMessage['priority'] =
    r < 0.3 ? 'high' : r < 0.7 ? 'medium' : 'low';

  switch (type) {
    case 'transfer': {
      const playerId = context?.incomingTransferPlayerId;
      const player = userTeam?.squad.find(p => p.id === playerId);
      const playerName = player ? getFullName(player) : 'um jogador';
      return {
        id,
        type: 'transfer',
        subject: `Semana ${week}: Proposta de Transferência Recebida`,
        body: `Um clube está interessado em ${playerName} do seu plantel. Avalie a proposta e decida: aceitar, recusar, negociar ou adiar.`,
        priority: 'high',
        timestamp: ts,
        read: false,
        relatedPlayerId: playerId,
      };
    }

    case 'suggestion': {
      const suggestions = [
        { subject: 'Recomendação de Treino Físico', body: 'O auxiliar técnico sugere foco em treino físico esta semana para melhorar a resistência da equipe. Aplique a recomendação ou dispense.' },
        { subject: 'Recomendação Tática', body: 'O auxiliar técnico recomenda trabalhar a coesão tática nas sessões desta semana para melhorar o entrosamento.' },
        { subject: 'Gestão de Carga de Treino', body: 'O departamento médico sugere reduzir a carga de treino para evitar desgaste e prevenir lesões no plantel.' },
      ];
      const sug = suggestions[Math.floor(Math.random() * suggestions.length)];
      return {
        id,
        type: 'suggestion',
        subject: sug.subject,
        body: sug.body,
        priority: randomPriority,
        timestamp: ts,
        read: false,
      };
    }

    case 'training': {
      const responses = [
        'Os jogadores responderam bem ao treino físico desta semana. A evolução dos atributos foi positiva.',
        'A coesão tática melhorou significativamente nos treinos. O entrosamento da equipe está em alta.',
        'O treino técnico desta semana mostrou progressos na finalização e no passe dos atletas.',
        'A carga de treino foi adequada. Os jogadores mantiveram bons níveis de condicionamento.',
      ];
      const body = responses[Math.floor(Math.random() * responses.length)];
      return {
        id,
        type: 'training',
        subject: `Relatório de Treino — Semana ${week}`,
        body,
        priority: 'low',
        timestamp: ts,
        read: false,
      };
    }

    case 'financial': {
      return {
        id,
        type: 'financial',
        subject: 'Relatório Financeiro Disponível',
        body: 'O relatório financeiro da semana está disponível para consulta. Verifique as receitas, despesas, orçamento e o saldo geral do clube.',
        priority: 'medium',
        timestamp: ts,
        read: false,
      };
    }

    case 'board': {
      const boardMessages = [
        { subject: 'Comunicado da Diretoria', body: 'A diretoria faz um comunicado sobre as expectativas do clube para a temporada. Responda para manter o relacionamento.' },
        { subject: 'Reunião com a Diretoria', body: 'A diretoria gostaria de discutir o desempenho recente da equipe e os objetivos para as próximas rodadas.' },
        { subject: 'Avaliação de Desempenho', body: 'A diretoria solicitou uma avaliação de desempenho do elenco e da comissão técnica. Responda com sua análise.' },
        { subject: 'Expectativas de Temporada', body: 'A diretoria reafirma as metas estabelecidas no início da temporada e aguarda seu posicionamento.' },
      ];
      const msg = boardMessages[Math.floor(Math.random() * boardMessages.length)];
      return {
        id,
        type: 'board',
        subject: msg.subject,
        body: msg.body,
        priority: 'medium',
        timestamp: ts,
        read: false,
      };
    }

    case 'youth': {
      return {
        id,
        type: 'youth',
        subject: 'Jovem Promessa Identificada',
        body: 'Um jovem talento foi identificado nas categorias de base. Convocar para o plantel principal ou ignorar a recomendação?',
        priority: 'medium',
        timestamp: ts,
        read: false,
      };
    }

    default: {
      return {
        id,
        type: 'board',
        subject: 'Comunicado do Sistema',
        body: 'Uma nova semana começou. Verifique as novidades do seu clube.',
        priority: 'low',
        timestamp: ts,
        read: false,
      };
    }
  }
}
