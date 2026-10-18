import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChatListItem as ChatListItemType } from '../../types';
import { Avatar } from '../ui/Avatar';
import { formatTimestamp } from '../../utils';

interface ChatListItemProps {
  item: ChatListItemType;
  isActive?: boolean;
  onClick: () => void;
  onDelete: () => void;
  onTogglePin?: () => void;
}

export const ChatListItem = React.memo<ChatListItemProps>(({
  item,
  isActive = false,
  onClick,
  onDelete,
  onTogglePin,
}) => {
  const [showDelete, setShowDelete] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (item.isPinned) return; // Cannot delete Global Chat
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    touchStartPosRef.current = { x: clientX, y: clientY };

    longPressTimerRef.current = setTimeout(() => {
      setShowDelete(true);
      if (navigator.vibrate) navigator.vibrate(40);
    }, 550);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const dist = Math.hypot(
      clientX - touchStartPosRef.current.x,
      clientY - touchStartPosRef.current.y
    );
    if (dist > 12) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (showDelete) {
      e.stopPropagation();
      setShowDelete(false);
      return;
    }
    onClick();
  };

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.1 }}
      onClick={handleClick}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        cursor: 'pointer',
        backgroundColor: isActive
          ? 'var(--surface-hover)'
          : item.isPinned
          ? 'var(--pinned-chat-bg)'
          : 'transparent',
        borderBottom: '1px solid var(--border-color)',
        transition: 'background-color 0.15s ease',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Avatar / Icon */}
      <div style={{ flexShrink: 0, width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Avatar
          name={item.name}
          initials={item.avatarInitials}
          color={item.avatarColor}
          imageUrl={item.avatarUrl}
          icon={item.icon}
          size="md"
          isOnline={item.status?.online}
        />
      </div>

      {/* Center Info */}
      <div style={{ flexGrow: 1, minWidth: 0, margin: '0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: '0.98rem',
              color: 'var(--text-color)',
            }}
            className="truncate"
          >
            {item.name}
          </span>
          {item.lastMessageTimestamp > 0 && (
            <span
              style={{
                fontSize: '0.75rem',
                color: item.unreadCount > 0 ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: item.unreadCount > 0 ? 600 : 400,
                flexShrink: 0,
                marginLeft: '6px',
              }}
            >
              {formatTimestamp(item.lastMessageTimestamp)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
          <span
            style={{
              fontSize: '0.86rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.3,
            }}
            className="truncate"
          >
            {item.lastMessageSnippet || 'No messages yet'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, marginLeft: '6px' }}>
            {item.isPinned && (
              <span
                className="material-icons-round"
                style={{
                  fontSize: '15px',
                  color: 'var(--text-secondary)',
                  transform: 'rotate(45deg)',
                }}
                title="Pinned chat"
              >
                push_pin
              </span>
            )}
            {item.hasMention && (
              <span
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--accent-color)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  minWidth: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="You were mentioned"
              >
                @
              </span>
            )}
            {item.unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: 'var(--accent-color)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  minWidth: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delete / Pin action buttons (revealed on long press) */}
      {showDelete && item.type !== 'global' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            display: 'flex',
            zIndex: 10,
          }}
        >
          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDelete(false);
                onTogglePin();
              }}
              style={{
                width: '54px',
                height: '100%',
                backgroundColor: 'var(--accent-color)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                border: 'none',
                cursor: 'pointer',
              }}
              title={item.isPinned ? 'Unpin' : 'Pin'}
            >
              <span
                className="material-icons-round"
                style={{ transform: item.isPinned ? 'none' : 'rotate(45deg)' }}
              >
                push_pin
              </span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDelete(false);
              onDelete();
            }}
            style={{
              width: '54px',
              height: '100%',
              backgroundColor: 'var(--error-color)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              border: 'none',
              cursor: 'pointer',
            }}
            title={item.type === 'group' ? 'Leave Group' : 'Delete Chat'}
          >
            <span className="material-icons-round">
              {item.type === 'group' ? 'logout' : 'delete'}
            </span>
          </button>
        </div>
      )}
    </motion.div>
  );
});
