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

// ---------- 手动切换当前节目（current_override 指针，0 = 自动） ----------

const SET_SETTING =
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value';

function getOverrideId() {
  const row = db.prepare("SELECT value FROM settings WHERE key='current_override'").get();
  const n = parseInt(row?.value, 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

// 当前节目下标：override 优先（指向的节目不存在则回落时间驱动），否则按服务器本地时间
function computeCurrentIdx(list) {
  const override = getOverrideId();
  if (override) {
    const idx = list.findIndex((p) => p.id === override);
    if (idx >= 0) return idx;
  }
  const now = new Date().toLocaleString('sv-SE').slice(0, 16); // YYYY-MM-DD HH:MM
  let cur = -1;
  for (let i = 0; i < list.length; i++) {
    if (list[i].start_time <= now) cur = i;
    else break;
  }
  return cur;
}

programsRouter.get('/programs/state', (req, res) => {
  res.json({ override_id: getOverrideId() });
});

programsRouter.post('/programs/current/advance', (req, res) => {
  const list = db
    .prepare('SELECT id FROM programs ORDER BY start_time ASC, id ASC')
    .all();
  if (!list.length) return res.json({ ok: false });
  const next = list[Math.min(computeCurrentIdx(list) + 1, list.length - 1)];
  db.prepare(SET_SETTING).run('current_override', String(next.id));
  res.json({ ok: true, id: next.id });
});

programsRouter.post('/programs/current/back', (req, res) => {
  const list = db
    .prepare('SELECT id FROM programs ORDER BY start_time ASC, id ASC')
    .all();
  if (!list.length) return res.json({ ok: false });
  const prev = list[Math.max(computeCurrentIdx(list) - 1, 0)];
  db.prepare(SET_SETTING).run('current_override', String(prev.id));
  res.json({ ok: true, id: prev.id });
});

programsRouter.delete('/programs/current/override', (req, res) => {
  db.prepare("DELETE FROM settings WHERE key='current_override'").run();
  res.json({ ok: true });
});
