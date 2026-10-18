import React, { useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { GROUP_ICONS } from '../../constants';
import { isValidGroupUsername } from '../../utils';
import { uploadImageApi } from '../../services/imageUpload';
import { groupRepository } from '../../services';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    icon: string;
    avatarUrl?: string;
    type: 'public' | 'private';
    username?: string;
  }) => Promise<void>;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('fa-users');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [username, setUsername] = useState('');
  const [usernameAvailability, setUsernameAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMsg, setUsernameMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      setError('');
      const url = await uploadImageApi(file);
      setAvatarUrl(url);
    } catch (err: any) {
      setError('Failed to upload group image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(clean);
    setError('');

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!clean) {
      setUsernameAvailability('idle');
      setUsernameMsg('');
      return;
    }

    if (clean.length < 3 || clean.length > 25) {
      setUsernameAvailability('invalid');
      setUsernameMsg('Group username must be 3-25 characters');
      return;
    }

    if (!isValidGroupUsername(clean)) {
      setUsernameAvailability('invalid');
      setUsernameMsg('Only letters, numbers, and underscores allowed');
      return;
    }

    setUsernameAvailability('checking');
    setUsernameMsg('Checking availability...');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const existing = await groupRepository.getGroupByUsername(clean);
        if (!existing) {
          setUsernameAvailability('available');
          setUsernameMsg(`@${clean} is available!`);
        } else {
          setUsernameAvailability('taken');
          setUsernameMsg(`@${clean} is already taken`);
        }
      } catch (e) {
        setUsernameAvailability('idle');
        setUsernameMsg('');
      }
    }, 300);
  };

  const handleSubmit = async () => {
    setError('');
    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

    if (!cleanName || cleanName.length > 50) {
      setError('Group name is required (max 50 characters).');
      return;
    }

    if (type === 'public') {
      if (!cleanUsername) {
        setError('Public group username is mandatory.');
        return;
      }
      if (!isValidGroupUsername(cleanUsername)) {
        setError('Invalid username (3-25 letters, numbers, underscores).');
        return;
      }
      if (usernameAvailability === 'taken') {
        setError('This group username is already taken. Please choose another.');
        return;
      }
    }

    try {
      setLoading(true);
      if (type === 'public') {
        const existing = await groupRepository.getGroupByUsername(cleanUsername);
        if (existing) {
          setUsernameAvailability('taken');
          setError('This group username is already taken. Please choose another.');
          setLoading(false);
          return;
        }
      }

      await onCreate({
        name: cleanName,
        icon,
        avatarUrl: avatarUrl || undefined,
        type,
        username: type === 'public' ? cleanUsername : undefined,
      });
      setName('');
      setUsername('');
      setAvatarUrl('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Group"
      maxWidth="440px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            Create Group
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
            Group Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mobile Engineers"
            maxLength={50}
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

        {/* Custom Group Photo Upload or Icon */}
        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
            Group Photo or Icon
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Group photo"
                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={uploadingImage}
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>upload_file</span>}
            >
              {avatarUrl ? 'Change Photo' : 'Upload Custom Image'}
            </Button>
            {avatarUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl('')}>
                Remove
              </Button>
            )}
          </div>

          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
            Or choose an icon:
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              justifyContent: 'center',
              padding: '12px 10px',
              backgroundColor: 'var(--input-bg)',
              borderRadius: '10px',
              border: '1px solid var(--input-border)',
              maxHeight: '130px',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            {GROUP_ICONS.map((ic) => {
              const isSelected = icon === ic;
              return (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    minHeight: '36px',
                    maxWidth: '36px',
                    maxHeight: '36px',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <i className={`fa-solid ${ic}`} style={{ fontSize: '15px', lineHeight: 1 }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Group Type Toggle */}
        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
            Group Privacy
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant={type === 'public' ? 'primary' : 'secondary'}
              fullWidth
              size="sm"
              leftIcon={<i className="fa-solid fa-globe" />}
              onClick={() => setType('public')}
            >
              Public
            </Button>
            <Button
              variant={type === 'private' ? 'primary' : 'secondary'}
              fullWidth
              size="sm"
              leftIcon={<i className="fa-solid fa-lock" />}
              onClick={() => setType('private')}
            >
              Private
            </Button>
          </div>
        </div>

        {type === 'public' && (
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 500 }}>
              Group Public Username <span style={{ color: 'var(--error-color)' }}>*</span>
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
                  fontSize: '0.95rem',
                  pointerEvents: 'none',
                }}
              >
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="group_username"
                required
                maxLength={25}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 28px',
                  borderRadius: '8px',
                  border: `1.5px solid ${
                    usernameAvailability === 'available'
                      ? 'var(--success-color)'
                      : usernameAvailability === 'taken' || usernameAvailability === 'invalid'
                      ? 'var(--error-color)'
                      : 'var(--input-border)'
                  }`,
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-color)',
                  fontSize: '0.95rem',
                }}
              />
            </div>
            {usernameMsg && (
              <div
                style={{
                  marginTop: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color:
                    usernameAvailability === 'available'
                      ? 'var(--success-color)'
                      : usernameAvailability === 'taken' || usernameAvailability === 'invalid'
                      ? 'var(--error-color)'
                      : 'var(--text-secondary)',
                }}
              >
                {usernameMsg}
              </div>
            )}
          </div>
        )}

        {type === 'private' && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Private groups can only be joined through an invite link or owner approval requests.
          </p>
        )}

        {error && (
          <div style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{error}</div>
        )}
      </div>
    </Modal>
  );
};
