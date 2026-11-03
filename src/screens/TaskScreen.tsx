import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import { getDeleteTaskImpact } from '../domain';
import { useAppStore, useProjectView } from '../state';
import { ConfirmDelete, MissingScreen, mutationMessage } from '../ui/common';

export function TaskScreen() {
  const { projectId = '', taskId = '' } = useParams();
  const store = useAppStore();
  const view = useProjectView(projectId);
  const task = view?.tasks.find(t => t.id === taskId);
  const navigate = useNavigate();
  const [name, setName] = useState(task?.name ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [durationDays, setDuration] = useState(String(task?.durationDays ?? 1));
  const [predecessorIds, setPredecessors] = useState<string[]>(task?.predecessorIds ?? []);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  if (!view || (taskId !== 'new' && !task)) return <MissingScreen />;
  function submit(event: FormEvent) {
    event.preventDefault();
    const input = { name, description, durationDays, predecessorIds };
    const result = task ? store.updateTask(task.id, input) : store.createTask(projectId, input);
    if (result.ok) navigate(`/projects/${projectId}`, { replace: true });
    else setError(mutationMessage(result.error, view!.tasks));
  }
  const impact = task ? getDeleteTaskImpact(store.data, task.id).map(id => view.tasks.find(t => t.id === id)?.name ?? id) : [];
  return <main><h1>{task ? '작업 편집' : '작업 추가'}</h1><form noValidate onSubmit={submit}>
    <label>작업명<input value={name} onChange={e => setName(e.target.value)} /></label>
    <label>예상 기간(일)<input inputMode="numeric" value={durationDays} onChange={e => setDuration(e.target.value)} /></label>
    <label>설명<textarea value={description} onChange={e => setDescription(e.target.value)} /></label>
    <fieldset><legend>선행 작업</legend>{view.tasks.filter(t => t.id !== taskId).map(t => <label className="check" key={t.id}><input type="checkbox" checked={predecessorIds.includes(t.id)} onChange={e => setPredecessors(e.target.checked ? [...predecessorIds, t.id] : predecessorIds.filter(id => id !== t.id))} />{t.name}</label>)}
      {view.tasks.filter(t => t.id !== taskId).length === 0 && <p>선택할 다른 작업이 없어요.</p>}
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="actions"><Button type="submit">작업 저장</Button><Button type="button" variant="weak" onClick={() => navigate(`/projects/${projectId}`)}>취소</Button></div>
  </form>
  {task && (deleting ? <ConfirmDelete message={`작업을 삭제할까요? ${impact.length ? `선행 참조가 제거되는 후속 작업: ${impact.join(', ')}` : '영향을 받는 후속 작업은 없어요.'}`} onCancel={() => setDeleting(false)} onConfirm={() => { const result = store.deleteTask(task.id); if (result.ok) navigate(`/projects/${projectId}`, { replace: true }); }} /> : <Button variant="weak" color="danger" onClick={() => setDeleting(true)}>작업 삭제</Button>)}
  </main>;
}
