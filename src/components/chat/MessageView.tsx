import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatType,
  GroupMetadata,
  GroupWithMembers,
  MentionSuggestion,
  Message,
  ReplySnippetData,
  UserProfile,
} from '../../types';
import { Avatar } from '../ui/Avatar';
import { MessageBubble } from './MessageBubble';
import { MessageInputArea } from './MessageInputArea';
import { MessageActionsBar } from './MessageActionsBar';
import { SendFileModal } from '../modals/SendFileModal';
import { CodeViewerModal } from '../modals/CodeViewerModal';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatDateSeparator, getProfileIconDetails } from '../../utils';

interface MessageViewProps {
  chatType: ChatType;
  chatId: string;
  currentUser: UserProfile;
  title: string;
  subtitle?: string;
  avatarColor?: string;
  avatarInitials?: string;
  avatarUrl?: string;
  groupIcon?: string;
  isPartnerOnline?: boolean;
  isBlocked?: boolean;
  isBlockedByPartner?: boolean;
  messages: Message[];
  usersMap: Record<string, UserProfile>;
  groupMeta?: GroupWithMembers | GroupMetadata | null;
  typingUsers: string[];
  pendingRequestsCount?: number;
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
  onBack: () => void;
  onSendMessage: (text: string, replyTo?: ReplySnippetData) => void;
  onSendImage: (file: File, caption?: string, replyTo?: ReplySnippetData) => Promise<void>;
  onSendCodeFile?: (file: File, caption?: string, replyTo?: ReplySnippetData) => Promise<void>;
  onSendSticker: (url: string, replyTo?: ReplySnippetData) => void;
  onEditMessage: (messageId: string, text: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onDeleteMultiple?: (messageIds: string[]) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onLoadOlder: () => void;
  onTyping: (isTyping: boolean) => void;
  onStartCall?: (type: 'voice' | 'video') => void;
  onHeaderTitleClick?: () => void;
  onOpenRequests?: () => void;
  onOpenGroupSettings?: () => void;
  onClearHistory?: () => void;
  onDeleteChat?: () => void;
  onUserClick: (uid: string) => void;
  onGroupClick: (groupIdOrUsername: string) => void;
  onShowToast: (msg: string) => void;
  isSuperAdmin?: boolean;
}

export const MessageView: React.FC<MessageViewProps> = ({
  chatType,
  chatId: _chatId,
  currentUser,
  title,
  subtitle,
  avatarColor,
  avatarInitials,
  avatarUrl,
  groupIcon,
  isPartnerOnline,
  isBlocked = false,
  isBlockedByPartner = false,
  messages,
  usersMap,
  groupMeta,
  typingUsers,
  pendingRequestsCount = 0,
  hasOlderMessages,
  isLoadingOlder,
  onBack,
  onSendMessage,
  onSendImage,
  onSendCodeFile,
  onSendSticker,
  onEditMessage,
  onDeleteMessage,
  onDeleteMultiple,
  onToggleReaction,
  onLoadOlder,
  onTyping,
  onStartCall,
  onHeaderTitleClick,
  onOpenRequests,
  onOpenGroupSettings,
  onClearHistory,
  onDeleteChat,
  onUserClick,
  onGroupClick,
  onShowToast,
  isSuperAdmin = false,
}) => {
  const [replyTo, setReplyTo] = useState<ReplySnippetData | null>(null);
  const [activeActionsMessage, setActiveActionsMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [viewingCodeFile, setViewingCodeFile] = useState<{ fileName: string; fileContent: string } | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSenderUid, setSearchSenderUid] = useState<string>('all');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [memberFilterQuery, setMemberFilterQuery] = useState('');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Chat participants with full profile details for Telegram-style search
  const chatParticipants = useMemo(() => {
    const map = new Map<string, { uid: string; displayName: string; username?: string; avatarUrl?: string; avatarColor?: string; initials?: string }>();

    const membersObj = groupMeta && 'members' in groupMeta ? (groupMeta as GroupWithMembers).members : null;
    if (membersObj) {
      Object.keys(membersObj).forEach((uid) => {
        const u = usersMap[uid];
        const iconDetails = getProfileIconDetails(u?.displayName, uid);
        map.set(uid, {
          uid,
          displayName: u?.displayName || (uid === currentUser.uid ? `${currentUser.displayName} (You)` : 'Member'),
          username: u?.username,
          avatarUrl: u?.avatarUrl,
          avatarColor: u?.avatarColor || iconDetails.color,
          initials: u?.initials || iconDetails.initials,
        });
      });
    }

    messages.forEach((m) => {
      if (m.senderId && !map.has(m.senderId)) {
        const u = usersMap[m.senderId];
        const iconDetails = getProfileIconDetails(m.senderName || u?.displayName, m.senderId);
        map.set(m.senderId, {
          uid: m.senderId,
          displayName: m.senderId === currentUser.uid ? `${currentUser.displayName} (You)` : m.senderName || u?.displayName || 'User',
          username: m.senderUsername || u?.username,
          avatarUrl: u?.avatarUrl,
          avatarColor: u?.avatarColor || iconDetails.color,
          initials: u?.initials || iconDetails.initials,
        });
      }
    });

    return Array.from(map.values());
  }, [messages, groupMeta, usersMap, currentUser]);

  const filteredParticipants = useMemo(() => {
    const q = memberFilterQuery.trim().toLowerCase();
    if (!q) return chatParticipants;
    return chatParticipants.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        (p.username && p.username.toLowerCase().includes(q))
    );
  }, [chatParticipants, memberFilterQuery]);

