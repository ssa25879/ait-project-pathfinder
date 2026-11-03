import type { DisplayStatus, Task } from './model';

export type TaskReadiness = {
  displayStatus: DisplayStatus;
  /** 완료되지 않은 선행 작업 ID. */
  incompletePredecessorIds: string[];
  /** 대기 중일 때 사유가 되는 선행 작업 ID. 대기 중이 아니면 빈 배열. */
  waitingOnIds: string[];
  /** 진행 중·완료인데 선행 작업이 미완료일 때 경고 대상 ID. */
  warningPredecessorIds: string[];
};

export const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  done: '완료',
  in_progress: '진행 중',
  ready: '시작 가능',
  waiting: '대기 중',
};

export function getTaskReadiness(task: Task, byId: ReadonlyMap<string, Task>): TaskReadiness {
  const incomplete = [...new Set(task.predecessorIds)].filter((id) => {
    const p = byId.get(id);
    return p !== undefined && p.status !== 'done';
  });
  if (task.status !== 'todo') {
    return {
      displayStatus: task.status,
      incompletePredecessorIds: incomplete,
      waitingOnIds: [],
      warningPredecessorIds: incomplete,
    };
  }
  const waiting = incomplete.length > 0;
  return {
    displayStatus: waiting ? 'waiting' : 'ready',
    incompletePredecessorIds: incomplete,
    waitingOnIds: waiting ? incomplete : [],
    warningPredecessorIds: [],
  };
}

/** 같은 프로젝트의 작업 목록을 받아 작업별 판정 결과를 계산한다. */
export function computeReadiness(tasks: readonly Task[]): Map<string, TaskReadiness> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return new Map(tasks.map((t) => [t.id, getTaskReadiness(t, byId)]));
}

export type ProjectSummary = {
  total: number;
  /** 0~100 정수 백분율(반올림). 작업이 없으면 0. */
  progressPercent: number;
  counts: Record<DisplayStatus, number>;
};

export function summarizeProject(tasks: readonly Task[]): ProjectSummary {
  const counts: Record<DisplayStatus, number> = { done: 0, in_progress: 0, ready: 0, waiting: 0 };
  for (const r of computeReadiness(tasks).values()) counts[r.displayStatus]++;
  const total = tasks.length;
  return {
    total,
    progressPercent: total === 0 ? 0 : Math.round((counts.done / total) * 100),
    counts,
  };
}
