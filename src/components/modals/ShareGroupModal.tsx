import React, { useState } from 'react';
import { GroupMetadata } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ShareGroupModalProps {
  group: GroupMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onCopySuccess: (msg: string) => void;
}

export const ShareGroupModal: React.FC<ShareGroupModalProps> = ({
  group,
  isOpen,
  onClose,
  onCopySuccess,
}) => {
  const [copied, setCopied] = useState(false);
  if (!group) return null;

  const isPublic = group.type === 'public';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareText = isPublic && group.username
    ? `${origin}/join/${group.username}`
    : `${origin}/join/${group.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    onCopySuccess('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${group.name}"`} maxWidth="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isPublic
            ? 'Anyone can find and join this group using its public username or link.'
            : 'Share this private link. Users will be able to request access to join.'}
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            readOnly
            value={shareText}
            style={{
              flexGrow: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-color)',
              fontSize: '0.9rem',
            }}
          />
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
