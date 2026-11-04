import { describe, expect, it } from 'vitest';
import { emptyData, tasksOfProject } from './model';
import { createProject } from './mutations';
import { computeReadiness, summarizeProject } from './readiness';
import { addSampleProject } from './sample';
import { computeSchedule, projectEndDate } from './schedule';

describe('addSampleProject', () => {
  it('표시 상태 네 가지와 핵심 경로를 모두 포함한다', () => {
    const result = addSampleProject(emptyData(), '2026-11-04');
    if (!result.ok) throw new Error('fixture');
    const tasks = tasksOfProject(result.data, result.id!);
    const nameOf = (id: string) => tasks.find((t) => t.id === id)!.name;
    const status = Object.fromEntries(
      [...computeReadiness(tasks)].map(([id, r]) => [nameOf(id), r.displayStatus]),
    );
    expect(status).toEqual({ 기획: 'done', 'UI 제작': 'in_progress', 'API 개발': 'ready', '통합 테스트': 'waiting' });
    expect(summarizeProject(tasks).progressPercent).toBe(25);

    const schedule = computeSchedule(tasks);
    expect(schedule.totalDuration).toBe(12);
    expect(schedule.criticalTaskIds.map(nameOf)).toEqual(['기획', 'API 개발', '통합 테스트']);
    expect(projectEndDate('2026-11-04', schedule.totalDuration)).toBe('2026-11-15');
  });

  it('기존 데이터를 유지하고 반복 추가할 수 있다', () => {
    const existing = createProject(emptyData(), { name: '내 프로젝트', startDate: '2026-11-04' });
    if (!existing.ok) throw new Error('fixture');
    const once = addSampleProject(existing.data, '2026-11-04');
    if (!once.ok) throw new Error('fixture');
    const twice = addSampleProject(once.data, '2026-11-04');
    if (!twice.ok) throw new Error('fixture');
    expect(twice.data.projects).toHaveLength(3);
    expect(twice.data.projects[0]).toEqual(existing.data.projects[0]);
    expect(twice.data.tasks).toHaveLength(8);
  });
});
