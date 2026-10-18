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
import {
  IAuthService,
  IChatRepository,
  IGroupRepository,
  ISignalingService,
  IUserRepository,
} from './interfaces';
import {
  INITIAL_GROUPS,
  INITIAL_MESSAGES,
  INITIAL_USERS,
  INITIAL_USER_CHATS,
} from './mockData';
import { getPersonalChatId } from '../utils';

class LocalStore {
  private users: Record<string, UserProfile>;
  private groups: Record<string, GroupWithMembers>;
  private messages: Record<string, Message[]>;
  private userChats: Record<string, Record<string, UserChatMeta>>;
  private currentUserId: string | null;

  constructor() {
    const savedUsers = localStorage.getItem('mock_users');
    const savedGroups = localStorage.getItem('mock_groups');
    const savedMessages = localStorage.getItem('mock_messages');
    const savedUserChats = localStorage.getItem('mock_user_chats');
    const savedCurrentUserId = localStorage.getItem('mock_current_uid');

    this.users = savedUsers ? JSON.parse(savedUsers) : { ...INITIAL_USERS };
    this.groups = savedGroups ? JSON.parse(savedGroups) : { ...INITIAL_GROUPS };
    this.messages = savedMessages ? JSON.parse(savedMessages) : { ...INITIAL_MESSAGES };
    this.userChats = savedUserChats ? JSON.parse(savedUserChats) : { ...INITIAL_USER_CHATS };
    this.currentUserId = savedCurrentUserId || 'user-current';
  }

  save() {
    localStorage.setItem('mock_users', JSON.stringify(this.users));
    localStorage.setItem('mock_groups', JSON.stringify(this.groups));
    localStorage.setItem('mock_messages', JSON.stringify(this.messages));
    localStorage.setItem('mock_user_chats', JSON.stringify(this.userChats));
    if (this.currentUserId) {
      localStorage.setItem('mock_current_uid', this.currentUserId);
    } else {
      localStorage.removeItem('mock_current_uid');
    }
  }

  getUsers() { return this.users; }
  getGroups() { return this.groups; }
  getMessages() { return this.messages; }
  getUserChats() { return this.userChats; }
  getCurrentUserId() { return this.currentUserId; }
  setCurrentUserId(uid: string | null) {
    this.currentUserId = uid;
    this.save();
  }
}

export const store = new LocalStore();

// Event listeners bus for real-time reactivity
type Listener<T> = (data: T) => void;
class EventBus {
  private listeners: Record<string, Set<Listener<any>>> = {};

  subscribe<T>(event: string, cb: Listener<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(cb);
    return () => {
      this.listeners[event]?.delete(cb);
    };
  }

  emit<T>(event: string, data: T) {
    this.listeners[event]?.forEach((cb) => cb(data));
  }
}

export const bus = new EventBus();

export class MockAuthService implements IAuthService {
  getCurrentUser(): UserProfile | null {
    const uid = store.getCurrentUserId();
    if (!uid) return null;
    return store.getUsers()[uid] || null;
  }

  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    callback(this.getCurrentUser());
    return bus.subscribe<UserProfile | null>('auth_state_changed', callback);
  }

  async loginWithGoogle(): Promise<UserProfile> {
    const users = store.getUsers();
    // Default or create Google account profile
    const uid = 'user-current';
    let found = users[uid];
    if (!found) {
      found = {
        uid,
        email: 'alex.smith@gmail.com',
        username: 'alex_current',
        displayName: 'Alex Smith',
        avatarColor: '#0088cc',
        initials: 'AS',
        createdAt: Date.now(),
        status: { online: true },
      };
      users[uid] = found;
    }
    store.setCurrentUserId(found.uid);
    found.status = { online: true };
    store.save();
    bus.emit('auth_state_changed', found);
    bus.emit('users_updated', store.getUsers());
    return found;
  }

  async logout(): Promise<void> {
    const uid = store.getCurrentUserId();
    if (uid && store.getUsers()[uid]) {
      store.getUsers()[uid].status = { online: false, lastSeen: Date.now() };
    }
    store.setCurrentUserId(null);
    store.save();
    bus.emit('auth_state_changed', null);
    bus.emit('users_updated', store.getUsers());
  }

  async setupProfile(uid: string, username: string, displayName: string): Promise<UserProfile> {
    const users = store.getUsers();
    if (!users[uid]) {
      users[uid] = {
        uid,
        email: `${username}@funchat.app`,
        username,
        displayName,
        createdAt: Date.now(),
        status: { online: true },
      };
    } else {
      users[uid].username = username;
      users[uid].displayName = displayName;
    }
    store.setCurrentUserId(uid);
    store.save();
    bus.emit('auth_state_changed', users[uid]);
    bus.emit('users_updated', users);
    return users[uid];
  }

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const users = store.getUsers();
    if (users[uid]) {
      Object.assign(users[uid], data);
      store.save();
      bus.emit('auth_state_changed', users[uid]);
      bus.emit('users_updated', users);
    }
  }

  async deleteAccount(uid: string): Promise<void> {
    delete store.getUsers()[uid];
    delete store.getUserChats()[uid];
    store.setCurrentUserId(null);
    store.save();
    bus.emit('auth_state_changed', null);
    bus.emit('users_updated', store.getUsers());
  }
}