  const selectedSenderProfile = useMemo(() => {
    if (searchSenderUid === 'all') return null;
    return chatParticipants.find((p) => p.uid === searchSenderUid) || null;
  }, [chatParticipants, searchSenderUid]);

  // Find all matching messages
  const matchingMessages = useMemo(() => {
    if (!isSearchOpen) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q && searchSenderUid === 'all') return [];

    return messages.filter((m) => {
      if (searchSenderUid !== 'all' && m.senderId !== searchSenderUid) {
        return false;
      }
      if (q) {
        const text = (m.text || '').toLowerCase();
        const sender = (m.senderName || '').toLowerCase();
        return text.includes(q) || sender.includes(q);
      }
      return true;
    });
  }, [messages, isSearchOpen, searchQuery, searchSenderUid]);

  const jumpToMatch = (index: number) => {
    if (matchingMessages.length === 0) return;
    const targetMsg = matchingMessages[index];
    if (!targetMsg) return;

    setCurrentMatchIndex(index);
    const el = document.getElementById(`msg-${targetMsg.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('message-search-highlight');
      setTimeout(() => {
        el.classList.remove('message-search-highlight');
      }, 1800);
    }
  };

  const handleNextMatch = () => {
    if (matchingMessages.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchingMessages.length;
    jumpToMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (matchingMessages.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchingMessages.length) % matchingMessages.length;
    jumpToMatch(prevIdx);
  };

  const isSelectionMode = selectedMessageIds.length > 0;

  const handleToggleSelect = useCallback((msgId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  }, []);

  // Stable per-bubble callbacks — lets memoized MessageBubble skip re-renders
  const handleOpenActions = useCallback((_e: React.MouseEvent | React.TouchEvent, m: Message) => {
    setActiveActionsMessage(m);
  }, []);

  const handleSwipeReply = useCallback((m: Message) => {
    setReplyTo({ id: m.id, senderName: m.senderName, text: m.text, type: m.type });
  }, []);

  const handleLongPressSelect = useCallback((m: Message) => {
    setSelectedMessageIds((prev) => (prev.includes(m.id) ? prev : [...prev, m.id]));
  }, []);

  const handleImageClick = useCallback((url: string) => setViewingImageUrl(url), []);

  const handleCodeFileClick = useCallback((fileName: string, fileContent: string) => {
    setViewingCodeFile({ fileName, fileContent });
  }, []);

  const isGroupOwner = chatType === 'group' && groupMeta?.ownerId === currentUser.uid;

  const canDeleteSelected = useMemo(() => {
    if (selectedMessageIds.length === 0) return false;
    if (isSuperAdmin || isGroupOwner) return true;
    return selectedMessageIds.every((id) => {
      const msg = messages.find((m) => m.id === id);
      return msg?.senderId === currentUser.uid;
    });
  }, [selectedMessageIds, isSuperAdmin, isGroupOwner, messages, currentUser.uid]);

  const handleCopySelected = () => {
    const selectedMsgs = messages.filter((m) => selectedMessageIds.includes(m.id));
    const textToCopy = selectedMsgs
      .map((m) => m.text || (m.type === 'sticker' ? '[Sticker]' : '[Photo]'))
      .filter(Boolean)
      .join('\n');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      onShowToast('Copied to clipboard');
    }
    setSelectedMessageIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedMessageIds.length === 0) return;
    let ids = [...selectedMessageIds];
    if (!isSuperAdmin && !isGroupOwner) {
      ids = ids.filter((id) => {
        const msg = messages.find((m) => m.id === id);
        return msg?.senderId === currentUser.uid;
      });
    }

    if (ids.length === 0) {
      onShowToast('You can only delete your own messages');
      setSelectedMessageIds([]);
      return;
    }

    setSelectedMessageIds([]);
    if (onDeleteMultiple) {
      await onDeleteMultiple(ids);
    } else {
      for (const id of ids) {
        await onDeleteMessage(id);
      }
      onShowToast(`${ids.length} messages deleted`);
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrolledToBottomRef = useRef(true);
  const prevScrollHeightRef = useRef<number>(0);

  // Auto-scroll to bottom on new messages or preserve position when older messages load
  useLayoutEffect(() => {
    if (!scrollContainerRef.current) return;
    if (prevScrollHeightRef.current > 0) {
      const diff = scrollContainerRef.current.scrollHeight - prevScrollHeightRef.current;
      if (diff > 0) {
        scrollContainerRef.current.scrollTop += diff;
      }
      prevScrollHeightRef.current = 0;
    } else if (isScrolledToBottomRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleLoadOlder = () => {
    if (scrollContainerRef.current) {
      prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
    }
    onLoadOlder();
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isBottom = scrollHeight - (scrollTop + clientHeight) < 80;
    isScrolledToBottomRef.current = isBottom;
    setShowScrollBottom(!isBottom);

    if (scrollTop < 80 && hasOlderMessages && !isLoadingOlder) {
      handleLoadOlder();
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
      isScrolledToBottomRef.current = true;
      setShowScrollBottom(false);
    }
  };

  const handleReplyClick = useCallback(
    (targetMsgId: string) => {
      const el = document.getElementById(`msg-${targetMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.backgroundColor = 'var(--accent-light)';
        setTimeout(() => {
          el.style.backgroundColor = 'transparent';
        }, 1200);
      } else {
        onShowToast('Original message not loaded in current view');
      }
    },
    [onShowToast]
  );

  const availableMentions: MentionSuggestion[] = useMemo(
    () =>
      Object.values(usersMap)
        .filter((u) => u.uid !== currentUser.uid)
        .map((u) => ({
          uid: u.uid,
          username: u.username,
          displayName: u.displayName,
          avatarColor: u.avatarColor || '#0088cc',
          initials: u.initials || '?',
          avatarUrl: u.avatarUrl,
        })),
    [usersMap, currentUser.uid]
  );

  // Typing status text
  const typingText =
    typingUsers.length > 0
      ? typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : `${typingUsers.length} people are typing...`
      : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-color)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header / Multi-select Action Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '56px',
          padding: '0 8px',
          backgroundColor: isSelectionMode ? 'var(--surface-color)' : 'var(--header-bg)',
          color: isSelectionMode ? 'var(--text-color)' : 'var(--header-text)',
          borderBottom: '1px solid var(--border-color)',
          zIndex: 10,
          flexShrink: 0,
          paddingTop: 'var(--safe-area-top)',
          transition: 'background-color 0.15s ease',
        }}
      >
        {isSelectionMode ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setSelectedMessageIds([])}
                style={{
                  minWidth: '40px',
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  background: 'none',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                }}
                title="Cancel selection"
              >
                <span className="material-icons-round" style={{ fontSize: '24px' }}>
                  close
                </span>
              </button>
              <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                {selectedMessageIds.length} Selected
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleCopySelected}
                style={{
                  minWidth: '40px',
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  background: 'none',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                }}
                title="Copy text"
              >
                <span className="material-icons-round" style={{ fontSize: '22px' }}>
                  content_copy
                </span>
              </button>

              {canDeleteSelected && (
                <button
                  onClick={handleDeleteSelected}
                  style={{
                    minWidth: '40px',
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--error-color)',
                    background: 'none',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                  }}
                  title="Delete selected messages"
                >
                  <span className="material-icons-round" style={{ fontSize: '22px' }}>
                    delete
                  </span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Back Button */}
            <button
              onClick={onBack}
              className="message-view-back-btn"
              style={{
                minWidth: '40px',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'inherit',
                background: 'none',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
              }}
              title="Back to chats"
            >
              <span className="material-icons-round" style={{ fontSize: '24px' }}>
                arrow_back
              </span>
            </button>

            {/* Title & Status */}
            <div
              onClick={onHeaderTitleClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexGrow: 1,
                overflow: 'hidden',
                cursor: onHeaderTitleClick ? 'pointer' : 'default',
                padding: '4px 8px',
                borderRadius: '8px',
              }}
            >
              <Avatar
                name={title}
                initials={avatarInitials}
                color={avatarColor}
                imageUrl={isBlocked || isBlockedByPartner ? undefined : avatarUrl}
                icon={groupIcon}
                isOnline={isBlocked || isBlockedByPartner ? false : isPartnerOnline}
                size="sm"
              />

              <div style={{ overflow: 'hidden', lineHeight: 1.2 }}>
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--header-text)',
                    display: 'block',
                  }}
                  className="truncate"
                >
                  {title}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: typingText ? 'var(--typing-indicator-color)' : 'rgba(255,255,255,0.75)',
                    fontStyle: typingText ? 'italic' : 'normal',
                    display: 'block',
                  }}
                  className="truncate"
                >
                  {typingText || subtitle || '\u00A0'}
                </span>
              </div>
            </div>

            {/* Right Action Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0, position: 'relative' }}>
              {/* In-Chat Message Search Button (Placed FIRST as requested) */}
              <button
                onClick={() => {
                  setIsSearchOpen((prev) => !prev);
                  if (isSearchOpen) {
                    setSearchQuery('');
                    setSearchSenderUid('all');
                  }
                }}
                style={{
                  minWidth: '38px',
                  minHeight: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isSearchOpen ? 'var(--accent-color)' : 'inherit',
                  background: isSearchOpen ? 'var(--surface-hover)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease, background-color 0.15s ease',
                }}
                title={isSearchOpen ? 'Close Search' : 'Search in chat'}
              >
                <span className="material-icons-round" style={{ fontSize: '22px' }}>
                  {isSearchOpen ? 'close' : 'search'}
                </span>
              </button>

              {/* Audio/Video Calling Buttons (only for 1-on-1 personal chat) */}
              {chatType === 'personal' && !isBlocked && !isBlockedByPartner && onStartCall && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.12, rotate: -8 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onStartCall('voice')}
                    style={{
                      minWidth: '38px',
                      minHeight: '38px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    title="Voice Call"
                  >
                    <span className="material-icons-round" style={{ fontSize: '22px' }}>
                      call
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.12, rotate: 8 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onStartCall('video')}
                    style={{
                      minWidth: '38px',
                      minHeight: '38px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    title="Video Call"
                  >
                    <span className="material-icons-round" style={{ fontSize: '22px' }}>
                      videocam
                    </span>
                  </motion.button>
                </>
              )}

              {/* Group Requests Badge (owner view) */}
              {isGroupOwner && pendingRequestsCount > 0 && onOpenRequests && (
                <button
                  onClick={onOpenRequests}
                  style={{
                    minWidth: '38px',
                    minHeight: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f59e0b',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  title={`${pendingRequestsCount} Pending Requests`}
                >
                  <span className="material-icons-round" style={{ fontSize: '22px' }}>
                    notification_important
                  </span>
                </button>
              )}

              {/* Telegram-style 3-Dots Menu Button */}
              <button
                onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                style={{
                  minWidth: '38px',
                  minHeight: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  background: isHeaderMenuOpen ? 'var(--surface-hover)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="More Options"
              >
                <span className="material-icons-round" style={{ fontSize: '22px' }}>
                  more_vert
                </span>
              </button>

              {/* 3-Dots Dropdown Popup Menu */}
              {isHeaderMenuOpen && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 110,
                    }}
                    onClick={() => setIsHeaderMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: '4px',
                      marginTop: '4px',
                      backgroundColor: 'var(--actions-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '14px',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.28)',
                      minWidth: '200px',
                      zIndex: 120,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* View Info / Members for Group */}
                    {chatType === 'group' && onOpenGroupSettings && (
                      <button
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onOpenGroupSettings();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '11px 16px',
                          border: 'none',
                          borderBottom: '1px solid var(--border-color)',
                          background: 'none',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--accent-color)' }}>
                          info
                        </span>
                        Group Info
                      </button>
                    )}

                    {/* View Profile for Personal Chat */}
                    {chatType === 'personal' && onHeaderTitleClick && (
                      <button
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onHeaderTitleClick();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '11px 16px',
                          border: 'none',
                          borderBottom: '1px solid var(--border-color)',
                          background: 'none',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--accent-color)' }}>
                          account_circle
                        </span>
                        View Profile
                      </button>
                    )}

                    {/* Clear History Button (Owner, Super Admin, or Personal Chat Participant) */}
                    {(chatType === 'personal' || isGroupOwner || isSuperAdmin) && onClearHistory && (
                      <button
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onClearHistory();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '11px 16px',
                          border: 'none',
                          borderBottom: onDeleteChat ? '1px solid var(--border-color)' : 'none',
                          background: 'none',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
                          cleaning_services
                        </span>
                        Clear History
                      </button>
                    )}

                    {/* Delete / Leave Chat */}
                    {onDeleteChat && (
                      <button
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onDeleteChat();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '11px 16px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--error-color)',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--error-color)' }}>
                          {chatType === 'group' ? (isGroupOwner ? 'delete_forever' : 'logout') : 'delete'}
                        </span>
                        {chatType === 'group' ? (isGroupOwner ? 'Delete Group' : 'Leave Group') : 'Delete Chat'}
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </div>
          </>
        )}
      </header>

      {/* Telegram-style In-Chat Message Search Bar (Matching Image 2) */}
      {isSearchOpen && (
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            borderBottom: '1px solid var(--border-color)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 30,
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {/* Main Search Input Container */}
          <div
            style={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--input-bg)',
              borderRadius: '20px',
              padding: '3px 10px',
              border: '1px solid var(--input-border)',
              gap: '6px',
              minWidth: 0,
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--text-secondary)', flexShrink: 0 }}>
              search
            </span>

            {/* Telegram-style "from: Name ✕" Filter Tag (Image 2) */}
            {selectedSenderProfile && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent-color)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span>from: {selectedSenderProfile.displayName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchSenderUid('all');
                    setCurrentMatchIndex(0);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  title="Remove sender filter"
                >
                  <span className="material-icons-round" style={{ fontSize: '15px' }}>
                    close
                  </span>
                </button>
              </div>
            )}

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              placeholder={selectedSenderProfile ? "Search user's messages..." : "Search messages..."}
              autoFocus
              style={{
                flexGrow: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-color)',
                fontSize: '0.9rem',
                minWidth: '60px',
              }}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '2px' }}
                title="Clear text"
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>
                  close
                </span>
              </button>
            )}

            {/* Telegram User Icon Button (Image 2) */}
            {chatParticipants.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsMemberDropdownOpen((prev) => !prev);
                  setMemberFilterQuery('');
                }}
                style={{
                  minWidth: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isMemberDropdownOpen || searchSenderUid !== 'all' ? 'var(--accent-light)' : 'transparent',
                  color: isMemberDropdownOpen || searchSenderUid !== 'all' ? 'var(--accent-color)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
                title="Filter by member"
              >
                <span className="material-icons-round" style={{ fontSize: '19px' }}>
                  person
                </span>
              </button>
            )}
          </div>

          {/* Matches Counter & Jump Controls */}
          {matchingMessages.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '2px', whiteSpace: 'nowrap' }}>
                {currentMatchIndex + 1}/{matchingMessages.length}
              </span>
              <button
                type="button"
                onClick={handlePrevMatch}
                style={{ background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                title="Previous match"
              >
                <span className="material-icons-round" style={{ fontSize: '20px' }}>
                  keyboard_arrow_up
                </span>
              </button>
              <button
                type="button"
                onClick={handleNextMatch}
                style={{ background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                title="Next match"
              >
                <span className="material-icons-round" style={{ fontSize: '20px' }}>
                  keyboard_arrow_down
                </span>
              </button>
            </div>
          )}

          {(searchQuery.trim() || searchSenderUid !== 'all') && matchingMessages.length === 0 && (
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              No matches
            </span>
          )}

          {/* Close Search Button */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
              setSearchSenderUid('all');
              setIsMemberDropdownOpen(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
            title="Close search"
          >
            <span className="material-icons-round" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>

          {/* Telegram Member Dropdown Overlay Menu (Matches Image 2 exactly) */}
          {isMemberDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: '12px',
                maxWidth: '320px',
                width: 'calc(100% - 24px)',
                maxHeight: '290px',
                overflowY: 'auto',
                backgroundColor: 'var(--surface-color)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                zIndex: 60,
                padding: '6px 0',
              }}
            >
              {/* Dropdown Header with Search Input (Image 2: "from: Search Members") */}
              <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--input-bg)',
                    borderRadius: '10px',
                    padding: '4px 8px',
                    fontSize: '0.82rem',
                  }}
                >
                  <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>from:</span>
                  <input
                    type="text"
                    value={memberFilterQuery}
                    onChange={(e) => setMemberFilterQuery(e.target.value)}
                    placeholder="Search Members"
                    autoFocus
                    style={{
                      flexGrow: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-color)',
                      fontSize: '0.82rem',
                    }}
                  />
                  {memberFilterQuery && (
                    <button
                      type="button"
                      onClick={() => setMemberFilterQuery('')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                    >
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* All Members Option */}
              <div
                onClick={() => {
                  setSearchSenderUid('all');
                  setIsMemberDropdownOpen(false);
                  setCurrentMatchIndex(0);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  backgroundColor: searchSenderUid === 'all' ? 'var(--surface-hover)' : 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = searchSenderUid === 'all' ? 'var(--surface-hover)' : 'transparent')
                }
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>
                    groups
                  </span>
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-color)', flexGrow: 1 }}>
                  All Members
                </span>
                {searchSenderUid === 'all' && (
                  <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--accent-color)' }}>
                    check
                  </span>
                )}
              </div>

              {/* Filtered Members List (Image 2: Avatar + Name + @username) */}
              {filteredParticipants.map((p) => {
                const isSelected = searchSenderUid === p.uid;
                return (
                  <div
                    key={p.uid}
                    onClick={() => {
                      setSearchSenderUid(p.uid);
                      setIsMemberDropdownOpen(false);
                      setCurrentMatchIndex(0);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--surface-hover)' : 'transparent',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = isSelected ? 'var(--surface-hover)' : 'transparent')
                    }
                  >
                    <Avatar
                      name={p.displayName}
                      initials={p.initials}
                      color={p.avatarColor}
                      imageUrl={p.avatarUrl}
                      size="sm"
                    />
                    <div style={{ overflow: 'hidden', minWidth: 0, flexGrow: 1 }}>
                      <span
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: isSelected ? 'var(--accent-color)' : 'var(--text-color)',
                          display: 'block',
                        }}
                        className="truncate"
                      >
                        {p.displayName}
                      </span>
                      {p.username && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }} className="truncate">
                          @{p.username}
                        </span>
                      )}
      {/* In-App Code File Viewer Modal */}
      {viewingCodeFile && (
        <CodeViewerModal
          isOpen={!!viewingCodeFile}
          onClose={() => setViewingCodeFile(null)}
          fileName={viewingCodeFile.fileName}
          fileContent={viewingCodeFile.fileContent}
        />
      )}
    </div>
                    {isSelected && (
                      <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--accent-color)' }}>
                        check
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '10px 0',
          display: 'flex',
          flexDirection: 'column',
          overscrollBehaviorY: 'contain',
        }}
      >
        {/* Load Older Messages Indicator */}
        {isLoadingOlder ? (
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--accent-color)',
                fontWeight: 500,
              }}
            >
              Loading older messages...
            </span>
          </div>
        ) : hasOlderMessages ? (
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <button
              onClick={handleLoadOlder}
              style={{
                fontSize: '0.8rem',
                padding: '6px 14px',
                borderRadius: '16px',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
              }}
            >
              Load Older Messages
            </button>
          </div>
        ) : null}

        {/* Render Messages with Date Separators */}
        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1];
          const showDateSeparator =
            !prevMsg ||
            formatDateSeparator(msg.timestamp) !== formatDateSeparator(prevMsg.timestamp);

          const isSent = msg.senderId === currentUser.uid;
          const senderProfile = usersMap[msg.senderId];
          const isOwner = isGroupOwner && msg.senderId === groupMeta?.ownerId;

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '12px 0 6px 0',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(150, 150, 150, 0.15)',
                      color: 'var(--text-secondary)',
                      fontWeight: 500,
                    }}
                  >
                    {formatDateSeparator(msg.timestamp)}
                  </span>
                </div>
              )}

              <MessageBubble
                message={msg}
                isSent={isSent}
                isGroup={chatType === 'group' || chatType === 'global'}
                isOwner={isOwner}
                senderProfile={senderProfile}
                isSelected={selectedMessageIds.includes(msg.id)}
                isSelectionMode={isSelectionMode}
                onOpenActions={handleOpenActions}
                onReplyClick={handleReplyClick}
                onReactionClick={onToggleReaction}
                onUserClick={onUserClick}
                onGroupClick={onGroupClick}
                onSwipeReply={handleSwipeReply}
                onLongPress={handleLongPressSelect}
                onImageClick={handleImageClick}
                onCodeFileClick={handleCodeFileClick}
                onToggleSelect={handleToggleSelect}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* Jump to Bottom Floating Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom('smooth')}
          style={{
            position: 'absolute',
            bottom: '72px',
            right: '18px',
            width: '42px',
            height: '42px',
            minWidth: '42px',
            minHeight: '42px',
            maxWidth: '42px',
            maxHeight: '42px',
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            backgroundColor: 'var(--surface-color)',
            color: 'var(--text-color)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 15,
            flexShrink: 0,
          }}
          title="Scroll to bottom"
        >
          <span className="material-icons-round" style={{ fontSize: '22px' }}>
            keyboard_arrow_down
          </span>
        </button>
      )}

      {/* Message Input Area or Blocked State */}
      {isBlocked ? (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            backgroundColor: 'var(--surface-color)',
            borderTop: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--error-color)' }}>
            block
          </span>
          <span>You have blocked this user. Unblock from their profile to send messages.</span>
        </div>
      ) : isBlockedByPartner ? (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            backgroundColor: 'var(--surface-color)',
            borderTop: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
          }}
        >
          You cannot send messages to this user.
        </div>
      ) : (
        <MessageInputArea
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSendMessage={(text) => {
            onSendMessage(text, replyTo || undefined);
            setReplyTo(null);
          }}
          onPickImage={(file) => setSelectedPhotoFile(file)}
          onPickCodeFile={(file) => setSelectedPhotoFile(file)}
          onSendSticker={(url) => {
            onSendSticker(url, replyTo || undefined);
            setReplyTo(null);
          }}
          onTyping={onTyping}
          availableUsers={availableMentions}
          onPanelToggle={() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
          }}
        />
      )}

      {/* Actions Popover / Sheet */}
      {activeActionsMessage && (
        <MessageActionsBar
          message={activeActionsMessage}
          isSent={activeActionsMessage.senderId === currentUser.uid}
          canDelete={
            activeActionsMessage.type === 'system' ||
            activeActionsMessage.senderId === currentUser.uid ||
            isGroupOwner ||
            isSuperAdmin
          }
          onSelectReaction={(emoji) => onToggleReaction(activeActionsMessage.id, emoji)}
          onReply={() => {
            setReplyTo({
              id: activeActionsMessage.id,
              senderName: activeActionsMessage.senderName,
              text: activeActionsMessage.text,
              type: activeActionsMessage.type,
            });
            setActiveActionsMessage(null);
          }}
          onCopy={() => {
            if (activeActionsMessage.text) {
              navigator.clipboard.writeText(activeActionsMessage.text);
              onShowToast('Copied to clipboard');
            }
          }}
          onSelectMessages={() => {
            setSelectedMessageIds([activeActionsMessage.id]);
          }}
          onEdit={() => {
            setEditingMessage(activeActionsMessage);
            setEditText(activeActionsMessage.text || '');
            setActiveActionsMessage(null);
          }}
          onDelete={async () => {
            await onDeleteMessage(activeActionsMessage.id);
            setActiveActionsMessage(null);
          }}
          onClose={() => setActiveActionsMessage(null)}
        />
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <Modal
          isOpen={true}
          onClose={() => setEditingMessage(null)}
          title="Edit Message"
          maxWidth="420px"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingMessage(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (editText.trim()) {
                    await onEditMessage(editingMessage.id, editText.trim());
                    setEditingMessage(null);
                  }
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            autoFocus
            style={{
              width: '100%',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-color)',
              border: '1px solid var(--input-border)',
              borderRadius: '10px',
              padding: '10px',
              fontSize: '0.95rem',
              resize: 'vertical',
            }}
          />
        </Modal>
      )}

      {/* Photo / Code File Caption & Send Confirmation Modal */}
      <SendFileModal
        file={selectedPhotoFile}
        isOpen={!!selectedPhotoFile}
        onClose={() => setSelectedPhotoFile(null)}
        onSend={async (file, caption) => {
          if (file.type.startsWith('image/')) {
            await onSendImage(file, caption, replyTo || undefined);
          } else if (onSendCodeFile) {
            await onSendCodeFile(file, caption, replyTo || undefined);
          }
          setReplyTo(null);
          setSelectedPhotoFile(null);
        }}
      />

      {/* In-App Fullscreen Image Viewer Modal (Lightbox) */}
      <AnimatePresence>
        {viewingImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setViewingImageUrl(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.92)',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backdropFilter: 'blur(6px)',
              userSelect: 'none',
            }}
          >
            {/* Top Controls Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 'calc(var(--safe-area-top) + 16px)',
                right: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                zIndex: 10,
              }}
            >
              <a
                href={viewingImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                }}
                title="Open original / Download"
              >
                <span className="material-icons-round" style={{ fontSize: '22px' }}>
                  download
                </span>
              </a>
              <button
                onClick={() => setViewingImageUrl(null)}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                title="Close preview"
              >
                <span className="material-icons-round" style={{ fontSize: '24px' }}>
                  close
                </span>
              </button>
            </div>

            {/* High-Res Center Image */}
            <motion.img
              src={viewingImageUrl}
              alt="Full Preview"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '92vw',
                maxHeight: '84vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* In-App Code File Viewer Modal */}
      {viewingCodeFile && (
        <CodeViewerModal
          isOpen={!!viewingCodeFile}
          onClose={() => setViewingCodeFile(null)}
          fileName={viewingCodeFile.fileName}
          fileContent={viewingCodeFile.fileContent}
        />
      )}
    </div>
  );
};
