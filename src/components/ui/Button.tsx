import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  style,
  className = '',
  ...props
}) => {
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: 'var(--accent-color)',
          color: '#ffffff',
          border: 'none',
          hoverBg: 'var(--accent-hover)',
        };
      case 'secondary':
        return {
          bg: 'var(--input-bg)',
          color: 'var(--text-color)',
          border: '1px solid var(--border-color)',
          hoverBg: 'var(--surface-hover)',
        };
      case 'danger':
        return {
          bg: 'var(--error-color)',
          color: '#ffffff',
          border: 'none',
          hoverBg: '#dc2626',
        };
      case 'ghost':
        return {
          bg: 'transparent',
          color: 'var(--text-color)',
          border: 'none',
          hoverBg: 'rgba(150, 150, 150, 0.12)',
        };
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { padding: '6px 12px', fontSize: '0.85rem', height: '32px' };
      case 'md':
        return { padding: '10px 18px', fontSize: '0.95rem', height: '42px' };
      case 'lg':
        return { padding: '12px 24px', fontSize: '1.05rem', height: '48px' };
    }
  };

  const colors = getColors();
  const pad = getPadding();

  return (
    <button
      disabled={disabled || isLoading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        backgroundColor: colors.bg,
        color: colors.color,
        border: colors.border,
        borderRadius: '10px',
        fontWeight: 500,
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled || isLoading ? 0.6 : 1,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.15s ease, transform 0.05s ease',
        ...pad,
        ...style,
      }}
      className={className}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'currentColor',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        <>
          {leftIcon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{leftIcon}</span>}
          {children}
          {rightIcon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
