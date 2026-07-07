// Carregador de Database Real de Jogadores
// Lê arquivos JSON da pasta "DataBase jogadores" e converte para os tipos do jogo

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Player, PlayerAttribute, GKAttributes, HiddenAttributes, Team } from '../types/game';
import { createDefaultTacticsConfig } from './playerGenerator';
import { calculateMarketValue, calculatePlayerSalary, calculateTeamBudget } from '../store/helpers/finance';

// ============================================================
// TIPOS DA DATABASE JSON
// ============================================================

interface JsonPlayer {
  nome: string;
  posicao: string;
  jogos: number;
  gols: number;
  assistencias: number;
  velocidade: number;
  chute: number;
  passe: number;
  drible: number;
  defesa: number;
  fisico: number;
  over_geral: number;
  idade?: number;
}

interface JsonTeam {
  time: string;
  jogadores: JsonPlayer[];
}

// ============================================================
// MAPEAMENTO DE POSIÇÕES
// ============================================================

const POSITION_MAP: Record<string, string> = {
  GOL: 'GK',
  ZAG: 'DEF',
  LAT: 'DEF',
  VOL: 'MID',
  MEI: 'MID',
  ATA: 'FWD',
  PD: 'FWD',
  PE: 'FWD',
};

const POSITION_PROFICIENCY: Record<string, Record<string, number>> = {
  GK: { GK: 18, DEF: 3, MID: 2, FWD: 1 },
  DEF: { DEF: 18, MID: 8, GK: 2, FWD: 3 },
  MID: { MID: 18, DEF: 7, FWD: 7, GK: 1 },
  FWD: { FWD: 18, MID: 10, DEF: 3, GK: 1 },
};

// ============================================================
// CONVERSÃO DE ESCALA (0-100 → 1-20)
// ============================================================

function to20(value100: number): number {
  return Math.max(1, Math.min(20, Math.round(value100 / 5)));
}

// ============================================================
// NOME DE EXIBIÇÃO DO TIME
// ============================================================

const TEAM_DISPLAY_NAMES: Record<string, string> = {
  atletico_mineiro: 'Atlético Mineiro',
  bahia: 'Bahia',
  botafogo: 'Botafogo',
  ceara: 'Ceará',
  corinthians: 'Corinthians',
  cruzeiro: 'Cruzeiro',
  flamengo: 'Flamengo',
  fluminense: 'Fluminense',
  fortaleza: 'Fortaleza',
  gremio: 'Grêmio',
  internacional: 'Internacional',
  juventude: 'Juventude',
  mirassol: 'Mirassol',
  palmeiras: 'Palmeiras',
  red_bull_bragantino: 'Red Bull Bragantino',
  santos: 'Santos',
  sao_paulo: 'São Paulo',
  sport_recife: 'Sport Recife',
  vasco_da_gama: 'Vasco da Gama',
  vitoria: 'Vitória',
};

