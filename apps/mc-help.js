import plugin from '../../../lib/plugins/plugin.js';
import puppeteer from '../../../lib/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getMCToolConfig } from '../config/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const HELP_TPL_FILE = path.join(PLUGIN_ROOT, 'resources/help/help.html');
const HELP_CSS_FILE_URL = pathToFileURL(path.join(PLUGIN_ROOT, 'resources/help/help.css')).href;

function buildHelpData() {
  const sections = [
    {
      title: '基础命令',
      items: [
        { cmd: '#mc帮助', desc: '查看本帮助页面' },
        { cmd: '#mcuuid <正版ID>', desc: '查询玩家 UUID' },
        { cmd: '#mc头像 <正版ID> [2d|3d]', desc: '渲染玩家头像' },
        { cmd: '#mc皮肤渲染 <正版ID>', desc: '渲染玩家皮肤行走图(GIF/PNG)' },
        { cmd: '#mcmotd <地址[:端口]> [ja|be]', desc: '查询服务器状态' }
      ]
    },
    {
      title: '使用示例',
      items: [
        { cmd: '#mcuuid Notch', desc: '查询 Notch 的 UUID' },
        { cmd: '#mc头像 Notch 3d', desc: '渲染 3D 头像' },
        { cmd: '#mc皮肤渲染 Notch', desc: '渲染透明背景皮肤动图' },
        { cmd: '#mcmotd 1.2.3.4:25565 ja', desc: '通过 IP+端口查询 Java 服状态' },
        { cmd: '#mcmotd play.hypixel.net be', desc: '查询 Bedrock 服状态（mcstatus）' }
      ]
    }
  ];

  const now = new Date();
  const generatedAt = now.toLocaleString('zh-CN', { hour12: false });

  return {
    tplFile: HELP_TPL_FILE,
    saveId: `help-${Date.now()}`,
    helpCssFileUrl: HELP_CSS_FILE_URL,
    title: 'MCTool 插件帮助',
    subtitle: 'Minecraft 查询与渲染工具',
    generatedAt,
    sections
  };
}

export class MCToolHelp extends plugin {
  constructor() {
    const config = getMCToolConfig();
    super({
      name: 'MCTool-帮助',
      dsc: 'MCTool 功能帮助菜单',
      event: 'message',
      priority: config.plugin.priority,
      rule: [
        {
          reg: '^#?[Mm][Cc](?:帮助|help|菜单|命令|说明|功能|指令|使用说明)$',
          fnc: 'mchelp'
        }
      ]
    });
  }

  async mchelp(e) {
    const data = buildHelpData();
    const image = await puppeteer.screenshot('mctool-plugin/help', data);

    if (!image) {
      await e.reply('帮助渲染失败，请稍后重试', true);
      return true;
    }

    await e.reply(image, true);
    return true;
  }
}
