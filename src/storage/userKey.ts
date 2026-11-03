import type { StorageAdapter } from './adapter';

export const USER_KEY_STORAGE_KEY = 'project-pathfinder:user-key';

type KeyResponse = { type: 'HASH'; hash: string } | 'ERROR' | undefined;

/** 식별키를 한 번 확인해 달라졌을 때만 저장한다. 실패해도 앱 시작을 막지 않는다. */
export async function syncUserKey(getKey: () => Promise<KeyResponse>, storage: StorageAdapter): Promise<void> {
  try {
    const response = await getKey();
    if (!response || response === 'ERROR' || !response.hash) return;
    if ((await storage.load()) !== response.hash) await storage.save(response.hash);
  } catch {
    // 식별키는 핵심 기능에 쓰이지 않으므로 다음 실행 때 다시 확인한다.
  }
}
