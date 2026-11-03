import type { StorageAdapter } from './adapter';

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'retrying' | 'error';

export function createSaveScheduler(storage: StorageAdapter, onStatus: (status: SaveStatus) => void = () => {}) {
  let pending: string | undefined;
  let running: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let status: SaveStatus = 'saved';
  let failures = 0;
  let disposed = false;
  const setStatus = (next: SaveStatus) => { status = next; if (!disposed) onStatus(next); };
  const clearTimer = () => { clearTimeout(timer); timer = undefined; };

  function start(): Promise<void> {
    if (disposed || status === 'error' || status === 'retrying') return Promise.resolve();
    if (running) return running;
    if (pending === undefined) return Promise.resolve();
    clearTimer();
    const value = pending;
    pending = undefined;
    setStatus('saving');
    let succeeded = false;
    running = Promise.resolve().then(() => storage.save(value)).then(() => {
      succeeded = true;
      failures = 0;
      if (!disposed) setStatus(pending === undefined ? 'saved' : 'pending');
    }, () => {
      if (disposed) return;
      pending ??= value;
      failures++;
      if (failures > 2) { setStatus('error'); return; }
      setStatus('retrying');
      timer = setTimeout(() => {
        timer = undefined;
        setStatus('pending');
        void start();
      }, failures === 1 ? 1000 : 3000);
    }).finally(() => {
      running = null;
      if (succeeded && !disposed && pending !== undefined) void start();
    });
    return running;
  }

  return {
    schedule(value: string) {
      if (disposed) return;
      pending = value;
      if (running || status === 'retrying' || status === 'error') return;
      clearTimer();
      setStatus('pending');
      timer = setTimeout(() => { timer = undefined; void start(); }, 300);
    },
    flush: start,
    retry() {
      if (disposed || status !== 'error') return Promise.resolve();
      failures = 0;
      setStatus('pending');
      return start();
    },
    dispose() { disposed = true; clearTimer(); pending = undefined; },
  };
}

export function bindVisibilityFlush(scheduler: Pick<ReturnType<typeof createSaveScheduler>, 'flush'>, target: Document) {
  const listener = () => { if (target.visibilityState === 'hidden') void scheduler.flush(); };
  target.addEventListener('visibilitychange', listener);
  return () => target.removeEventListener('visibilitychange', listener);
}
