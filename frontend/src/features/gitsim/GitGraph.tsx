import { useEffect, useRef } from 'react';
import { computeLayout } from './layout';
import type { RepoState } from './types';

const COL_W = 84;
const LANE_H = 64;
const PAD_X = 40;
const PAD_TOP = 64; // ブランチラベルを積む余白
const R = 13;
const TAG_H = 20;

const x = (column: number) => PAD_X + column * COL_W;
const y = (lane: number) => PAD_TOP + lane * LANE_H;

// コミットを丸、親子を線、ブランチを名札で描く。
// コミットは key=ID で描くので新しいものだけがポップインし、
// 名札は key=ブランチ名 + transform の transition で、ブランチが動くと滑って移動する。
export function GitGraph({ repo }: { repo: RepoState }) {
  const layout = computeLayout(repo);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pos = new Map(layout.nodes.map((n) => [n.id, { x: x(n.column), y: y(n.lane) }]));
  const columns = Math.max(layout.nodes.length, 1);
  const width = PAD_X * 2 + (columns - 1) * COL_W + 60;
  const height = PAD_TOP + (layout.lanes - 1) * LANE_H + 44;

  useEffect(() => {
    const el = scrollRef.current;
    el?.scrollTo?.({ left: el.scrollWidth, behavior: 'smooth' });
  }, [layout.nodes.length]);

  // 同じコミットを指す名札は上へ積む
  const stackIndex = new Map<string, number>();
  const tags = layout.labels.map((label) => {
    const i = stackIndex.get(label.commit) ?? 0;
    stackIndex.set(label.commit, i + 1);
    return { ...label, stack: i };
  });
  if (layout.detachedHead) {
    const i = stackIndex.get(layout.detachedHead) ?? 0;
    tags.push({ branch: 'HEAD', commit: layout.detachedHead, isHead: true, stack: i });
  }

  return (
    <div className="graph-scroll" ref={scrollRef}>
      <svg
        role="img"
        aria-label="コミットグラフ"
        className="git-graph"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {layout.nodes.length === 0 && (
          <text x={PAD_X} y={PAD_TOP} className="graph-empty">
            まだコミットがありません
          </text>
        )}

        {layout.edges.map((e) => {
          const a = pos.get(e.from)!;
          const b = pos.get(e.to)!;
          const d =
            a.y === b.y
              ? `M ${a.x} ${a.y} L ${b.x} ${b.y}`
              : `M ${a.x} ${a.y} C ${a.x + COL_W * 0.6} ${a.y}, ${b.x - COL_W * 0.6} ${b.y}, ${b.x} ${b.y}`;
          return <path key={`${e.from}-${e.to}`} d={d} className="graph-edge" />;
        })}

        {layout.nodes.map((n) => {
          const p = pos.get(n.id)!;
          const isHead = n.id === (repo.head.type === 'branch' ? repo.branches[repo.head.name] : repo.head.commit);
          return (
            <g
              key={n.id}
              className="graph-node-pos"
              style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
              aria-label={`コミット ${n.id} ${n.message}`}
            >
              <g className={`graph-node lane-${n.lane % 6}${isHead ? ' is-head' : ''}`}>
                <title>{`${n.id} ${n.message}`}</title>
                <circle r={R} />
                <text y={R + 16} className="graph-id">
                  {n.id}
                </text>
                <text y={R + 30} className="graph-msg">
                  {n.message.length > 12 ? `${n.message.slice(0, 11)}…` : n.message}
                </text>
              </g>
            </g>
          );
        })}

        {tags.map((t) => {
          const p = pos.get(t.commit);
          if (!p) return null;
          const text = t.branch === 'HEAD' ? 'HEAD' : t.isHead ? `HEAD → ${t.branch}` : t.branch;
          const w = text.length * 7.4 + 14;
          return (
            <g
              key={`tag-${t.branch}`}
              className={`graph-tag-pos`}
              style={{ transform: `translate(${p.x}px, ${p.y - R - 10 - t.stack * (TAG_H + 4)}px)` }}
              aria-label={t.branch === 'HEAD' ? 'HEAD（detached）' : `ブランチ ${t.branch}${t.isHead ? '（HEAD）' : ''}`}
            >
              <g className={`graph-tag${t.isHead ? ' is-head' : ''}`}>
                <rect x={-w / 2} y={-TAG_H} width={w} height={TAG_H} rx={5} />
                <text y={-6}>{text}</text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
