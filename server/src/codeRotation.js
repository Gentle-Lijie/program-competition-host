// 签到码定时轮换：按 checkin_code_updated + N 秒调度，到点换码并续排
// 跨重启安全：恢复时按 updated_at 计算剩余时间，过期则立即换码
import { db } from './db.js';

const SET = 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value';

let timer = null;

export function getRotationSeconds() {
  const row = db.prepare("SELECT value FROM settings WHERE key='checkin_rotate_seconds'").get();
  const n = parseInt(row?.value ?? '0', 10);
  return Number.isFinite(n) && n >= 10 && n <= 86400 ? n : 0;
}

export function getCodeInfo() {
  const code = db.prepare("SELECT value FROM settings WHERE key='checkin_code'").get()?.value ?? '';
  const updatedAt = Number(
    db.prepare("SELECT value FROM settings WHERE key='checkin_code_updated'").get()?.value ?? 0,
  );
  return { code, rotate_seconds: getRotationSeconds(), updated_at: updatedAt };
}

function rotate() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.prepare(SET).run('checkin_code', code);
  db.prepare(SET).run('checkin_code_updated', String(Date.now()));
  console.log('[checkin] 签到码已轮换');
  scheduleRotation();
}

export function scheduleRotation() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const n = getRotationSeconds();
  if (!n) return; // 0 = 关闭
  const { updated_at } = getCodeInfo();
  const nextIn = Math.max(0, updated_at + n * 1000 - Date.now());
  timer = setTimeout(rotate, nextIn);
}

// 手动换码/改配置后调用：重置计时起点并重新调度
export function touchCode() {
  db.prepare(SET).run('checkin_code_updated', String(Date.now()));
  scheduleRotation();
}
