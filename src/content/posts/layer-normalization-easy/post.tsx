import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Table,
  Grid,
  Properties,
  Segmented,
  useGrokTheme,
  useMemo,
  useState,
} from "@/components/canvas";
import type { CSSProperties, ReactNode } from "@/components/canvas";

// 화면의 점수는 모두 예시 값이다. 같은 결과가 나오도록 고정 시드로 만든다.
function makeRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUBJECTS = ["국어", "수학", "영어", "과학"];
const MATH = 1;
const ME = { name: "영희", s: [70, 90, 60, 80] };

// 다른 학생 300명의 점수 (40~100점, 예시)
const POOL: number[][] = (() => {
  const r = makeRandom(7);
  const out: number[][] = [];
  for (let i = 0; i < 300; i++) out.push(SUBJECTS.map(() => 40 + Math.floor(r() * 61)));
  return out;
})();

type Student = { name: string; s: number[] };

function makeBatch(n: number, seed: number): Student[] {
  const r = makeRandom(seed * 97 + n);
  const out: Student[] = [ME];
  for (let i = 1; i < n; i++) out.push({ name: `학생${i + 1}`, s: POOL[Math.floor(r() * POOL.length)] });
  return out;
}

const mean = (xs: readonly number[]) => xs.reduce((a, c) => a + c, 0) / xs.length;
const spread = (xs: readonly number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, c) => a + (c - m) ** 2, 0) / xs.length);
};

// 배치를 50번 다시 뽑았을 때 BN이 쓰는 수학 평균들
function resampleMeans(n: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < 50; k++) out.push(mean(makeBatch(n, 1000 + k).map((st) => st.s[MATH])));
  return out;
}

type Mode = "bn" | "ln";
const MODE_OPTIONS = [
  { value: "bn" as const, label: "BatchNorm" },
  { value: "ln" as const, label: "LayerNorm" },
];

// 점수 40..100 을 SVG 가로 60..620 에 놓는다.
const toX = (v: number) => 60 + ((v - 40) / 60) * 560;