export class MockUserRepository implements IUserRepository {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    return store.getUsers()[uid] || null;
  }

  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const lower = username.toLowerCase().replace(/^@/, '');
    return Object.values(store.getUsers()).find((u) => u.username.toLowerCase() === lower) || null;
  }

  async isUsernameAvailable(username: string, excludeUid?: string): Promise<boolean> {
    const lower = username.toLowerCase().replace(/^@/, '');
    if (!lower) return false;
    const existing = Object.values(store.getUsers()).find((u) => u.username.toLowerCase() === lower);
    if (!existing) return true;
    if (excludeUid && existing.uid === excludeUid) return true;
    return false;
  }

  subscribeToUsers(callback: (users: Record<string, UserProfile>) => void): () => void {
    callback(store.getUsers());
    return bus.subscribe<Record<string, UserProfile>>('users_updated', callback);
  }

  async setUserPresence(uid: string, online: boolean): Promise<void> {
    const user = store.getUsers()[uid];
    if (user) {
      user.status = online ? { online: true } : { online: false, lastSeen: Date.now() };
      store.save();
      bus.emit('users_updated', store.getUsers());
    }
  }

  async blockUser(currentUid: string, targetUid: string): Promise<void> {
    const user = store.getUsers()[currentUid];
    if (user) {
      user.blockedUsers = user.blockedUsers || {};
      user.blockedUsers[targetUid] = true;
      store.save();
      bus.emit('users_updated', store.getUsers());
    }
  }

  async unblockUser(currentUid: string, targetUid: string): Promise<void> {
    const user = store.getUsers()[currentUid];
    if (user && user.blockedUsers) {
      delete user.blockedUsers[targetUid];
      store.save();
      bus.emit('users_updated', store.getUsers());
    }
  }

  async updatePrivacySettings(uid: string, settings: import('../types').UserPrivacySettings): Promise<void> {
    const user = store.getUsers()[uid];
    if (user) {
      user.privacySettings = settings;
      store.save();
      bus.emit('users_updated', store.getUsers());
    }
  }

  async updateFcmToken(uid: string, token: string): Promise<void> {
    const user = store.getUsers()[uid];
    if (user) {
      user.fcmToken = token;
      store.save();
    }
  }
}

export class MockChatRepository implements IChatRepository {
  subscribeToUserChats(uid: string, callback: (chats: Record<string, UserChatMeta>) => void): () => void {
    const getChats = () => store.getUserChats()[uid] || {};
    callback(getChats());
    return bus.subscribe<string>('user_chats_updated', (targetUid) => {
      if (targetUid === uid || targetUid === 'all') {
        callback(getChats());
      }
    });
  }

  subscribeToMessages(
    chatType: ChatType,
    chatId: string,
    limit: number,
    callback: (messages: Message[]) => void
  ): () => void {
    const key = chatType === 'global' ? 'global' : chatId;
    const fetch = () => {
      const all = store.getMessages()[key] || [];
      return all.slice(Math.max(0, all.length - limit));
    };
    callback(fetch());
    return bus.subscribe<string>(`messages_${key}`, () => {
      callback(fetch());
    });
  }

