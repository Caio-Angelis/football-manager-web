import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';
import type { InboxMessage, InjuryReport, BoardReply, FinancialReport } from '../../types/game';
import { BOARD_REPLY_CATEGORIES } from './constants';

// ============================================================
// TIPOS DE MENSAGENS E BOTÕES DE AÇÃO
// ============================================================

export interface ActionButton {
  label: string;
  variant: 'primary' | 'secondary' | 'success';
  onClick: () => void;
}

export interface MessageActions {
  type: string;
  buttons: ActionButton[];
  description: string;
}

const ACTION_MAP: Record<string, MessageActions> = {
  transfer: {
    type: 'transfer',
    description: 'Proposta de transferência ou venda de jogador',
    buttons: [
      { label: 'Aceitar', variant: 'success', onClick: () => {} },
      { label: 'Recusar', variant: 'secondary', onClick: () => {} },
      { label: 'Negociar', variant: 'primary', onClick: () => {} },
      { label: 'Adiar', variant: 'secondary', onClick: () => {} },
    ],
  },
  injury: {
    type: 'injury',
    description: 'Relatório de lesão de jogador',
    buttons: [
      { label: 'Ver Relatório', variant: 'primary', onClick: () => {} },
      { label: 'Marcar Treino', variant: 'secondary', onClick: () => {} },
      { label: 'Marcar como Lido', variant: 'secondary', onClick: () => {} },
    ],
  },
  suggestion: {
    type: 'suggestion',
    description: 'Recomendação do staff técnico',
    buttons: [
      { label: 'Aplicar', variant: 'success', onClick: () => {} },
      { label: 'Dispensar', variant: 'secondary', onClick: () => {} },
      { label: 'Marcar como Lido', variant: 'secondary', onClick: () => {} },
    ],
  },
  board: {
    type: 'board',
    description: 'Comunicação da diretoria',
    buttons: [
      { label: 'Responder', variant: 'primary', onClick: () => {} },
      { label: 'Arquivar', variant: 'secondary', onClick: () => {} },
      { label: 'Marcar como Lido', variant: 'secondary', onClick: () => {} },
    ],
  },
  youth: {
    type: 'youth',
    description: 'Relatório de categorias de base',
    buttons: [
      { label: 'Convocar', variant: 'primary', onClick: () => {} },
      { label: 'Ignorar', variant: 'secondary', onClick: () => {} },
      { label: 'Marcar como Lido', variant: 'secondary', onClick: () => {} },
    ],
  },
  training: {
    type: 'training',
    description: 'Relatório de treinamento',
    buttons: [
      { label: 'Ver Detalhes', variant: 'primary', onClick: () => {} },
      { label: 'Marcar como Lido', variant: 'secondary', onClick: () => {} },
    ],
  },
  financial: {
    type: 'financial',
    description: 'Relatório financeiro',
    buttons: [
      { label: 'Ver Relatório', variant: 'primary', onClick: () => {} },
      { label: 'Arquivar', variant: 'secondary', onClick: () => {} },
      { label: 'Marcar como Lido', variant: 'secondary', onClick: () => {} },
    ],
  },
};

// ============================================================
// ÍCONES E EMOJIS PARA TIPOS DE MENSAGEM
// ============================================================

const MESSAGE_ICONS: Record<string, string> = {
  transfer: '💰',
  injury: '🏥',
  suggestion: '💡',
  board: '👔',
  youth: '🌱',
  training: '🏋️',
  financial: '📊',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#d93025',
  medium: '#f9ab00',
  low: '#5f6368',
};

// ============================================================
// COMPONENTE: MESSAGE CARD
// ============================================================

