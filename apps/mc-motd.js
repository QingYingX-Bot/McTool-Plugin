import plugin from '../../../lib/plugins/plugin.js';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';
import { promises as fsp } from 'fs';
import path from 'path';
import Bot from '../../../lib/bot.js';
import { getMCToolConfig } from '../config/config.js';

const PLUGIN_PRIORITY = getMCToolConfig().plugin.priority;

function getMotdRuntimeConfig() {
  const config = getMCToolConfig();
  return {
    apiBaseUrl: config.api.render_base,
    defaultTimeout: config.motd.default_timeout_seconds,
    requestTimeoutMs: config.timeout.motd_request_ms,
    defaultEdition: config.motd.default_edition,
    defaultProvider: config.motd.default_provider,
    tempBaseDir: config.motd.temp_dir
  };
}

const defaultFavicon = "data:image/png;base64,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";

/**
 * 初始化目录和文件
 */
async function ensureDirs(runtimeConfig = getMotdRuntimeConfig()) {
  await fsp.mkdir(runtimeConfig.tempBaseDir, { recursive: true });
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseBoolean(text) {
  const normalized = String(text ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return null;
}

function parseEdition(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'be' || normalized === 'bedrock') return 'bedrock';
  return normalized === 'java' || normalized === 'ja' ? 'java' : null;
}

function parseProvider(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'both' || normalized === 'mcstatus' || normalized === 'mcsrvstat') {
    return normalized;
  }
  return null;
}

function normalizeTimeoutSeconds(value, fallbackTimeout = 5) {
  let seconds = Number.parseFloat(String(value ?? fallbackTimeout));
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return fallbackTimeout;
  }

  // 兼容旧参数习惯：传 3000 视作毫秒
  if (seconds > 30) {
    seconds = seconds / 1000;
  }

  if (seconds < 0.1) seconds = 0.1;
  if (seconds > 30) seconds = 30;
  return Number(seconds.toFixed(2));
}

function parseMotdInput(rawInput, runtimeConfig = getMotdRuntimeConfig()) {
  const tokens = String(rawInput ?? '').trim().split(/\s+/).filter(Boolean);
  const options = {
    edition: runtimeConfig.defaultEdition,
    provider: runtimeConfig.defaultProvider,
    timeout: runtimeConfig.defaultTimeout,
    query: null,
    port: null
  };
  const meta = {
    providerExplicit: false
  };
  const addressParts = [];

  for (const token of tokens) {
    const edition = parseEdition(token);
    if (edition) {
      options.edition = edition;
      continue;
    }

    const provider = parseProvider(token);
    if (provider) {
      options.provider = provider;
      meta.providerExplicit = true;
      continue;
    }

    const separatorIndex = token.indexOf('=');
    if (separatorIndex === -1) {
      addressParts.push(token);
      continue;
    }

    const key = token.slice(0, separatorIndex).trim().toLowerCase();
    const value = token.slice(separatorIndex + 1).trim();

    if (!key || value === '') {
      addressParts.push(token);
      continue;
    }

    if (key === 'type') {
      const editionValue = parseEdition(value);
      if (editionValue) options.edition = editionValue;
      continue;
    }

    if (key === 'edition') {
      const editionValue = parseEdition(value);
      if (editionValue) options.edition = editionValue;
      continue;
    }

    if (key === 'provider') {
      const providerValue = parseProvider(value);
      if (providerValue) {
        options.provider = providerValue;
        meta.providerExplicit = true;
      }
      continue;
    }

    if (key === 'timeout') {
      options.timeout = normalizeTimeoutSeconds(value, runtimeConfig.defaultTimeout);
      continue;
    }

    if (key === 'query') {
      const parsedBoolean = parseBoolean(value);
      if (parsedBoolean !== null) {
        options.query = parsedBoolean;
      }
      continue;
    }

    // 兼容旧参数，直接忽略
    if (key === 'enablesrv' || key === 'srv') {
      continue;
    }

    if (key === 'port') {
      const parsedPort = Number.parseInt(value, 10);
      if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
        options.port = parsedPort;
      }
      continue;
    }

    addressParts.push(token);
  }

  return {
    address: addressParts.join(' ').trim() || null,
    options,
    meta
  };
}

