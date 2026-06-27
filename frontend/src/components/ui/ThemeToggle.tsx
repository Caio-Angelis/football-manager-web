import React from 'react';
import type { ThemePreference } from '../../utils/theme';
import { useTheme } from '../../hooks/useTheme';

const OPTIONS: { value: ThemePreference; label: string; title: string }[] = [
  { value: 'light', label: 'Claro', title: 'Tema claro' },
  { value: 'dark', label: 'Escuro', title: 'Tema escuro' },
  { value: 'system', label: 'Sistema', title: 'Seguir preferência do sistema' },
];

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', compact = false }) => {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className={`fm-theme-toggle ${compact ? 'fm-theme-toggle--compact' : ''} ${className}`.trim()}>
      <legend className="fm-theme-toggle__legend">Tema</legend>
      <div className="fm-theme-toggle__options" role="radiogroup" aria-label="Tema da interface">
        {OPTIONS.map((option) => (
          <label key={option.value} className="fm-theme-toggle__option" title={option.title}>
            <input
              type="radio"
              name="fm-theme"
              value={option.value}
              checked={preference === option.value}
              onChange={() => setPreference(option.value)}
            />
            <span className="fm-theme-toggle__label">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
