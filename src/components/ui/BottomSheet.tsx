import React, { useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '75vh',
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--surface-color)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          borderTop: '1px solid var(--border-color)',
          maxHeight,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          paddingBottom: 'var(--safe-area-bottom)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'var(--border-color)',
            margin: '10px auto 4px auto',
          }}
        />

        {title && (
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-color)' }}>
              {title}
            </h4>
            <button
              onClick={onClose}
              style={{
                color: 'var(--text-secondary)',
                fontSize: '18px',
                padding: '4px',
              }}
            >
              <span className="material-icons-round">close</span>
            </button>
          </div>
        )}

        <div style={{ padding: '16px 20px', overflowY: 'auto', flexGrow: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
};