function normalizeAddress(serverAddress, port) {
  const address = String(serverAddress ?? '').trim();
  if (!address || !port) return address;

  if (/\]:\d+$/.test(address)) return address;
  if (/:\d+$/.test(address) && !address.includes(']')) return address;
  if (address.includes(':')) return address;
  return `${address}:${port}`;
}

function buildStatusApiUrl(serverAddress, options, runtimeConfig = getMotdRuntimeConfig()) {
  const targetAddress = normalizeAddress(serverAddress, options.port);
  const url = new URL(
    `/status/${options.provider}/${options.edition}/${encodeURIComponent(targetAddress)}`,
    runtimeConfig.apiBaseUrl
  );

  if (options.provider === 'mcstatus' || options.provider === 'both') {
    url.searchParams.set('timeout', String(normalizeTimeoutSeconds(options.timeout, runtimeConfig.defaultTimeout)));
    if (options.edition === 'java' && typeof options.query === 'boolean') {
      url.searchParams.set('query', String(options.query));
    }
  }
  return url.toString();
}

function getMotdHtml(serverStatus) {
  const plainMotd = String(serverStatus?.motd ?? '').trim();
  if (plainMotd) {
    return escapeHtml(plainMotd).replace(/\n/g, '<br />');
  }

  const rawMotd = serverStatus?.raw?.motd;
  if (Array.isArray(rawMotd?.clean) && rawMotd.clean.length) {
    return escapeHtml(rawMotd.clean.join('\n')).replace(/\n/g, '<br />');
  }

  if (typeof rawMotd?.raw === 'string' && rawMotd.raw.trim()) {
    return escapeHtml(rawMotd.raw).replace(/\n/g, '<br />');
  }

  return 'Unknown MOTD';
}

function parseFaviconCandidate(input) {
  const value = String(input ?? '').trim();
  if (!value) return null;
  if (value.startsWith('data:image/')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.includes('base64,')) return value;
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(value) && value.length > 64) {
    return `data:image/png;base64,${value.replace(/\s+/g, '')}`;
  }
  return null;
}

function pickFavicon(serverStatus) {
  const candidates = [
    serverStatus?.favicon,
    serverStatus?.icon,
    serverStatus?.raw?.favicon,
    serverStatus?.raw?.icon
  ];
  for (const item of candidates) {
    const parsed = parseFaviconCandidate(item);
    if (parsed) return parsed;
  }
  return defaultFavicon;
}

function pickPing(serverStatus) {
  const candidates = [
    serverStatus?.ping,
    serverStatus?.latency,
    serverStatus?.raw?.latency,
    serverStatus?.raw?.ping,
    serverStatus?.raw?.debug?.ping
  ];
  for (const item of candidates) {
    const value = Number(item);
    if (Number.isFinite(value) && value >= 0) {
      return Math.round(value);
    }
  }
  return 'N/A';
}

function providerLabel(provider) {
  const mapping = {
    mcsrvstat: 'mcsrvstat.us',
    mcstatus: 'mcstatus.io',
    both: '双源合并'
  };
  return mapping[String(provider || '').toLowerCase()] || String(provider || 'unknown');
}

function isStatusObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasBackendImage(value) {
  if (!isStatusObject(value)) return false;
  const raw = value?.image_b64 ?? value?.imageBase64;
  return typeof raw === 'string' && raw.trim().length > 0;
}

function extractBackendImageBase64(value) {
  if (!isStatusObject(value)) return null;
  let imageRaw = String(value?.image_b64 ?? value?.imageBase64 ?? '').trim();
  if (!imageRaw) return null;

  if (imageRaw.includes('base64,')) {
    imageRaw = imageRaw.slice(imageRaw.indexOf('base64,') + 7);
  }

  imageRaw = imageRaw.replace(/\s+/g, '');
  return imageRaw || null;
}

