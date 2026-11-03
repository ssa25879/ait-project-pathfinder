import { Button } from '@toss/tds-mobile';
import { DISPLAY_STATUS_LABEL, type ScheduleResult, type Task, type TaskReadiness } from '../../domain';

export type NodeDetailProps = {
  task: Task;
  tasks: Task[];
  readiness: Map<string, TaskReadiness>;
  schedule: ScheduleResult;
  focusMode: boolean;
  onEdit: () => void;
  onFocus: () => void;
  onShowAll: () => void;
};

const rowStyle = { display: 'flex', gap: 8, fontSize: 14, lineHeight: 1.5 } as const;
const termStyle = { color: '#6b7684', minWidth: 72, flexShrink: 0 } as const;

export function NodeDetail({ task, tasks, readiness, schedule, focusMode, onEdit, onFocus, onShowAll }: NodeDetailProps) {
  const names = new Map(tasks.map((t) => [t.id, t.name]));
  const predecessors = task.predecessorIds.map((id) => names.get(id)).filter((n): n is string => !!n);
  const successors = tasks.filter((t) => t.predecessorIds.includes(task.id)).map((t) => t.name);
  const status = readiness.get(task.id)?.displayStatus;
  const s = schedule.byTask.get(task.id);

  return (
    <section
      aria-label="선택한 작업 정보"
      style={{ borderTop: '1px solid #e5e8eb', padding: '16px 20px', background: '#fff' }}
    >
      <h2 style={{ fontSize: 18, margin: '0 0 8px', wordBreak: 'keep-all' }}>
        {task.name}
        {s?.critical && <span style={{ marginLeft: 8, fontSize: 13, color: '#f04452' }}>핵심 작업</span>}
      </h2>
      <dl style={{ margin: 0, display: 'grid', gap: 4 }}>
        <div style={rowStyle}>
          <dt style={termStyle}>예상 기간</dt>
          <dd style={{ margin: 0 }}>{task.durationDays}일</dd>
        </div>
        <div style={rowStyle}>
          <dt style={termStyle}>상태</dt>
          <dd style={{ margin: 0 }}>{status ? DISPLAY_STATUS_LABEL[status] : '-'}</dd>
        </div>
        <div style={rowStyle}>
          <dt style={termStyle}>여유 기간</dt>
          <dd style={{ margin: 0 }}>{s ? `${s.slack}일` : '-'}</dd>
        </div>
        <div style={rowStyle}>
          <dt style={termStyle}>선행 작업</dt>
          <dd style={{ margin: 0 }}>{predecessors.length > 0 ? predecessors.join(', ') : '없음'}</dd>
        </div>
        <div style={rowStyle}>
          <dt style={termStyle}>후속 작업</dt>
          <dd style={{ margin: 0 }}>{successors.length > 0 ? successors.join(', ') : '없음'}</dd>
        </div>
      </dl>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button size="medium" variant="weak" display="block" onClick={onEdit}>
          작업 편집
        </Button>
        {focusMode ? (
          <Button size="medium" variant="weak" color="dark" display="block" onClick={onShowAll}>
            전체 보기
          </Button>
        ) : (
          <Button size="medium" variant="weak" color="dark" display="block" onClick={onFocus}>
            이 작업 중심 보기
          </Button>
        )}
      </div>
    </section>
  );
}
