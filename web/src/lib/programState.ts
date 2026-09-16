// 核心：当前/下一节目判定（纯函数，前端每秒重算）
// start_time 为 'YYYY-MM-DD HH:MM' 本地 naive 串，字典序即时间序。

export interface Program {
  id: number;
  name: string;
  performer: string;
  start_time: string;
}

export interface CurrentNext {
  current: Program | null;
  next: Program | null;
}

export function fmtKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function computeCurrentNext(programs: Program[], now: Date): CurrentNext {
  const sorted = [...programs].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const nowKey = fmtKey(now);

  let currentIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].start_time <= nowKey) currentIdx = i;
    else break;
  }

  if (currentIdx === -1) {
    // 全部在未来：第一场即"下一"，没有"当前"
    return { current: null, next: sorted[0] ?? null };
  }
  return {
    current: sorted[currentIdx],
    next: sorted[currentIdx + 1] ?? null, // 最后一场开始后永远算"当前"
  };
}