function normalizeStatusItems(payload, preferredProvider) {
  const items = [];
  const errors = [];

  if (preferredProvider === 'both') {
    const mcsrvstat = payload?.mcsrvstat;
    const mcstatus = payload?.mcstatus;
    if (isStatusObject(mcsrvstat)) items.push({ provider: 'mcsrvstat', data: mcsrvstat });
    if (isStatusObject(mcstatus)) items.push({ provider: 'mcstatus', data: mcstatus });

    if (!items.length && isStatusObject(payload)) {
      if (typeof payload?.provider === 'string' || typeof payload?.online === 'boolean' || hasBackendImage(payload)) {
        items.push({ provider: payload.provider || 'both', data: payload });
      }
    }

    if (typeof payload?.mcsrvstat_error === 'string') {
      errors.push(`mcsrvstat.us: ${payload.mcsrvstat_error}`);
    }
    if (typeof payload?.mcstatus_error === 'string') {
      errors.push(`mcstatus.io: ${payload.mcstatus_error}`);
    }
  } else if (isStatusObject(payload)) {
    items.push({ provider: payload.provider || preferredProvider, data: payload });
  }

  return { items, errors };
}

function getProviderPriority(provider) {
  const normalized = String(provider || '').toLowerCase();
  if (normalized === 'mcstatus') return 3;
  if (normalized === 'mcsrvstat') return 2;
  if (normalized === 'both') return 1;
  return 0;
}

function scoreStatusItem(item) {
  const status = item?.data;
  let score = 0;

  if (status?.online === true) score += 100;
  if (status?.online === false) score -= 20;

  score += getProviderPriority(item?.provider) * 10;

  const motdHtml = getMotdHtml(status);
  if (motdHtml && motdHtml !== 'Unknown MOTD') score += 5;

  const playersOnline = Number(status?.players?.online);
  if (Number.isFinite(playersOnline) && playersOnline > 0) score += 2;

  return score;
}

function pickBestStatusItem(items) {
  if (!Array.isArray(items) || !items.length) return null;

  const sorted = [...items].sort((a, b) => scoreStatusItem(b) - scoreStatusItem(a));
  return sorted[0] || null;
}

function extractMotdCommandInput(message) {
  return message.match(/^#mcmotd(.*)$/i)?.[1]?.trim() || '';
}

/**
 * 渲染HTML为Base64图片（替代Karin的render）
 * @param {string} filePath HTML文件路径
 * @returns {Promise<string>} Base64图片
 */
async function renderHtml(filePath) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 240 });
    await page.goto(`file://${path.resolve(filePath)}`, { waitUntil: 'networkidle0' });
    const boxHandle = await page.$('.box');
    if (boxHandle) {
      try {
        return await boxHandle.screenshot({
          type: 'jpeg',
          quality: 80,
          encoding: 'base64',
          omitBackground: false
        });
      } finally {
        await boxHandle.dispose();
      }
    }

    return await page.screenshot({
      type: 'jpeg',
      quality: 80,
      encoding: 'base64',
      fullPage: true,
      omitBackground: false
    });
  } finally {
    await browser.close();
  }
}

// 启动时初始化目录
ensureDirs().catch(err => {
  console.error('[MCMotd] 初始化目录时出错: ', err);
});

export class MCMotd extends plugin {
  constructor() {
    super({
      name: "MC服务器查询",
      dsc: "查询Minecraft服务器状态，支持Java/Bedrock双版本",
      event: "message",
      priority: PLUGIN_PRIORITY,
      rule: [
        {
          reg: /^#mcmotd(.*)/i,
          fnc: "motd"
        }
      ]
    });
  }

