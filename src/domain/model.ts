export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type Project = {
  id: string;
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  durationDays: number;
  status: TaskStatus;
  predecessorIds: string[];
  createdAt: string;
  updatedAt: string;
};

/** 저장 원본 데이터(파생 값 제외). 저장 형식의 버전은 storage 계층에서 더한다. */
export type AppData = {
  projects: Project[];
  tasks: Task[];
};

export type DisplayStatus = 'done' | 'in_progress' | 'ready' | 'waiting';

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];

export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 50;
export const DURATION_MIN = 1;
export const DURATION_MAX = 999;

export function createId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand()}${rand()}`;
}

export function emptyData(): AppData {
  return { projects: [], tasks: [] };
}

export function tasksOfProject(data: AppData, projectId: string): Task[] {
  return data.tasks.filter((t) => t.projectId === projectId);
}
