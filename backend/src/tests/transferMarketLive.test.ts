import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  detectPositionalCrises,
  maybeGenerateIncomingTransfer,
  processTransferRequests,
} from '../store/helpers/transfer';
import type { Player, Team } from '../types/game';

function makePlayer(overrides: Partial<Player> & { id: string; position: string }): Player {
  return {
    name: 'Test',
    surname: overrides.id,
    secondaryPositions: [],
    positionProficiency: {},
    age: 25,
    nationality: 'BR',
    country: 'BR',
    technical: {
      heading: 10, crossing: 10, tackling: 10, technique: 10, finishing: 10, passing: 10,
      firstTouch: 10, dribbling: 10, marking: 10, freeKicks: 10, longShots: 10, throwIns: 10,
      aggression: 10, anticipation: 10, bravery: 10, composure: 10, concentration: 10,
      decisions: 10, determination: 10, improvise: 10, positioning: 10, leadership: 10,
      teamWork: 10, vision: 10, offBall: 10, workRate: 10, acceleration: 10, speed: 10,
      strength: 10, stamina: 10, agility: 10, naturalFitness: 10, jumping: 10, balance: 10,
    },
    mental: { leadership: 10 },
    physical: { speed: 10, stamina: 10 },
    hidden: {
      consistency: 3, injuryProneness: 3, bigGameImportance: 3, dirtiness: 2,
      adaptability: 3, ambition: 3, loyalty: 3, pressure: 3, professionalism: 3,
      sportsmanship: 3, temperament: 3,
    },
    currentAbility: 130,
    potentialAbility: 150,
    marketValue: 20,
    salary: 50,
    contractEnd: 100,
    contractClause: 40,
    morale: 60,
    form: 70,
    fitness: 90,
    injury: null,
    squadStatus: 'Rotation',
    teamMates: [],
    socialGroup: null,
    promises: [],
    coachTreatment: { type: 'substitute', minutesPerWeek: 0, trustLevel: 50, lastTrainingLoad: 0 },
    consecutivePhysicalDays: 0,
    cumulativeLoad: 0,
    lastTrainingDay: 0,
    recoveryNeeded: false,
    injuryRisk: 0,
    injuryHistory: [],
    fatigueLog: [],
    fame: 50,
    reputation: 60,
    seasonGoals: 0,
    seasonAssists: 0,
    ...overrides,
  } as Player;
}

