import { expect, test, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('@apps-in-toss/web-framework', () => ({ Storage: sdk }));
import { sdkStorage } from './sdk';
import { STORAGE_KEY } from './adapter';

test('SDK의 비동기 문자열 API에 같은 단일 키로 읽고 쓴다', async () => {
  sdk.getItem.mockResolvedValueOnce('원본').mockResolvedValueOnce(undefined);
  sdk.setItem.mockResolvedValue(undefined);
  expect(await sdkStorage.load()).toBe('원본');
  expect(await sdkStorage.load()).toBeNull();
  await sdkStorage.save('최신 JSON');
  expect(sdk.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  expect(sdk.setItem).toHaveBeenCalledWith(STORAGE_KEY, '최신 JSON');
});
