import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Football Manager Web brand mark: tactics-board pitch crest on a dark tile.
 * Raster asset in /brand — scale via `size`.
 */
export const Logo: React.FC<LogoProps> = ({ size = 48, className, title = 'Football Manager Web' }) => (
  <img
    className={className}
    src="/brand/fm-web-logo.png"
    width={size}
    height={size}
    alt={title}
    decoding="async"
    style={{ width: size, height: size, objectFit: 'contain', display: 'block', borderRadius: Math.round(size * 0.22) }}
  />
);