  async loadOlderMessages(
    chatType: ChatType,
    chatId: string,
    beforeTimestamp: number,
    limit: number
  ): Promise<Message[]> {
    const key = chatType === 'global' ? 'global' : chatId;
    const all = store.getMessages()[key] || [];
    const older = all.filter((m) => m.timestamp < beforeTimestamp);
    return older.slice(Math.max(0, older.length - limit));
  }

  async sendMessage(params: {
    chatType: ChatType;
    chatId: string;
    senderId: string;
    senderName: string;
    senderUsername?: string;
    type: 'text' | 'sticker' | 'system' | 'image';
    text?: string;
    stickerUrl?: string;
    imageUrl?: string;
    replyTo?: Message['replyTo'];
    mentions?: Record<string, string> | null;
  }): Promise<string> {
    const key = params.chatType === 'global' ? 'global' : params.chatId;
    const allMessages = store.getMessages();
    if (!allMessages[key]) {
      allMessages[key] = [];
    }

    const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newMsg: Message = {
      id: messageId,
      senderId: params.senderId,
      senderName: params.senderName,
      senderUsername: params.senderUsername,
      type: params.type,
      text: params.text,
      stickerUrl: params.stickerUrl,
      imageUrl: params.imageUrl,
      timestamp: Date.now(),
      reactions: null,
      replyTo: params.replyTo,
      mentions: params.mentions,
      readBy: { [params.senderId]: true },
      status: 'sent',
    };

    allMessages[key].push(newMsg);

    const baseSnippet =
      params.type === 'sticker'
        ? 'Sticker 🖼️'
        : params.type === 'image'
        ? 'Photo 📷'
        : params.text
        ? params.text.substring(0, 35)
        : '';
    const fullSnippet = `${params.senderName}: ${baseSnippet}`;
    const timestamp = newMsg.timestamp;

    // Update chats meta
    if (params.chatType === 'personal') {
      const parts = params.chatId.split('_');
      const partnerUid = parts.find((p) => p !== params.senderId) || parts[0];

      // Sender user chats
      this.ensureUserChat(params.senderId, params.chatId, 'personal', fullSnippet, timestamp, 0);
      // Receiver user chats
      const receiverChats = store.getUserChats()[partnerUid] || {};
      const prevUnread = receiverChats[params.chatId]?.unreadCount || 0;
      const hasMention = !!(params.mentions && Object.values(params.mentions).includes(partnerUid));
      this.ensureUserChat(partnerUid, params.chatId, 'personal', fullSnippet, timestamp, prevUnread + 1, hasMention);
    } else if (params.chatType === 'group') {
      const group = store.getGroups()[params.chatId];
      if (group) {
        group.lastMessageTimestamp = timestamp;
        group.lastMessageSnippet = fullSnippet;
        Object.keys(group.members).forEach((memberId) => {
          const prevUnread = store.getUserChats()[memberId]?.[params.chatId]?.unreadCount || 0;
          const unread = memberId === params.senderId ? 0 : prevUnread + 1;
          const hasMention = !!(params.mentions && Object.values(params.mentions).includes(memberId));
          this.ensureUserChat(memberId, params.chatId, 'group', fullSnippet, timestamp, unread, hasMention);
        });
      }
    }

    store.save();
    bus.emit(`messages_${key}`, messageId);
    bus.emit('user_chats_updated', 'all');

    if (params.chatType === 'personal' && (params.text || params.type === 'image')) {
      this.simulateMockResponse(params.chatId, params.senderId);
    }

    return messageId;
  }

  async updateMessage(
    chatType: ChatType,
    chatId: string,
    messageId: string,
    updates: Partial<Message>
  ): Promise<void> {
    const key = chatType === 'global' ? 'global' : chatId;
    const list = store.getMessages()[key];
    const msg = list?.find((m) => m.id === messageId);
    if (msg) {
      Object.assign(msg, updates);
      store.save();
      bus.emit(`messages_${key}`, messageId);
    }
  }

  private simulateMockResponse(chatId: string, currentUid: string) {
    const partnerUid = chatId.split('_').find((id) => id !== currentUid);
    if (!partnerUid) return;
    const partner = store.getUsers()[partnerUid];
    if (!partner) return;

    setTimeout(() => {
      const responses = [
        `Got it! Let me know if you want to test WebRTC audio/video call.`,
        `That looks great! FunChat feels so fast.`,
        `Nice! The design and gesture handling feel super native.`,
        `👍 Sounds good!`,
      ];
      const randomText = responses[Math.floor(Math.random() * responses.length)];
      this.sendMessage({
        chatType: 'personal',
        chatId,
        senderId: partner.uid,
        senderName: partner.displayName,
        senderUsername: partner.username,
        type: 'text',
        text: randomText,
      });
    }, 1500);
  }

