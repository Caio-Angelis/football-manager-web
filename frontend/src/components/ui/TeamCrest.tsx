import React from 'react';
import { getCrestColors, getTeamInitials, getTeamTier, type TeamTier } from '../../utils/teamColors';

interface TeamCrestProps {
  name: string;
  reputation?: number;
  tier?: TeamTier;
  size?: number;
  className?: string;
}

/** Procedural shield crest used across topbars/cards so every club has a stable, consistent identity. */
export const TeamCrest: React.FC<TeamCrestProps> = ({ name, reputation, tier, size = 48, className }) => {
  const resolvedTier = tier ?? getTeamTier(reputation ?? 50);
  const initials = getTeamInitials(name);
  const { primary, secondary } = getCrestColors(name, resolvedTier);
  const height = Math.round(size * (64 / 56));

  return (
    <div
      className={`fm-team-crest${className ? ` ${className}` : ''}`}
      style={{ width: size, height }}
      aria-hidden="true"
    >
      <svg className="fm-team-crest__svg" viewBox="0 0 56 64" fill="none" role="img">
        <title>{name} escudo</title>
        <path
          d="M28 2 L52 14 L52 34 C52 48 41 58 28 62 C15 58 4 48 4 34 L4 14 Z"
          fill={primary}
          stroke={secondary}
          strokeWidth="2"
        />
        <path
          d="M28 10 L44 18 L44 33 C44 43 37 50 28 53 C19 50 12 43 12 33 L12 18 Z"
          fill={secondary}
          opacity="0.35"
        />
        <text
          x="28"
          y="36"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="14"
          fontWeight="700"
          fontFamily="var(--font-family)"
        >
          {initials}
        </text>
      </svg>
    </div>
  );
};
