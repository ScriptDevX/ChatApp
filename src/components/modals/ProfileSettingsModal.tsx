import React, { useRef, useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { uploadImageApi } from '../../services/imageUpload';
import { userRepository } from '../../services';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSave: (displayName: string, avatarUrl?: string, username?: string) => Promise<void>;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMsg, setUsernameMsg] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser.displayName || '');
      setUsername(currentUser.username || '');
      setUsernameStatus('idle');
      setUsernameMsg('');
      setAvatarUrl(currentUser.avatarUrl || '');
      setError('');
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean || clean === (currentUser.username || '').toLowerCase()) {
      setUsernameStatus('idle');
      setUsernameMsg('');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameMsg('3-20 characters: letters, numbers, and underscores only');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMsg('Checking availability...');
    const timer = setTimeout(async () => {
      try {
        const available = await userRepository.isUsernameAvailable(clean, currentUser.uid);
        if (available) {
          setUsernameStatus('available');
          setUsernameMsg(`@${clean} is available!`);
        } else {
          setUsernameStatus('taken');
          setUsernameMsg(`@${clean} is already taken.`);
        }
      } catch {
        setUsernameStatus('idle');
        setUsernameMsg('');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, currentUser.uid, currentUser.username]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setError('');
      const url = await uploadImageApi(file);
      setAvatarUrl(url);
    } catch (err: any) {
      setError('Failed to upload profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const clean = displayName.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

    if (!clean || clean.length > 30) {
      setError('Display name is required (max 30 chars).');
      return;
    }

    if (!cleanUsername) {
      setError('Username is required.');
      return;
    }

    if (cleanUsername !== (currentUser.username || '').toLowerCase()) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
        setError('Username must be 3-20 characters (letters, numbers, underscores).');
        return;
      }
      if (usernameStatus === 'taken') {
        setError('This username is already taken. Please pick another.');
        return;
      }
      if (usernameStatus === 'checking') {
        setError('Please wait, verifying username availability...');
        return;
      }
    }

    try {
      setLoading(true);
      await onSave(
        clean,
        avatarUrl || undefined,
        cleanUsername !== (currentUser.username || '').toLowerCase() ? cleanUsername : undefined
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Profile Settings"
      maxWidth="420px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading || uploadingAvatar}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={loading || uploadingAvatar}
            disabled={usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
          >
            Save
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Profile Avatar Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
            <Avatar
              name={displayName || currentUser.displayName}
              initials={currentUser.initials}
              color={currentUser.avatarColor}
              imageUrl={avatarUrl}
              size="xl"
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-color)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
              title="Change Profile Photo"
            >
              {uploadingAvatar ? (
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid #ffffff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              ) : (
                <span className="material-icons-round" style={{ fontSize: '16px' }}>
                  camera_alt
                </span>
              )}
            </div>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Tap icon to upload custom profile photo
          </span>
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
            Email
          </label>
          <input
            type="email"
            value={currentUser.email}
            readOnly
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(150, 150, 150, 0.08)',
              color: 'var(--text-secondary)',
              cursor: 'not-allowed',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              @
            </span>
            <input
              type="text"
              value={username.replace(/^@/, '')}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={20}
              placeholder="choose_username"
              style={{
                width: '100%',
                padding: '10px 14px 10px 30px',
                borderRadius: '8px',
                border: `1px solid ${
                  usernameStatus === 'available'
                    ? '#10b981'
                    : usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? '#ef4444'
                    : 'var(--input-border)'
                }`,
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                outline: 'none',
              }}
            />
          </div>
          {usernameMsg && (
            <div
              style={{
                marginTop: '4px',
                fontSize: '0.78rem',
                color:
                  usernameStatus === 'available'
                    ? '#10b981'
                    : usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? '#ef4444'
                    : 'var(--text-secondary)',
              }}
            >
              {usernameMsg}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={30}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-color)',
            }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{error}</div>
        )}
      </div>
    </Modal>
  );
};
