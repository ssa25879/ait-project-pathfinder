import { findCycle, type GraphTask } from './graph';
import { createId, type AppData, type Project, type Task, type TaskStatus } from './model';
import { getTaskReadiness } from './readiness';
import {
  validateProjectInput,
  validateTaskInput,
  type FieldError,
  type ProjectInput,
  type TaskInput,
} from './validation';

export type MutationError =
  | { type: 'invalid_input'; errors: Partial<Record<string, FieldError>> }
  | { type: 'project_not_found'; projectId: string }
  | { type: 'task_not_found'; taskId: string }
  | { type: 'self_reference'; taskId: string }
  /** 없는 작업이거나 다른 프로젝트의 작업을 선행 작업으로 지정. */
  | { type: 'invalid_predecessor'; predecessorIds: string[] }
  /** 순환 경로(선행 → 후속 순서의 작업 ID). */
  | { type: 'cycle'; cycle: string[] }
  /** 대기 중인 작업의 상태 변경 거부. 완료되지 않은 선행 작업 ID. */
  | { type: 'waiting'; waitingOnIds: string[] };

export type MutationResult = { ok: true; data: AppData; id?: string } | { ok: false; error: MutationError };

export type MutationOptions = {
  now?: string;
  createId?: () => string;
};

const fail = (error: MutationError): MutationResult => ({ ok: false, error });
const nowOf = (opts?: MutationOptions) => opts?.now ?? new Date().toISOString();

// ---------- 프로젝트 ----------

export function createProject(data: AppData, input: ProjectInput, opts?: MutationOptions): MutationResult {
  const v = validateProjectInput(input);
  if (!v.ok) return fail({ type: 'invalid_input', errors: v.errors });
  const now = nowOf(opts);
  const project: Project = {
    id: (opts?.createId ?? createId)(),
    ...v.value,
    createdAt: now,
    updatedAt: now,
  };
  if (project.description === undefined) delete project.description;
  return { ok: true, data: { ...data, projects: [...data.projects, project] }, id: project.id };
}

export function updateProject(
  data: AppData,
  projectId: string,
  input: ProjectInput,
  opts?: MutationOptions,
): MutationResult {
  const current = data.projects.find((p) => p.id === projectId);
  if (!current) return fail({ type: 'project_not_found', projectId });
  const v = validateProjectInput(input);
  if (!v.ok) return fail({ type: 'invalid_input', errors: v.errors });
  const updated: Project = { ...current, ...v.value, updatedAt: nowOf(opts) };
  if (updated.description === undefined) delete updated.description;
  return {
    ok: true,
    data: { ...data, projects: data.projects.map((p) => (p.id === projectId ? updated : p)) },
    id: projectId,
  };
}

/** 프로젝트와 소속 작업을 함께 삭제한다. */
export function deleteProject(data: AppData, projectId: string): MutationResult {
  if (!data.projects.some((p) => p.id === projectId)) return fail({ type: 'project_not_found', projectId });
  return {
    ok: true,
    data: {
      projects: data.projects.filter((p) => p.id !== projectId),
      tasks: data.tasks.filter((t) => t.projectId !== projectId),
    },
    id: projectId,
  };
}

// ---------- 작업 ----------

/** 선행 작업 후보를 검사하고, 순환이 생기면 거부한다. 통과하면 null. */
function checkPredecessors(
  data: AppData,
  projectId: string,
  taskId: string,
  predecessorIds: string[],
): MutationError | null {
  if (predecessorIds.includes(taskId)) return { type: 'self_reference', taskId };
  const sameProject = new Set(data.tasks.filter((t) => t.projectId === projectId).map((t) => t.id));
  const invalid = predecessorIds.filter((id) => !sameProject.has(id));
  if (invalid.length > 0) return { type: 'invalid_predecessor', predecessorIds: invalid };
  const candidate: GraphTask[] = data.tasks
    .filter((t) => t.projectId === projectId)
    .map((t) => (t.id === taskId ? { id: t.id, predecessorIds } : t));
  if (!candidate.some((t) => t.id === taskId)) candidate.push({ id: taskId, predecessorIds });
  const cycle = findCycle(candidate);
  return cycle ? { type: 'cycle', cycle } : null;
}

