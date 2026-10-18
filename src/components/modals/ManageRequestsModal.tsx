import React from 'react';
import { GroupJoinRequest } from '../../types';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { formatTimestamp } from '../../utils';

interface ManageRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: GroupJoinRequest[];
  onAccept: (uid: string) => Promise<void>;
  onReject: (uid: string) => Promise<void>;
}

export const ManageRequestsModal: React.FC<ManageRequestsModalProps> = ({
  isOpen,
  onClose,
  requests,
  onAccept,
  onReject,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Join Requests" maxWidth="440px">
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {requests.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            No pending join requests.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {requests.map((req) => (
              <div
                key={req.uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--input-bg)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <Avatar
                    name={req.user?.displayName}
                    initials={req.user?.initials}
                    color={req.user?.avatarColor}
                    imageUrl={req.user?.avatarUrl}
                    size="sm"
                  />
                  <div style={{ overflow: 'hidden' }}>
                    <span
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: 'var(--text-color)',
                        display: 'block',
                      }}
                      className="truncate"
                    >
                      {req.user?.displayName || 'User'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Requested {formatTimestamp(req.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                  <button
                    onClick={() => onAccept(req.uid)}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--success-color)',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Accept Request"
                  >
                    <i className="fa-solid fa-check" style={{ fontSize: '14px' }} />
                  </button>

                  <button
                    onClick={() => onReject(req.uid)}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--error-color)',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Reject Request"
                  >
                    <i className="fa-solid fa-xmark" style={{ fontSize: '14px' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
