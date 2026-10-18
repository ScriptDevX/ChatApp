import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColor, UserPrivacySettings, CallPrivacyOption, UserProfile } from '../../types';
import { THEME_COLOR_MAP } from '../../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUpdatePrivacy: (settings: UserPrivacySettings) => Promise<void>;
  onDeleteAccount: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdatePrivacy,
  onDeleteAccount,
}) => {
  const { color, setColor } = useTheme();

  const [callPrivacy, setCallPrivacy] = useState<CallPrivacyOption>('everyone');
  const [allowedInput, setAllowedInput] = useState('');
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [privacySavedMsg, setPrivacySavedMsg] = useState(false);

  useEffect(() => {
    if (currentUser?.privacySettings) {
      setCallPrivacy(currentUser.privacySettings.callPrivacy || 'everyone');
      setAllowedInput((currentUser.privacySettings.allowedCallers || []).join(', '));
    }
  }, [currentUser, isOpen]);

  const handleSavePrivacy = async () => {
    setIsSavingPrivacy(true);
    try {
      const allowed = allowedInput
        .split(',')
        .map((s) => s.trim().replace(/^@/, '').toLowerCase())
        .filter(Boolean);

      await onUpdatePrivacy({
        callPrivacy,
        allowedCallers: allowed,
      });
      setPrivacySavedMsg(true);
      setTimeout(() => setPrivacySavedMsg(false), 2000);
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const swatches: { id: ThemeColor; label: string; hex: string }[] = [
    { id: 'default', label: 'Default Blue', hex: THEME_COLOR_MAP.default },
    { id: 'green', label: 'Telegram Green', hex: THEME_COLOR_MAP.green },
    { id: 'purple', label: 'Royal Purple', hex: THEME_COLOR_MAP.purple },
    { id: 'orange', label: 'Warm Orange', hex: THEME_COLOR_MAP.orange },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" maxWidth="440px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Call & Video Call Privacy */}
        <div>
          <label
            style={{
              fontSize: '0.92rem',
              fontWeight: 600,
              color: 'var(--text-color)',
              marginBottom: '4px',
              display: 'block',
            }}
          >
            Who can Call & Video Call me?
          </label>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Control voice and video call access for your account.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: 'var(--input-bg)',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}
          >
            {(
              [
                { id: 'everyone', label: 'Everyone', desc: 'Anyone can call you' },
                { id: 'selected', label: 'Selected Usernames', desc: 'Only specified users' },
                { id: 'nobody', label: 'Nobody', desc: 'Disable all incoming calls' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: callPrivacy === opt.id ? 'var(--surface-color)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="callPrivacy"
                  checked={callPrivacy === opt.id}
                  onChange={() => setCallPrivacy(opt.id)}
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-color)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {opt.desc}
                  </div>
                </div>
              </label>
            ))}

            {callPrivacy === 'selected' && (
              <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                <label
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Allowed usernames (comma separated):
                </label>
                <input
                  type="text"
                  placeholder="e.g. rahul, alex, john_doe"
                  value={allowedInput}
                  onChange={(e) => setAllowedInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--surface-color)',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', gap: '8px', alignItems: 'center' }}>
              {privacySavedMsg && (
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 500 }}>
                  Saved!
                </span>
              )}
              <Button size="sm" onClick={handleSavePrivacy} disabled={isSavingPrivacy}>
                {isSavingPrivacy ? 'Saving...' : 'Save Privacy'}
              </Button>
            </div>
          </div>
        </div>

        {/* Accent Color Selection */}
        <div>
          <label
            style={{
              fontSize: '0.92rem',
              fontWeight: 500,
              color: 'var(--text-color)',
              marginBottom: '12px',
              display: 'block',
            }}
          >
            Accent Color Theme
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'var(--input-bg)',
            }}
          >
            {swatches.map((s) => {
              const isSelected = color === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setColor(s.id)}
                  title={s.label}
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    minHeight: '36px',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    backgroundColor: s.hex,
                    border: isSelected ? '3px solid var(--surface-color)' : '2px solid transparent',
                    boxShadow: isSelected ? `0 0 0 2px ${s.hex}` : 'none',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Account Deletion */}
        <div
          style={{
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h5 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-color)' }}>
              Delete Account
            </h5>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Irreversibly delete profile and data
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onClose();
              onDeleteAccount();
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};