function ScoreLab() {
  const theme = useGrokTheme();
  const [mode, setMode] = useState<Mode>("bn");
  const [n, setN] = useState(8);
  const [seed, setSeed] = useState(1);

  const batch = useMemo(() => makeBatch(n, seed), [n, seed]);
  const resampled = useMemo(() => resampleMeans(n), [n]);
  const bn = mode === "bn";

  const mathCol = batch.map((st) => st.s[MATH]);
  const bnMean = mean(mathCol);
  const bnSd = spread(mathCol);
  const lnMean = mean(ME.s);
  const lnSd = spread(ME.s);
  const lnZ = (ME.s[MATH] - lnMean) / lnSd;
  const bnZ = n > 1 ? (ME.s[MATH] - bnMean) / bnSd : null;
  // 범위에는 지금 표의 배치도 넣는다.
  const lo = Math.min(bnMean, ...resampled);
  const hi = Math.max(bnMean, ...resampled);

  let now: string;
  if (!bn) {
    now = `영희 한 명의 네 과목을 가로로 평균 냅니다. 배치가 ${n}명이어도 영희 결과는 그대로입니다.`;
  } else if (n === 1) {
    now = "배치에 영희 한 명뿐입니다. 수학 점수가 하나라 퍼짐이 0이고, BatchNorm은 쓸 만한 값을 내지 못합니다.";
  } else {
    now = `학생 ${n}명의 수학 점수를 세로로 평균 냅니다. 같이 뽑힌 친구가 바뀌면 영희 결과도 바뀝니다.`;
  }

  const shown = batch.slice(0, 6);
  const rowH = 30;
  const colX = [40, 140, 240, 340, 440, 540, 640];
  const top = 40;
  const extraRows = (n > 6 ? 1 : 0) + (bn ? 1 : 0);
  const tableBottom = top + rowH * (1 + shown.length + extraRows);
  const stripY = 385;

  const cellText = { ...theme.font.subtext, fill: theme.text.primary };
  const headText = { ...theme.font.subtext, fill: theme.text.secondary };
  const hiText = { ...theme.font.subtext, fill: theme.text.accentDeep, fontWeight: theme.weight.medium };
  const caption = { ...theme.font.caption, fill: theme.text.secondary };

  const isHi = (row: number, col: number) => (bn ? col === MATH : row === 0);
  const colCount = bn ? 4 : 5;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Callout lead="지금 보고 있는 것" tone="info">
        {now}
      </Callout>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode} />
        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          style={{
            ...theme.font.subtext,
            fontFamily: theme.font.family,
            color: theme.text.primary,
            background: theme.fill.secondary,
            border: `1px solid ${theme.border.default}`,
            borderRadius: theme.radius.md,
            padding: "6px 12px",
            minHeight: 36,
            cursor: "pointer",
          }}
        >
          새 배치 뽑기
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          htmlFor="ln-size"
          style={{ ...theme.font.subtext, color: theme.text.secondary, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
        >
          <span style={{ fontSize: theme.font.body2.fontSize }}>배치 크기 (학생 수)</span>
          <output htmlFor="ln-size" style={{ color: theme.text.primary, fontVariantNumeric: "tabular-nums" }}>
            {n}명
          </output>
        </label>
        <input
          id="ln-size"
          type="range"
          min={1}
          max={32}
          step={1}
          value={n}
          aria-valuetext={`${n}명`}
          onChange={(e) => {
            const next = Number(e.currentTarget.value);
            if (Number.isFinite(next)) setN(Math.min(32, Math.max(1, Math.round(next))));
          }}
          style={{ width: "100%", minWidth: 0, minHeight: 36, margin: 0, accentColor: theme.text.accent }}
        />
      </div>

      <figure style={{ margin: 0 }}>
        <svg
          viewBox="0 0 680 460"
          role="img"
          aria-labelledby="ln-lab-title ln-lab-desc"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <title id="ln-lab-title">학생과 과목 점수표, 평균 방향 강조 (예시)</title>
          <desc id="ln-lab-desc">
            행은 학생, 열은 과목입니다. BatchNorm은 수학 열을 세로로, LayerNorm은 영희 행을 가로로 평균 냅니다. 아래 줄은 배치를 다시
            뽑을 때 평균이 얼마나 흔들리는지 보여 줍니다.
          </desc>

          <text x={40} y={24} style={{ ...theme.font.subtext, fill: theme.text.accent }}>
            {bn ? "↓ 세로: 같은 과목(수학)을 학생들끼리 평균" : "→ 가로: 한 학생(영희)의 과목들끼리 평균"}
          </text>

          {bn ? (
            <rect
              x={colX[1 + MATH]}
              y={top}
              width={100}
              height={tableBottom - top}
              fill={theme.fill.accentSubtle}
              rx={4}
            />
          ) : (
            <rect x={colX[0]} y={top + rowH} width={600} height={rowH} fill={theme.fill.accentSubtle} rx={4} />
          )}

          {["이름", ...SUBJECTS, ...(bn ? [] : ["학생 평균"])].map((h, c) => (
            <text key={h} x={colX[c] + 50} y={top + 20} textAnchor="middle" style={headText}>
              {h}
            </text>
          ))}
          <line x1={40} y1={top + rowH} x2={colX[colCount + 1]} y2={top + rowH} stroke={theme.border.strong} />

          {shown.map((st, r) => {
            const y = top + rowH * (r + 1) + 20;
            return (
              <g key={`${st.name}-${r}`}>
                <text x={90} y={y} textAnchor="middle" style={r === 0 && !bn ? hiText : cellText}>
                  {st.name}
                </text>
                {st.s.map((v, c) => (
                  <text key={c} x={colX[c + 1] + 50} y={y} textAnchor="middle" style={isHi(r, c) ? hiText : cellText}>
                    {v}
                  </text>
                ))}
                {!bn && (
                  <text x={colX[5] + 50} y={y} textAnchor="middle" style={r === 0 ? hiText : cellText}>
                    {mean(st.s).toFixed(1)}
                  </text>
                )}
              </g>
            );
          })}

          {n > 6 && (
            <text x={90} y={top + rowH * (shown.length + 1) + 20} textAnchor="middle" style={caption}>
              … 외 {n - 6}명
            </text>
          )}

          {bn && (
            <g>
              <line
                x1={40}
                y1={tableBottom - rowH}
                x2={540}
                y2={tableBottom - rowH}
                stroke={theme.border.strong}
              />
              <text x={90} y={tableBottom - 10} textAnchor="middle" style={headText}>
                배치 평균
              </text>
              {SUBJECTS.map((_, c) => (
                <text
                  key={c}
                  x={colX[c + 1] + 50}
                  y={tableBottom - 10}
                  textAnchor="middle"
                  style={c === MATH ? hiText : cellText}
                >
                  {mean(batch.map((st) => st.s[c])).toFixed(1)}
                </text>
              ))}
            </g>
          )}

          <text x={40} y={stripY - 30} style={{ ...theme.font.subtext, fill: theme.text.primary }}>
            {bn
              ? `배치(${n}명)를 50번 다시 뽑을 때 BatchNorm이 쓰는 수학 평균`
              : "LayerNorm이 쓰는 영희 평균 (배치와 무관)"}
          </text>
          <line x1={60} y1={stripY} x2={620} y2={stripY} stroke={theme.border.strong} />
          {[40, 50, 60, 70, 80, 90, 100].map((t) => (
            <g key={t}>
              <line x1={toX(t)} y1={stripY} x2={toX(t)} y2={stripY + 4} stroke={theme.border.strong} />
              <text x={toX(t)} y={stripY + 18} textAnchor="middle" style={caption}>
                {t}
              </text>
            </g>
          ))}
          {bn ? (
            <g>
              {resampled.map((m, i) => (
                <circle
                  key={i}
                  cx={toX(m)}
                  cy={stripY - 6 - (i % 4) * 5}
                  r={3}
                  fill={theme.dataviz.categorical[1]}
                  fillOpacity={0.7}
                />
              ))}
              <circle cx={toX(bnMean)} cy={stripY - 12} r={6} fill="none" stroke={theme.text.accent} strokeWidth={2} />
            </g>
          ) : (
            <circle cx={toX(lnMean)} cy={stripY - 12} r={6} fill={theme.dataviz.categorical[0]} />
          )}
          <text x={40} y={stripY + 44} style={caption}>
            {bn ? "작은 점 = 다시 뽑은 배치 하나. 동그라미 = 지금 표의 배치." : "점이 하나뿐입니다. 배치를 바꿔도 같은 자리입니다."}
          </text>
        </svg>
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
          행 = 샘플(학생), 열 = 뉴런(과목). 영희 점수와 모든 수치는 예시입니다.
        </figcaption>
      </figure>

      <Properties
        items={
          bn
            ? [
                { label: "BatchNorm이 쓰는 수학 평균 (예시)", value: `${bnMean.toFixed(1)}점` },
                {
                  label: "지금 배치와 50번 다시 뽑은 배치의 평균 범위 (예시)",
                  value: n === 1 ? "항상 90.0점 (영희 혼자)" : `${lo.toFixed(1)} ~ ${hi.toFixed(1)}점`,
                },
                { label: "영희 수학의 정규화 결과 (예시)", value: bnZ === null ? "쓸 수 없음 (퍼짐 0)" : bnZ.toFixed(2) },
              ]
            : [
                { label: "LayerNorm이 쓰는 영희 평균 (예시)", value: `${lnMean.toFixed(1)}점` },
                { label: "지금 배치와 50번 다시 뽑은 배치의 평균 범위 (예시)", value: `항상 ${lnMean.toFixed(1)}점` },
                { label: "영희 수학의 정규화 결과 (예시)", value: lnZ.toFixed(2) },
              ]
        }
      />
    </div>
  );
}


/* ---------- 숫자 실험실 공통 부품 ---------- */

