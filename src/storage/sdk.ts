import { Storage, User } from '@apps-in-toss/web-framework';
import { STORAGE_KEY, type StorageAdapter } from './adapter';
import { USER_KEY_STORAGE_KEY, syncUserKey } from './userKey';

export const syncSdkUserKey = () => syncUserKey(() => User.getAnonymousKey(), {
  load: async () => (await Storage.getItem(USER_KEY_STORAGE_KEY)) ?? null,
  save: value => Storage.setItem(USER_KEY_STORAGE_KEY, value),
});

export const sdkStorage: StorageAdapter = {
  load: async () => (await Storage.getItem(STORAGE_KEY)) ?? null,
  save: async value => { await Storage.setItem(STORAGE_KEY, value); },
};
