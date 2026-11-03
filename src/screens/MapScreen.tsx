import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import { focusSubgraph } from '../domain';
import { useProjectView } from '../state';
import { MapView } from '../ui/map/MapView';
import { NodeDetail } from '../ui/map/NodeDetail';

export function MapScreen() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const view = useProjectView(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const tasks = view?.tasks;
  // 삭제 등으로 사라진 작업을 가리키면 선택·중심 보기를 해제한 것으로 본다.
  const validSelected = tasks?.some((t) => t.id === selectedId) ? selectedId : null;
  const validFocus = tasks?.some((t) => t.id === focusId) ? focusId : null;
  const shownTasks = useMemo(
    () => (tasks ? (validFocus ? focusSubgraph(tasks, validFocus) : tasks) : []),
    [tasks, validFocus],
  );

  if (!view) {
    return (
      <main style={{ padding: 24 }}>
        <p>프로젝트를 찾을 수 없어요.</p>
        <Button onClick={() => navigate('/')}>프로젝트 홈으로</Button>
      </main>
    );
  }

  const { project, readiness, schedule } = view;
  const selected = view.tasks.find((t) => t.id === validSelected) ?? null;

  if (view.tasks.length === 0) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20 }}>{project.name} 경로도</h1>
        <p style={{ color: '#4e5968' }}>아직 작업이 없어요. 작업을 추가하면 경로도가 자동으로 그려져요.</p>
        <Button onClick={() => navigate(`/projects/${projectId}/tasks/new`)}>작업 추가하러 가기</Button>
      </main>
    );
  }

  const handleSelect = (id: string) => {
    setSelectedId(id);
    // 중심 보기에서는 터치한 작업으로 기준을 옮긴다.
    if (validFocus) setFocusId(id);
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <header style={{ padding: '16px 20px 8px' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>{project.name} 경로도</h1>
        <p style={{ fontSize: 13, color: '#6b7684', margin: '4px 0 0' }}>
          {validFocus
            ? `"${view.tasks.find((t) => t.id === validFocus)?.name}"과 직접 연결된 작업만 보여요.`
            : '위에서 아래로 진행돼요. 굵은 빨간 테두리와 선은 핵심 경로예요.'}
        </p>
        {validFocus && (
          <div style={{ marginTop: 8 }}>
            <Button size="small" variant="weak" color="dark" onClick={() => setFocusId(null)}>
              전체 보기
            </Button>
          </div>
        )}
      </header>
      <div style={{ flex: 1, padding: '8px 0' }}>
        <MapView
          tasks={shownTasks}
          readiness={readiness}
          schedule={schedule}
          selectedId={validSelected}
          onSelect={handleSelect}
        />
      </div>
      {selected ? (
        <NodeDetail
          task={selected}
          tasks={view.tasks}
          readiness={readiness}
          schedule={schedule}
          focusMode={validFocus !== null}
          onEdit={() => navigate(`/projects/${projectId}/tasks/${selected.id}`)}
          onFocus={() => setFocusId(selected.id)}
          onShowAll={() => setFocusId(null)}
        />
      ) : (
        <p style={{ padding: '12px 20px', fontSize: 13, color: '#6b7684' }}>작업을 누르면 자세한 정보를 볼 수 있어요.</p>
      )}
    </main>
  );
}
