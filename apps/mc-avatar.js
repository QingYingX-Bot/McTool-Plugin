import plugin from '../../../lib/plugins/plugin.js';
import fetch from 'node-fetch';
import { getMCToolConfig } from '../config/config.js';

const PLUGIN_PRIORITY = getMCToolConfig().plugin.priority;

function isValidMinecraftName(name) {
  return /^[A-Za-z0-9_]{3,16}$/.test(String(name || ''));
}

function parseAvatarArgs(message, defaultMode) {
  const raw = message.match(/^#?[Mm][Cc]头像(?:\s+(.+))?$/)?.[1]?.trim();
  if (!raw) return null;

  const tokens = raw.split(/\s+/).filter(Boolean);
  const username = tokens[0];
  const modeToken = String(tokens[1] || '').toLowerCase();
  let mode = defaultMode;

  if (modeToken) {
    if (modeToken !== '2d' && modeToken !== '3d') {
      return { username, modeInvalid: true, mode };
    }
    mode = modeToken;
  }

  return { username, modeInvalid: false, mode };
}

function buildRenderUrl(username, mode, runtimeConfig) {
  const url = new URL('/avatar', runtimeConfig.renderApiBase);
  url.searchParams.set('name', username);
  url.searchParams.set('provider', runtimeConfig.avatar.provider);
  url.searchParams.set('size', String(runtimeConfig.avatar.size));
  url.searchParams.set('overlay', String(runtimeConfig.avatar.overlay));
  url.searchParams.set('mode', mode || runtimeConfig.avatar.mode);
  url.searchParams.set('transparent', String(runtimeConfig.avatar.transparent));
  return url.toString();
}

async function fetchAvatarBase64(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // 仅限制“拿到响应头”的耗时，避免大体积 GIF 在下载/解析阶段被误判超时
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message = payload?.msg || payload?.error || `HTTP ${response.status}`;
      throw new Error(message);
    }

    if (Number(payload?.status) >= 400) {
      const message = payload?.msg || payload?.error || `HTTP ${payload.status}`;
      throw new Error(message);
    }

    let imageRaw = String(payload?.image_b64 || '').trim();
    if (!imageRaw) {
      throw new Error('接口未返回图片数据');
    }

    if (imageRaw.includes('base64,')) {
      imageRaw = imageRaw.slice(imageRaw.indexOf('base64,') + 7);
    }

    imageRaw = imageRaw.replace(/\s+/g, '');
    if (!imageRaw) {
      throw new Error('接口返回的图片数据为空');
    }

    const imageFormatFromApi = String(payload?.image_format || '').trim().toLowerCase();
    let imageFormat = imageFormatFromApi === 'gif' ? 'gif' : (imageFormatFromApi === 'png' ? 'png' : '');

    // 兜底：部分接口可能未返回 image_format，按内容特征推断
    if (!imageFormat) {
      if (imageRaw.startsWith('R0lGOD')) imageFormat = 'gif';
      else if (imageRaw.startsWith('iVBORw0KGgo')) imageFormat = 'png';
      else imageFormat = 'png';
    }

    return { imageBase64: imageRaw, imageFormat };
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`请求超时(${timeoutMs}ms)，请稍后重试`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export class MCToolAvatar extends plugin {
  constructor() {
    super({
      name: 'MCTool-头像渲染',
      dsc: '按ID生成头像',
      event: 'message',
      priority: PLUGIN_PRIORITY,
      rule: [
        {
          reg: '^#?[Mm][Cc]头像(?:\\s+.+)?$',
          fnc: 'mcavatar'
        }
      ]
    });
  }

  async mcavatar(e) {
    const config = getMCToolConfig();
    const runtimeConfig = {
      renderApiBase: config.api.render_base,
      avatarTimeoutMs: config.timeout.avatar_ms,
      avatar: {
        provider: config.avatar.provider,
        size: config.avatar.size,
        overlay: config.avatar.overlay,
        mode: config.avatar.mode,
        transparent: config.avatar.transparent
      }
    };

    const parsed = parseAvatarArgs(e.msg, runtimeConfig.avatar.mode);
    if (!parsed?.username || parsed.modeInvalid) {
      await e.reply('用法: #mc头像 <正版ID> [2d|3d]', true);
      return true;
    }

    const { username, mode } = parsed;
    if (!isValidMinecraftName(username)) {
      await e.reply('正版ID格式不正确，仅支持 3-16 位字母/数字/下划线', true);
      return true;
    }

    const renderUrl = buildRenderUrl(username, mode, runtimeConfig);

    try {
      await e.reply(`正在生成 ${username} 的 ${mode} 头像...`, true);
      const { imageBase64, imageFormat } = await fetchAvatarBase64(renderUrl, runtimeConfig.avatarTimeoutMs);
      const fileName = `${username}-avatar.${imageFormat}`;
      await e.reply(
        [
          `${username} 的头像渲染 (${imageFormat.toUpperCase()})`,
          segment.image(`base64://${imageBase64}`, fileName)
        ],
        true
      );
      return true;
    } catch (err) {
      await e.reply(`头像生成失败: ${err.message}`, true);
      return true;
    }
  }
}
