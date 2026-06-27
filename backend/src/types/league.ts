// Tipos da Tabela de Classificação

export type FormResult = 'W' | 'D' | 'L';

export interface LeagueStandings {
  teamId: string;
  teamName: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: FormResult[];
  zone?: 'title' | 'europe' | 'safe' | 'relegation';
  isRelegated?: boolean; // Item 1.2 — marca time rebaixado
}
