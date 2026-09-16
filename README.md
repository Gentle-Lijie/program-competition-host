# WONDERFUL US · 节目比赛管理

轻量级活动/晚会管理系统（Vue + Node + SQLite），提供：

- **节目单大屏**（`/`）：WONDERFUL US 原版视觉严格还原（原版背景/字体），动态渲染节目列表，当前节目高亮
- **大屏提示栏**（`/bar`）：底部「当前节目 / 下一节目」滚动条，透明背景可叠加 OBS
- **观众扫码签到**（`/checkin`）：手机扫码填姓名班级即签到；支持签到码定时轮换（N 秒自动换码）、地理围栏验证（管理员配置圆心+半径，Haversine 距离校验）、提示文案后台可改
- **独立签到屏**（`/checkin/screen`）：大二维码 + 签到码 + 换码倒计时，可投在任意副屏，自动跟随换码
- **表演者签到**（`/admin/arrived`）：节目列表页选节目 → 节目签到页呈现该节目全部表演者（姓名 + 学号）逐个勾选；名单按节目导入 CSV（表头自动识别/GBK/去重），支持整节目全签、搜索、清空重导
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

也可以把配置写进 `.env` 文件（参照 `.env.example`，已被 git 忽略；命令行里显式设置的变量优先）：

```bash
cp .env.example .env   # 然后编辑 ADMIN_TOKEN
npm run build && npm start
```

可选环境变量：

| 变量 | 默认 | 说明 |
|---|---|---|
| `ADMIN_TOKEN` | （无） | 后台管理密钥；不设置则所有管理接口返回 503 |
| `PORT` | `3000` | 监听端口 |
| `DB_PATH` | `server/data/app.sqlite` | SQLite 文件路径 |

## 使用流程

1. 打开 `/admin`，输入 `ADMIN_TOKEN` 登录
2. 「节目管理」里新增或导入 CSV（列序：`开始时间(YYYY-MM-DD HH:MM), 节目名称, 表演者`，首行表头自动跳过）
3. 大屏机浏览器开 `/`（全屏 F11），严格还原原版视觉；导播/采集场景用 `/bar`（底条以外全透明）
4. 观众签到：开「签到设置」页配置签到码/轮换/围栏/文案 → 「签到屏」投到副屏或画中画 → 手机扫码填姓名班级（配置了围栏时需允许定位）→ 后台「观众签到」实时看人数
5. 表演者签到：先在「表演者签到」页导入名单（`姓名, 班级`），现场按班级分组一个个勾；晚会节奏和排期脱节时，直接改节目的开始时间（提示栏 10 秒内自动切换）

## 开发

```bash
npm run dev    # server(3000, --watch) + vite(5173, 代理 /api)
npm test       # vitest：当前/下一节目判定纯函数
npm run build  # 产物部署用
```

## 部署（PM2 + HTTPS）

服务器上（首次）：

```bash
git clone https://github.com/Gentle-Lijie/program-competition-host.git
cd program-competition-host
cp .env.example .env   # 编辑：ADMIN_TOKEN 必改；端口可选
./deploy.sh            # 拉代码 → 装依赖 → 构建 → PM2 托管（之后更新也只跑这个）
```

`.env` 端口说明：

- `API_PORT=3000`：后端端口（默认单端口模式——静态页与 API 都由 `pch-api` 提供，反代这一个端口即可）
- `WEB_PORT=8080`（可选）：配置后 PM2 额外起一个 `pch-web`（vite preview）独立提供前端，`/api` 自动代理到后端——适合前端走 CDN/独立域名的场景

常用 PM2 命令：`pm2 ls` 看状态、`pm2 logs pch-api` 看日志、`pm2 restart pch-api` 重启。

> 注：`server/data/app.sqlite` 随仓库分发（含活动数据）；部署机运行产生的变更会在下次 `git pull` 前被 deploy.sh 自动 stash 保留。

用 Nginx/Caddy 反代到 HTTPS 即可（应用已开启 `trust proxy`，限速按 `X-Forwarded-For` 生效）。数据库与上传字体均在本地，无外部网络依赖。

## 安全说明

- 管理接口需 Bearer `ADMIN_TOKEN`；签到接口有签到码 + IP 限速（10 次/分）
- `server/data/` 已在 `.gitignore`，请勿提交数据库
- 大屏 `/` 与 `/bar` 是公开只读页面，适合现场投屏

## License

MIT（见 LICENSE）。大屏使用的 WONDERFUL US 字体与美术素材提取自活动方 PPT，仅限本项目内部使用。
