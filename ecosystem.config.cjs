// PM2 配置：pch-api 永远启动；.env 里配置了 WEB_PORT 时再起独立的 pch-web（vite preview）
// 未配置 WEB_PORT = 单端口模式：API 与静态页都由 pch-api 提供
const fs = require('node:fs');
const path = require('node:path');

function readEnv() {
  const file = path.join(__dirname, '.env');
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = readEnv();
const apiPort = env.API_PORT || env.PORT || '3000';
const webPort = env.WEB_PORT || '';

const apps = [
  {
    name: 'pch-api',
    script: 'server/src/index.js',
    env: { API_PORT: apiPort },
  },
];

if (webPort) {
  apps.push({
    name: 'pch-web',
    script: 'node_modules/vite/bin/vite.js',
    args: ['preview', 'web', '--host', '--port', webPort],
    env: { WEB_PORT: webPort },
  });
}

module.exports = { apps };
