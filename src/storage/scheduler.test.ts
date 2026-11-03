import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { bindVisibilityFlush, createSaveScheduler } from './scheduler';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('300ms 연속 변경 병합과 즉시 저장', async () => {
  const save = vi.fn(async (_value: string) => {});
  const scheduler = createSaveScheduler({ load: async () => null, save });
  scheduler.schedule('a');
  await vi.advanceTimersByTimeAsync(200);
  scheduler.schedule('b');
  await vi.advanceTimersByTimeAsync(299);
  expect(save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(save.mock.calls).toEqual([['b']]);
  scheduler.schedule('c');
  await scheduler.flush();
  expect(save.mock.calls).toEqual([['b'], ['c']]);
  scheduler.dispose();
});

test('쓰기 중 변경은 직렬화하고 마지막 값만 뒤이어 저장', async () => {
  let finish!: () => void;
  const save = vi.fn((_value: string) => new Promise<void>(resolve => { finish = resolve; }));
  const scheduler = createSaveScheduler({ load: async () => null, save });
  scheduler.schedule('a');
  await vi.advanceTimersByTimeAsync(300);
  scheduler.schedule('b');
  scheduler.schedule('c');
  await vi.advanceTimersByTimeAsync(1000);
  expect(save).toHaveBeenCalledTimes(1);
  finish();
  await vi.advanceTimersByTimeAsync(0);
  expect(save.mock.calls).toEqual([['a'], ['c']]);
  finish();
  await vi.advanceTimersByTimeAsync(0);
  scheduler.dispose();
});

test('1초·3초 재시도 후 오류, 수동 재시도는 최신 값 저장', async () => {
  let failing = true;
  const save = vi.fn(async (_value: string) => { if (failing) throw new Error('storage unavailable'); });
  const statuses: string[] = [];
  const scheduler = createSaveScheduler({ load: async () => null, save }, s => statuses.push(s));
  scheduler.schedule('a');
  await vi.advanceTimersByTimeAsync(300);
  await vi.advanceTimersByTimeAsync(999);
  expect(save).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(save).toHaveBeenCalledTimes(2);
  scheduler.schedule('b');
  await vi.advanceTimersByTimeAsync(2999);
  expect(save).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(save).toHaveBeenCalledTimes(3);
  expect(statuses.at(-1)).toBe('error');
  await vi.advanceTimersByTimeAsync(10000);
  expect(save).toHaveBeenCalledTimes(3);
  failing = false;
  scheduler.schedule('c');
  await scheduler.retry();
  expect(save.mock.calls.at(-1)).toEqual(['c']);
  expect(statuses.at(-1)).toBe('saved');
  scheduler.dispose();
});

test('visibilitychange hidden에서 대기 저장을 즉시 실행하고 해제한다', async () => {
  const target = new EventTarget() as Document;
  Object.defineProperty(target, 'visibilityState', { value: 'hidden' });
  const flush = vi.fn(async () => {});
  const unbind = bindVisibilityFlush({ flush }, target);
  target.dispatchEvent(new Event('visibilitychange'));
  expect(flush).toHaveBeenCalledTimes(1);
  unbind();
  target.dispatchEvent(new Event('visibilitychange'));
  expect(flush).toHaveBeenCalledTimes(1);
});
