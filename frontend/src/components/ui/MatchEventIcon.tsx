import React from 'react';
import { Goal, Footprints, Hand, Flag, OctagonAlert, Square, RefreshCw, Circle, type LucideIcon } from 'lucide-react';

const EVENT_ICON: Record<string, LucideIcon> = {
  goal: Goal,
  shot: Footprints,
  save: Hand,
  corner: Flag,
  foul: OctagonAlert,
  yellow: Square,
  red: Square,
  substitution: RefreshCw,
};

const EVENT_ICON_COLOR: Record<string, string> = {
  yellow: 'var(--t-amber)',
  red: 'var(--t-red)',
};

/** Shared match-event icon (goal/shot/save/corner/foul/cards/sub) used by MatchCenter and MatchPitch2D. */
export const MatchEventIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 14 }) => {
  const Icon = EVENT_ICON[type] ?? Circle;
  const color = EVENT_ICON_COLOR[type];
  return <Icon size={size} {...(color ? { fill: color, stroke: color } : {})} />;
};
