import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

// 表演者签到：每个节目一组名单（姓名 + 学号），进入节目页逐个勾选
export const performersRouter = Router();
performersRouter.use(requireAdmin);

const nowStr = () => new Date().toLocaleString('sv-SE').slice(0, 19);

// 某节目的名单（?program_id= 必填）
performersRouter.get('/performers', (req, res) => {
  const programId = Number(req.query.program_id);
  if (!programId) return res.status(400).json({ error: '缺少 program_id' });
  const rows = db
    .prepare('SELECT id, name, student_no, arrived, arrived_at FROM performers WHERE program_id=? ORDER BY id ASC')
    .all(programId);
  res.json(rows);
});

// CSV 批量导入：同一节目内按 (姓名, 学号) 去重
performersRouter.post('/performers/batch', (req, res) => {
  const programId = Number(req.body?.program_id);
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!programId) return res.status(400).json({ error: '缺少 program_id' });
  if (!rows.length) return res.status(400).json({ error: '没有可导入的行' });

  const program = db.prepare('SELECT id FROM programs WHERE id=?').get(programId);
  if (!program) return res.status(404).json({ error: '节目不存在' });

  const existing = new Set(
    db.prepare('SELECT name, student_no FROM performers WHERE program_id=?').all(programId)
      .map((r) => `${r.name}|${r.student_no}`),
  );
  const insert = db.prepare('INSERT INTO performers (program_id, name, student_no) VALUES (?, ?, ?)');
  const errors = [];
  let inserted = 0;

  db.transaction(() => {
    rows.forEach((r, i) => {
      const name = String(r?.name ?? '').trim();
      const studentNo = String(r?.student_no ?? '').trim();
      if (!name) {
        errors.push(`第 ${i + 1} 行：姓名为空`);
        return;
      }
      const key = `${name}|${studentNo}`;
      if (existing.has(key)) {
        errors.push(`第 ${i + 1} 行：${name}${studentNo ? '（' + studentNo + '）' : ''} 已在名单中，跳过`);
        return;
      }
      insert.run(programId, name.slice(0, 50), studentNo.slice(0, 30));
      existing.add(key);
      inserted++;
    });
  })();

  res.json({ inserted, skipped: rows.length - inserted, errors });
});

// 单人勾选
performersRouter.patch('/performers/:id/arrived', (req, res) => {
  const arrived = req.body?.arrived ? 1 : 0;
  const info = db
    .prepare('UPDATE performers SET arrived=?, arrived_at=? WHERE id=?')
    .run(arrived, arrived ? nowStr() : null, Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: '人员不存在' });
  res.json({ ok: true, arrived });
});

// 整个节目全部签到/取消
performersRouter.patch('/performers/program/:programId/arrived', (req, res) => {
  const arrived = req.body?.arrived ? 1 : 0;
  const info = db
    .prepare('UPDATE performers SET arrived=?, arrived_at=? WHERE program_id=?')
    .run(arrived, arrived ? nowStr() : null, Number(req.params.programId));
  res.json({ ok: true, changed: info.changes });
});

performersRouter.delete('/performers/:id', (req, res) => {
  const info = db.prepare('DELETE FROM performers WHERE id=?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: '人员不存在' });
  res.json({ ok: true });
});

// 清空某节目名单（重新导入前用）
performersRouter.delete('/performers/program/:programId', (req, res) => {
  const info = db.prepare('DELETE FROM performers WHERE program_id=?').run(Number(req.params.programId));
  res.json({ ok: true, deleted: info.changes });
});
