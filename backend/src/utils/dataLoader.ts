// Carregador de Database Real de Jogadores
// Lê arquivos JSON da pasta "DataBase jogadores" e converte para os tipos do jogo

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Player, PlayerAttribute, GKAttributes, HiddenAttributes, Team } from '../types/game';
import { createDefaultTacticsConfig } from './playerGenerator';

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
// REPUTAÇÃO BASEADA NO OVERALL MÉDIO
// ============================================================

function calculateTeamReputation(players: JsonPlayer[]): number {
  if (players.length === 0) return 50;
  const avgOverall = players.reduce((sum, p) => sum + p.over_geral, 0) / players.length;
  return Math.max(20, Math.min(95, Math.round(avgOverall)));
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

function convertPlayer(json: JsonPlayer, teamId: string, index: number): Player {
  const gamePosition = POSITION_MAP[json.posicao] ?? 'MID';
  const { technical, mental, physical, goalkeeping } = buildAttributes(json, gamePosition);

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

  const marketValue = parseFloat((overall * 0.05 + Math.random() * 1.5).toFixed(2));
  const salary = Math.floor(marketValue * 10000 + Math.random() * 30000);

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
    contractClause: marketValue * 2,
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
    seasonGoals: 0,
    seasonAssists: 0,
  };
}

// ============================================================
// CONVERTER TIME JSON → TEAM
// ============================================================

function convertTeam(json: JsonTeam, teamId: string): Team {
  const displayName = getTeamDisplayName(json.time);
  const reputation = calculateTeamReputation(json.jogadores);
  const squad = json.jogadores.map((jp, i) => convertPlayer(jp, teamId, i));

  return {
    id: teamId,
    name: displayName,
    division: 'Série A',
    league: 'Brasileirão',
    reputation,
    budget: reputation * 2 + Math.random() * 50,
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
    boardExpectation: reputation > 70 ? 'title' : reputation > 50 ? 'top4' : 'midtable',
    transferBudget: reputation * 3 + Math.random() * 100,
    staffLevel: Math.floor(reputation / 10),
    scouts: [],
    boardPromises: [],
    tacticsConfig: createDefaultTacticsConfig(),
    leaguePosition: Math.floor(Math.random() * 20) + 1,
    leagueForm: ['W', 'D', 'L', 'W', 'D'].slice(0, Math.floor(Math.random() * 3) + 1),
    formRating: ['excellent', 'good', 'average', 'poor', 'terrible'][Math.floor(Math.random() * 5)] as Team['formRating'],
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
