import type { PlayerBonus } from '../types/game';

const POSITION_COLORS: Record<string, string> = {
  GK: '#2196F3',
  DEF: '#4CAF50',
  MID: '#FF9800',
  FWD: '#F44336',
};

export function getPositionColor(position: string): string {
  return POSITION_COLORS[position] ?? '#9E9E9E';
}

export function getStatColor(value: number): string {
  if (value >= 80) return '#4CAF50';
  if (value >= 60) return '#8BC34A';
  if (value >= 40) return '#FFC107';
  if (value >= 20) return '#FF9800';
  return '#F44336';
}

export function getOverallRating(ca: number): number {
  return Math.round(ca / 2);
}

export const STATUS_LABELS: Record<string, string> = {
  'Key Player': 'Peça-chave',
  'Regular Starter': 'Titular',
  'Rotation': 'Rotação',
  'Young Talent': 'Promessa',
  'Excess': 'Outro',
};

export const BONUS_TYPE_LABELS: Record<PlayerBonus['type'], string> = {
  goals: 'Golos',
  appearances: 'Aparições',
  assists: 'Assistências',
  titles: 'Títulos',
  performance: 'Performance',
};

export const SQUAD_STATUS_OPTIONS = ['Key Player', 'Regular Starter', 'Rotation', 'Young Talent', 'Excess'];

export function getRiskColor(risk: number): string {
  if (risk >= 80) return '#F44336';
  if (risk >= 60) return '#FF9800';
  if (risk >= 30) return '#FFC107';
  return '#4CAF50';
}

export function getRiskLabel(risk: number): string {
  if (risk >= 80) return 'Crítico';
  if (risk >= 60) return 'Alto';
  if (risk >= 30) return 'Moderado';
  return 'Baixo';
}

export function getInfluenceColor(influence: number): string {
  if (influence >= 80) return '#22c32a';
  if (influence >= 60) return '#66b634';
  if (influence >= 40) return '#eab308';
  if (influence >= 20) return '#f59e0b';
  return '#ef4444';
}

export const FORM_RATING_COLORS: Record<string, string> = {
  excellent: '#22c32a',
  good: '#66b634',
  average: '#eab308',
  poor: '#f59e0b',
  terrible: '#ef4444',
};

export function getFormRatingColor(rating: string): string {
  return FORM_RATING_COLORS[rating] ?? '#eab308';
}

export const MATCH_RATING_COLORS: Record<string, string> = {
  excellent: '#22c55e',
  good: '#84cc10',
  average: '#eab308',
  poor: '#f9731b',
  bad: '#ef4444',
};

export const MATCH_RATING_LABELS: Record<string, string> = {
  excellent: 'Excelente',
  good: 'Bom',
  average: 'Médio',
  poor: 'Fraco',
  bad: 'Mau',
};

export function getMatchRatingClass(rating: number): string {
  if (rating >= 9) return 'excellent';
  if (rating >= 7) return 'good';
  if (rating >= 5) return 'average';
  if (rating >= 3) return 'poor';
  return 'bad';
}
