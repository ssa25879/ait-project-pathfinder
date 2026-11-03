import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createAppStore } from './store';
import { createMemoryStorage, serialize } from '../storage';
import { createProject, emptyData } from '../domain';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test.each(['{', '{"version":2}'])('복원 보호 상태에서 변경과 저장 차단: %s', async raw => {
  const save = vi.fn(async (_value: string) => {});
  const store = createAppStore({ load: async () => raw, save });
  expect(store.getSnapshot().status).toBe('loading');
  await store.retryLoad();
  expect(store.getSnapshot().status).toBe(raw === '{' ? 'load_error' : 'newer_version');
  expect(() => store.createProject({ name: '새 프로젝트', startDate: '2026-11-03' })).toThrow();
  await store.retrySave();
  await vi.runAllTimersAsync();
  expect(save).not.toHaveBeenCalled();
  store.dispose();
});

test('읽기 실패 뒤 재시도 복원, 복원만으로 쓰지 않는다', async () => {
  let fail = true;
  const original = createProject(emptyData(), { name: '원본', startDate: '2026-11-03' });
  if (!original.ok) throw new Error('fixture');
  const save = vi.fn(async (_value: string) => {});
  const store = createAppStore({ load: async () => { if (fail) throw new Error('read'); return serialize(original.data); }, save });
  await store.retryLoad();
  expect(store.getSnapshot().status).toBe('load_error');
  fail = false;
  await store.retryLoad();
  expect(store.getSnapshot().data).toEqual(original.data);
  await vi.runAllTimersAsync();
  expect(save).not.toHaveBeenCalled();
  store.dispose();
});

test('도메인 변경과 메모리 저장 복원 및 selector 메모이즈', async () => {
  const storage = createMemoryStorage();
  const store = createAppStore(storage);
  await store.retryLoad();
  const result = store.createProject({ name: '새 프로젝트', startDate: '2026-11-03' });
  if (!result.ok) throw new Error('fixture');
  const task = store.createTask(result.id!, { name: '작업', durationDays: 3 });
  expect(task.ok).toBe(true);
  const view = store.projectView(result.id!);
  expect(store.projectView(result.id!)).toBe(view);
  expect(view?.schedule.totalDuration).toBe(3);
  expect(view?.summary.total).toBe(1);
  expect(store.projectView('missing')).toBeNull();
  await vi.advanceTimersByTimeAsync(300);
  const restored = createAppStore(storage);
  await restored.retryLoad();
  expect(restored.getSnapshot().data).toEqual(store.getSnapshot().data);
  expect(store.getSnapshot().saveState).toBe('idle');
  store.dispose(); restored.dispose();
});

test('쓰기 실패 후 입력 유지, 수동 재시도 성공', async () => {
  let fail = true;
  const save = vi.fn(async (_value: string) => { if (fail) throw new Error('write'); });
  const store = createAppStore({ load: async () => null, save });
  await store.retryLoad();
  store.createProject({ name: '보존할 입력', startDate: '2026-11-03' });
  await vi.advanceTimersByTimeAsync(4300);
  expect(save).toHaveBeenCalledTimes(3);
  expect(store.getSnapshot().saveState).toBe('error');
  expect(store.getSnapshot().data.projects[0].name).toBe('보존할 입력');
  fail = false;
  await store.retrySave();
  expect(store.getSnapshot().saveState).toBe('idle');
  store.dispose();
});
