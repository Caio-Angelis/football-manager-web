// Tipos de Mensagens (Inbox)

import type { BoardReply, BoardReplyOption } from './financial';

export interface InboxMessage {
  id: string;
  type: 'transfer' | 'injury' | 'suggestion' | 'board' | 'youth' | 'training' | 'financial' | 'news';
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  relatedPlayerId?: string;
  relatedTeamId?: string;
  // Item 9.8.3 - Diretoria: Responder
  boardReply?: BoardReply;
  boardReplyOptions?: BoardReplyOption[];
}
