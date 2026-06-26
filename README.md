# 无线搜索 开发中暂时不能使用 

**简体中文** | [繁體中文](README_zh-TW.md) | [English](README_en.md) | [日本語](README_ja.md) | [Русский](README_ru.md) | [Français](README_fr.md)

无线搜索 是一个高性能的开源网盘资源搜索工具，由Freeanime.org与Maishan Inc开发。

## 🌐 在线访问

**在线体验地址：** [https://search.freeanime.org](https://search.freeanime.org)

**新版本测试地址：** [https://search-bate.freeanime.org](https://search-bate.freeanime.org)

**2.0 版本新增功能：**
- 保留 Next.js 前端/管理端 + Go 搜索后端双服务架构
- 新增 PostgreSQL，用于保存安装状态、管理员账号、会话、排行榜草稿与全部业务配置
- 新增 `/install` 安装向导：开源协议确认、环境检查、管理员账号和自定义后台地址配置
- 新增管理员 Settings 配置中心，可视化配置 AI API、人机验证、提示词、排行榜自动任务和核心运行参数
- 业务配置不再依赖 `.env`，Docker 仅保留端口、数据库连接等基础设施配置

> limitless-search 2.0 版本后采用 BYCC4，版权归 Maishan Inc. 所有。

## 📸 界面预览

<table>
  <tr>
    <td><img src="img/1.jpg" alt="主页" width="400"/></td>
    <td><img src="img/2.jpg" alt="底部" width="400"/></td>
  </tr>
  <tr>
    <td><img src="img/3.jpg" alt="人机验证页面" width="400"/></td>
    <td><img src="img/4.jpg" alt="搜索中" width="400"/></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="img/5.jpg" alt="展示资源" width="400"/></td>
  </tr>
</table>

## 🆕 版本更新（2026-06-14）

- 2.0 部署默认使用 Docker Compose 启动 PostgreSQL 与 limitless-search 服务
- 首次访问 `/install` 完成安装后，再进入自定义管理员后台地址
- AI、人机验证、提示词、排行榜和核心运行参数统一在后台 Settings 中配置
- 管理员登录页仅通过安装时设置的后台地址访问

## 🌍 多语言支持

以下地区的语言实现 **100% 翻译**：

| 国家/地区 | 语言 | 文档 |
|-----------|------|------|
| 🇨🇳 中国 | 简体中文 | [README.md](README.md) |
| 🇹🇼 中国台湾 | 繁體中文 | [README_zh-TW.md](README_zh-TW.md) |
| 🇭🇰 中国香港 | 繁體中文 | [README_zh-TW.md](README_zh-TW.md) |
| 🇺🇸 美国 | English | [README_en.md](README_en.md) |
| 🇯🇵 日本 | 日本語 | [README_ja.md](README_ja.md) |
| 🇷🇺 俄罗斯 | Русский | [README_ru.md](README_ru.md) |
| 🇫🇷 法国 | Français | [README_fr.md](README_fr.md) |

> 需要更多语言？请提交 [Issues](https://github.com/maishaninc/limitless-search/issues)

## 🚀 快速部署

### 使用 Docker Compose（推荐）

1. 克隆项目文件

```bash
# HTTPS
git clone https://github.com/maishaninc/limitless-search.git

# SSH
git clone git@github.com:maishaninc/limitless-search.git

# GitHub CLI
gh repo clone maishaninc/limitless-search
```

2. 进入项目目录

```bash
cd limitless-search
```

3. 一键启动 PostgreSQL 与 limitless-search

```bash
docker compose up -d --build
```

如果你的 Docker 版本仍使用旧命令，也可以执行：

```bash
docker-compose up -d --build
```

4. 打开安装向导

- 安装页面：http://localhost:3200/install
- Web 界面：http://localhost:3200
- Go 后端：默认仅在容器内部通过 `http://127.0.0.1:8888` 访问，不直接暴露到宿主机

首次部署必须先访问 `/install`，按页面完成：

1. 滑动阅读并同意开源协议
2. 检查 Node、PostgreSQL、安装状态
3. 创建管理员账号、密码，并设置管理员后台地址

安装完成后，管理员登录页只能通过你设置的后台地址访问，例如 `/manage` 或 `/admin-portal`。

首次安装会自动写入推荐搜索源配置：101 个 Telegram 频道和 61 个搜索插件。后续可在管理员后台 Settings 中可视化修改，不需要编辑 `docker-compose.yml` 的业务环境变量。

### 查看日志

```bash
docker compose logs -f
```

### 停止服务

```bash
docker compose down
```

### Docker 部署更新（推荐）

在服务器上更新到最新版本并重新构建：

```bash
cd limitless-search

git pull

docker compose down

docker compose build --no-cache

docker compose up -d
```

## 🔧 2.0 配置方式

2.0 版本后，业务配置统一保存到 PostgreSQL，并通过管理员后台 Settings 可视化维护。Docker 环境只保留服务启动必需的基础设施变量：

| 环境变量 | 描述 | 默认值 |
|----------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgres://limitless:limitless@postgres:5432/limitless_search?sslmode=disable` |
| `PORT` | Go 后端监听端口 | `8888` |
| `WEB_PORT` | Next.js 前端监听端口 | `3200` |
| `NEXT_PUBLIC_API_BASE` | 前端请求同容器 Go 后端的地址 | `http://127.0.0.1:8888` |

安装完成后进入管理员后台 Settings，可配置：

- AI API：OpenAI 兼容 Base URL、模型、API Key、搜索建议开关
- 人机验证：none、Cloudflare Turnstile、hCaptcha 的站点密钥与服务端密钥
- 提示词：AI 搜索建议、年度/月度/日榜、审核、打分、翻译、校验提示词
- 排行榜自动任务：启用开关、导航入口、运行时间、时区、启动时执行、同步 Token、数据目录
- 核心运行参数：TG 频道、启用插件、代理、缓存、异步插件参数、管理员后台地址

> 当前根目录 `docker-compose.yml` 只对外开放 `3200` 端口。Go 后端 `8888` 端口仅供同容器/内部网络访问；如需从宿主机直接调试后端，请自行添加 `ports` 映射。

### Docker 部署更新（推荐）

在服务器上更新到最新版本并重新构建：

```bash
cd limitless-search

git pull

docker-compose down

docker-compose build --no-cache

docker-compose up -d
```

### 本地开发更新

```bash
cd limitless-search

git pull
```

> 如果你修改过本地代码，请先备份或使用 git stash 保存改动。

## ⚙️ 配置说明

### 运行时环境变量

根目录 `docker-compose.yml` 只保留服务启动必需变量。频道、插件、代理、缓存、AI、人机验证、排行榜和提示词等业务配置统一保存到 PostgreSQL，并在管理员后台 Settings 中维护。

| 环境变量 | 描述 | 默认值 |
|----------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgres://limitless:limitless@postgres:5432/limitless_search?sslmode=disable` |
| `PORT` | Go 后端监听端口 | `8888` |
| `WEB_PORT` | Next.js 前端监听端口 | `3200` |
| `NEXT_PUBLIC_API_BASE` | 前端请求同容器 Go 后端的地址 | `http://127.0.0.1:8888` |

### 搜索源配置

系统内置推荐搜索源，首次安装自动写入 PostgreSQL：

- 默认 TG 频道：101 个
- 默认搜索插件：61 个
- 后端在数据库尚未初始化时也会使用同一套默认源兜底，保证 `docker compose up -d --build` 后可直接完成安装和搜索

如需添加频道、禁用插件或配置代理，请进入管理员后台 Settings 的核心运行参数中修改。

### 代理配置（可选）

如需使用代理访问 Telegram，请在管理员后台 Settings 的核心运行参数中填写代理地址并保存，例如 `socks5://proxy:7897`。保存后重启 `limitless-search` 容器。

## 📁 项目结构

```
.
├── docker-compose.yml          # Docker Compose 配置文件
├── README.md                   # 项目说明文档
├── backend/
│   └── limitless_search/       # 后端服务
│       ├── Dockerfile
│       ├── main.go
│       ├── api/                # API 处理
│       ├── config/             # 配置管理
│       ├── model/              # 数据模型
│       ├── plugin/             # 搜索插件
│       └── docs/               # 文档
└── web/
    └── limitless_search_web/   # Web 前端
        ├── Dockerfile
        ├── .env.example        # 本地开发环境变量示例
        └── src/                # 源代码
```

## 🌐 支持的网盘类型

- 百度网盘 (`baidu`)
- 阿里云盘 (`aliyun`)
- 夸克网盘 (`quark`)
- 天翼云盘 (`tianyi`)
- UC网盘 (`uc`)
- 移动云盘 (`mobile`)
- 115网盘 (`115`)
- PikPak (`pikpak`)
- 迅雷网盘 (`xunlei`)
- 123网盘 (`123`)
- 谷歌云盘 (`google`)
- 磁力链接 (`magnet`)
- 电驴链接 (`ed2k`)

## 📖 API 文档

### 搜索接口

**POST /api/search**

```bash
curl -X POST http://localhost:8888/api/search \
  -H "Content-Type: application/json" \
  -d '{"kw": "xxxxx"}'
```

**GET /api/search**

```bash
curl "http://localhost:8888/api/search?kw=xxxxx"
```

### 健康检查

```bash
curl http://localhost:8888/api/health
```

## 🔧 常见问题

### 1. 如何添加新的 TG 频道？

进入管理员后台 Settings，修改核心运行参数中的 TG 频道列表并保存。保存后重启 `limitless-search` 容器让 Go 后端重新读取 PostgreSQL 配置。

### 2. 如何启用/禁用插件？

进入管理员后台 Settings，修改核心运行参数中的启用插件列表并保存。保存后重启 `limitless-search` 容器。

### 3. 搜索结果为空？

- 检查网络连接是否正常
- 如果在中国大陆，可能需要配置代理访问 Telegram
- 检查 TG 频道名称是否正确

### 4. 如何配置代理？

进入管理员后台 Settings，在核心运行参数中填写代理地址，例如 `socks5://proxy:7897`，保存后重启 `limitless-search` 容器。

## 📄 许可证

[![CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc/4.0/)

本项目采用 [CC BY-NC 4.0 (署名-非商业性使用 4.0 国际)](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans) 许可证。

您可以自由地：
- **分享** — 在任何媒介以任何形式复制、发行本作品
- **演绎** — 修改、转换或以本作品为基础进行创作

惟须遵守下列条件：
- **署名** — 您必须给出适当的署名，提供指向本许可证的链接，同时标明是否（对原始作品）作了修改
- **非商业性使用** — 您不得将本作品用于商业目的

## 🔗 相关链接

- [后端详细文档](backend/limitless_search/docs/README.md)
- [插件开发指南](backend/limitless_search/docs/插件开发指南.md)
- [系统设计文档](backend/limitless_search/docs/系统开发设计文档.md)

---

Limitless Search 2.0 版本后采用 CC BY-NC 4.0 许可证，版权归 Maishan Inc. 所有。
