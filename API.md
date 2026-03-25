# API

## 1. 服务地址

- 默认监听: `http://127.0.0.1:57680`
- 在线文档: `http://127.0.0.1:57680/docs`

## 2. 快速启动

```bash
npm install
npx playwright install chromium
npm run api:prepare
npm run api:start
```

## 3. 通用说明

- 响应格式:
  - 所有接口统一返回 `application/json`
  - 渲染图片统一以 Base64 字符串返回，不再返回二进制图片流
- 视角参数 `view` 可选值:
  - `front`
  - `back`
  - `both`
- 渲染输出:
  - 返回前会按透明像素包围盒自动做水平/垂直居中
- 渲染质量参数:
  - `definition` 范围 `0.8` 到 `3.5`，默认 `1.5`
- 背景透明参数:
  - `transparent` 默认 `false`
  - `true` 时输出透明背景 PNG

## 4. 端点列表

### 4.1 GET `/`

服务健康状态。

响应示例:

```json
{
	"status": 200,
	"msg": "SkinRenderMC skinview3d API"
}
```

### 4.2 GET `/url/image/{view}`

按皮肤 URL 渲染，并返回单视角 Base64。

查询参数:

- `skinUrl`: 字符串，可选
- `capeUrl`: 字符串，可选
- `nameTag`: 字符串，可选
- `definition`: 数值，可选
- `transparent`: 布尔，可选

示例:

```bash
curl --get \
  --data-urlencode "skinUrl=https://example.com/skin.png" \
  --data-urlencode "capeUrl=https://example.com/cape.png" \
  --data-urlencode "nameTag=Player" \
  --data-urlencode "definition=1.5" \
  --data-urlencode "transparent=true" \
  "http://127.0.0.1:57680/url/image/both"
```

响应示例:

```json
{
	"view": "both",
	"image_b64": "iVBORw0KGgoAAA...",
	"backendInfo": {
		"slim": false,
		"model": "default",
		"serverTimeJs": "Sun Mar 22 2026 21:40:00 GMT+0800 (China Standard Time)"
	}
}
```

### 4.3 GET `/url/json/all`

按 URL 渲染并返回三个视角的 Base64。

查询参数:

- `skinUrl`: 字符串，可选
- `capeUrl`: 字符串，可选
- `nameTag`: 字符串，可选
- `definition`: 数值，可选
- `transparent`: 布尔，可选

响应示例:

```json
{
	"front_b64": "iVBORw0KGgoAAA...",
	"back_b64": "iVBORw0KGgoAAA...",
	"both_b64": "iVBORw0KGgoAAA...",
	"backendInfo": {
		"slim": false,
		"model": "default",
		"serverTimeJs": "Sun Mar 22 2026 21:40:00 GMT+0800 (China Standard Time)"
	}
}
```

### 4.4 GET `/mojang/image/{view}`

按 Mojang 正版用户名渲染，返回单视角行走动图 GIF Base64。

查询参数:

- `view`: 固定为 `walk`
- `name`: 用户名，必填
- `definition`: 数值，可选
- `transparent`: 布尔，可选
- 模型识别: 优先使用 Mojang 元数据（`Alex/slim` 或 `Steve/default`），若缺失则自动检测

示例:

```bash
curl --get \
  --data-urlencode "name=Notch" \
  "http://127.0.0.1:57680/mojang/image/walk"
```

### 4.5 GET `/littleskin/image/{view}`

按 LittleSkin 用户名渲染，返回单视角 Base64。

查询参数:

- `name`: 用户名，必填
- `definition`: 数值，可选
- `transparent`: 布尔，可选

示例:

```bash
curl --get \
  --data-urlencode "name=example_user" \
  "http://127.0.0.1:57680/littleskin/image/front"
```

### 4.6 GET `/status/mcsrvstat/{edition}/{address}`

查询 `https://api.mcsrvstat.us`，并返回统一结构。

- `edition`: `java` 或 `bedrock`
- `address`: 服务器地址，支持 `host` 或 `host:port`

示例:

```bash
curl "http://127.0.0.1:57680/status/mcsrvstat/java/play.hypixel.net"
```

### 4.7 GET `/status/mcstatus/{edition}/{address}`

查询 `https://api.mcstatus.io`，并返回统一结构。

- `edition`: `java` 或 `bedrock`
- `address`: 服务器地址，支持 `host` 或 `host:port`
- `query`: 布尔，可选，仅 Java 生效（适配 mcstatus 文档）
- `timeout`: 数值，可选，单位秒，范围 `0.1` 到 `30`（适配 mcstatus 文档）

示例:

```bash
curl --get \
  --data-urlencode "query=true" \
  --data-urlencode "timeout=5" \
  "http://127.0.0.1:57680/status/mcstatus/java/play.hypixel.net"
```

### 4.8 GET `/status/both/{edition}/{address}`

并行查询两个上游并组合返回：

- `mcsrvstat`: 来自 `api.mcsrvstat.us`
- `mcstatus`: 来自 `api.mcstatus.io`

示例:

```bash
curl "http://127.0.0.1:57680/status/both/java/play.hypixel.net"
```

### 4.9 GET `/avatar/url`

根据 `skinUrl` 生成头像（Head/Face），风格参考 McSkinTools。

- `skinUrl`: 皮肤 PNG URL（必填）
- `size`: 输出头像大小，范围 `8` 到 `1024`，默认 `256`
- `overlay`: 是否叠加外层帽子层，默认 `true`
- `mode`: `2d` / `3d`，默认 `2d`
  - `2d`: 返回 PNG Base64
  - `3d`: 返回慢速旋转 GIF Base64（默认 24 帧循环）
