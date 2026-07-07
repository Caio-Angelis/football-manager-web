// Geração de Mensagens do Inbox — context-aware

import type { InboxMessage, Team } from '../../types/game';
import type { BoardReplyOption } from '../../types/financial';
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
      const boardMessages: {
        subject: string;
        body: string;
        options: BoardReplyOption[];
      }[] = [
        {
          subject: 'Expectativas de Temporada',
          body: 'A diretoria reafirma as metas estabelecidas no início da temporada e aguarda seu posicionamento.',
          options: [
            {
              id: 'expect_ambitious',
              label: 'Vamos lutar pelo título!',
              description: 'Demonstra ambição e compromete o elenco com metas altas.',
              effects: {
                satisfactionChange: 15,
                moraleChange: 5,
                fanMoodChange: 8,
                addBoardPromise: { goal: 'fight_for_title', deadline: 38 },
              },
            },
            {
              id: 'expect_realistic',
              label: 'Vamos garantir a permanência primeiro',
              description: 'Postura realista, foco na estabilidade do clube.',
              effects: {
                satisfactionChange: 5,
                moraleChange: 0,
                fanMoodChange: -3,
              },
            },
            {
              id: 'expect_investment',
              label: 'Precisamos de mais investimentos para alcançar as metas',
              description: 'Pede reforços financeiros. A diretoria pode ceder ou não.',
              effects: {
                satisfactionChange: -8,
                budgetChange: 3,
                moraleChange: 3,
                fanMoodChange: 2,
              },
            },
            {
              id: 'expect_critical',
              label: 'As metas estão muito altas para o elenco atual',
              description: 'Crítica aberta às expectativas. Pode irritar a diretoria.',
              effects: {
                satisfactionChange: -18,
                moraleChange: -5,
                fanMoodChange: -5,
              },
            },
          ],
        },
        {
          subject: 'Comunicado da Diretoria',
          body: 'A diretoria faz um comunicado sobre as expectativas do clube para a temporada. Responda para manter o relacionamento.',
          options: [
            {
              id: 'comm_acknowledge',
              label: 'Entendido, vamos trabalhar',
              description: 'Aceita o comunicado de forma profissional.',
              effects: {
                satisfactionChange: 10,
                moraleChange: 2,
              },
            },
            {
              id: 'comm_autonomy',
              label: 'Preciso de mais autonomia técnica',
              description: 'Pede independência nas decisões futebolísticas.',
              effects: {
                satisfactionChange: -5,
                moraleChange: 5,
                fanMoodChange: 3,
              },
            },
            {
              id: 'comm_plan',
              label: 'Vou apresentar um plano detalhado',
              description: 'Propõe apresentar um plano estratégico completo.',
              effects: {
                satisfactionChange: 15,
                moraleChange: 5,
                fanMoodChange: 2,
              },
            },
            {
              id: 'comm_disagree',
              label: 'Não concordo com a abordagem',
              description: 'Desafia a diretoria abertamente. Arriscado.',
              effects: {
                satisfactionChange: -15,
                moraleChange: 8,
                fanMoodChange: 5,
              },
            },
          ],
        },
        {
          subject: 'Reunião com a Diretoria',
          body: 'A diretoria gostaria de discutir o desempenho recente da equipe e os objetivos para as próximas rodadas.',
          options: [
            {
              id: 'meeting_improve',
              label: 'O desempenho vai melhorar',
              description: 'Promete melhoria imediata nos resultados.',
              effects: {
                satisfactionChange: 8,
                moraleChange: 3,
                addBoardPromise: { goal: 'improve_performance', deadline: 6 },
              },
            },
            {
              id: 'meeting_reinforce',
              label: 'Precisamos de reforços no próximo mercado',
              description: 'Solicita novos jogadores para melhorar o elenco.',
              effects: {
                satisfactionChange: -5,
                transferBudgetChange: 5,
                moraleChange: 2,
              },
            },
            {
              id: 'meeting_competitive',
              label: 'O elenco é competitivo, os resultados virão',
              description: 'Confia no elenco atual e demonstra segurança.',
              effects: {
                satisfactionChange: 5,
                moraleChange: 5,
                fanMoodChange: 3,
              },
            },
            {
              id: 'meeting_rebuild',
              label: 'Estamos em processo de reconstrução',
              description: 'Pede paciência, argumenta que o projeto é de longo prazo.',
              effects: {
                satisfactionChange: 3,
                moraleChange: -3,
                fanMoodChange: -2,
              },
            },
          ],
        },
        {
          subject: 'Avaliação de Desempenho',
          body: 'A diretoria solicitou uma avaliação de desempenho do elenco e da comissão técnica. Responda com sua análise.',
          options: [
            {
              id: 'eval_results_will_come',
              label: 'Os resultados vão vir, o trabalho está bom',
              description: 'Confia no processo e defende o trabalho atual.',
              effects: {
                satisfactionChange: 5,
                moraleChange: 5,
              },
            },
            {
              id: 'eval_need_time',
              label: 'O elenco precisa de mais tempo para entrosar',
              description: 'Pede paciência, justifica com tempo de adaptação.',
              effects: {
                satisfactionChange: 3,
                moraleChange: -3,
                fanMoodChange: -2,
              },
            },
            {
              id: 'eval_tactical_change',
              label: 'Vou mudar a abordagem tática',
              description: 'Propõe mudanças táticas para melhorar resultados.',
              effects: {
                satisfactionChange: 12,
                moraleChange: 5,
                fanMoodChange: 5,
              },
            },
            {
              id: 'eval_accept_criticism',
              label: 'Aceito a crítica, vamos corrigir',
              description: 'Aceita a crítica da diretoria com humildade.',
              effects: {
                satisfactionChange: 15,
                moraleChange: -5,
                fanMoodChange: -3,
              },
            },
          ],
        },
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
        boardReplyOptions: msg.options,
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
