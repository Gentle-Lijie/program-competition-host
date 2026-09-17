export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// API 基地址：默认同源（单端口部署）；前端单独托管（如 EdgeOne Pages）时
// 构建前设 VITE_API_BASE_URL=https://api.example.com 注入
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers, cache: 'no-store' });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}
