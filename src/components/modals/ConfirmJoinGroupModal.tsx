import React from 'react';
import { GroupMetadata } from '../../types';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface ConfirmJoinGroupModalProps {
  group: GroupMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const ConfirmJoinGroupModal: React.FC<ConfirmJoinGroupModalProps> = ({
  group,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  if (!group) return null;

  const isPrivate = group.type === 'private';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isPrivate ? 'Send Join Request?' : 'Join Group'}
      maxWidth="380px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} isLoading={isLoading}>
            {isPrivate ? 'Send Request' : 'Join Group'}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '8px 0',
        }}
      >
        <Avatar name={group.name} icon={group.icon} size="xl" />

        <h3
          style={{
            fontSize: '1.2rem',
            fontWeight: 600,
            color: 'var(--text-color)',
            marginTop: '14px',
          }}
        >
          {group.name}
        </h3>

        <span
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginTop: '4px',
          }}
        >
          {isPrivate ? 'Private Group' : `${group.memberCount || 0} members`}
        </span>

        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginTop: '12px',
            lineHeight: 1.4,
          }}
        >
          {isPrivate
            ? 'This is a private group. An owner must approve your join request before you can read or send messages.'
            : 'You will be added to this group and can immediately start chatting.'}
        </p>
      </div>
    </Modal>
  );
};
