import { Router } from 'express';
import { db } from '../db.js';

export const programsRouter = Router();

const TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

// 公开：节目列表（大屏/提示栏轮询；不含 arrived）
programsRouter.get('/programs', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, performer, start_time FROM programs ORDER BY start_time ASC, id ASC')
    .all();
  res.json(rows);
});

// ---- 以下为管理接口 ----

programsRouter.post('/programs', (req, res) => {
  const { name, performer, start_time } = req.body || {};
  const errors = validate({ name, performer, start_time });
  if (errors.length) return res.status(400).json({ error: errors.join('；') });

  const info = db
    .prepare('INSERT INTO programs (name, performer, start_time) VALUES (?, ?, ?)')
    .run(name.trim(), performer.trim(), start_time);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

programsRouter.put('/programs/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, performer, start_time } = req.body || {};
  const errors = validate({ name, performer, start_time });
  if (errors.length) return res.status(400).json({ error: errors.join('；') });

  const info = db
    .prepare('UPDATE programs SET name=?, performer=?, start_time=? WHERE id=?')
    .run(name.trim(), performer.trim(), start_time, id);
  if (info.changes === 0) return res.status(404).json({ error: '节目不存在' });
  res.json({ ok: true });
});

programsRouter.delete('/programs/:id', (req, res) => {
  const info = db.prepare('DELETE FROM programs WHERE id=?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: '节目不存在' });
  res.json({ ok: true });
});

// CSV 批量导入：前端解析为 JSON 行提交，单事务
programsRouter.post('/programs/batch', (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: '没有可导入的行' });

  const insert = db.prepare('INSERT INTO programs (name, performer, start_time) VALUES (?, ?, ?)');
  const errors = [];
  let inserted = 0;

  db.transaction(() => {
    rows.forEach((r, i) => {
      const errs = validate(r);
      if (errs.length) {
        errors.push(`第 ${i + 1} 行：${errs.join('；')}`);
        return;
      }
      insert.run(r.name.trim(), r.performer.trim(), r.start_time);
      inserted++;
    });
  })();

  res.json({ inserted, skipped: rows.length - inserted, errors });
});

function validate(r) {
  const errors = [];
  if (!r?.name?.trim()) errors.push('缺少节目名称');
  if (!r?.performer?.trim()) errors.push('缺少表演者');
  if (!r?.start_time || !TIME_RE.test(r.start_time)) errors.push('时间格式应为 YYYY-MM-DD HH:MM');
  return errors;
}
