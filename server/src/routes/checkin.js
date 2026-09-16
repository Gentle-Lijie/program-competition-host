import { Router } from 'express';
import { db } from '../db.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getCodeInfo } from '../codeRotation.js';

export const checkinRouter = Router();

// ---------- 签到提示文案（后台可改） ----------
export const DEFAULT_CHECKIN_MESSAGES = {
  wrong_code: '签到失败，请核对信息或重新扫码',
  geo_no_location: '需要定位权限才能签到，请允许定位后重试',
  geo_out_of_range: '当前位置不在签到范围内',
};

export function getMessages() {
  const row = db.prepare("SELECT value FROM settings WHERE key='checkin_messages'").get();
  if (!row) return { ...DEFAULT_CHECKIN_MESSAGES };
  try {
    return { ...DEFAULT_CHECKIN_MESSAGES, ...JSON.parse(row.value) };
  } catch {
    return { ...DEFAULT_CHECKIN_MESSAGES };
  }
}

// ---------- 地理围栏 ----------
export function getGeofence() {
  const row = db.prepare("SELECT value FROM settings WHERE key='geofence'").get();
  if (!row) return null;
  try {
    const g = JSON.parse(row.value);
    if (Number.isFinite(g.lat) && Number.isFinite(g.lng) && Number.isFinite(g.radius)) return g;
  } catch { /* 损坏数据视为未配置 */ }
  return null;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 签到端公共配置（签到屏/手机页轮询）
checkinRouter.get('/checkin/config', (req, res) => {
  res.json({
    ...getCodeInfo(),
    geo_required: getGeofence() !== null,
    messages: getMessages(),
  });
});

// 观众签到：错码/越界统一 403（不区分具体原因，减少撞码反馈）
const limiter = rateLimit({ windowMs: 60_000, max: 10 });

checkinRouter.post('/checkin', limiter, (req, res) => {
  const { name, affiliation, code, lat, lng } = req.body || {};
  const expected = db.prepare("SELECT value FROM settings WHERE key='checkin_code'").get()?.value;
  const messages = getMessages();

  if (!name?.trim() || !affiliation?.trim() || !code || code !== expected) {
    return res.status(403).json({ error: messages.wrong_code });
  }

  // 地理围栏：配置后必须在圆内签到
  const fence = getGeofence();
  if (fence) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(403).json({ error: messages.geo_no_location });
    }
    if (haversineMeters(fence.lat, fence.lng, lat, lng) > fence.radius) {
      return res.status(403).json({ error: messages.geo_out_of_range });
    }
  }

  const info = db
    .prepare('INSERT INTO checkins (name, affiliation) VALUES (?, ?)')
    .run(name.trim().slice(0, 50), affiliation.trim().slice(0, 50));

  const count = db.prepare('SELECT COUNT(*) AS c FROM checkins').get().c;
  res.status(201).json({ ok: true, seq: Number(info.lastInsertRowid), count });
});

// 签到人数（后台统计轮询）
checkinRouter.get('/checkin/count', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS c FROM checkins').get().c;
  res.json({ count });
});

// 签到码（公开：投在签到屏二维码里）
checkinRouter.get('/checkin/code', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key='checkin_code'").get();
  res.json({ code: row?.value ?? '' });
});
