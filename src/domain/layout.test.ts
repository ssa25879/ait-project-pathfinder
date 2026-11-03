import { describe, expect, it } from 'vitest';
import { focusSubgraph, layoutGraph, type LayoutNode } from './layout';

const g = (id: string, ...predecessorIds: string[]) => ({ id, predecessorIds });

const overlaps = (a: LayoutNode, b: LayoutNode) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function assertValid(tasks: ReturnType<typeof g>[]) {
  const layout = layoutGraph(tasks);
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  expect(layout.nodes).toHaveLength(tasks.length);
  for (const t of tasks) {
    for (const p of t.predecessorIds) {
      expect(byId.get(p)!.level).toBeLessThan(byId.get(t.id)!.level);
      expect(byId.get(p)!.y).toBeLessThan(byId.get(t.id)!.y);
    }
  }
  for (let i = 0; i < layout.nodes.length; i++)
    for (let j = i + 1; j < layout.nodes.length; j++) expect(overlaps(layout.nodes[i], layout.nodes[j])).toBe(false);
  for (const n of layout.nodes) {
    expect(n.x + n.width).toBeLessThanOrEqual(layout.width);
    expect(n.y + n.height).toBeLessThanOrEqual(layout.height);
  }
  return layout;
}

const representative = [g('기획'), g('UI 제작', '기획'), g('API 개발', '기획'), g('통합 테스트', 'UI 제작', 'API 개발')];

describe('layoutGraph', () => {
  it('representative scenario has three levels and four edges', () => {
    const layout = assertValid(representative);
    expect(layout.levelCount).toBe(3);
    expect(layout.edges).toHaveLength(4);
    const level = Object.fromEntries(layout.nodes.map((n) => [n.id, n.level]));
    expect(level).toEqual({ 기획: 0, 'UI 제작': 1, 'API 개발': 1, '통합 테스트': 2 });
  });

  it('uses longest depth for skip-level links', () => {
    const layout = assertValid([g('A'), g('B', 'A'), g('C', 'A', 'B')]);
    expect(layout.nodes.find((n) => n.id === 'C')!.level).toBe(2);
  });

  it('empty graph', () => {
    expect(layoutGraph([])).toEqual({ nodes: [], edges: [], levelCount: 0, width: 0, height: 0 });
  });

  it('15 tasks with mixed structure do not overlap', () => {
    const tasks = [
      g('t1'), g('t2'), g('t3', 't1'), g('t4', 't1'), g('t5', 't2'), g('t6', 't3', 't5'), g('t7', 't4'),
      g('t8', 't4'), g('t9', 't6', 't7'), g('t10', 't8'), g('t11'), g('t12', 't9', 't10'), g('t13', 't1'),
      g('t14', 't12', 't13'), g('t15', 't14', 't11'),
    ];
    assertValid(tasks);
  });

  it('barycenter keeps children under their parents order', () => {
    // 입력 순서와 반대로 연결된 자식이 부모 순서를 따른다
    const layout = layoutGraph([g('P1'), g('P2'), g('C2', 'P2'), g('C1', 'P1')]);
    const idx = Object.fromEntries(layout.nodes.map((n) => [n.id, n.index]));
    expect(idx.C1).toBeLessThan(idx.C2);
  });

  it('throws on cycle', () => {
    expect(() => layoutGraph([g('A', 'B'), g('B', 'A')])).toThrow();
  });
});

describe('focusSubgraph', () => {
  it('keeps the center and its direct neighbours only', () => {
    const tasks = [...representative, g('배포', '통합 테스트')];
    const sub = focusSubgraph(tasks, 'UI 제작');
    expect(sub).toEqual([g('기획'), g('UI 제작', '기획'), g('통합 테스트', 'UI 제작')]);
    const layout = assertValid(sub);
    expect(layout.levelCount).toBe(3);
    expect(layout.edges).toHaveLength(2);
  });

  it('moving the center to a successor', () => {
    const tasks = [...representative, g('배포', '통합 테스트')];
    expect(focusSubgraph(tasks, '통합 테스트').map((t) => t.id).sort()).toEqual(['API 개발', 'UI 제작', '배포', '통합 테스트'].sort());
  });

  it('unknown center gives empty graph', () => {
    expect(focusSubgraph(representative, 'nope')).toEqual([]);
  });
});
