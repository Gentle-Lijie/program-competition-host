#!/usr/bin/env bash
# 一键部署：git pull → 依赖 → 构建 → PM2 托管
# 用法：./deploy.sh   （首次部署：git clone 后 cp .env.example .env 改好再跑）
set -euo pipefail
cd "$(dirname "$0")"

echo "==> 拉取最新代码"
if [ -d .git ]; then
  # 运行时若改动过被跟踪的数据库，先暂存，避免 pull 冲突
  git stash --quiet --include-untracked -- 'server/data/app.sqlite*' 2>/dev/null || true
  git pull --ff-only
  git stash pop --quiet 2>/dev/null || true
fi

if [ ! -f .env ]; then
  echo "==> 缺少 .env，从模板创建（记得修改 ADMIN_TOKEN）"
  cp .env.example .env
fi

echo "==> 安装依赖"
npm install --no-audit --no-fund

echo "==> 构建前端"
npm run build -w web

echo "==> PM2 启动/重载"
if command -v pm2 >/dev/null 2>&1; then
  PM2=(pm2)
else
  echo "    （未安装 pm2，用 npx 临时拉起；建议 npm i -g pm2）"
  PM2=(npx --yes pm2)
fi
"${PM2[@]}" startOrReload ecosystem.config.cjs
"${PM2[@]}" save

echo "==> 完成。进程列表："
"${PM2[@]}" ls
