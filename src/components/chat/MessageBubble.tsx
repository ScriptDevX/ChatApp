import React from 'react';
import { motion } from 'framer-motion';
import { Message, UserProfile } from '../../types';
import { Avatar } from '../ui/Avatar';
import { formatMessageTimestamp, isSingleEmoji, getProfileIconDetails } from '../../utils';
import { INVITE_LINK_BASE } from '../../constants';

const chatImagePreloadCache = new Set<string>();

interface ChatImageProps {
  imageUrl: string;
  onClick: (e: React.MouseEvent) => void;
}

const ChatImage = React.memo<ChatImageProps>(({ imageUrl, onClick }) => {
  const isPreloaded = chatImagePreloadCache.has(imageUrl);
  const [isLoaded, setIsLoaded] = React.useState(isPreloaded);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    if (!imageUrl) return;
    if (chatImagePreloadCache.has(imageUrl)) {
      setIsLoaded(true);
      return;
    }

    let active = true;
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = imageUrl;

    const onComplete = () => {
      chatImagePreloadCache.add(imageUrl);
      if (active) {
        setIsLoaded(true);
        setHasError(false);
      }
    };

    const onError = () => {
      if (active) {
        setHasError(true);
        setIsLoaded(false);
      }
    };

    if (img.decode) {
      img
        .decode()
        .then(onComplete)
        .catch(() => {
          img.onload = onComplete;
          img.onerror = onError;
        });
    } else {
      img.onload = onComplete;
      img.onerror = onError;
    }

    return () => {
      active = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minWidth: '220px',
        minHeight: isLoaded ? 'auto' : '160px',
        maxHeight: '340px',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: 'var(--surface-hover)',
      }}
    >
      {!isLoaded && !hasError && (
        <div
          className="image-shimmer-placeholder"
          style={{
            position: isLoaded ? 'static' : 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '160px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span
            className="material-icons-round"
            style={{ fontSize: '32px', color: 'var(--text-secondary)', opacity: 0.6 }}
          >
            image
          </span>
        </div>
      )}

      {isLoaded && !hasError && (
        <img
          src={imageUrl}
          alt="Shared photo"
          decoding="async"
          referrerPolicy="no-referrer"
          style={{
            width: '100%',
            maxHeight: '340px',
            objectFit: 'cover',
            display: 'block',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          onClick={onClick}
        />
      )}

      {hasError && (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.82rem',
          }}
        >
          Failed to load image
        </div>
      )}
    </div>
  );
});

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  isGroup: boolean;
  isOwner?: boolean;
  senderProfile?: UserProfile | null;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onOpenActions: (e: React.MouseEvent | React.TouchEvent, msg: Message) => void;
  onReplyClick: (replyMsgId: string) => void;
  onReactionClick: (msgId: string, emoji: string) => void;
  onUserClick: (uid: string) => void;
  onGroupClick: (groupIdOrUsername: string) => void;
  onSwipeReply?: (msg: Message) => void;
  onLongPress?: (msg: Message) => void;
  onToggleSelect?: (msgId: string) => void;
  onImageClick?: (imageUrl: string) => void;
  onCodeFileClick?: (fileName: string, fileContent: string) => void;
}

