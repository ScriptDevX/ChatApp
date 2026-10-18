export const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

import { APP_BASE_URL, INVITE_LINK_BASE } from '../config';

export { APP_BASE_URL, INVITE_LINK_BASE };

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,15}$/;
export const GROUP_USERNAME_REGEX = /^[a-zA-Z0-9_]{3,25}$/;
export const MENTION_REGEX = /@([a-zA-Z0-9_]{3,25})/g;
export const MENTION_TRIGGER_REGEX = /(?:^|\s)(@([a-zA-Z0-9_]*))$/;

export const GROUP_ICONS = [
  'fa-users',
  'fa-user-group',
  'fa-comments',
  'fa-comment-dots',
  'fa-gamepad',
  'fa-briefcase',
  'fa-graduation-cap',
  'fa-music',
  'fa-film',
  'fa-futbol',
  'fa-book',
  'fa-code',
  'fa-heart',
  'fa-star',
  'fa-lightbulb',
  'fa-earth-americas',
] as const;

export const STICKER_URLS = [
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm83MWw4N2l0ZzA2d2g2cGVkdzJ2NzdzbXNhY3Q5MHR0b2x0M3F5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/MDJ9IbxxvDUQM/giphy.gif',
  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXdmeW5yYXR2cDZyZnY4emUxMmYybWlmYjFkNGNyaDFhNDM2Z3B4biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/N9DtPOsLaly1qa5XSn/giphy.gif',
  'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHpnZm4xanN6M2xhcG9kemcwMjExNXpjN3N1OHJyNDZmZ2txOG96eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/zIt1sZXSYsPpCIBPkC/giphy.gif',
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWNuZ2RmdGk2Z25ncmV1d3I2YjF5Mzh1OTV0c3d4aXN6N3Bzb2RkcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/SgUtzyd4XKEFZAe7tn/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExamYzM3FxMWx6enQ4eXVtbHNtM3EyMXJpc2VxODJscjY1eHYza2xjcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/rVUgg2B0PPyIq6PQSf/giphy.gif',
  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDhuYjB5YWI3MHpvZWs4cG03NXptMWhvYTQ3cGtkaXRrcml2Y280dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/38md9VwIj0pyAkOmqW/giphy.gif',
  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExaHR6bGZzd3B5bWVxbzBzb2U1Nzc5cmpoY2p4ODQ0czBkYzllYjJkZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/5KY2xbEcF0l5gZ8x2y/giphy.gif',
  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWd1dnRid2ozZjlvcWMweW5mcmE0M3Rta2dvOG02OGRmcjh4NW9lbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/KsBNnlWoxPE0Zdbh6V/giphy.gif',
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3pzcDVhMjNjOHFlZ24wZHZrM2Z5dGx2aHNseHYwOTljeHBzOTEzNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/MXjfhzctIWoObAuATS/giphy.gif',
  'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3B5Y2tjeXFpaWdqc3BzdzJjdG01MjZyNmRodHdueHo4eWgwbndzNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/khPKs6cZKpO8VSEiH6/giphy.gif',
  'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnUxN2gxZmxwamwxZzI1NWpmbmdhazIxdnRnamZqYzZxbG9uaXV5YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/nFyixvuEJ4WLAPrC4b/giphy.gif',
  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHFndmNmbjM0aGd4Y2t4Y280ZGFwN2NwdXhnb2h5a2RzNTFnM3pqOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/vS8deMiryn69PFGwJQ/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTV1djcyMDV5YzU0ZXh3YXJxdXIwaGF1bGRvNm5jaW10aWozZjBpMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/JVglf7QjxaZZM2tjfB/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbG01amVmd3ByMmFodW5nY2RyOWFjanNyajUxNXQ5NGpwem53YzJ4OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/6Mbgorc9nW6gfoPfWN/giphy.gif',
  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdTAyNHhiN3JxMnh0M2l3bWFwazRmZHJheGM1OW1obmZ1ZGFsYTVtNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/RUMAIJB1bRf9t7h3Pu/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM305OHVudHF4ZXRvbTFocmJzMDdzMnJubHlud2JtMzZsdmsyMGJmYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/artj92V8o75VPL7AeQ/giphy.gif',
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXNsbzVtbGRrMTFxbXVybm43MjFna3ZqdngxMXo3dDN5bG01OHQ3bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/DTSR3Ku7zr2WDqcyTv/giphy.gif',
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2I4YzlrY21xY2l3M25vdzV4ZGM2NmR6eHVsdmQ2dHFvczBhZTU2YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o751POC4lwsnpv6da/giphy.gif',
  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2pld3RrMG9maXVudzNkbW1mMGZiOHlwOW5yZTM3eGl5NXlwazVudCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/qGkk5cqhOwaHQi3HT6/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMG5jbDNsZ2Jpams4bjlqYW81bjlnb2FvbWQ3OXRtZWs5b202bzhqciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/gTtaTV1m4YL3NLMdqN/giphy.gif',
  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExa291dXdrOTNsa2FvMGExcjF2Z2dweDJ4MmE3anhicnZ0djR1azJqYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/aHWiTtOFwvAdw231u4/giphy.gif',
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Y0eXFram82M2RmbHRmNDhueW8zNnVmNGliY3p0OHM2YzcxdW91OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9ZQ/S3nZ8V9uemShxiWX8g/giphy.gif',
  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTcxeGhnMWIyNDgwYWNkcmwyYnBnbXl0bXFwZThqOWl3cXFuZWhpdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/JRDUn8vg62ito8gNj5/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGk4dzRxMzMyY2t1anI0ZngzcjluZGttamkwaGFtYWppbms0cnIwcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3MFzCSKzkl0cR3nPxe/giphy.gif',
] as const;

export const AVATAR_COLORS = [
  '#0088cc',
  '#e53935',
  '#43a047',
  '#fb8c00',
  '#8e24aa',
  '#039be5',
  '#fdd835',
  '#3949ab',
  '#d81b60',
  '#5e35b1',
  '#00acc1',
  '#6d4c41',
] as const;

export const THEME_COLOR_MAP = {
  default: '#0088cc',
  green: '#4CAF50',
  purple: '#673AB7',
  orange: '#FF9800',
} as const;
