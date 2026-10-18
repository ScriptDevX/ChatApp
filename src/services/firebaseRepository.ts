import {
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  deleteUser,
} from 'firebase/auth';
import {
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  onDisconnect,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  equalTo,
  endAt,
} from 'firebase/database';
import { auth, db, googleProvider } from './firebase';
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
import { getPersonalChatId, getProfileIconDetails } from '../utils';

function cleanFirebaseObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as any;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanFirebaseObject) as any;

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = cleanFirebaseObject(val);
    }
  }
  return clean as any;
}

export class FirebaseAuthService implements IAuthService {
  private currentUser: UserProfile | null = null;
  private authListeners: Set<(user: UserProfile | null) => void> = new Set();

  constructor() {
    try {
      const cached = localStorage.getItem('funchat_cached_user');
      if (cached) {
        this.currentUser = JSON.parse(cached);
      }
    } catch {}
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    this.authListeners.add(callback);

    // If we have a cached user, provide it immediately to avoid login flash
    if (this.currentUser) {
      callback(this.currentUser);
    }

    const unsub = onFirebaseAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        this.currentUser = null;
        try {
          localStorage.removeItem('funchat_cached_user');
        } catch {}
        this.authListeners.forEach((cb) => cb(null));
        return;
      }

      // Fetch user profile from Realtime Database
      try {
        const userRef = ref(db, `users/${fbUser.uid}`);
        const snap = await get(userRef);

        const photoURL =
          fbUser.photoURL ||
          fbUser.providerData?.find((p) => p.photoURL)?.photoURL ||
          undefined;

        if (snap.exists()) {
          const profile = snap.val() as UserProfile;
          if (photoURL && profile.avatarUrl !== photoURL) {
            profile.avatarUrl = photoURL;
            update(userRef, { avatarUrl: photoURL }).catch(() => {});
          }
          this.currentUser = profile;
          try {
            localStorage.setItem('funchat_cached_user', JSON.stringify(profile));
          } catch {}
          this.authListeners.forEach((cb) => cb(profile));
        } else {
          // Brand new user from Google: create default profile WITHOUT username set
          const iconDetails = getProfileIconDetails(fbUser.displayName || 'User', fbUser.uid);

          const newProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            username: '',
            displayName: fbUser.displayName || 'User',
            avatarUrl: photoURL,
            avatarColor: iconDetails.color,
            initials: iconDetails.initials,
            createdAt: Date.now(),
            hasSetUsername: false,
            status: { online: true },
          };

          await set(userRef, newProfile);
          this.currentUser = newProfile;
          try {
            localStorage.setItem('funchat_cached_user', JSON.stringify(newProfile));
          } catch {}
          this.authListeners.forEach((cb) => cb(newProfile));
        }

