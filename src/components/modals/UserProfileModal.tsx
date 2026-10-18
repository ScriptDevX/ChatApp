import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { formatTimestamp } from '../../utils';

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (user: UserProfile) => void;
  onStartCall: (user: UserProfile, type: 'voice' | 'video') => void;
  currentUserId?: string;
  isBlocked?: boolean;
  onToggleBlock?: (targetUid: string, shouldBlock: boolean) => Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onStartChat,
  onStartCall,
  currentUserId,
  isBlocked = false,
  onToggleBlock,
}) => {
  const [loadingBlock, setLoadingBlock] = useState(false);
  if (!user) return null;

  const isSelf = currentUserId === user.uid;

  const handleBlockAction = async () => {
    if (!onToggleBlock) return;
    setLoadingBlock(true);
    try {
      await onToggleBlock(user.uid, !isBlocked);
    } finally {
      setLoadingBlock(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="360px">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '8px 0',
        }}
      >
        <Avatar
          name={user.displayName}
          initials={user.initials}
          color={user.avatarColor}
          imageUrl={isBlocked ? undefined : user.avatarUrl}
          size="xl"
          isOnline={isBlocked ? false : user.status?.online}
          className="mb-3"
        />

        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-color)',
            marginTop: '12px',
          }}
        >
          {user.displayName}
        </h3>

        <span
          style={{
            fontSize: '0.9rem',
            color: 'var(--accent-color)',
            fontWeight: 500,
            marginTop: '2px',
          }}
        >
          @{user.username}
        </span>

        {isBlocked ? (
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--error-color)',
              fontWeight: 600,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              padding: '4px 10px',
              borderRadius: '12px',
              marginTop: '6px',
              marginBottom: '20px',
            }}
          >
            Blocked User
          </div>
        ) : (
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              marginTop: '6px',
              marginBottom: '20px',
            }}
          >
            {user.status?.online
              ? 'Online now'
              : user.status?.lastSeen
              ? `Last seen ${formatTimestamp(user.status.lastSeen)}`
              : 'Offline'}
          </p>
        )}

        {/* Action Buttons */}
        {!isSelf && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {!isBlocked && (
              <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
                <Button
                  variant="secondary"
                  style={{ flex: 1 }}
                  leftIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>chat</span>}
                  onClick={() => {
                    onClose();
                    onStartChat(user);
                  }}
                >
                  Message
                </Button>

                <Button
                  variant="secondary"
                  style={{ padding: '0 12px' }}
                  title="Voice Call"
                  onClick={() => {
                    onClose();
                    onStartCall(user, 'voice');
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--accent-color)' }}>
                    call
                  </span>
                </Button>

                <Button
                  variant="secondary"
                  style={{ padding: '0 12px' }}
                  title="Video Call"
                  onClick={() => {
                    onClose();
                    onStartCall(user, 'video');
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--accent-color)' }}>
                    videocam
                  </span>
                </Button>
              </div>
            )}

            {/* Block / Unblock Button */}
            <Button
              variant={isBlocked ? 'secondary' : 'danger'}
              size="sm"
              disabled={loadingBlock}
              onClick={handleBlockAction}
              style={{ width: '100%', marginTop: isBlocked ? '0' : '4px' }}
            >
              {loadingBlock
                ? 'Updating...'
                : isBlocked
                ? 'Unblock User'
                : 'Block User'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
