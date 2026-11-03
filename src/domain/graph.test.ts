import { describe, expect, it } from 'vitest';
import { findCycle, hasCycle, topologicalSort } from './graph';

const g = (id: string, ...predecessorIds: string[]) => ({ id, predecessorIds });

function assertTopo(order: string[], tasks: { id: string; predecessorIds: string[] }[]) {
  const pos = new Map(order.map((id, i) => [id, i]));
  for (const t of tasks) for (const p of t.predecessorIds) expect(pos.get(p)!).toBeLessThan(pos.get(t.id)!);
}

describe('topologicalSort', () => {
  it('linear', () => {
    const tasks = [g('C', 'B'), g('A'), g('B', 'A')];
    expect(topologicalSort(tasks)).toEqual({ ok: true, order: ['A', 'B', 'C'] });
  });
  it('parallel', () => {
    const tasks = [g('A'), g('B', 'A'), g('C', 'A'), g('D', 'B', 'C')];
    const r = topologicalSort(tasks);
    expect(r.ok).toBe(true);
    expect(r.order).toHaveLength(4);
    assertTopo(r.order, tasks);
  });
  it('independent tasks keep input order', () => {
    expect(topologicalSort([g('X'), g('Y'), g('Z')]).order).toEqual(['X', 'Y', 'Z']);
  });
  it('empty', () => {
    expect(topologicalSort([])).toEqual({ ok: true, order: [] });
  });
  it('fails on cycles', () => {
    expect(topologicalSort([g('A', 'A')]).ok).toBe(false);
    expect(hasCycle([g('A', 'C'), g('B', 'A'), g('C', 'B')])).toBe(true);
    expect(hasCycle([g('A'), g('B', 'A')])).toBe(false);
  });
});

describe('findCycle', () => {
  it('returns null for DAG', () => {
    expect(findCycle([g('A'), g('B', 'A'), g('C', 'A', 'B')])).toBeNull();
  });
  it('self reference', () => {
    expect(findCycle([g('A', 'A')])).toEqual(['A']);
  });
  it('indirect cycle path in predecessor -> successor order', () => {
    // A -> B -> C, C -> A
    const cycle = findCycle([g('A', 'C'), g('B', 'A'), g('C', 'B'), g('D', 'C')]);
    expect(cycle).not.toBeNull();
    expect(new Set(cycle)).toEqual(new Set(['A', 'B', 'C']));
    // 연속한 두 작업은 실제 간선이어야 한다
    const edges = new Set(['A>B', 'B>C', 'C>A']);
    cycle!.forEach((id, i) => expect(edges.has(`${id}>${cycle![(i + 1) % cycle!.length]}`)).toBe(true));
  });
});
