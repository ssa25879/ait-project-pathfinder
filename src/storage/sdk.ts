import { Storage } from '@apps-in-toss/web-framework';
import { STORAGE_KEY, type StorageAdapter } from './adapter';

export const sdkStorage: StorageAdapter = {
  load: async () => (await Storage.getItem(STORAGE_KEY)) ?? null,
  save: async value => { await Storage.setItem(STORAGE_KEY, value); },
};
