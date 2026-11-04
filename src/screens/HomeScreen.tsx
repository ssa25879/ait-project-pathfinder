import { useState } from 'react';
import { Button } from '@toss/tds-mobile';
import { Link } from 'react-router-dom';
import { summarizeProject, tasksOfProject } from '../domain';
import { useAppStore } from '../state';
import { ProjectForm } from '../ui/ProjectForm';

const SAMPLE_DATA_ENABLED = import.meta.env.DEV || import.meta.env.VITE_SAMPLE_DATA === 'true';

function localToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function HomeScreen() {
  const store = useAppStore();
  const [adding, setAdding] = useState(false);
  return <main><h1>프로젝트</h1>
    {!store.data.projects.length && <p>프로젝트를 추가하고 다음에 할 일을 정해 보세요.</p>}
    {store.data.projects.map(project => {
      const summary = summarizeProject(tasksOfProject(store.data, project.id));
      return <article key={project.id}><h2><Link to={`/projects/${project.id}`}>{project.name}</Link></h2>
        <p>진행률 {summary.progressPercent}% · 전체 {summary.total}개</p>
        <p>완료 {summary.counts.done} · 진행 중 {summary.counts.in_progress} · 시작 가능 {summary.counts.ready} · 대기 중 {summary.counts.waiting}</p>
      </article>;
    })}
    {adding ? <ProjectForm onSave={input => { const result = store.createProject(input); if (result.ok) setAdding(false); return result; }} onCancel={() => setAdding(false)} /> : <Button onClick={() => setAdding(true)}>프로젝트 추가</Button>}
    {SAMPLE_DATA_ENABLED && <Button variant="weak" onClick={() => store.addSampleProject(localToday())}>샘플 프로젝트 추가</Button>}
    <details><summary>데이터 보관 안내</summary><p>데이터는 이 기기에만 저장돼요. 기기를 바꾸면 옮겨지지 않아요. 토스 앱을 삭제하거나 미니앱 데이터를 삭제하면 지워질 수 있어요.</p></details>
  </main>;
}
