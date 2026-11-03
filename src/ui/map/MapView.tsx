import { useMemo } from 'react';
import {
  DISPLAY_STATUS_LABEL,
  layoutGraph,
  type DisplayStatus,
  type ScheduleResult,
  type Task,
  type TaskReadiness,
} from '../../domain';

/** 상태별 색. 색만으로 구분하지 않도록 노드에 상태 라벨 글자를 함께 표시한다. */
const STATUS_STYLE: Record<DisplayStatus, { border: string; background: string; label: string }> = {
  done: { border: '#8b95a1', background: '#f2f4f6', label: '#4e5968' },
  in_progress: { border: '#3182f6', background: '#e8f3ff', label: '#1b64da' },
  ready: { border: '#03b26c', background: '#e5fff3', label: '#028450' },
  waiting: { border: '#d1d6db', background: '#ffffff', label: '#6b7684' },
};

const EDGE_COLOR = '#b0b8c1';
const CRITICAL_COLOR = '#f04452';
/** 긴 작업명(3줄)과 상태 줄이 들어가도록 노드 높이만 기본값보다 늘린다. */
const MAP_LAYOUT = { nodeHeight: 84 };

export type MapViewProps = {
  tasks: Task[];
  readiness: Map<string, TaskReadiness>;
  schedule: ScheduleResult;
  selectedId: string | null;
  onSelect: (taskId: string) => void;
};

export function MapView({ tasks, readiness, schedule, selectedId, onSelect }: MapViewProps) {
  const layout = useMemo(() => layoutGraph(tasks, MAP_LAYOUT), [tasks]);
  const byId = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  const names = useMemo(() => new Map(tasks.map((t) => [t.id, t.name])), [tasks]);
  const criticalEdges = useMemo(
    () => new Set(schedule.criticalEdges.map((e) => `${e.from}>${e.to}`)),
    [schedule],
  );

  return (
    <div
      style={{ overflow: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}
      aria-label="작업 경로도"
    >
      <div style={{ position: 'relative', width: layout.width, height: layout.height, margin: '0 auto' }}>
        <svg
          width={layout.width}
          height={layout.height}
          style={{ position: 'absolute', inset: 0 }}
          aria-hidden="true"
        >
          <defs>
            <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={EDGE_COLOR} />
            </marker>
            <marker id="map-arrow-critical" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={CRITICAL_COLOR} />
            </marker>
          </defs>
          {layout.edges.map((e) => {
            const a = byId.get(e.from)!;
            const b = byId.get(e.to)!;
            const x1 = a.x + a.width / 2;
            const y1 = a.y + a.height;
            const x2 = b.x + b.width / 2;
            const y2 = b.y - 2;
            const mid = (y1 + y2) / 2;
            const critical = criticalEdges.has(`${e.from}>${e.to}`);
            return (
              <path
                key={`${e.from}>${e.to}`}
                d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
                fill="none"
                stroke={critical ? CRITICAL_COLOR : EDGE_COLOR}
                strokeWidth={critical ? 3 : 1.5}
                markerEnd={critical ? 'url(#map-arrow-critical)' : 'url(#map-arrow)'}
              />
            );
          })}
        </svg>
        {layout.nodes.map((n) => {
          const status = readiness.get(n.id)?.displayStatus ?? 'waiting';
          const s = STATUS_STYLE[status];
          const critical = schedule.byTask.get(n.id)?.critical ?? false;
          const selected = n.id === selectedId;
          const name = names.get(n.id) ?? '';
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onSelect(n.id)}
              aria-pressed={selected}
              aria-label={`${name}, ${DISPLAY_STATUS_LABEL[status]}${critical ? ', 핵심 작업' : ''}`}
              style={{
                position: 'absolute',
                left: n.x,
                top: n.y,
                width: n.width,
                height: n.height,
                boxSizing: 'border-box',
                padding: '6px 8px',
                borderRadius: 12,
                border: `${critical ? 3 : 1.5}px solid ${critical ? CRITICAL_COLOR : s.border}`,
                outline: selected ? '3px solid #191f28' : 'none',
                outlineOffset: 2,
                background: s.background,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#191f28',
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'keep-all',
                }}
              >
                {name}
              </span>
              <span style={{ fontSize: 12, display: 'flex', gap: 6 }}>
                <span style={{ color: s.label, fontWeight: 600 }}>{DISPLAY_STATUS_LABEL[status]}</span>
                {critical && <span style={{ color: CRITICAL_COLOR, fontWeight: 700 }}>핵심</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
