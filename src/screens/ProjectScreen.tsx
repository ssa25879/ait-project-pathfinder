import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import { DISPLAY_STATUS_LABEL, type Task } from '../domain';
import { useAppStore, useProjectView } from '../state';
import { ConfirmDelete, MissingScreen, mutationMessage } from '../ui/common';
import { ProjectForm } from '../ui/ProjectForm';

export function ProjectScreen() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const store = useAppStore();
  const view = useProjectView(projectId);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  if (!view) return <MissingScreen />;
  const { project, tasks, readiness } = view;
  const names = (ids: string[]) => ids.map(id => tasks.find(t => t.id === id)?.name ?? id).join(', ');
  const renderTask = (task: Task) => {
    const r = readiness.get(task.id)!;
    return <article key={task.id}>
      <h3><Link to={`/projects/${projectId}/tasks/${task.id}`}>{task.name}</Link></h3>
      <p>{DISPLAY_STATUS_LABEL[r.displayStatus]} · {task.durationDays}일</p>
      {!!r.waitingOnIds.length && <p>먼저 완료해 주세요: {names(r.waitingOnIds)}</p>}
      {!!r.warningPredecessorIds.length && <p role="status">미완료 선행 작업이 있어요: {names(r.warningPredecessorIds)}</p>}
      <label>작업 상태<select aria-label={`${task.name} 상태`} value={task.status} onChange={e => {
        const result = store.changeTaskStatus(task.id, e.target.value as Task['status']);
        setError(result.ok ? '' : mutationMessage(result.error, tasks));
      }}><option value="todo">시작 전</option><option value="in_progress">진행 중</option><option value="done">완료</option></select></label>
    </article>;
  };
  const next = tasks.filter(t => ['ready', 'in_progress'].includes(readiness.get(t.id)!.displayStatus));
  const waiting = tasks.filter(t => readiness.get(t.id)!.displayStatus === 'waiting');
  return <main><h1>{project.name}</h1>
    {project.description && <p>{project.description}</p>}
    <section><h2>다음 할 일</h2>{next.map(renderTask)}
      {!next.length && <p>{tasks.length && tasks.every(t => t.status === 'done') ? '프로젝트의 작업을 모두 마쳤어요.' : '작업을 추가해 프로젝트를 시작해 보세요.'}</p>}
    </section>
    {error && <p role="alert">{error}</p>}
    <div className="actions"><Link to={`/projects/${projectId}/tasks/new`}>작업 추가</Link><Link to={`/projects/${projectId}/map`}>경로도</Link><Link to={`/projects/${projectId}/schedule`}>일정 분석</Link></div>
    {!!waiting.length && <section><h2>대기 중인 작업</h2>{waiting.map(renderTask)}</section>}
    <section><h2>전체 작업</h2>{tasks.length ? tasks.map(renderTask) : <p>아직 작업이 없어요.</p>}</section>
    {editing ? <ProjectForm project={project} onSave={input => { const result = store.updateProject(projectId, input); if (result.ok) setEditing(false); return result; }} onCancel={() => setEditing(false)} /> : <Button variant="weak" onClick={() => setEditing(true)}>프로젝트 수정</Button>}
    {deleting ? <ConfirmDelete message={`프로젝트와 작업 ${tasks.length}개를 모두 삭제할까요?`} onCancel={() => setDeleting(false)} onConfirm={() => { const result = store.deleteProject(projectId); if (result.ok) navigate('/', { replace: true }); }} /> : <Button variant="weak" color="danger" onClick={() => setDeleting(true)}>프로젝트 삭제</Button>}
  </main>;
}
