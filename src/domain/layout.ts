import { predecessorMap, successorMap, topologicalSort, type GraphTask } from './graph';

export type LayoutOptions = {
  nodeWidth: number;
  nodeHeight: number;
  /** 같은 단계 노드 사이 가로 간격. */
  gapX: number;
  /** 단계 사이 세로 간격(연결선 영역). */
  gapY: number;
  padding: number;
};

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeWidth: 136,
  nodeHeight: 64,
  gapX: 16,
  gapY: 48,
  padding: 16,
};

export type LayoutNode = {
  id: string;
  /** 0부터 시작하는 단계(선행 작업까지의 최장 깊이). */
  level: number;
  /** 단계 안 순서. */
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutEdge = { from: string; to: string };

export type GraphLayout = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  levelCount: number;
  width: number;
  height: number;
};

/**
 * 최장 깊이로 단계를 정하고, 단계 안 순서는 위 단계 선행 작업의 평균 위치(barycenter)로 정렬한다.
 * 동률은 입력 순서를 따른다. 순환이 있으면 예외를 던진다.
 */
export function layoutGraph(tasks: readonly GraphTask[], options: Partial<LayoutOptions> = {}): GraphLayout {
  const o = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const topo = topologicalSort(tasks);
  if (!topo.ok) throw new Error('layoutGraph: dependency cycle');
  const preds = predecessorMap(tasks);
  const succs = successorMap(tasks);
  const inputIndex = new Map(tasks.map((t, i) => [t.id, i]));

  const level = new Map<string, number>();
  for (const id of topo.order) {
    level.set(id, Math.max(-1, ...preds.get(id)!.map((p) => level.get(p)!)) + 1);
  }
  const levelCount = tasks.length === 0 ? 0 : Math.max(...level.values()) + 1;
  const levels: string[][] = Array.from({ length: levelCount }, () => []);
  for (const t of tasks) levels[level.get(t.id)!].push(t.id);

  const position = new Map<string, number>();
  levels.forEach((ids, l) => {
    if (l > 0) {
      const key = (id: string) => {
        const ps = preds.get(id)!;
        return ps.reduce((sum, p) => sum + position.get(p)!, 0) / ps.length;
      };
      ids.sort((a, b) => key(a) - key(b) || inputIndex.get(a)! - inputIndex.get(b)!);
    }
    ids.forEach((id, i) => position.set(id, i));
  });

  const maxPerLevel = Math.max(0, ...levels.map((ids) => ids.length));
  const rowWidth = (n: number) => n * o.nodeWidth + Math.max(0, n - 1) * o.gapX;
  const contentWidth = rowWidth(maxPerLevel);

  const nodes: LayoutNode[] = [];
  levels.forEach((ids, l) => {
    const offset = (contentWidth - rowWidth(ids.length)) / 2;
    ids.forEach((id, i) => {
      nodes.push({
        id,
        level: l,
        index: i,
        x: o.padding + offset + i * (o.nodeWidth + o.gapX),
        y: o.padding + l * (o.nodeHeight + o.gapY),
        width: o.nodeWidth,
        height: o.nodeHeight,
      });
    });
  });

  const edges: LayoutEdge[] = [];
  for (const id of topo.order) for (const s of succs.get(id)!) edges.push({ from: id, to: s });

  return {
    nodes,
    edges,
    levelCount,
    width: tasks.length === 0 ? 0 : contentWidth + o.padding * 2,
    height: levelCount === 0 ? 0 : levelCount * o.nodeHeight + (levelCount - 1) * o.gapY + o.padding * 2,
  };
}

/**
 * 선택 작업과 직접 연결된 선행·후속 작업만 남긴 부분 그래프.
 * 선행 참조는 부분 집합 안의 것만 남긴다. 기준 작업이 없으면 빈 배열.
 */
export function focusSubgraph<T extends GraphTask>(tasks: readonly T[], centerId: string): T[] {
  const center = tasks.find((t) => t.id === centerId);
  if (!center) return [];
  const keep = new Set<string>([centerId, ...center.predecessorIds]);
  for (const t of tasks) if (t.predecessorIds.includes(centerId)) keep.add(t.id);
  return tasks
    .filter((t) => keep.has(t.id))
    .map((t) => ({ ...t, predecessorIds: t.predecessorIds.filter((p) => keep.has(p)) }));
}
