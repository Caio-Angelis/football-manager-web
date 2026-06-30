// Sistema de Coletiva de Imprensa — Geração de perguntas e cálculo de efeitos

import type {
  PressQuestion, PressQuestionCategory, PressTone,
  PressResponse, PressResponseTone, PressConference,
  PressConferenceType, PressConferenceEffects,
  FanMood, MediaPressure,
} from '../../types/press';
import type { Team, Match, LeagueStandings } from '../../types/game';

// ============================================================
// BANCO DE JORNALISTAS E VEÍCULOS
// ============================================================

const JOURNALISTS: { name: string; outlet: string; toneBias: PressTone }[] = [
  { name: 'Carlos Trindade', outlet: 'Globo Esporte', toneBias: 'neutral' },
  { name: 'Marina Fontes', outlet: 'ESPN Brasil', toneBias: 'aggressive' },
  { name: 'Roberto Ávila', outlet: 'SporTV', toneBias: 'neutral' },
  { name: 'Patrícia Lemos', outlet: 'UOL Esporte', toneBias: 'provocative' },
  { name: 'Eduardo Castro', outlet: 'GE.globo', toneBias: 'friendly' },
  { name: 'Felipe Andrade', outlet: 'Lance!', toneBias: 'aggressive' },
  { name: 'Sandra Ribeiro', outlet: 'Goal Brasil', toneBias: 'neutral' },
  { name: 'Téo Magnata', outlet: 'Fox Sports', toneBias: 'provocative' },
  { name: 'Júlia Nascimento', outlet: 'TNT Sports', toneBias: 'friendly' },
  { name: 'André Valente', outlet: 'O Globo', toneBias: 'aggressive' },
];

// ============================================================
// BANCO DE PERGUNTAS POR CATEGORIA
// ============================================================

interface QuestionTemplate {
  category: PressQuestionCategory;
  tone: PressTone;
  template: string;
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // Pré-jogo
  { category: 'match_preview', tone: 'neutral', template: 'Como encara o confronto contra {opponent} {venue} nesta rodada?' },
  { category: 'match_preview', tone: 'aggressive', template: 'O {opponent} vem melhor. O senhor acredita que consegue vencer?' },
  { category: 'match_preview', tone: 'friendly', template: 'Quais as expectativas para o jogo contra {opponent}?' },
  { category: 'match_preview', tone: 'provocative', template: 'Uma derrota hoje pode ser fatal para as pretensões do clube. Como lida com a pressão?' },

  // Pós-jogo
  { category: 'match_review', tone: 'neutral', template: 'Como avalia o resultado contra {opponent}?' },
  { category: 'match_review', tone: 'aggressive', template: 'A torcida vaiou o time. O que o senhor tem a dizer sobre a performance?' },
  { category: 'match_review', tone: 'friendly', template: 'Uma vitória importante. Como celebra este resultado?' },
  { category: 'match_review', tone: 'provocative', template: 'O senhor acha que o time entregou o jogo hoje?' },

  // Transferências
  { category: 'transfer', tone: 'neutral', template: 'Há rumores de reforços para a próxima janela. Pode adiantar algo?' },
  { category: 'transfer', tone: 'aggressive', template: 'Por que o clube não investiu mais no mercado? A diretoria cortou o orçamento?' },
  { category: 'transfer', tone: 'provocative', template: 'Corre que {player} pode sair. O senhor segura o jogador ou libera?' },
  { category: 'transfer', tone: 'friendly', template: 'O mercado abre em breve. Há alguma contratação que os torcedores podem esperar?' },

  // Forma de jogadores
  { category: 'player_form', tone: 'neutral', template: 'Como avalia o momento de {player} no time?' },
  { category: 'player_form', tone: 'aggressive', template: '{player} vem em má fase. O senhor continua apostando nele?' },
  { category: 'player_form', tone: 'friendly', template: '{player} tem brilhado. Como elogia o jogador?' },
  { category: 'player_form', tone: 'provocative', template: 'A torcida cobra {player}. O senhor concorda com as críticas?' },

  // Táticas
  { category: 'tactics', tone: 'neutral', template: 'A escalação surpreendeu. Pode explicar a escolha tática?' },
  { category: 'tactics', tone: 'aggressive', template: 'O sistema tático parece confuso. O senhor não acha que precisa mudar?' },
  { category: 'tactics', tone: 'friendly', template: 'A equipe tem jogado um futebol atrativo. Qual o segredo tático?' },
  { category: 'tactics', tone: 'provocative', template: 'O senhor insiste no mesmo esquema mesmo perdendo. Não é teimosia?' },

