import plugin from '../../../lib/plugins/plugin.js';
import fetch from 'node-fetch';
import { getMCToolConfig } from '../config/config.js';

const PLUGIN_PRIORITY = getMCToolConfig().plugin.priority;

function isValidMinecraftName(name) {
  return /^[A-Za-z0-9_]{3,16}$/.test(String(name || ''));
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function buildUuidApiUrl(username, apiBase) {
  return `${apiBase.replace(/\/+$/, '')}/${encodeURIComponent(username)}`;
}

export class MCToolUUID extends plugin {
  constructor() {
    super({
      name: 'MCTool-UUID查询',
      dsc: '查询 Minecraft 玩家 UUID',
      event: 'message',
      priority: PLUGIN_PRIORITY,
      rule: [
        {
          reg: '^#?[Mm][Cc](?:uuid|uid|id)(?:\\s+.+)?$',
          fnc: 'mcuuid'
        }
      ]
    });
  }

  async mcuuid(e) {
    const config = getMCToolConfig();
    const username = e.msg.match(/^#?[Mm][Cc](?:uuid|uid|id)(?:\s+(.+))?$/)?.[1]?.trim();
    if (!username) {
      await e.reply('用法: #mcuuid <正版ID>', true);
      return true;
    }

    if (!isValidMinecraftName(username)) {
      await e.reply('正版ID格式不正确，仅支持 3-16 位字母/数字/下划线', true);
      return true;
    }

    try {
      const data = await fetchJson(
        buildUuidApiUrl(username, config.uuid.api_base),
        config.timeout.uuid_ms
      );
      const uuid = data?.data?.player?.id;
      const rawId = data?.data?.player?.raw_id;

      if (!data?.success || !uuid) {
        await e.reply(`未找到玩家 ${username} 的UUID`, true);
        return true;
      }

      await e.reply(
        [
          `玩家: ${username}`,
          `格式化UUID: ${uuid}`,
          `原始UUID: ${rawId || 'N/A'}`
        ].join('\n'),
        true
      );
      return true;
    } catch (err) {
      await e.reply(`查询失败: ${err.message}`, true);
      return true;
    }
  }
}
