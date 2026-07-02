import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Football Manager Web brand mark: a top-down tactical pitch inside a rounded
 * blue tile, with a green centre spot echoing the app's accent palette.
 * Self-contained SVG (own background) — scale via `size`.
 */
export const Logo: React.FC<LogoProps> = ({ size = 48, className, title = 'Football Manager Web' }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    role="img"
    aria-label={title}
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{title}</title>
    <defs>
      <linearGradient id="fm-logo-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4a86ff" />
        <stop offset="1" stopColor="#2a5fb0" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="12" fill="url(#fm-logo-bg)" />
    <g stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.6" fill="none" strokeLinejoin="round">
      <rect x="9" y="11" width="30" height="26" rx="2.5" />
      <line x1="24" y1="11" x2="24" y2="37" />
      <circle cx="24" cy="24" r="5.5" />
      <path d="M9 18 h5 v12 h-5" />
      <path d="M39 18 h-5 v12 h5" />
    </g>
    <circle cx="24" cy="24" r="1.7" fill="#3fbf6b" />
  </svg>
);
