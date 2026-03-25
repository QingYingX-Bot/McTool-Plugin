import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'config.yaml');

const DEFAULT_CONFIG = {
  api: {
    render_base: 'http://127.0.0.1:57680'
  },
  timeout: {
    motd_request_ms: 15000,
    avatar_ms: 45000,
    skin_ms: 45000,
    uuid_ms: 10000
  },
  motd: {
    default_edition: 'java',
    default_provider: 'both',
    default_timeout_seconds: 5,
    data_dir: './data/MCMotd',
    temp_dir: './temp/MCMotd'
  },
  avatar: {
    provider: 'mojang',
    size: 256,
    overlay: true,
    mode: '3d',
    transparent: false
  },
  skin: {
    definition: {
      default: 1.5,
      min: 0.8,
      max: 3.5
    },
    transparent: false
  },
  uuid: {
    api_base: 'https://playerdb.co/api/player/minecraft'
  },
  plugin: {
    priority: 50
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  const result = clone(base);
  if (!isObject(override)) return result;

  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function normalizeBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  const text = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function normalizeString(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeChoice(value, choices, fallback) {
  const text = String(value ?? '').trim().toLowerCase();
  return choices.includes(text) ? text : fallback;
}

function normalizeInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function logWarn(message, error) {
  if (typeof logger !== 'undefined' && logger?.warn) {
    logger.warn(message, error || '');
    return;
  }
  console.warn(message, error || '');
}

function ensureConfigFile() {
  if (fs.existsSync(CONFIG_PATH)) return;
  fs.writeFileSync(
    CONFIG_PATH,
    '# mctool-plugin 配置文件\n# 保存后大部分配置会在下一次命令执行时生效\n# plugin.priority 等加载期参数仍需重启 Bot\n\n' + YAML.stringify(DEFAULT_CONFIG),
    'utf8'
  );
}

function readRawConfig() {
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = YAML.parse(content);
    return isObject(parsed) ? parsed : {};
  } catch (error) {
    logWarn('[mctool-plugin] 读取 config.yaml 失败，使用默认配置', error?.message || error);
    return {};
  }
}

function normalizeConfig(rawConfig) {
  const merged = deepMerge(DEFAULT_CONFIG, rawConfig);
  const normalized = clone(DEFAULT_CONFIG);

  normalized.api.render_base = normalizeString(merged?.api?.render_base, DEFAULT_CONFIG.api.render_base);

  normalized.timeout.motd_request_ms = normalizeInteger(
    merged?.timeout?.motd_request_ms,
    DEFAULT_CONFIG.timeout.motd_request_ms,
    1000,
    180000
  );
  normalized.timeout.avatar_ms = normalizeInteger(
    merged?.timeout?.avatar_ms,
    DEFAULT_CONFIG.timeout.avatar_ms,
    1000,
    180000
  );
  normalized.timeout.skin_ms = normalizeInteger(
    merged?.timeout?.skin_ms,
    DEFAULT_CONFIG.timeout.skin_ms,
    1000,
    180000
  );
  normalized.timeout.uuid_ms = normalizeInteger(
    merged?.timeout?.uuid_ms,
    DEFAULT_CONFIG.timeout.uuid_ms,
    1000,
    60000
  );

  normalized.motd.default_edition = normalizeChoice(
    merged?.motd?.default_edition,
    ['java', 'bedrock'],
    DEFAULT_CONFIG.motd.default_edition
  );
  normalized.motd.default_provider = normalizeChoice(
    merged?.motd?.default_provider,
    ['both', 'mcstatus', 'mcsrvstat'],
    DEFAULT_CONFIG.motd.default_provider
  );
  normalized.motd.default_timeout_seconds = normalizeNumber(
    merged?.motd?.default_timeout_seconds,
    DEFAULT_CONFIG.motd.default_timeout_seconds,
    0.1,
    30
  );
  normalized.motd.data_dir = normalizeString(merged?.motd?.data_dir, DEFAULT_CONFIG.motd.data_dir);
  normalized.motd.temp_dir = normalizeString(merged?.motd?.temp_dir, DEFAULT_CONFIG.motd.temp_dir);

  normalized.avatar.provider = normalizeChoice(
    merged?.avatar?.provider,
    ['mojang', 'littleskin', 'auto'],
    DEFAULT_CONFIG.avatar.provider
  );
  normalized.avatar.size = normalizeInteger(
    merged?.avatar?.size,
    DEFAULT_CONFIG.avatar.size,
    8,
    1024
  );
  normalized.avatar.overlay = normalizeBoolean(merged?.avatar?.overlay, DEFAULT_CONFIG.avatar.overlay);
  normalized.avatar.mode = normalizeChoice(
    merged?.avatar?.mode,
    ['2d', '3d'],
    DEFAULT_CONFIG.avatar.mode
  );
  normalized.avatar.transparent = normalizeBoolean(
    merged?.avatar?.transparent,
    DEFAULT_CONFIG.avatar.transparent
  );

  const skinMin = normalizeNumber(
    merged?.skin?.definition?.min,
    DEFAULT_CONFIG.skin.definition.min,
    0.1,
    10
  );
  const skinMax = normalizeNumber(
    merged?.skin?.definition?.max,
    DEFAULT_CONFIG.skin.definition.max,
    skinMin,
    10
  );
  normalized.skin.definition.min = skinMin;
  normalized.skin.definition.max = skinMax;
  normalized.skin.definition.default = normalizeNumber(
    merged?.skin?.definition?.default,
    DEFAULT_CONFIG.skin.definition.default,
    skinMin,
    skinMax
  );
  normalized.skin.transparent = normalizeBoolean(
    merged?.skin?.transparent,
    DEFAULT_CONFIG.skin.transparent
  );

  normalized.uuid.api_base = normalizeString(merged?.uuid?.api_base, DEFAULT_CONFIG.uuid.api_base);

  normalized.plugin.priority = normalizeInteger(
    merged?.plugin?.priority,
    DEFAULT_CONFIG.plugin.priority,
    1,
    999
  );

  return normalized;
}

export function getMCToolConfig() {
  ensureConfigFile();
  return normalizeConfig(readRawConfig());
}

export function reloadMCToolConfig() {
  return getMCToolConfig();
}

export { CONFIG_PATH, DEFAULT_CONFIG };
