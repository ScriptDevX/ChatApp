import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFindAndJoin: (query: string) => Promise<void>;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  isOpen,
  onClose,
  onFindAndJoin,
}) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const clean = query.trim();
    if (!clean) {
      setError('Please enter a group link or @username.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onFindAndJoin(clean);
      setQuery('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Group not found or unable to join.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Group"
      maxWidth="420px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            Find & Join
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Enter Group Link or @username
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. @techhub or https://FunChat/?join=..."
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
