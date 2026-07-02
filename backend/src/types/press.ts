// Tipos do Sistema de Coletiva de Imprensa

// ============================================================
// CATEGORIAS DE PERGUNTAS
// ============================================================

export type PressQuestionCategory =
  | 'match_preview'    // pré-jogo: expectativas para a partida
  | 'match_review'     // pós-jogo: análise do resultado
  | 'transfer'         // mercado de transferências
  | 'player_form'      // forma de jogadores específicos
  | 'tactics'          // escolhas táticas
  | 'board'            // relação com a diretoria
  | 'rivalry'          // rivalidades e derbies
  | 'injury'           // lesões no elenco
  | 'season_goals'     // objetivos da temporada
  | 'controversy';     // situações polêmicas

export type PressTone =
  | 'aggressive'       // jornalista provoca
  | 'neutral'          // pergunta direta
  | 'friendly'         // pergunta amigável
  | 'provocative';     // tenta criar polêmica

// ============================================================
// PERGUNTA DE IMPRENSA
// ============================================================

export interface PressQuestion {
  id: string;
  category: PressQuestionCategory;
  tone: PressTone;
  journalistName: string;
  outlet: string;        // veículo (ex: "Globo Esporte", "ESPN Brasil")
  question: string;      // texto da pergunta
  // Referências contextuais (opcionais)
  relatedPlayerId?: string;
  relatedPlayerName?: string;
  relatedTeamName?: string;
}

// ============================================================
// RESPOSTA DO TREINADOR
// ============================================================

export type PressResponseTone =
  | 'praise'            // elogiar / confiante
  | 'defensive'         // defensivo / cauteloso
  | 'critical'          // crítico / direto
  | 'diplomatic'        // diplomático / equilibrado
  | 'deflect';          // desviar / evasivo

export interface PressResponse {
  questionId: string;
  tone: PressResponseTone;
  text: string;         // texto escolhido (predefinido por tom)
}

// ============================================================
// COLETIVA DE IMPRENSA
// ============================================================

export type PressConferenceType = 'pre_match' | 'post_match' | 'general';

export interface PressConference {
  id: string;
  type: PressConferenceType;
  week: number;
  season: number;
  questions: PressQuestion[];
  responses: PressResponse[];
  status: 'pending' | 'completed' | 'skipped';
  // Contexto que gerou a coletiva
  context: {
    opponentName?: string;
    isHome?: boolean;
    lastResult?: { homeGoals: number; awayGoals: number; opponentName: string };
    leaguePosition?: number;
    recentForm?: string[];
  };
  // Efeitos aplicados ao concluir
  effects?: PressConferenceEffects;
}

// ============================================================
// EFEITOS DA COLETIVA
// ============================================================

export interface PressConferenceEffects {
  moraleChange: number;       // mudança na moral do elenco (-10 a +10)
  boardSatisfactionChange: number;  // mudança na satisfação da diretoria (-10 a +10)
  fanMoodChange: number;      // mudança no humor da torcida (-10 a +10)
  mediaPressureChange: number; // mudança na pressão midiática (-10 a +10)
  affectedPlayerIds: string[]; // jogadores diretamente afetados
  playerMoraleDeltas?: Record<string, number>; // delta de moral específico por jogador citado
  headline: string;           // manchete gerada pela coletiva
}

// ============================================================
// SENTIMENTO DA TORCIDA E MÍDIA
// ============================================================

export interface FanMood {
  value: number;              // 0-100 (50 = neutro)
  trend: 'rising' | 'stable' | 'falling';
  sentiment: 'ecstatic' | 'happy' | 'satisfied' | 'neutral' | 'concerned' | 'angry' | 'furious';
}

export interface MediaPressure {
  value: number;              // 0-100 (50 = neutro)
  level: 'low' | 'moderate' | 'high' | 'intense';
  trendingTopic?: string;     // tema em destaque na mídia
}