  /**
   * 服务器状态查询
   */
  async motd(e) {
    const runtimeConfig = getMotdRuntimeConfig();
    await ensureDirs(runtimeConfig);

    const rawInput = extractMotdCommandInput(e.msg);
    const parsed = parseMotdInput(rawInput, runtimeConfig);
    const serverAddress = parsed.address || null;
    const shouldSendAllProviders = parsed.options.provider === 'both' && parsed.meta.providerExplicit;
    if (!serverAddress) {
      const defaultEditionText = runtimeConfig.defaultEdition === 'bedrock' ? 'be' : 'java';
      return e.reply(
        `用法: #mcmotd <地址[:端口]> [ja|be] \n默认查询 ${defaultEditionText} + ${runtimeConfig.defaultProvider}；timeout 单位为秒（0.1-30，兼容旧毫秒写法）。`,
        true,
        { recallMsg: 30 }
      );
    }

    // 发送加载提示
    const providerText = parsed.options.provider === 'both' && !shouldSendAllProviders
      ? 'auto'
      : parsed.options.provider;
    const targetText = `${parsed.options.edition}/${providerText}`;
    const loadingMessage = await e.reply(
      `正在查询 ${serverAddress} (${targetText}), 请稍后...`,
      true
    );
    const messageId = loadingMessage?.message_id;

    try {
      // 查询服务器状态
      const { images, errors } = await this.fetchServerStatus(
        serverAddress,
        parsed.options,
        runtimeConfig,
        { sendAllProviders: shouldSendAllProviders }
      );

      if (!images.length) {
        const errorText = errors.length ? `\n${errors.join('\n')}` : '';
        await e.reply(`查询失败, 请检查地址或稍后再试${errorText}`, true, { recallMsg: 60 });
      } else {
        let hasSendError = false;
        for (const item of images) {
          const imageSeg = segment.image(`base64://${item.base64}`);
          const sendRes = await e.reply([imageSeg], true);
          if (sendRes?.error) {
            hasSendError = true;
            errors.push(`${item.type}: 图片发送失败`);
          }
        }

        if ((errors.length || hasSendError) && shouldSendAllProviders) {
          await e.reply(`部分查询失败:\n${errors.join('\n')}`, true, { recallMsg: 60 });
        }
      }
    } catch (err) {
      await e.reply(`查询失败: ${err.message || err}`, true, { recallMsg: 60 });
    } finally {
      // 撤回加载提示
      if (e.isGroup && messageId) {
        await Bot.recallMsg(e.group_id, messageId);
      }
    }
  }

  /**
   * 查询服务器状态并渲染图片
   */
  async fetchServerStatus(
    serverAddress,
    userOptions = {},
    runtimeConfig = getMotdRuntimeConfig(),
    behavior = {}
  ) {
    const options = {
      edition: userOptions.edition || runtimeConfig.defaultEdition,
      provider: userOptions.provider || runtimeConfig.defaultProvider,
      timeout: normalizeTimeoutSeconds(userOptions.timeout ?? runtimeConfig.defaultTimeout, runtimeConfig.defaultTimeout),
      query: typeof userOptions.query === 'boolean' ? userOptions.query : null,
      port: userOptions.port ?? null
    };

    const images = [];
    const errors = [];
    const result = await this.fetchSingleStatus(serverAddress, options, runtimeConfig);

    if (!result.ok) {
      errors.push(result.error);
      return { images, errors };
    }

    const { items, errors: normalizeErrors } = normalizeStatusItems(result.data, options.provider);
    if (normalizeErrors.length) {
      errors.push(...normalizeErrors);
    }
    if (!items.length) {
      errors.push('返回数据不完整');
      return { images, errors };
    }

    let itemsToRender = items;
    const shouldSendAllProviders = behavior?.sendAllProviders === true;
    if (options.provider === 'both' && !shouldSendAllProviders) {
      const best = pickBestStatusItem(items);
      itemsToRender = best ? [best] : [];
    }

    for (const item of itemsToRender) {
      try {
        const backendBase64 = extractBackendImageBase64(item.data);
        const base64 = backendBase64 || await this.renderData(
          item.data,
          serverAddress,
          options.edition,
          item.provider,
          runtimeConfig
        );
        images.push({ type: item.provider, base64 });
      } catch (err) {
        errors.push(`${providerLabel(item.provider)}: 渲染失败 (${err.message || err})`);
      }
    }

    const order = ['mcsrvstat', 'mcstatus', 'both'];
    images.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
    return { images, errors };
  }

