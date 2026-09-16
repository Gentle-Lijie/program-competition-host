// 迁移：PRAGMA user_version 驱动，首启自动建表 + seed
const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE programs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        performer  TEXT NOT NULL,
        start_time TEXT NOT NULL,
        arrived    INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      CREATE INDEX idx_programs_start ON programs(start_time);

      CREATE TABLE checkins (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        affiliation TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      CREATE INDEX idx_checkins_created ON checkins(created_at);

      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `,
    seed: (db) => {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('checkin_code', code);
    },
  },
];

export function migrate(db) {
  const current = db.pragma('user_version', { simple: true });
  for (const m of migrations) {
    if (m.version <= current) continue;
    db.transaction(() => {
      db.exec(m.sql);
      if (m.seed) m.seed(db);
      db.pragma(`user_version = ${m.version}`);
    })();
    console.log(`[db] migrated to v${m.version}`);
  }
}
