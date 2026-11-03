import { describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from './adapter';
import { syncUserKey } from './userKey';

const hash = (value: string) => async () => ({ type: 'HASH' as const, hash: value });

describe('syncUserKey', () => {
  it('처음 받은 식별키를 저장한다', async () => {
    const storage = createMemoryStorage();
    await syncUserKey(hash('a'), storage);
    expect(await storage.load()).toBe('a');
  });

  it('같은 식별키면 다시 저장하지 않는다', async () => {
    const storage = createMemoryStorage('a');
    const save = vi.spyOn(storage, 'save');
    await syncUserKey(hash('a'), storage);
    expect(save).not.toHaveBeenCalled();
  });

  it('식별키가 바뀌면 새 값으로 저장한다', async () => {
    const storage = createMemoryStorage('a');
    await syncUserKey(hash('b'), storage);
    expect(await storage.load()).toBe('b');
  });

  it.each(['ERROR', undefined] as const)('실패 응답 %s은 저장하지 않는다', async response => {
    const storage = createMemoryStorage('a');
    await syncUserKey(async () => response, storage);
    expect(await storage.load()).toBe('a');
  });

  it('API나 저장소가 실패해도 예외를 던지지 않는다', async () => {
    await expect(syncUserKey(() => Promise.reject(new Error('x')), createMemoryStorage())).resolves.toBeUndefined();
    const broken = { load: () => Promise.reject(new Error('x')), save: async () => {} };
    await expect(syncUserKey(hash('a'), broken)).resolves.toBeUndefined();
  });
});