interface MessageCardProps {
  message: InboxMessage;
  onOpenDetail: (message: InboxMessage) => void;
  onActionClick: (action: ActionButton, message?: InboxMessage) => void;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  onOpenDetail,
  onActionClick,
}) => {
  const actions = ACTION_MAP[message.type] || {
    type: message.type,
    description: 'Mensagem do sistema',
    buttons: [
      { label: 'Ver Detalhes', variant: 'primary', onClick: () => {} },
    ],
  };

  return (
    <div
      className={`fm-inbox-message ${message.read ? '' : 'fm-inbox-message--unread'}`}
    >
      <div className="fm-inbox-message__header">
        <div className="fm-inbox-message__icon">
          <span>{MESSAGE_ICONS[message.type] || '📬'}</span>
        </div>
        <div className="fm-inbox-message__title-area">
          <div className="fm-inbox-message__subject">
            <span className="fm-inbox-message__priority-indicator" style={{
              backgroundColor: PRIORITY_COLORS[message.priority],
            }} />
            <span className="fm-inbox-message__subject-text">{message.subject}</span>
          </div>
          <div className="fm-inbox-message__meta">
            <span className="fm-inbox-message__type-tag">
              {message.type.toUpperCase()}
            </span>
            <span className="fm-inbox-message__time">
              {new Date(message.timestamp).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        <div className="fm-inbox-message__unread-dot" />
      </div>

      <div className="fm-inbox-message__body" onClick={() => onOpenDetail(message)}>
        <p>{message.body}</p>
      </div>

      <div className="fm-inbox-message__actions">
        <div className="fm-inbox-message__actions-desc">
          {actions.description}
        </div>
        <div className="fm-inbox-message__actions-buttons">
          {actions.buttons.map((btn) => (
            <Button
              key={btn.label}
              variant={btn.variant}
              onClick={() => onActionClick(btn, message)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: MESSAGE DETAIL MODAL
// ============================================================

interface MessageDetailModalProps {
  message: InboxMessage | null;
  onClose: () => void;
  onActionClick: (action: ActionButton, message?: InboxMessage) => void;
}

export const MessageDetailModal: React.FC<MessageDetailModalProps> = ({
  message,
  onClose,
  onActionClick,
}) => {
  const noMessage = !message;

  // Estado vazio — sem mensagem selecionada
  if (noMessage) {
    return (
      <div className="fm-modal-overlay" onClick={onClose}>
        <div className="fm-modal fm-modal--large" onClick={(e) => e.stopPropagation()}>
          <div className="fm-modal__header">
            <div className="fm-modal__title-area">
              <span className="fm-modal__icon">📬</span>
              <h2 className="fm-modal__title">Detalhes da Mensagem</h2>
            </div>
            <button className="fm-modal__close" onClick={onClose}>×</button>
          </div>

          <div className="fm-modal__body fm-modal__body--empty">
            <div className="fm-empty-message">
              <span className="fm-empty-message__icon">📭</span>
              <p className="fm-empty-message__text">
                Selecione uma mensagem para ver detalhes e ações.
              </p>
              <p className="fm-empty-message__hint">
                Clique em qualquer mensagem na lista ao lado.
              </p>
            </div>
          </div>

          <div className="fm-modal__footer">
            <div className="fm-modal__actions">
              {/* Botões visíveis mas desabilitados */}
              {['Ver Detalhes', 'Arquivar', 'Marcar como Lido'].map((label) => (
                <Button
                  key={label}
                  variant="secondary"
                  disabled={true}
                  onClick={() => {}}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Com mensagem — renderização normal
  const actions = ACTION_MAP[message.type] || {
    type: message.type,
    description: 'Mensagem do sistema',
    buttons: [
      { label: 'Ver Detalhes', variant: 'primary', onClick: () => {} },
    ],
  };

  return (
    <div className="fm-modal-overlay" onClick={onClose}>
      <div className="fm-modal fm-modal--large" onClick={(e) => e.stopPropagation()}>
        <div className="fm-modal__header">
          <div className="fm-modal__title-area">
            <span className="fm-modal__icon">
              {MESSAGE_ICONS[message.type] || '📬'}
            </span>
            <h2 className="fm-modal__title">{message.subject}</h2>
          </div>
          <button className="fm-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="fm-modal__meta">
          <span className="fm-modal__type-tag">
            {message.type.toUpperCase()}
          </span>
          <span className="fm-modal__priority">
            Prioridade: {message.priority === 'high' ? 'ALTA' : message.priority === 'medium' ? 'MÉDIA' : 'BAIXA'}
          </span>
          <span className="fm-modal__date">
            {new Date(message.timestamp).toLocaleDateString('pt-BR')}
          </span>
        </div>

        <div className="fm-modal__body">
          <p>{message.body}</p>
        </div>

        <div className="fm-modal__footer">
          <div className="fm-modal__actions">
            {actions.buttons.map((btn) => (
              <Button
                key={btn.label}
                variant={btn.variant}
                onClick={() => {
                  onActionClick(btn, message);
                  onClose();
                }}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: MODAL DE RELATÓRIO DE LESÃO (Item 9.8.2)
// ============================================================

interface InjuryReportModalProps {
  report: InjuryReport | null;
  onClose: () => void;
}

const SEVERITY_LABELS: Record<string, string> = {
  minor: 'Leve',
  moderate: 'Moderada',
  severe: 'Grave',
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#4caf50',
  moderate: '#ff9800',
  severe: '#d93025',
};

const INJURY_TYPE_LABELS: Record<string, string> = {
  muscle: 'Lesão Muscular',
  ligament: 'Lesão Ligamentar',
  joint: 'Lesão Articular',
  ankle: 'Entorse do Tornozelo',
  knee: 'Lesão do Joelho',
  groin: 'Lesão de Adutores (Virilha)',
};

export const InjuryReportModal: React.FC<InjuryReportModalProps> = ({ report, onClose }) => {
  if (!report) return null;

  return (
    <div className="fm-modal-overlay" onClick={onClose}>
      <div className="fm-modal fm-modal--large" onClick={(e) => e.stopPropagation()}>
        <div className="fm-modal__header">
          <div className="fm-modal__title-area">
            <span className="fm-modal__icon">🏥</span>
            <h2 className="fm-modal__title">Relatório Médico - Lesão</h2>
          </div>
          <button className="fm-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="fm-modal__meta">
          <span className="fm-modal__player-name">
            <strong>Jogador:</strong> {report.playerName}
          </span>
          <span className="fm-modal__position">
            <strong>Posição:</strong> {report.position}
          </span>
          <span className="fm-modal__severity">
            <strong>Gravidade:</strong>{' '}
            <span style={{ color: SEVERITY_COLORS[report.severity] }}>
              {SEVERITY_LABELS[report.severity]}
            </span>
          </span>
        </div>

        <div className="fm-modal__body">
          <div className="fm-injury-report">
            <div className="fm-injury-report__section">
              <h3 className="fm-injury-report__section-title">Detalhes da Lesão</h3>
              <div className="fm-injury-report__grid">
                <div className="fm-injury-report__field">
                  <span className="fm-injury-report__label">Tipo:</span>
                  <span className="fm-injury-report__value">
                    {INJURY_TYPE_LABELS[report.injuryType] || report.injuryType}
                  </span>
                </div>
                <div className="fm-injury-report__field">
                  <span className="fm-injury-report__label">Afastamento:</span>
                  <span className="fm-injury-report__value">{report.daysOut} dias</span>
                </div>
                <div className="fm-injury-report__field">
                  <span className="fm-injury-report__label">Recuperação:</span>
                  <span className="fm-injury-report__value">{report.recoveryProgress}%</span>
                </div>
                <div className="fm-injury-report__field">
                  <span className="fm-injury-report__label">Propensão:</span>
                  <span className="fm-injury-report__value">{report.injuryProneness}/10</span>
                </div>
              </div>
            </div>

            <div className="fm-injury-report__section">
              <h3 className="fm-injury-report__section-title">Tratamento Recomendado</h3>
              <p className="fm-injury-report__text">{report.treatment}</p>
            </div>

            <div className="fm-injury-report__section">
              <h3 className="fm-injury-report__section-title">Prognóstico</h3>
              <p className="fm-injury-report__text">{report.prognosis}</p>
            </div>

            <div className="fm-injury-report__progress-bar">
              <div className="fm-injury-report__progress-track">
                <div
                  className="fm-injury-report__progress-fill"
                  style={{ width: `${report.recoveryProgress}%` }}
                />
              </div>
              <span className="fm-injury-report__progress-label">
                Progresso da Recuperação: {report.recoveryProgress}%
              </span>
            </div>
          </div>
        </div>

        <div className="fm-modal__footer">
          <button className="fm-modal__close-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: MODAL DE RELATÓRIO FINANCEIRO (Item 9.8.4)
// ============================================================

interface FinancialReportModalProps {
  report: FinancialReport | null;
  onClose: () => void;
}

const PROFIT_COLORS: Record<string, string> = {
  positive: '#4caf50',
  negative: '#d93025',
  neutral: '#ff9800',
};

export const FinancialReportModal: React.FC<FinancialReportModalProps> = ({ report, onClose }) => {
  if (!report) return null;

  const profitStatus = report.profit > 0 ? 'positive' : report.profit < 0 ? 'negative' : 'neutral';

  const formatCurrency = (value: number) => {
    const isMillions = Math.abs(value) >= 1;
    const displayValue = isMillions ? value : value * 1000;
    return `R$ ${displayValue.toFixed(2)}M`;
  };

  return (
    <div className="fm-modal-overlay" onClick={onClose}>
      <div className="fm-modal fm-modal--large" onClick={(e) => e.stopPropagation()}>
        <div className="fm-modal__header">
          <div className="fm-modal__title-area">
            <span className="fm-modal__icon">📊</span>
            <h2 className="fm-modal__title">Relatório Financeiro</h2>
          </div>
          <button className="fm-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="fm-modal__meta">
          <span className="fm-modal__team-name">
            <strong>Clube:</strong> {report.teamName}
          </span>
          <span className="fm-modal__season-week">
            <strong>Temporada:</strong> {report.season} | <strong>Semana:</strong> {report.week}
          </span>
          <span className="fm-modal__currency">
            Moeda: {report.currency}
          </span>
        </div>

        <div className="fm-modal__body">
          <div className="fm-financial-report">
            {/* Resumo Financeiro */}
            <div className="fm-financial-report__section">
              <h3 className="fm-financial-report__section-title">Resumo Financeiro</h3>
              <div className="fm-financial-report__grid">
                <div className="fm-financial-report__field">
                  <span className="fm-financial-report__label">Orçamento:</span>
                  <span className="fm-financial-report__value">{formatCurrency(report.budget)}</span>
                </div>
                <div className="fm-financial-report__field">
                  <span className="fm-financial-report__label">Folha Salarial:</span>
                  <span className="fm-financial-report__value">{formatCurrency(report.wageBill)}</span>
                </div>
                <div className="fm-financial-report__field">
                  <span className="fm-financial-report__label">Lucro:</span>
                  <span className="fm-financial-report__value" style={{ color: PROFIT_COLORS[profitStatus] }}>
                    {profitStatus === 'positive' ? '+' : ''}{formatCurrency(report.profit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Receitas */}
            <div className="fm-financial-report__section">
              <h3 className="fm-financial-report__section-title">Receitas</h3>
              <div className="fm-financial-report__grid">
                <div className="fm-financial-report__field">
                  <span className="fm-financial-report__label">Bilheteria:</span>
                  <span className="fm-financial-report__value">{formatCurrency(report.ticketRevenue)}</span>
                </div>
                <div className="fm-financial-report__field">
                  <span className="fm-financial-report__label">Patrocínio:</span>
                  <span className="fm-financial-report__value">{formatCurrency(report.sponsorshipRevenue)}</span>
                </div>
                <div className="fm-financial-report__field fm-financial-report__field--total">
                  <span className="fm-financial-report__label"><strong>Total:</strong></span>
                  <span className="fm-financial-report__value"><strong>{formatCurrency(report.totalIncome)}</strong></span>
                </div>
              </div>
            </div>

            {/* Despesas */}
            <div className="fm-financial-report__section">
              <h3 className="fm-financial-report__section-title">Despesas</h3>
              <div className="fm-financial-report__grid">
                <div className="fm-financial-report__field">
                  <span className="fm-financial-report__label">Salários:</span>
                  <span className="fm-financial-report__value">{formatCurrency(report.wageBill)}</span>
                </div>
                <div className="fm-financial-report__field">
                  <span className="fm-financial-report__label">Outras:</span>
                  <span className="fm-financial-report__value">
                    {formatCurrency(report.totalExpenses - report.wageBill * 0.01)}
                  </span>
                </div>
                <div className="fm-financial-report__field fm-financial-report__field--total">
                  <span className="fm-financial-report__label"><strong>Total:</strong></span>
                  <span className="fm-financial-report__value"><strong>{formatCurrency(report.totalExpenses)}</strong></span>
                </div>
              </div>
            </div>

            {/* Transferências */}
            <div className="fm-financial-report__section">
              <h3 className="fm-financial-report__section-title">Transferências</h3>
              <div className="fm-financial-report__grid">
                <div className="fm-financial-report__field">
                  <span className="fm-financial-report__label">Gastos:</span>
                  <span className="fm-financial-report__value">{formatCurrency(report.transferSpending)}</span>
                </div>
                <div className="fm-financial-report__field">
                  <span className="fm-financial-report__label">Recebidos:</span>
                  <span className="fm-financial-report__value">{formatCurrency(report.transferIncome)}</span>
                </div>
              </div>
            </div>

            {/* Prazo */}
            <div className="fm-financial-report__section">
              <h3 className="fm-financial-report__section-title">Informações do Período</h3>
              <div className="fm-financial-report__grid">
                <div className="fm-financial-report__field">
                  <span className="fm-financial-report__label">Dias até Deadline:</span>
                  <span className="fm-financial-report__value">{report.daysUntilDeadline} dias</span>
                </div>
              </div>
            </div>

            {/* Barra de status do lucro */}
            <div className="fm-financial-report__profit-bar">
              <div className="fm-financial-report__profit-track">
                <div
                  className="fm-financial-report__profit-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, 50 + report.profit * 200))}%`,
                    backgroundColor: PROFIT_COLORS[profitStatus],
                  }}
                />
              </div>
              <span className="fm-financial-report__profit-label">
                Status Financeiro: {profitStatus === 'positive' ? 'Lucrativo' : profitStatus === 'negative' ? 'Prejuízo' : 'Equilibrado'}
              </span>
            </div>
          </div>
        </div>

        <div className="fm-modal__footer">
          <button className="fm-modal__close-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: INBOX VIEW PRINCIPAL
// ============================================================

export const InboxView: React.FC = () => {
  const { inbox, selectedTeam, teams, handleInboxAction, getInjuryReport, handleBoardReply, boardSatisfaction, getFinancialReport } = useGameStore();
  const [activeFilter, setActiveFilter] = React.useState<string>('all');
  const [activePriority, setActivePriority] = React.useState<string>('all');
  const [selectedMessage, setSelectedMessage] = React.useState<InboxMessage | null>(null);
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);
  const [injuryReport, setInjuryReport] = React.useState<InjuryReport | null>(null);
  const [showInjuryReport, setShowInjuryReport] = React.useState(false);
  // Item 9.8.3 - Diretoria: Responder
  const [showBoardReply, setShowBoardReply] = React.useState(false);
  const [boardReplyMessage, setBoardReplyMessage] = React.useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = React.useState('');
  const [replyCategory, setReplyCategory] = React.useState<BoardReply['category']>('general');
  // Item 9.8.4 - Financeiro: Ver Relatório
  const [showFinancialReport, setShowFinancialReport] = React.useState(false);
  const [financialReport, setFinancialReport] = React.useState<FinancialReport | null>(null);

  const userTeam = teams.find(t => t.id === selectedTeam);

  // Filtrar mensagens
  const filteredMessages = inbox.filter((msg) => {
    const typeMatch = activeFilter === 'all' || msg.type === activeFilter;
    const priorityMatch = activePriority === 'all' || msg.priority === activePriority;
    return typeMatch && priorityMatch;
  });

  // Contar mensagens não lidas
  const unreadCount = inbox.filter(m => !m.read).length;

  // Abrir detalhe da mensagem
  const handleOpenDetail = (message: InboxMessage) => {
    setSelectedMessage(message);
  };

  // Fechar detalhe
  const handleCloseDetail = () => {
    setSelectedMessage(null);
  };

  // Lidar com ação do botão - delega para o store
  const handleActionClick = (action: ActionButton, message?: InboxMessage) => {
    if (!message) return;

    // Item 9.8.2 - Lesão: Ver Relatório - abre modal de relatório
    if (action.label === 'Ver Relatório' && message.type === 'injury' && message.relatedPlayerId) {
      const report = getInjuryReport(message.relatedPlayerId);
      if (report) {
        setInjuryReport(report);
        setShowInjuryReport(true);
      }
    }

    // Item 9.8.3 - Diretoria: Responder - abre modal de resposta
    if (action.label === 'Responder' && message.type === 'board') {
      setBoardReplyMessage(message);
      setShowBoardReply(true);
      setReplyText('');
      return;
    }

    // Item 9.8.4 - Financeiro: Ver Relatório - abre modal de relatório financeiro
    if (action.label === 'Ver Relatório' && message.type === 'financial') {
      const report = getFinancialReport();
      if (report) {
        setFinancialReport(report);
        setShowFinancialReport(true);
      }
    }

    handleInboxAction(message.id, action.label);
    setActionFeedback(`Ação: ${action.label} executada!`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Item 9.8.3 - Enviar resposta da diretoria
  const handleBoardReplySubmit = () => {
    if (!boardReplyMessage || !replyText.trim()) return;
    handleBoardReply(boardReplyMessage.id, replyText.trim(), replyCategory);
    setActionFeedback(`Resposta à diretoria enviada (categoria: ${BOARD_REPLY_CATEGORIES.find(c => c.id === replyCategory)?.label})`);
    setTimeout(() => setActionFeedback(null), 4000);
    setShowBoardReply(false);
    setBoardReplyMessage(null);
    setReplyText('');
  };

  return (
    <div className="fm-inbox-view">
      {/* Header */}
      <div className="fm-inbox-view__header">
        <div>
          <h1 className="fm-inbox-view__title">
            Caixa de Entrada
            {unreadCount > 0 && (
              <span className="fm-inbox-view__unread-badge">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="fm-inbox-view__subtitle">
            {userTeam ? userTeam.name : 'Time Selecionado'}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="fm-inbox-view__filters">
        <div className="fm-inbox-view__filter-group">
          <span className="fm-inbox-view__filter-label">Tipo:</span>
          <div className="fm-inbox-view__filter-buttons">
            <button
              className={`fm-inbox-view__filter-btn ${activeFilter === 'all' ? 'fm-inbox-view__filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Todas
            </button>
            {['transfer', 'injury', 'suggestion', 'board', 'youth', 'training', 'financial'].map((type) => (
              <button
                key={type}
                className={`fm-inbox-view__filter-btn ${activeFilter === type ? 'fm-inbox-view__filter-btn--active' : ''}`}
                onClick={() => setActiveFilter(type)}
              >
                {MESSAGE_ICONS[type]} {type}
              </button>
            ))}
          </div>
        </div>

        <div className="fm-inbox-view__filter-group">
          <span className="fm-inbox-view__filter-label">Prioridade:</span>
          <div className="fm-inbox-view__filter-buttons">
            <button
              className={`fm-inbox-view__filter-btn ${activePriority === 'all' ? 'fm-inbox-view__filter-btn--active' : ''}`}
              onClick={() => setActivePriority('all')}
            >
              Todas
            </button>
            <button
              className={`fm-inbox-view__filter-btn ${activePriority === 'high' ? 'fm-inbox-view__filter-btn--active' : ''}`}
              onClick={() => setActivePriority('high')}
            >
              Alta
            </button>
            <button
              className={`fm-inbox-view__filter-btn ${activePriority === 'medium' ? 'fm-inbox-view__filter-btn--active' : ''}`}
              onClick={() => setActivePriority('medium')}
            >
              Média
            </button>
            <button
              className={`fm-inbox-view__filter-btn ${activePriority === 'low' ? 'fm-inbox-view__filter-btn--active' : ''}`}
              onClick={() => setActivePriority('low')}
            >
              Baixa
            </button>
          </div>
        </div>
      </div>

      {/* Lista de mensagens */}
      <div className="fm-inbox-view__list">
        {filteredMessages.length === 0 ? (
          <div className="fm-empty">
            <p>Nenhuma mensagem encontrada para os filtros selecionados.</p>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onOpenDetail={handleOpenDetail}
              onActionClick={handleActionClick}
            />
          ))
        )}
      </div>

      {/* Feedback de ação */}
      {actionFeedback && (
        <div className="fm-inbox-view__action-feedback">
          {actionFeedback}
        </div>
      )}

      {/* Modal de detalhe */}
      <MessageDetailModal
        message={selectedMessage}
        onClose={handleCloseDetail}
        onActionClick={handleActionClick}
      />

      {/* Modal de relatório de lesão (Item 9.8.2) */}
      {showInjuryReport && injuryReport && (
        <InjuryReportModal
          report={injuryReport}
          onClose={() => {
            setShowInjuryReport(false);
            setInjuryReport(null);
          }}
        />
      )}

      {/* Modal de relatório financeiro (Item 9.8.4) */}
      {showFinancialReport && financialReport && (
        <FinancialReportModal
          report={financialReport}
          onClose={() => {
            setShowFinancialReport(false);
            setFinancialReport(null);
          }}
        />
      )}

      {/* Modal de resposta à diretoria (Item 9.8.3) */}
      {showBoardReply && boardReplyMessage && (
        <div className="fm-modal-overlay" onClick={() => setShowBoardReply(false)}>
          <div className="fm-modal fm-modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="fm-modal__header">
              <div className="fm-modal__title-area">
                <span className="fm-modal__icon">👔</span>
                <h2 className="fm-modal__title">Responder à Diretoria</h2>
              </div>
              <button className="fm-modal__close" onClick={() => setShowBoardReply(false)}>×</button>
            </div>

            <div className="fm-modal__meta">
              <span className="fm-modal__subject-line">
                <strong>Assunto original:</strong> {boardReplyMessage.subject}
              </span>
              <span className="fm-modal__priority">
                Prioridade: {boardReplyMessage.priority === 'high' ? 'ALTA' : boardReplyMessage.priority === 'medium' ? 'MÉDIA' : 'BAIXA'}
              </span>
            </div>

            <div className="fm-modal__body">
              <div className="fm-board-reply">
                <div className="fm-board-reply__original">
                  <h3 className="fm-board-reply__section-title">Mensagem da Diretoria</h3>
                  <p className="fm-board-reply__text">{boardReplyMessage.body}</p>
                </div>

                <div className="fm-board-reply__reply-section">
                  <h3 className="fm-board-reply__section-title">Sua Resposta</h3>

                  <label className="fm-board-reply__label">
                    <strong>Categoria da resposta:</strong>
                    <select
                      id="board-reply-category"
                      name="board-reply-category"
                      className="fm-board-reply__select"
                      value={replyCategory}
                      onChange={(e) => setReplyCategory(e.target.value as BoardReply['category'])}
                    >
                      {BOARD_REPLY_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </label>

                  <textarea
                    id="board-reply-text"
                    name="board-reply-text"
                    className="fm-board-reply__textarea"
                    placeholder="Escreva sua resposta aqui..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={8}
                    maxLength={500}
                  />
                  <div className="fm-board-reply__char-count">
                    {replyText.length}/500 caracteres
                  </div>
                </div>

                <div className="fm-board-reply__satisfaction-preview">
                  <h3 className="fm-board-reply__section-title">Satisfação Atual da Diretoria</h3>
                  <div className="fm-board-reply__satisfaction-bar">
                    <div
                      className="fm-board-reply__satisfaction-fill"
                      style={{
                        width: `${Math.max(0, Math.min(100, boardSatisfaction + 100))}%`,
                        backgroundColor: boardSatisfaction >= 50 ? '#4caf50' : boardSatisfaction >= 0 ? '#ff9800' : '#d93025',
                      }}
                    />
                  </div>
                  <span className="fm-board-reply__satisfaction-value">
                    {boardSatisfaction >= 50 ? 'Positivo' : boardSatisfaction >= 0 ? 'Neutro' : 'Negativo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="fm-modal__footer">
              <button
                className="fm-modal__close-btn"
                onClick={() => setShowBoardReply(false)}
              >
                Cancelar
              </button>
              <Button
                variant="primary"
                onClick={handleBoardReplySubmit}
                disabled={!replyText.trim()}
              >
                Enviar Resposta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
