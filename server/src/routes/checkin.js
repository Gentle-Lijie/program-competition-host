import { Router } from 'express';
import { db } from '../db.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getCodeInfo } from '../codeRotation.js';

export const checkinRouter = Router();

// ---------- 签到提示文案（后台可改） ----------
export const DEFAULT_CHECKIN_MESSAGES = {
  wrong_code: '签到失败，请核对信息或重新扫码',
  geo_no_location: '需要定位权限才能签到，请允许定位后重试',
  geo_out_of_range: '当前位置不在签到范围内（距离签到点约 {distance} 米，你的位置 {lat}, {lng}）',
  duplicate: '你已经签到过了，无需重复签到',
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
    server_now: Date.now(), // 供前端校准时钟偏移，倒计时不受两端时钟不一致影响
    geo_required: getGeofence() !== null,
    messages: getMessages(),
  });
});

// 观众签到：错码/越界统一 403（不区分具体原因，减少撞码反馈）
const limiter = rateLimit({ windowMs: 60_000, max: 10 });

checkinRouter.post('/checkin', limiter, (req, res) => {
  const { name, affiliation, code, lat, lng, device } = req.body || {};
  const expected = db.prepare("SELECT value FROM settings WHERE key='checkin_code'").get()?.value;
  const messages = getMessages();

  const cleanName = name?.trim().slice(0, 50) ?? '';
  const cleanAff = affiliation?.trim().slice(0, 50) ?? '';
  const cleanDevice = typeof device === 'string' ? device.trim().slice(0, 64) : '';

  if (!cleanName || !cleanAff || !code || code !== expected) {
    return res.status(403).json({ error: messages.wrong_code });
  }

  // 防重复：同一人（姓名+班级）或同一设备只允许签到一次
  const dup =
    db.prepare('SELECT id FROM checkins WHERE name=? AND affiliation=?').get(cleanName, cleanAff) ??
    (cleanDevice && db.prepare('SELECT id FROM checkins WHERE device=?').get(cleanDevice));
  if (dup) {
    return res.status(403).json({ error: messages.duplicate });
  }

  // 地理围栏：配置后必须在圆内签到
  const fence = getGeofence();
  if (fence) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(403).json({ error: messages.geo_no_location });
    }
    const distance = Math.round(haversineMeters(fence.lat, fence.lng, lat, lng));
    if (distance > fence.radius) {
      // 占位符：{distance} 米数、{lat}/{lng} 签到者坐标；未使用的占位符信息追加在末尾
      const vars = { distance: String(distance), lat: lat.toFixed(6), lng: lng.toFixed(6) };
      let msg = messages.geo_out_of_range
        .replaceAll('{distance}', vars.distance)
        .replaceAll('{lat}', vars.lat)
        .replaceAll('{lng}', vars.lng);
      const extra = [
        !messages.geo_out_of_range.includes('{distance}') && `距离签到点约 ${vars.distance} 米`,
        (!messages.geo_out_of_range.includes('{lat}') || !messages.geo_out_of_range.includes('{lng}')) &&
          `位置 ${vars.lat}, ${vars.lng}`,
      ].filter(Boolean);
      if (extra.length) msg += `（${extra.join('，')}）`;
      return res.status(403).json({ error: msg });
    }
  }

  const info = db
    .prepare('INSERT INTO checkins (name, affiliation, device) VALUES (?, ?, ?)')
    .run(cleanName, cleanAff, cleanDevice);

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
