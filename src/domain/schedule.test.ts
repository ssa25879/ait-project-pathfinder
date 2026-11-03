import { describe, expect, it } from 'vitest';
import { addDays, computeSchedule, projectEndDate, taskDates } from './schedule';

const s = (id: string, durationDays: number, ...predecessorIds: string[]) => ({ id, durationDays, predecessorIds });

describe('computeSchedule', () => {
  it('linear A(2) -> B(3) -> C(4) = 9', () => {
    const r = computeSchedule([s('A', 2), s('B', 3, 'A'), s('C', 4, 'B')]);
    expect(r.totalDuration).toBe(9);
    expect(r.criticalTaskIds).toEqual(['A', 'B', 'C']);
  });

  it('parallel scenario: total 8 and C values', () => {
    const r = computeSchedule([s('A', 2), s('B', 5, 'A'), s('C', 3, 'A'), s('D', 1, 'B', 'C')]);
    expect(r.totalDuration).toBe(8);
    expect(r.byTask.get('C')).toEqual({ es: 2, ef: 5, ls: 4, lf: 7, slack: 2, critical: false });
    expect(r.criticalTaskIds).toEqual(['A', 'B', 'D']);
    expect(r.criticalEdges).toEqual([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'D' },
    ]);
  });

  it('empty project and single task', () => {
    const empty = computeSchedule([]);
    expect(empty.totalDuration).toBe(0);
    expect(empty.criticalTaskIds).toEqual([]);
    expect(empty.criticalEdges).toEqual([]);
    const one = computeSchedule([s('A', 3)]);
    expect(one.totalDuration).toBe(3);
    expect(one.byTask.get('A')).toEqual({ es: 0, ef: 3, ls: 0, lf: 3, slack: 0, critical: true });
  });

  it('independent groups', () => {
    const r = computeSchedule([s('A', 5), s('B', 2)]);
    expect(r.totalDuration).toBe(5);
    expect(r.byTask.get('A')!.slack).toBe(0);
    expect(r.byTask.get('B')!.slack).toBe(3);
  });

  it('multiple critical paths', () => {
    const r = computeSchedule([s('A', 2), s('B', 3, 'A'), s('C', 3, 'A'), s('D', 1, 'B', 'C')]);
    expect(r.totalDuration).toBe(6);
    expect(r.criticalTaskIds.sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(r.criticalEdges).toHaveLength(4);
  });

  it('direct link between critical tasks that is not critical', () => {
    const r = computeSchedule([s('A', 2), s('B', 3, 'A'), s('C', 1, 'A', 'B')]);
    expect(r.criticalTaskIds).toEqual(['A', 'B', 'C']);
    expect(r.criticalEdges).toEqual([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ]);
  });

  it('extending a task beyond its slack changes total and critical path', () => {
    const base = [s('A', 2), s('B', 5, 'A'), s('C', 3, 'A'), s('D', 1, 'B', 'C')];
    const r = computeSchedule(base.map((t) => (t.id === 'C' ? { ...t, durationDays: 6 } : t)));
    expect(r.totalDuration).toBe(9);
    expect(r.criticalTaskIds).toEqual(['A', 'C', 'D']);
  });

  it('ignores status (result depends only on durations and links)', () => {
    const plain = computeSchedule([s('A', 2), s('B', 3, 'A')]);
    const tasks = [
      { ...s('A', 2), status: 'done' },
      { ...s('B', 3, 'A'), status: 'in_progress' },
    ];
    const withStatus = computeSchedule(tasks);
    expect(withStatus).toEqual(plain);
  });

  it('throws on cycle', () => {
    expect(() => computeSchedule([s('A', 1, 'B'), s('B', 1, 'A')])).toThrow();
  });
});

describe('dates', () => {
  it('end date is inclusive', () => {
    expect(projectEndDate('2026-12-01', 9)).toBe('2026-12-09');
    expect(projectEndDate('2026-12-01', 1)).toBe('2026-12-01');
  });
  it('no end date for total 0', () => {
    expect(projectEndDate('2026-12-01', 0)).toBeNull();
  });
  it('month, year and leap boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(projectEndDate('2026-12-25', 10)).toBe('2027-01-03');
  });
  it('task dates from ES/EF', () => {
    expect(taskDates('2026-12-01', { es: 2, ef: 5 })).toEqual({ start: '2026-12-03', end: '2026-12-05' });
  });
});
