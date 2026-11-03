import { useState, type FormEvent } from 'react';
import { Button } from '@toss/tds-mobile';
import type { MutationResult, Project, ProjectInput } from '../domain';
import { mutationMessage } from './common';

export function ProjectForm({ project, onSave, onCancel }: { project?: Project; onSave: (input: ProjectInput) => MutationResult; onCancel: () => void }) {
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [startDate, setStartDate] = useState(project?.startDate ?? localDate);
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = onSave({ name, description, startDate });
    if (!result.ok) setError(mutationMessage(result.error));
  }
  return <form onSubmit={submit} noValidate>
    <label>프로젝트명<input value={name} onChange={e => setName(e.target.value)} /></label>
    <label>시작일<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
    <label>설명<textarea value={description} onChange={e => setDescription(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <div className="actions"><Button type="submit">프로젝트 저장</Button><Button type="button" variant="weak" onClick={onCancel}>취소</Button></div>
  </form>;
}
