import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

// 表演者名单：全局「班级 → 学生（姓名、学号）」
// 节目页按「节目.performer = 班级代码」匹配（支持 BDMA2601+MS2601 复合），不做外键级联
export const performersRouter = Router();
performersRouter.use(requireAdmin);

const nowStr = () => new Date().toLocaleString('sv-SE').slice(0, 19);

// 节目的表演者字段 → 班级列表（"BDMA2601+MS2601" → ["BDMA2601","MS2601"]）
export function classesOfProgram(performer) {
  return String(performer || '')
    .split(/[+\s、，,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 全量名单（按班级排序）；?classes=A,B 可过滤
performersRouter.get('/performers', (req, res) => {
  let sql = 'SELECT id, class, name, student_no, arrived, arrived_at FROM performers';
  const params = [];
  if (req.query.classes) {
    const classes = String(req.query.classes).split(',').map((s) => s.trim()).filter(Boolean);
    if (classes.length) {
      sql += ` WHERE class IN (${classes.map(() => '?').join(',')})`;
      params.push(...classes);
    }
  }
  sql += ' ORDER BY class ASC, id ASC';
  res.json(db.prepare(sql).all(...params));
});

// 外层批量导入：全局名单，按 (班级, 姓名, 学号) 去重
performersRouter.post('/performers/batch', (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: '没有可导入的行' });

  const existing = new Set(
    db.prepare('SELECT class, name, student_no FROM performers')
      .all()
      .map((r) => `${r.class}|${r.name}|${r.student_no}`),
  );
  const insert = db.prepare('INSERT INTO performers (class, name, student_no) VALUES (?, ?, ?)');
  const errors = [];
  let inserted = 0;

  db.transaction(() => {
    rows.forEach((r, i) => {
      const cls = String(r?.class ?? '').trim();
      const name = String(r?.name ?? '').trim();
      const studentNo = String(r?.student_no ?? '').trim();

      if (!cls || !name) {
        errors.push(`第 ${i + 1} 行：班级或姓名为空`);
        return;
      }
      const key = `${cls}|${name}|${studentNo}`;
      if (existing.has(key)) {
        errors.push(`第 ${i + 1} 行：${cls} ${name}${studentNo ? '（' + studentNo + '）' : ''} 已在名单中，跳过`);
        return;
      }
      insert.run(cls.slice(0, 50), name.slice(0, 50), studentNo.slice(0, 30));
      existing.add(key);
      inserted++;
    });
  })();

  res.json({ inserted, skipped: rows.length - inserted, errors });
});

// 单人签到/取消
performersRouter.patch('/performers/:id/arrived', (req, res) => {
  const arrived = req.body?.arrived ? 1 : 0;
  const info = db
    .prepare('UPDATE performers SET arrived=?, arrived_at=? WHERE id=?')
    .run(arrived, arrived ? nowStr() : null, Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: '人员不存在' });
  res.json({ ok: true, arrived });
});

// 按节目全部签到/取消：匹配该节目表演者对应的班级
performersRouter.patch('/performers/program/:programId/arrived', (req, res) => {
  const arrived = req.body?.arrived ? 1 : 0;
  const program = db.prepare('SELECT performer FROM programs WHERE id=?').get(Number(req.params.programId));
  if (!program) return res.status(404).json({ error: '节目不存在' });
  const classes = classesOfProgram(program.performer);
  if (!classes.length) return res.json({ ok: true, changed: 0 });

  const info = db
    .prepare(`UPDATE performers SET arrived=?, arrived_at=? WHERE class IN (${classes.map(() => '?').join(',')})`)
    .run(arrived, arrived ? nowStr() : null, ...classes);
  res.json({ ok: true, changed: info.changes });
});

performersRouter.delete('/performers/:id', (req, res) => {
  const info = db.prepare('DELETE FROM performers WHERE id=?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: '人员不存在' });
  res.json({ ok: true });
});

// 按节目清空：删除该节目对应班级的全部名单（全局删除，慎用）
performersRouter.delete('/performers/program/:programId', (req, res) => {
  const program = db.prepare('SELECT performer FROM programs WHERE id=?').get(Number(req.params.programId));
  if (!program) return res.status(404).json({ error: '节目不存在' });
  const classes = classesOfProgram(program.performer);
  if (!classes.length) return res.json({ ok: true, deleted: 0 });

  const info = db
    .prepare(`DELETE FROM performers WHERE class IN (${classes.map(() => '?').join(',')})`)
    .run(...classes);
  res.json({ ok: true, deleted: info.changes });
});
