export interface StorageAdapter {
  load(): Promise<string | null>;
  save(value: string): Promise<void>;
}

export const STORAGE_KEY = 'project-pathfinder:data';

export function createMemoryStorage(initial: string | null = null): StorageAdapter {
  let value = initial;
  return {
    load: async () => value,
    save: async next => { value = next; },
  };
}