        // Set presence
        this.setupPresence(fbUser.uid);
      } catch (err) {
        console.error('Error in onAuthStateChanged:', err);
        this.authListeners.forEach((cb) => cb(null));
      }
    });

    return () => {
      this.authListeners.delete(callback);
      unsub();
    };
  }

  private setupPresence(uid: string) {
    const statusRef = ref(db, `users/${uid}/status`);
    const connectedRef = ref(db, '.info/connected');

    set(statusRef, {
      online: true,
      lastSeen: serverTimestamp(),
    }).catch(() => {});

    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(statusRef).set({
          online: false,
          lastSeen: serverTimestamp(),
        });
        set(statusRef, {
          online: true,
          lastSeen: serverTimestamp(),
        });
      }
    });
  }

  async loginWithGoogle(): Promise<UserProfile> {
    let fbUser;
    const bridge = typeof window !== 'undefined' ? (window as unknown as { AndroidBridge?: { startGoogleSignIn?: () => void } }).AndroidBridge : undefined;

    if (bridge?.startGoogleSignIn) {
      fbUser = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          reject(new Error('Google sign-in cancelled or timed out'));
        }, 90000);

        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === 'NATIVE_GOOGLE_AUTH_TOKEN' && event.data.idToken) {
            clearTimeout(timeout);
            window.removeEventListener('message', handleMessage);
            try {
              const credential = GoogleAuthProvider.credential(event.data.idToken);
              const res = await signInWithCredential(auth, credential);
              resolve(res.user);
            } catch (err) {
              reject(err);
            }
          } else if (event.data?.type === 'NATIVE_GOOGLE_AUTH_ERROR') {
            clearTimeout(timeout);
            window.removeEventListener('message', handleMessage);
            reject(new Error(event.data.error || 'Google sign-in failed'));
          }
        };

        window.addEventListener('message', handleMessage);
        bridge.startGoogleSignIn!();
      });
    } else {
      const res = await signInWithPopup(auth, googleProvider);
      fbUser = res.user;
    }

    const photoURL =
      fbUser.photoURL ||
      fbUser.providerData?.find((p: { photoURL?: string | null }) => p.photoURL)?.photoURL ||
      undefined;

    const userRef = ref(db, `users/${fbUser.uid}`);
    const snap = await get(userRef);

    if (snap.exists()) {
      const profile = snap.val() as UserProfile;
      if (photoURL && profile.avatarUrl !== photoURL) {
        profile.avatarUrl = photoURL;
        await update(userRef, { avatarUrl: photoURL });
      }
      this.currentUser = profile;
      try {
        localStorage.setItem('funchat_cached_user', JSON.stringify(profile));
      } catch {}
      this.setupPresence(fbUser.uid);
      return profile;
    }

    const iconDetails = getProfileIconDetails(fbUser.displayName || 'User', fbUser.uid);

    const newProfile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || '',
      username: '',
      displayName: fbUser.displayName || 'User',
      avatarUrl: photoURL,
      avatarColor: iconDetails.color,
      initials: iconDetails.initials,
      createdAt: Date.now(),
      hasSetUsername: false,
      status: { online: true },
    };

    await set(userRef, newProfile);
    this.currentUser = newProfile;
    try {
      localStorage.setItem('funchat_cached_user', JSON.stringify(newProfile));
    } catch {}
    this.setupPresence(fbUser.uid);
    return newProfile;
  }

  async logout(): Promise<void> {
    if (this.currentUser) {
      const statusRef = ref(db, `users/${this.currentUser.uid}/status`);
      await set(statusRef, {
        online: false,
        lastSeen: serverTimestamp(),
      });
    }
    try {
      localStorage.removeItem('funchat_cached_user');
    } catch {}
    await signOut(auth);
    this.currentUser = null;
  }

  async setupProfile(uid: string, username: string, displayName: string): Promise<UserProfile> {
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, {
      username: cleanUsername,
      displayName,
      hasSetUsername: true,
    });
    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        username: cleanUsername,
        displayName,
        hasSetUsername: true,
      };
      try {
        localStorage.setItem('funchat_cached_user', JSON.stringify(this.currentUser));
      } catch {}
      this.authListeners.forEach((cb) => cb(this.currentUser));
    }
    return this.currentUser!;
  }

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, data);
    if (this.currentUser) {
      Object.assign(this.currentUser, data);
      try {
        localStorage.setItem('funchat_cached_user', JSON.stringify(this.currentUser));
      } catch {}
      this.authListeners.forEach((cb) => cb(this.currentUser));
    }
  }

  async deleteAccount(uid: string): Promise<void> {
    await remove(ref(db, `users/${uid}`));
    await remove(ref(db, `userChats/${uid}`));
    try {
      localStorage.removeItem('funchat_cached_user');
    } catch {}
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }
    this.currentUser = null;
  }
}

