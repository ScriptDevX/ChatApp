import { GroupWithMembers, Message, UserChatMeta, UserProfile } from '../types';
import { STICKER_URLS } from '../constants';

const now = Date.now();
const m = (minutesAgo: number) => now - minutesAgo * 60 * 1000;
const h = (hoursAgo: number) => now - hoursAgo * 3600 * 1000;
const d = (daysAgo: number) => now - daysAgo * 24 * 3600 * 1000;

export const INITIAL_USERS: Record<string, UserProfile> = {
  'user-current': {
    uid: 'user-current',
    email: 'me@funchat.app',
    username: 'alex_current',
    displayName: 'Alex Smith',
    avatarColor: '#0088cc',
    initials: 'AS',
    status: { online: true },
    createdAt: d(30),
  },
  'user-sarah': {
    uid: 'user-sarah',
    email: 'sarah@funchat.app',
    username: 'sarah_c',
    displayName: 'Sarah Connor',
    avatarColor: '#e53935',
    initials: 'SC',
    status: { online: true },
    createdAt: d(20),
  },
  'user-david': {
    uid: 'user-david',
    email: 'david@funchat.app',
    username: 'david_c',
    displayName: 'David Chen',
    avatarColor: '#43a047',
    initials: 'DC',
    status: { online: true },
    createdAt: d(15),
  },
  'user-elena': {
    uid: 'user-elena',
    email: 'elena@funchat.app',
    username: 'elena_v',
    displayName: 'Elena Vance',
    avatarColor: '#8e24aa',
    initials: 'EV',
    status: { online: false, lastSeen: h(2) },
    createdAt: d(10),
  },
};

export const INITIAL_GROUPS: Record<string, GroupWithMembers> = {
  'group-techhub': {
    id: 'group-techhub',
    name: 'Tech Enthusiasts',
    icon: 'fa-code',
    type: 'public',
    username: 'techhub',
    ownerId: 'user-current',
    createdAt: d(10),
    memberCount: 4,
    lastMessageTimestamp: m(5),
    lastMessageSnippet: 'Sarah Connor: Check out the WebRTC architecture!',
    members: {
      'user-current': true,
      'user-sarah': true,
      'user-david': true,
      'user-elena': true,
    },
    requests: {},
  },
  'group-alpha': {
    id: 'group-alpha',
    name: 'Alpha Secret Lab',
    icon: 'fa-gamepad',
    type: 'private',
    ownerId: 'user-current',
    createdAt: d(5),
    memberCount: 2,
    lastMessageTimestamp: h(4),
    lastMessageSnippet: 'David Chen: Ready for the new voice calls test.',
    members: {
      'user-current': true,
      'user-david': true,
    },
    requests: {
      'user-elena': h(1),
    },
  },
};

export const INITIAL_GLOBAL_MESSAGES: Message[] = [
  {
    id: 'gm-1',
    senderId: 'user-sarah',
    senderName: 'Sarah Connor',
    senderUsername: 'sarah_c',
    type: 'text',
    text: 'Welcome to FunChat! Enjoy the clean, modern Telegram-like speed.',
    timestamp: h(5),
    reactions: { '❤️': { 'user-david': true } },
    readBy: {},
  },
  {
    id: 'gm-2',
    senderId: 'user-david',
    senderName: 'David Chen',
    senderUsername: 'david_c',
    type: 'text',
    text: 'Check out the community group at @techhub or join private tests with invite links!',
    timestamp: h(3),
    reactions: { '👍': { 'user-sarah': true } },
    readBy: {},
  },
  {
    id: 'gm-3',
    senderId: 'user-current',
    senderName: 'Alex Smith',
    senderUsername: 'alex_current',
    type: 'sticker',
    stickerUrl: STICKER_URLS[0],
    timestamp: h(1),
    reactions: { '😂': { 'user-sarah': true, 'user-david': true } },
    readBy: {},
  },
  {
    id: 'gm-4',
    senderId: 'user-elena',
    senderName: 'Elena Vance',
    senderUsername: 'elena_v',
    type: 'text',
    text: 'Hey @alex_current, WebRTC calling feels super smooth!',
    mentions: { alex_current: 'user-current' },
    timestamp: m(12),
    reactions: {},
    readBy: {},
  },
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  global: INITIAL_GLOBAL_MESSAGES,
  'user-current_user-sarah': [
    {
      id: 'p-1',
      senderId: 'user-sarah',
      senderName: 'Sarah Connor',
      senderUsername: 'sarah_c',
      type: 'text',
      text: 'Hey Alex! Did you review the voice calling interface?',
      timestamp: h(2),
      reactions: { '👍': { 'user-current': true } },
      readBy: { 'user-current': true },
    },
    {
      id: 'p-2',
      senderId: 'user-current',
      senderName: 'Alex Smith',
      senderUsername: 'alex_current',
      type: 'text',
      text: 'Yes! It has peer-to-peer WebRTC with video, audio muting, and duration counters.',
      timestamp: h(1),
      reactions: {},
      readBy: { 'user-sarah': true },
    },
    {
      id: 'p-3',
      senderId: 'user-sarah',
      senderName: 'Sarah Connor',
      senderUsername: 'sarah_c',
      type: 'text',
      text: 'Awesome! Let’s hop on a call whenever you are ready.',
      timestamp: m(15),
      reactions: { '❤️': { 'user-current': true } },
      readBy: { 'user-current': true },
    },
  ],
  'group-techhub': [
    {
      id: 'g-1',
      senderId: 'user-david',
      senderName: 'David Chen',
      type: 'text',
      text: 'Hello everyone! Glad to join the Tech Enthusiasts group.',
      timestamp: h(6),
      reactions: {},
    },
    {
      id: 'g-2',
      senderId: 'user-sarah',
      senderName: 'Sarah Connor',
      type: 'text',
      text: 'Check out the WebRTC architecture! Zero lag and seamless reconnection.',
      timestamp: m(5),
      reactions: { '🙏': { 'user-david': true } },
    },
  ],
  'group-alpha': [
    {
      id: 'ga-1',
      senderId: 'user-david',
      senderName: 'David Chen',
      type: 'text',
      text: 'Ready for the new voice calls test.',
      timestamp: h(4),
      reactions: {},
    },
  ],
};

export const INITIAL_USER_CHATS: Record<string, Record<string, UserChatMeta>> = {
  'user-current': {
    'user-current_user-sarah': {
      chatId: 'user-current_user-sarah',
      type: 'personal',
      lastMessageTimestamp: m(15),
      lastMessageSnippet: 'Sarah Connor: Awesome! Let’s hop on a call whenever you are ready.',
      unreadCount: 0,
      hasMention: false,
    },
    'group-techhub': {
      chatId: 'group-techhub',
      type: 'group',
      lastMessageTimestamp: m(5),
      lastMessageSnippet: 'Sarah Connor: Check out the WebRTC architecture!',
      unreadCount: 1,
      hasMention: false,
    },
    'group-alpha': {
      chatId: 'group-alpha',
      type: 'group',
      lastMessageTimestamp: h(4),
      lastMessageSnippet: 'David Chen: Ready for the new voice calls test.',
      unreadCount: 0,
      hasMention: false,
    },
  },
};
