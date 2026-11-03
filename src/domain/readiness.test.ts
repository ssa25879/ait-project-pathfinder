import { describe, expect, it } from 'vitest';
import type { Task, TaskStatus } from './model';
import { computeReadiness, summarizeProject } from './readiness';

const task = (id: string, status: TaskStatus = 'todo', predecessorIds: string[] = []): Task => ({
  id,
  projectId: 'p',
  name: id,
  durationDays: 1,
  status,
  predecessorIds,
  createdAt: '',
  updatedAt: '',
});

describe('computeReadiness', () => {
  it('four display states', () => {
    const r = computeReadiness([
      task('done', 'done'),
      task('doing', 'in_progress'),
      task('free'),
      task('blocked', 'todo', ['doing']),
    ]);
    expect(r.get('done')!.displayStatus).toBe('done');
    expect(r.get('doing')!.displayStatus).toBe('in_progress');
    expect(r.get('free')!.displayStatus).toBe('ready');
    expect(r.get('blocked')!.displayStatus).toBe('waiting');
  });

  it('waiting when only some predecessors are done, with reasons', () => {
    const r = computeReadiness([task('UI', 'done'), task('API', 'in_progress'), task('IT', 'todo', ['UI', 'API'])]);
    expect(r.get('IT')).toMatchObject({ displayStatus: 'waiting', waitingOnIds: ['API'], warningPredecessorIds: [] });
  });

  it('becomes ready when all predecessors done', () => {
    const r = computeReadiness([task('UI', 'done'), task('API', 'done'), task('IT', 'todo', ['UI', 'API'])]);
    expect(r.get('IT')).toMatchObject({ displayStatus: 'ready', waitingOnIds: [] });
  });

  it('warns but keeps status when started task has incomplete predecessor', () => {
    const r = computeReadiness([task('A', 'todo'), task('B', 'in_progress', ['A']), task('C', 'done', ['A'])]);
    expect(r.get('B')).toMatchObject({ displayStatus: 'in_progress', warningPredecessorIds: ['A'], waitingOnIds: [] });
    expect(r.get('C')).toMatchObject({ displayStatus: 'done', warningPredecessorIds: ['A'] });
  });

  it('no warning when predecessors are done', () => {
    const r = computeReadiness([task('A', 'done'), task('B', 'in_progress', ['A'])]);
    expect(r.get('B')!.warningPredecessorIds).toEqual([]);
  });
});

describe('summarizeProject', () => {
  it('empty project', () => {
    expect(summarizeProject([])).toEqual({
      total: 0,
      progressPercent: 0,
      counts: { done: 0, in_progress: 0, ready: 0, waiting: 0 },
    });
  });
  it('1 of 4 done is 25%', () => {
    const s = summarizeProject([task('A', 'done'), task('B', 'in_progress', ['A']), task('C', 'todo', ['B']), task('D')]);
    expect(s).toEqual({ total: 4, progressPercent: 25, counts: { done: 1, in_progress: 1, ready: 1, waiting: 1 } });
  });
  it('rounds percent', () => {
    expect(summarizeProject([task('A', 'done'), task('B'), task('C')]).progressPercent).toBe(33);
  });
});