export class FirebaseUserRepository implements IUserRepository {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await get(ref(db, `users/${uid}`));
    return snap.exists() ? (snap.val() as UserProfile) : null;
  }

  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const clean = username.toLowerCase().replace(/^@/, '');
    const userQuery = query(ref(db, 'users'), orderByChild('username'), equalTo(clean));
    const snap = await get(userQuery);
    if (snap.exists()) {
      const val = snap.val();
      const firstUid = Object.keys(val)[0];
      return val[firstUid] as UserProfile;
    }
    return null;
  }

  async isUsernameAvailable(username: string, excludeUid?: string): Promise<boolean> {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean) return false;
    const userQuery = query(ref(db, 'users'), orderByChild('username'), equalTo(clean));
    const snap = await get(userQuery);
    if (!snap.exists()) return true;
    const val = snap.val();
    const uids = Object.keys(val);
    if (excludeUid && uids.length === 1 && uids[0] === excludeUid) {
      return true;
    }
    return false;
  }

  subscribeToUsers(callback: (users: Record<string, UserProfile>) => void): () => void {
    const usersRef = ref(db, 'users');
    return onValue(
      usersRef,
      (snap) => {
        callback((snap.val() as Record<string, UserProfile>) || {});
      },
      (err) => {
        console.warn('Firebase subscribeToUsers error:', err);
      }
    );
  }

  async setUserPresence(uid: string, online: boolean): Promise<void> {
    const statusRef = ref(db, `users/${uid}/status`);
    await set(statusRef, {
      online,
      lastSeen: serverTimestamp(),
    });
  }

  async blockUser(currentUid: string, targetUid: string): Promise<void> {
    const blockRef = ref(db, `users/${currentUid}/blockedUsers/${targetUid}`);
    await set(blockRef, true);
  }

  async unblockUser(currentUid: string, targetUid: string): Promise<void> {
    const blockRef = ref(db, `users/${currentUid}/blockedUsers/${targetUid}`);
    await remove(blockRef);
  }

  async updatePrivacySettings(uid: string, settings: import('../types').UserPrivacySettings): Promise<void> {
    const privacyRef = ref(db, `users/${uid}/privacySettings`);
    await set(privacyRef, settings);
  }

  async updateFcmToken(uid: string, token: string): Promise<void> {
    const tokenRef = ref(db, `users/${uid}/fcmToken`);
    await set(tokenRef, token);
  }
}

export class FirebaseChatRepository implements IChatRepository {
  subscribeToUserChats(uid: string, callback: (chats: Record<string, UserChatMeta>) => void): () => void {
    const userChatsRef = ref(db, `userChats/${uid}`);
    return onValue(userChatsRef, (snap) => {
      callback((snap.val() as Record<string, UserChatMeta>) || {});
    });
  }

