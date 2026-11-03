import { describe, expect, test } from 'vitest';
import { deserialize, serialize } from './serialization';
import type { AppData, Task } from '../domain';

const project = { id: 'p', name: '프로젝트', startDate: '2026-11-03', createdAt: '2026-11-03T00:00:00Z', updatedAt: '2026-11-03T00:00:00Z' };
const task = (id: string, predecessorIds: string[] = []): Task => ({ id, projectId: 'p', name: id, durationDays: 2, status: 'todo', predecessorIds, createdAt: project.createdAt, updatedAt: project.updatedAt });
const data: AppData = { projects: [project], tasks: [task('a'), task('b', ['a'])] };
const encoded = (value: unknown) => JSON.stringify(value);

describe('저장 데이터 복원', () => {
  test('최초 실행과 현재 버전 왕복', () => {
    expect(deserialize(null)).toEqual({ status: 'ready', data: { projects: [], tasks: [] } });
    expect(deserialize(serialize(data))).toEqual({ status: 'ready', data });
    expect(JSON.parse(serialize(data)).version).toBe(1);
  });
  test('버전 0의 동일한 원본 필드를 현재 버전으로 읽는다', () => {
    expect(deserialize(encoded({ version: 0, ...data }))).toEqual({ status: 'ready', data });
  });
  test('미래 버전은 내용을 해석하지 않고 보호한다', () => {
    expect(deserialize('{"version":2}')).toEqual({ status: 'newer_version' });
  });
  test.each(['{', 'null', '[]', '', '{"version":-1}', '{"projects":[],"tasks":[]}'])('손상 형식 거부: %s', value => {
    expect(deserialize(value).status).toBe('load_error');
  });
  test.each([
    { ...data, tasks: [task('a', ['missing'])] },
    { ...data, tasks: [task('a', ['b']), task('b', ['a'])] },
    { ...data, tasks: [task('a', ['a'])] },
    { ...data, tasks: [task('a'), task('a')] },
    { ...data, projects: [project, project] },
    { ...data, tasks: [{ ...task('a'), projectId: 'missing' }] },
    { ...data, tasks: [{ ...task('a'), durationDays: '2' }] },
    { ...data, tasks: [{ ...task('a'), durationDays: 0 }] },
    { ...data, tasks: [{ ...task('a'), status: 'unknown' }] },
    { ...data, projects: [{ ...project, startDate: '2026-02-30' }] },
    { ...data, projects: [{ ...project, name: '' }] },
    { ...data, projects: [{ ...project, createdAt: 123 }] },
    { projects: [project, { ...project, id: 'q' }], tasks: [task('a'), { ...task('b', ['a']), projectId: 'q' }] },
  ])('참조 무결성 또는 원본 필드 위반을 거부한다', invalid => {
    expect(deserialize(encoded({ version: 1, ...invalid })).status).toBe('load_error');
  });
  test('파생 값과 알 수 없는 필드는 저장하지 않는다', () => {
    const value = { ...data, summary: {}, projects: [{ ...project, progress: 50 }], tasks: [{ ...task('a'), slack: 5 }] };
    const stored = JSON.parse(serialize(value));
    expect(stored.summary).toBeUndefined();
    expect(stored.projects[0].progress).toBeUndefined();
    expect(stored.tasks[0].slack).toBeUndefined();
  });
});
