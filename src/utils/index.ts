import { AVATAR_COLORS, USERNAME_REGEX, GROUP_USERNAME_REGEX } from '../constants';

export function getProfileIconDetails(name?: string, uniqueId?: string): { initials: string; color: string } {
  const cleanName = (name || '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  let initials = '?';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = parts[0].substring(0, 2).toUpperCase();
  }

  const idToUse = uniqueId || cleanName || 'default';
  let colorIndex = 0;
  for (let i = 0; i < idToUse.length; i++) {
    colorIndex = (colorIndex + idToUse.charCodeAt(i)) % AVATAR_COLORS.length;
  }

  return {
    initials: initials || '?',
    color: AVATAR_COLORS[colorIndex],
  };
}

export function getGroupIconColor(iconClass?: string, uniqueId?: string): string {
  const idToUse = uniqueId || iconClass || 'group';
  let colorIndex = 0;
  for (let i = 0; i < idToUse.length; i++) {
    colorIndex = (colorIndex + idToUse.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[colorIndex];
}

export function getPersonalChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

export function isValidGroupUsername(username: string): boolean {
  if (!username) return true;
  return GROUP_USERNAME_REGEX.test(username);
}

export function formatTimestamp(ts?: number | null): string {
  if (!ts || typeof ts !== 'number') return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - startOfMsgDay) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function formatMessageTimestamp(ts?: number | null): string {
  if (!ts || typeof ts !== 'number') return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDateSeparator(ts?: number | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - startOfMsgDay) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function isSingleEmoji(text?: string): boolean {
  if (!text) return false;
  const clean = text.trim();
  // Match single emoji character or emoji sequence
  const singleEmojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})$/u;
  return singleEmojiRegex.test(clean);
}

export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}
