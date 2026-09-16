import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// token 校验（登录页用；use(requireAdmin) 已拦截无效 token）
adminRouter.get('/verify', (req, res) => res.json({ ok: true }));

// 表演者到场标记
adminRouter.patch('/programs/:id/arrived', (req, res) => {
  const arrived = req.body?.arrived ? 1 : 0;
  const info = db.prepare('UPDATE programs SET arrived=? WHERE id=?').run(arrived, Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: '节目不存在' });
  res.json({ ok: true, arrived });
});

// 节目列表（含 arrived，供到场标记页）
adminRouter.get('/programs/full', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, performer, start_time, arrived FROM programs ORDER BY start_time ASC, id ASC')
    .all();
  res.json(rows);
});

// 签到记录：分页 + 按班级聚合
adminRouter.get('/checkins', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 20));

  const total = db.prepare('SELECT COUNT(*) AS c FROM checkins').get().c;
  const rows = db
    .prepare('SELECT id, name, affiliation, created_at FROM checkins ORDER BY id DESC LIMIT ? OFFSET ?')
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
  res.json({ ok: true, code });
});