  async fetchSingleStatus(serverAddress, options, runtimeConfig = getMotdRuntimeConfig()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), runtimeConfig.requestTimeoutMs);
    try {
      const url = buildStatusApiUrl(serverAddress, options, runtimeConfig);
      const res = await fetch(url, { signal: controller.signal });
      let payload = null;

      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const serverMessage = payload?.msg || payload?.error || `HTTP ${res.status}`;
        return { ok: false, error: serverMessage };
      }

      if (!isStatusObject(payload)) {
        return { ok: false, error: '接口返回不是 JSON 对象' };
      }

      if (Number(payload?.status) >= 400) {
        return { ok: false, error: payload?.msg || payload?.error || `HTTP ${payload.status}` };
      }

      return { ok: true, data: payload };
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { ok: false, error: '请求超时，请稍后重试' };
      }
      return { ok: false, error: err.message || String(err) };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 渲染服务器状态为HTML图片
   */
  async renderData(serverStatus, serverAddress, requestType, provider, runtimeConfig = getMotdRuntimeConfig()) {
    const edition = (serverStatus?.edition || requestType || 'java') === 'bedrock' ? 'bedrock' : 'java';
    const serverType = edition === 'bedrock' ? 'Bedrock' : 'Java';
    const source = providerLabel(provider || serverStatus?.provider || 'unknown');
    const descriptionHtml = getMotdHtml(serverStatus);

    const statusAddress = String(serverStatus?.address ?? '').trim();
    const host = String(serverStatus?.host ?? '').trim();
    const port = Number.isInteger(serverStatus?.port) ? serverStatus.port : null;
    let displayAddress = statusAddress;
    if (!displayAddress) {
      if (host) {
        displayAddress = port ? `${host}:${port}` : host;
      } else {
        displayAddress = normalizeAddress(serverAddress, null) || 'Unknown';
      }
    }

    const safeAddress = escapeHtml(displayAddress);
    const ip = escapeHtml(serverStatus?.ip ?? 'N/A');
    const ping = pickPing(serverStatus);
    const onlineStatus = serverStatus?.online === true ? '在线' : (serverStatus?.online === false ? '离线' : '未知');
    const online = serverStatus?.players?.online ?? 'N/A';
    const max = serverStatus?.players?.max ?? 'N/A';
    const versionName = escapeHtml(serverStatus?.version ?? serverStatus?.raw?.version?.name ?? 'Unknown');
    const favicon = pickFavicon(serverStatus);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html {
      background: #262624;
    }
    body {
      width: 1000px;
      margin: 0;
      font-family: "阿里巴巴普惠体", sans-serif;
      color: #fff;
      background: #262624;
    }
    .box {
      display: flex;
      align-items: center;
      background: #262624;
      padding: 16px;
    }
    .icon {
      width: 128px;
      height: 128px;
      border-radius: 20px;
    }
    .divider {
      width: 2px;
      height: 120px;
      background: #555;
      margin: 0 24px;
    }
    .info {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 1);
      min-height: 128px;
    }
    .motd {
      font-size: 24px;
      margin: 0;
      white-space: pre-wrap;
    }
    .details {
      font-size: 18px;
      margin: 0;
    }
    .details .ip {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="box">
    <img class="icon" src="${favicon}" alt="icon" />
    <div class="divider"></div>
    <div class="info">
      <p class="motd">${descriptionHtml}</p>
      <p class="details">
        地址: <span class="ip">${safeAddress}</span> | 实际IP: ${ip}<br />
        状态: ${onlineStatus} | 延迟: ${ping === 'N/A' ? 'N/A' : `${ping}ms`} | 在线: ${online}/${max}<br />
        版本: ${versionName} | 类型: ${serverType} | 数据源: ${escapeHtml(source)}
      </p>
    </div>
  </div>
</body>
</html>
`;

    const filePath = path.join(
      runtimeConfig.tempBaseDir,
      `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`
    );
    try {
      await fsp.writeFile(filePath, html, "utf-8");
      return await renderHtml(filePath);
    } finally {
      await fsp.unlink(filePath).catch(() => {});
    }
  }
}
