import React, { Suspense, useCallback, useEffect, useMemo, useState, useRef, lazy } from 'react';
import { motion } from 'framer-motion';
import {
  ChatListItem as ChatListItemType,
  ChatType,
  GroupJoinRequest,
  GroupMetadata,
  GroupWithMembers,
  Message,
  UserChatMeta,
  UserProfile,
} from './types';
import {
  authService,
  chatRepository,
  groupRepository,
  userRepository,
  systemConfigService,
} from './services';
import { useCall } from './contexts/CallContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { ProfileSetupScreen } from './components/auth/ProfileSetupScreen';
import { Sidebar } from './components/navigation/Sidebar';
import { ChatListItem } from './components/chat/ChatListItem';
import { SearchInput } from './components/ui/SearchInput';
import { EmptyState } from './components/ui/EmptyState';
import { Toast } from './components/ui/Toast';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { SkeletonLoadingScreen } from './components/ui/SkeletonLoadingScreen';
import { MaintenanceScreen } from './components/ui/MaintenanceScreen';
import { uploadImageApi } from './services/imageUpload';
import { readTextFileContent } from './services/fileUpload';
import { getPersonalChatId, getProfileIconDetails } from './utils';
import { getChatPath, parseRoute } from './utils/router';
import { CallScreen } from './components/call/CallScreen';

// Code-splitting with Lazy Loading (safe with post-bundle renderChunk obfuscation)
const MessageView = lazy(() => import('./components/chat/MessageView').then((m) => ({ default: m.MessageView })));
const ProfileSettingsModal = lazy(() => import('./components/modals/ProfileSettingsModal').then((m) => ({ default: m.ProfileSettingsModal })));
const SettingsModal = lazy(() => import('./components/modals/SettingsModal').then((m) => ({ default: m.SettingsModal })));
const UserProfileModal = lazy(() => import('./components/modals/UserProfileModal').then((m) => ({ default: m.UserProfileModal })));
const CreateGroupModal = lazy(() => import('./components/modals/CreateGroupModal').then((m) => ({ default: m.CreateGroupModal })));
const JoinGroupModal = lazy(() => import('./components/modals/JoinGroupModal').then((m) => ({ default: m.JoinGroupModal })));
const NewChatModal = lazy(() => import('./components/modals/NewChatModal').then((m) => ({ default: m.NewChatModal })));
const ManageRequestsModal = lazy(() => import('./components/modals/ManageRequestsModal').then((m) => ({ default: m.ManageRequestsModal })));
const GroupMembersModal = lazy(() => import('./components/modals/GroupMembersModal').then((m) => ({ default: m.GroupMembersModal })));
const ShareGroupModal = lazy(() => import('./components/modals/ShareGroupModal').then((m) => ({ default: m.ShareGroupModal })));
const ConfirmJoinGroupModal = lazy(() => import('./components/modals/ConfirmJoinGroupModal').then((m) => ({ default: m.ConfirmJoinGroupModal })));

