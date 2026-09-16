import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

// 表演者签到名单：导入 → 按班级分组逐个勾选
export const performersRouter = Router();
performersRouter.use(requireAdmin);

performersRouter.get('/performers', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, class, arrived, arrived_at FROM performers ORDER BY class ASC, id ASC')
    .all();
  res.json(rows);
});

performersRouter.post('/performers', (req, res) => {
  const { name, class: cls } = req.body || {};
  if (!name?.trim() || !cls?.trim()) {
    return res.status(400).json({ error: '姓名和班级都不能为空' });
  }
  const info = db
    .prepare('INSERT INTO performers (name, class) VALUES (?, ?)')
    .run(name.trim().slice(0, 50), cls.trim().slice(0, 50));
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

// CSV 批量导入：按 (姓名, 班级) 去重（含库内已存在）
performersRouter.post('/performers/batch', (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: '没有可导入的行' });

  const existing = new Set(
    db.prepare('SELECT name, class FROM performers').all().map((r) => `${r.name}|${r.class}`),
  );
  const insert = db.prepare('INSERT INTO performers (name, class) VALUES (?, ?)');
  const errors = [];
  let inserted = 0;

  db.transaction(() => {
    rows.forEach((r, i) => {
      const name = String(r?.name ?? '').trim();
      const cls = String(r?.class ?? '').trim();
      if (!name || !cls) {
        errors.push(`第 ${i + 1} 行：姓名或班级为空`);
        return;
      }
      const key = `${name}|${cls}`;
      if (existing.has(key)) {
        errors.push(`第 ${i + 1} 行：${cls} ${name} 已在名单中，跳过`);
        return;
      }
      insert.run(name.slice(0, 50), cls.slice(0, 50));
      existing.add(key);
      inserted++;
    });
  })();

  res.json({ inserted, skipped: rows.length - inserted, errors });
});

performersRouter.patch('/performers/:id/arrived', (req, res) => {
  const arrived = req.body?.arrived ? 1 : 0;
  const info = db
    .prepare('UPDATE performers SET arrived=?, arrived_at=? WHERE id=?')
    .run(arrived, arrived ? new Date().toLocaleString('sv-SE').slice(0, 19) : null, Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: '人员不存在' });
  res.json({ ok: true, arrived });
});

// 整班标记（全到/全取消）
performersRouter.patch('/performers/class/:cls/arrived', (req, res) => {
  const arrived = req.body?.arrived ? 1 : 0;
  const info = db
    .prepare('UPDATE performers SET arrived=?, arrived_at=? WHERE class=?')
    .run(arrived, arrived ? new Date().toLocaleString('sv-SE').slice(0, 19) : null, req.params.cls);
  res.json({ ok: true, changed: info.changes });
});

performersRouter.delete('/performers/:id', (req, res) => {
  const info = db.prepare('DELETE FROM performers WHERE id=?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: '人员不存在' });
  res.json({ ok: true });
});

// 清空名单（重新导入前用）
performersRouter.delete('/performers', (req, res) => {
  db.prepare('DELETE FROM performers').run();
  res.json({ ok: true });
});
