import { emptyData, topologicalSort, validateProjectInput, validateTaskInput, TASK_STATUSES, type AppData, type Project, type Task } from '../domain';

export type LoadResult =
  | { status: 'ready'; data: AppData }
  | { status: 'load_error' }
  | { status: 'newer_version' };

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const timestamp = (value: unknown): value is string => text(value) && Number.isFinite(Date.parse(value));
const common = (value: Record<string, unknown>) => text(value.id) && typeof value.name === 'string' &&
  (value.description === undefined || typeof value.description === 'string') && timestamp(value.createdAt) && timestamp(value.updatedAt);

export function deserialize(value: string | null): LoadResult {
  if (value === null) return { status: 'ready', data: emptyData() };
  try {
    const parsed: unknown = JSON.parse(value);
    if (!record(parsed) || !Number.isInteger(parsed.version)) return { status: 'load_error' };
    if ((parsed.version as number) > 1) return { status: 'newer_version' };
    // 버전 0은 버전 1과 같은 원본 필드 구조를 가진 초기 형식으로 취급한다.
    if (parsed.version !== 0 && parsed.version !== 1) return { status: 'load_error' };
    if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) return { status: 'load_error' };
    for (const p of parsed.projects) {
      if (!record(p) || !common(p) || typeof p.startDate !== 'string' || !validateProjectInput(p as Project).ok) return { status: 'load_error' };
    }
    for (const t of parsed.tasks) {
      if (!record(t) || !common(t) || !text(t.projectId) || typeof t.durationDays !== 'number' ||
        !TASK_STATUSES.includes(t.status as Task['status']) || !Array.isArray(t.predecessorIds) ||
        !t.predecessorIds.every(text) || new Set(t.predecessorIds).size !== t.predecessorIds.length ||
        !validateTaskInput(t as Task).ok) return { status: 'load_error' };
    }
    const data = { projects: parsed.projects as Project[], tasks: parsed.tasks as Task[] };
    const projectIds = new Set(data.projects.map(p => p.id));
    const byId = new Map(data.tasks.map(t => [t.id, t]));
    if (projectIds.size !== data.projects.length || byId.size !== data.tasks.length) return { status: 'load_error' };
    for (const t of data.tasks) {
      if (!projectIds.has(t.projectId) || t.predecessorIds.some(id => byId.get(id)?.projectId !== t.projectId)) return { status: 'load_error' };
    }
    if (!topologicalSort(data.tasks).ok) return { status: 'load_error' };
    const cleaned = JSON.parse(serialize(data)) as AppData;
    return { status: 'ready', data: { projects: cleaned.projects, tasks: cleaned.tasks } };
  } catch {
    return { status: 'load_error' };
  }
}

export function serialize(data: AppData): string {
  return JSON.stringify({
    version: 1,
    projects: data.projects.map(({ id, name, description, startDate, createdAt, updatedAt }) => ({ id, name, description, startDate, createdAt, updatedAt })),
    tasks: data.tasks.map(({ id, projectId, name, description, durationDays, status, predecessorIds, createdAt, updatedAt }) => ({ id, projectId, name, description, durationDays, status, predecessorIds, createdAt, updatedAt })),
  });
}
