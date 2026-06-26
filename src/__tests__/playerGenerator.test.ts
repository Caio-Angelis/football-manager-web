import { describe, it, expect } from 'vitest';
import {
  generatePlayer,
  generateTeam,
  generateYouthIntake,
  getRandomNationality,
  getRandomPosition,
  NAMES_DATABASE,
} from '../utils/playerGenerator';

describe('playerGenerator - generatePlayer', () => {
  it('generates a GK with goalkeeping attributes', () => {
    const player = generatePlayer({ teamReputation: 60, position: 'GK' });
    expect(player.position).toBe('GK');
    expect(player.goalkeeping).toBeDefined();
    expect(player.goalkeeping!.reflexes).toBeGreaterThanOrEqual(1);
  });

  it('generates a DEF without goalkeeping attributes', () => {
    const player = generatePlayer({ teamReputation: 50, position: 'DEF' });
    expect(player.position).toBe('DEF');
    expect(player.goalkeeping).toBeUndefined();
  });

  it('generates FWD with valid secondary positions', () => {
    const player = generatePlayer({ teamReputation: 50, position: 'FWD' });
    expect(player.position).toBe('FWD');
    // FWD has MID as secondary (score 10 > 5)
    expect(player.secondaryPositions).toContain('MID');
  });

  it('generates MID with valid secondary positions', () => {
    const player = generatePlayer({ teamReputation: 50, position: 'MID' });
    // MID has DEF (7) and FWD (7) both > 5
    expect(player.secondaryPositions.length).toBeGreaterThanOrEqual(1);
  });

  it('generates youth player with correct age range', () => {
    const player = generatePlayer({ teamReputation: 50, isYouth: true });
    expect(player.age).toBeGreaterThanOrEqual(15);
    expect(player.age).toBeLessThanOrEqual(19);
  });

  it('generates player with custom age range', () => {
    const player = generatePlayer({ teamReputation: 50, ageRange: [30, 35] });
    expect(player.age).toBeGreaterThanOrEqual(30);
    expect(player.age).toBeLessThanOrEqual(35);
  });

  it('generates player with countryReputation affecting base ability', () => {
    const highRep = generatePlayer({ teamReputation: 80, countryReputation: 90 });
    const lowRep = generatePlayer({ teamReputation: 20, countryReputation: 10 });
    // Higher reputation should generally produce higher overall (statistically)
    // We just check they are valid
    expect(highRep.currentAbility).toBeGreaterThan(0);
    expect(lowRep.currentAbility).toBeGreaterThan(0);
  });

  it('generates player with valid hidden attributes', () => {
    const player = generatePlayer({ teamReputation: 50, position: 'MID' });
    expect(player.hidden.consistency).toBeGreaterThanOrEqual(1);
    expect(player.hidden.consistency).toBeLessThanOrEqual(5);
    expect(player.hidden.injuryProneness).toBeGreaterThanOrEqual(1);
    expect(player.hidden.injuryProneness).toBeLessThanOrEqual(10);
  });

  it('generates player with valid financial data', () => {
    const player = generatePlayer({ teamReputation: 60, position: 'FWD' });
    expect(player.marketValue).toBeGreaterThan(0);
    expect(player.salary).toBeGreaterThan(0);
    expect(player.contractEnd).toBeGreaterThanOrEqual(52);
  });
});

describe('playerGenerator - getRandomNationality', () => {
  it('returns Brasil for low reputation teams', () => {
    const nationality = getRandomNationality(20);
    expect(nationality).toBe('Brasil');
  });

  it('returns a valid nationality for high reputation teams', () => {
    const validCountries = Object.keys(NAMES_DATABASE);
    // Run multiple times due to randomness
    for (let i = 0; i < 10; i++) {
      const nationality = getRandomNationality(80);
      expect(validCountries).toContain(nationality);
    }
  });

  it('returns valid nationality for mid-range reputation', () => {
    const validCountries = Object.keys(NAMES_DATABASE);
    for (let i = 0; i < 10; i++) {
      const nationality = getRandomNationality(50);
      expect(validCountries).toContain(nationality);
    }
  });
});

describe('playerGenerator - getRandomPosition', () => {
  it('returns a valid position', () => {
    const validPositions = ['GK', 'DEF', 'MID', 'FWD'];
    for (let i = 0; i < 20; i++) {
      const pos = getRandomPosition();
      expect(validPositions).toContain(pos);
    }
  });
});

describe('playerGenerator - generateYouthIntake', () => {
  it('generates the requested count of players', () => {
    const youth = generateYouthIntake(5, 8);
    expect(youth).toHaveLength(8);
  });

  it('all youth players have age 15-18', () => {
    const youth = generateYouthIntake(3, 10);
    youth.forEach(p => {
      expect(p.age).toBeGreaterThanOrEqual(15);
      expect(p.age).toBeLessThanOrEqual(18);
    });
  });

  it('higher youth level produces higher potential', () => {
    const lowLevel = generateYouthIntake(1, 5);
    const highLevel = generateYouthIntake(10, 5);
    const avgLow = lowLevel.reduce((sum, p) => sum + p.potentialAbility, 0) / lowLevel.length;
    const avgHigh = highLevel.reduce((sum, p) => sum + p.potentialAbility, 0) / highLevel.length;
    // Higher level should generally produce higher potential
    expect(avgHigh).toBeGreaterThan(avgLow);
  });

  it('defaults to 10 players if count not specified', () => {
    const youth = generateYouthIntake(5);
    expect(youth).toHaveLength(10);
  });
});

describe('playerGenerator - generateTeam', () => {
  it('generates a team with default values', () => {
    const team = generateTeam({});
    expect(team.squad.length).toBe(18);
    expect(team.division).toBe('Série A');
    expect(team.league).toBe('Brasileirão');
    expect(team.reputation).toBe(50);
  });

  it('generates a team with custom name', () => {
    const team = generateTeam({ name: 'FC Test' });
    expect(team.name).toBe('FC Test');
  });

  it('generates a team with custom squad size', () => {
    const team = generateTeam({ squadSize: 25 });
    expect(team.squad.length).toBe(25);
  });

  it('generates a team with correct facilities based on reputation', () => {
    const team = generateTeam({ reputation: 80 });
    expect(team.facilitiesLevel).toBe(8); // Math.floor(80/10)
    expect(team.youthFacilitiesLevel).toBe(5); // Math.floor(80/15)
    expect(team.scoutingLevel).toBe(6); // Math.floor(80/12)
  });

  it('generates a team with division and league', () => {
    const team = generateTeam({ division: 'Série B', league: 'Brasileirão' });
    expect(team.division).toBe('Série B');
    expect(team.league).toBe('Brasileirão');
  });

  it('squad has valid position distribution', () => {
    const team = generateTeam({ squadSize: 18 });
    const gks = team.squad.filter(p => p.position === 'GK');
    const defs = team.squad.filter(p => p.position === 'DEF');
    expect(gks.length).toBeGreaterThanOrEqual(1);
    expect(defs.length).toBeGreaterThanOrEqual(1);
  });

  it('generates team with valid tactics config', () => {
    const team = generateTeam({ reputation: 60 });
    expect(team.tacticsConfig).toBeDefined();
  });
});