- `transparent`: 是否透明背景，仅 `3d` 生效，默认 `false`

示例:

```bash
curl --get \
  --data-urlencode "skinUrl=https://example.com/skin.png" \
  --data-urlencode "size=256" \
  --data-urlencode "mode=3d" \
  --data-urlencode "overlay=true" \
  "http://127.0.0.1:57680/avatar/url"
```

### 4.10 GET `/avatar`

按名称获取皮肤并生成头像（推荐入口）。

- `name`: 玩家用户名（必填）
- `provider`: `mojang` / `littleskin` / `auto`，默认 `mojang`
  - `mojang`: 只查正版
  - `littleskin`: 只查 LittleSkin
  - `auto`: 先查 Mojang，找不到再查 LittleSkin
- `size`: 输出头像大小，范围 `8` 到 `1024`，默认 `256`
- `overlay`: 是否叠加外层帽子层，默认 `true`
- `mode`: `2d` / `3d`，默认 `2d`
  - `2d`: 返回 PNG Base64
  - `3d`: 返回慢速旋转 GIF Base64（默认 24 帧循环）
- `transparent`: 是否透明背景，仅 `3d` 生效，默认 `false`

示例（直接传正版账号）:

```bash
curl --get \
  --data-urlencode "name=Notch" \
  --data-urlencode "mode=3d" \
  "http://127.0.0.1:57680/avatar"
```

### 4.11 GET `/avatar/mojang`

根据 Mojang 用户名生成头像。

- `name`: 玩家用户名（必填）
- `size`: 输出头像大小，范围 `8` 到 `1024`，默认 `256`
- `overlay`: 是否叠加外层帽子层，默认 `true`
- `mode`: `2d` / `3d`，默认 `2d`
  - `2d`: 返回 PNG Base64
  - `3d`: 返回慢速旋转 GIF Base64（默认 24 帧循环）
- `transparent`: 是否透明背景，仅 `3d` 生效，默认 `false`

示例:

```bash
curl --get \
  --data-urlencode "name=Notch" \
  --data-urlencode "size=256" \
  "http://127.0.0.1:57680/avatar/mojang"
```

### 4.12 GET `/avatar/littleskin`

根据 LittleSkin 用户名生成头像。

- `name`: 玩家用户名（必填）
- `size`: 输出头像大小，范围 `8` 到 `1024`，默认 `256`
- `overlay`: 是否叠加外层帽子层，默认 `true`
- `mode`: `2d` / `3d`，默认 `2d`
  - `2d`: 返回 PNG Base64
  - `3d`: 返回慢速旋转 GIF Base64（默认 24 帧循环）
- `transparent`: 是否透明背景，仅 `3d` 生效，默认 `false`

示例:

```bash
curl --get \
  --data-urlencode "name=example_user" \
  --data-urlencode "size=256" \
  "http://127.0.0.1:57680/avatar/littleskin"
```

头像响应示例:

```json
{
	"provider": "mojang",
	"source": "Notch",
	"mode": "3d",
	"image_format": "gif",
	"size": 256,
	"overlay": true,
	"image_b64": "R0lGODlh..."
}
```

## 5. 状态查询返回结构（统一）

`/status/mcsrvstat/*` 与 `/status/mcstatus/*` 均返回：

```json
{
	"provider": "mcsrvstat",
	"edition": "java",
	"address": "play.hypixel.net",
	"online": true,
	"host": "play.hypixel.net",
	"ip": "x.x.x.x",
	"port": 25565,
	"version": "1.21.x",
	"players": {
		"online": 12345,
		"max": 200000
	},
	"motd": "Some MOTD",
	"raw": {}
}
```

## 6. 错误响应

统一响应结构:

```json
{
	"status": 404,
	"msg": "Player xxx does not exist in LittleSkin."
}
```

常见状态码:

- `400`: 参数校验失败
- `404`: 玩家不存在
- `5xx`: 上游服务或服务内部错误（含 `mcstatus.io` / `mcsrvstat.us`）

## 7. 环境变量

- `HOST`: 默认 `0.0.0.0`
- `PORT`: 默认 `57680`
- `RENDER_BUNDLE_PATH`: 默认 `./bundles/skinview3d.bundle.js`
- `BROWSER_HEADLESS`: 默认 `true`
- `BROWSER_WS_ENDPOINT`: 可选，连接远程浏览器 CDP
- `RENDER_WIDTH`: 默认 `350`
- `RENDER_HEIGHT`: 默认 `670`
- `VIEWPORT_WIDTH`: 默认 `1080`
- `VIEWPORT_HEIGHT`: 默认 `1920`
- `OPENAPI_TITLE`: 默认 `skinview3d Render API`
- `OPENAPI_VERSION`: 默认 `1.0.0`

## 8. 说明

- 生产环境建议:
  - 为 API 增加网关层限流
  - 使用外部浏览器容器时设置 `BROWSER_WS_ENDPOINT`
  - 监控渲染耗时与浏览器内存占用

### 8.1 上游适配说明

- `mcstatus.io` 适配:
  - Java: `https://api.mcstatus.io/v2/status/java/{address}`
  - Bedrock: `https://api.mcstatus.io/v2/status/bedrock/{address}`
  - 透传参数: `query`(仅 Java)、`timeout`
- `mcsrvstat.us` 适配:
  - Java: `https://api.mcsrvstat.us/3/{address}`
  - Bedrock: `https://api.mcsrvstat.us/bedrock/3/{address}`
  - 已设置必需的 `User-Agent` 请求头
