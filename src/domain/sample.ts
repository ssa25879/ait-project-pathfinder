import type { AppData, TaskStatus } from './model';
import { changeTaskStatus, createProject, createTask, type MutationResult } from './mutations';

function must(result: MutationResult): Extract<MutationResult, { ok: true }> {
  if (!result.ok) throw new Error(`샘플 데이터 오류: ${result.error.type}`);
  return result;
}

/** 대표 시나리오 프로젝트를 추가한다. 표시 상태 네 가지와 핵심 경로를 한 번에 확인할 수 있다. */
export function addSampleProject(data: AppData, startDate: string): MutationResult {
  const created = must(createProject(data, {
    name: '샘플: 앱 출시 준비',
    description: '테스트용 예시 프로젝트예요.',
    startDate,
  }));
  let next = created.data;
  const projectId = created.id!;
  const addTask = (name: string, durationDays: number, predecessorIds: string[] = []) => {
    const result = must(createTask(next, projectId, { name, durationDays, predecessorIds }));
    next = result.data;
    return result.id!;
  };
  const setStatus = (id: string, status: TaskStatus) => {
    next = must(changeTaskStatus(next, id, status)).data;
  };

  const plan = addTask('기획', 3);
  const ui = addTask('UI 제작', 5, [plan]);
  const api = addTask('API 개발', 7, [plan]);
  addTask('통합 테스트', 2, [ui, api]);
  setStatus(plan, 'done');
  setStatus(ui, 'in_progress');

  return { ok: true, data: next, id: projectId };
}