  subscribeToMessages(
    chatType: ChatType,
    chatId: string,
    limit: number,
    callback: (messages: Message[]) => void
  ): () => void {
    const path =
      chatType === 'global'
        ? 'globalMessages'
        : chatType === 'group'
        ? `groupMessages/${chatId}`
        : `personalChats/${chatId}/messages`;

    const msgQuery = query(ref(db, path), orderByChild('timestamp'), limitToLast(limit));
    return onValue(msgQuery, (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const list: Message[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, ...child.val() });
      });
      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      callback(list);
    });
  }

  async loadOlderMessages(
    chatType: ChatType,
    chatId: string,
    beforeTimestamp: number,
    limit: number
  ): Promise<Message[]> {
    const path =
      chatType === 'global'
        ? 'globalMessages'
        : chatType === 'group'
        ? `groupMessages/${chatId}`
        : `personalChats/${chatId}/messages`;

    const msgQuery = query(
      ref(db, path),
      orderByChild('timestamp'),
      endAt(beforeTimestamp - 1),
      limitToLast(limit)
    );
    const snap = await get(msgQuery);
    if (!snap.exists()) return [];

    const list: Message[] = [];
    snap.forEach((child) => {
      list.push({ id: child.key!, ...child.val() });
    });
    list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return list;
  }

  async sendMessage(params: {
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
  }): Promise<string> {
    const path =
      params.chatType === 'global'
        ? 'globalMessages'
        : params.chatType === 'group'
        ? `groupMessages/${params.chatId}`
        : `personalChats/${params.chatId}/messages`;

    const newMsgRef = push(ref(db, path));
    const messageId = newMsgRef.key!;

    const newMsg: Record<string, any> = {
      id: messageId,
      senderId: params.senderId,
      senderName: params.senderName,
      type: params.type,
      timestamp: Date.now(),
      readBy: { [params.senderId]: true },
      status: 'sent',
    };
    if (params.senderUsername) newMsg.senderUsername = params.senderUsername;
    if (params.text) newMsg.text = params.text;
    if (params.stickerUrl) newMsg.stickerUrl = params.stickerUrl;
    if (params.imageUrl) newMsg.imageUrl = params.imageUrl;
    if (params.fileUrl) newMsg.fileUrl = params.fileUrl;
    if (params.fileName) newMsg.fileName = params.fileName;
    if (params.fileSize) newMsg.fileSize = params.fileSize;
    if (params.fileContent) newMsg.fileContent = params.fileContent;
    if (params.replyTo) newMsg.replyTo = params.replyTo;
    if (params.mentions) newMsg.mentions = params.mentions;

    const baseSnippet =
      params.type === 'file'
        ? `Code 📄 ${params.fileName || 'file'}`
        : params.type === 'sticker'
        ? 'Sticker 🖼️'
        : params.type === 'image'
        ? 'Photo 📷'
        : params.text
        ? params.text.substring(0, 35)
        : '';
    const fullSnippet = `${params.senderName}: ${baseSnippet}`;
    const timestamp = Date.now();

    const updates: Record<string, any> = {};
    updates[`${path}/${messageId}`] = newMsg;

    if (params.chatType === 'personal') {
      const parts = params.chatId.split('_');
      const partnerUid = parts.find((p) => p !== params.senderId) || parts[0];

      updates[`userChats/${params.senderId}/${params.chatId}`] = {
        chatId: params.chatId,
        type: 'personal',
        lastMessageTimestamp: timestamp,
        lastMessageSnippet: fullSnippet,
        unreadCount: 0,
        hasMention: false,
      };

      // Partner chat meta
      const partnerChatRef = ref(db, `userChats/${partnerUid}/${params.chatId}`);
      const partnerChatSnap = await get(partnerChatRef);
      const prevUnread = partnerChatSnap.exists() ? partnerChatSnap.val().unreadCount || 0 : 0;
      const hasMention = !!(params.mentions && Object.values(params.mentions).includes(partnerUid));

      updates[`userChats/${partnerUid}/${params.chatId}`] = {
        chatId: params.chatId,
        type: 'personal',
        lastMessageTimestamp: timestamp,
        lastMessageSnippet: fullSnippet,
        unreadCount: prevUnread + 1,
        hasMention,
      };
    } else if (params.chatType === 'group') {
      const membersSnap = await get(ref(db, `groups/${params.chatId}/members`));
      if (membersSnap.exists()) {
        const members = membersSnap.val() as Record<string, boolean>;
        for (const memberId of Object.keys(members)) {
          const userChatRef = ref(db, `userChats/${memberId}/${params.chatId}`);
          const userChatSnap = await get(userChatRef);
          const prevUnread = userChatSnap.exists() ? userChatSnap.val().unreadCount || 0 : 0;
          const unread = memberId === params.senderId ? 0 : prevUnread + 1;
          const hasMention = !!(params.mentions && Object.values(params.mentions).includes(memberId));

          updates[`userChats/${memberId}/${params.chatId}`] = {
            chatId: params.chatId,
            type: 'group',
            lastMessageTimestamp: timestamp,
            lastMessageSnippet: fullSnippet,
            unreadCount: unread,
            hasMention,
          };
        }
      }
      updates[`groups/${params.chatId}/metadata/lastMessageTimestamp`] = timestamp;
      updates[`groups/${params.chatId}/metadata/lastMessageSnippet`] = fullSnippet;
    }

    await update(ref(db), updates);
    return messageId;
  }

  async updateMessage(
    chatType: ChatType,
    chatId: string,
    messageId: string,
    updates: Partial<Message>
  ): Promise<void> {
    const path =
      chatType === 'global'
        ? `globalMessages/${messageId}`
        : chatType === 'group'
        ? `groupMessages/${chatId}/${messageId}`
        : `personalChats/${chatId}/messages/${messageId}`;

    await update(ref(db, path), updates);
  }

  async editMessage(
    chatType: ChatType,
    chatId: string,
    messageId: string,
    text: string,
    mentions?: Record<string, string> | null
  ): Promise<void> {
    const messagesPath =
      chatType === 'global'
        ? 'globalMessages'
        : chatType === 'group'
        ? `groupMessages/${chatId}`
        : `personalChats/${chatId}/messages`;

    const itemPath = chatType === 'global' ? `globalMessages/${messageId}` : `${messagesPath}/${messageId}`;

    await update(ref(db, itemPath), {
      text,
      mentions: mentions || null,
      lastEdited: Date.now(),
    });

    if (chatType === 'personal' || chatType === 'group') {
      const q = query(ref(db, messagesPath), orderByChild('timestamp'), limitToLast(1));
      const snap = await get(q);
      if (snap.exists()) {
        let isLatest = false;
        let latestMsg: any = null;
        snap.forEach((child) => {
          if (child.key === messageId) {
            isLatest = true;
            latestMsg = child.val();
          }
        });

        if (isLatest && latestMsg) {
          const baseSnippet = text ? text.substring(0, 35) : '';
          const fullSnippet = `${latestMsg.senderName}: ${baseSnippet}`;
          const updates: Record<string, any> = {};

          if (chatType === 'personal') {
            const parts = chatId.split('_');
            parts.forEach((uid) => {
              updates[`userChats/${uid}/${chatId}/lastMessageSnippet`] = fullSnippet;
            });
          } else {
            const membersSnap = await get(ref(db, `groups/${chatId}/members`));
            if (membersSnap.exists()) {
              const members = membersSnap.val() as Record<string, boolean>;
              for (const memberId of Object.keys(members)) {
                updates[`userChats/${memberId}/${chatId}/lastMessageSnippet`] = fullSnippet;
              }
            }
            updates[`groups/${chatId}/metadata/lastMessageSnippet`] = fullSnippet;
          }
          await update(ref(db), cleanFirebaseObject(updates));
        }
      }
    }
  }

  async deleteMessage(chatType: ChatType, chatId: string, messageId: string): Promise<void> {
    const messagesPath =
      chatType === 'global'
        ? 'globalMessages'
        : chatType === 'group'
        ? `groupMessages/${chatId}`
        : `personalChats/${chatId}/messages`;

    const itemPath = chatType === 'global' ? `globalMessages/${messageId}` : `${messagesPath}/${messageId}`;
    await remove(ref(db, itemPath));

    if (chatType === 'personal') {
      const q = query(ref(db, messagesPath), orderByChild('timestamp'), limitToLast(1));
      const snap = await get(q);
      let latestSnippet = '';
      let latestTime = Date.now();
      if (snap.exists()) {
        snap.forEach((child) => {
          const m = child.val();
          const base =
            m.type === 'sticker'
              ? 'Sticker 🖼️'
              : m.type === 'image'
              ? 'Photo 📷'
              : m.text
              ? m.text.substring(0, 35)
              : '';
          latestSnippet = `${m.senderName}: ${base}`;
          latestTime = m.timestamp || Date.now();
        });
      }

      const parts = chatId.split('_');
      const updates: Record<string, any> = {};
      parts.forEach((uid) => {
        updates[`userChats/${uid}/${chatId}/lastMessageSnippet`] = latestSnippet;
        updates[`userChats/${uid}/${chatId}/lastMessageTimestamp`] = latestTime;
      });
      await update(ref(db), cleanFirebaseObject(updates));
    } else if (chatType === 'group') {
      const q = query(ref(db, messagesPath), orderByChild('timestamp'), limitToLast(1));
      const snap = await get(q);
      let latestSnippet = 'Group created';
      let latestTime = Date.now();
      if (snap.exists()) {
        snap.forEach((child) => {
          const m = child.val();
          const base =
            m.type === 'sticker'
              ? 'Sticker 🖼️'
              : m.type === 'image'
              ? 'Photo 📷'
              : m.text
              ? m.text.substring(0, 35)
              : '';
          latestSnippet = `${m.senderName}: ${base}`;
          latestTime = m.timestamp || Date.now();
        });
      }

      const membersSnap = await get(ref(db, `groups/${chatId}/members`));
      const updates: Record<string, any> = {};
      if (membersSnap.exists()) {
        const members = membersSnap.val() as Record<string, boolean>;
        for (const memberId of Object.keys(members)) {
          updates[`userChats/${memberId}/${chatId}/lastMessageSnippet`] = latestSnippet;
          updates[`userChats/${memberId}/${chatId}/lastMessageTimestamp`] = latestTime;
        }
      }
      updates[`groups/${chatId}/metadata/lastMessageSnippet`] = latestSnippet;
      updates[`groups/${chatId}/metadata/lastMessageTimestamp`] = latestTime;
      await update(ref(db), cleanFirebaseObject(updates));
    }
  }

  async deleteMessages(chatType: ChatType, chatId: string, messageIds: string[]): Promise<void> {
    for (const id of messageIds) {
      await this.deleteMessage(chatType, chatId, id);
    }
  }

  async toggleReaction(
    chatType: ChatType,
    chatId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    const path =
      chatType === 'global'
        ? `globalMessages/${messageId}/reactions/${emoji}/${userId}`
        : chatType === 'group'
        ? `groupMessages/${chatId}/${messageId}/reactions/${emoji}/${userId}`
        : `personalChats/${chatId}/messages/${messageId}/reactions/${emoji}/${userId}`;

    const snap = await get(ref(db, path));
    if (snap.exists()) {
      await remove(ref(db, path));
    } else {
      await set(ref(db, path), true);
    }
  }

  async markMessagesAsRead(chatType: ChatType, chatId: string, readerUid: string): Promise<void> {
    try {
      const messagesPath =
        chatType === 'personal'
          ? `personalChats/${chatId}/messages`
          : chatType === 'group'
          ? `groupMessages/${chatId}`
          : `globalMessages`;

      const snap = await get(query(ref(db, messagesPath), limitToLast(30)));
      if (snap.exists()) {
        const updates: Record<string, any> = {};
        snap.forEach((child) => {
          const msg = child.val();
          if (msg && msg.senderId !== readerUid && (!msg.readBy || !msg.readBy[readerUid])) {
            updates[`${messagesPath}/${child.key}/readBy/${readerUid}`] = true;
            updates[`${messagesPath}/${child.key}/status`] = 'read';
          }
        });
        if (chatType !== 'global') {
          updates[`userChats/${readerUid}/${chatId}/unreadCount`] = 0;
          updates[`userChats/${readerUid}/${chatId}/hasMention`] = false;
        }
        if (Object.keys(updates).length > 0) {
          await update(ref(db), cleanFirebaseObject(updates)).catch((err) => {
            console.warn('markMessagesAsRead update warning:', err?.message || err);
          });
        }
      } else if (chatType !== 'global') {
        await update(ref(db, `userChats/${readerUid}/${chatId}`), {
          unreadCount: 0,
          hasMention: false,
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('markMessagesAsRead safe catch:', err);
    }
  }

  async clearChatHistory(chatType: ChatType, chatId: string): Promise<void> {
    const messagesPath =
      chatType === 'personal'
        ? `personalChats/${chatId}/messages`
        : chatType === 'group'
        ? `groupMessages/${chatId}`
        : `globalMessages`;

    await remove(ref(db, messagesPath));

    // Reset last message snippet & timestamp across participants
    if (chatType === 'personal') {
      const parts = chatId.split('_');
      const updates: Record<string, any> = {};
      parts.forEach((uid) => {
        updates[`userChats/${uid}/${chatId}/lastMessageSnippet`] = 'History cleared';
        updates[`userChats/${uid}/${chatId}/lastMessageTimestamp`] = Date.now();
      });
      await update(ref(db), updates);
    } else if (chatType === 'group') {
      const membersSnap = await get(ref(db, `groups/${chatId}/members`));
      const updates: Record<string, any> = {};
      if (membersSnap.exists()) {
        const members = membersSnap.val() as Record<string, boolean>;
        for (const memberId of Object.keys(members)) {
          updates[`userChats/${memberId}/${chatId}/lastMessageSnippet`] = 'History cleared';
          updates[`userChats/${memberId}/${chatId}/lastMessageTimestamp`] = Date.now();
        }
      }
      updates[`groups/${chatId}/metadata/lastMessageSnippet`] = 'History cleared';
      updates[`groups/${chatId}/metadata/lastMessageTimestamp`] = Date.now();
      await update(ref(db), updates);
    }
  }

  async deletePersonalChat(uid: string, partnerUid: string): Promise<void> {
    const chatId = getPersonalChatId(uid, partnerUid);
    await remove(ref(db, `userChats/${uid}/${chatId}`));
  }

  async togglePinChat(uid: string, chatId: string, isPinned: boolean): Promise<void> {
    const chatRef = ref(db, `userChats/${uid}/${chatId}`);
    await update(chatRef, { isPinned });
  }

  subscribeToTyping(typingKey: string, callback: (typingUsers: string[]) => void): () => void {
    const typingRef = ref(db, `typingStatus/${typingKey}`);
    return onValue(typingRef, (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const data = snap.val() as Record<string, { timestamp: number; name: string }>;
      const now = Date.now();
      const typers: string[] = [];
      Object.entries(data).forEach(([_, val]) => {
        if (val && now - val.timestamp < 4000) {
          typers.push(val.name);
        }
      });
      callback(typers);
    });
  }

  async setTypingStatus(typingKey: string, uid: string, isTyping: boolean): Promise<void> {
    const typingUserRef = ref(db, `typingStatus/${typingKey}/${uid}`);
    if (isTyping) {
      const userSnap = await get(ref(db, `users/${uid}`));
      const name = userSnap.exists() ? userSnap.val().displayName : 'Someone';
      await set(typingUserRef, { timestamp: Date.now(), name });
      onDisconnect(typingUserRef).remove();
    } else {
      await remove(typingUserRef);
    }
  }
}

export class FirebaseGroupRepository implements IGroupRepository {
  subscribeToGroup(groupId: string, callback: (group: GroupWithMembers | null) => void): () => void {
    const groupRef = ref(db, `groups/${groupId}`);
    return onValue(
      groupRef,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        const val = snap.val() || {};
        const meta = val.metadata || {};
        const members = val.members || {};
        const requests = val.requests || {};
        callback({
          id: groupId,
          ...meta,
          members,
          requests,
          memberCount: Object.keys(members).length,
        });
      },
      (err) => {
        console.warn(`subscribeToGroup error for ${groupId}:`, err);
      }
    );
  }

  async getGroup(groupId: string): Promise<GroupWithMembers | null> {
    const metaSnap = await get(ref(db, `groups/${groupId}/metadata`));
    if (!metaSnap.exists()) return null;
    const membersSnap = await get(ref(db, `groups/${groupId}/members`));
    const requestsSnap = await get(ref(db, `groups/${groupId}/requests`));

    return {
      id: groupId,
      ...metaSnap.val(),
      members: membersSnap.exists() ? membersSnap.val() : {},
      requests: requestsSnap.exists() ? requestsSnap.val() : {},
      memberCount: membersSnap.exists() ? Object.keys(membersSnap.val()).length : 0,
    };
  }

  async getGroupByUsername(username: string): Promise<GroupWithMembers | null> {
    const clean = username.toLowerCase().replace(/^@/, '');
    const q = query(ref(db, 'groups'), orderByChild('metadata/username'), equalTo(clean));
    const snap = await get(q);
    if (snap.exists()) {
      const groupId = Object.keys(snap.val())[0];
      return this.getGroup(groupId);
    }
    return null;
  }

  async createGroup(
    data: Omit<GroupMetadata, 'id' | 'createdAt'>,
    creator: UserProfile
  ): Promise<string> {
    const newGroupRef = push(ref(db, 'groups'));
    const groupId = newGroupRef.key!;
    const now = Date.now();

    const groupMeta: GroupMetadata = {
      ...data,
      id: groupId,
      createdAt: now,
      memberCount: 1,
      lastMessageTimestamp: now,
      lastMessageSnippet: `${creator.displayName}: Group created`,
    };

    const updates: Record<string, any> = {};
    updates[`groups/${groupId}/metadata`] = groupMeta;
    updates[`groups/${groupId}/members/${creator.uid}`] = true;
    updates[`userChats/${creator.uid}/${groupId}`] = {
      chatId: groupId,
      type: 'group',
      lastMessageTimestamp: now,
      lastMessageSnippet: `${creator.displayName}: Group created`,
      unreadCount: 0,
      hasMention: false,
    };

    await update(ref(db), updates);
    return groupId;
  }

  async joinPublicGroup(groupId: string, user: UserProfile): Promise<void> {
    const updates: Record<string, any> = {};
    const now = Date.now();
    updates[`groups/${groupId}/members/${user.uid}`] = true;
    updates[`userChats/${user.uid}/${groupId}`] = {
      chatId: groupId,
      type: 'group',
      lastMessageTimestamp: now,
      lastMessageSnippet: `${user.displayName}: Joined group`,
      unreadCount: 0,
      hasMention: false,
    };

    await update(ref(db), updates);
  }

  async requestJoinPrivateGroup(groupId: string, uid: string): Promise<void> {
    await set(ref(db, `groups/${groupId}/requests/${uid}`), Date.now());
  }

  async acceptJoinRequest(groupId: string, targetUid: string): Promise<void> {
    const userSnap = await get(ref(db, `users/${targetUid}`));
    const user = userSnap.exists() ? (userSnap.val() as UserProfile) : null;
    const now = Date.now();

    const updates: Record<string, any> = {};
    updates[`groups/${groupId}/members/${targetUid}`] = true;
    updates[`groups/${groupId}/requests/${targetUid}`] = null;
    updates[`userChats/${targetUid}/${groupId}`] = {
      chatId: groupId,
      type: 'group',
      lastMessageTimestamp: now,
      lastMessageSnippet: `${user?.displayName || 'User'}: Joined group`,
      unreadCount: 0,
      hasMention: false,
    };

    await update(ref(db), updates);
  }

  async rejectJoinRequest(groupId: string, targetUid: string): Promise<void> {
    await remove(ref(db, `groups/${groupId}/requests/${targetUid}`));
  }

  subscribeToGroupRequests(
    groupId: string,
    callback: (requests: GroupJoinRequest[]) => void
  ): () => void {
    const reqRef = ref(db, `groups/${groupId}/requests`);
    return onValue(reqRef, async (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const data = snap.val() as Record<string, number>;
      const list: GroupJoinRequest[] = [];
      for (const [uid, timestamp] of Object.entries(data)) {
        const uSnap = await get(ref(db, `users/${uid}`));
        list.push({
          uid,
          timestamp,
          user: uSnap.exists() ? uSnap.val() : undefined,
        });
      }
      callback(list);
    });
  }

  async leaveGroup(groupId: string, uid: string): Promise<void> {
    await remove(ref(db, `groups/${groupId}/members/${uid}`));
    await remove(ref(db, `userChats/${uid}/${groupId}`));
  }

  async deleteGroup(groupId: string): Promise<void> {
    const membersSnap = await get(ref(db, `groups/${groupId}/members`));
    const updates: Record<string, any> = {};
    updates[`groups/${groupId}`] = null;
    updates[`groupMessages/${groupId}`] = null;

    if (membersSnap.exists()) {
      Object.keys(membersSnap.val()).forEach((uid) => {
        updates[`userChats/${uid}/${groupId}`] = null;
      });
    }
    await update(ref(db), updates);
  }

  async updateGroup(
    groupId: string,
    data: Partial<Pick<GroupMetadata, 'name' | 'icon' | 'avatarUrl' | 'description' | 'type' | 'username'>>
  ): Promise<void> {
    const updates: Record<string, any> = {};
    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined) {
        updates[`groups/${groupId}/metadata/${key}`] = val;
      }
    });
    await update(ref(db), updates);
  }
}

