export type ThemeMode = 'light' | 'dark';
export type ThemeColor = 'default' | 'green' | 'purple' | 'orange';

export interface UserStatus {
  online: boolean;
  lastSeen?: number;
}

export type CallPrivacyOption = 'everyone' | 'selected' | 'nobody';

export interface UserPrivacySettings {
  callPrivacy: CallPrivacyOption;
  allowedCallers?: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  hasSetUsername?: boolean;
  createdAt?: number;
  status?: UserStatus;
  avatarColor?: string;
  avatarUrl?: string;
  initials?: string;
  privacySettings?: UserPrivacySettings;
  blockedUsers?: Record<string, boolean>;
  fcmToken?: string;
}

export type ChatType = 'global' | 'personal' | 'group';

export interface ReplySnippetData {
  id?: string;
  senderName: string;
  text?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  type: 'text' | 'sticker' | 'system' | 'image' | 'file';
}

export interface MessageReactionMap {
  [emoji: string]: {
    [userId: string]: boolean;
  };
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername?: string;
  type: 'text' | 'sticker' | 'system' | 'image' | 'file';
  text?: string;
  stickerUrl?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileContent?: string;
  timestamp: number;
  reactions?: MessageReactionMap | null;
  replyTo?: ReplySnippetData | null;
  mentions?: Record<string, string> | null; // @username -> uid
  readBy?: Record<string, boolean>; // uid -> true
  deliveredTo?: Record<string, boolean>; // uid -> true
  status?: 'sent' | 'delivered' | 'read';
  lastEdited?: number;
}

export interface GroupMetadata {
  id: string;
  name: string;
  icon: string;
  avatarUrl?: string;
  description?: string;
  type: 'public' | 'private';
  ownerId: string;
  username?: string; // Optional public username
  createdAt: number;
  lastMessageTimestamp?: number;
  lastMessageSnippet?: string;
  memberCount?: number;
}

export interface GroupJoinRequest {
  uid: string;
  timestamp: number;
  user?: UserProfile;
}

export interface GroupWithMembers extends GroupMetadata {
  members: Record<string, boolean>;
  requests?: Record<string, number>; // uid -> timestamp
}

export interface UserChatMeta {
  chatId: string;
  type: ChatType;
  lastMessageTimestamp: number;
  lastMessageSnippet: string;
  unreadCount: number;
  hasMention?: boolean;
  isPinned?: boolean;
}

export interface ChatListItem {
  id: string;
  type: ChatType;
  name: string;
  avatarInitials?: string;
  avatarColor?: string;
  avatarUrl?: string;
  icon?: string;
  lastMessageSnippet: string;
  lastMessageTimestamp: number;
  unreadCount: number;
  hasMention: boolean;
  isPinned?: boolean;
  partnerUid?: string;
  status?: UserStatus;
  groupMeta?: GroupMetadata;
}

export type CallType = 'voice' | 'video';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'declined'
  | 'missed'
  | 'failed';

export interface CallParticipant {
  uid: string;
  displayName: string;
  username?: string;
  avatarColor?: string;
  avatarUrl?: string;
  initials?: string;
}

export interface CallSession {
  id: string;
  type: CallType;
  status: CallStatus;
  initiatorId: string;
  receiverId: string;
  partner: CallParticipant;
  isIncoming: boolean;
  startTime?: number;
  connectedTime?: number;
  endTime?: number;
  durationSeconds?: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  facingMode: 'user' | 'environment';
  errorMessage?: string;
}

export interface SignalingPayload {
  callId: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-ringing' | 'call-accept' | 'call-decline' | 'call-end' | 'call-missed';
  callType: CallType;
  senderId: string;
  receiverId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  timestamp: number;
}

export interface AppSettings {
  themeMode: ThemeMode;
  themeColor: ThemeColor;
  soundEnabled: boolean;
  enterToSend: boolean;
  vibrateOnClick: boolean;
}

export interface MentionSuggestion {
  uid: string;
  username: string;
  displayName: string;
  avatarColor: string;
  initials: string;
  avatarUrl?: string;
}
