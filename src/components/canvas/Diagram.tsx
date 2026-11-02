import { ChartCard } from "./blocks";
import { computeDAGLayout } from "./dag";
import { useGrokTheme } from "./theme";

export type DiagramNodeKind = "box" | "decision" | "terminal";

export interface DiagramNode {
  id: string;
  label: string;
  detail?: string;
  kind?: DiagramNodeKind;
  /** `dataviz.categorical`의 색 번호. 없으면 회색 `other`. */
  series?: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  detail?: string;
  dashed?: boolean;
}

export interface DiagramProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  direction?: "horizontal" | "vertical";
}

// 글자 크기. 측정(DOM) 없이 글자 수로 크기를 계산해야 서버와 클라이언트 결과가 같다.
const LABEL = 14;
const DETAIL = 12;
const EDGE_LABEL = 12;
const PAD = 24;
const RANK_GAP = 56;
const NODE_GAP = 40;
const CLEAR = 8; // 선 끝과 노드 면 사이
const LANE_GAP = 28;
const LANE_STEP = 18;

function textWidth(s: string, size: number): number {
  let em = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    em += c >= 0x1100 ? 1 : c === 32 ? 0.3 : c >= 48 && c <= 57 ? 0.58 : c >= 65 && c <= 90 ? 0.68 : 0.55;
  }
  return em * size;
}

/** 공백이 있으면 공백에서, 없으면 글자 단위로 줄을 나눈다. */
function wrap(s: string, size: number, max: number): string[] {
  const lines: string[] = [];
  let rest = s.trim();
  while (rest) {
    if (textWidth(rest, size) <= max) { lines.push(rest); break; }
    let cut = 0;
    let lastSpace = -1;
    for (let i = 0; i < rest.length; i++) {
      if (textWidth(rest.slice(0, i + 1), size) > max) break;
      cut = i + 1;
      if (rest[i] === " ") lastSpace = i;
    }
    if (cut === 0) cut = 1;
    const at = lastSpace > 0 ? lastSpace : cut;
    lines.push(rest.slice(0, at).trimEnd());
    rest = rest.slice(at).trimStart();
  }
  return lines;
}

interface Pt { x: number; y: number }

/** 꺾이는 곳을 둥글게 한 경로. */
function roundedPath(pts: Pt[], r = 8): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y);
    const k = Math.min(r, l1 / 2, l2 / 2);
    const p1 = { x: b.x - ((b.x - a.x) / l1) * k, y: b.y - ((b.y - a.y) / l1) * k };
    const p2 = { x: b.x + ((c.x - b.x) / l2) * k, y: b.y + ((c.y - b.y) / l2) * k };
    d += ` L${p1.x} ${p1.y} Q${b.x} ${b.y} ${p2.x} ${p2.y}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last.x} ${last.y}`;
}

/** 열린 화살촉(chevron). 마지막 선분의 방향으로 그린다. */
function chevron(from: Pt, tip: Pt, len = 7): string {
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
  const spread = (28 * Math.PI) / 180;
  const p = (s: number) => `${tip.x - Math.cos(ang + s) * len} ${tip.y - Math.sin(ang + s) * len}`;
  return `M${p(spread)} L${tip.x} ${tip.y} L${p(-spread)}`;
}

interface Geo { id: string; node: DiagramNode; rank: number; w: number; h: number; x: number; y: number }

function sizeOf(n: DiagramNode): { w: number; h: number } {
  const label = textWidth(n.label, LABEL) * 1.05;
  const detail = n.detail ? textWidth(n.detail, DETAIL) : 0;
  const kind = n.kind ?? "box";
  if (kind === "decision") {
    const h = 72;
    return { w: Math.max(120, (label + 8) / 0.75), h };
  }
  const text = Math.max(label, detail);
  const h = n.detail ? 56 : 40;
  if (kind === "terminal") return { w: Math.max(120, text + 48), h };
  return { w: Math.max(120, text + (n.detail ? 16 + 4 + 16 : 32)), h };
}

