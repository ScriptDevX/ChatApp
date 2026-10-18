import React, { useState, useEffect, useRef } from 'react';
import { GroupMetadata, GroupWithMembers, UserProfile } from '../../types';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { uploadImageApi } from '../../services/imageUpload';
import { INVITE_LINK_BASE } from '../../constants';

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  groupMeta?: GroupWithMembers | GroupMetadata | null;
  members: UserProfile[];
  ownerId?: string;
  isOwner?: boolean;
  onShare?: () => void;
  onSelectUser?: (user: UserProfile) => void;
  onUpdateGroup?: (
    groupId: string,
    data: Partial<Pick<GroupMetadata, 'name' | 'icon' | 'avatarUrl' | 'description' | 'type' | 'username'>>
  ) => Promise<void>;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'error') => void;
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  isOpen,
  onClose,
  title,
  groupMeta,
  members,
  ownerId,
  isOwner,
  onShare,
  onSelectUser,
  onUpdateGroup,
  onShowToast,
}) => {
  const isGlobal = groupMeta?.id === 'global' || title.toLowerCase().includes('global');
  const effectiveIsOwner = isGlobal ? false : isOwner;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(groupMeta?.name || title);
  const [editBio, setEditBio] = useState(
    groupMeta?.description || (isGlobal ? 'Welcome to the Global community chat! Connect, chat, and share with all members worldwide.' : '')
  );
  const [editAvatarUrl, setEditAvatarUrl] = useState(groupMeta?.avatarUrl || (isGlobal ? '/global.png' : ''));
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when groupMeta changes or modal reopens
  useEffect(() => {
    if (isOpen) {
      setEditName(groupMeta?.name || title);
      setEditBio(
        groupMeta?.description || (isGlobal ? 'Welcome to the Global community chat! Connect, chat, and share with all members worldwide.' : '')
      );
      setEditAvatarUrl(groupMeta?.avatarUrl || (isGlobal ? '/global.png' : ''));
      setIsEditing(false);
      setSearchMemberQuery('');
    }
  }, [isOpen, groupMeta, title, isGlobal]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      const url = await uploadImageApi(file);
      setEditAvatarUrl(url);

      // Instantly auto-save to group in Firebase without forcing user to tap 'Edit' then 'Save'
      if (groupMeta?.id && onUpdateGroup) {
        await onUpdateGroup(groupMeta.id, {
          avatarUrl: url,
        });
        onShowToast?.('Group photo updated successfully!', 'success');
      } else {
        onShowToast?.('Photo uploaded', 'success');
      }
    } catch {
      onShowToast?.('Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!groupMeta?.id || !onUpdateGroup) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      onShowToast?.('Group name cannot be empty', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await onUpdateGroup(groupMeta.id, {
        name: trimmedName,
        description: editBio.trim(),
        avatarUrl: editAvatarUrl || undefined,
      });
      setIsEditing(false);
      onShowToast?.('Group updated successfully', 'success');
    } catch {
      onShowToast?.('Failed to update group', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const inviteLink = isGlobal
    ? ''
    : groupMeta?.username
    ? `${INVITE_LINK_BASE}${groupMeta.username}`
    : groupMeta?.id
    ? `${INVITE_LINK_BASE}${groupMeta.id}`
    : '';

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    onShowToast?.('Invite link copied to clipboard', 'success');
  };

  const filteredMembers = members.filter((m) => {
    if (!searchMemberQuery.trim()) return true;
    const q = searchMemberQuery.toLowerCase();
    return (
      m.displayName?.toLowerCase().includes(q) ||
      m.username?.toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Group' : 'Group Info'}
      maxWidth="460px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '78vh', overflowY: 'auto', paddingRight: '2px' }}>
        {/* Telegram-style Hero Profile Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px 12px 12px 12px',
            backgroundColor: 'var(--surface-color)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            position: 'relative',
          }}
        >
          {/* Owner Edit Button in View Mode */}
          {effectiveIsOwner && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                color: 'var(--accent-color)',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '16px' }}>
                edit
              </span>
              Edit
            </button>
          )}

          {/* Group Photo with Upload Trigger */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Avatar
              name={editName || title}
              imageUrl={editAvatarUrl || (isGlobal ? '/global.png' : undefined)}
              icon={groupMeta?.icon || (isGlobal ? 'fa-globe' : 'fa-users')}
              size="xl"
            />

            {/* Camera Overlay Badge for Owner */}
            {effectiveIsOwner && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-color)',
                    color: '#ffffff',
                    border: '2px solid var(--surface-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    transition: 'transform 0.15s ease',
                  }}
                  title="Change group photo"
                >
                  <span className="material-icons-round" style={{ fontSize: '17px' }}>
                    {isUploadingPhoto ? 'hourglass_top' : 'photo_camera'}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Group Name Display / Edit Field */}
          {isEditing ? (
            <div style={{ width: '100%', marginTop: '4px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Group Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={40}
                placeholder="Enter group name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ) : (
            <>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-color)',
                  textAlign: 'center',
                }}
              >
                {groupMeta?.name || title}
              </span>
              <span
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                }}
              >
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </>
          )}
        </div>

        {/* Telegram-style Info & Bio Section */}
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Bio / Description */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--accent-color)' }}>
                notes
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Description / Bio
              </span>
            </div>

            {isEditing ? (
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={250}
                rows={3}
                placeholder="What is this group about? (optional)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  fontSize: '0.9rem',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <p
                style={{
                  fontSize: '0.92rem',
                  color: groupMeta?.description ? 'var(--text-color)' : 'var(--text-secondary)',
                  fontStyle: groupMeta?.description ? 'normal' : 'italic',
                  lineHeight: '1.4',
                  margin: '4px 0 0 0',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line',
                }}
              >
                {groupMeta?.description || (isOwner ? 'No description yet. Tap Edit to add bio.' : 'No description provided.')}
              </p>
            )}
          </div>

          {/* Group Invite Link */}
          {inviteLink && !isEditing && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--accent-color)' }}>
                  link
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Invite Link
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-color)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--accent-color)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    userSelect: 'all',
                  }}
                >
                  {inviteLink}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-color)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '6px',
                    }}
                    title="Copy Link"
                  >
                    <span className="material-icons-round" style={{ fontSize: '19px' }}>
                      content_copy
                    </span>
                  </button>

                  {onShare && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onShare();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-color)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '6px',
                      }}
                      title="Share Link"
                    >
                      <span className="material-icons-round" style={{ fontSize: '19px' }}>
                        share
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save / Cancel Action Buttons in Edit Mode */}
        {isEditing && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setIsEditing(false);
                setEditName(groupMeta?.name || title);
                setEditBio(groupMeta?.description || '');
                setEditAvatarUrl(groupMeta?.avatarUrl || '');
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSave}
              disabled={isSaving || isUploadingPhoto}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}

        {/* Members List Section (Visible in View Mode) */}
        {!isEditing && (
          <div
            style={{
              backgroundColor: 'var(--surface-color)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--accent-color)' }}>
                  group
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Members ({members.length})
                </span>
              </div>

              {isOwner && onShare && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onShare();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-color)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>
                    person_add
                  </span>
                  Add / Invite
                </button>
              )}
            </div>

            {/* Member Search Bar if multiple members */}
            {members.length > 4 && (
              <input
                type="text"
                value={searchMemberQuery}
                onChange={(e) => setSearchMemberQuery(e.target.value)}
                placeholder="Search member..."
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}

            {/* Member Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
              {filteredMembers.map((member) => {
                const isGroupOwner = member.uid === ownerId;
                return (
                  <div
                    key={member.uid}
                    onClick={() => onSelectUser?.(member)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      cursor: onSelectUser ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease',
                      backgroundColor: 'transparent',
                    }}
                    className="hover-surface"
                  >
                    <Avatar
                      name={member.displayName}
                      initials={member.initials}
                      color={member.avatarColor}
                      imageUrl={member.avatarUrl}
                      size="sm"
                      isOnline={member.status?.online}
                    />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.92rem',
                            fontWeight: 600,
                            color: 'var(--text-color)',
                          }}
                          className="truncate"
                        >
                          {member.displayName}
                        </span>
                        {isGroupOwner && (
                          <span
                            style={{
                              fontSize: '0.66rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              color: 'var(--accent-color)',
                              fontWeight: 700,
                            }}
                          >
                            Owner
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        @{member.username || 'user'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
