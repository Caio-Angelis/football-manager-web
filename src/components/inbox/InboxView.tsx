import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';
import type { InboxMessage } from '../../types/game';

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
  if (!message) return null;

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
// COMPONENTE: INBOX VIEW PRINCIPAL
// ============================================================

export const InboxView: React.FC = () => {
  const { inbox, selectedTeam, teams, handleInboxAction } = useGameStore();
  const [activeFilter, setActiveFilter] = React.useState<string>('all');
  const [activePriority, setActivePriority] = React.useState<string>('all');
  const [selectedMessage, setSelectedMessage] = React.useState<InboxMessage | null>(null);
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);

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

  // Lidar com ação do botão - implementa ações reais
  const handleActionClick = (action: ActionButton, message?: InboxMessage) => {
    if (!message) return;
    handleInboxAction(message.id, action.label);
    setActionFeedback(`Ação: ${action.label} executada!`);
    setTimeout(() => setActionFeedback(null), 3000);
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
    </div>
  );
};
