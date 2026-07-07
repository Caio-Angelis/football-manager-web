import React, { useState, useCallback } from 'react';

interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
  children: React.ReactNode;
  className?: string;
  title?: string;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  disabled = false,
  variant = 'primary',
  children,
  className = '',
  title,
  loading = false,
}) => {
  const [rippling, setRippling] = useState(false);

  const handleClick = useCallback(() => {
    if (!disabled && !loading) {
      setRippling(true);
      onClick?.();
      setTimeout(() => setRippling(false), 600);
    }
  }, [disabled, loading, onClick]);

  return (
    <button
      className={`fm-button fm-button--${variant} ${rippling ? 'fm-button--rippling' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      title={title}
    >
      {loading && <span className="fm-button__spinner" />}
      {children}
    </button>
  );
};
