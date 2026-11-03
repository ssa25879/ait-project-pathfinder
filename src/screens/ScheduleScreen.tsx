import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import { projectEndDate, taskDates } from '../domain';
import { useProjectView } from '../state';

const LIMIT_NOTICE =
  '입력한 예상 기간과 선후 관계로 계산한 시뮬레이션이에요. 휴무일, 인력, 실제 완료일은 반영하지 않아요.';

export function ScheduleScreen() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const view = useProjectView(projectId);

  if (!view) {
    return (
      <main style={{ padding: 24 }}>
        <p>프로젝트를 찾을 수 없어요.</p>
        <Button onClick={() => navigate('/')}>프로젝트 홈으로</Button>
      </main>
    );
  }

  const { project, tasks, schedule } = view;

  if (tasks.length === 0) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20 }}>{project.name} 일정 분석</h1>
        <p style={{ color: '#4e5968' }}>분석할 작업이 없어요. 작업을 추가하면 예상 기간과 핵심 경로를 계산해요.</p>
        <Button onClick={() => navigate(`/projects/${projectId}/tasks/new`)}>작업 추가하러 가기</Button>
        <p style={{ fontSize: 13, color: '#6b7684', marginTop: 16 }}>{LIMIT_NOTICE}</p>
      </main>
    );
  }

  const endDate = projectEndDate(project.startDate, schedule.totalDuration);
  const names = new Map(tasks.map((t) => [t.id, t.name]));
  // 위상 순서(일정 계산 순서)로 표시한다.
  const ordered = [...schedule.byTask.keys()].map((id) => tasks.find((t) => t.id === id)!);

  return (
    <main style={{ padding: '16px 20px 24px' }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>{project.name} 일정 분석</h1>

      <section aria-label="요약" style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
        <div style={{ flex: 1, background: '#f2f4f6', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, color: '#6b7684' }}>예상 총 기간</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{schedule.totalDuration}일</div>
        </div>
        <div style={{ flex: 1, background: '#f2f4f6', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, color: '#6b7684' }}>예상 종료일</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{endDate ?? '-'}</div>
          <div style={{ fontSize: 12, color: '#6b7684' }}>시작일 {project.startDate}</div>
        </div>
      </section>

      <section aria-label="핵심 작업">
        <h2 style={{ fontSize: 16 }}>핵심 작업</h2>
        <p style={{ fontSize: 13, color: '#6b7684', margin: '0 0 8px' }}>
          여유 기간이 0일이라 늦어지면 전체 일정이 함께 늦어지는 작업이에요.
        </p>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {schedule.criticalTaskIds.map((id) => (
            <li key={id} style={{ fontSize: 15, lineHeight: 1.6 }}>
              {names.get(id)}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="작업별 일정" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 16 }}>작업별 여유 기간</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {ordered.map((t) => {
            const s = schedule.byTask.get(t.id)!;
            const d = taskDates(project.startDate, s);
            return (
              <li key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid #e5e8eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600, wordBreak: 'keep-all' }}>
                    {t.name}
                    {s.critical && <span style={{ marginLeft: 6, fontSize: 12, color: '#f04452' }}>핵심</span>}
                  </span>
                  <span style={{ flexShrink: 0 }}>여유 {s.slack}일</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7684' }}>
                  {t.durationDays}일 · {d.start} ~ {d.end}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <p style={{ fontSize: 13, color: '#6b7684', marginTop: 16 }}>{LIMIT_NOTICE}</p>
    </main>
  );
}