  private ensureUserChat(
    uid: string,
    chatId: string,
    type: ChatType,
    snippet: string,
    ts: number,
    unread: number,
    hasMention: boolean = false
  ) {
    const userChats = store.getUserChats();
    if (!userChats[uid]) {
      userChats[uid] = {};
    }
    userChats[uid][chatId] = {
      chatId,
      type,
      lastMessageTimestamp: ts,
      lastMessageSnippet: snippet,
      unreadCount: unread,
      hasMention,
    };
  }

  async editMessage(
    chatType: ChatType,
    chatId: string,
    messageId: string,
    text: string,
    mentions?: Record<string, string> | null
  ): Promise<void> {
    const key = chatType === 'global' ? 'global' : chatId;
    const list = store.getMessages()[key];
    const msg = list?.find((m) => m.id === messageId);
    if (msg) {
      msg.text = text;
      msg.mentions = mentions;
      msg.lastEdited = Date.now();
      store.save();
      bus.emit(`messages_${key}`, messageId);
    }
  }

  async deleteMessages(chatType: ChatType, chatId: string, messageIds: string[]): Promise<void> {
    for (const id of messageIds) {
      await this.deleteMessage(chatType, chatId, id);
    }
  }

  async deleteMessage(chatType: ChatType, chatId: string, messageId: string): Promise<void> {
    const key = chatType === 'global' ? 'global' : chatId;
    const list = store.getMessages()[key];
    if (list) {
      const remaining = list.filter((m) => m.id !== messageId);
      store.getMessages()[key] = remaining;
      const lastMsg = remaining.length > 0 ? remaining[remaining.length - 1] : null;
      const baseSnippet = lastMsg
        ? lastMsg.type === 'sticker'
          ? 'Sticker 🖼️'
          : lastMsg.type === 'image'
          ? 'Photo 📷'
          : lastMsg.text
          ? lastMsg.text.substring(0, 35)
          : ''
        : '';
      const fullSnippet = lastMsg ? `${lastMsg.senderName}: ${baseSnippet}` : '';
      const time = lastMsg ? lastMsg.timestamp : Date.now();

      const userChats = store.getUserChats();
      Object.keys(userChats).forEach((uid) => {
        if (userChats[uid][chatId]) {
          userChats[uid][chatId].lastMessageSnippet = fullSnippet;
          userChats[uid][chatId].lastMessageTimestamp = time;
          bus.emit(`userChats_${uid}`, userChats[uid]);
        }
      });

      const group = store.getGroups()[chatId];
      if (group) {
        group.lastMessageSnippet = fullSnippet;
        group.lastMessageTimestamp = time;
        bus.emit('groups', store.getGroups());
      }

      store.save();
      bus.emit(`messages_${key}`, messageId);
    }
  }

