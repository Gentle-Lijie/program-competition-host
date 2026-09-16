import { Router } from 'express';
import { db } from '../db.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const checkinRouter = Router();

// 观众签到：错码统一 403（不区分具体原因，减少撞码反馈）
const limiter = rateLimit({ windowMs: 60_000, max: 10 });

checkinRouter.post('/checkin', limiter, (req, res) => {
  const { name, affiliation, code } = req.body || {};
  const expected = db.prepare("SELECT value FROM settings WHERE key='checkin_code'").get()?.value;

  if (!name?.trim() || !affiliation?.trim() || !code || code !== expected) {
    return res.status(403).json({ error: '签到失败，请核对信息或重新扫码' });
  }

  const info = db
    .prepare('INSERT INTO checkins (name, affiliation) VALUES (?, ?)')
    .run(name.trim().slice(0, 50), affiliation.trim().slice(0, 50));

  const count = db.prepare('SELECT COUNT(*) AS c FROM checkins').get().c;
  res.status(201).json({ ok: true, seq: Number(info.lastInsertRowid), count });
});

// 签到人数（大屏角标 / 后台统计轮询）
checkinRouter.get('/checkin/count', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS c FROM checkins').get().c;
  res.json({ count });
});

// 签到码（公开：本来就要投在大屏二维码里）
checkinRouter.get('/checkin/code', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key='checkin_code'").get();
  res.json({ code: row?.value ?? '' });
});
