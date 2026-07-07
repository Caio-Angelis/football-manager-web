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
      played: team.played,
      wins: team.won,
      draws: team.drawn,
      losses: team.lost,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      goalDifference: team.goalsFor - team.goalsAgainst,
      points: team.points,
      form: [],
      zone: 'safe',
    };
    teamFormMap[team.id] = [];
  });

  // Form (last 5 results) still derived from matches — only used for display.
  matches.forEach(match => {
    if (!match.completed) return;

    const home = standingsMap[match.homeTeam];
    const away = standingsMap[match.awayTeam];

    if (!home || !away) return;

    if (match.homeGoals > match.awayGoals) {
      teamFormMap[match.homeTeam].push('W');
      teamFormMap[match.awayTeam].push('L');
    } else if (match.homeGoals < match.awayGoals) {
      teamFormMap[match.awayTeam].push('W');
      teamFormMap[match.homeTeam].push('L');
    } else {
      teamFormMap[match.homeTeam].push('D');
      teamFormMap[match.awayTeam].push('D');
    }
  });

  // Assign form (last 5 results)
  Object.values(standingsMap).forEach(s => {
    s.form = (teamFormMap[s.teamId] || []).slice(-5);
  });

  const standings = Object.values(standingsMap);

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
