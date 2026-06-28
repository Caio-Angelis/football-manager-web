// Cálculo de Tabela de Classificação (P1.1)

import type { Team, Match, LeagueStandings, FormResult } from '../../types/game';

export function calculateLeagueStandings(
  teams: Team[],
  matches: Match[],
  currentWeek?: number,
): LeagueStandings[] {
  const standingsMap: Record<string, LeagueStandings> = {};
  const teamFormMap: Record<string, FormResult[]> = {};

  teams.forEach(team => {
    standingsMap[team.id] = {
      teamId: team.id,
      teamName: team.name,
      position: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
      zone: 'safe',
    };
    teamFormMap[team.id] = [];
  });

  matches.forEach(match => {
    if (!match.completed) return;

    const home = standingsMap[match.homeTeam];
    const away = standingsMap[match.awayTeam];

    if (!home || !away) return;

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.homeGoals;
    home.goalsAgainst += match.awayGoals;
    away.goalsFor += match.awayGoals;
    away.goalsAgainst += match.homeGoals;

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (match.homeGoals > match.awayGoals) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
      teamFormMap[match.homeTeam].push('W');
      teamFormMap[match.awayTeam].push('L');
    } else if (match.homeGoals < match.awayGoals) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
      teamFormMap[match.awayTeam].push('W');
      teamFormMap[match.homeTeam].push('L');
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
      teamFormMap[match.homeTeam].push('D');
      teamFormMap[match.awayTeam].push('D');
    }
  });

  // Assign form (last 5 results)
  Object.values(standingsMap).forEach(s => {
    s.form = (teamFormMap[s.teamId] || []).slice(-5);
  });

  let standings = Object.values(standingsMap);

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  const seasonOver = currentWeek !== undefined && currentWeek >= 38;

  standings.forEach((s, i) => {
    s.position = i + 1;
    if (i < 4) s.zone = 'title';
    else if (i < 8) s.zone = 'europe';
    else if (i >= standings.length - 3) s.zone = 'relegation';
    else s.zone = 'safe';
    // Item 1.2 — marcar times rebaixados apenas no final da temporada
    s.isRelegated = seasonOver && i >= standings.length - 3;
  });

  return standings;
}
