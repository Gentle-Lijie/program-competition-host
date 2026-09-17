import { Router } from 'express';
import { db } from '../db.js';
import { getCodeInfo, touchCode, getRotationSeconds } from '../codeRotation.js';
import { getGeofence, getMessages } from './checkin.js';
import { normalizeClassGroup } from './performers.js';

// 管理接口：无鉴权（活动期间内网/受信环境使用）
export const adminRouter = Router();

// 兼容旧前端的校验端点（始终通过）
adminRouter.get('/verify', (req, res) => res.json({ ok: true }));

// 节目列表（管理页用；附各节目名单进度——按「表演者=班级代码」匹配）
adminRouter.get('/programs/full', (req, res) => {
  const programs = db
    .prepare('SELECT id, name, performer, start_time FROM programs ORDER BY start_time ASC, id ASC')
    .all();
  const all = db.prepare('SELECT class, arrived FROM performers').all();

  const res1 = programs.map((p) => {
    const key = normalizeClassGroup(p.performer);
    const roster = all.filter((f) => normalizeClassGroup(f.class) === key);
    return {
      ...p,
      roster_total: roster.length,
      roster_arrived: roster.filter((f) => f.arrived).length,
    };
  });
  res.json(res1);
});

// 签到记录：分页 + 按班级聚合
adminRouter.get('/checkins', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 20));

  const total = db.prepare('SELECT COUNT(*) AS c FROM checkins').get().c;
  const rows = db
    .prepare('SELECT id, name, affiliation, device, created_at FROM checkins ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(pageSize, (page - 1) * pageSize);
  const byAffiliation = db
    .prepare('SELECT affiliation, COUNT(*) AS count FROM checkins GROUP BY affiliation ORDER BY count DESC')
    .all();

  res.json({ total, page, pageSize, rows, byAffiliation });
});

// 清空签到（活动重置）
adminRouter.delete('/checkins', (req, res) => {
  db.prepare('DELETE FROM checkins').run();
  res.json({ ok: true });
});

// 签到码管理
adminRouter.get('/settings/checkin-code', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key='checkin_code'").get();
  res.json({ code: row?.value ?? '' });
});

adminRouter.put('/settings/checkin-code', (req, res) => {
  const code = String(req.body?.code || '').trim();
  if (!/^\d{4,8}$/.test(code)) {
    return res.status(400).json({ error: '签到码应为 4-8 位数字' });
  }
  db.prepare("UPDATE settings SET value=? WHERE key='checkin_code'").run(code);
  touchCode(); // 手动换码重置轮换计时
  res.json({ ok: true, code });
});

// ---- 签到码轮换 ----
adminRouter.get('/settings/checkin-rotation', (req, res) => {
  res.json({ seconds: getRotationSeconds() });
});

adminRouter.put('/settings/checkin-rotation', (req, res) => {
  const s = Number(req.body?.seconds);
  if (!(s === 0 || (Number.isFinite(s) && s >= 10 && s <= 86400))) {
    return res.status(400).json({ error: '轮换秒数应为 0（关闭）或 10–86400 秒' });
  }
  db.prepare("INSERT INTO settings (key, value) VALUES ('checkin_rotate_seconds', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(String(Math.floor(s)));
  touchCode(); // 重置计时起点并重新调度
  res.json({ ok: true, seconds: Math.floor(s) });
});

// ---- 地理围栏（圆心 + 半径）----
adminRouter.get('/settings/geofence', (req, res) => {
  res.json(getGeofence());
});

adminRouter.put('/settings/geofence', (req, res) => {
  const { lat, lng, radius } = req.body || {};
  if (
    !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius) ||
    lat < -90 || lat > 90 || lng < -180 || lng > 180 || radius < 10 || radius > 1000000
  ) {
    return res.status(400).json({ error: '参数无效：纬度 ±90、经度 ±180、半径 10 米–1000 公里' });
  }
  db.prepare("INSERT INTO settings (key, value) VALUES ('geofence', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(JSON.stringify({ lat: Number(lat), lng: Number(lng), radius: Math.floor(radius) }));
  res.json({ ok: true });
});

adminRouter.delete('/settings/geofence', (req, res) => {
  db.prepare("DELETE FROM settings WHERE key='geofence'").run();
  res.json({ ok: true });
});

// ---- 签到提示文案 ----
adminRouter.get('/settings/checkin-messages', (req, res) => {
  res.json(getMessages());
});

adminRouter.put('/settings/checkin-messages', (req, res) => {
  const body = req.body || {};
  const clean = {};
  for (const key of ['wrong_code', 'geo_no_location', 'geo_out_of_range', 'duplicate']) {
    const v = typeof body[key] === 'string' ? body[key].trim() : '';
    if (!v || v.length > 100) {
      return res.status(400).json({ error: '文案不能为空且不超过 100 字' });
    }
    clean[key] = v;
  }
  db.prepare("INSERT INTO settings (key, value) VALUES ('checkin_messages', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(JSON.stringify(clean));
  res.json({ ok: true });
});
