import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchAndChat: (username: string) => Promise<void>;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSearchAndChat,
}) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setError('Please enter a username.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSearchAndChat(clean);
      setUsername('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'User not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Personal Chat"
      maxWidth="400px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSearch} isLoading={loading}>
            Start Chat
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Enter recipient username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username"
          autoFocus
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-color)',
            fontSize: '0.95rem',
          }}
        />
        {error && (
          <div style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{error}</div>
        )}
      </div>
    </Modal>
  );
};
