// Tipos de Árvore Social (Item 11.5)

export interface SocialNode {
  playerId: string;
  playerName: string;
  position: string;
  socialGroup: string;
  influence: number; // 0-100, baseado em liderança e squadStatus
  connections: string[]; // IDs de jogadores que se conectam diretamente
  depth?: number; // profundidade na hierarquia social
}

export interface SocialTree {
  rootNodeId: string | null; // jogador central da equipe
  nodes: SocialNode[];
  edges: { from: string; to: string; strength: number }[];
  generatedWeek: number; // semana em que foi gerada
}
