import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { isValidUsername } from '../../utils';
import { userRepository } from '../../services';

interface ProfileSetupScreenProps {
  initialDisplayName?: string;
  onSave: (username: string, displayName: string) => Promise<void>;
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  initialDisplayName = '',
  onSave,
}) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [validationMsg, setValidationMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialDisplayName && !displayName) {
      setDisplayName(initialDisplayName);
    }
  }, [initialDisplayName]);

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(clean);
    setError('');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!clean) {
      setAvailability('idle');
      setValidationMsg('');
      setChecking(false);
      return;
    }

    if (clean.length < 3 || clean.length > 15) {
      setAvailability('invalid');
      setValidationMsg('Username must be 3-15 characters');
      setChecking(false);
      return;
    }

    if (!isValidUsername(clean)) {
      setAvailability('invalid');
      setValidationMsg('Only letters, numbers and underscores allowed');
      setChecking(false);
      return;
    }

    setAvailability('checking');
    setChecking(true);
    setValidationMsg('Checking availability...');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const isAvailable = await userRepository.isUsernameAvailable(clean);
        if (isAvailable) {
          setAvailability('available');
          setValidationMsg(`@${clean} is available!`);
        } else {
          setAvailability('taken');
          setValidationMsg(`@${clean} is already taken`);
        }
      } catch (e) {
        setAvailability('idle');
        setValidationMsg('');
      } finally {
        setChecking(false);
      }
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanDisplayName = displayName.trim();

    if (!cleanUsername) {
      setError('Please choose a username.');
      return;
    }

    if (!isValidUsername(cleanUsername)) {
      setError('Username must be 3-15 characters (letters, numbers, _).');
      return;
    }

    if (availability === 'taken') {
      setError('This username is already taken. Please choose another.');
      return;
    }

    if (!cleanDisplayName || cleanDisplayName.length > 30) {
      setError('Display name must be between 1 and 30 characters.');
      return;
    }

    try {
      setLoading(true);
      // Double check availability before saving
      const available = await userRepository.isUsernameAvailable(cleanUsername);
      if (!available) {
        setAvailability('taken');
        setError('This username is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      await onSave(cleanUsername, cleanDisplayName);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile. Please try another username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        backgroundColor: 'var(--bg-color)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface-color)',
          padding: '34px 28px',
          borderRadius: '20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          width: '100%',
          maxWidth: '390px',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-color)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 4px 14px rgba(0, 136, 204, 0.3)',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '32px' }}>
            alternate_email
          </span>
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '6px' }}>
          Create Your Username
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Choose a unique @username so people can find and message you.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Username Input with Instant Live Validation */}
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
              Choose Username
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  pointerEvents: 'none',
                }}
              >
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="username"
                required
                maxLength={15}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 32px',
                  borderRadius: '12px',
                  border: `1.5px solid ${
                    availability === 'available'
                      ? 'var(--success-color)'
                      : availability === 'taken' || availability === 'invalid'
                      ? 'var(--error-color)'
                      : 'var(--input-border)'
                  }`,
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-color)',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'border-color 0.15s ease',
                }}
              />
            </div>

            {/* Live Instant Status Indicator */}
            {validationMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginTop: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color:
                    availability === 'available'
                      ? 'var(--success-color)'
                      : availability === 'taken' || availability === 'invalid'
                      ? 'var(--error-color)'
                      : 'var(--text-secondary)',
                }}
              >
                {availability === 'checking' && (
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid currentColor',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                )}
                <span>{validationMsg}</span>
              </div>
            )}
          </div>

          {/* Display Name Input */}
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Smith"
              required
              maxLength={30}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid var(--input-border)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                fontSize: '1rem',
              }}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--error-color)', fontSize: '0.85rem', textAlign: 'left' }}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={loading || checking}
            disabled={availability !== 'available' || !displayName.trim()}
            style={{ marginTop: '8px' }}
          >
            Create & Enter Chats
          </Button>
        </form>
      </div>
    </div>
  );
};
