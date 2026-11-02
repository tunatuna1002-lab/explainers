/**
 * 흐름·의존 다이어그램의 배치 계산. 순수 함수이고 외부 라이브러리가 없다.
 * 순환은 허용하고, 순환을 닫는 간선(back edge)에 표시를 한다.
 */
export interface DAGLayoutOptions {
  nodes: Array<{ id: string }>;
  edges: Array<{ from: string; to: string }>;
  direction?: "vertical" | "horizontal";
  nodeWidth?: number;
  nodeHeight?: number;
  rankGap?: number;
  nodeGap?: number;
  padding?: number;
}

export interface DAGLayoutNode { id: string; x: number; y: number; rank: number; order: number }

export interface DAGLayoutEdge {
  from: string;
  to: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  isBackEdge: boolean;
}

export interface DAGLayoutRank { rank: number; x: number; y: number; width: number; height: number; nodeIds: string[] }

export interface DAGLayoutResult {
  nodes: DAGLayoutNode[];
  edges: DAGLayoutEdge[];
  ranks: DAGLayoutRank[];
  direction: "vertical" | "horizontal";
  width: number;
  height: number;
}

export function computeDAGLayout(options: DAGLayoutOptions): DAGLayoutResult {
  const {
    direction = "vertical",
    nodeWidth = 160,
    nodeHeight = 40,
    rankGap = 64,
    nodeGap = 48,
    padding = 24,
  } = options;

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const n of options.nodes) if (!seen.has(n.id)) { seen.add(n.id); ids.push(n.id); }
  const edges = options.edges.filter((e) => seen.has(e.from) && seen.has(e.to) && e.from !== e.to);

  // 1) 깊이 우선으로 back edge를 찾는다.
  const out = new Map<string, number[]>(ids.map((id) => [id, []]));
  edges.forEach((e, i) => out.get(e.from)!.push(i));
  const state = new Map<string, 0 | 1 | 2>(ids.map((id) => [id, 0]));
  const back = new Set<number>();
  const visit = (id: string) => {
    state.set(id, 1);
    for (const i of out.get(id)!) {
      const to = edges[i].to;
      const s = state.get(to);
      if (s === 1) back.add(i);
      else if (s === 0) visit(to);
    }
    state.set(id, 2);
  };
  const hasIncoming = new Set(edges.map((e) => e.to));
  for (const id of ids) if (!hasIncoming.has(id) && state.get(id) === 0) visit(id);
  for (const id of ids) if (state.get(id) === 0) visit(id);

  // 2) back edge를 뺀 그래프에서 가장 긴 경로로 층(rank)을 정한다.
  const forward = edges.filter((_, i) => !back.has(i));
  const rank = new Map<string, number>(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const e of forward) {
      const r = rank.get(e.from)! + 1;
      if (r > rank.get(e.to)!) { rank.set(e.to, r); changed = true; }
    }
    if (!changed) break;
  }

  // 3) 층 안의 순서: 위·아래 층 이웃의 평균 위치(barycenter)로 몇 번 훑는다.
  const maxRank = Math.max(0, ...ids.map((id) => rank.get(id)!));
  const layers: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (const id of ids) layers[rank.get(id)!].push(id);
  const pos = new Map<string, number>();
  const reindex = () => layers.forEach((l) => l.forEach((id, i) => pos.set(id, i)));
  reindex();
  const bary = (id: string, neighbors: string[]) =>
    neighbors.length ? neighbors.reduce((s, n) => s + pos.get(n)!, 0) / neighbors.length : pos.get(id)!;
  for (let sweep = 0; sweep < 4; sweep++) {
    const down = sweep % 2 === 0;
    const order = down ? layers.map((_, i) => i) : layers.map((_, i) => layers.length - 1 - i);
    for (const li of order) {
      const nb = (id: string) =>
        forward.filter((e) => (down ? e.to === id : e.from === id)).map((e) => (down ? e.from : e.to));
      layers[li].sort((a, b) => bary(a, nb(a)) - bary(b, nb(b)));
      reindex();
    }
  }

  // 4) 좌표. 주축(main)은 층이 흐르는 방향, 보조축(cross)은 층 안의 방향이다.
  const mainSize = direction === "vertical" ? nodeHeight : nodeWidth;
  const crossSize = direction === "vertical" ? nodeWidth : nodeHeight;
  const widest = Math.max(...layers.map((l) => l.length), 1);
  const crossExtent = widest * crossSize + (widest - 1) * nodeGap;
  const mainExtent = layers.length * mainSize + (layers.length - 1) * rankGap;
  const xy = (main: number, cross: number) =>
    direction === "vertical" ? { x: cross, y: main } : { x: main, y: cross };

  const nodes: DAGLayoutNode[] = [];
  const ranks: DAGLayoutRank[] = [];
  layers.forEach((layer, r) => {
    const rowExtent = layer.length * crossSize + (layer.length - 1) * nodeGap;
    const crossStart = padding + (crossExtent - rowExtent) / 2;
    const main = padding + r * (mainSize + rankGap);
    layer.forEach((id, order) => {
      const { x, y } = xy(main, crossStart + order * (crossSize + nodeGap));
      nodes.push({ id, x, y, rank: r, order });
    });
    const o = xy(main, crossStart);
    ranks.push({
      rank: r,
      x: o.x,
      y: o.y,
      width: direction === "vertical" ? rowExtent : mainSize,
      height: direction === "vertical" ? mainSize : rowExtent,
      nodeIds: [...layer],
    });
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const dagEdges: DAGLayoutEdge[] = edges.map((e, i) => {
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    const isBack = back.has(i);
    const vertical = direction === "vertical";
    // 앞으로 가는 선: 위 노드 아래 면 → 아래 노드 위 면. 되돌림 선: 옆 면에서 옆 면.
    if (isBack) {
      return {
        from: e.from, to: e.to, isBackEdge: true,
        sourceX: a.x + (vertical ? nodeWidth : nodeWidth / 2),
        sourceY: a.y + (vertical ? nodeHeight / 2 : nodeHeight),
        targetX: b.x + (vertical ? nodeWidth : nodeWidth / 2),
        targetY: b.y + (vertical ? nodeHeight / 2 : nodeHeight),
      };
    }
    return {
      from: e.from, to: e.to, isBackEdge: false,
      sourceX: a.x + (vertical ? nodeWidth / 2 : nodeWidth),
      sourceY: a.y + (vertical ? nodeHeight : nodeHeight / 2),
      targetX: b.x + (vertical ? nodeWidth / 2 : 0),
      targetY: b.y + (vertical ? 0 : nodeHeight / 2),
    };
  });

  const width = direction === "vertical" ? crossExtent : mainExtent;
  const height = direction === "vertical" ? mainExtent : crossExtent;
  return { nodes, edges: dagEdges, ranks, direction, width: width + padding * 2, height: height + padding * 2 };
}