type Theme = ReturnType<typeof useGrokTheme>;

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  show: string;
  onChange: (v: number) => void;
}

function Slider({ id, label, value, min, max, step, show, onChange }: SliderProps) {
  const theme = useGrokTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <label
        htmlFor={id}
        style={{ ...theme.font.subtext, color: theme.text.secondary, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}
      >
        <span style={{ fontSize: theme.font.body2.fontSize }}>{label}</span>
        <output htmlFor={id} style={{ color: theme.text.primary, fontVariantNumeric: "tabular-nums" }}>
          {show}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={show}
        onChange={(e) => {
          const next = Number(e.currentTarget.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
        style={{ width: "100%", minWidth: 0, minHeight: 36, margin: 0, accentColor: theme.text.accent }}
      />
    </div>
  );
}

function btnStyle(theme: Theme): CSSProperties {
  return {
    ...theme.font.subtext,
    fontFamily: theme.font.family,
    color: theme.text.primary,
    background: theme.fill.secondary,
    border: `1px solid ${theme.border.default}`,
    borderRadius: theme.radius.md,
    padding: "6px 12px",
    minHeight: 36,
    cursor: "pointer",
  };
}

function Btn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  const theme = useGrokTheme();
  return (
    <button type="button" onClick={onClick} style={btnStyle(theme)}>
      {children}
    </button>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>{children}</div>;
}

function Formula({ children }: { children: ReactNode }) {
  const theme = useGrokTheme();
  return (
    <div
      style={{
        ...theme.font.subtext,
        fontFamily: theme.font.mono,
        color: theme.text.primary,
        background: theme.bg.subtle,
        borderRadius: theme.radius.md,
        padding: "10px 12px",
        overflowWrap: "anywhere",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  const theme = useGrokTheme();
  return <p style={{ ...theme.font.caption, color: theme.text.secondary, margin: 0 }}>{children}</p>;
}

// 값의 개수로 나누어 분산을 구한다(원문 식 (2)·(3)과 같은 방식). 분모가 0이면 정의 불가(null).
function normalize(v: readonly number[], epsilon = 0) {
  const m = mean(v);
  const variance = mean(v.map((x) => (x - m) ** 2));
  const denom = Math.sqrt(variance + epsilon);
  return {
    mean: m,
    variance,
    sd: Math.sqrt(variance),
    values: v.map((x) => (denom === 0 ? null : (x - m) / denom)),
  };
}

const fmtN = (x: number | null) =>
  x === null ? "정의 불가" : (Math.abs(x) < 0.0005 ? 0 : x).toLocaleString("ko-KR", { maximumFractionDigits: 3 });
const arr = (a: readonly (number | null)[]) => `[${a.map(fmtN).join(", ")}]`;

interface Series {
  values: (number | null)[];
  color: string;
}

// 특징마다 0에서 뻗는 가로 막대. 여러 계열이면 특징마다 "전/후" 두 줄.
function BarChart({ series, title, limit }: { series: Series[]; title: string; limit?: number }) {
  const theme = useGrokTheme();
  const W = 360;
  const all = series.flatMap((s) => s.values).filter((x): x is number => x !== null);
  const lim = limit ?? Math.max(1, Math.ceil(Math.max(0, ...all.map(Math.abs)) * 2) / 2);
  const left = 76;
  const right = W - 62;
  const x = (v: number) => left + ((v + lim) / (2 * lim)) * (right - left);
  const S = series.length;
  const n = series[0].values.length;
  const h = n * S * 34 + 40;
  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  const label = { ...theme.font.caption, fill: theme.text.primary };
  return (
    <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={title} style={{ display: "block", width: "100%", height: "auto" }}>
      <title>{title}</title>
      {[-lim, 0, lim].map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={5} y2={h - 29} stroke={v === 0 ? theme.border.strong : theme.border.default} />
          <text x={x(v)} y={h - 10} textAnchor="middle" style={caption}>
            {fmtN(v)}
          </text>
        </g>
      ))}
      {Array.from({ length: n }, (_, i) =>
        series.map((s, k) => {
          const y = 8 + (i * S + k) * 34;
          const v = s.values[i];
          return (
            <g key={`${i}-${k}`}>
              <text x={0} y={y + 17} style={label}>
                특징 {i + 1}
                {S > 1 ? (k === 0 ? " 전" : " 후") : ""}
              </text>
              {v !== null ? (
                <rect x={Math.min(x(0), x(v))} y={y + 3} width={Math.abs(x(v) - x(0))} height={19} rx={2} fill={s.color} />
              ) : null}
              {v === 0 ? <circle cx={x(0)} cy={y + 12} r={3} fill={s.color} /> : null}
              <text x={W - 1} y={y + 17} textAnchor="end" style={label}>
                {fmtN(v)}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

/* ---------- 숫자로 확인: 누구끼리 묶나 ---------- */

type Axis = "bn" | "ln";
const AXIS_OPTIONS = [
  { value: "bn" as const, label: "BatchNorm · 세로" },
  { value: "ln" as const, label: "LayerNorm · 가로" },
];
const SAMPLE_NAMES = ["A", "B", "C"];

function AxisLab() {
  const theme = useGrokTheme();
  const [axis, setAxis] = useState<Axis>("ln");
  const [shift, setShift] = useState(0);
  const isLN = axis === "ln";

  const data = [[1, 2, 3], [2, 4, 6].map((x) => x + shift), [4, 6, 8]];
  const groups = isLN ? data : data[0].map((_, j) => data.map((row) => row[j]));
  const ss = groups.map((v) => normalize(v));
  const a = isLN ? ss[0].values : ss.map((s) => s.values[0]);
  const colors = theme.dataviz.categorical;

  const W = 440;
  const cellW = 116;
  const rowH = 44;
  const top = 30;
  const head = { ...theme.font.caption, fill: theme.text.secondary };
  const small = { ...theme.font.caption, fill: theme.text.secondary };
  const strong = { ...theme.font.subtext, fill: theme.text.primary, fontWeight: 600 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row>
        <Segmented options={AXIS_OPTIONS} value={axis} onChange={setAxis} />
        <Btn onClick={() => setShift(0)}>처음 값</Btn>
      </Row>
      <Slider
        id="ln-shift"
        label="샘플 B 전체에 더할 값 (예시)"
        value={shift}
        min={-6}
        max={6}
        step={1}
        show={(shift > 0 ? "+" : "") + shift}
        onChange={(v) => setShift(Math.round(v))}
      />
      <figure style={{ margin: 0 }}>
        <svg
          viewBox={`0 0 ${W} ${top + rowH * 3 + 4}`}
          role="img"
          aria-label="샘플과 특징별 정규화 묶음 (예시)"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <title>샘플과 특징별 정규화 묶음 (예시)</title>
          <desc>행은 샘플, 열은 특징입니다. 같은 색 칸은 같은 평균과 분산을 함께 씁니다. 각 칸은 입력 → 정규화 값입니다.</desc>
          {["샘플", "특징 1", "특징 2", "특징 3"].map((h, c) => (
            <text key={h} x={c === 0 ? 24 : 54 + (c - 1) * (cellW + 6) + cellW / 2} y={18} textAnchor="middle" style={head}>
              {h}
            </text>
          ))}
          {data.map((row, r) => (
            <g key={r}>
              <text x={24} y={top + r * rowH + 27} textAnchor="middle" style={strong}>
                {SAMPLE_NAMES[r]}
              </text>
              {row.map((v, c) => {
                const g = isLN ? r : c;
                const z = ss[g].values[isLN ? c : r];
                const x0 = 54 + c * (cellW + 6);
                const y0 = top + r * rowH;
                return (
                  <g key={c}>
                    <rect x={x0} y={y0} width={cellW} height={rowH - 6} rx={6} fill={colors[g]} fillOpacity={0.16} stroke={colors[g]} strokeOpacity={0.5} />
                    <text x={x0 + 8} y={y0 + 14} style={small}>
                      모임 {g + 1}
                    </text>
                    <text x={x0 + cellW / 2} y={y0 + 31} textAnchor="middle" style={strong}>
                      {fmtN(v)} → {fmtN(z)}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
          표의 입력은 활성함수 직전의 가중합 a입니다. 행 = 샘플, 열 = 특징. 같은 색과 모임 번호 = 같은 평균·분산.
        </figcaption>
      </figure>
      <Table
        columns={["모임", "평균", "분산", "표준편차"]}
        align={["start", "end", "end", "end"]}
        rows={ss.map((s, i) => [
          `모임 ${i + 1} · ${isLN ? `샘플 ${SAMPLE_NAMES[i]}` : `특징 ${i + 1}`}`,
          fmtN(s.mean),
          fmtN(s.variance),
          fmtN(s.sd),
        ])}
      />
      <Callout lead="샘플 A의 정규화 값" tone="info">
        {arr(a)}.{" "}
        {isLN
          ? "샘플 B를 바꿔도 A는 자기 행만 보므로 그대로입니다."
          : "샘플 B가 같은 열의 평균·분산에 참여하므로 A의 값도 바뀝니다."}
      </Callout>
      <Note>정규화 값 = (입력 − 평균) ÷ 표준편차. 분산은 평균에서 벗어난 거리의 제곱을 평균 낸 값이고, 표준편차는 그 제곱근입니다.</Note>
    </div>
  );
}

/* ---------- 배치에 하나만 남기면 ---------- */

const FIRST = [1, 2, 3];
type EpsKey = "off" | "on";

function batchValues(n: number, epsilon = 0) {
  const data = Array.from({ length: n }, (_, r) => FIRST.map((x) => x * (r + 1)));
  const stats = FIRST.map((_, j) => normalize(data.map((row) => row[j]), epsilon));
  return { data, stats, values: stats.map((s) => s.values[0]) };
}

function BatchOneLab() {
  const theme = useGrokTheme();
  const [n, setN] = useState(3);
  const [epsKey, setEpsKey] = useState<EpsKey>("off");
  const eps = epsKey === "on" ? 0.00001 : 0;
  const bn = batchValues(n, eps);
  const ln = normalize(FIRST, eps);
  const vals = [...bn.values, ...ln.values].filter((x): x is number => x !== null);
  const lim = Math.max(1, Math.ceil(Math.max(...vals.map(Math.abs), 0) * 2) / 2);

  const msg =
    n === 1
      ? epsKey === "on"
        ? "보호 계산: BatchNorm의 분산은 여전히 0이며 출력도 모두 0입니다. ε는 나눗셈을 가능하게 할 뿐, 배치의 다양성을 만들지 않습니다."
        : "원문 식: BatchNorm은 각 열에 값이 하나라 분산이 0입니다. 0으로 나누므로 정의할 수 없습니다. LayerNorm은 이 행의 서로 다른 특징들로 계속 계산합니다."
      : "배치 크기를 바꾸면 BatchNorm의 첫 샘플 출력이 바뀝니다. LayerNorm은 첫 샘플 자체가 같아 출력도 같습니다.";

  const head = { ...theme.font.subtext, color: theme.text.primary, fontWeight: 600 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row>
        <Segmented
          options={[
            { value: "off" as const, label: "원문 식 그대로" },
            { value: "on" as const, label: "ε 보호 계산" },
          ]}
          value={epsKey}
          onChange={setEpsKey}
        />
        <Btn onClick={() => setN(1)}>배치 크기 1</Btn>
      </Row>
      <Slider id="ln-batch" label="배치 크기" value={n} min={1} max={4} step={1} show={`${n}개`} onChange={(v) => setN(Math.round(v))} />
      <Note>
        입력 샘플은 [1, 2, 3], [2, 4, 6], [3, 6, 9], [4, 8, 12] 중 앞에서부터 사용합니다. 아래는 항상 첫 샘플 [1, 2, 3]의 계산 결과입니다.
      </Note>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <div style={head}>BatchNorm · 세로로 모으기</div>
          <Note>
            평균 {arr(bn.stats.map((s) => s.mean))} · 분산 {arr(bn.stats.map((s) => s.variance))}
          </Note>
          <BarChart series={[{ values: bn.values, color: theme.dataviz.categorical[1] }]} title="첫 샘플의 배치 정규화 출력 (예시)" limit={lim} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <div style={head}>LayerNorm · 가로로 모으기</div>
          <Note>
            평균 {fmtN(ln.mean)} · 분산 {fmtN(ln.variance)}
          </Note>
          <BarChart series={[{ values: ln.values, color: theme.dataviz.categorical[0] }]} title="첫 샘플의 층 정규화 출력 (예시)" limit={lim} />
        </div>
      </div>
      <Callout lead="지금 보고 있는 것" tone={n === 1 ? "warning" : "info"}>
        {msg}
      </Callout>
    </div>
  );
}

/* ---------- gain·bias ---------- */

type GainScope = "all" | "one";

function GainLab() {
  const theme = useGrokTheme();
  const [gain, setGain] = useState(1);
  const [bias, setBias] = useState(0);
  const [scope, setScope] = useState<GainScope>("all");
  const one = scope === "one";

  const z = normalize(FIRST).values as number[];
  const g = z.map((_, i) => (!one || i === 0 ? gain : 1));
  const b = z.map((_, i) => (!one || i === 0 ? bias : 0));
  const y = z.map((v, i) => g[i] * v + b[i]);
  const ys = normalize(y);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row>
        <Segmented
          options={[
            { value: "all" as const, label: "모든 특징 함께" },
            { value: "one" as const, label: "특징 1만 조절" },
          ]}
          value={scope}
          onChange={setScope}
        />
        <Btn
          onClick={() => {
            setGain(1);
            setBias(0);
            setScope("all");
          }}
        >
          원상복귀
        </Btn>
      </Row>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Slider id="ln-gain" label="gain · 크기 조절" value={gain} min={-2} max={3} step={0.1} show={fmtN(gain)} onChange={setGain} />
        <Slider id="ln-bias" label="bias · 위치 이동" value={bias} min={-3} max={3} step={0.1} show={fmtN(bias)} onChange={setBias} />
      </div>
      <Formula>
        gain {arr(g)} × 정규화 값 {arr(z)} + bias {arr(b)} = {arr(y)}
      </Formula>
      <BarChart
        series={[
          { values: z, color: theme.dataviz.other },
          { values: y, color: theme.dataviz.categorical[0] },
        ]}
        title="특징별 정규화 직후(전)와 gain·bias 조절 후(후) (예시)"
      />
      <Note>회색 막대 = 정규화 직후. 파란 막대 = gain·bias 조절 후. 입력은 [1, 2, 3]입니다.</Note>
      <Callout lead="지금 보고 있는 것" tone="info">
        조절 후 평균 {fmtN(ys.mean)}, 분산 {fmtN(ys.variance)}.{" "}
        {one ? "특징 1의 gain·bias만 바뀝니다." : "같은 gain·bias를 모든 특징에 적용합니다."} 이 값은 활성함수에 넣기 전 값입니다.
      </Callout>
    </div>
  );
}

/* ---------- RNN: 시간마다 새 기준 ---------- */

const TIME_INPUTS = [
  [1, 2, 3],
  [2, 6, 10],
  [-2, 0, 4],
  [10, 12, 14],
];
type TimeView = "raw" | "norm";

function TimeLab() {
  const theme = useGrokTheme();
  const [t, setT] = useState(1);
  const [view, setView] = useState<TimeView>("norm");
  const v = TIME_INPUTS[t - 1];
  const n = normalize(v);
  const raw = view === "raw";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row>
        <Segmented
          options={[
            { value: "raw" as const, label: "가중합 입력" },
            { value: "norm" as const, label: "정규화 값" },
          ]}
          value={view}
          onChange={setView}
        />
        <Btn onClick={() => setT((s) => (s % TIME_INPUTS.length) + 1)}>다음 단계</Btn>
      </Row>
      <Slider id="ln-time" label="현재 시간 단계" value={t} min={1} max={4} step={1} show={String(t)} onChange={(x) => setT(Math.round(x))} />
      <Row>
        {TIME_INPUTS.map((_, i) => (
          <span
            key={i}
            style={{
              ...theme.font.caption,
              padding: "4px 10px",
              borderRadius: theme.radius.sm,
              background: i + 1 === t ? theme.fill.primary : theme.bg.subtle,
              color: i + 1 === t ? theme.text.onPrimary : theme.text.secondary,
            }}
          >
            시간 {i + 1}
          </span>
        ))}
      </Row>
      <Formula>
        현재 가중합 입력 {arr(v)} → 정규화 {arr(n.values)}
      </Formula>
      <Properties
        items={[
          { label: "현재 평균 (예시)", value: fmtN(n.mean) },
          { label: "현재 분산 (예시)", value: fmtN(n.variance) },
          { label: "현재 표준편차 (예시)", value: fmtN(n.sd) },
        ]}
      />
      <BarChart
        series={[{ values: raw ? v : n.values, color: raw ? theme.dataviz.other : theme.dataviz.categorical[0] }]}
        title={`시간 ${t}의 ${raw ? "가중합 입력" : "정규화 값"} (예시)`}
      />
      <Callout lead="지금 보고 있는 것" tone="info">
        현재 단계의 특징끼리 계산합니다. 시간축을 합치지 않습니다. 각 특징의 gain(크기 조절)과 bias(위치 이동)는 모든 시간 단계에서 공유합니다.
      </Callout>
      <Note>
        가중합 입력은 미리 정한 예시입니다. 이 화면은 정규화만 계산하며 RNN 학습을 재현하지 않습니다. 공유 gain = 1, bias = 0으로 두었습니다.
        그래프는 활성함수 적용 전 값입니다.
      </Note>
    </div>
  );
}

/* ---------- 확인 퀴즈 ---------- */

interface QuizItem {
  q: string;
  choices: string[];
  correct: number;
  why: string;
}

function Quiz({ items }: { items: readonly QuizItem[] }) {
  const theme = useGrokTheme();
  const [answers, setAnswers] = useState<(number | null)[]>(() => items.map(() => null));
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === items[i].correct).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {items.map((it, i) => {
        const a = answers[i];
        return (
          <div key={it.q} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...theme.font.body1, color: theme.text.primary, fontWeight: 600 }}>
              {i + 1}. {it.q}
            </div>
            <div role="group" aria-label={`${i + 1}번 답 고르기`} style={{ display: "grid", gap: 8 }}>
              {it.choices.map((c, j) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={a === j}
                  onClick={() => setAnswers((prev) => prev.map((v, k) => (k === i ? j : v)))}
                  style={{
                    ...btnStyle(theme),
                    textAlign: "left",
                    background: a === j ? theme.fill.accentSubtle : theme.fill.secondary,
                    borderColor: a === j ? theme.text.accent : theme.border.default,
                  }}
                >
                  {String.fromCharCode(65 + j)}. {c}
                </button>
              ))}
            </div>
            {a !== null ? (
              <Callout lead={a === it.correct ? "정답입니다" : "다시 생각해 보세요"} tone={a === it.correct ? "success" : "warning"}>
                {it.why}
              </Callout>
            ) : null}
          </div>
        );
      })}
      <Note>{answered ? `선택한 문제 ${answered} / ${items.length} · 현재 정답 ${correct}개` : "아직 답을 고르지 않았습니다."}</Note>
    </div>
  );
}

const QUIZ: QuizItem[] = [
  {
    q: "LayerNorm은 숫자표에서 어느 값들을 함께 묶나요?",
    choices: ["같은 특징의 여러 샘플을 세로로 묶습니다.", "한 샘플의 여러 특징을 가로로 묶습니다.", "모든 샘플과 특징을 한꺼번에 묶습니다."],
    correct: 1,
    why: "LayerNorm은 한 샘플의 같은 층 특징들로 평균·분산을 구합니다. (p.2, §3)",
  },
  {
    q: "배치 크기 1에서 ε 보호 계산을 켜면, 숫자표의 BatchNorm은 어떻게 되나요?",
    choices: ["여러 샘플이 있는 것처럼 다양성이 생깁니다.", "분산은 0이고 정규화 출력도 모두 0입니다.", "LayerNorm과 항상 같은 출력을 냅니다."],
    correct: 1,
    why: "입력에서 자기 자신인 평균을 빼면 0입니다. ε는 분모만 보호합니다. (식 (2)로 계산한 예시. ε는 논문 밖)",
  },
  {
    q: "RNN의 시간 단계가 바뀔 때 맞는 설명은 무엇인가요?",
    choices: [
      "평균·분산과 gain·bias를 모두 이전 단계 값으로 고정합니다.",
      "시간축의 모든 입력을 모아 하나의 평균·분산을 씁니다.",
      "현재 단계의 통계는 다시 구하고, gain·bias는 시간 전체에서 공유합니다.",
    ],
    correct: 2,
    why: "통계는 현재 입력에서 계산하며, 학습하는 gain·bias는 시간 단계 사이에 공유합니다. (p.3, §3.1)",
  },
];

/* ---------- 글 ---------- */

export default function App() {
  return (
    <Page
      title="레이어 정규화 쉽게 보기 (Ba·Kiros·Hinton, 2016)"
      summary="레이어 정규화는 평균을 내는 방향을 바꿉니다. 여러 샘플의 같은 뉴런이 아니라, 샘플 하나 안의 모든 뉴런으로 평균을 냅니다. 그래서 배치 크기와 상관없고, 학습 때와 테스트 때 계산이 똑같습니다. RNN에서는 시점마다 새로 계산하고 gain·bias만 공유합니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "직접 움직여 보기: 점수표", id: "lab" },
          { label: "숫자로 확인: 누구끼리 묶나", id: "axis" },
          { label: "배치에 하나만 남기면", id: "batch-one" },
          { label: "다시 펴고 옮기기: gain·bias", id: "gain" },
          { label: "RNN: 시간마다 새 기준", id: "rnn" },
          { label: "BatchNorm과 나란히 비교", id: "compare" },
          { label: "논문 근거 위치", id: "evidence" },
          { label: "주의: 합성곱망에서는 약함", id: "caution" },
          { label: "확인 질문과 답", id: "quiz" },
          { label: "출처", id: "source" },
        ]}
      />

      <Section heading="한 장면 비유" id="analogy">
        <Text>
          배치 정규화(Batch Normalization, BatchNorm)는 반 친구들의 수학 점수로 표준점수를 내는 것과 같습니다. 레이어
          정규화(Layer Normalization, LayerNorm)는 한 학생의 여러 과목 점수를 그 학생 자신의 평균으로 맞추는 것과 같습니다.
          그래서 LayerNorm은 반에 친구가 몇 명이든, 혼자 시험을 봐도 똑같이 계산할 수 있습니다.
        </Text>
        <Callout lead="비유의 한계" tone="warning">
          과목은 서로 다른 시험이지만, 뉴런은 같은 층에서 같은 입력을 받아 만든 값입니다. 그래서 뉴런끼리 평균을 내는 것이
          과목끼리 평균을 내는 것보다 덜 어색합니다. 또 LayerNorm은 정규화 뒤 뉴런마다 gain·bias로 다시 조절합니다.
        </Callout>
        <Table
          columns={["용어", "뜻"]}
          rows={[
            ["미니배치(mini-batch)", "한 번에 같이 학습하는 샘플 묶음"],
            ["샘플(training case)", "데이터 한 개. 비유에서는 학생 한 명"],
            ["뉴런(neuron, hidden unit)", "층 안의 계산 칸 하나. 비유에서는 과목 하나. 숫자표에서는 특징 하나"],
            ["가중합 입력(summed input) a", "뉴런이 활성함수에 넣기 전에 받은 값"],
            ["정규화(normalization)", "값들을 평균 0, 퍼짐 1로 다시 맞추는 일"],
            ["분산·표준편차", "분산은 평균에서 벗어난 거리의 제곱을 평균 낸 값. 표준편차는 그 제곱근"],
            ["gain·bias", "정규화 뒤 다시 곱하고 더하는 조절값. 뉴런마다 하나씩, 학습으로 정함"],
            ["시점(time-step)", "RNN이 문장을 한 단어씩 읽을 때 몇 번째 단어인지"],
          ]}
        />
        <Text>
          아래 실험은 두 겹입니다. 먼저 점수표로 큰 그림을 봅니다. 이어서 작은 숫자표로 같은 내용을 정확히 계산하고, gain·bias와 RNN까지
          넓혀 봅니다. 모든 입력과 계산 결과는 예시 값입니다. 정확도나 학습 속도 예측은 포함하지 않습니다.
        </Text>
      </Section>

      <Section heading="직접 움직여 보기: 점수표" id="lab" caption="모든 점수와 수치는 예시입니다">
        <Text>
          먼저 BatchNorm과 LayerNorm을 번갈아 누르십시오. 강조되는 방향이 세로 열에서 가로 행으로 바뀝니다.
        </Text>
        <ScoreLab />
        <Text>
          BatchNorm에서 배치 크기를 32에서 2로 줄이십시오. 아래 줄의 작은 점들이 넓게 흩어집니다. 배치가 작을수록 평균이
          함께 뽑힌 친구에 따라 크게 흔들립니다 (논문 밖 직관).
        </Text>
        <Text>
          이제 LayerNorm을 누르고 같은 슬라이더를 움직이십시오. 점은 하나뿐이고 자리도 그대로입니다. "새 배치 뽑기"를 눌러도
          영희의 결과는 바뀌지 않습니다.
        </Text>
      </Section>

      <Section heading="숫자로 확인: 누구끼리 묶나" id="axis" caption="예시 값 · p.2, §2 식 (2) · §3 식 (3)">
        <Text>
          점수표에서 본 "방향"을 3×3 숫자표로 정확히 계산합니다. 행은 샘플(점수표의 학생), 열은 특징(점수표의 과목)입니다. 샘플 B의 값만
          바꾸면 샘플 A의 계산도 바뀔까요? 두 방법을 번갈아 누르고 슬라이더를 움직여 보십시오.
        </Text>
        <AxisLab />
        <Text>
          BatchNorm에서는 B가 A와 같은 열에 있으므로 A의 결과가 따라 움직입니다. 점수표에서 "같이 뽑힌 친구가 바뀌면 영희 결과도 바뀐다"고
          한 것과 같은 현상입니다. LayerNorm에서는 A의 행만 보므로 A의 값이 움직이지 않습니다.
        </Text>
      </Section>

      <Section heading="배치에 하나만 남기면" id="batch-one" caption="예시 값 · ε = 0.00001은 논문 밖 예시 설정">
        <Text>
          배치 크기를 1까지 줄여 보십시오. 세로(같은 특징)에는 값이 하나만 남습니다. 가로(한 샘플의 특징들)에는 서로 다른 값들이 남습니다
          (p.2, §2 식 (2) · §3 식 (3)).
        </Text>
        <BatchOneLab />
        <Text>
          원문의 식 (2)~(4)에는 ε가 없습니다. 실제 구현은 분산에 작은 수 ε를 더해 0으로 나누는 일을 막습니다. "ε 보호 계산"을 켜면 나눗셈은
          되지만 BatchNorm 출력은 모두 0입니다. ε가 다양성을 만들어 주지는 않습니다. 이 화면은 값의 개수로 나누어 분산을 계산합니다.
        </Text>
        <Callout lead="일반화 주의" tone="warning">
          이 숫자표는 샘플마다 각 특징값이 하나씩 있는 완전연결층의 학습 예시입니다. CNN이나 추론 단계 전체에 일반화하지 마십시오.
          LayerNorm도 한 샘플의 특징값이 모두 같으면 원문 식의 분모가 0이 됩니다.
        </Callout>
      </Section>

      <Section heading="다시 펴고 옮기기: gain·bias" id="gain" caption="예시 값 · p.3, §3.1 식 (4) · p.1 초록">
        <Text>
          정규화만 하면 값이 늘 평균 0, 퍼짐 1에 묶입니다. 그래서 LayerNorm은 정규화한 값에 gain을 곱하고 bias를 더합니다. 이 조절은 비선형
          함수(활성함수)에 넣기 전에 합니다 (p.1 초록). 배치 정규화의 γ·β와 같은 역할입니다.
        </Text>
        <GainLab />
        <Text>
          원래는 특징(뉴런)마다 별도의 gain과 bias가 있습니다. 이 화면은 모든 특징에 같은 값을 쓰거나, 특징 1만 바꿉니다. 학습 중에는 모델이
          이 값을 배웁니다.
        </Text>
      </Section>

      <Section heading="RNN: 시간마다 새 기준" id="rnn" caption="예시 값 · p.3, §3.1 식 (4)">
        <Text>
          RNN(순환 신경망, recurrent neural network)은 이전 상태를 다음 단계에 전달하며 문장을 한 단어씩 읽습니다. LayerNorm은 시점마다 그
          시점의 특징들로 평균·분산을 다시 구합니다. 시간 단계를 바꿔 보십시오.
        </Text>
        <TimeLab />
        <Text>
          RNN에서 두 방법의 차이가 특히 큽니다. BatchNorm은 시점마다 통계를 따로 저장합니다. 그래서 테스트 문장이 학습 때 본 어떤 문장보다
          길면 쓸 통계가 없습니다. LayerNorm은 그 시점의 값만으로 계산하므로 이 문제가 없습니다 (p.3 §3.1).
        </Text>
      </Section>

      <Section heading="BatchNorm과 나란히 비교" id="compare">
        <Grid columns={2}>
          <Properties
            items={[
              { label: "방법", value: "BatchNorm" },
              { label: "평균 내는 방향", value: "같은 뉴런 × 여러 샘플 (세로)" },
              { label: "배치 크기 의존", value: "작으면 평균이 흔들림 (p.2 §2)" },
              { label: "학습·테스트", value: "테스트 땐 모아 둔 평균(running average) 사용 (p.1 §1)" },
              { label: "RNN 적용", value: "시점마다 통계를 따로 저장해야 함 (p.3 §3.1)" },
              { label: "잘 맞는 모델", value: "합성곱망(CNN) (p.10 §6.7)" },
            ]}
          />
          <Properties
            items={[
              { label: "방법", value: "LayerNorm" },
              { label: "평균 내는 방향", value: "샘플 하나 × 같은 층 모든 뉴런 (가로)" },
              { label: "배치 크기 의존", value: "없음. 배치 1도 가능 (p.2 §3)" },
              { label: "학습·테스트", value: "두 때 계산이 똑같음 (p.1 초록)" },
              { label: "RNN 적용", value: "시점마다 그 자리에서 계산, gain·bias는 공유 (p.3 §3.1)" },
              { label: "잘 맞는 모델", value: "RNN, 작은 배치 (p.7 §6.1, p.10 그림 6)" },
            ]}
          />
        </Grid>
        <Text>
          위 실험들을 이 표에 맞춰 보면 이렇습니다. "누구끼리 묶나"는 평균 내는 방향, "배치에 하나만 남기면"은 배치 크기 의존, "RNN: 시간마다
          새 기준"은 RNN 적용 줄입니다.
        </Text>
        <Text>
          결과도 있습니다. 이미지·문장 검색 모델은 최고 검증 성능에 도달하는 데 기준 모델 시간의 60%만 걸렸습니다 (p.7
          §6.1). MNIST 실험에서는 배치 크기 4일 때도 LayerNorm이 안정적이었습니다 (p.10 그림 6).
        </Text>
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["샘플 하나 안의 모든 뉴런 값으로 평균·분산 계산", "p.1 초록, p.2 §3 식 (3)"],
            ["정규화 뒤, 비선형 함수 전에 뉴런마다 gain·bias", "p.1 초록"],
            ["학습 때와 테스트 때 계산이 똑같음", "p.1 초록"],
            ["BatchNorm은 미니배치로 통계를 추정해 배치 크기에 제약", "p.2 §2 식 (2)"],
            ["배치 크기 제약 없음, 배치 1로도 사용 가능", "p.2 §3"],
            ["RNN: 시점마다 따로 정규화, gain·bias는 모든 시점 공유", "p.3 §3.1 식 (4)"],
            ["원문 식 (2)~(4)에는 ε 없음 (실험의 ε는 논문 밖)", "p.2~3 식 (2)~(4)"],
            ["입력 전체를 몇 배로 키워도 결과가 같음", "p.4 표 1"],
            ["최고 검증 성능까지 기준 모델 시간의 60%", "p.7 §6.1"],
            ["배치 크기 4에서도 안정적", "p.10 그림 6"],
            ["합성곱망에서는 BatchNorm이 더 좋음", "p.10 §6.7"],
          ]}
        />
        <Callout lead="핵심 원문 문장 (p.1 초록)">
          "we transpose batch normalization into layer normalization by computing the mean and variance used for
          normalization from all of the summed inputs to the neurons in a layer on a single training case."
        </Callout>
      </Section>

      <Section heading="주의: 합성곱망에서는 약함" id="caution">
        <Text>
          LayerNorm이 BatchNorm보다 항상 낫다는 뜻이 아닙니다. 저자들도 합성곱망(CNN, 이미지용 신경망)에서는 BatchNorm이 더
          좋았다고 밝힙니다 (p.10 §6.7).
        </Text>
        <Callout lead="저자들이 본 이유" tone="warning">
          이미지 가장자리를 보는 뉴런은 거의 꺼져 있습니다. 그래서 같은 층 뉴런들의 통계가 서로 너무 다릅니다. 한 평균으로
          묶기 어렵다는 뜻입니다. 저자들은 더 연구가 필요하다고 썼습니다 (p.10 §6.7).
        </Callout>
        <Text>
          비유로 말하면, 한 학생의 과목 중 몇 개가 늘 0점이면 그 학생의 평균은 나머지 과목을 잘 대표하지 못합니다 (추정, 비유
          설명).
        </Text>
      </Section>

      <Section heading="확인 질문과 답" id="quiz">
        <Callout lead="질문" tone="info">
          배치 크기가 1일 때, BatchNorm은 왜 곤란하고 LayerNorm은 왜 괜찮을까요? 점수표 위젯이나 "배치에 하나만 남기면" 실험에서 배치 크기를
          1로 두고 두 방법을 번갈아 본 뒤, 먼저 말로 답해 보십시오.
        </Callout>
        <Text>
          BatchNorm은 같은 뉴런의 값을 미니배치 안 여러 샘플에 걸쳐 평균 냅니다. 배치에 샘플이 하나뿐이면 평균은 그 값
          자신이고 퍼짐은 0입니다. 논문도 BatchNorm이 현재 미니배치로 평균과 분산을 추정하므로 배치 크기에 제약이 생긴다고
          씁니다 (p.2 §2).
        </Text>
        <Callout lead="답" tone="success">
          LayerNorm은 샘플 하나 안에서 같은 층의 모든 뉴런 값으로 평균과 분산을 냅니다. 다른 샘플이 필요 없습니다. 그래서
          배치 크기에 제약이 없고, 배치 크기 1인 순수 온라인 학습(pure online regime)에서도 쓸 수 있습니다 (p.2 §3).
        </Callout>
        <Text>이어서 세 문제를 더 풀어 보십시오. 답을 고르면 정답 여부와 이유가 나옵니다.</Text>
        <Quiz items={QUIZ} />
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Jimmy Lei Ba, Jamie Ryan Kiros, Geoffrey E. Hinton. "Layer Normalization". 2016. https://arxiv.org/abs/1607.06450
          (arXiv v1)
        </Text>
      </Section>
    </Page>
  );
}
