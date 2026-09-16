// 加载仓库根的 .env（不存在则跳过；已在环境变量里显式设置的值优先）
// 必须是第一个 import——db.js 等模块在加载期就读取环境变量
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, raw] = m;
    const val = raw.replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