const MessageBubbleView: React.FC<MessageBubbleProps> = ({
  message,
  isSent,
  isGroup,
  isOwner,
  senderProfile,
  isSelected = false,
  isSelectionMode = false,
  onOpenActions,
  onReplyClick,
  onReactionClick,
  onUserClick,
  onGroupClick,
  onSwipeReply,
  onLongPress,
  onToggleSelect,
  onImageClick,
  onCodeFileClick,
}) => {
  const isSticker = message.type === 'sticker';
  const isEmojiOnly = message.type === 'text' && isSingleEmoji(message.text);

  const [translateX, setTranslateX] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);
  const touchStartXRef = React.useRef(0);
  const touchStartYRef = React.useRef(0);
  const hasMovedRef = React.useRef(false);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = React.useRef(false);
  const isDraggingRef = React.useRef(false);

  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    longPressTriggeredRef.current = false;
    hasMovedRef.current = false;

    const isTouch = 'touches' in e;

    // For mouse, only left-click (button === 0) initiates drag/swipe
    if (!isTouch) {
      const mouseEvent = e as React.MouseEvent;
      if (mouseEvent.button !== 0) {
        isDraggingRef.current = false;
        return;
      }
    }

    isDraggingRef.current = true;

    const clientX = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    touchStartXRef.current = clientX;
    touchStartYRef.current = clientY;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // Comfortable 580ms long-press delay so swipe to reply never conflicts
    longPressTimerRef.current = setTimeout(() => {
      if (!hasMovedRef.current) {
        longPressTriggeredRef.current = true;
        isDraggingRef.current = false;
        setTranslateX(0);
        setIsSwiping(false);
        if (navigator.vibrate) navigator.vibrate(35);
        if (onLongPress) {
          onLongPress(message);
        }
      }
    }, 580);
  };

  const handlePointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    // Never move on mouse hover without holding left click down or touching
    if (!isDraggingRef.current) return;

    const isTouch = 'touches' in e;
    if (!isTouch) {
      const mouseEvent = e as React.MouseEvent;
      // If left mouse button is not actively pressed down, abort immediately
      if ((mouseEvent.buttons & 1) !== 1) {
        isDraggingRef.current = false;
        setTranslateX(0);
        setIsSwiping(false);
        return;
      }
    }

    const clientX = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const deltaX = clientX - touchStartXRef.current;
    const deltaY = clientY - touchStartYRef.current;

    // As soon as user moves even slightly (6px), cancel long-press timer immediately
    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      hasMovedRef.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Swipe to reply only if horizontal movement dominates and dragging left
    if (!isSelectionMode && Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
      setIsSwiping(true);
      const clamped = Math.max(deltaX * 0.75, -70);
      setTranslateX(clamped);
    }
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const currentOffset = translateX;
    isDraggingRef.current = false;
    setTranslateX(0);
    setTimeout(() => setIsSwiping(false), 200);

    // Direct reply when swiped past -24px: directly triggers reply without needing to click any icon!
    if (currentOffset <= -24) {
      if (navigator.vibrate) navigator.vibrate(25);
      onSwipeReply?.(message);
    }
  };

  React.useEffect(() => {
    const onWindowMouseUp = () => {
      if (isDraggingRef.current) {
        handlePointerUp();
      }
    };
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [translateX]);

  const handleBubbleClick = (e: React.MouseEvent) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (isSelectionMode) {
      onToggleSelect?.(message.id);
      return;
    }

    // If message is a code file, clicking anywhere on bubble opens the Code Viewer!
    if (message.type === 'file') {
      const content = message.fileContent || (message.fileUrl ? message.fileContent : '') || message.text || '';
      onCodeFileClick?.(message.fileName || 'file.txt', content);
      return;
    }

    // On touch mobile, tap can open actions if user didn't swipe
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch && !hasMovedRef.current) {
      onOpenActions(e, message);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenActions(e, message);
  };

  const fallbackDetails = getProfileIconDetails(message.senderName, message.senderId);
  const avatarColor = senderProfile?.avatarColor || fallbackDetails.color;
  const avatarInitials = senderProfile?.initials || fallbackDetails.initials;
  const avatarUrl = senderProfile?.avatarUrl;

  // Format and parse text for links, group links, and mentions
  const renderTextContent = (text: string) => {
    // Tokenize text to avoid recursive replacement issues
    const tokenRegex = /(https?:\/\/[^\s]+|@[a-zA-Z0-9_]{3,25})/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, idx) => {
      if (part.startsWith('http://') || part.startsWith('https://')) {
        // Detect in-app FunChat group join links (e.g. /join/:groupId or ?join=:id)
        const joinMatch = part.match(/\/join\/([a-zA-Z0-9_-]+)/i) || part.match(/[?&]join=([a-zA-Z0-9_-]+)/i);
        if (joinMatch || part.startsWith(INVITE_LINK_BASE)) {
          const groupId = joinMatch ? joinMatch[1] : part.substring(INVITE_LINK_BASE.length);
          return (
            <span
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onGroupClick(groupId);
              }}
              style={{
                color: 'var(--accent-color)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              title="Join FunChat Group"
            >
              {part}
            </span>
          );
        }
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              color: 'var(--accent-color)',
              textDecoration: 'underline',
              wordBreak: 'break-all',
            }}
          >
            {part}
          </a>
        );
      }

      if (part.startsWith('@')) {
        const username = part.substring(1);
        const mentionedUid = message.mentions?.[username];
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              if (mentionedUid) {
                onUserClick(mentionedUid);
              } else {
                // If it might be a group username
                onGroupClick(username);
              }
            }}
            style={{
              color: 'var(--accent-color)',
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              borderRadius: '4px',
              padding: '1px 4px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {part}
          </span>
        );
      }

      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const hasReactions =
    message.reactions &&
    Object.keys(message.reactions).some(
      (em) => Object.keys(message.reactions![em] || {}).length > 0
    );

  if (message.type === 'system') {
    const isMissed = message.text?.includes('Missed');
    const isVideoCall = message.text?.includes('Video') || message.text?.includes('video');
    return (
      <div
        id={`msg-${message.id}`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '8px 0',
          padding: '0 16px',
        }}
        onContextMenu={handleContextMenu}
        onClick={(e) => {
          const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
          if (isTouch) {
            onOpenActions(e, message);
          }
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '16px',
            backgroundColor: 'rgba(150, 150, 150, 0.12)',
            color: 'var(--text-color)',
            fontSize: '0.82rem',
            fontWeight: 500,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <span
            className="material-icons-round"
            style={{
              fontSize: '16px',
              color: isMissed ? 'var(--error-color)' : 'var(--accent-color)',
            }}
          >
            {isVideoCall ? 'videocam' : isMissed ? 'phone_missed' : 'call'}
          </span>
          <span>{message.text}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>
            {formatMessageTimestamp(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      style={{
        display: 'flex',
        flexDirection: isSent ? 'row-reverse' : 'row',
        alignItems: 'center',
        margin: '4px 0',
        padding: '0 12px',
        position: 'relative',
        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
        borderRadius: '8px',
        transition: 'background-color 0.15s ease',
        cursor: isSelectionMode ? 'pointer' : 'default',
      }}
      onClick={handleBubbleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Telegram-style Multi-Select Checkbox */}
      {isSelectionMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(message.id);
          }}
          style={{
            marginRight: isSent ? '0px' : '10px',
            marginLeft: isSent ? '10px' : '0px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span
            className="material-icons-round"
            style={{
              fontSize: '22px',
              color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)',
              transition: 'color 0.15s ease, transform 0.15s ease',
              transform: isSelected ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {isSelected ? 'check_circle' : 'radio_button_unchecked'}
          </span>
        </div>
      )}

      {/* Swipe to Reply Floating Icon */}
      {translateX < -10 && (
        <div
          style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: `translateY(-50%) scale(${Math.min(1, Math.abs(translateX) / 42)})`,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: translateX <= -42 ? 'var(--accent-color)' : 'var(--surface-color)',
            color: translateX <= -42 ? '#ffffff' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '18px' }}>
            reply
          </span>
        </div>
      )}

      {/* Sender Avatar (for received messages) */}
      {!isSent && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onUserClick(message.senderId);
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ marginRight: '8px', marginBottom: '2px', alignSelf: 'flex-end', cursor: 'pointer' }}
        >
          <Avatar
            name={message.senderName}
            initials={avatarInitials}
            color={avatarColor}
            imageUrl={avatarUrl}
            size="sm"
          />
        </div>
      )}

      {/* Message Content & Bubble */}
      <div
        style={{
          maxWidth: '82%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isSent ? 'flex-end' : 'flex-start',
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          onClick={handleBubbleClick}
          style={{
            backgroundColor: isSticker || isEmojiOnly
              ? 'transparent'
              : isSent
              ? 'var(--bubble-sent)'
              : 'var(--bubble-received)',
            color: isSent ? 'var(--bubble-sent-text)' : 'var(--bubble-received-text)',
            borderRadius: isSticker || isEmojiOnly ? '12px' : '16px',
            borderBottomRightRadius: isSent && !isSticker && !isEmojiOnly ? '4px' : '16px',
            borderBottomLeftRadius: !isSent && !isSticker && !isEmojiOnly ? '4px' : '16px',
            padding: isSticker || isEmojiOnly ? '2px 6px' : '8px 12px',
            boxShadow: isSticker || isEmojiOnly ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          {/* Sender Header for Received Group Messages */}
          {!isSent && isGroup && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onUserClick(message.senderId);
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--accent-color)',
                }}
              >
                {message.senderName}
              </span>
              {isOwner && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(150, 150, 150, 0.2)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  Owner
                </span>
              )}
            </div>
          )}

          {/* Reply Preview inside Bubble */}
          {message.replyTo && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (message.replyTo?.id) {
                  onReplyClick(message.replyTo.id);
                }
              }}
              style={{
                backgroundColor: isSticker ? 'var(--surface-color)' : 'rgba(150, 150, 150, 0.1)',
                border: isSticker ? '1px solid var(--border-color)' : 'none',
                borderLeft: '3px solid var(--accent-color)',
                borderRadius: '6px',
                padding: '4px 8px',
                marginBottom: '6px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                overflow: 'hidden',
                boxShadow: isSticker ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              <span
                style={{
                  color: 'var(--accent-color)',
                  fontWeight: 600,
                  display: 'block',
                  fontSize: '0.78rem',
                }}
              >
                {message.replyTo.senderName}
              </span>
              <span
                style={{
                  color: 'var(--text-secondary)',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '240px',
                }}
              >
                {message.replyTo.type === 'sticker' ? 'Sticker 🖼️' : message.replyTo.text}
              </span>
            </div>
          )}

          {/* Body: Image vs Sticker vs Code File vs Text */}
          {message.type === 'file' ? (
            <div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const content = message.fileContent || (message.fileUrl ? message.fileContent : '') || message.text || '';
                  onCodeFileClick?.(message.fileName || 'file.txt', content);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.12)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  minWidth: '220px',
                  maxWidth: '280px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--accent-color)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '24px' }}>
                    description
                  </span>
                </div>
                <div style={{ minWidth: 0, flexGrow: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      color: 'var(--bubble-sent-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {message.fileName || 'source_file.txt'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'Code file'} • Tap to view
                  </div>
                </div>

                {/* Direct Instant Download Icon Button */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    const content = message.fileContent || (message.fileUrl ? message.fileContent : '') || message.text || '';
                    const fName = message.fileName || 'file.txt';
                    try {
                      const bridge = (window as unknown as { AndroidBridge?: { downloadFile?: (c: string, f: string, m?: string) => void } }).AndroidBridge;
                      if (bridge?.downloadFile) {
                        bridge.downloadFile(content, fName, 'text/plain');
                        return;
                      }
                    } catch {}
                    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  title="Direct Download"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-icons-round" style={{ color: 'var(--accent-color)', fontSize: '18px' }}>
                    download
                  </span>
                </div>
              </div>
              {message.text && message.text !== message.fileContent && (
                <div
                  style={{
                    fontSize: '0.94rem',
                    lineHeight: 1.45,
                    padding: '8px 2px 2px 2px',
                    wordBreak: 'break-word',
                  }}
                >
                  {renderTextContent(message.text)}
                </div>
              )}
            </div>
          ) : message.type === 'image' && message.imageUrl ? (
            <div style={{ maxWidth: '280px', borderRadius: '12px', overflow: 'hidden', marginTop: '2px', position: 'relative' }}>
              <ChatImage
                imageUrl={message.imageUrl}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onImageClick && message.imageUrl) {
                    onImageClick(message.imageUrl);
                  } else {
                    window.open(message.imageUrl, '_blank');
                  }
                }}
              />
              {message.text && (
                <div
                  style={{
                    fontSize: '0.94rem',
                    lineHeight: 1.45,
                    padding: '6px 2px 2px 2px',
                    wordBreak: 'break-word',
                  }}
                >
                  {renderTextContent(message.text)}
                </div>
              )}
            </div>
          ) : isSticker ? (
            <img
              src={message.stickerUrl}
              alt="Sticker"
              loading="lazy"
              style={{
                width: '140px',
                height: '140px',
                objectFit: 'contain',
                display: 'block',
                borderRadius: '12px',
              }}
            />
          ) : isEmojiOnly ? (
            <div
              style={{
                fontSize: '3.2rem',
                lineHeight: 1.15,
                textAlign: 'center',
                padding: '2px 6px',
              }}
            >
              {message.text}
            </div>
          ) : (
            <div
              style={{
                fontSize: '0.94rem',
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {renderTextContent(message.text || '')}
            </div>
          )}

          {/* Footer Metadata: Timestamp + Edited + Status tick */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '4px',
              marginTop: '4px',
              fontSize: '0.68rem',
              color: 'var(--text-secondary)',
              userSelect: 'none',
              float: 'right',
              marginLeft: '8px',
            }}
          >
            {message.lastEdited && <span>(edited)</span>}
            <span>{formatMessageTimestamp(message.timestamp)}</span>
            {isSent && (() => {
              const otherReadersCount = Object.keys(message.readBy || {}).filter(
                (uid) => uid !== message.senderId
              ).length;
              const isRead = message.status === 'read' || otherReadersCount > 0;
              const isDelivered =
                isRead ||
                message.status === 'delivered' ||
                Object.keys(message.deliveredTo || {}).some((uid) => uid !== message.senderId);

              if (isRead) {
                // Blue double tick (Seen)
                return (
                  <span
                    className="material-icons-round"
                    style={{
                      fontSize: '15px',
                      color: 'var(--tick-seen-color)',
                      lineHeight: 1,
                    }}
                    title="Read"
                  >
                    done_all
                  </span>
                );
              }

              if (isDelivered) {
                // Grey double tick (Delivered)
                return (
                  <span
                    className="material-icons-round"
                    style={{
                      fontSize: '15px',
                      color: 'var(--tick-sent-color)',
                      lineHeight: 1,
                    }}
                    title="Delivered"
                  >
                    done_all
                  </span>
                );
              }

              // Grey single tick (Sent)
              return (
                <span
                  className="material-icons-round"
                  style={{
                    fontSize: '15px',
                    color: 'var(--tick-sent-color)',
                    lineHeight: 1,
                  }}
                  title="Sent"
                >
                  done
                </span>
              );
            })()}
          </div>
        </div>

        {/* Emoji Reactions Badges Container */}
        {hasReactions && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              marginTop: '-6px',
              zIndex: 2,
              padding: '0 4px',
            }}
          >
            {Object.entries(message.reactions || {}).map(([emoji, users]) => {
              const count = Object.keys(users || {}).length;
              if (count === 0) return null;
              return (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReactionClick(message.id, emoji);
                  }}
                  style={{
                    backgroundColor: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  <span>{emoji}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

function sameRecord(a?: Record<string, unknown> | null, b?: Record<string, unknown> | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => {
    const va = a[k];
    const vb = (b as Record<string, unknown>)[k];
    if (Array.isArray(va) && Array.isArray(vb)) {
      return va.length === vb.length && va.every((v, i) => v === vb[i]);
    }
    return va === vb;
  });
}

function areBubblePropsEqual(prev: MessageBubbleProps, next: MessageBubbleProps): boolean {
  const a = prev.message;
  const b = next.message;
  const sameMessage =
    a === b ||
    (a.id === b.id &&
      a.senderId === b.senderId &&
      a.senderName === b.senderName &&
      a.type === b.type &&
      a.text === b.text &&
      a.stickerUrl === b.stickerUrl &&
      a.imageUrl === b.imageUrl &&
      a.fileUrl === b.fileUrl &&
      a.fileName === b.fileName &&
      a.fileSize === b.fileSize &&
      a.fileContent === b.fileContent &&
      a.timestamp === b.timestamp &&
      a.status === b.status &&
      a.lastEdited === b.lastEdited &&
      sameRecord(a.reactions as Record<string, unknown> | null, b.reactions as Record<string, unknown> | null) &&
      sameRecord(a.readBy, b.readBy) &&
      sameRecord(a.deliveredTo, b.deliveredTo) &&
      sameRecord(a.mentions as Record<string, unknown> | null, b.mentions as Record<string, unknown> | null) &&
      (a.replyTo === b.replyTo ||
        (a.replyTo?.id === b.replyTo?.id &&
          a.replyTo?.text === b.replyTo?.text &&
          a.replyTo?.type === b.replyTo?.type)));
  if (!sameMessage) return false;
  return (
    prev.isSent === next.isSent &&
    prev.isGroup === next.isGroup &&
    prev.isOwner === next.isOwner &&
    prev.senderProfile === next.senderProfile &&
    prev.isSelected === next.isSelected &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.onOpenActions === next.onOpenActions &&
    prev.onReplyClick === next.onReplyClick &&
    prev.onReactionClick === next.onReactionClick &&
    prev.onUserClick === next.onUserClick &&
    prev.onGroupClick === next.onGroupClick &&
    prev.onSwipeReply === next.onSwipeReply &&
    prev.onLongPress === next.onLongPress &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.onImageClick === next.onImageClick &&
    prev.onCodeFileClick === next.onCodeFileClick
  );
}

export const MessageBubble = React.memo(MessageBubbleView, areBubblePropsEqual);
