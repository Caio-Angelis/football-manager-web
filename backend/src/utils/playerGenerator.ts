// Engine de Geração Procedural de Jogadores
// Baseado na especificação Football Manager Web

import type { Player, HiddenAttributes, Team, PlayerAttribute, GKAttributes, TeamTacticsConfig, InjuryHistory } from '../types/game';

export function createDefaultTacticsConfig(): TeamTacticsConfig {
  return { playerRoles: [], playerInstructions: [] };
}

// ============================================================
// BANCO DE NOMES POR NACIONALIDADE
// ============================================================

export const NAMES_DATABASE = {
  Brasil: {
    first: ['Lucas', 'Pedro', 'Carlos', 'Rafael', 'Fernando', 'André', 'Bruno', 'Thiago', 'Gabriel', 'Diego',
            'João', 'Mateus', 'Felipe', 'Marcos', 'Daniel', 'Vinícius', 'Rodrigo', 'Eduardo', 'Leonardo', 'Matheus',
            'Guilherme', 'Renan', 'Bruno', 'Caio', 'João', 'Ricardo', 'Paulo', 'Alex', 'Gustavo', 'Héctor'],
    last: ['Silva', 'Santos', 'Oliveira', 'Costa', 'Almeida', 'Pereira', 'Souza', 'Ribeiro', 'Lima', 'Martins',
           'Ferreira', 'Nascimento', 'Cardoso', 'Barbosa', 'Machado', 'Araújo', 'Campelo', 'Pinto', 'Azevedo', 'Correia']
  },
  Argentina: {
    first: ['Lautaro', 'Julián', 'Nicolás', 'Facundo', 'Gonzalo', 'Santiago', 'Marcos', 'Agustín', 'Pablo', 'Emiliano'],
    last: ['García', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Romero', 'Díaz']
  },
  Portugal: {
    first: ['Pedro', 'João', 'André', 'Rui', 'Tiago', 'Miguel', 'Bruno', 'Rafael', 'Diogo', 'Gonçalo'],
    last: ['Silva', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Almeida', 'Martins', 'Fernandes', 'Gomes', 'Rodrigues']
  },
  Inglaterra: {
    first: ['James', 'Oliver', 'George', 'Harry', 'Charlie', 'Leo', 'Jack', 'Thomas', 'Arthur', 'William'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Taylor', 'Anderson', 'Thomas', 'White', 'Roberts']
  },
  Itália: {
    first: ['Marco', 'Alessandro', 'Luca', 'Giovanni', 'Andrea', 'Francesco', 'Lorenzo', 'Stefano', 'Matteo', 'Simone'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Ricci', 'Romano', 'Colombo', 'Santos', 'Costa', 'Conti', 'Mancini']
  },
  Alemanha: {
    first: ['Lukas', 'Maximilian', 'Emil', 'Felix', 'Jonas', 'Paul', 'Tobias', 'Niklas', 'Jan', 'Sebastian'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Beck', 'Lange', 'Schulz']
  }
};

// ============================================================
// POSIÇÕES E PROFIciência
// ============================================================

const POSITION_PROFICIENCY: Record<string, Record<string, number>> = {
  GK: {
    'GK': 18, 'DEF': 3, 'MID': 2, 'FWD': 1
  },
  DEF: {
    'DEF': 18, 'MID': 8, 'GK': 2, 'FWD': 3
  },
  MID: {
    'MID': 18, 'DEF': 7, 'FWD': 7, 'GK': 1
  },
  FWD: {
    'FWD': 18, 'MID': 10, 'DEF': 3, 'GK': 1
  }
};

// ============================================================
// FUNÇÕES AUXILIARES DE GERAÇÃO
// ============================================================

function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(1, Math.min(20, Math.round(mean + z * stdDev)));
}

function calculateOverall(technical: Partial<PlayerAttribute>, mental: Partial<PlayerAttribute>, physical: Partial<PlayerAttribute>): number {
  let sum = 0;
  let count = 0;
  
  // Técnicos
  const techValues = [technical.passing, technical.technique, technical.finishing, technical.dribbling, technical.crossing];
  techValues.forEach(v => { if (v) { sum += v; count++; } });
  
  // Mentais
  const mentalValues = [mental.vision, mental.decisions, mental.composure, mental.anticipation, mental.positioning];
  mentalValues.forEach(v => { if (v) { sum += v; count++; } });
  
  // Físicos
  const physicalValues = [physical.speed, physical.stamina, physical.strength, physical.agility, physical.acceleration];
  physicalValues.forEach(v => { if (v) { sum += v; count++; } });
  
  return Math.round((sum / count) * 10); // Escala 1-100
}

function calculateCA(overall: number): number {
  return Math.round(overall * 10 + Math.random() * 10);
}

function generatePA(age: number, overall: number): number {
  let basePA = Math.round(overall * 1.5 + Math.random() * 20);
  
  // Restrições por idade
  if (age < 17) basePA = Math.max(basePA, overall * 1.3);
  if (age > 28) basePA = Math.max(0, basePA - 30);
  if (age > 32) basePA = Math.max(0, basePA - 60);
  
  return Math.max(10, Math.min(200, basePA));
}

// ============================================================
// GERADOR PRINCIPAL DE JOGADOR
// ============================================================

export function generatePlayer(options: {
  teamReputation: number;
  countryReputation?: number;
  ageRange?: [number, number];
  position?: string;
  isYouth?: boolean;
}): Player {
  const nationality = getRandomNationality(options.teamReputation);
  const minAge = options.ageRange?.[0] ?? (options.isYouth ? 15 : 18);
  const maxAge = options.ageRange?.[1] ?? (options.isYouth ? 19 : 35);
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const position = options.position || getRandomPosition();
  
  // Base de atributos baseada na reputação
  const baseAbility = Math.round((options.teamReputation + (options.countryReputation || 50)) / 5);
  
  // Gerar atributos com distribuição normal
  const technical: Partial<PlayerAttribute> = {};
  const mental: Partial<PlayerAttribute> = {};
  const physical: Partial<PlayerAttribute> = {};
  
  // Técnicos
  technical.passing = gaussianRandom(baseAbility, 4);
  technical.technique = gaussianRandom(baseAbility, 4);
  technical.finishing = gaussianRandom(baseAbility, 4);
  technical.dribbling = gaussianRandom(baseAbility, 4);
  technical.crossing = gaussianRandom(baseAbility, 4);
  
  // Mentais
  mental.vision = gaussianRandom(baseAbility, 3);
  mental.decisions = gaussianRandom(baseAbility, 3);
  mental.composure = gaussianRandom(baseAbility, 3);
  mental.anticipation = gaussianRandom(baseAbility, 3);
  mental.positioning = gaussianRandom(baseAbility, 3);
  
  // Físicos
  physical.speed = gaussianRandom(baseAbility, 3);
  physical.stamina = gaussianRandom(baseAbility, 3);
  physical.strength = gaussianRandom(baseAbility, 3);
  physical.agility = gaussianRandom(baseAbility, 3);
  physical.acceleration = gaussianRandom(baseAbility, 3);
  
  // Calcular overall
  const overall = calculateOverall(technical, mental, physical);
  
  // Gerar CA e PA
  const currentAbility = calculateCA(overall);
  const potentialAbility = generatePA(age, overall);
  
  // Gerar nome
  const name = (NAMES_DATABASE as Record<string, { first: string[]; last: string[] }>)[nationality]!.first[Math.floor(Math.random() * 30)];
  const surname = (NAMES_DATABASE as Record<string, { first: string[]; last: string[] }>)[nationality]!.last[Math.floor(Math.random() * 10)];
  
  // Atributos de guarda-redes se aplicável
  let goalkeeping: GKAttributes | undefined;
  if (position === 'GK') {
    goalkeeping = {
      aerialReach: gaussianRandom(baseAbility, 4),
      commandOfArea: gaussianRandom(baseAbility, 4),
      communication: gaussianRandom(baseAbility, 3),
      eccentricity: gaussianRandom(10, 5),
      handballing: gaussianRandom(baseAbility, 4),
      punching: gaussianRandom(baseAbility, 4),
      throwing: gaussianRandom(baseAbility, 3),
      reflexes: gaussianRandom(baseAbility, 4),
      rushing: gaussianRandom(10, 5),
      tendencyToCome: gaussianRandom(10, 5),
      oneOnOne: gaussianRandom(baseAbility, 4)
    };
  }
  
  // Gerar atributos ocultos
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
    temperament: Math.floor(Math.random() * 5) + 1
  };
  
  // Gerar valores de mercado e salário
  const marketValue = parseFloat((overall * 0.5 + Math.random() * 2).toFixed(2));
  const salary = Math.floor(marketValue * 10000 + Math.random() * 50000);
  
  // Gerar posição e proficiência
  const prof = POSITION_PROFICIENCY[position]!;
  const secondaryPositions: string[] = [];
  const positionProficiency: Record<string, number> = {};
  
  Object.entries(prof).forEach(([pos, score]) => {
    positionProficiency[pos] = score;
    if (score > 5 && pos !== position) {
      secondaryPositions.push(pos);
    }
  });
  
  return {
    id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    surname,
    position,
    secondaryPositions,
    positionProficiency,
    age,
    nationality,
    country: nationality,
    technical: technical as PlayerAttribute,
    mental: mental as Partial<PlayerAttribute>,
    physical: physical as Partial<PlayerAttribute>,
    goalkeeping,
    hidden,
    currentAbility,
    potentialAbility,
    marketValue,
    salary,
    contractEnd: 52 + Math.floor(Math.random() * 156), // 1-4 anos
    contractClause: marketValue * 2,
    morale: 70 + Math.floor(Math.random() * 30),
    form: 60 + Math.floor(Math.random() * 40),
    fitness: 80 + Math.floor(Math.random() * 20),
    injury: null,
    squadStatus: 'Rotation',
    teamMates: [],
    socialGroup: null,
    promises: [],
    // Tratamento pelo treinador (11.4)
    coachTreatment: {
      type: 'bench',
      minutesPerWeek: 0,
      trustLevel: 50,
      lastTrainingLoad: 50,
    },
    // Load management and injury prevention
    consecutivePhysicalDays: 0,
    cumulativeLoad: 0,
    lastTrainingDay: 0,
    recoveryNeeded: false,
    injuryRisk: 0,
    injuryHistory: [] as InjuryHistory[],
    fatigueLog: [],
    fame: Math.min(100, overall * 0.8 + Math.random() * 20),
    seasonGoals: 0,
    seasonAssists: 0,
  };
}

// Funções auxiliares
export function getRandomNationality(teamReputation: number): string {
  if (teamReputation > 70) {
    const countries = ['Brasil', 'Argentina', 'Portugal', 'Inglaterra', 'Itália', 'Alemanha'];
    return countries[Math.floor(Math.random() * countries.length)];
  } else if (teamReputation > 40) {
    return Math.random() > 0.5 ? 'Brasil' : getRandomNationality(50);
  } else {
    return 'Brasil';
  }
}

export function getRandomPosition(): string {
  const positions = ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
  return positions[Math.floor(Math.random() * positions.length)];
}

// ============================================================
// GERADOR DE JOVENS (YOUTH INTAKE)
// ============================================================

export function generateYouthIntake(youthLevel: number, count: number = 10): Player[] {
  const players: Player[] = [];
  const baseAbility = Math.round(youthLevel * 5 + 10); // 10-60
  
  for (let i = 0; i < count; i++) {
    const player = generatePlayer({
      teamReputation: 50,
      ageRange: [15, 18],
      isYouth: true
    });
    
    // Ajustar baseado no nível das instalações
    player.currentAbility = Math.max(10, baseAbility - 20 + Math.floor(Math.random() * 20));
    player.potentialAbility = Math.max(50, Math.round(baseAbility * 1.5 + Math.random() * 20)) + Math.floor(youthLevel * 3);
    
    players.push(player);
  }
  
  return players;
}

// ============================================================
// GERADOR DE TIMES
// ============================================================

export function generateTeam(options: {
  name?: string;
  division?: string;
  league?: string;
  reputation?: number;
  squadSize?: number;
}): Team {
  const name = options.name || generateTeamName();
  const reputation = options.reputation || 50;
  const squadSize = options.squadSize || 18;
  
  const squad: Player[] = [];
  const positions = ['GK', 'GK', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'FWD', 'FWD'];
  
  for (let i = 0; i < squadSize; i++) {
    const player = generatePlayer({
      teamReputation: reputation,
      position: positions[i]
    });
    squad.push(player);
  }
  
  return {
    id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name,
    division: options.division || 'Série A',
    league: options.league || 'Brasileirão',
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
    formation: ['4-4-2', '4-3-3', '3-5-2', '5-2-2'][Math.floor(Math.random() * 4)],
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
    // Performance na tabela de jogos (11.4)
    leaguePosition: Math.floor(Math.random() * 20) + 1,
    leagueForm: ['W', 'D', 'L', 'W', 'D'].slice(0, Math.floor(Math.random() * 3) + 1),
    formRating: ['excellent', 'good', 'average', 'poor', 'terrible'][Math.floor(Math.random() * 5)] as Team['formRating'],
  };
}

export function generateTeamName(): string {
  const prefixes = ['Flam', 'Palme', 'Cori', 'São', 'Grân', 'Inter', 'Cruze', 'Bahia', 'Fort', 'Vas', 'Atlânt', 'Botaf', 'Cuiabá', 'Ponte'];
  const suffixes = ['go', 'ras', 'tinas', 'ar', 'cheta', 'ter', 'eziano', 'a', 'eira', 'és', 'to', 'fo', 'á', 'tense'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return prefix + suffix;
}
