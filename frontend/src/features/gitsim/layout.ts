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
}

// コミットグラフの配置を決める。ブランチごとにレーン（行）を割り当て、作成順に列を並べる
export function computeLayout(_state: RepoState): GraphLayout {
  throw new Error('not implemented');
}
