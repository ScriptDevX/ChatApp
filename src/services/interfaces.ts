import {
  ChatType,
  GroupJoinRequest,
  GroupMetadata,
  GroupWithMembers,
  Message,
  SignalingPayload,
  UserChatMeta,
  UserProfile,
} from '../types';

export interface IAuthService {
  getCurrentUser(): UserProfile | null;
  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void;
  loginWithGoogle(): Promise<UserProfile>;
  logout(): Promise<void>;
  setupProfile(uid: string, username: string, displayName: string): Promise<UserProfile>;
  updateProfile(uid: string, data: Partial<UserProfile>): Promise<void>;
  deleteAccount(uid: string): Promise<void>;
}

export interface IUserRepository {
  getUserProfile(uid: string): Promise<UserProfile | null>;
  getUserByUsername(username: string): Promise<UserProfile | null>;
  isUsernameAvailable(username: string, excludeUid?: string): Promise<boolean>;
  subscribeToUsers(callback: (users: Record<string, UserProfile>) => void): () => void;
  setUserPresence(uid: string, online: boolean): Promise<void>;
  blockUser(currentUid: string, targetUid: string): Promise<void>;
  unblockUser(currentUid: string, targetUid: string): Promise<void>;
  updatePrivacySettings(uid: string, settings: import('../types').UserPrivacySettings): Promise<void>;
  updateFcmToken?(uid: string, token: string): Promise<void>;
}

export interface IChatRepository {
  subscribeToUserChats(uid: string, callback: (chats: Record<string, UserChatMeta>) => void): () => void;
  subscribeToMessages(
    chatType: ChatType,
    chatId: string,
    limit: number,
    callback: (messages: Message[]) => void
  ): () => void;
  loadOlderMessages(
    chatType: ChatType,
    chatId: string,
    beforeTimestamp: number,
    limit: number
  ): Promise<Message[]>;
  sendMessage(
    params: {
      chatType: ChatType;
      chatId: string;
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
      replyTo?: Message['replyTo'];
      mentions?: Record<string, string> | null;
    }
  ): Promise<string>;
  editMessage(
    chatType: ChatType,
    chatId: string,
    messageId: string,
    text: string,
    mentions?: Record<string, string> | null
  ): Promise<void>;
  updateMessage(
    chatType: ChatType,
    chatId: string,
    messageId: string,
    updates: Partial<Message>
  ): Promise<void>;
  deleteMessage(chatType: ChatType, chatId: string, messageId: string): Promise<void>;
  deleteMessages(chatType: ChatType, chatId: string, messageIds: string[]): Promise<void>;
  toggleReaction(
    chatType: ChatType,
    chatId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void>;
  markMessagesAsRead(chatType: ChatType, chatId: string, readerUid: string): Promise<void>;
  clearChatHistory(chatType: ChatType, chatId: string): Promise<void>;
  deletePersonalChat(uid: string, partnerUid: string): Promise<void>;
  togglePinChat(uid: string, chatId: string, isPinned: boolean): Promise<void>;
  subscribeToTyping(typingKey: string, callback: (typingUsers: string[]) => void): () => void;
  setTypingStatus(typingKey: string, uid: string, isTyping: boolean): Promise<void>;
}

export interface IGroupRepository {
  getGroup(groupId: string): Promise<GroupWithMembers | null>;
  getGroupByUsername(username: string): Promise<GroupWithMembers | null>;
  subscribeToGroup(groupId: string, callback: (group: GroupWithMembers | null) => void): () => void;
  createGroup(
    data: Omit<GroupMetadata, 'id' | 'createdAt'>,
    creator: UserProfile
  ): Promise<string>;
  joinPublicGroup(groupId: string, user: UserProfile): Promise<void>;
  requestJoinPrivateGroup(groupId: string, uid: string): Promise<void>;
  acceptJoinRequest(groupId: string, targetUid: string): Promise<void>;
  rejectJoinRequest(groupId: string, targetUid: string): Promise<void>;
  subscribeToGroupRequests(
    groupId: string,
    callback: (requests: GroupJoinRequest[]) => void
  ): () => void;
  leaveGroup(groupId: string, uid: string): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
  updateGroup(
    groupId: string,
    data: Partial<Pick<GroupMetadata, 'name' | 'icon' | 'avatarUrl' | 'description' | 'type' | 'username'>>
  ): Promise<void>;
}

export interface ISignalingService {
  sendSignal(payload: SignalingPayload): Promise<void>;
  subscribeToSignals(userId: string, callback: (signal: SignalingPayload) => void): () => void;
}
