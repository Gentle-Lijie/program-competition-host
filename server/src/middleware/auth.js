// 管理接口鉴权：Bearer ADMIN_TOKEN
export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: '服务器未配置 ADMIN_TOKEN，管理接口不可用' });
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
