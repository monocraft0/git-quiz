import { reachableFrom } from './gitSimulator';
import type { RepoState } from './types';

export interface GraphNode {
  id: string;
  message: string;
  column: number;
  lane: number;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface GraphLabel {
  branch: string;
  commit: string;
  isHead: boolean;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  labels: GraphLabel[];
  lanes: number;
  // detached HEAD のときに HEAD が指すコミット
  detachedHead: string | null;
}

// コミットグラフの配置を決める。ブランチごとにレーン（行）を割り当て、作成順に列を並べる。
// 先に作られたブランチほど上のレーンを取り、first-parent をたどって自分のレーンに並べる。
export function computeLayout(state: RepoState): GraphLayout {
  const tips = state.branchOrder
    .map((b) => state.branches[b])
    .filter((id): id is string => !!id);
  const detachedHead = state.head.type === 'detached' ? state.head.commit : null;
  if (detachedHead) tips.push(detachedHead);

  const visible = new Set(tips.flatMap((tip) => reachableFrom(state, tip)));
  const ordered = [...visible].sort((a, b) => state.commits[a].seq - state.commits[b].seq);

  const laneOf = new Map<string, number>();
  let lanes = 0;
  const claim = (start: string) => {
    let id: string | undefined = start;
    let claimed = false;
    while (id && !laneOf.has(id)) {
      laneOf.set(id, lanes);
      claimed = true;
      id = state.commits[id].parents[0];
    }
    if (claimed) lanes++;
  };
  tips.forEach(claim);
  [...ordered].reverse().forEach(claim);

  const nodes = ordered.map((id, column) => ({
    id,
    message: state.commits[id].message,
    column,
    lane: laneOf.get(id)!,
  }));
  const edges = ordered.flatMap((id) => state.commits[id].parents.map((p) => ({ from: p, to: id })));
  const current = state.head.type === 'branch' ? state.head.name : null;
  const labels = state.branchOrder
    .filter((b) => state.branches[b])
    .map((b) => ({ branch: b, commit: state.branches[b]!, isHead: b === current }));

  return { nodes, edges, labels, lanes: Math.max(lanes, 1), detachedHead: detachedHead ?? null };
}
