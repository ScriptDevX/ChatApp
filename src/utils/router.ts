import { ChatType } from '../types';
import { getPersonalChatId } from './index';

export interface RouteState {
  tab: 'groups' | 'personal';
  chat: { type: ChatType; id: string } | null;
  joinGroupId?: string;
  targetUsername?: string;
  targetGroupUsername?: string;
}

export function getChatPath(
  type: ChatType,
  id: string,
  currentUid?: string,
  identifier?: string
): string {
  if (type === 'global') return '/chat/global';
  if (type === 'group') {
    const target = identifier ? identifier.replace(/^@/, '') : id;
    return `/chat/group/${encodeURIComponent(target)}`;
  }
  if (type === 'personal') {
    if (identifier) {
      return `/chat/user/${encodeURIComponent(identifier.replace(/^@/, ''))}`;
    }
    const partnerUid = currentUid && id.includes('_')
      ? id.split('_').find((part) => part !== currentUid) || id
      : id;
    return `/chat/user/${encodeURIComponent(partnerUid)}`;
  }
  return '/';
}

export function parseRoute(pathname: string, search: string, currentUid?: string): RouteState {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);
  const joinParam = searchParams.get('join');

  if (joinParam) {
    return { tab: 'groups', chat: null, joinGroupId: joinParam };
  }

  const joinMatch = cleanPath.match(/^\/join\/([^/]+)$/);
  if (joinMatch) {
    return { tab: 'groups', chat: null, joinGroupId: decodeURIComponent(joinMatch[1]) };
  }

  if (cleanPath === '/chat/global' || cleanPath === '/c/global') {
    return { tab: 'groups', chat: { type: 'global', id: 'global' } };
  }

  const groupMatch = cleanPath.match(/^\/(?:chat|c)\/group\/([^/]+)$/);
  if (groupMatch) {
    const raw = decodeURIComponent(groupMatch[1]);
    // If it looks like a Firebase key (e.g. starts with '-' or long key), treat directly as group id
    if (raw.startsWith('-') || raw.length > 22) {
      return { tab: 'groups', chat: { type: 'group', id: raw } };
    }
    return { tab: 'groups', chat: { type: 'group', id: raw }, targetGroupUsername: raw };
  }

  const userMatch = cleanPath.match(/^\/(?:chat|c)\/(?:user|p)\/([^/]+)$/);
  if (userMatch) {
    const rawId = decodeURIComponent(userMatch[1]);
    if (rawId.includes('_')) {
      return { tab: 'personal', chat: { type: 'personal', id: rawId } };
    }
    // If 28 chars with mixed case/digits and no underscores, could be direct UID
    const chatId = currentUid ? getPersonalChatId(currentUid, rawId) : rawId;
    return {
      tab: 'personal',
      chat: { type: 'personal', id: chatId },
      targetUsername: rawId.replace(/^@/, ''),
    };
  }

  if (cleanPath === '/personal' || cleanPath === '/p') {
    return { tab: 'personal', chat: null };
  }

  return { tab: 'groups', chat: null };
}
