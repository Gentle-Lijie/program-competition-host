import { describe, expect, it } from 'vitest';
import { computeCurrentNext, fmtKey, type Program } from './programState';

const P = (id: number, start_time: string): Program => ({ id, name: `节目${id}`, performer: 'x', start_time });
const D = (s: string) => new Date(`2026-09-16T${s}:00`);

describe('computeCurrentNext', () => {
  it('空列表', () => {
    expect(computeCurrentNext([], D('12:00'))).toEqual({ current: null, next: null });
  });

  it('全部在未来：无当前，第一场为下一', () => {
    const r = computeCurrentNext([P(1, '2026-09-16 19:00'), P(2, '2026-09-16 19:30')], D('10:00'));
    expect(r.current).toBeNull();
    expect(r.next?.id).toBe(1);
  });

  it('进行中：最后一个已开始的为当前', () => {
    const r = computeCurrentNext([P(1, '2026-09-16 10:00'), P(2, '2026-09-16 10:10'), P(3, '2026-09-16 10:20')], D('10:15'));
    expect(r.current?.id).toBe(2);
    expect(r.next?.id).toBe(3);
  });

  it('恰好开始的一刻即为当前', () => {
    const r = computeCurrentNext([P(1, '2026-09-16 10:00')], D('10:00'));
    expect(r.current?.id).toBe(1);
    expect(r.next).toBeNull();
  });

  it('最后一场开始后永远算当前（无下一）', () => {
    const r = computeCurrentNext([P(1, '2026-09-16 19:00'), P(2, '2026-09-16 19:30')], D('23:59'));
    expect(r.current?.id).toBe(2);
    expect(r.next).toBeNull();
  });

  it('乱序输入自动排序', () => {
    const r = computeCurrentNext([P(2, '2026-09-16 19:30'), P(1, '2026-09-16 19:00')], D('19:10'));
    expect(r.current?.id).toBe(1);
    expect(r.next?.id).toBe(2);
  });

  it('跨天：昨天的节目仍是当前', () => {
    const r = computeCurrentNext([P(1, '2026-09-15 19:00'), P(2, '2026-09-16 19:00')], D('09-16 10:00'.replace('09-16 ', '')));
    expect(r.current?.id).toBe(1);
    expect(r.next?.id).toBe(2);
  });
});

describe('fmtKey', () => {
  it('补零格式', () => {
    expect(fmtKey(new Date(2026, 8, 6, 9, 5))).toBe('2026-09-06 09:05');
  });
});
