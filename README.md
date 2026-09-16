# WONDERFUL US · 节目比赛管理

轻量级活动/晚会管理系统（Vue + Node + SQLite），提供：

- **节目单大屏**（`/`）：WONDERFUL US 原版视觉（含原版字体），动态渲染节目列表，当前节目高亮，右侧签到二维码与实时人数
- **大屏提示栏**（`/bar`）：底部「当前节目 / 下一节目」滚动条，透明背景可叠加 OBS
- **观众扫码签到**（`/checkin`）：手机扫码填姓名班级即签到，签到码可随时更换
- **表演者签到**（`/admin/arrived`）：后台按节目标记到场
- **节目管理**（`/admin/programs`）：增删改 + CSV 批量导入（支持 Excel GBK 编码）

技术栈：Vue 3 · shadcn-vue · Tailwind v4 · Vite · Express 5 · better-sqlite3。单 Node 进程 + 单 SQLite 文件，适配 HTTPS 反代部署。

## 快速开始

要求 Node.js ≥ 20（建议 22 LTS）。

```bash
npm install          # 安装依赖（workspaces：server + web）
npm run build        # 构建前端到 web/dist
ADMIN_TOKEN=你的管理密钥 npm start   # 启动，默认 http://localhost:3000
```

首次启动自动建库（`server/data/app.sqlite`）并生成随机 6 位签到码。

可选环境变量：

| 变量 | 默认 | 说明 |
|---|---|---|
| `ADMIN_TOKEN` | （无） | 后台管理密钥；不设置则所有管理接口返回 503 |
| `PORT` | `3000` | 监听端口 |
| `DB_PATH` | `server/data/app.sqlite` | SQLite 文件路径 |

## 使用流程

1. 打开 `/admin`，输入 `ADMIN_TOKEN` 登录
2. 「节目管理」里新增或导入 CSV（列序：`开始时间(YYYY-MM-DD HH:MM), 节目名称, 表演者`，首行表头自动跳过）
3. 大屏机浏览器开 `/`（全屏 F11）；导播/采集场景用 `/bar`（底条以外全透明）
4. 观众扫大屏右上角二维码 → 手机填姓名班级 → 人数实时增长
5. 表演者到场就在「表演者签到」页打开对应开关；晚会节奏和排期脱节时，直接改节目的开始时间即可（提示栏 10 秒内自动切换）

## 开发

```bash
npm run dev    # server(3000, --watch) + vite(5173, 代理 /api)
npm test       # vitest：当前/下一节目判定纯函数
npm run build  # 产物部署用
```

## 部署（HTTPS）

```bash
npm install --omit=dev && npm run build
ADMIN_TOKEN=强随机密钥 PORT=3000 node server/src/index.js
```

用 Nginx/Caddy 反代到 HTTPS 即可（应用已开启 `trust proxy`，限速按 `X-Forwarded-For` 生效）。数据库与上传字体均在本地，无外部网络依赖。

## 安全说明

- 管理接口需 Bearer `ADMIN_TOKEN`；签到接口有签到码 + IP 限速（10 次/分）
- `server/data/` 已在 `.gitignore`，请勿提交数据库
- 大屏 `/` 与 `/bar` 是公开只读页面，适合现场投屏

## License

MIT（见 LICENSE）。大屏使用的 WONDERFUL US 字体与美术素材提取自活动方 PPT，仅限本项目内部使用。