  async toggleReaction(
    chatType: ChatType,
    chatId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    const key = chatType === 'global' ? 'global' : chatId;
    const list = store.getMessages()[key];
    const msg = list?.find((m) => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) msg.reactions[emoji] = {};

      if (msg.reactions[emoji][userId]) {
        delete msg.reactions[emoji][userId];
        if (Object.keys(msg.reactions[emoji]).length === 0) {
          delete msg.reactions[emoji];
        }
      } else {
        msg.reactions[emoji][userId] = true;
      }
      store.save();
      bus.emit(`messages_${key}`, messageId);
    }
  }

  async markMessagesAsRead(chatType: ChatType, chatId: string, readerUid: string): Promise<void> {
    const key = chatType === 'global' ? 'global' : chatId;
    const list = store.getMessages()[key];
    let changed = false;
    list?.forEach((msg) => {
      if (!msg.readBy) msg.readBy = {};
      if (!msg.readBy[readerUid]) {
        msg.readBy[readerUid] = true;
        if (msg.senderId !== readerUid) {
          msg.status = 'read';
        }
        changed = true;
      }
    });

    const userChats = store.getUserChats()[readerUid];
    if (userChats && userChats[chatId]) {
      userChats[chatId].unreadCount = 0;
      userChats[chatId].hasMention = false;
      changed = true;
    }

    if (changed) {
      store.save();
      bus.emit(`messages_${key}`, 'read');
      bus.emit('user_chats_updated', readerUid);
    }
  }

  async clearChatHistory(chatType: ChatType, chatId: string): Promise<void> {
    const key = `${chatType}_${chatId}`;
    store.getMessages()[key] = [];
    store.save();
    bus.emit(`messages_${key}`, []);
  }

  async deletePersonalChat(uid: string, partnerUid: string): Promise<void> {
    const chatId = getPersonalChatId(uid, partnerUid);
    if (store.getUserChats()[uid]?.[chatId]) {
      delete store.getUserChats()[uid][chatId];
      store.save();
      bus.emit('user_chats_updated', uid);
    }
  }

  async togglePinChat(uid: string, chatId: string, isPinned: boolean): Promise<void> {
    const userChats = store.getUserChats()[uid];
    if (userChats && userChats[chatId]) {
      userChats[chatId].isPinned = isPinned;
      store.save();
      bus.emit('user_chats_updated', uid);
    }
  }

  subscribeToTyping(typingKey: string, callback: (typingUsers: string[]) => void): () => void {
    return bus.subscribe<string[]>(`typing_${typingKey}`, callback);
  }

  async setTypingStatus(typingKey: string, uid: string, isTyping: boolean): Promise<void> {
    const user = store.getUsers()[uid];
    if (!user) return;
    const active = isTyping ? [user.displayName || user.username] : [];
    bus.emit(`typing_${typingKey}`, active);
  }
}

export class MockGroupRepository implements IGroupRepository {
  subscribeToGroup(groupId: string, callback: (group: GroupWithMembers | null) => void): () => void {
    callback(store.getGroups()[groupId] || null);
    return bus.subscribe('groups_updated', () => {
      callback(store.getGroups()[groupId] || null);
    });
  }

  async getGroup(groupId: string): Promise<GroupWithMembers | null> {
    return store.getGroups()[groupId] || null;
  }

  async getGroupByUsername(username: string): Promise<GroupWithMembers | null> {
    const clean = username.toLowerCase().replace(/^@/, '');
    return Object.values(store.getGroups()).find((g) => g.username?.toLowerCase() === clean) || null;
  }

  async createGroup(
    data: Omit<GroupMetadata, 'id' | 'createdAt'>,
    creator: UserProfile
  ): Promise<string> {
    const groupId = 'group-' + Math.random().toString(36).substring(2, 9);
    const now = Date.now();
    const newGroup: GroupWithMembers = {
      ...data,
      id: groupId,
      createdAt: now,
      memberCount: 1,
      lastMessageTimestamp: now,
      lastMessageSnippet: `${creator.displayName}: Group created`,
      members: { [creator.uid]: true },
      requests: {},
    };

    store.getGroups()[groupId] = newGroup;
    const userChats = store.getUserChats();
    if (!userChats[creator.uid]) userChats[creator.uid] = {};
    userChats[creator.uid][groupId] = {
      chatId: groupId,
      type: 'group',
      lastMessageTimestamp: now,
      lastMessageSnippet: `${creator.displayName}: Group created`,
      unreadCount: 0,
      hasMention: false,
    };

    store.save();
    bus.emit('groups_updated', store.getGroups());
    bus.emit('user_chats_updated', creator.uid);
    return groupId;
  }

  async joinPublicGroup(groupId: string, user: UserProfile): Promise<void> {
    const group = store.getGroups()[groupId];
    if (!group) throw new Error('Group not found');
    group.members[user.uid] = true;
    group.memberCount = Object.keys(group.members).length;

    const userChats = store.getUserChats();
    if (!userChats[user.uid]) userChats[user.uid] = {};
    userChats[user.uid][groupId] = {
      chatId: groupId,
      type: 'group',
      lastMessageTimestamp: Date.now(),
      lastMessageSnippet: `${user.displayName}: Joined group`,
      unreadCount: 0,
    };

    store.save();
    bus.emit('groups_updated', store.getGroups());
    bus.emit('user_chats_updated', user.uid);
  }

  async requestJoinPrivateGroup(groupId: string, uid: string): Promise<void> {
    const group = store.getGroups()[groupId];
    if (!group) throw new Error('Group not found');
    if (!group.requests) group.requests = {};
    group.requests[uid] = Date.now();
    store.save();
    bus.emit(`group_requests_${groupId}`, this.getRequestsList(group));
  }

