import { MCMotd } from './apps/mc-motd.js';
import { MCToolUUID } from './apps/mc-uuid.js';
import { MCToolAvatar } from './apps/mc-avatar.js';
import { MCToolSkin } from './apps/mc-skin.js';
import { MCToolHelp } from './apps/mc-help.js';

export const apps = {
  'mc-help': MCToolHelp,
  'mc-motd': MCMotd,
  'mc-uuid': MCToolUUID,
  'mc-avatar': MCToolAvatar,
  'mc-skin': MCToolSkin
};