  // Diretoria
  { category: 'board', tone: 'neutral', template: 'Como está a relação com a diretoria neste momento?' },
  { category: 'board', tone: 'aggressive', template: 'A diretoria teria paciência se os resultados não viessem?' },
  { category: 'board', tone: 'provocative', template: 'Corre boatos de que a diretoria já conversa com outros treinadores. Comentário?' },

  // Rivalidade
  { category: 'rivalry', tone: 'provocative', template: 'O rival {opponent} está em melhor fase. Como encara essa disputa?' },
  { category: 'rivalry', tone: 'aggressive', template: 'Perder para o rival pode custar o cargo. O senhor sente esse peso?' },
  { category: 'rivalry', tone: 'neutral', template: 'Clássico sempre é especial. Como prepara o time para o derby?' },

  // Lesões
  { category: 'injury', tone: 'neutral', template: 'Como está o departamento médico? Há desfalques importantes?' },
  { category: 'injury', tone: 'aggressive', template: 'O elenco vem sofrendo com lesões. O senhor culpa a comissão médica?' },
  { category: 'injury', tone: 'friendly', template: '{player} está se recuperando. Como avalia a evolução do tratamento?' },

  // Objetivos da temporada
  { category: 'season_goals', tone: 'neutral', template: 'Ainda há tempo de alcançar os objetivos da temporada?' },
  { category: 'season_goals', tone: 'aggressive', template: 'A diretoria esperava mais do time. O senhor cumpre a meta?' },
  { category: 'season_goals', tone: 'friendly', template: 'O time vem evoluindo. Quais as metas realistas agora?' },
  { category: 'season_goals', tone: 'provocative', template: 'Rebaixamento ronda o clube. O senhor se sente seguro no cargo?' },

  // Controvérsia
  { category: 'controversy', tone: 'provocative', template: 'O árbitro errou ontem. O senhor critica a arbitragem ou prefere não comentar?' },
  { category: 'controversy', tone: 'aggressive', template: 'Houve confusão no vestiário. O que aconteceu entre os jogadores?' },
  { category: 'controversy', tone: 'provocative', template: 'Circulou nas redes que {player} teria brigado com o senhor. É verdade?' },
];

// ============================================================
// RESPOSTAS PREDEFINIDAS POR TOM
// ============================================================

export const RESPONSE_OPTIONS: Record<PressResponseTone, { label: string; text: string }[]> = {
  praise: [
    { label: 'Elogiar o time', text: 'O time está jogando muito bem. Tenho orgulho desses jogadores.' },
    { label: 'Mostrar confiança', text: 'Acredito totalmente no grupo. Estamos no caminho certo.' },
    { label: 'Valorizar o adversário', text: 'Respeitamos o adversário, mas confiamos no nosso trabalho.' },
  ],
  defensive: [
    { label: 'Postura defensiva', text: 'Não vou comentar sobre isso. O foco é a próxima partida.' },
    { label: 'Proteger o grupo', text: 'O grupo está unido. O que acontece no vestiário fica no vestiário.' },
    { label: 'Evitar polêmica', text: 'Prefiro não entrar nesse mérito. Cada um tem sua opinião.' },
  ],
  critical: [
    { label: 'Cobrar mais do time', text: 'O nível tem que subir. Não dá para aceitar esse padrão.' },
    { label: 'Crítica direta', text: 'Faltou atitude. Precamos corrigir isso urgentemente.' },
    { label: 'Assumir responsabilidade', text: 'A culpa é minha. Preciso fazer melhor como treinador.' },
  ],
  diplomatic: [
    { label: 'Resposta equilibrada', text: 'Entendo a pergunta, mas vejo de forma diferente. O futebol tem altos e baixos.' },
    { label: 'Diplomacia', text: 'Respeito todas as opiniões. Nosso trabalho fala por si dentro de campo.' },
    { label: 'Visão construtiva', text: 'Temos pontos a melhorar, mas também muita coisa positiva para valorizar.' },
  ],
  deflect: [
    { label: 'Desviar do assunto', text: 'Essa é uma pergunta para outra pessoa. Eu foco em campo.' },
    { label: 'Responder com ironia', text: 'Boa pergunta. Se eu tivesse a resposta, seria um homem muito feliz.' },
    { label: 'Focar no próximo jogo', text: 'Já olhamos para frente. O próximo jogo é o mais importante.' },
  ],
};

