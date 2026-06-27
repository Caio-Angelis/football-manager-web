// Motor de Partida — Cálculo de força, simulação e ratings

import type { Team, Match, MatchEvent, MatchStats, PlayerMatchRating } from '../../types/game';

// ============================================================
// CÁLCULO DE FORÇA DO TIME
// ============================================================

export function getTacticalBonus(team: Team): number {
  let bonus = 0;
  if (team.tactic === 'attacking') bonus += 0.08;
  if (team.tactic === 'defensive') bonus += 0.05;
  if (team.teamMentality === 'offensive' || team.teamMentality === 'very offensive') bonus += 0.05;
  if (team.teamMentality === 'defensive' || team.teamMentality === 'very defensive') bonus += 0.04;

  const counterPress = team.afterLosingPossession === 'counterPress'
    || (!team.afterLosingPossession && team.counterPress);
  const counterAttack = team.afterGainingPossession === 'counterAttack';
  const highPress = team.pressIntensity === 'high'
    || (!team.pressIntensity && team.highPress);
  const highLine = team.engagementLine === 'high' || team.defensiveLine === 'high'
    || (!team.engagementLine && team.highLine);
  const aggressiveTackling = team.tacklingStyle === 'aggressive'
    || (!team.tacklingStyle && team.aggressiveTackling);

  if (highPress) bonus += 0.03;
  if (counterPress) bonus += 0.03;
  if (counterAttack) bonus += 0.04;
  if (highLine) bonus += 0.02;
  if (aggressiveTackling) bonus += 0.02;
  if (team.trapOffside) bonus += 0.01;
  if (team.workBallIntoBox) bonus += 0.02;
  if (team.tempo === 'fast') bonus += 0.03;
  if (team.passingStyle === 'short') bonus += 0.02;
  return bonus;
}

export function calculateTeamStrength(team: Team): number {
  const starting11 = team.squad.slice(0, 11);
  let totalStrength = 0;

  starting11.forEach(player => {
    let sum = 0;
    let count = 0;

    if (player.technical) {
      [player.technical.passing, player.technical.technique, player.technical.finishing,
        player.technical.dribbling, player.technical.crossing].forEach(v => {
        if (v) { sum += v * 4; count++; }
      });
    }
    if (player.mental) {
      [player.mental.vision, player.mental.decisions, player.mental.composure,
        player.mental.anticipation, player.mental.positioning].forEach(v => {
        if (v) { sum += v * 5; count++; }
      });
    }
    if (player.physical) {
      [player.physical.speed, player.physical.stamina, player.physical.strength,
        player.physical.agility, player.physical.acceleration].forEach(v => {
        if (v) { sum += v * 3; count++; }
      });
    }

    const playerStrength = (player.currentAbility * 0.6 + (sum / Math.max(count, 1)) * 5.5) * 1.2;
    totalStrength += playerStrength * (player.form / 100) * (player.fitness / 100);
  });

  return (totalStrength / Math.max(starting11.length, 1)) * (1 + getTacticalBonus(team));
}

export function getPossessionBias(home: Team, away: Team): number {
  const homePass = home.squad.slice(0, 11).reduce((s, p) => s + (p.technical?.passing ?? 10), 0);
  const awayPass = away.squad.slice(0, 11).reduce((s, p) => s + (p.technical?.passing ?? 10), 0);
  const homeTactic = home.passingStyle === 'short' ? 0.05 : home.passingStyle === 'direct' ? -0.03 : 0;
  const awayTactic = away.passingStyle === 'short' ? 0.05 : away.passingStyle === 'direct' ? -0.03 : 0;
  const total = homePass + awayPass + 1;
  return (homePass / total) + homeTactic - awayTactic + 0.02;
}

// ============================================================
// MOTOR DE PARTIDA
// ============================================================

