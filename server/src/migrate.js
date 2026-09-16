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
  {
    // v2：签到码轮换与地理围栏所需的 settings 键（老库补种）
    version: 2,
    sql: '',
    seed: (db) => {
      db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('checkin_rotate_seconds', '0')").run();
      db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('checkin_code_updated', '${Date.now()}')`).run();
    },
  },
  {
    // v3：表演者签到名单（按班级分组逐个勾选）
    version: 3,
    sql: `
      CREATE TABLE IF NOT EXISTS performers (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        class      TEXT NOT NULL,
        arrived    INTEGER NOT NULL DEFAULT 0,
        arrived_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      CREATE INDEX IF NOT EXISTS idx_performers_class ON performers(class);
    `,
  },
  {
    // v4：名单改为按节目归属（姓名 + 学号）
    version: 4,
    sql: `
      DROP TABLE IF EXISTS performers;
      CREATE TABLE performers (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        program_id  INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        student_no  TEXT NOT NULL DEFAULT '',
        arrived     INTEGER NOT NULL DEFAULT 0,
        arrived_at  TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      CREATE INDEX idx_performers_program ON performers(program_id);
    `,
  },
  {
    // v5：名单改为按节目归属
    version: 5,
    sql: `
      DROP TABLE IF EXISTS performers;
      CREATE TABLE performers (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        program_id  INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        class       TEXT NOT NULL DEFAULT '',
        name        TEXT NOT NULL,
        student_no  TEXT NOT NULL DEFAULT '',
        arrived     INTEGER NOT NULL DEFAULT 0,
        arrived_at  TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      CREATE INDEX idx_performers_program ON performers(program_id);
    `,
  },
  {
    // v6：名单全局化（班级 → 学生），节目页按「表演者=班级代码」匹配，无外键级联
    version: 6,
    sql: `
      DROP TABLE IF EXISTS performers;
      CREATE TABLE performers (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        class       TEXT NOT NULL,
        name        TEXT NOT NULL,
        student_no  TEXT NOT NULL DEFAULT '',
        arrived     INTEGER NOT NULL DEFAULT 0,
        arrived_at  TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      CREATE INDEX idx_performers_class ON performers(class);
    `,
  },
  {
    // v7：观众签到防重复——记录设备指纹
    version: 7,
    sql: `
      ALTER TABLE checkins ADD COLUMN device TEXT NOT NULL DEFAULT '';
      CREATE INDEX IF NOT EXISTS idx_checkins_device ON checkins(device);
    `,
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