export const App: React.FC = () => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [authLoading, setAuthLoading] = useState(() => !authService.getCurrentUser());
  const [needsProfileSetup, setNeedsProfileSetup] = useState(() => {
    const u = authService.getCurrentUser();
    return !!(u && (!u.username || u.username.trim() === '' || u.hasSetUsername === false));
  });

  // Active view: list vs message
  const [activeTab, setActiveTab] = useState<'groups' | 'personal'>(() => {
    if (typeof window !== 'undefined') {
      return parseRoute(window.location.pathname, window.location.search).tab;
    }
    return 'groups';
  });
  const [activeChat, setActiveChat] = useState<{ type: ChatType; id: string } | null>(() => {
    if (typeof window !== 'undefined') {
      return parseRoute(window.location.pathname, window.location.search).chat;
    }
    return null;
  });

  // Data cache
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [userChats, setUserChats] = useState<Record<string, UserChatMeta>>({});
  const [groupsMap, setGroupsMap] = useState<Record<string, GroupWithMembers>>(() => {
    try {
      const raw = sessionStorage.getItem('funchat_groups_cache');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const [messagesLimit, setMessagesLimit] = useState(30);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<GroupJoinRequest[]>([]);
  const [systemMaintenance, setSystemMaintenance] = useState<{
    active: boolean;
    message?: string;
    allowedUsers?: Record<string, boolean>;
    admins?: Record<string, boolean>;
  }>({ active: false });

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // UI state & modals
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inspectedUser, setInspectedUser] = useState<UserProfile | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isManageRequestsOpen, setIsManageRequestsOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [confirmJoinGroup, setConfirmJoinGroup] = useState<GroupMetadata | null>(null);

  // Confirm delete dialog state
  const [confirmDialogData, setConfirmDialogData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Responsive Desktop vs Mobile layout detection
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { activeSession, startCall } = useCall();

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setCanInstallPwa(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIos && !isStandalone) {
      setCanInstallPwa(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showToast('Thank you for installing FunChat!', 'success');
      }
      setDeferredPrompt(null);
      setCanInstallPwa(false);
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIos) {
        showToast('To install on iPhone/iPad: tap Share icon then "Add to Home Screen"', 'info');
      } else {
        showToast('To install: click the Install icon in your browser address bar', 'info');
      }
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Stable callbacks for the message list — keeps memoized bubbles from re-rendering
  const handleToggleReactionStable = useCallback(
    (msgId: string, emoji: string) => {
      if (!activeChat || !currentUser) return;
      chatRepository.toggleReaction(activeChat.type, activeChat.id, msgId, emoji, currentUser.uid);
    },
    [activeChat, currentUser]
  );

  const handleUserClickStable = useCallback(
    (uid: string) => {
      if (usersMap[uid]) setInspectedUser(usersMap[uid]);
    },
    [usersMap]
  );

  // Subscribe to auth state
  useEffect(() => {
    const unsubAuth = authService.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user && (!user.username || user.username.trim() === '' || user.hasSetUsername === false)) {
        setNeedsProfileSetup(true);
      } else {
        setNeedsProfileSetup(false);
      }
      setAuthLoading(false);
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Realtime System Maintenance & Admin Config Listener
  useEffect(() => {
    const unsubSystem = systemConfigService.subscribeToSystemConfig((cfg) => {
      setSystemMaintenance({
        active: !!cfg?.maintenance,
        message: cfg?.message,
        allowedUsers: cfg?.allowedUsers,
        admins: cfg?.admins,
      });
    });
    return () => unsubSystem();
  }, []);

  // Subscribe to all users once authenticated so security rules permit read
  useEffect(() => {
    if (!currentUser) {
      setUsersMap({});
      return;
    }

    const unsubUsers = userRepository.subscribeToUsers((allUsers) => {
      setUsersMap(allUsers);
    });

    return () => {
      unsubUsers();
    };
  }, [currentUser?.uid]);

  // Subscribe to current user's chats
  useEffect(() => {
    if (!currentUser) return;
    const unsubChats = chatRepository.subscribeToUserChats(currentUser.uid, (chats) => {
      setUserChats(chats);
    });
    return () => unsubChats();
  }, [currentUser]);

  // Reset pagination window when switching chats
  useEffect(() => {
    setTypingUsers([]);
    setMessagesLimit(30);
    setIsLoadingOlder(false);
  }, [activeChat?.type, activeChat?.id]);

  // Subscribe to active chat messages & typing with Telegram-style instant cache
  useEffect(() => {
    if (!currentUser || !activeChat) {
      setActiveMessages([]);
      setTypingUsers([]);
      setHasOlderMessages(false);
      return;
    }

    const chatKey = `${activeChat.type}_${activeChat.id}`;
    const cachedMsgs = messagesCacheRef.current.get(chatKey);

    // Instant paint from cache: zero blank screen, zero reload delay
    if (cachedMsgs && cachedMsgs.length > 0) {
      setActiveMessages(cachedMsgs);
      setHasOlderMessages(cachedMsgs.length >= messagesLimit);
    } else {
      setActiveMessages([]);
      setHasOlderMessages(false);
    }

    setTypingUsers([]);

    const unsubMessages = chatRepository.subscribeToMessages(
      activeChat.type,
      activeChat.id,
      messagesLimit,
      (msgs) => {
        // Silently update cache and state without resetting view
        messagesCacheRef.current.set(chatKey, msgs);
        setActiveMessages(msgs);
        setIsLoadingOlder(false);
        // If received count is less than the requested limit, there are no older messages in database
        setHasOlderMessages(msgs.length >= messagesLimit);

        // Real-time blue tick: Mark unread incoming messages as read while actively viewing chat
        const hasUnread = msgs.some(
          (m) => m.senderId !== currentUser.uid && (!m.readBy || !m.readBy[currentUser.uid])
        );
        if (hasUnread) {
          chatRepository.markMessagesAsRead(activeChat.type, activeChat.id, currentUser.uid);
        }
      }
    );

    // Timeout safety: if Firebase has no more messages, don't leave isLoadingOlder stuck forever
    const loadingSafetyTimer = setTimeout(() => {
      setIsLoadingOlder(false);
    }, 1500);

    const typingKey =
      activeChat.type === 'global'
        ? 'global'
        : activeChat.type === 'group'
        ? activeChat.id
        : activeChat.id;

    const unsubTyping = chatRepository.subscribeToTyping(typingKey, (typers) => {
      setTypingUsers(typers.filter((n) => n !== currentUser.displayName));
    });

    // Mark as read immediately when entering chat
    chatRepository.markMessagesAsRead(activeChat.type, activeChat.id, currentUser.uid);

    return () => {
      clearTimeout(loadingSafetyTimer);
      unsubMessages();
      unsubTyping();
    };
  }, [currentUser, activeChat]);

  // Subscribe to all groups in userChats so group icon/photo/name load immediately from outside
  useEffect(() => {
    if (!currentUser) return;

    const groupIds = Object.entries(userChats)
      .filter(([_, meta]) => meta.type === 'group')
      .map(([id]) => id);

    if (groupIds.length === 0) return;

    const unsubs = groupIds.map((groupId) =>
      groupRepository.subscribeToGroup(groupId, (grp) => {
        if (grp) {
          setGroupsMap((prev) => {
            const next = { ...prev, [groupId]: grp };
            try {
              sessionStorage.setItem('funchat_groups_cache', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [currentUser?.uid, userChats]);

  // Load group requests if active chat is owned group
  useEffect(() => {
    if (activeChat?.type === 'group' && currentUser) {
      const unsubReq = groupRepository.subscribeToGroupRequests(activeChat.id, (reqs) => {
        setPendingRequests(reqs);
      });
      return () => unsubReq();
    }
  }, [activeChat, currentUser]);

  // Sync URL routing on back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRoute(window.location.pathname, window.location.search, currentUser?.uid);
      if (route.targetUsername || route.targetGroupUsername || route.joinGroupId) {
        applyResolvedRoute(route);
      } else {
        setActiveChat(route.chat);
        setActiveTab(route.tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, usersMap, groupsMap]);

  // Resolve username or group slug from deep link / URL
  const applyResolvedRoute = async (route: ReturnType<typeof parseRoute>) => {
    if (route.joinGroupId && currentUser) {
      handleGroupUsernameOrLink(route.joinGroupId);
      return;
    }
    if (route.targetUsername && currentUser) {
      const cleanTarget = route.targetUsername.toLowerCase();
      let partnerUid = Object.values(usersMap).find((u) => u.username.toLowerCase() === cleanTarget)?.uid;
      if (!partnerUid) {
        try {
          const profile = await userRepository.getUserByUsername(cleanTarget);
          if (profile) partnerUid = profile.uid;
        } catch {}
      }
      if (partnerUid) {
        const chatId = getPersonalChatId(currentUser.uid, partnerUid);
        setActiveChat({ type: 'personal', id: chatId });
        setActiveTab('personal');
        return;
      }
    }
    if (route.targetGroupUsername) {
      const cleanTarget = route.targetGroupUsername.toLowerCase();
      let groupId = Object.values(groupsMap).find((g) => g.username?.toLowerCase() === cleanTarget)?.id;
      if (!groupId) {
        try {
          const grp = await groupRepository.getGroupByUsername(cleanTarget);
          if (grp) groupId = grp.id;
        } catch {}
      }
      if (groupId) {
        setActiveChat({ type: 'group', id: groupId });
        setActiveTab('groups');
        return;
      }
    }
    if (route.chat) {
      setActiveChat(route.chat);
      setActiveTab(route.tab);
    } else if (route.tab) {
      setActiveTab(route.tab);
    }
  };

  // Initial deep link / URL check once authenticated
  useEffect(() => {
    if (!currentUser) return;
    const initialRoute = parseRoute(window.location.pathname, window.location.search, currentUser.uid);
    applyResolvedRoute(initialRoute);
  }, [currentUser?.uid]);

  // Navigation handlers
  const handleOpenChat = (type: ChatType, id: string) => {
    setActiveChat({ type, id });
    let identifier: string | undefined;
    if (type === 'personal') {
      const otherUid = id.includes('_') ? id.split('_').find((p) => p !== currentUser?.uid) || id : id;
      const partner = usersMap[otherUid];
      if (partner?.username) {
        identifier = partner.username;
      }
    } else if (type === 'group') {
      const grp = groupsMap[id];
      if (grp?.username) {
        identifier = grp.username;
      }
    }
    const newPath = getChatPath(type, id, currentUser?.uid, identifier);
    if (typeof window !== 'undefined' && window.location.pathname !== newPath) {
      window.history.pushState({ inChat: true, type, id }, '', newPath);
    }
  };

  const handleBackToList = () => {
    setActiveChat(null);
    if (typeof window !== 'undefined') {
      if (window.history.state?.inChat) {
        window.history.back();
      } else {
        const target = activeTab === 'personal' ? '/personal' : '/';
        window.history.pushState(null, '', target);
      }
    }
  };

  const handleSelectTab = (tab: 'groups' | 'personal') => {
    setActiveTab(tab);
    if (!activeChat && typeof window !== 'undefined') {
      const target = tab === 'personal' ? '/personal' : '/';
      if (window.location.pathname !== target) {
        window.history.pushState(null, '', target);
      }
    }
  };

  // Personal chats list data
  const personalChatItems: ChatListItemType[] = useMemo(() => {
    if (!currentUser) return [];

    const items: ChatListItemType[] = [];
    Object.entries(userChats).forEach(([chatId, meta]) => {
      if (meta.type === 'personal') {
        const otherUid = chatId.split('_').find((id) => id !== currentUser.uid) || currentUser.uid;
        if (otherUid) {
          const partner = usersMap[otherUid];
          const isBlocked = !!currentUser.blockedUsers?.[otherUid];
          const isBlockedByPartner = !!partner?.blockedUsers?.[currentUser.uid];
          const shouldHideAvatar = isBlocked || isBlockedByPartner;
          const iconDetails = getProfileIconDetails(partner?.displayName, otherUid);
          items.push({
            id: chatId,
            type: 'personal',
            partnerUid: otherUid,
            name: partner?.displayName || (otherUid === currentUser.uid ? `${currentUser.displayName} (Saved)` : 'User'),
            avatarColor: partner?.avatarColor || iconDetails.color,
            avatarInitials: partner?.initials || iconDetails.initials,
            avatarUrl: shouldHideAvatar ? undefined : partner?.avatarUrl,
            lastMessageSnippet: isBlocked ? 'Blocked user' : meta.lastMessageSnippet || '',
            lastMessageTimestamp: meta.lastMessageTimestamp || 0,
            unreadCount: isBlocked ? 0 : meta.unreadCount || 0,
            hasMention: meta.hasMention || false,
            isPinned: meta.isPinned || false,
            status: shouldHideAvatar ? undefined : partner?.status,
          });
        }
      }
    });

    items.sort(
      (a, b) =>
        (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) ||
        b.lastMessageTimestamp - a.lastMessageTimestamp
    );
    return items;
  }, [currentUser, userChats, usersMap]);

  // Groups list data
  const groupChatItems: ChatListItemType[] = useMemo(() => {
    if (!currentUser) return [];

    const items: ChatListItemType[] = [];

    // Always include pinned Global Chat
    items.push({
      id: 'global',
      type: 'global',
      name: 'Global Chat',
      avatarUrl: '/global.png?v=2',
      avatarColor: 'transparent',
      lastMessageSnippet: 'Public global channel for all members',
      lastMessageTimestamp: 0,
      unreadCount: 0,
      hasMention: false,
      isPinned: true,
    });

    Object.entries(userChats).forEach(([groupId, meta]) => {
      if (meta.type === 'group') {
        const grp = groupsMap[groupId];
        items.push({
          id: groupId,
          type: 'group',
          name: grp?.name || 'Group Chat',
          icon: grp?.icon || 'fa-users',
          avatarColor: 'var(--accent-color)',
          avatarUrl: grp?.avatarUrl,
          lastMessageSnippet: meta.lastMessageSnippet || '',
          lastMessageTimestamp: meta.lastMessageTimestamp || 0,
          unreadCount: meta.unreadCount || 0,
          hasMention: meta.hasMention || false,
          isPinned: meta.isPinned || false,
          groupMeta: grp,
        });
      }
    });

    items.sort(
      (a, b) =>
        (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) ||
        b.lastMessageTimestamp - a.lastMessageTimestamp
    );
    return items;
  }, [currentUser, userChats, groupsMap]);

  // Unread badge counters for tabs
  const groupsUnreadCount = useMemo(() => {
    return groupChatItems.reduce((sum, item) => sum + item.unreadCount, 0);
  }, [groupChatItems]);

  const personalUnreadCount = useMemo(() => {
    return personalChatItems.reduce((sum, item) => sum + item.unreadCount, 0);
  }, [personalChatItems]);

  // Filtered chats based on Search Input
  const filteredChatItems = useMemo(() => {
    const list = activeTab === 'groups' ? groupChatItems : personalChatItems;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.lastMessageSnippet.toLowerCase().includes(q)
    );
  }, [activeTab, groupChatItems, personalChatItems, searchQuery]);

  // Handle starting a personal chat from search or profile modal
  const handleStartPersonalChat = (partner: UserProfile) => {
    if (!currentUser) return;
    const chatId = getPersonalChatId(currentUser.uid, partner.uid);
    handleOpenChat('personal', chatId);
  };

  // Group join request, username mention, and profile confirmation flows
  const handleGroupUsernameOrLink = async (query: string) => {
    let clean = query.trim();
    const joinMatch = clean.match(/(?:\/join\/|\?join=)([^/?#&]+)/);
    const isExplicitJoinLink = !!joinMatch;
    if (joinMatch) {
      clean = joinMatch[1];
    } else {
      clean = clean.replace(/^@/, '');
    }

    if (!clean) return;

    // 1. If not an explicit join link, first check if it matches a personal user username
    if (!isExplicitJoinLink) {
      const lowerClean = clean.toLowerCase();
      const existingUser =
        Object.values(usersMap).find((u) => u.username?.toLowerCase() === lowerClean) ||
        (await userRepository.getUserByUsername(clean));
      if (existingUser) {
        setInspectedUser(existingUser);
        return;
      }
    }

    // 2. Check if it matches a group username or group ID
    const grp =
      (await groupRepository.getGroupByUsername(clean)) ||
      (await groupRepository.getGroup(clean));

    if (grp) {
      if (currentUser && grp.members?.[currentUser.uid]) {
        handleOpenChat('group', grp.id);
        return;
      }
      setConfirmJoinGroup(grp);
      return;
    }

    // 3. Neither user nor group found
    showToast(`@${clean} not found`, 'error');
  };

  // Android Native Bridge Listeners (FCM Token Sync & Deep Link Group Join)
  useEffect(() => {
    // Initial check for ?join= in current URL
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const joinParam = urlParams.get('join');
      if (joinParam) {
        handleGroupUsernameOrLink(joinParam);
      }
    } catch {
      // Ignore URL parsing errors
    }

    // If running in Android APK, proactively sync FCM token as soon as user is logged in
    if (currentUser?.uid) {
      try {
        const bridge = (window as unknown as { AndroidBridge?: { getFcmToken?: () => string } }).AndroidBridge;
        const currentToken = bridge?.getFcmToken?.();
        if (currentToken && currentToken.length > 10) {
          userRepository.updateFcmToken?.(currentUser.uid, currentToken).catch(() => {});
        }
      } catch (err) {
        console.warn('FCM token bridge sync error:', err);
      }
    }

    const handleNativeMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'NATIVE_FCM_TOKEN' && data.token && currentUser?.uid) {
        userRepository.updateFcmToken?.(currentUser.uid, data.token).catch(() => {});
      } else if (data.type === 'DEEP_LINK_JOIN' && data.groupId) {
        handleGroupUsernameOrLink(data.groupId);
      }
    };

    window.addEventListener('message', handleNativeMessage);
    return () => window.removeEventListener('message', handleNativeMessage);
  }, [currentUser?.uid]);

  // Block / Unblock actions
  const handleToggleBlock = async (targetUid: string, shouldBlock: boolean) => {
    if (!currentUser) return;
    try {
      if (shouldBlock) {
        await userRepository.blockUser(currentUser.uid, targetUid);
        setCurrentUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            blockedUsers: {
              ...(prev.blockedUsers || {}),
              [targetUid]: true,
            },
          };
        });
        showToast('User blocked');
      } else {
        await userRepository.unblockUser(currentUser.uid, targetUid);
        setCurrentUser((prev) => {
          if (!prev) return null;
          const copy = { ...(prev.blockedUsers || {}) };
          delete copy[targetUid];
          return {
            ...prev,
            blockedUsers: copy,
          };
        });
        showToast('User unblocked');
      }
    } catch {
      showToast('Failed to update block status', 'error');
    }
  };

  // Privacy Settings update
  const handleUpdatePrivacy = async (settings: import('./types').UserPrivacySettings) => {
    if (!currentUser) return;
    await userRepository.updatePrivacySettings(currentUser.uid, settings);
    setCurrentUser((prev) => (prev ? { ...prev, privacySettings: settings } : null));
    showToast('Privacy settings updated');
  };

  // If launching directly into an active call session, bypass all loaders & show CallScreen immediately
  const isCallActive = !!(
    (activeSession && activeSession.status !== 'idle') ||
    (typeof window !== 'undefined' && window.location.search.includes('callAction='))
  );

  if (isCallActive) {
    return (
      <div style={{ height: '100%', width: '100%', position: 'fixed', inset: 0, backgroundColor: '#0f172a', zIndex: 99999 }}>
        <Toast message={toastMessage} type={toastType} />
        <CallScreen />
      </div>
    );
  }

  if (authLoading) {
    return <SkeletonLoadingScreen />;
  }

  // Check for Maintenance Mode (Dynamic admins read from Firebase systemConfig.admins, with realtrader/dhiraj as safe fallback)
  const currentCleanUsername = currentUser?.username?.toLowerCase() || '';
  const currentUid = currentUser?.uid || '';
  const isDbAdmin =
    (systemMaintenance.admins && (systemMaintenance.admins[currentCleanUsername] || systemMaintenance.admins[currentUid])) ||
    (!systemMaintenance.admins && (currentCleanUsername === 'realtrader' || currentCleanUsername === 'dhiraj'));

  // If user is an admin or specifically whitelisted, check allowedUsers explicitly.
  // If allowedUsers[key] === false (e.g. admin checkbox unticked), they must NOT bypass maintenance!
  const isExplicitlyBlocked =
    (currentUid && systemMaintenance.allowedUsers?.[currentUid] === false) ||
    (currentCleanUsername && systemMaintenance.allowedUsers?.[currentCleanUsername] === false);

  const isExplicitlyAllowed =
    (currentUid && systemMaintenance.allowedUsers?.[currentUid] === true) ||
    (currentCleanUsername && systemMaintenance.allowedUsers?.[currentCleanUsername] === true);

  const isWhitelistedUser = !isExplicitlyBlocked && (isExplicitlyAllowed || isDbAdmin);

  if (systemMaintenance.active && !isWhitelistedUser) {
    return (
      <MaintenanceScreen
        message={systemMaintenance.message}
        onRetry={async () => {
          const cfg = await systemConfigService.getSystemConfig();
          setSystemMaintenance({
            active: !!cfg?.maintenance,
            message: cfg?.message,
            allowedUsers: cfg?.allowedUsers,
            admins: cfg?.admins,
          });
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onGoogleLogin={async () => {
          const user = await authService.loginWithGoogle();
          setCurrentUser(user);
          if (!user.username || user.username.trim() === '' || user.hasSetUsername === false) {
            setNeedsProfileSetup(true);
          }
          showToast('Signed in with Google!', 'success');
        }}
      />
    );
  }

  if (needsProfileSetup) {
    return (
      <ProfileSetupScreen
        initialDisplayName={currentUser.displayName || ''}
        onSave={async (username, displayName) => {
          const updated = await authService.setupProfile(currentUser.uid, username, displayName);
          setCurrentUser({ ...updated });
          setNeedsProfileSetup(false);
          showToast(`Welcome @${username}!`, 'success');
        }}
      />
    );
  }

  // Active chat context
  let activeChatTitle = 'FunChat';
  let activeChatSubtitle = '';
  let activeChatAvatarColor = 'var(--accent-color)';
  let activeChatInitials = '';
  let activeChatAvatarUrl: string | undefined = undefined;
  let isPartnerOnline: boolean | undefined = undefined;
  let activeChatGroupIcon: string | undefined = undefined;
  let activeGroupMeta: GroupMetadata | null = null;

  if (activeChat) {
    if (activeChat.type === 'global') {
      const allUsersList = Object.values(usersMap);
      const totalCount = Math.max(allUsersList.length, currentUser ? 1 : 0);
      const onlineCount = Math.max(
        allUsersList.filter((u) => u.status?.online).length,
        currentUser ? 1 : 0
      );
      activeChatTitle = 'Global Chat';
      activeChatSubtitle = `${totalCount} ${totalCount === 1 ? 'member' : 'members'}, ${onlineCount} online`;
      activeChatAvatarUrl = '/global.png';
      activeChatAvatarColor = 'transparent';
      activeGroupMeta = {
        id: 'global',
        name: 'Global Chat',
        type: 'public',
        username: 'global',
        description: 'Welcome to the Global community chat! Connect, chat, and share with all members worldwide.',
        avatarUrl: '/global.png',
        icon: 'fa-globe',
        ownerId: 'system',
        createdAt: 0,
      };
    } else if (activeChat.type === 'personal') {
      const partnerUid = activeChat.id.split('_').find((id) => id !== currentUser.uid) || currentUser.uid;
      const partner = partnerUid ? usersMap[partnerUid] : null;
      const partnerIconDetails = getProfileIconDetails(partner?.displayName, partnerUid);
      if (partner) {
        const isBlocked = !!currentUser.blockedUsers?.[partner.uid];
        const isBlockedByPartner = !!partner.blockedUsers?.[currentUser.uid];
        activeChatTitle = partner.displayName;
        activeChatSubtitle = isBlocked
          ? 'Blocked'
          : isBlockedByPartner
          ? 'Unavailable'
          : partner.status?.online
          ? 'Online'
          : 'Offline';
        activeChatAvatarColor = partner.avatarColor || partnerIconDetails.color;
        activeChatInitials = partner.initials || partnerIconDetails.initials;
        activeChatAvatarUrl = isBlocked || isBlockedByPartner ? undefined : partner.avatarUrl;
        isPartnerOnline = isBlocked || isBlockedByPartner ? false : partner.status?.online;
      } else {
        activeChatTitle = partnerUid === currentUser.uid ? `${currentUser.displayName} (Saved)` : 'User';
        activeChatAvatarColor = partnerIconDetails.color;
        activeChatInitials = partnerIconDetails.initials;
      }
    } else if (activeChat.type === 'group') {
      const grp = groupsMap[activeChat.id];
      if (grp) {
        activeChatTitle = grp.name;
        const memberUids = Object.keys(grp.members || {});
        const totalGrpMembers = grp.memberCount || memberUids.length;
        const onlineGrpMembers = memberUids.filter((uid) => usersMap[uid]?.status?.online).length;
        activeChatSubtitle = `${totalGrpMembers} ${totalGrpMembers === 1 ? 'member' : 'members'}${onlineGrpMembers > 0 ? `, ${onlineGrpMembers} online` : ''}`;
        activeChatGroupIcon = grp.icon;
        activeChatAvatarUrl = grp.avatarUrl;
        activeGroupMeta = grp;
      }
    }
  }

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-color)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Toast Alert */}
      <Toast message={toastMessage} type={toastType} />

      {/* WebRTC Calling Overlay Screen */}
      <CallScreen />

      {/* Sidebar Navigation Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
        canInstall={canInstallPwa}
        onInstallApp={handleInstallApp}
        onOpenProfileSettings={() => setIsProfileSettingsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={async () => {
          await authService.logout();
          showToast('Signed out');
        }}
      />

      {/* Responsive Layout: Desktop 2-Column Split vs Mobile View Switcher */}
      {(() => {
        const chatListView = (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            {/* Main Top Header */}
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '56px',
                padding: '0 12px',
                backgroundColor: 'var(--header-bg)',
                color: 'var(--header-text)',
                borderBottom: '1px solid var(--border-color)',
                flexShrink: 0,
                paddingTop: 'var(--safe-area-top)',
              }}
            >
              <button
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  minWidth: '40px',
                  minHeight: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Open Navigation"
              >
                <span className="material-icons-round" style={{ fontSize: '26px' }}>
                  menu
                </span>
              </button>

              <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>FunChat</h1>

              <div style={{ width: '40px' }} />
            </header>

            {/* Navigation Tabs (Groups / Personal) */}
            <nav
              style={{
                display: 'flex',
                backgroundColor: 'var(--header-bg)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => handleSelectTab('groups')}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  textAlign: 'center',
                  border: 'none',
                  background: 'none',
                  color: activeTab === 'groups' ? 'var(--tab-active)' : 'var(--tab-inactive)',
                  fontWeight: activeTab === 'groups' ? 600 : 500,
                  fontSize: '0.98rem',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
              >
                Groups
                {groupsUnreadCount > 0 && (
                  <span
                    style={{
                      backgroundColor: 'var(--error-color)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontWeight: 600,
                    }}
                  >
                    {groupsUnreadCount}
                  </span>
                )}
                {activeTab === 'groups' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      backgroundColor: 'var(--tab-active-indicator)',
                      borderRadius: '3px 3px 0 0',
                    }}
                    transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                  />
                )}
              </button>

              <button
                onClick={() => handleSelectTab('personal')}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  textAlign: 'center',
                  border: 'none',
                  background: 'none',
                  color: activeTab === 'personal' ? 'var(--tab-active)' : 'var(--tab-inactive)',
                  fontWeight: activeTab === 'personal' ? 600 : 500,
                  fontSize: '0.98rem',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
              >
                Personal
                {personalUnreadCount > 0 && (
                  <span
                    style={{
                      backgroundColor: 'var(--error-color)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontWeight: 600,
                    }}
                  >
                    {personalUnreadCount}
                  </span>
                )}
                {activeTab === 'personal' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      backgroundColor: 'var(--tab-active-indicator)',
                      borderRadius: '3px 3px 0 0',
                    }}
                    transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                  />
                )}
              </button>
            </nav>

            {/* Search Filter Box */}
            <div style={{ padding: '8px 14px', flexShrink: 0, borderBottom: '1px solid var(--border-color)' }}>
              <SearchInput
                value={searchQuery}
                onChangeValue={setSearchQuery}
                placeholder={activeTab === 'groups' ? 'Search groups...' : 'Search personal chats...'}
              />
            </div>

            {/* Chat List */}
            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
              {filteredChatItems.length === 0 ? (
                <EmptyState
                  icon={activeTab === 'groups' ? 'group' : 'chat'}
                  title={activeTab === 'groups' ? 'No groups yet' : 'No personal chats'}
                  description={
                    activeTab === 'groups'
                      ? 'Create a new group or join existing ones by link'
                      : 'Tap the plus button below to start a new chat'
                  }
                />
              ) : (
                filteredChatItems.map((item) => (
                  <ChatListItem
                    key={item.id}
                    item={item}
                    isActive={activeChat?.id === item.id}
                    onClick={() => {
                      if (item.type === 'global') {
                        handleOpenChat('global', 'global');
                      } else if (item.type === 'personal') {
                        handleOpenChat('personal', item.id);
                      } else if (item.type === 'group') {
                        handleOpenChat('group', item.id);
                      }
                    }}
                    onTogglePin={async () => {
                      const nextPin = !item.isPinned;
                      await chatRepository.togglePinChat(currentUser.uid, item.id, nextPin);
                      showToast(nextPin ? 'Chat pinned' : 'Chat unpinned');
                    }}
                    onDelete={() => {
                      if (item.type === 'personal') {
                        setConfirmDialogData({
                          isOpen: true,
                          title: 'Delete Chat',
                          message: `Delete chat with ${item.name}? This will remove it from your chat list.`,
                          onConfirm: async () => {
                            await chatRepository.deletePersonalChat(currentUser.uid, item.partnerUid!);
                            setConfirmDialogData((prev) => ({ ...prev, isOpen: false }));
                            showToast('Chat deleted');
                          },
                        });
                      } else if (item.type === 'group') {
                        const isOwner = item.groupMeta?.ownerId === currentUser.uid;
                        setConfirmDialogData({
                          isOpen: true,
                          title: isOwner ? 'Delete Group' : 'Leave Group',
                          message: isOwner
                            ? `Delete group "${item.name}" for all members? This cannot be undone.`
                            : `Leave group "${item.name}"?`,
                          onConfirm: async () => {
                            if (isOwner) {
                              await groupRepository.deleteGroup(item.id);
                              showToast('Group deleted');
                            } else {
                              await groupRepository.leaveGroup(item.id, currentUser.uid);
                              showToast('Left group');
                            }
                            setConfirmDialogData((prev) => ({ ...prev, isOpen: false }));
                          },
                        });
                      }
                    }}
                  />
                ))
              )}
            </div>

            {/* Floating Action Button */}
            <button
              onClick={() => {
                if (activeTab === 'groups') {
                  setIsCreateGroupOpen(true);
                } else {
                  setIsNewChatOpen(true);
                }
              }}
              style={{
                position: 'absolute',
                bottom: 'calc(var(--safe-area-bottom) + 24px)',
                right: '20px',
                width: '56px',
                height: '56px',
                minWidth: '56px',
                minHeight: '56px',
                maxWidth: '56px',
                maxHeight: '56px',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-color)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '24px',
                zIndex: 20,
                flexShrink: 0,
              }}
              title={activeTab === 'groups' ? 'Create or Join Group' : 'New Personal Chat'}
            >
              <i className="fa-solid fa-plus" />
            </button>
          </div>
        );

        const activePartnerUid =
          activeChat?.type === 'personal'
            ? activeChat.id.split('_').find((id) => id !== currentUser.uid)
            : undefined;
        const activePartnerIsBlocked = activePartnerUid ? !!currentUser.blockedUsers?.[activePartnerUid] : false;
        const activePartnerBlockedMe = activePartnerUid
          ? !!usersMap[activePartnerUid]?.blockedUsers?.[currentUser.uid]
          : false;

        const messageViewComponent = activeChat ? (
          <MessageView
            key={`${activeChat.type}_${activeChat.id}`}
            chatType={activeChat.type}
            chatId={activeChat.id}
            currentUser={currentUser}
            isSuperAdmin={isDbAdmin}
            title={activeChatTitle}
            subtitle={activeChatSubtitle}
            avatarColor={activeChatAvatarColor}
            avatarInitials={activeChatInitials}
            avatarUrl={activeChatAvatarUrl}
            groupIcon={activeChatGroupIcon}
            isPartnerOnline={isPartnerOnline}
            isBlocked={activePartnerIsBlocked}
            isBlockedByPartner={activePartnerBlockedMe}
            messages={activeMessages}
            usersMap={usersMap}
            groupMeta={activeGroupMeta}
            typingUsers={typingUsers}
            pendingRequestsCount={pendingRequests.length}
            hasOlderMessages={hasOlderMessages}
            isLoadingOlder={isLoadingOlder}
            onBack={handleBackToList}
            onSendMessage={async (text, replyTo) => {
              if (activePartnerIsBlocked || activePartnerBlockedMe) return;
              await chatRepository.sendMessage({
                chatType: activeChat.type,
                chatId: activeChat.id,
                senderId: currentUser.uid,
                senderName: currentUser.displayName,
                senderUsername: currentUser.username,
                type: 'text',
                text,
                replyTo: replyTo || undefined,
              });
            }}
            onSendImage={async (file, caption, replyTo) => {
              if (activePartnerIsBlocked || activePartnerBlockedMe) return;
              const localPreviewUrl = URL.createObjectURL(file);
              const msgId = await chatRepository.sendMessage({
                chatType: activeChat.type,
                chatId: activeChat.id,
                senderId: currentUser.uid,
                senderName: currentUser.displayName,
                senderUsername: currentUser.username,
                type: 'image',
                imageUrl: localPreviewUrl,
                text: caption,
                replyTo: replyTo || undefined,
              });

              uploadImageApi(file)
                .then(async (remoteUrl) => {
                  await chatRepository.updateMessage(activeChat.type, activeChat.id, msgId, {
                    imageUrl: remoteUrl,
                  });
                })
                .catch((err) => {
                  console.warn('Background image upload failed:', err);
                });
            }}
            onSendCodeFile={async (file, caption, replyTo) => {
              if (activePartnerIsBlocked || activePartnerBlockedMe) return;
              try {
                const content = await readTextFileContent(file);
                await chatRepository.sendMessage({
                  chatType: activeChat.type,
                  chatId: activeChat.id,
                  senderId: currentUser.uid,
                  senderName: currentUser.displayName,
                  senderUsername: currentUser.username,
                  type: 'file',
                  fileName: file.name,
                  fileSize: file.size,
                  fileContent: content,
                  text: caption || content.slice(0, 100),
                  replyTo: replyTo || undefined,
                });
                showToast(`Sent ${file.name}`);
              } catch (err: any) {
                showToast(err?.message || 'Failed to read file', 'error');
              }
            }}
            onSendSticker={async (url, replyTo) => {
              await chatRepository.sendMessage({
                chatType: activeChat.type,
                chatId: activeChat.id,
                senderId: currentUser.uid,
                senderName: currentUser.displayName,
                senderUsername: currentUser.username,
                type: 'sticker',
                stickerUrl: url,
                replyTo: replyTo || undefined,
              });
            }}
            onEditMessage={async (msgId, text) => {
              await chatRepository.editMessage(activeChat.type, activeChat.id, msgId, text);
            }}
            onDeleteMessage={async (msgId) => {
              await chatRepository.deleteMessage(activeChat.type, activeChat.id, msgId);
              showToast('Message deleted');
            }}
            onDeleteMultiple={async (ids) => {
              await chatRepository.deleteMessages(activeChat.type, activeChat.id, ids);
              showToast(`${ids.length} ${ids.length === 1 ? 'message' : 'messages'} deleted`);
            }}
            onToggleReaction={handleToggleReactionStable}
            onLoadOlder={() => {
              if (isLoadingOlder || !hasOlderMessages) return;
              setIsLoadingOlder(true);
              setMessagesLimit((prev) => prev + 30);
            }}
            onTyping={(isTyping) => {
              if (activePartnerIsBlocked || activePartnerBlockedMe) return;
              const typingKey =
                activeChat.type === 'global'
                  ? 'global'
                  : activeChat.type === 'group'
                  ? activeChat.id
                  : activeChat.id;
              chatRepository.setTypingStatus(typingKey, currentUser.uid, isTyping);
            }}
            onStartCall={
              activeChat.type === 'personal' && !activePartnerIsBlocked && !activePartnerBlockedMe
                ? async (callType) => {
                    const partnerUid = activeChat.id.split('_').find((id) => id !== currentUser.uid);
                    const partner = partnerUid ? usersMap[partnerUid] : null;
                    if (partner) {
                      try {
                        await startCall(
                          {
                            uid: partner.uid,
                            displayName: partner.displayName,
                            username: partner.username,
                            avatarColor: partner.avatarColor,
                            avatarUrl: partner.avatarUrl,
                            initials: partner.initials,
                          },
                          callType
                        );
                      } catch (err: any) {
                        showToast(err?.message || 'Unable to start call', 'error');
                      }
                    }
                  }
                : undefined
            }
            onHeaderTitleClick={() => {
              if (activeChat.type === 'personal') {
                const partnerUid = activeChat.id.split('_').find((id) => id !== currentUser.uid);
                if (partnerUid && usersMap[partnerUid]) {
                  setInspectedUser(usersMap[partnerUid]);
                }
              } else if (activeChat.type === 'group' || activeChat.type === 'global') {
                setIsMembersModalOpen(true);
              }
            }}
            onOpenRequests={() => setIsManageRequestsOpen(true)}
            onOpenGroupSettings={() => setIsMembersModalOpen(true)}
            onClearHistory={() => {
              setConfirmDialogData({
                isOpen: true,
                title: 'Clear Chat History',
                message: 'Are you sure you want to clear all messages in this chat? This cannot be undone.',
                onConfirm: async () => {
                  try {
                    await chatRepository.clearChatHistory(activeChat.type, activeChat.id);
                    showToast('Chat history cleared', 'success');
                  } catch (err: any) {
                    showToast('Failed to clear chat: ' + err.message, 'error');
                  } finally {
                    setConfirmDialogData((prev) => ({ ...prev, isOpen: false }));
                  }
                },
              });
            }}
            onDeleteChat={() => {
              if (activeChat.type === 'personal') {
                const partnerUid = activeChat.id.split('_').find((id) => id !== currentUser.uid);
                const partner = partnerUid ? usersMap[partnerUid] : null;
                setConfirmDialogData({
                  isOpen: true,
                  title: 'Delete Chat',
                  message: `Delete conversation with ${partner?.displayName || 'this user'}?`,
                  onConfirm: async () => {
                    if (partnerUid) {
                      await chatRepository.deletePersonalChat(currentUser.uid, partnerUid);
                      showToast('Chat deleted');
                      handleBackToList();
                    }
                    setConfirmDialogData((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              } else if (activeChat.type === 'group') {
                const isOwner = activeGroupMeta?.ownerId === currentUser.uid;
                setConfirmDialogData({
                  isOpen: true,
                  title: isOwner ? 'Delete Group' : 'Leave Group',
                  message: isOwner
                    ? `Delete group "${activeGroupMeta?.name || 'Group'}" for all members? This cannot be undone.`
                    : `Leave group "${activeGroupMeta?.name || 'Group'}"?`,
                  onConfirm: async () => {
                    if (isOwner) {
                      await groupRepository.deleteGroup(activeChat.id);
                      showToast('Group deleted');
                    } else {
                      await groupRepository.leaveGroup(activeChat.id, currentUser.uid);
                      showToast('Left group');
                    }
                    handleBackToList();
                    setConfirmDialogData((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              }
            }}
            onUserClick={handleUserClickStable}
            onGroupClick={handleGroupUsernameOrLink}
            onShowToast={showToast}
          />
        ) : null;

        if (isDesktop) {
          return (
            <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
              <div className="desktop-chatlist-pane">{chatListView}</div>
              <div className="desktop-messageview-pane">
                {activeChat ? (
                  <Suspense fallback={<SkeletonLoadingScreen />}>{messageViewComponent}</Suspense>
                ) : (
                  <div className="desktop-empty-placeholder">
                    <div
                      style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        color: 'var(--accent-color)',
                      }}
                    >
                      <span className="material-icons-round" style={{ fontSize: '44px' }}>
                        forum
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '8px' }}>
                      Select a chat to start messaging
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '340px', lineHeight: 1.5 }}>
                      Select a conversation from the left sidebar or click the plus button to start a new chat.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        }

        return activeChat ? (
          <Suspense fallback={<SkeletonLoadingScreen />}>{messageViewComponent}</Suspense>
        ) : (
          chatListView
        );
      })()}

      {/* Confirmation Dialog Modal */}
      <ConfirmDialog
        isOpen={confirmDialogData.isOpen}
        onClose={() => setConfirmDialogData((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialogData.onConfirm}
        title={confirmDialogData.title}
        message={confirmDialogData.message}
        confirmLabel="Confirm"
        isDanger={true}
      />

      {/* Modals with Code Splitting / Lazy Loading */}
      <Suspense fallback={null}>
        <ProfileSettingsModal
          isOpen={isProfileSettingsOpen}
          onClose={() => setIsProfileSettingsOpen(false)}
          currentUser={currentUser}
          onSave={async (name, avatarUrl, newUsername) => {
            const updates: Partial<UserProfile> = {
              displayName: name,
              avatarUrl: avatarUrl || currentUser.avatarUrl,
            };
            if (newUsername && newUsername !== currentUser.username) {
              updates.username = newUsername;
            }
            await authService.updateProfile(currentUser.uid, updates);
            setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
            showToast('Profile updated');
          }}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={currentUser}
          onUpdatePrivacy={handleUpdatePrivacy}
          onDeleteAccount={() => {
            setConfirmDialogData({
              isOpen: true,
              title: 'Delete Account',
              message:
                'Are you sure you want to delete your account? This action is permanent and cannot be undone.',
              onConfirm: async () => {
                await authService.deleteAccount(currentUser.uid);
                setConfirmDialogData((prev) => ({ ...prev, isOpen: false }));
                showToast('Account deleted');
              },
            });
          }}
        />

        <UserProfileModal
          user={inspectedUser}
          isOpen={!!inspectedUser}
          onClose={() => setInspectedUser(null)}
          onStartChat={(u) => handleStartPersonalChat(u)}
          onStartCall={async (u, type) => {
            try {
              await startCall(
                {
                  uid: u.uid,
                  displayName: u.displayName,
                  username: u.username,
                  avatarColor: u.avatarColor,
                  avatarUrl: u.avatarUrl,
                  initials: u.initials,
                },
                type
              );
            } catch (err: any) {
              showToast(err?.message || 'Call failed', 'error');
            }
          }}
          currentUserId={currentUser.uid}
          isBlocked={!!(inspectedUser && currentUser.blockedUsers?.[inspectedUser.uid])}
          onToggleBlock={handleToggleBlock}
        />

        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          onCreate={async (data) => {
            const newGid = await groupRepository.createGroup(
              {
                name: data.name,
                icon: data.icon,
                avatarUrl: data.avatarUrl,
                type: data.type,
                username: data.username,
                ownerId: currentUser.uid,
              },
              currentUser
            );
            showToast(`Group "${data.name}" created!`, 'success');
            handleOpenChat('group', newGid);
          }}
        />

        <JoinGroupModal
          isOpen={isJoinGroupOpen}
          onClose={() => setIsJoinGroupOpen(false)}
          onFindAndJoin={handleGroupUsernameOrLink}
        />

        <NewChatModal
          isOpen={isNewChatOpen}
          onClose={() => setIsNewChatOpen(false)}
          onSearchAndChat={async (username) => {
            const user = await userRepository.getUserByUsername(username);
            if (!user) throw new Error('User not found.');
            if (user.uid === currentUser.uid) throw new Error('Cannot chat with yourself.');
            handleStartPersonalChat(user);
          }}
        />

        <ManageRequestsModal
          isOpen={isManageRequestsOpen}
          onClose={() => setIsManageRequestsOpen(false)}
          requests={pendingRequests}
          onAccept={async (targetUid) => {
            if (activeChat?.id) {
              await groupRepository.acceptJoinRequest(activeChat.id, targetUid);
              showToast('Join request accepted');
            }
          }}
          onReject={async (targetUid) => {
            if (activeChat?.id) {
              await groupRepository.rejectJoinRequest(activeChat.id, targetUid);
              showToast('Join request rejected');
            }
          }}
        />

        <GroupMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          title={activeChatTitle}
          groupMeta={activeGroupMeta}
          members={
            activeChat?.type === 'global'
              ? Object.values(usersMap)
              : activeGroupMeta
              ? Object.keys(groupsMap[activeChat!.id]?.members || {})
                  .map((uid) => usersMap[uid])
                  .filter(Boolean)
              : []
          }
          ownerId={activeGroupMeta?.ownerId}
          isOwner={activeGroupMeta?.ownerId === currentUser.uid}
          onShare={() => setIsShareModalOpen(true)}
          onSelectUser={(u) => {
            setIsMembersModalOpen(false);
            setInspectedUser(u);
          }}
          onUpdateGroup={async (groupId, data) => {
            await groupRepository.updateGroup(groupId, data);
            showToast('Group profile updated successfully', 'success');
          }}
          onShowToast={showToast}
        />

        <ShareGroupModal
          group={activeGroupMeta}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onCopySuccess={showToast}
        />

        <ConfirmJoinGroupModal
          group={confirmJoinGroup}
          isOpen={!!confirmJoinGroup}
          onClose={() => setConfirmJoinGroup(null)}
          onConfirm={async () => {
            if (!confirmJoinGroup) return;
            if (confirmJoinGroup.type === 'private') {
              await groupRepository.requestJoinPrivateGroup(confirmJoinGroup.id, currentUser.uid);
              showToast('Join request sent to group owner!', 'success');
            } else {
              await groupRepository.joinPublicGroup(confirmJoinGroup.id, currentUser);
              showToast(`Joined ${confirmJoinGroup.name}!`, 'success');
              handleOpenChat('group', confirmJoinGroup.id);
            }
            setConfirmJoinGroup(null);
          }}
        />
      </Suspense>
    </div>
  );
};
