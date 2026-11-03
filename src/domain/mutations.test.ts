import { describe, expect, it } from 'vitest';
import type { AppData, Task, TaskStatus } from './model';
import {
  changeTaskStatus,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getDeleteTaskImpact,
  updateProject,
  updateTask,
} from './mutations';

const NOW = '2026-11-03T00:00:00.000Z';
const opts = { now: NOW };

const task = (id: string, predecessorIds: string[] = [], status: TaskStatus = 'todo', projectId = 'p1'): Task => ({
  id,
  projectId,
  name: id,
  durationDays: 1,
  status,
  predecessorIds,
  createdAt: 'old',
  updatedAt: 'old',
});

const project = (id: string) => ({ id, name: id, startDate: '2026-12-01', createdAt: 'old', updatedAt: 'old' });

function data(tasks: Task[]): AppData {
  return { projects: [project('p1'), project('p2')], tasks };
}

function deepFreeze<T>(o: T): T {
  Object.freeze(o);
  for (const v of Object.values(o as object)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  return o;
}

describe('projects', () => {
  it('creates with validation', () => {
    const r = createProject({ projects: [], tasks: [] }, { name: ' 이사 준비 ', startDate: '2026-12-01' }, { ...opts, createId: () => 'new' });
    expect(r).toEqual({
      ok: true,
      id: 'new',
      data: { projects: [{ id: 'new', name: '이사 준비', startDate: '2026-12-01', createdAt: NOW, updatedAt: NOW }], tasks: [] },
    });
    const bad = createProject({ projects: [], tasks: [] }, { name: '  ', startDate: '2026-12-01' });
    expect(bad).toEqual({ ok: false, error: { type: 'invalid_input', errors: { name: 'name_required' } } });
  });

  it('updates start date', () => {
    const r = updateProject(data([]), 'p1', { name: 'p1', startDate: '2027-01-01' }, opts);
    expect(r.ok && r.data.projects[0]).toMatchObject({ startDate: '2027-01-01', updatedAt: NOW, createdAt: 'old' });
    expect(updateProject(data([]), 'zz', { name: 'x', startDate: '2027-01-01' })).toMatchObject({ ok: false });
  });

  it('deleting a project deletes its tasks only', () => {
    const d = deepFreeze(data([task('A'), task('B', ['A']), task('X', [], 'todo', 'p2')]));
    const r = deleteProject(d, 'p1');
    expect(r.ok && r.data).toEqual({ projects: [project('p2')], tasks: [task('X', [], 'todo', 'p2')] });
  });
});

describe('tasks: create/update', () => {
  it('creates todo task with no predecessors', () => {
    const r = createTask(data([]), 'p1', { name: '기획', durationDays: 3 }, { ...opts, createId: () => 't' });
    expect(r.ok && r.data.tasks).toEqual([
      { id: 't', projectId: 'p1', name: '기획', durationDays: 3, status: 'todo', predecessorIds: [], createdAt: NOW, updatedAt: NOW },
    ]);
  });

  it('creates with multiple predecessors', () => {
    const r = createTask(data([task('UI'), task('API')]), 'p1', { name: 'IT', durationDays: 1, predecessorIds: ['UI', 'API'] }, { createId: () => 'IT' });
    expect(r.ok && r.data.tasks.find((t) => t.id === 'IT')!.predecessorIds).toEqual(['UI', 'API']);
  });

  it('rejects invalid input without change', () => {
    const d = deepFreeze(data([task('A')]));
    expect(updateTask(d, 'A', { name: 'A', durationDays: 0 })).toEqual({
      ok: false,
      error: { type: 'invalid_input', errors: { durationDays: 'duration_invalid' } },
    });
  });

  it('rejects self reference', () => {
    expect(updateTask(data([task('A')]), 'A', { name: 'A', durationDays: 1, predecessorIds: ['A'] })).toEqual({
      ok: false,
      error: { type: 'self_reference', taskId: 'A' },
    });
  });

  it('rejects cross-project and unknown predecessors', () => {
    const d = data([task('A'), task('X', [], 'todo', 'p2')]);
    expect(updateTask(d, 'A', { name: 'A', durationDays: 1, predecessorIds: ['X', 'nope'] })).toEqual({
      ok: false,
      error: { type: 'invalid_predecessor', predecessorIds: ['X', 'nope'] },
    });
    expect(createTask(d, 'p1', { name: 'n', durationDays: 1, predecessorIds: ['X'] })).toMatchObject({
      ok: false,
      error: { type: 'invalid_predecessor' },
    });
  });

  it('rejects indirect cycle and leaves data unchanged', () => {
    const d = deepFreeze(data([task('A'), task('B', ['A']), task('C', ['B'])]));
    const before = JSON.stringify(d);
    const r = updateTask(d, 'A', { name: 'A', durationDays: 1, predecessorIds: ['C'] });
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.type === 'cycle') expect(new Set(r.error.cycle)).toEqual(new Set(['A', 'B', 'C']));
    else throw new Error('expected cycle error');
    expect(JSON.stringify(d)).toBe(before);
  });

  it('update keeps status', () => {
    const r = updateTask(data([task('A', [], 'done')]), 'A', { name: 'A2', durationDays: 5 }, opts);
    expect(r.ok && r.data.tasks[0]).toMatchObject({ name: 'A2', durationDays: 5, status: 'done', updatedAt: NOW });
  });
});

describe('tasks: delete', () => {
  it('removes references and does not inherit predecessors', () => {
    const d = deepFreeze(data([task('A'), task('B', ['A']), task('C', ['B'])]));
    expect(getDeleteTaskImpact(d, 'B')).toEqual(['C']);
    const r = deleteTask(d, 'B', opts);
    expect(r.ok && r.data.tasks.map((t) => [t.id, t.predecessorIds])).toEqual([
      ['A', []],
      ['C', []],
    ]);
  });
  it('unknown task', () => {
    expect(deleteTask(data([]), 'x')).toEqual({ ok: false, error: { type: 'task_not_found', taskId: 'x' } });
  });
});

describe('tasks: status', () => {
  it('rejects starting a waiting task', () => {
    const d = deepFreeze(data([task('기획'), task('UI', ['기획'])]));
    expect(changeTaskStatus(d, 'UI', 'in_progress')).toEqual({ ok: false, error: { type: 'waiting', waitingOnIds: ['기획'] } });
    expect(changeTaskStatus(d, 'UI', 'done')).toMatchObject({ ok: false });
  });

  it('starts a ready task', () => {
    const r = changeTaskStatus(data([task('A', [], 'done'), task('B', ['A'])]), 'B', 'in_progress', opts);
    expect(r.ok && r.data.tasks[1]).toMatchObject({ status: 'in_progress', updatedAt: NOW });
  });

  it('reverting predecessor completion keeps successor status', () => {
    const d = data([task('A', [], 'done'), task('B', ['A'], 'in_progress')]);
    const r = changeTaskStatus(d, 'A', 'todo', opts);
    expect(r.ok && r.data.tasks.map((t) => t.status)).toEqual(['todo', 'in_progress']);
  });

  it('started task with incomplete predecessor can change to any status', () => {
    const d = data([task('A'), task('B', ['A'], 'in_progress')]);
    for (const s of ['todo', 'done', 'in_progress'] as const) {
      expect(changeTaskStatus(d, 'B', s).ok).toBe(true);
    }
  });
});