function makeTeam(overrides: Partial<Team> & { id: string; squad: Player[] }): Team {
  return {
    name: overrides.id,
    division: 'A',
    league: 'BR',
    reputation: 70,
    budget: 80,
    wageBill: 5,
    facilitiesLevel: 5,
    youthFacilitiesLevel: 5,
    scoutingLevel: 5,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
    leaguePosition: 10,
    leagueForm: [],
    formRating: 'average',
    startingXI: overrides.squad.slice(0, 11).map(p => p.id),
    formation: '4-3-3',
    tactic: 'balanced',
    mentality: 'balanced',
    boardPromises: [],
    boardSatisfaction: 50,
    scouts: [],
    ...overrides,
  } as Team;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('detectPositionalCrises', () => {
  it('marca crise quando titular FWD está lesionado por 60+ dias e reserva é fraca', () => {
    const starter = makePlayer({
      id: 'fwd1', position: 'FWD', currentAbility: 155, squadStatus: 'Key Player',
      injury: { active: true, daysRemaining: 60, totalDays: 60, type: 'knee', severity: 'severe', source: 'match' },
    });
    const weakReserve = makePlayer({ id: 'fwd2', position: 'FWD', currentAbility: 120, squadStatus: 'Rotation' });
    const team = makeTeam({
      id: 'fla',
      reputation: 88,
      squad: [starter, weakReserve],
      startingXI: ['fwd1'],
    });

    const crises = detectPositionalCrises(team);
    const fwd = crises.find(c => c.position === 'FWD');
    expect(fwd).toBeDefined();
    expect(fwd!.urgency).toBeGreaterThanOrEqual(0.45);
    expect(fwd!.injuredStarterDays).toBe(60);
  });
});

describe('maybeGenerateIncomingTransfer', () => {
  it('IA em crise faz oferta agressiva por reserva de alto CA do usuário', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // força oferta

    const userReserve = makePlayer({
      id: 'u1', position: 'FWD', currentAbility: 145, marketValue: 25,
      squadStatus: 'Rotation', form: 80,
    });
    const userTeam = makeTeam({
      id: 'user',
      reputation: 65,
      squad: [userReserve, makePlayer({ id: 'u2', position: 'MID', currentAbility: 120 })],
      startingXI: ['u2'],
    });

    const injuredStar = makePlayer({
      id: 'ai1', position: 'FWD', currentAbility: 150, squadStatus: 'Key Player',
      injury: { active: true, daysRemaining: 60, totalDays: 60, type: 'knee', severity: 'severe', source: 'match' },
    });
    const weakBackup = makePlayer({ id: 'ai2', position: 'FWD', currentAbility: 118, squadStatus: 'Rotation' });
    const flamengo = makeTeam({
      id: 'fla',
      name: 'Flamengo',
      reputation: 88,
      budget: 100,
      squad: [
        injuredStar, weakBackup,
        makePlayer({ id: 'ai3', position: 'MID', currentAbility: 140 }),
        makePlayer({ id: 'ai4', position: 'DEF', currentAbility: 138 }),
        makePlayer({ id: 'ai5', position: 'GK', currentAbility: 135 }),
      ],
      startingXI: ['ai1', 'ai3', 'ai4', 'ai5'],
    });

    const offer = maybeGenerateIncomingTransfer([userTeam, flamengo], 'user', 5);
    expect(offer).not.toBeNull();
    expect(offer!.playerId).toBe('u1');
    expect(offer!.fromTeam).toBe('fla');
    // Oferta agressiva: acima do valor de mercado
    expect(offer!.offerPrice).toBeGreaterThanOrEqual(userReserve.marketValue * 1.1);
  });

  it('jogador com transfer request recebe oferta abaixo do mercado', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    const listed = makePlayer({
      id: 'u1', position: 'MID', currentAbility: 140, marketValue: 30,
      squadStatus: 'Excess', morale: 20,
      transferRequest: { active: true, weekRequested: 3, reason: 'low_morale', askingPriceDiscount: 0.75 },
    });
    const userTeam = makeTeam({ id: 'user', squad: [listed], startingXI: [] });
    const buyer = makeTeam({
      id: 'buy',
      reputation: 80,
      budget: 80,
      squad: [makePlayer({ id: 'b1', position: 'MID', currentAbility: 110 })],
    });

    const offer = maybeGenerateIncomingTransfer([userTeam, buyer], 'user', 5);
    expect(offer).not.toBeNull();
    expect(offer!.offerPrice).toBeLessThan(listed.marketValue);
  });
});

describe('processTransferRequests', () => {
  it('jogador com moral destruída pede transferência e vira Excess', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    const unhappy = makePlayer({
      id: 'p1', position: 'FWD', morale: 18, squadStatus: 'Key Player',
      hidden: {
        consistency: 3, injuryProneness: 3, bigGameImportance: 3, dirtiness: 2,
        adaptability: 3, ambition: 5, loyalty: 2, pressure: 3, professionalism: 3,
        sportsmanship: 3, temperament: 3,
      },
    });
    const mate = makePlayer({ id: 'p2', position: 'MID', morale: 70, teamMates: ['p1'], socialGroup: 'g1' });
    unhappy.teamMates = ['p2'];
    unhappy.socialGroup = 'g1';

    const team = makeTeam({ id: 'user', squad: [unhappy, mate], startingXI: ['p2'] });
    const result = processTransferRequests(team, 10);

    const requester = result.team.squad.find(p => p.id === 'p1')!;
    expect(requester.transferRequest?.active).toBe(true);
    expect(requester.squadStatus).toBe('Excess');
    expect(result.newRequests).toHaveLength(1);
    expect(result.inboxMessages.some(m => m.subject.includes('Pedido de transferência'))).toBe(true);

    // Cascata: colega perde moral
    const ally = result.team.squad.find(p => p.id === 'p2')!;
    expect(ally.morale).toBeLessThan(70);
  });

  it('pedido ativo não resolvido continua drenando moral do jogador', () => {
    const listed = makePlayer({
      id: 'p1', position: 'DEF', morale: 30, squadStatus: 'Excess',
      transferRequest: { active: true, weekRequested: 5, reason: 'low_morale', askingPriceDiscount: 0.7 },
    });
    const team = makeTeam({ id: 'user', squad: [listed], startingXI: [] });
    const result = processTransferRequests(team, 8); // 3 semanas aberto
    expect(result.team.squad[0].morale).toBeLessThan(30);
  });
});
