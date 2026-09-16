#!/usr/bin/env bash
# 一键部署：依赖 → 构建 → PM2 托管（更新代码请自行 git pull 后再跑本脚本）
# 用法：./deploy.sh   （首次部署：git clone 后 cp .env.example .env 改好再跑）
set -euo pipefail
cd "$(dirname "$0")"

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
