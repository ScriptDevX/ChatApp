import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '../../types';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  canInstall?: boolean;
  onInstallApp?: () => void;
  onOpenProfileSettings: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentUser,
  canInstall,
  onInstallApp,
  onOpenProfileSettings,
  onOpenSettings,
  onLogout,
}) => {
  const { mode, toggleMode } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
            }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '82%',
              maxWidth: '310px',
              height: '100%',
              backgroundColor: 'var(--surface-color)',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0, 0, 0, 0.25)',
              borderRight: '1px solid var(--border-color)',
            }}
          >
            {/* User Details Header */}
            <div
              style={{
                padding: '24px 20px',
                backgroundColor: 'var(--surface-color)',
                borderBottom: '1px solid var(--border-color)',
                position: 'relative',
              }}
            >
              {/* Theme Toggle Button */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={toggleMode}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Toggle theme mode"
              >
                <span className="material-icons-round" style={{ fontSize: '22px' }}>
                  {mode === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </motion.button>

              <Avatar
                name={currentUser.displayName}
                initials={currentUser.initials}
                color={currentUser.avatarColor}
                imageUrl={currentUser.avatarUrl}
                size="lg"
                className="mb-3"
              />

              <div style={{ marginTop: '8px' }}>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    color: 'var(--text-color)',
                    margin: 0,
                  }}
                  className="truncate"
                >
                  {currentUser.displayName}
                </h3>
                <span
                  onClick={() => {
                    if (!currentUser.username) {
                      onClose();
                      onOpenProfileSettings();
                    }
                  }}
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--accent-color)',
                    display: 'block',
                    marginTop: '2px',
                    fontWeight: 500,
                    cursor: !currentUser.username ? 'pointer' : 'default',
                  }}
                  className="truncate"
                >
                  {currentUser.username ? `@${currentUser.username}` : 'Set username'}
                </span>
              </div>
            </div>

            {/* Navigation Items */}
            <nav style={{ flexGrow: 1, padding: '12px 0', overflowY: 'auto' }}>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onClose();
                  onOpenProfileSettings();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  width: '100%',
                  padding: '14px 20px',
                  color: 'var(--text-color)',
                  fontSize: '0.98rem',
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                }}
              >
                <span className="material-icons-round" style={{ color: 'var(--text-secondary)', fontSize: '22px' }}>
                  person
                </span>
                Profile Settings
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  width: '100%',
                  padding: '14px 20px',
                  color: 'var(--text-color)',
                  fontSize: '0.98rem',
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                }}
              >
                <span className="material-icons-round" style={{ color: 'var(--text-secondary)', fontSize: '22px' }}>
                  palette
                </span>
                Settings & Themes
              </motion.button>

              {canInstall && onInstallApp && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onClose();
                    onInstallApp();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    width: '100%',
                    padding: '14px 20px',
                    color: 'var(--accent-color)',
                    fontSize: '0.98rem',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                  }}
                >
                  <span className="material-icons-round" style={{ color: 'var(--accent-color)', fontSize: '22px' }}>
                    get_app
                  </span>
                  Install FunChat
                </motion.button>
              )}
            </nav>

            {/* Logout Footer */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  width: '100%',
                  padding: '8px 0',
                  color: 'var(--error-color)',
                  fontSize: '0.98rem',
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '22px' }}>
                  logout
                </span>
                Log Out
              </motion.button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
