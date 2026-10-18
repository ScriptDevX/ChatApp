import React from 'react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info' }) => {
  if (!message) return null;

  const bg =
    type === 'error'
      ? 'var(--error-color)'
      : type === 'success'
      ? 'var(--success-color)'
      : 'rgba(24, 34, 45, 0.95)';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: bg,
        color: '#ffffff',
        padding: '10px 20px',
        borderRadius: '24px',
        fontSize: '0.9rem',
        fontWeight: 500,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        zIndex: 9999,
        maxWidth: '90%',
        textAlign: 'center',
        animation: 'fadeInUp 0.2s ease-out',
        pointerEvents: 'none',
      }}
    >
      {message}
    </div>
  );
};
