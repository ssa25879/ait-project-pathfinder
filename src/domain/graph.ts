import type { Task } from './model';

export type GraphTask = Pick<Task, 'id' | 'predecessorIds'>;

export type TopoResult = { ok: boolean; order: string[] };

/** 각 작업의 직접 후속 작업 ID 목록. 집합 밖 ID를 가리키는 선행 참조는 무시한다. */
export function successorMap(tasks: readonly GraphTask[]): Map<string, string[]> {
  const ids = new Set(tasks.map((t) => t.id));
  const map = new Map<string, string[]>();
  for (const t of tasks) map.set(t.id, []);
  for (const t of tasks) {
    for (const p of new Set(t.predecessorIds)) {
      if (ids.has(p)) map.get(p)!.push(t.id);
    }
  }
  return map;
}

/** 각 작업의 유효한(집합 안, 중복 제거) 선행 작업 ID 목록. */
export function predecessorMap(tasks: readonly GraphTask[]): Map<string, string[]> {
  const ids = new Set(tasks.map((t) => t.id));
  return new Map(tasks.map((t) => [t.id, [...new Set(t.predecessorIds)].filter((p) => ids.has(p))]));
}

/** Kahn 알고리즘. 동률은 입력 순서를 유지한다. 순환이 있으면 ok=false. */
export function topologicalSort(tasks: readonly GraphTask[]): TopoResult {
  const succs = successorMap(tasks);
  const preds = predecessorMap(tasks);
  const indegree = new Map(tasks.map((t) => [t.id, preds.get(t.id)!.length]));
  const queue = tasks.filter((t) => indegree.get(t.id) === 0).map((t) => t.id);
  const order: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    order.push(id);
    for (const s of succs.get(id)!) {
      const d = indegree.get(s)! - 1;
      indegree.set(s, d);
      if (d === 0) queue.push(s);
    }
  }
  return { ok: order.length === tasks.length, order };
}

export function hasCycle(tasks: readonly GraphTask[]): boolean {
  return !topologicalSort(tasks).ok;
}

/**
 * 순환 경로를 선행 → 후속 방향의 ID 목록으로 반환한다(첫 ID를 끝에 반복하지 않음).
 * 자기 참조는 [id]. 순환이 없으면 null.
 */
export function findCycle(tasks: readonly GraphTask[]): string[] | null {
  const succs = successorMap(tasks);
  const state = new Map<string, 1 | 2>(); // 1 방문 중, 2 완료
  const stack: string[] = [];

  const visit = (id: string): string[] | null => {
    state.set(id, 1);
    stack.push(id);
    for (const next of succs.get(id)!) {
      const s = state.get(next);
      if (s === 1) return stack.slice(stack.indexOf(next));
      if (s === undefined) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };

  for (const t of tasks) {
    if (!state.has(t.id)) {
      const found = visit(t.id);
      if (found) return found;
    }
  }
  return null;
}