  async acceptJoinRequest(groupId: string, targetUid: string): Promise<void> {
    const group = store.getGroups()[groupId];
    if (!group) throw new Error('Group not found');
    delete group.requests?.[targetUid];
    group.members[targetUid] = true;
    group.memberCount = Object.keys(group.members).length;

    const user = store.getUsers()[targetUid];
    const userChats = store.getUserChats();
    if (!userChats[targetUid]) userChats[targetUid] = {};
    userChats[targetUid][groupId] = {
      chatId: groupId,
      type: 'group',
      lastMessageTimestamp: Date.now(),
      lastMessageSnippet: `${user?.displayName || 'User'}: Joined group`,
      unreadCount: 0,
    };

    store.save();
    bus.emit('groups_updated', store.getGroups());
    bus.emit(`group_requests_${groupId}`, this.getRequestsList(group));
    bus.emit('user_chats_updated', targetUid);
  }

  async rejectJoinRequest(groupId: string, targetUid: string): Promise<void> {
    const group = store.getGroups()[groupId];
    if (!group) return;
    delete group.requests?.[targetUid];
    store.save();
    bus.emit(`group_requests_${groupId}`, this.getRequestsList(group));
  }

  subscribeToGroupRequests(
    groupId: string,
    callback: (requests: GroupJoinRequest[]) => void
  ): () => void {
    const group = store.getGroups()[groupId];
    callback(group ? this.getRequestsList(group) : []);
    return bus.subscribe<GroupJoinRequest[]>(`group_requests_${groupId}`, callback);
  }

  private getRequestsList(group: GroupWithMembers): GroupJoinRequest[] {
    const users = store.getUsers();
    return Object.entries(group.requests || {}).map(([uid, timestamp]) => ({
      uid,
      timestamp,
      user: users[uid],
    }));
  }

  async leaveGroup(groupId: string, uid: string): Promise<void> {
    const group = store.getGroups()[groupId];
    if (group) {
      delete group.members[uid];
      group.memberCount = Object.keys(group.members).length;
    }
    delete store.getUserChats()[uid]?.[groupId];
    store.save();
    bus.emit('groups_updated', store.getGroups());
    bus.emit('user_chats_updated', uid);
  }

  async deleteGroup(groupId: string): Promise<void> {
    delete store.getGroups()[groupId];
    delete store.getMessages()[groupId];
    const userChats = store.getUserChats();
    Object.keys(userChats).forEach((uid) => {
      delete userChats[uid][groupId];
    });
    store.save();
    bus.emit('groups_updated', store.getGroups());
    bus.emit('user_chats_updated', 'all');
  }

  async updateGroup(
    groupId: string,
    data: Partial<Pick<GroupMetadata, 'name' | 'icon' | 'avatarUrl' | 'description' | 'type' | 'username'>>
  ): Promise<void> {
    const grp = store.getGroups()[groupId];
    if (grp) {
      Object.assign(grp, data);
      store.save();
      bus.emit('groups_updated', store.getGroups());
    }
  }
}

export class MockSignalingService implements ISignalingService {
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('funchat_webrtc_signaling');
        this.channel.onmessage = (event) => {
          const payload = event.data as SignalingPayload;
          if (payload && payload.receiverId) {
            bus.emit(`signal_${payload.receiverId}`, payload);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported in this environment', e);
      }
    }
  }

  async sendSignal(payload: SignalingPayload): Promise<void> {
    // Deliver locally within same window/tab
    bus.emit(`signal_${payload.receiverId}`, payload);
    // Deliver across tabs via BroadcastChannel
    try {
      this.channel?.postMessage(payload);
    } catch (e) {
      console.warn('BroadcastChannel postMessage failed:', e);
    }
  }

  subscribeToSignals(userId: string, callback: (signal: SignalingPayload) => void): () => void {
    return bus.subscribe<SignalingPayload>(`signal_${userId}`, callback);
  }
}

// Singletons
export const authService = new MockAuthService();
export const userRepository = new MockUserRepository();
export const chatRepository = new MockChatRepository();
export const groupRepository = new MockGroupRepository();
export const signalingService = new MockSignalingService();