// ============================================================
// GERADOR DE COLETIVA
// ============================================================

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generatePressConference(
  type: PressConferenceType,
  week: number,
  season: number,
  team: Team,
  nextOpponent?: Team,
  lastMatch?: Match,
  standings?: LeagueStandings[],
): PressConference {
  const questions: PressQuestion[] = [];
  const numQuestions = type === 'general' ? 3 : 4;
  const context: PressConference['context'] = {};

  // Determinar categorias relevantes
  const availableCategories = new Set<PressQuestionCategory>();

  if (type === 'pre_match' && nextOpponent) {
    availableCategories.add('match_preview');
    context.opponentName = nextOpponent.name;
    context.isHome = true; // será ajustado pelo chamador
    context.leaguePosition = standings?.find(s => s.teamId === team.id)?.position;

    // Adicionar categorias contextuais
    if (team.leagueForm && team.leagueForm.filter(f => f === 'L').length >= 3) {
      availableCategories.add('season_goals');
      availableCategories.add('controversy');
    }
    if (team.leagueForm && team.leagueForm.filter(f => f === 'W').length >= 3) {
      availableCategories.add('player_form');
    }
    availableCategories.add('tactics');
    availableCategories.add('transfer');
  } else if (type === 'post_match' && lastMatch) {
    availableCategories.add('match_review');
    const isHome = lastMatch.homeTeam === team.id;
    const homeGoals = lastMatch.homeGoals ?? 0;
    const awayGoals = lastMatch.awayGoals ?? 0;
    const teamGoals = isHome ? homeGoals : awayGoals;
    const oppGoals = isHome ? awayGoals : homeGoals;
    const opponentTeam = isHome
      ? standings // não temos acesso direto ao nome aqui, usamos o ID
      : undefined;
    context.lastResult = { homeGoals, awayGoals, opponentName: '' };
    context.isHome = isHome;

    if (teamGoals < oppGoals) {
      availableCategories.add('controversy');
      availableCategories.add('tactics');
      availableCategories.add('season_goals');
    } else if (teamGoals > oppGoals) {
      availableCategories.add('player_form');
      availableCategories.add('tactics');
    } else {
      availableCategories.add('tactics');
      availableCategories.add('season_goals');
    }
  } else {
    // General
    availableCategories.add('transfer');
    availableCategories.add('season_goals');
    availableCategories.add('board');
    availableCategories.add('player_form');
  }

  // Sempre pode perguntar sobre lesões se houver lesionados
  const injuredPlayers = team.squad.filter(p => p.injury?.active);
  if (injuredPlayers.length > 0) {
    availableCategories.add('injury');
  }

  // Filtrar templates por categorias disponíveis
  const relevantTemplates = QUESTION_TEMPLATES.filter(t =>
    availableCategories.has(t.category),
  );

  // Selecionar N perguntas
  const selectedTemplates = pickN(relevantTemplates, Math.min(numQuestions, relevantTemplates.length));

  // Variáveis para preencher templates
  const topScorer = team.squad.reduce((best, p) =>
    (p.seasonGoals ?? 0) > (best.seasonGoals ?? 0) ? p : best,
    team.squad[0],
  );
  const worstFormPlayer = team.squad.reduce((worst, p) =>
    (p.form ?? 70) < (worst.form ?? 70) ? p : worst,
    team.squad[0],
  );
  const featuredPlayer = Math.random() < 0.5
    ? (topScorer?.seasonGoals ?? 0) > 3 ? topScorer : worstFormPlayer
    : worstFormPlayer;

  const templateVars: Record<string, string> = {
    opponent: nextOpponent?.name ?? 'o adversário',
    player: featuredPlayer ? `${featuredPlayer.name} ${featuredPlayer.surname}`.trim() : 'o jogador',
    venue: context.isHome ? 'em casa' : 'fora de casa',
  };

  // Criar perguntas
  const usedJournalists = pickN(JOURNALISTS, selectedTemplates.length);
  selectedTemplates.forEach((tmpl, i) => {
    const journo = usedJournalists[i] ?? pickRandom(JOURNALISTS);
    const tone = Math.random() < 0.6 ? journo.toneBias : tmpl.tone;

    questions.push({
      id: makeId('pq'),
      category: tmpl.category,
      tone,
      journalistName: journo.name,
      outlet: journo.outlet,
      question: fillTemplate(tmpl.template, templateVars),
      relatedPlayerId: tmpl.category === 'player_form' || tmpl.category === 'injury'
        ? featuredPlayer?.id
        : undefined,
      relatedPlayerName: tmpl.category === 'player_form' || tmpl.category === 'injury'
        ? featuredPlayer ? `${featuredPlayer.name} ${featuredPlayer.surname}`.trim() : undefined
        : undefined,
      relatedTeamName: nextOpponent?.name,
    });
  });

  return {
    id: makeId('pc'),
    type,
    week,
    season,
    questions,
    responses: [],
    status: 'pending',
    context,
  };
}