function getTeamDisplayName(teamKey: string): string {
  return TEAM_DISPLAY_NAMES[teamKey] ?? teamKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================
// REPUTAÇÃO REAL DOS CLUBES — BRASILEIRÃO SÉRIE A 2025
// Baseada em dados do Football Manager e realidade do futebol brasileiro
// Escala 1-100 (100 = nível de Real Madrid / Barcelona)
// ============================================================

const TEAM_REPUTATION: Record<string, number> = {
  flamengo: 88,              // Maior clube do Brasil, Libertadores 2019/2022, elenco estrelar
  palmeiras: 85,             // Libertadores 2020/2021, dominante no Brasileirão
  corinthians: 78,           // Gigante, massiva torcida, mas menos sucesso recente
  sao_paulo: 76,             // Tricampeão da Libertadores, gigante histórico
  atletico_mineiro: 75,      // Campeão Brasileirão 2021, elenco forte
  santos: 74,                // Clube do Pelé, 3x Libertadores, retorno do Neymar
  gremio: 73,                // 2x Libertadores, gigante do RS
  internacional: 72,         // 2x Libertadores, gigante do RS
  fluminense: 72,            // Libertadores 2023, período forte recente
  botafogo: 71,              // Campeão Brasileirão 2024, ascensão recente
  cruzeiro: 68,              // 2x Libertadores, ressurgimento sob Ronaldo
  vasco_da_gama: 67,         // Libertadores 1998, gigante em reconstrução
  bahia: 62,                 // Crescendo com City Football Group
  fortaleza: 60,             // Meio-tabela consistente, força do Nordeste
  red_bull_bragantino: 57,   // Crescendo com Red Bull, experiência continental
  ceara: 55,                 // Tradicional do Nordeste, recém-promovido
  sport_recife: 54,          // Tradicional do Nordeste, campeão histórico
  vitoria: 52,               // Rival do Bahia, recém-promovido
  juventude: 47,             // Clube pequeno do RS
  mirassol: 40,              // Recém-promovido, menor clube da Série A 2025
};

function calculateTeamReputation(teamKey: string, players: JsonPlayer[]): number {
  const known = TEAM_REPUTATION[teamKey];
  if (known !== undefined) return known;
  // Fallback: usa overall médio do elenco
  if (players.length === 0) return 50;
  const avgOverall = players.reduce((sum, p) => sum + p.over_geral, 0) / players.length;
  return Math.max(20, Math.min(80, Math.round(avgOverall)));
}

// ============================================================
// REPUTAÇÃO DE JOGADORES — Lógica baseada em múltiplos fatores
// ============================================================
// Fatores:
//   1. Overall (over_geral) — base (peso 60%)
//   2. Produtividade (gols+assistências por jogo) — reconhecimento por performance
//   3. Idade — jogadores em auge (25-32) são mais conhecidos
//   4. Reputação do clube — jogadores de grandes clubes têm mais visibilidade
//   5. Posição — atacantes e meias tendem a ter mais reputação
// ============================================================

// Jogadores com reputação mundialmente conhecida — valores baseados em FM
const PLAYER_REPUTATION_OVERRIDES: Record<string, number> = {
  'Neymar': 95,              // Superstar global, ex-Barcelona/PSG, seleção brasileira
  'Arrascaeta': 82,          // Craque do Flamengo, referência no Brasil
  'De La Cruz': 78,          // Destaque do Flamengo, seleção argentina
  'Gerson': 76,              // Seleção brasileira, ex-Roma
  'Estêvão': 72,             // Wonderkid, vendido ao Chelsea, seleção brasileira
  'Pedro': 74,               // Artilheiro, seleção brasileira
  'Bruno Henrique': 73,      // Seleção brasileira, Libertadores
  'Everton Cebolinha': 75,   // Seleção brasileira, ex-Benfica
  'Facundo Torres': 76,      // Seleção uruguaia, ex-Palmeiras destaque
  'Raphael Veiga': 72,       // Palmeiras, artilheiro histórico
  'Richard Ríos': 70,        // Seleção colombiana, destaque Palmeiras
  'Weverton': 70,            // Seleção brasileira, herói da Libertadores 2020
  'Gustavo Gómez': 72,       // Seleção paraguaia, capitão Palmeiras
  'Vitor Roque': 68,         // Jovem promessa, ex-Barcelona
  'Soteldo': 65,             // Seleção venezuelana, ex-Toronto
  'Tiquinho Soares': 60,     // Veterano, ex-Olympiacos
  'Pulgar': 65,              // Seleção chilena, ex-Bologna
  'Piquerez': 68,            // Seleção uruguaia, ex-Defensor
};

function calculatePlayerReputation(
  json: JsonPlayer,
  gamePosition: string,
  teamReputation: number,
): number {
  // 1. Verificar override para jogadores conhecidos
  const override = PLAYER_REPUTATION_OVERRIDES[json.nome];
  if (override !== undefined) return override;

  const overall = json.over_geral;

  // 2. Base: overall (peso 60%)
  let reputation = overall * 0.6;

  // 3. Produtividade: gols + assistências por jogo
  const games = Math.max(1, json.jogos);
  const gaPerGame = (json.gols + json.assistencias) / games;
  // Atacantes e meias ganham mais reputação por produtividade
  const isFWD = gamePosition === 'FWD';
  const isMID = gamePosition === 'MID';
  const isGK = gamePosition === 'GK';
  const isDEF = gamePosition === 'DEF';

  if (isFWD) {
    reputation += Math.min(15, gaPerGame * 20); // até +15
  } else if (isMID) {
    reputation += Math.min(12, gaPerGame * 18); // até +12
  } else if (isDEF) {
    reputation += Math.min(5, gaPerGame * 10);  // até +5
  }
  // GK não ganha por produtividade ofensiva

  // 4. Fator idade — jogadores em auge são mais conhecidos
  const age = json.idade ?? 25;
  if (age >= 25 && age <= 32) {
    reputation += 5; // auge = mais reconhecimento
  } else if (age < 22) {
    reputation -= 5; // jovens ainda não são tão conhecidos
  } else if (age > 33) {
    reputation -= 3; // veteranos em declínio de fama
  }

  // 5. Reputação do clube — jogadores de grandes clubes têm mais visibilidade
  // Diferença entre reputação do clube e 60 (média)
  const teamFactor = (teamReputation - 60) * 0.15;
  reputation += teamFactor; // clube grande (+), clube pequeno (-)

  // 6. Bônus para jogadores com muitos jogos (titulares consolidados)
  if (games >= 45) {
    reputation += 3;
  } else if (games < 20) {
    reputation -= 3;
  }

  return Math.max(1, Math.min(100, Math.round(reputation)));
}

// ============================================================
// GERAR ATRIBUTOS COMPLETOS A PARTIR DOS 6 STATS DO JSON
// ============================================================

function buildAttributes(json: JsonPlayer, gamePosition: string): {
  technical: PlayerAttribute;
  mental: Partial<PlayerAttribute>;
  physical: Partial<PlayerAttribute>;
  goalkeeping?: GKAttributes;
} {
  const vel = to20(json.velocidade);
  const chute = to20(json.chute);
  const passe = to20(json.passe);
  const drible = to20(json.drible);
  const defesa = to20(json.defesa);
  const fisico = to20(json.fisico);
  const overall20 = to20(json.over_geral);

  // Atributos derivados baseados na posição
  const isGK = gamePosition === 'GK';
  const isDEF = gamePosition === 'DEF';
  const isMID = gamePosition === 'MID';
  const isFWD = gamePosition === 'FWD';

  // Valores auxiliares
  const techVal = Math.round((drible + passe) / 2);
  const agilityVal = Math.round((vel + drible) / 2);

  // Mentais
  const mental: Partial<PlayerAttribute> = {
    aggression: isDEF || isGK ? Math.round((fisico + defesa) / 2) : Math.round(fisico * 0.7),
    anticipation: Math.round((overall20 + defesa) / 2),
    bravery: isGK || isDEF ? Math.round((fisico + defesa) / 2) : Math.round(fisico * 0.8),
    composure: Math.round((overall20 + passe) / 2),
    concentration: Math.round((overall20 + defesa) / 2),
    decisions: Math.round((passe + overall20) / 2),
    determination: Math.round((fisico + overall20) / 2),
    improvise: isFWD || isMID ? Math.round((drible + overall20) / 2) : Math.round(overall20 * 0.7),
    positioning: isGK || isDEF ? defesa : Math.round((defesa + overall20) / 2),
    leadership: Math.round(overall20 * 0.8),
    teamWork: Math.round((passe + overall20) / 2),
    vision: isMID ? Math.round((passe + overall20) / 2) : Math.round(passe * 0.8),
    offBall: isFWD ? Math.round((vel + drible) / 2) : Math.round((vel + overall20) / 2),
    workRate: Math.round((fisico + vel) / 2),
  };

  // Físicos
  const physical: Partial<PlayerAttribute> = {
    acceleration: vel,
    speed: vel,
    strength: fisico,
    stamina: Math.round((fisico + overall20) / 2),
    agility: agilityVal,
    naturalFitness: Math.round((fisico + overall20) / 2),
    jumping: isGK || isDEF ? Math.round((fisico + defesa) / 2) : Math.round(fisico * 0.8),
    balance: Math.round((agilityVal + overall20) / 2),
  };

  // PlayerAttribute inclui todos os atributos (técnicos, mentais e físicos)
  const technical: PlayerAttribute = {
    // Técnicos
    heading: isDEF ? Math.round((defesa + fisico) / 2) : Math.round((fisico + overall20) / 2),
    crossing: isMID || isFWD ? Math.round((passe + drible) / 2) : Math.round((passe + defesa) / 2),
    tackling: isGK ? Math.round(defesa * 0.5) : defesa,
    technique: techVal,
    finishing: isGK ? Math.round(chute * 0.3) : chute,
    passing: passe,
    firstTouch: Math.round((techVal + overall20) / 2),
    dribbling: drible,
    marking: isDEF ? defesa : Math.round(defesa * 0.7),
    freeKicks: Math.round((chute + passe) / 2),
    longShots: isFWD || isMID ? chute : Math.round(chute * 0.6),
    throwIns: Math.round((passe + fisico) / 2),
    // Mentais (incluídos para satisfazer PlayerAttribute)
    aggression: mental.aggression!,
    anticipation: mental.anticipation!,
    bravery: mental.bravery!,
    composure: mental.composure!,
    concentration: mental.concentration!,
    decisions: mental.decisions!,
    determination: mental.determination!,
    improvise: mental.improvise!,
    positioning: mental.positioning!,
    leadership: mental.leadership!,
    teamWork: mental.teamWork!,
    vision: mental.vision!,
    offBall: mental.offBall!,
    workRate: mental.workRate!,
    // Físicos (incluídos para satisfazer PlayerAttribute)
    acceleration: physical.acceleration!,
    speed: physical.speed!,
    strength: physical.strength!,
    stamina: physical.stamina!,
    agility: physical.agility!,
    naturalFitness: physical.naturalFitness!,
    jumping: physical.jumping!,
    balance: physical.balance!,
  };

  let goalkeeping: GKAttributes | undefined;
  if (isGK) {
    goalkeeping = {
      aerialReach: Math.round((defesa + fisico) / 2),
      commandOfArea: Math.round((defesa + fisico) / 2),
      communication: Math.round((defesa + overall20) / 2),
      eccentricity: Math.round(Math.random() * 8 + 2),
      handballing: defesa,
      punching: Math.round((defesa + fisico) / 2),
      throwing: Math.round((passe + defesa) / 2),
      reflexes: Math.round((defesa + vel) / 2),
      rushing: Math.round(Math.random() * 8 + 2),
      tendencyToCome: Math.round(Math.random() * 8 + 2),
      oneOnOne: Math.round((defesa + vel) / 2),
    };
  }

  return { technical, mental, physical, goalkeeping };
}

// ============================================================
// CONVERTER JOGADOR JSON → PLAYER
// ============================================================

function convertPlayer(json: JsonPlayer, teamId: string, index: number, teamReputation: number): Player {
  const gamePosition = POSITION_MAP[json.posicao] ?? 'MID';
  const { technical, mental, physical, goalkeeping } = buildAttributes(json, gamePosition);
  const reputation = calculatePlayerReputation(json, gamePosition, teamReputation);

  const overall = json.over_geral;
  const currentAbility = Math.round(overall * 2);
  const age = json.idade ?? (18 + Math.floor(Math.random() * 17));
  const potentialAbility = age < 23
    ? Math.max(currentAbility, Math.round(currentAbility * 1.2 + Math.random() * 20))
    : currentAbility + Math.floor(Math.random() * 10);

  const nameParts = json.nome.split(' ');
  const name = nameParts[0] ?? json.nome;
  const surname = nameParts.slice(1).join(' ') || '';

  const prof = POSITION_PROFICIENCY[gamePosition]!;
  const secondaryPositions: string[] = [];
  const positionProficiency: Record<string, number> = {};
  Object.entries(prof).forEach(([pos, score]) => {
    positionProficiency[pos] = score;
    if (score > 5 && pos !== gamePosition) {
      secondaryPositions.push(pos);
    }
  });

  const hidden: HiddenAttributes = {
    consistency: Math.floor(Math.random() * 5) + 1,
    injuryProneness: Math.floor(Math.random() * 10) + 1,
    bigGameImportance: Math.floor(Math.random() * 5) + 1,
    dirtiness: Math.floor(Math.random() * 5) + 1,
    adaptability: Math.floor(Math.random() * 5) + 1,
    ambition: Math.floor(Math.random() * 5) + 1,
    loyalty: Math.floor(Math.random() * 5) + 1,
    pressure: Math.floor(Math.random() * 5) + 1,
    professionalism: Math.floor(Math.random() * 5) + 1,
    sportsmanship: Math.floor(Math.random() * 5) + 1,
    temperament: Math.floor(Math.random() * 5) + 1,
  };

  const marketValue = calculateMarketValue(overall);
  const salary = calculatePlayerSalary(marketValue);

  return {
    id: `${teamId}_p${index}`,
    name,
    surname,
    position: gamePosition,
    secondaryPositions,
    positionProficiency,
    age,
    nationality: 'Brasil',
    country: 'Brasil',
    technical,
    mental,
    physical,
    goalkeeping,
    hidden,
    currentAbility,
    potentialAbility,
    marketValue,
    salary,
    contractEnd: 52 + Math.floor(Math.random() * 156),
    contractClause: parseFloat((marketValue * 1.5).toFixed(1)),
    morale: 70 + Math.floor(Math.random() * 30),
    form: 60 + Math.floor(Math.random() * 40),
    fitness: 80 + Math.floor(Math.random() * 20),
    injury: null,
    squadStatus: index < 11 ? 'Regular Starter' : 'Rotation',
    teamMates: [],
    socialGroup: null,
    promises: [],
    coachTreatment: {
      type: 'bench',
      minutesPerWeek: 0,
      trustLevel: 50,
      lastTrainingLoad: 50,
    },
    consecutivePhysicalDays: 0,
    cumulativeLoad: 0,
    lastTrainingDay: 0,
    recoveryNeeded: false,
    injuryRisk: 0,
    injuryHistory: [],
    fatigueLog: [],
    fame: Math.min(100, overall * 0.8 + Math.random() * 20),
    reputation,
    seasonGoals: 0,
    seasonAssists: 0,
  };
}

// ============================================================
// CONVERTER TIME JSON → TEAM
// ============================================================

function convertTeam(json: JsonTeam, teamId: string): Team {
  const displayName = getTeamDisplayName(json.time);
  const reputation = calculateTeamReputation(json.time, json.jogadores);
  const squad = json.jogadores.map((jp, i) => convertPlayer(jp, teamId, i, reputation));
  const budget = calculateTeamBudget(reputation);

  return {
    id: teamId,
    name: displayName,
    division: 'Série A',
    league: 'Brasileirão',
    reputation,
    budget,
    wageBill: 0,
    facilitiesLevel: Math.floor(reputation / 10),
    youthFacilitiesLevel: Math.floor(reputation / 15),
    scoutingLevel: Math.floor(reputation / 12),
    points: 0,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    squad,
    formation: '4-3-3',
    tactic: 'balanced',
    startingXI: squad.slice(0, 11).map(p => p.id),
    teamMentality: 'balanced',
    attackWidth: 'balanced',
    passingStyle: 'mixed',
    tempo: 'balanced',
    playOutOfWidth: false,
    useFlank: 'neither',
    workBallIntoBox: true,
    crossFromWide: true,
    takeMoreRisks: false,
    afterLosingPossession: 'regroup',
    afterGainingPossession: 'retainStructure',
    engagementLine: 'medium',
    defensiveLine: 'medium',
    pressIntensity: 'medium',
    tacklingStyle: 'contain',
    trapOffside: false,
    highPress: false,
    counterPress: false,
    highLine: false,
    aggressiveTackling: false,
    boardExpectation: 'midtable',
    staffLevel: Math.floor(reputation / 10),
    scouts: [],
    boardPromises: [],
    tacticsConfig: createDefaultTacticsConfig(),
    leaguePosition: 0,
    leagueForm: [],
    formRating: 'average' as Team['formRating'],
  };
}

// ============================================================
// FUNÇÃO PRINCIPAL: CARREGAR TODOS OS TIMES DA DATABASE
// ============================================================

export function loadTeamsFromDatabase(): Team[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dbPath = path.resolve(__dirname, '../../../DataBase jogadores');

  if (!fs.existsSync(dbPath)) {
    console.warn(`[dataLoader] Database directory not found: ${dbPath}`);
    return [];
  }

  const files = fs.readdirSync(dbPath).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.warn(`[dataLoader] No JSON files found in: ${dbPath}`);
    return [];
  }

  const teams: Team[] = [];

  for (const file of files) {
    const filePath = path.join(dbPath, file);
    const teamKey = path.basename(file, '.json');
    const teamId = `t_${teamKey}`;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw) as JsonTeam;
      const team = convertTeam(json, teamId);
      teams.push(team);
      console.log(`[dataLoader] Loaded team: ${team.name} (${team.squad.length} players)`);
    } catch (err) {
      console.error(`[dataLoader] Error loading ${file}:`, err);
    }
  }

  return teams;
}

// ============================================================
// ATRIBUIÇÃO DE METAS DA DIRETORIA — BASEADA EM PERCENTIS
// ============================================================

export function assignBoardExpectations(teams: Team[]): Team[] {
  if (teams.length === 0) return teams;

  const sorted = [...teams].sort((a, b) => b.reputation - a.reputation);
  const n = sorted.length;

  // Percentis: top 10% → title, next 30% → top4, next 40% → midtable, bottom 20% → relegation
  const titleCutoff = Math.max(1, Math.round(n * 0.10));
  const top4Cutoff = Math.max(titleCutoff + 1, Math.round(n * 0.40));
  const midtableCutoff = Math.max(top4Cutoff + 1, Math.round(n * 0.80));

  for (let i = 0; i < n; i++) {
    const team = sorted[i];
    let expectation: string;

    if (i < titleCutoff) {
      expectation = 'title';
    } else if (i < top4Cutoff) {
      expectation = 'top4';
    } else if (i < midtableCutoff) {
      expectation = 'midtable';
    } else {
      expectation = 'relegation';
    }

    team.boardExpectation = expectation;
  }

  return teams;
}
