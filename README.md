# mctool-plugin

一个适用于 Yunzai 的 Minecraft 工具插件，提供账号信息查询、头像/皮肤渲染和服务器状态查询。

## 功能

- 玩家 UUID 查询
- 玩家头像渲染（2D/3D）
- 玩家皮肤行走图渲染
- 服务器状态查询（Java / Bedrock）
- HTML 帮助页（`#mc帮助`）

## 安装

1. 在 Yunzai 根目录执行：

```bash
git clone https://github.com/QingYingX-Bot/McTool-Plugin.git ./plugins/mctool-plugin
```

2. 重启 Bot

## 命令

| 命令 | 说明 |
| --- | --- |
| `#mc帮助` | 查看插件帮助页 |
| `#mcuuid <正版ID>` | 查询玩家 UUID |
| `#mc头像 <正版ID> [2d\|3d]` | 生成玩家头像 |
| `#mc皮肤渲染 <正版ID>` | 生成玩家皮肤动图 |
| `#mcmotd <地址[:端口]> [ja\|be]` | 查询服务器状态 |

## MOTD 参数说明

- `ja` / `java`: 查询 Java 服务器
- `be` / `bedrock`: 查询 Bedrock 服务器
- `provider`: 数据源，支持 `both` / `mcstatus` / `mcsrvstat`
- `timeout`: 请求超时（秒），范围 `0.1-30`，兼容毫秒写法
- `query`: 仅 Java 生效，`true/false`
- `port`: 当地址未带端口时可单独传入


## 配置

- 配置文件：`plugins/mctool-plugin/config/config.yaml`
- 配置加载：`plugins/mctool-plugin/config/config.js`

配置生效规则：

- 大多数业务参数保存后在下一次命令执行时生效
- `plugin.priority` 这类加载期参数仍需重启 Bot

## 说明

- 玩家相关命令都基于正版 ID，不依赖绑定数据
- 渲染 API 说明见 [API.md](./API.md)