// ============================================================
// CÁLCULO DE EFEITOS DA COLETIVA
// ============================================================

export function calculatePressConferenceEffects(
  conference: PressConference,
  team: Team,
  boardSatisfaction: number,
  fanMood: FanMood,
  mediaPressure: MediaPressure,
): PressConferenceEffects {
  let moraleChange = 0;
  let boardSatChange = 0;
  let fanMoodChange = 0;
  let mediaPressureChange = 0;
  const affectedPlayerIds: string[] = [];

  for (const response of conference.responses) {
    const question = conference.questions.find(q => q.id === response.questionId);
    if (!question) continue;

    // Mapear tom da resposta para efeitos base
    const baseEffects: Record<PressResponseTone, { morale: number; board: number; fan: number; media: number }> = {
      praise:     { morale: +3, board: +1, fan: +2, media: -1 },
      defensive:  { morale: 0,  board: 0,  fan: -1, media: +1 },
      critical:   { morale: -4, board: +1, fan: -2, media: +3 },
      diplomatic: { morale: +1, board: +2, fan: +1, media: -2 },
      deflect:    { morale: -1, board: -1, fan: -2, media: +2 },
    };

    const effects = baseEffects[response.tone];

    // Modificar baseado no tom da pergunta
    if (question.tone === 'aggressive' || question.tone === 'provocative') {
      // Responder agressivamente a pergunta agressiva = mais pressão midiática
      if (response.tone === 'critical') {
        effects.media += 2;
        effects.fan -= 1;
      }
      // Responder diplomaticamente a provocação = reduz pressão
      if (response.tone === 'diplomatic') {
        effects.media -= 1;
        effects.board += 1;
      }
      // Evasivo a pergunta agressiva = mídia pressiona mais
      if (response.tone === 'deflect') {
        effects.media += 2;
      }
    }

    if (question.tone === 'friendly') {
      // Elogiar em resposta amigável = moral sobe mais
      if (response.tone === 'praise') {
        effects.morale += 2;
        effects.fan += 1;
      }
    }

    // Categoria-specific modifiers
    if (question.category === 'player_form' && question.relatedPlayerId) {
      affectedPlayerIds.push(question.relatedPlayerId);
      if (response.tone === 'praise') {
        effects.morale += 2; // elogiar jogador específico aumenta moral dele
      } else if (response.tone === 'critical') {
        effects.morale -= 3; // criticar jogador específico derruba moral
      }
    }

    if (question.category === 'board') {
      if (response.tone === 'diplomatic') {
        effects.board += 2;
      } else if (response.tone === 'critical') {
        effects.board -= 3;
      }
    }

    if (question.category === 'rivalry') {
      if (response.tone === 'praise' || response.tone === 'critical') {
        effects.fan += 2; // torcida gosta de postura firme em clássico
      }
    }

    if (question.category === 'controversy') {
      if (response.tone === 'critical') {
        effects.media += 3;
        effects.fan += 1; // às vezes torcida gosta de polêmica
      }
      if (response.tone === 'deflect') {
        effects.media += 1;
      }
    }

    moraleChange += effects.morale;
    boardSatChange += effects.board;
    fanMoodChange += effects.fan;
    mediaPressureChange += effects.media;
  }

  // Clamp values
  moraleChange = Math.max(-10, Math.min(10, moraleChange));
  boardSatChange = Math.max(-10, Math.min(10, boardSatChange));
  fanMoodChange = Math.max(-10, Math.min(10, fanMoodChange));
  mediaPressureChange = Math.max(-10, Math.min(10, mediaPressureChange));

  // Gerar manchete
  const headline = generateHeadline(conference, moraleChange, fanMoodChange);

  return {
    moraleChange,
    boardSatisfactionChange: boardSatChange,
    fanMoodChange,
    mediaPressureChange,
    affectedPlayerIds: [...new Set(affectedPlayerIds)],
    headline,
  };
}

