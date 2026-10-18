import React from 'react';
import { motion } from 'framer-motion';
import { Lottie } from 'lottie-react';
import emptyChatLottie from '../../assets/lottie/emptyChat.json';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  showLottie?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'chat_bubble_outline',
  title,
  description,
  action,
  showLottie = true,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        height: '100%',
      }}
    >
      {showLottie ? (
        <div style={{ width: '120px', height: '90px', marginBottom: '12px' }}>
          <Lottie
            src={emptyChatLottie}
            autoplay
            loop
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      ) : (
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--surface-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span
            className="material-icons-round"
            style={{ fontSize: '28px', color: 'var(--accent-color)' }}
          >
            {icon}
          </span>
        </motion.div>
      )}
      <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '6px' }}>
        {title}
      </h4>
      {description && (
        <p style={{ fontSize: '0.9rem', maxWidth: '280px', lineHeight: 1.4, marginBottom: action ? '16px' : '0' }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </motion.div>
  );
};