export class FirebaseSignalingService implements ISignalingService {
  async sendSignal(payload: SignalingPayload): Promise<void> {
    const signalRef = push(ref(db, `signaling/${payload.receiverId}`));
    await set(signalRef, cleanFirebaseObject(payload));
  }

  subscribeToSignals(userId: string, callback: (signal: SignalingPayload) => void): () => void {
    const userSignalsRef = ref(db, `signaling/${userId}`);
    return onValue(userSignalsRef, (snap) => {
      if (!snap.exists()) return;
      snap.forEach((child) => {
        const signal = child.val() as SignalingPayload;
        // Delete signal immediately upon reading so it's not processed multiple times
        remove(ref(db, `signaling/${userId}/${child.key}`)).catch(() => {});
        callback(signal);
      });
    });
  }
}

export const systemConfigService = {
  subscribeToSystemConfig(
    callback: (
      config: {
        maintenance?: boolean;
        message?: string;
        allowedUsers?: Record<string, boolean>;
        admins?: Record<string, boolean>;
      } | null
    ) => void
  ): () => void {
    const configRef = ref(db, 'systemConfig');
    return onValue(
      configRef,
      (snap) => {
        callback(snap.val());
      },
      (err) => {
        console.warn('System config subscribe error:', err);
      }
    );
  },
  async getSystemConfig(): Promise<{
    maintenance?: boolean;
    message?: string;
    allowedUsers?: Record<string, boolean>;
    admins?: Record<string, boolean>;
  } | null> {
    const snap = await get(ref(db, 'systemConfig'));
    return snap.exists() ? snap.val() : null;
  }
};

// Export singletons
export const authService = new FirebaseAuthService();
export const userRepository = new FirebaseUserRepository();
export const chatRepository = new FirebaseChatRepository();
export const groupRepository = new FirebaseGroupRepository();
export const signalingService = new FirebaseSignalingService();
