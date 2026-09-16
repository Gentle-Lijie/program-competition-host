// 内存 IP 限速（单进程够用；重启即清零，符合活动场景）
export function rateLimit({ windowMs, max }) {
  const hits = new Map(); // ip -> { count, resetAt }

  return function rateLimiter(req, res, next) {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    let rec = hits.get(ip);

    if (!rec || now > rec.resetAt) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(ip, rec);
    }
    rec.count++;

    if (rec.count > max) {
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }
    next();
  };
}
