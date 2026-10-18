import React from 'react';
import { motion } from 'framer-motion';
import { Lottie } from 'lottie-react';
import maintenanceLottie from '../../assets/lottie/maintenance.json';

interface MaintenanceScreenProps {
  message?: string;
  onRetry?: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  message = 'We are currently performing scheduled system upgrades to improve service speed and stability. We will be back online shortly!',
  onRetry,
}) => {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 20px',
        backgroundColor: 'var(--bg-color)',
        textAlign: 'center',
        userSelect: 'none',
        overflowY: 'auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          backgroundColor: 'var(--surface-color)',
          padding: '36px 28px',
          borderRadius: '28px',
          boxShadow: '0 16px 44px rgba(0,0,0,0.24)',
          width: '100%',
          maxWidth: '420px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Animated Maintenance Lottie Hero */}
        <div style={{ width: '220px', height: '170px', marginBottom: '8px' }}>
          <Lottie
            src={maintenanceLottie}
            autoplay
            loop
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Maintenance Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            backgroundColor: 'rgba(234, 179, 8, 0.14)',
            color: '#eab308',
            fontSize: '0.82rem',
            fontWeight: 600,
            marginBottom: '14px',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '16px' }}>
            build
          </span>
          Under Scheduled Maintenance
        </div>

        <h2
          style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: 'var(--text-color)',
            marginBottom: '10px',
          }}
        >
          System Maintenance
        </h2>

        <p
          style={{
            fontSize: '0.92rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            marginBottom: '28px',
            maxWidth: '340px',
          }}
        >
          {message}
        </p>

        {/* Refresh / Check Again Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            if (onRetry) {
              onRetry();
            } else {
              window.location.reload();
            }
          }}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent-color)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(0, 136, 204, 0.35)',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '18px' }}>
            refresh
          </span>
          Check Status
        </motion.button>
      </motion.div>
    </div>
  );
};
