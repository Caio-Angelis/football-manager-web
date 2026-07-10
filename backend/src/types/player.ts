// Tipos de Jogador - Atributos, personalidade e dados do jogador

// ============================================================
// ATRIBUTOS DE JOGADOR (Escala 1-20)
// ============================================================

export interface PlayerAttribute {
  // Técnicos
  heading: number;        // Cabeceamento
  crossing: number;       // Cruzamentos
  tackling: number;       // Desarme
  technique: number;      // Técnica
  finishing: number;      // Finalização
  passing: number;        // Passe
  firstTouch: number;     // Primeiro Toque
  dribbling: number;      // Fintas
  marking: number;        // Marcação
  freeKicks: number;      // Livres
  longShots: number;      // Grandes Penalidades
  throwIns: number;       // Lançamentos Linha Lateral
  
  // Mentais
  aggression: number;     // Agressividade
  anticipation: number;   // Antecipação
  bravery: number;        // Bravura
  composure: number;      // Compostura
  concentration: number;  // Concentração
  decisions: number;      // Decisões
  determination: number;  // Determinação
  improvise: number;      // Imprevisto
  positioning: number;    // Posicionamento
  leadership: number;     // Liderança
  teamWork: number;       // Trabalho de Equipe
  vision: number;         // Visão de Jogo
  offBall: number;        // Sem Bola
  workRate: number;       // Índice de Trabalho
  
  // Físicos
  acceleration: number;   // Aceleração
  speed: number;          // Velocidade
  strength: number;       // Força
  stamina: number;        // Resistência
  agility: number;        // Agilidade
  naturalFitness: number; // Aptidão Física Natural
  jumping: number;        // Impulsão
  balance: number;        // Equilíbrio
}

// GK exclusivos
export interface GKAttributes {
  aerialReach: number;
  commandOfArea: number;
  communication: number;
  eccentricity: number;
  handballing: number;
  punching: number;
  throwing: number;
  reflexes: number;
  rushing: number;
  tendencyToCome: number;
  oneOnOne: number;
}

// Métricas ocultas de personalidade
export interface HiddenAttributes {
  consistency: number;      // 1-5
  injuryProneness: number;  // 1-10
  bigGameImportance: number;// 1-5
  dirtiness: number;        // 1-5
  adaptability: number;     // 1-5
  ambition: number;         // 1-5
  loyalty: number;          // 1-5
  pressure: number;         // 1-5
  professionalism: number;  // 1-5
  sportsmanship: number;    // 1-5
  temperament: number;      // 1-5
}

// Promessas ao jogador
export interface PlayerPromise {
  goal: string;
  deadline: number; // em semanas restantes
  originalDeadline?: number; // prazo original (para barra de progresso)
  fulfilled: boolean;
}

// ============================================================
// JOGADOR
// ============================================================

export interface Player {
  id: string;
  name: string;
  surname: string;
  position: string; // 'GK', 'DEF', 'MID', 'FWD'
  secondaryPositions: string[]; // Posições secundárias
  positionProficiency: Record<string, number>; // 1-20 por posição
  
  age: number;
  nationality: string;
  country: string; // Para geração de nomes
  
  // Atributos 1-20
  technical: PlayerAttribute;
  mental: Partial<PlayerAttribute>; // Alguns mentais são comuns
  physical: Partial<PlayerAttribute>; // Alguns físicos são comuns
  
  // GK exclusivos
  goalkeeping?: GKAttributes;
  
  // Métricas ocultas
  hidden: HiddenAttributes;
  
  // CA e PA (1-200)
  currentAbility: number;
  potentialAbility: number; // Estático, nunca muda
  
  // Valor e contrato
  marketValue: number;      // em milhões de R$
  salary: number;           // em milhares de R$ por semana
  contractEnd: number;      // em semanas
  contractClause: number;   // cláusula de rescisão
  
  // Status
  morale: number;           // 0-100
  form: number;             // 0-100
  fitness: number;          // 0-100
  injury: {
    active: boolean;
    daysRemaining: number;
    totalDays: number;
    type: string;
    severity: 'minor' | 'moderate' | 'severe';
    source: 'training' | 'match' | 'random';
  } | null;
  
  // Hierarquia no plantel
  squadStatus: string;      // 'Key Player', 'Regular Starter', 'Rotation', 'Young Talent', 'Excess'
  
  // Dinâmica
  teamMates: string[];      // IDs de jogadores que se dão bem
  socialGroup: string | null; // ID do grupo social
  
  // Promessas ativas
  promises: PlayerPromise[];
  
  // Tratamento pelo treinador (11.4)
  coachTreatment: {
    type: 'starter' | 'substitute' | 'bench' | 'training' | 'rest';
    minutesPerWeek: number; // minutos semanais alocados
    trustLevel: number; // 1-100
    lastTrainingLoad: number; // 0-100
  };
  
  // Gestão de carga e prevenção de lesões
  consecutivePhysicalDays: number;
  cumulativeLoad: number;
  lastTrainingDay: number;
  recoveryNeeded: boolean;
  injuryRisk: number; // 0-100
  injuryHistory: InjuryHistory[];
  fatigueLog: FatigueLogEntry[]; // histórico de fadiga
  lastInjuryWeek?: number; // semana da última lesão (para tracking pós-lesão)
  degradedCondition?: 'minimal' | 'low' | 'moderate' | 'good' | 'excellent'; // condição pós-lesão
  
  // Progressão de atributos — histórico semanal (10.5)
  attributeHistory?: {
    week: number;
    technical: Partial<PlayerAttribute>;
    mental: Partial<PlayerAttribute>;
    physical: Partial<PlayerAttribute>;
    currentAbility: number;
    potentialAbility: number;
    morale: number;
    form: number;
    fitness: number;
  }[];
  
  // Famosidade para scouting
  fame: number;             // 1-100

  // Reputação do jogador (1-100) — reflete reconhecimento no futebol mundial
  reputation: number;       // 1-100

  // Estatísticas da temporada atual
  seasonGoals: number;      // gols na temporada atual
  seasonAssists: number;    // assistências na temporada atual

  // Agente livre (contrato expirado, sem clube)
  freeAgent?: boolean;

  /** Pedido público de transferência (moral destruída / promessas quebradas). */
  transferRequest?: {
    active: boolean;
    weekRequested: number;
    reason: 'low_morale' | 'broken_promise';
    /** Multiplicador do valor de mercado (ex: 0.75 = vende ~25% abaixo). */
    askingPriceDiscount: number;
  };
}

// Re-export de tipos de lesão usados pelo Player
import type { InjuryHistory, FatigueLogEntry } from './injury';