export function Diagram({ nodes: inputNodes, edges: inputEdges, direction = "vertical" }: DiagramProps) {
  const theme = useGrokTheme();
  const vertical = direction === "vertical";

  const seen = new Set<string>();
  const nodes = inputNodes.filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)));
  if (nodes.length === 0) return null;
  const edges = inputEdges.filter((e) => seen.has(e.from) && seen.has(e.to) && e.from !== e.to);

  const sizes = new Map(nodes.map((n) => [n.id, sizeOf(n)]));
  const maxW = Math.max(...[...sizes.values()].map((s) => s.w));
  const maxH = Math.max(...[...sizes.values()].map((s) => s.h));
  const layout = computeDAGLayout({
    nodes, edges, direction, nodeWidth: maxW, nodeHeight: maxH, rankGap: RANK_GAP, nodeGap: NODE_GAP, padding: PAD,
  });

  // 주축(main)은 층이 흐르는 방향, 보조축(cross)은 층 안의 방향이다.
  const mainOf = (g: { w: number; h: number }) => (vertical ? g.h : g.w);
  const crossOf = (g: { w: number; h: number }) => (vertical ? g.w : g.h);
  const pt = (main: number, cross: number): Pt => (vertical ? { x: cross, y: main } : { x: main, y: cross });

  const rankCount = layout.ranks.length;
  const rows: Geo[][] = Array.from({ length: rankCount }, () => []);
  for (const ln of [...layout.nodes].sort((a, b) => a.order - b.order)) {
    const n = nodes.find((x) => x.id === ln.id)!;
    const s = sizes.get(n.id)!;
    rows[ln.rank].push({ id: n.id, node: n, rank: ln.rank, w: s.w, h: s.h, x: 0, y: 0 });
  }
  const rowCross = rows.map((r) => r.reduce((a, g) => a + crossOf(g), 0) + (r.length - 1) * NODE_GAP);
  const crossMax = Math.max(...rowCross);
  const bandMain = rows.map((r) => Math.max(...r.map(mainOf)));
  const bandStart: number[] = [];
  bandMain.reduce((acc, m, i) => ((bandStart[i] = acc), acc + m + RANK_GAP), PAD);

  const geo = new Map<string, Geo>();
  rows.forEach((r, ri) => {
    let c = PAD + (crossMax - rowCross[ri]) / 2;
    for (const g of r) {
      const m = bandStart[ri] + (bandMain[ri] - mainOf(g)) / 2;
      const p = pt(m, c);
      g.x = p.x;
      g.y = p.y;
      c += crossOf(g) + NODE_GAP;
      geo.set(g.id, g);
    }
  });

  const mainStart = (g: Geo) => (vertical ? g.y : g.x);
  const mainEnd = (g: Geo) => mainStart(g) + mainOf(g);
  const crossStart = (g: Geo) => (vertical ? g.x : g.y);
  const crossEnd = (g: Geo) => crossStart(g) + crossOf(g);
  const crossMid = (g: Geo) => crossStart(g) + crossOf(g) / 2;
  const mainMid = (g: Geo) => mainStart(g) + mainOf(g) / 2;

  let maxX = 0, maxY = 0;
  const grow = (p: Pt) => { maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); };
  for (const g of geo.values()) { grow({ x: g.x + g.w, y: g.y + g.h }); }

  interface Drawn { d: string; head: string; dashed: boolean; text: { lines: { t: string; faint: boolean }[]; at: Pt; anchor: "start" | "middle"; } | null }
  const drawn: Drawn[] = [];
  const lanes: { lo: number; hi: number; k: number }[] = [];

  edges.forEach((e, i) => {
    const s = geo.get(e.from)!, t = geo.get(e.to)!;
    const le = layout.edges[i];
    const adjacent = !le.isBackEdge && t.rank === s.rank + 1;
    let pts: Pt[];
    let labelSeg: [Pt, Pt];
    if (adjacent) {
      const a = mainEnd(s) + CLEAR, b = mainStart(t) - CLEAR;
      const cs = crossMid(s), ct = crossMid(t);
      if (Math.abs(cs - ct) < 1) pts = [pt(a, cs), pt(b, ct)];
      else {
        const mid = (a + b) / 2;
        pts = [pt(a, cs), pt(mid, cs), pt(mid, ct), pt(b, ct)];
      }
      labelSeg = [pts[0], pts[1]];
      // 가장 긴 선분에 라벨을 붙인다.
      let best = 0;
      for (let k = 0; k < pts.length - 1; k++) {
        const len = Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].y - pts[k].y);
        if (len > best) { best = len; labelSeg = [pts[k], pts[k + 1]]; }
      }
    } else {
      // 되돌림·건너뛰는 선: 옆 면에서 나와 옆 통로를 따라 가서 목표의 옆 면으로 들어간다.
      const lo = Math.min(s.rank, t.rank), hi = Math.max(s.rank, t.rank);
      let base = 0;
      for (const g of geo.values()) if (g.rank >= lo && g.rank <= hi) base = Math.max(base, crossEnd(g));
      const k = lanes.filter((l) => l.lo <= hi && lo <= l.hi).length;
      lanes.push({ lo, hi, k });
      const lane = base + LANE_GAP + k * LANE_STEP;
      pts = [
        pt(mainMid(s), crossEnd(s) + CLEAR),
        pt(mainMid(s), lane),
        pt(mainMid(t), lane),
        pt(mainMid(t), crossEnd(t) + CLEAR),
      ];
      labelSeg = [pts[1], pts[2]];
    }
    const [p, q] = labelSeg;
    const horizontalSeg = Math.abs(p.y - q.y) < 1;
    let text: Drawn["text"] = null;
    if (e.label || e.detail) {
      const lines = [
        ...(e.label ? wrap(e.label, EDGE_LABEL, 160).map((t) => ({ t, faint: false })) : []),
        ...(e.detail ? wrap(e.detail, EDGE_LABEL, 160).map((t) => ({ t, faint: true })) : []),
      ];
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      const widest = Math.max(...lines.map((l) => textWidth(l.t, EDGE_LABEL)));
      const lh = 16;
      if (horizontalSeg) {
        text = { lines, at: { x: mid.x, y: mid.y - 8 - (lines.length - 1) * lh }, anchor: "middle" };
        grow({ x: mid.x + widest / 2, y: mid.y });
      } else {
        text = { lines, at: { x: mid.x + 8, y: mid.y - ((lines.length - 1) * lh) / 2 + 4 }, anchor: "start" };
        grow({ x: mid.x + 8 + widest, y: mid.y + (lines.length * lh) / 2 });
      }
    }
    pts.forEach(grow);
    drawn.push({
      d: roundedPath(pts),
      head: chevron(pts[pts.length - 2], pts[pts.length - 1]),
      dashed: !!e.dashed,
      text,
    });
  });

  // computeDAGLayout은 노드 크기를 하나로 가정하므로, 실제 크기로 다시 잰 범위를 쓴다.
  const width = maxX + PAD;
  const height = maxY + PAD;
  const stroke = theme.text.tertiary;
  const accent = (n: DiagramNode) =>
    n.series !== undefined && n.series >= 0 && n.series < theme.dataviz.categorical.length
      ? theme.dataviz.categorical[n.series]
      : theme.dataviz.other;

  return (
    <ChartCard>
      <div className="cv-diagram-scroll" tabIndex={0}>
        <div className="cv-diagram" style={{ width, height }}>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
            {[...geo.values()].filter((g) => g.node.kind === "decision").map((g) => (
              <polygon
                key={g.id}
                points={`${g.x + g.w / 2},${g.y} ${g.x + g.w},${g.y + g.h / 2} ${g.x + g.w / 2},${g.y + g.h} ${g.x},${g.y + g.h / 2}`}
                fill={theme.bg.base}
                stroke={theme.border.default}
                strokeWidth={1}
                strokeLinejoin="round"
              />
            ))}
            {drawn.map((e, i) => (
              <g key={i} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d={e.d} strokeDasharray={e.dashed ? "5 4" : undefined} />
                <path d={e.head} />
              </g>
            ))}
            {drawn.map((e, i) =>
              e.text ? (
                <text
                  key={`t${i}`}
                  x={e.text.at.x}
                  y={e.text.at.y}
                  textAnchor={e.text.anchor}
                  style={{ fontFamily: theme.font.family, fontSize: EDGE_LABEL }}
                >
                  {e.text.lines.map((l, k) => (
                    <tspan key={k} x={e.text!.at.x} dy={k === 0 ? 0 : 16} style={{ fill: l.faint ? theme.text.tertiary : theme.text.secondary }}>
                      {l.t}
                    </tspan>
                  ))}
                </text>
              ) : null,
            )}
          </svg>
          {[...geo.values()].map((g) => {
            const kind = g.node.kind ?? "box";
            const card = kind !== "decision";
            const accented = kind === "box" && !!g.node.detail;
            return (
              <div
                key={g.id}
                className="cv-node"
                data-kind={kind}
                style={{
                  left: g.x,
                  top: g.y,
                  width: g.w,
                  height: g.h,
                  background: card ? theme.bg.base : undefined,
                  border: card ? `1px solid ${theme.border.default}` : undefined,
                  borderLeft: accented ? `4px solid ${accent(g.node)}` : undefined,
                  borderRadius: kind === "terminal" ? theme.radius.full : theme.radius.md,
                  alignItems: accented ? "flex-start" : "center",
                  textAlign: accented ? "left" : "center",
                  padding: accented ? "0 16px 0 12px" : "0 12px",
                }}
              >
                <span
                  className="cv-node-label"
                  style={{ fontSize: LABEL, lineHeight: "20px", fontWeight: 500, color: theme.text.primary }}
                >
                  {g.node.label}
                </span>
                {g.node.detail ? (
                  <span className="cv-node-detail" style={{ fontSize: DETAIL, lineHeight: "16px", color: theme.text.secondary }}>
                    {g.node.detail}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
