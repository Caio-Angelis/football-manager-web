import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  disabled = false,
  variant = 'primary',
  children,
  className = '',
}) => {
  const baseClass = 'fm-button';
  const variantClass = `fm-button--${variant}`;
  const disabledClass = disabled ? 'fm-button--disabled' : '';
  const customClass = className;

  return (
    <button
      className={`${baseClass} ${variantClass} ${disabledClass} ${customClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