function generateHeadline(
  conference: PressConference,
  moraleChange: number,
  fanMoodChange: number,
): string {
  if (moraleChange >= 5) {
    return 'Treinador contagia elenco em coletiva: "Acreditem no grupo!"';
  }
  if (moraleChange <= -5) {
    return 'Treinador critica elenco e gera mal-estar no vestiário';
  }
  if (fanMoodChange >= 4) {
    return 'Torcida aprova postura do treinador em coletiva';
  }
  if (fanMoodChange <= -4) {
    return 'Treinador irrita torcida com respostas evasivas';
  }
  if (conference.responses.every(r => r.tone === 'diplomatic')) {
    return 'Treinador usa diplomacia e evita polêmicas em coletiva';
  }
  if (conference.responses.some(r => r.tone === 'critical')) {
    return 'Treinador assume postura crítica e cobra elenco publicamente';
  }
  return 'Coletiva transcorre sem grandes destaques';
}

// ============================================================
// ATUALIZAR SENTIMENTO DA TORCIDA
// ============================================================

export function updateFanMood(current: FanMood, change: number): FanMood {
  const newValue = Math.max(0, Math.min(100, current.value + change));
  const trend: FanMood['trend'] = change > 1 ? 'rising' : change < -1 ? 'falling' : 'stable';

  let sentiment: FanMood['sentiment'];
  if (newValue >= 85) sentiment = 'ecstatic';
  else if (newValue >= 70) sentiment = 'happy';
  else if (newValue >= 55) sentiment = 'satisfied';
  else if (newValue >= 45) sentiment = 'neutral';
  else if (newValue >= 30) sentiment = 'concerned';
  else if (newValue >= 15) sentiment = 'angry';
  else sentiment = 'furious';

  return { value: newValue, trend, sentiment };
}

export function updateMediaPressure(current: MediaPressure, change: number): MediaPressure {
  const newValue = Math.max(0, Math.min(100, current.value + change));

  let level: MediaPressure['level'];
  if (newValue < 25) level = 'low';
  else if (newValue < 50) level = 'moderate';
  else if (newValue < 75) level = 'high';
  else level = 'intense';

  return { value: newValue, level };
}

// ============================================================
// EFEITO DE PRESSÃO MIDIÁRICA NO DESEMPENHO
// ============================================================

export function getMediaPressurePerformanceModifier(mediaPressure: MediaPressure): number {
  // Pressão alta reduz desempenho do time em até 5%
  if (mediaPressure.level === 'intense') return -0.05;
  if (mediaPressure.level === 'high') return -0.03;
  if (mediaPressure.level === 'moderate') return -0.01;
  return 0;
}

// ============================================================
// EFEITO DE HUMOR DA TORCIDA NA RECEITA
// ============================================================

export function getFanMoodRevenueModifier(fanMood: FanMood): number {
  // Torcida feliz aumenta bilheteira em até 20%
  // Torcida brava reduz em até 15%
  return ((fanMood.value - 50) / 50) * 0.20;
}

// ============================================================
// DECAIMENTO SEMANAL
// ============================================================

export function weeklyFanMoodDecay(current: FanMood, teamForm: string[]): FanMood {
  // Resultados recentes afetam humor da torcida
  const wins = teamForm.filter(f => f === 'W').length;
  const losses = teamForm.filter(f => f === 'L').length;
  let change = 0;
  if (wins >= 3) change = +3;
  else if (wins >= 2) change = +1;
  else if (losses >= 3) change = -5;
  else if (losses >= 2) change = -2;

  // Regressão à média
  if (current.value > 70) change -= 1;
  if (current.value < 30) change += 2;

  return updateFanMood(current, change);
}

export function weeklyMediaPressureDecay(current: MediaPressure): MediaPressure {
  // Pressão midiática decai naturalmente
  return updateMediaPressure(current, -2);
}
