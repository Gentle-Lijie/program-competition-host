import './env.js'; // 必须最先：加载 .env（先于 db.js 读 DB_PATH）
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import './db.js'; // 副作用：建库 + 迁移
import { scheduleRotation } from './codeRotation.js';
import { programsRouter } from './routes/programs.js';
import { checkinRouter } from './routes/checkin.js';
import { adminRouter } from './routes/admin.js';

scheduleRotation(); // 签到码定时轮换（若已开启）

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true); // 用户会反代（HTTPS），取 X-Forwarded-For 作为 req.ip
app.use(express.json({ limit: '1mb' }));

// API
app.use('/api', programsRouter);
app.use('/api', checkinRouter);
app.use('/api/admin', adminRouter);

// 静态托管前端构建产物 + SPA history fallback
const dist = path.join(__dirname, '../../web/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  console.log('[warn] web/dist 不存在，仅提供 API（先运行 npm run build）');
}

// 统一错误兜底
app.use((err, req, res, next) => {
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`[server] http://localhost:${port}  (ADMIN_TOKEN ${process.env.ADMIN_TOKEN ? '已配置' : '未配置！管理接口不可用'})`);
});
