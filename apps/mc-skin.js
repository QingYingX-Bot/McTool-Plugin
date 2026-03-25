import plugin from '../../../lib/plugins/plugin.js';
import fetch from 'node-fetch';
import { getMCToolConfig } from '../config/config.js';

const PLUGIN_PRIORITY = getMCToolConfig().plugin.priority;

function isValidMinecraftName(name) {
  return /^[A-Za-z0-9_]{3,16}$/.test(String(name || ''));
}

function parseBoolean(text) {
  const normalized = String(text ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return null;
}

function parseSkinArgs(msg, skinConfig) {
  const raw = String(msg || '').replace(/^#?[Mm][Cc]皮肤渲染/, '').trim();
  if (!raw) return null;

  const tokens = raw.split(/\s+/).filter(Boolean);
  const username = tokens[0];
  if (!username) return null;

  const options = {
    definition: skinConfig.definitionDefault,
    transparent: skinConfig.transparentDefault
  };

  for (const token of tokens.slice(1)) {
    const idx = token.indexOf('=');
    if (idx === -1) {
      // 兼容新版 API 的固定视角 walk
      if (token.toLowerCase() === 'walk') {
        continue;
      }
      continue;
    }

    const key = token.slice(0, idx).trim().toLowerCase();
    const value = token.slice(idx + 1).trim();
    if (!key || value === '') continue;

    if (key === 'definition') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        options.definition = Math.max(skinConfig.definitionMin, Math.min(skinConfig.definitionMax, parsed));
      }
      continue;
    }

    if (key === 'transparent') {
      const boolValue = parseBoolean(value);
      if (boolValue !== null) options.transparent = boolValue;
    }
  }

  return { username, options };
}

function buildRenderUrl(username, options, renderApiBase) {
  const url = new URL('/mojang/image/walk', renderApiBase);
  url.searchParams.set('name', username);
  url.searchParams.set('definition', String(options.definition));
  url.searchParams.set('transparent', String(options.transparent));
  return url.toString();
}

async function fetchSkinBase64(url, timeoutMs) {
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
    if (!imageFormat) {
      if (imageRaw.startsWith('R0lGOD')) imageFormat = 'gif';
      else if (imageRaw.startsWith('iVBORw0KGgo')) imageFormat = 'png';
      else imageFormat = 'gif';
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

export class MCToolSkin extends plugin {
  constructor() {
    super({
      name: 'MCTool-皮肤渲染',
      dsc: '按正版ID渲染玩家3D皮肤',
      event: 'message',
      priority: PLUGIN_PRIORITY,
      rule: [
        {
          reg: '^#?[Mm][Cc]皮肤渲染(?:\\s+.+)?$',
          fnc: 'mcskin'
        }
      ]
    });
  }

  async mcskin(e) {
    const config = getMCToolConfig();
    const skinConfig = {
      definitionDefault: config.skin.definition.default,
      definitionMin: config.skin.definition.min,
      definitionMax: config.skin.definition.max,
      transparentDefault: config.skin.transparent
    };

    const parsed = parseSkinArgs(e.msg, skinConfig);
    if (!parsed) {
      await e.reply(
        `用法: #mc皮肤渲染 <正版ID> [definition=${skinConfig.definitionDefault}] [transparent=${skinConfig.transparentDefault}]`,
        true
      );
      return true;
    }

    const { username, options } = parsed;
    if (!isValidMinecraftName(username)) {
      await e.reply('正版ID格式不正确，仅支持 3-16 位字母/数字/下划线', true);
      return true;
    }

    const renderUrl = buildRenderUrl(username, options, config.api.render_base);

    try {
      await e.reply(`正在渲染 ${username} 的行走皮肤动图...`, true);
      const { imageBase64, imageFormat } = await fetchSkinBase64(renderUrl, config.timeout.skin_ms);
      const fileName = `${username}-skin-walk.${imageFormat}`;
      await e.reply(
        [
          `${username} 的皮肤渲染 (${imageFormat.toUpperCase()})`,
          segment.image(`base64://${imageBase64}`, fileName)
        ],
        true
      );
      return true;
    } catch (err) {
      await e.reply(`皮肤渲染失败: ${err.message}`, true);
      return true;
    }
  }
}