export function createTask(
  data: AppData,
  projectId: string,
  input: TaskInput,
  opts?: MutationOptions,
): MutationResult {
  if (!data.projects.some((p) => p.id === projectId)) return fail({ type: 'project_not_found', projectId });
  const v = validateTaskInput(input);
  if (!v.ok) return fail({ type: 'invalid_input', errors: v.errors });
  const id = (opts?.createId ?? createId)();
  const error = checkPredecessors(data, projectId, id, v.value.predecessorIds);
  if (error) return fail(error);
  const now = nowOf(opts);
  const task: Task = { id, projectId, ...v.value, status: 'todo', createdAt: now, updatedAt: now };
  if (task.description === undefined) delete task.description;
  return { ok: true, data: { ...data, tasks: [...data.tasks, task] }, id };
}

/** 작업명·설명·기간·선행 작업을 수정한다. 상태는 바꾸지 않는다. */
export function updateTask(data: AppData, taskId: string, input: TaskInput, opts?: MutationOptions): MutationResult {
  const current = data.tasks.find((t) => t.id === taskId);
  if (!current) return fail({ type: 'task_not_found', taskId });
  const v = validateTaskInput(input);
  if (!v.ok) return fail({ type: 'invalid_input', errors: v.errors });
  const error = checkPredecessors(data, current.projectId, taskId, v.value.predecessorIds);
  if (error) return fail(error);
  const updated: Task = { ...current, ...v.value, updatedAt: nowOf(opts) };
  if (updated.description === undefined) delete updated.description;
  return { ok: true, data: { ...data, tasks: data.tasks.map((t) => (t.id === taskId ? updated : t)) }, id: taskId };
}

/** 삭제 시 선행 작업 참조가 제거될 후속 작업 ID(삭제 확인 안내용). */
export function getDeleteTaskImpact(data: AppData, taskId: string): string[] {
  return data.tasks.filter((t) => t.id !== taskId && t.predecessorIds.includes(taskId)).map((t) => t.id);
}

/** 작업을 삭제하고 이를 가리키는 선행 참조만 제거한다(선행 작업을 상속하지 않음). */
export function deleteTask(data: AppData, taskId: string, opts?: MutationOptions): MutationResult {
  if (!data.tasks.some((t) => t.id === taskId)) return fail({ type: 'task_not_found', taskId });
  const now = nowOf(opts);
  const tasks = data.tasks
    .filter((t) => t.id !== taskId)
    .map((t) =>
      t.predecessorIds.includes(taskId)
        ? { ...t, predecessorIds: t.predecessorIds.filter((p) => p !== taskId), updatedAt: now }
        : t,
    );
  return { ok: true, data: { ...data, tasks }, id: taskId };
}

/**
 * 작업 상태를 변경한다. 대기 중(시작 전 + 미완료 선행 작업)인 작업은 거부한다.
 * 다른 작업의 저장 상태는 바꾸지 않는다.
 */
export function changeTaskStatus(
  data: AppData,
  taskId: string,
  status: TaskStatus,
  opts?: MutationOptions,
): MutationResult {
  const current = data.tasks.find((t) => t.id === taskId);
  if (!current) return fail({ type: 'task_not_found', taskId });
  if (current.status === status) return { ok: true, data, id: taskId };
  const byId = new Map(data.tasks.filter((t) => t.projectId === current.projectId).map((t) => [t.id, t]));
  const readiness = getTaskReadiness(current, byId);
  if (readiness.displayStatus === 'waiting') return fail({ type: 'waiting', waitingOnIds: readiness.waitingOnIds });
  const updated: Task = { ...current, status, updatedAt: nowOf(opts) };
  return { ok: true, data: { ...data, tasks: data.tasks.map((t) => (t.id === taskId ? updated : t)) }, id: taskId };
}