export function simulateMatchResult(homeTeam: Team, awayTeam: Team, homeBoost = 0, awayBoost = 0): {
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  stats: MatchStats;
} {
  const homeStrength = calculateTeamStrength(homeTeam) * (1 + homeBoost);
  const awayStrength = calculateTeamStrength(awayTeam) * (1 + awayBoost);
  const homeAdvantage = 0.12;

  const homeGoalChance = (homeStrength + homeAdvantage) / (homeStrength + awayStrength + homeAdvantage);
  const awayGoalChance = 1 - homeGoalChance;

  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeShotsOnTarget = 0;
  let awayShotsOnTarget = 0;
  let homePasses = 0;
  let awayPasses = 0;

  const homePossession = Math.min(0.75, Math.max(0.25, getPossessionBias(homeTeam, awayTeam)));

  for (let minute = 1; minute <= 90; minute++) {
    const eventProbability = 0.05 + Math.random() * 0.1;

    if (Math.random() < eventProbability) {
      if (Math.random() < homePossession) {
        homeShots += Math.floor(Math.random() * 3) + 1;
        homePasses += Math.floor(Math.random() * 15) + 5;

        if (Math.random() < 0.15 * homeGoalChance) {
          homeShotsOnTarget++;
          if (Math.random() < 0.4) {
            homeGoals++;
            const scorer = homeTeam.squad[Math.floor(Math.random() * Math.min(11, homeTeam.squad.length))];
            events.push({
              minute,
              type: 'goal',
              team: 'home',
              player: scorer?.name,
              description: `GOOOL! ${scorer?.name ?? homeTeam.name} marca!`,
            });
          } else {
            events.push({ minute, type: 'shot', team: 'home', description: 'Chute perigoso' });
          }
        }
      } else {
        awayShots += Math.floor(Math.random() * 3) + 1;
        awayPasses += Math.floor(Math.random() * 15) + 5;

        if (Math.random() < 0.15 * awayGoalChance) {
          awayShotsOnTarget++;
          if (Math.random() < 0.4) {
            awayGoals++;
            const scorer = awayTeam.squad[Math.floor(Math.random() * Math.min(11, awayTeam.squad.length))];
            events.push({
              minute,
              type: 'goal',
              team: 'away',
              player: scorer?.name,
              description: `GOOOL! ${scorer?.name ?? awayTeam.name} marca!`,
            });
          } else {
            events.push({ minute, type: 'shot', team: 'away', description: 'Chute perigoso' });
          }
        }
      }

      if (Math.random() < 0.05) {
        events.push({
          minute,
          type: 'save',
          team: Math.random() < 0.5 ? 'away' : 'home',
          description: 'Grande defesa!',
        });
      }
      if (Math.random() < 0.06) {
        events.push({
          minute,
          type: 'corner',
          team: Math.random() < 0.5 ? 'home' : 'away',
          description: 'Escanteio',
        });
      }
      if (Math.random() < 0.04) {
        events.push({
          minute,
          type: 'foul',
          team: Math.random() < 0.5 ? 'home' : 'away',
          description: 'Falta',
        });
      }
    }
  }

  const stats: MatchStats = {
    homeXG: Math.round(homeGoals * (0.8 + Math.random() * 0.4) * 100) / 100,
    awayXG: Math.round(awayGoals * (0.8 + Math.random() * 0.4) * 100) / 100,
    homePossession: Math.round(homePossession * 100),
    awayPossession: 100 - Math.round(homePossession * 100),
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homePasses,
    awayPasses,
    homePassAccuracy: Math.round(70 + Math.random() * 20),
    awayPassAccuracy: Math.round(70 + Math.random() * 20),
  };

  return { homeGoals, awayGoals, events, stats };
}

// ============================================================
// CÁLCULO DE RATING DE JOGADORES (Tarefa 2.2)
// ============================================================

