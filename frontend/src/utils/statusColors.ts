/**
 * Canonical status colors for the FM dark theme — mirrors the `--t-*` tokens
 * declared on `.fms-page` in fm-shared.css. Centralizing these avoids components
 * hardcoding their own Material-style hex palette (#4CAF50, #F44336, etc.), which
 * drifts visually from the rest of the app.
 *
 * Safe to use from any component rendered inside a `.fms-page` tree, since CSS
 * custom properties inherit down the DOM regardless of which stylesheet defines them.
 */
export const STATUS_COLOR = {
  green: 'var(--t-green)',
  amber: 'var(--t-amber)',
  red: 'var(--t-red)',
  accent: 'var(--t-accent)',
  purple: 'var(--t-purple)',
  muted: 'var(--t-text-3)',
} as const;

interface RatingThresholds {
  high: number;
  medium: number;
}

const DEFAULT_THRESHOLDS: RatingThresholds = { high: 70, medium: 40 };

/** 3-tier green/amber/red color for 0-100 style values where higher is better (fitness, form, morale). */
export function getRatingColor(value: number, thresholds: RatingThresholds = DEFAULT_THRESHOLDS): string {
  if (value >= thresholds.high) return STATUS_COLOR.green;
  if (value >= thresholds.medium) return STATUS_COLOR.amber;
  return STATUS_COLOR.red;
}

/** Inverted 3-tier color — for values where higher is worse (injury risk, media pressure). */
export function getInverseRatingColor(value: number, thresholds: RatingThresholds = DEFAULT_THRESHOLDS): string {
  if (value >= thresholds.high) return STATUS_COLOR.red;
  if (value >= thresholds.medium) return STATUS_COLOR.amber;
  return STATUS_COLOR.green;
}

/** Tri-state color for explicit positive/neutral/negative labels (profit, satisfaction, sentiment). */
export function getTriStateColor(state: 'positive' | 'neutral' | 'negative'): string {
  if (state === 'positive') return STATUS_COLOR.green;
  if (state === 'negative') return STATUS_COLOR.red;
  return STATUS_COLOR.amber;
}

/** Solid color per outfield line — GK blue, DEF green, MID amber, FWD red. */
export function getPositionColor(position: string): string {
  switch (position) {
    case 'GK': return STATUS_COLOR.accent;
    case 'DEF': return STATUS_COLOR.green;
    case 'MID': return STATUS_COLOR.amber;
    case 'FWD': return STATUS_COLOR.red;
    default: return STATUS_COLOR.muted;
  }
}

/** Translucent tint of the position color, for badge backgrounds. */
export function getPositionTint(position: string): string {
  return `color-mix(in srgb, ${getPositionColor(position)} 20%, transparent)`;
}

/** Scout report grade (A best — F worst) mapped onto the 3-tier palette. */
export function getGradeColor(grade?: string): string {
  switch (grade) {
    case 'A':
    case 'B':
      return STATUS_COLOR.green;
    case 'C':
    case 'D':
      return STATUS_COLOR.amber;
    case 'E':
    case 'F':
      return STATUS_COLOR.red;
    default:
      return STATUS_COLOR.muted;
  }
}

/** Injury severity color. */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'minor': return STATUS_COLOR.green;
    case 'moderate': return STATUS_COLOR.amber;
    case 'severe': return STATUS_COLOR.red;
    default: return STATUS_COLOR.muted;
  }
}
