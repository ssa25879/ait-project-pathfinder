import { predecessorMap, successorMap, topologicalSort } from './graph';
import type { Task } from './model';

export type TaskSchedule = {
  es: number;
  ef: number;
  ls: number;
  lf: number;
  slack: number;
  critical: boolean;
};

export type Edge = { from: string; to: string };

export type ScheduleResult = {
  totalDuration: number;
  byTask: Map<string, TaskSchedule>;
  /** 위상 순서의 핵심 작업 ID. */
  criticalTaskIds: string[];
  criticalEdges: Edge[];
};

export type ScheduleTask = Pick<Task, 'id' | 'predecessorIds' | 'durationDays'>;

/**
 * CPM. 작업 상태는 입력으로 쓰지 않는다.
 * 순환이 있으면 예외를 던진다(변경·저장 검증이 순환을 막으므로 정상 흐름에서는 발생하지 않음).
 */
export function computeSchedule(tasks: readonly ScheduleTask[]): ScheduleResult {
  const topo = topologicalSort(tasks);
  if (!topo.ok) throw new Error('computeSchedule: dependency cycle');
  const duration = new Map(tasks.map((t) => [t.id, t.durationDays]));
  const preds = predecessorMap(tasks);
  const succs = successorMap(tasks);

  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of topo.order) {
    const start = Math.max(0, ...preds.get(id)!.map((p) => ef.get(p)!));
    es.set(id, start);
    ef.set(id, start + duration.get(id)!);
  }
  const total = Math.max(0, ...ef.values());

  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  for (const id of [...topo.order].reverse()) {
    const s = succs.get(id)!;
    const finish = s.length === 0 ? total : Math.min(...s.map((x) => ls.get(x)!));
    lf.set(id, finish);
    ls.set(id, finish - duration.get(id)!);
  }

  const byTask = new Map<string, TaskSchedule>();
  for (const id of topo.order) {
    const slack = ls.get(id)! - es.get(id)!;
    byTask.set(id, { es: es.get(id)!, ef: ef.get(id)!, ls: ls.get(id)!, lf: lf.get(id)!, slack, critical: slack === 0 });
  }

  const criticalTaskIds = topo.order.filter((id) => byTask.get(id)!.critical);
  const criticalEdges: Edge[] = [];
  for (const id of topo.order) {
    const b = byTask.get(id)!;
    for (const p of preds.get(id)!) {
      const a = byTask.get(p)!;
      if (a.critical && b.critical && a.ef === b.es) criticalEdges.push({ from: p, to: id });
    }
  }
  return { totalDuration: total, byTask, criticalTaskIds, criticalEdges };
}

/** 기기 시간대 기준 날짜를 YYYY-MM-DD 문자열로 만든다. */
export function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** YYYY-MM-DD 문자열에 일 수를 더한다(UTC 기준). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  const yy = String(t.getUTCFullYear()).padStart(4, '0');
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(t.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** 포함 기준 예상 종료일 = 시작일 + 총 기간 - 1. 총 기간이 0이면 null(표시하지 않음). */
export function projectEndDate(startDate: string, totalDuration: number): string | null {
  if (totalDuration <= 0) return null;
  return addDays(startDate, totalDuration - 1);
}

/** 작업 표시 날짜. 시작 = 시작일 + ES, 종료 = 시작일 + EF - 1(포함 기준). */
export function taskDates(startDate: string, s: Pick<TaskSchedule, 'es' | 'ef'>): { start: string; end: string } {
  return { start: addDays(startDate, s.es), end: addDays(startDate, s.ef - 1) };
}