export function calculatePlayerMatchRatings(homeTeam: Team, awayTeam: Team, result: ReturnType<typeof simulateMatchResult>): ReturnType<typeof simulateMatchResult> & { playerRatings: PlayerMatchRating[]; bestPlayer?: string } {
  const ratings: PlayerMatchRating[] = [];
  const allPlayers = [...homeTeam.squad.slice(0, 11), ...awayTeam.squad.slice(0, 11)];

  allPlayers.forEach(player => {
    // Count player-specific events
    const playerGoals = result.events.filter(e => e.type === 'goal' && e.player === player.name).length;
    const playerShots = playerGoals + Math.floor(Math.random() * 4);
    const playerShotsOnTarget = playerGoals;
    const playerPasses = Math.floor(Math.random() * 60) + 30;
    const playerPassAccuracy = 60 + Math.random() * 30;
    const playerTackles = Math.floor(Math.random() * 5) + 1;
    const playerInterceptions = Math.floor(Math.random() * 4) + 1;

    // Calculate rating based on performance
    let baseRating = 6.0; // Average rating

    // Goals add significant rating
    baseRating += playerGoals * 1.2;

    // Shots on target with accuracy bonus
    if (playerShots > 0) {
      baseRating += (playerShotsOnTarget / Math.max(playerShots, 1)) * 0.5;
    }

    // Pass accuracy bonus
    baseRating += (playerPassAccuracy - 70) * 0.01;

    // Tackle/interception bonus (defensive players)
    if (player.position === 'DEF') {
      baseRating += (playerTackles * 0.3) + (playerInterceptions * 0.2);
    }

    // CA influences ceiling
    const caCeiling = Math.min(10, 5 + (player.currentAbility / 20));
    if (baseRating > caCeiling) baseRating = caCeiling;

    // Clamp rating between 1 and 10
    const rating = Math.max(1, Math.min(10, Math.round(baseRating * 10) / 10));

    ratings.push({
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      rating,
      goals: playerGoals,
      assists: playerGoals > 0 ? Math.floor(Math.random() * 2) : 0,
      shots: playerShots,
      shotsOnTarget: playerShotsOnTarget,
      passes: playerPasses,
      passAccuracy: Math.round(playerPassAccuracy),
      tackles: playerTackles,
      interceptions: playerInterceptions,
      minutesPlayed: 90,
      isStarted: player.squadStatus !== 'Young Talent',
    });
  });

  // Find best player
  const bestPlayer = ratings.reduce((best, r) => (r.rating > best.rating ? r : best), ratings[0]);

  return { ...result, playerRatings: ratings, bestPlayer: bestPlayer?.playerId };
}

export function generateWeekMatches(teams: Team[], week: number): Match[] {
  const matches: Match[] = [];
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      const day = (i / 2) % 5 + 1;
      matches.push({
        homeTeam: shuffled[i].id,
        awayTeam: shuffled[i + 1].id,
        homeGoals: 0,
        awayGoals: 0,
        date: `Semana ${week} - Dia ${day}`,
        completed: false,
        isLive: false,
        liveMinute: 0,
        liveEvents: [],
        liveStats: {
          homeXG: 0,
          awayXG: 0,
          homePossession: 50,
          awayPossession: 50,
          homeShots: 0,
          awayShots: 0,
          homeShotsOnTarget: 0,
          awayShotsOnTarget: 0,
          homePasses: 0,
          awayPasses: 0,
          homePassAccuracy: 70,
          awayPassAccuracy: 70,
        },
        homeSubstitutions: 0,
        awaySubstitutions: 0,
        events: [],
        stats: undefined,
      });
    }
  }

  return matches;
}

export function applyMatchResultToTeams(
  teams: Team[],
  homeId: string,
  awayId: string,
  result: ReturnType<typeof simulateMatchResult>,
): Team[] {
  const updated = [...teams];
  const homeIdx = updated.findIndex(t => t.id === homeId);
  const awayIdx = updated.findIndex(t => t.id === awayId);
  if (homeIdx === -1 || awayIdx === -1) return teams;

  const homeTeam = { ...updated[homeIdx] };
  const awayTeam = { ...updated[awayIdx] };

  homeTeam.played++;
  awayTeam.played++;
  homeTeam.goalsFor += result.homeGoals;
  awayTeam.goalsFor += result.awayGoals;
  homeTeam.goalsAgainst += result.awayGoals;
  awayTeam.goalsAgainst += result.homeGoals;

  if (result.homeGoals > result.awayGoals) {
    homeTeam.points += 3;
    homeTeam.won++;
    awayTeam.lost++;
  } else if (result.homeGoals < result.awayGoals) {
    awayTeam.points += 3;
    awayTeam.won++;
    homeTeam.lost++;
  } else {
    homeTeam.points += 1;
    awayTeam.points += 1;
    homeTeam.drawn++;
    awayTeam.drawn++;
  }

  updated[homeIdx] = homeTeam;
  updated[awayIdx] = awayTeam;
  return updated;
}
