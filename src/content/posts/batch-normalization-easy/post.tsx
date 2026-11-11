import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Table,
  Bars,
  Grid,
  Properties,
  Segmented,
  useGrokTheme,
  useMemo,
  useState,
} from "@/components/canvas";
import type { CSSProperties, ReactNode } from "@/components/canvas";

// 화면 숫자는 모두 예시 값이다. 같은 결과가 나오도록 고정 시드와 고정 값만 쓴다.
type Theme = ReturnType<typeof useGrokTheme>;

function makeRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBatch(seed: number): number[] {
  const r = makeRandom(seed);
  const out: number[] = [];
  for (let i = 0; i < 64; i++) {
    const u = Math.max(r(), 1e-9);
    const v = r();
    out.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
  }
  return out;
}

type BatchKey = "a" | "b" | "c";
type BnKey = "off" | "on";

const BATCHES: Record<BatchKey, number[]> = {
  a: makeBatch(7),
  b: makeBatch(8),
  c: makeBatch(9),
};

const BN_OPTIONS = [
  { value: "off" as const, label: "BN 끄기" },
  { value: "on" as const, label: "BN 켜기" },
];

const BATCH_OPTIONS = [
  { value: "a" as const, label: "묶음 1" },
  { value: "b" as const, label: "묶음 2" },
  { value: "c" as const, label: "묶음 3" },
];

const mean = (xs: readonly number[]) => xs.reduce((a, c) => a + c, 0) / xs.length;
const spread = (xs: readonly number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, c) => a + (c - m) ** 2, 0) / xs.length);
};
// 평균과 분산(값의 개수 m으로 나눔, 알고리즘 1과 같은 방식)
const stat = (xs: readonly number[]) => {
  const m = mean(xs);
  return { m, v: mean(xs.map((x) => (x - m) ** 2)) };
};
// 소수 d자리. 아주 작은 값은 0으로 보인다.
const f = (x: number, d = 3) => (Math.abs(x) < 0.5 * 10 ** -d ? (0).toFixed(d) : x.toFixed(d));

const EPS = 0.00001;

/* ---------- 공통 작은 부품 ---------- */

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
        style={{ ...theme.font.subtext, color: theme.text.secondary, display: "flex", justifyContent: "space-between", gap: 8 }}
      >
        <span>{label}</span>
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

function Controls({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>{children}</div>
  );
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

function Figure({
  viewBox,
  title,
  desc,
  children,
  caption,
}: {
  viewBox: string;
  title: string;
  desc: string;
  children: ReactNode;
  caption?: ReactNode;
}) {
  const theme = useGrokTheme();
  return (
    <figure style={{ margin: 0, minWidth: 0 }}>
      <svg viewBox={viewBox} role="img" aria-label={title} style={{ display: "block", width: "100%", height: "auto" }}>
        <title>{title}</title>
        <desc>{desc}</desc>
        {children}
      </svg>
      {caption ? (
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/* ---------- 1. 큰 그림: 학습이 진행되면 ---------- */

// 값 -6..8 을 SVG 가로 40..640 에 놓는다.
const toX = (v: number) => Math.min(650, Math.max(30, 40 + ((v + 6) / 14) * 600));

function curvePath(center: number, sd: number, base: number) {
  const s = Math.max(sd, 0.25);
  let d = "";
  for (let i = 0; i <= 140; i++) {
    const v = -6 + i * 0.1;
    const h = Math.min(70, (45 / s) * Math.exp(-0.5 * ((v - center) / s) ** 2));
    d += `${i ? "L" : "M"}${toX(v).toFixed(1)} ${(base - h).toFixed(1)}`;
  }
  return d;
}

function BnLab() {
  const theme = useGrokTheme();
  const [bn, setBn] = useState<BnKey>("off");
  const [batchKey, setBatchKey] = useState<BatchKey>("a");
  const [progress, setProgress] = useState(0);

  const sim = useMemo(() => {
    const p = progress / 100;
    const mu = 3 * p;
    const sd = 1 + 1.5 * p;
    const raw = BATCHES[batchKey].slice(0, 32).map((z) => mu + sd * z);
    const mb = mean(raw);
    const sb = Math.sqrt(spread(raw) ** 2 + 1e-5);
    const on = bn === "on";
    const out = on ? raw.map((x) => (x - mb) / sb) : raw;
    const popCenter = on ? (mu - mb) / sb : mu;
    const popSd = on ? sd / sb : sd;
    return { raw, out, mb, sbRaw: spread(raw), mo: mean(out), so: spread(out), popCenter, popSd, mu, sd, on };
  }, [bn, batchKey, progress]);

  const now = sim.on
    ? "BN이 앞 층 값을 배치 평균 0, 배치 퍼짐 1로 다시 모아서 다음 층에 넘깁니다. 학습 진행을 움직여도 아래 칸은 0 근처에 남습니다."
    : progress === 0
      ? "BN이 꺼져 있습니다. 학습 진행 슬라이더를 오른쪽으로 밀어 보십시오."
      : "BN이 꺼져 있습니다. 앞 층 값이 밀리고 퍼진 그대로 다음 층에 들어갑니다.";

  const rawColor = theme.dataviz.categorical[1];
  const outColor = sim.on ? theme.dataviz.categorical[0] : rawColor;
  const ticks = [-6, -4, -2, 0, 2, 4, 6, 8];
  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  const panelLabel = { ...theme.font.subtext, fill: theme.text.primary };

  const axis = (base: number) => (
    <g>
      <line x1={40} y1={base} x2={640} y2={base} stroke={theme.border.strong} />
      <line x1={toX(0)} y1={base - 75} x2={toX(0)} y2={base} stroke={theme.border.default} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={toX(t)} y1={base} x2={toX(t)} y2={base + 4} stroke={theme.border.strong} />
          <text x={toX(t)} y={base + 18} textAnchor="middle" style={caption}>
            {t}
          </text>
        </g>
      ))}
    </g>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Callout lead="지금 보고 있는 것" tone="info">
        {now}
      </Callout>

      <Row>
        <Segmented options={BN_OPTIONS} value={bn} onChange={setBn} />
        <Segmented options={BATCH_OPTIONS} value={batchKey} onChange={setBatchKey} />
      </Row>

      <Figure
        viewBox="0 0 680 300"
        title="앞 층 값과 다음 층 입력 값의 분포 (예시)"
        desc="위 칸은 앞 층이 내보낸 값입니다. 아래 칸은 다음 층에 들어가는 값입니다. 점 하나가 예제 하나입니다."
        caption="점 = 배치 안의 예제 하나(32개). 점선 곡선 = 전체 데이터 분포. 세로 선 = 0. 모든 수치는 예시입니다."
      >
        <text x={40} y={22} style={panelLabel}>
          앞 층 출력 (BN 전)
        </text>
        {axis(120)}
        <path d={curvePath(sim.mu, sim.sd, 120)} fill="none" stroke={theme.text.tertiary} strokeDasharray="4 4" />
        {sim.raw.map((x, i) => (
          <circle key={`r${i}`} cx={toX(x)} cy={116 - (i % 6) * 6} r={3.5} fill={rawColor} fillOpacity={0.85} />
        ))}

        <text x={40} y={164} style={panelLabel}>
          {sim.on ? "다음 층 입력 (BN 뒤)" : "다음 층 입력 (BN 없음)"}
        </text>
        {axis(262)}
        <path d={curvePath(sim.popCenter, sim.popSd, 262)} fill="none" stroke={theme.text.tertiary} strokeDasharray="4 4" />
        {sim.out.map((x, i) => (
          <circle key={`o${i}`} cx={toX(x)} cy={258 - (i % 6) * 6} r={3.5} fill={outColor} fillOpacity={0.85} />
        ))}
      </Figure>

      <Slider
        id="bn-progress"
        label="학습 진행 (앞 층 변화)"
        value={progress}
        min={0}
        max={100}
        step={1}
        show={`${progress}%`}
        onChange={setProgress}
      />

      <Properties
        items={[
          { label: "앞 층 배치 평균 (예시)", value: sim.mb.toFixed(2) },
          { label: "앞 층 배치 퍼짐 (예시)", value: sim.sbRaw.toFixed(2) },
          { label: "다음 층 배치 평균 (예시)", value: sim.mo.toFixed(2) },
          { label: "다음 층 배치 퍼짐 (예시)", value: sim.so.toFixed(2) },
        ]}
      />
    </div>
  );
}

/* ---------- 2. 시그모이드의 평평한 끝 ---------- */

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const SIG_BASE = Array.from({ length: 9 }, (_, i) => (i - 4) / 2);

function SigmoidLab() {
  const theme = useGrokTheme();
  const [shift, setShift] = useState(5);
  const [bnOn, setBnOn] = useState<BnKey>("off");
  const on = bnOn === "on";

  const raw = SIG_BASE.map((x) => x + shift);
  const s = stat(raw);
  const z = on ? raw.map((x) => (x - s.m) / Math.sqrt(s.v + EPS)) : raw;
  const out = z.map(sigmoid);
  const d = out.map((y) => y * (1 - y));

  const W = 440;
  const H = 270;
  const L = 42;
  const R = 18;
  const top = 20;
  const B = 220;
  const X = (x: number) => L + ((x + 12) / 24) * (W - L - R);
  const Y = (y: number) => B - y * (B - top);
  let path = "";
  for (let i = 0; i <= 240; i++) {
    const x = -12 + i / 10;
    path += `${i ? " L " : "M "}${X(x).toFixed(1)} ${Y(sigmoid(x)).toFixed(1)}`;
  }
  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  const T = theme.dataviz.categorical[0];
  const G = theme.dataviz.other;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row>
        <Segmented
          options={[
            { value: "off" as const, label: "BN 없이" },
            { value: "on" as const, label: "시그모이드 앞에 BN" },
          ]}
          value={bnOn}
          onChange={setBnOn}
        />
        <Btn
          onClick={() => {
            setShift(5);
            setBnOn("off");
          }}
        >
          초기화
        </Btn>
      </Row>
      <Slider
        id="bn-shift"
        label="입력 전체의 이동량 (예시)"
        value={shift}
        min={-8}
        max={8}
        step={0.1}
        show={f(shift, 1)}
        onChange={setShift}
      />
      <Figure
        viewBox={`0 0 ${W} ${H}`}
        title="시그모이드 곡선과 현재 입력의 위치 (예시)"
        desc="곡선은 시그모이드입니다. 파란 점은 지금 계산에 쓰는 입력 9개입니다. BN을 켜면 회색 점이 BN 전 입력입니다."
        caption={on ? "파란 점 = 시그모이드에 실제로 들어가는 입력. 회색 점 = BN을 적용하기 전 입력." : "파란 점 = 시그모이드에 실제로 들어가는 입력 9개(예시)."}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((y) => (
          <g key={y}>
            <line x1={L} y1={Y(y)} x2={W - R} y2={Y(y)} stroke={theme.border.default} />
            <text x={L - 7} y={Y(y) + 4} textAnchor="end" style={caption}>
              {y}
            </text>
          </g>
        ))}
        {[-12, -8, -4, 0, 4, 8, 12].map((x) => (
          <g key={x}>
            <line x1={X(x)} y1={top} x2={X(x)} y2={B} stroke={theme.border.weak} />
            <text x={X(x)} y={241} textAnchor="middle" style={caption}>
              {x}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={theme.text.secondary} strokeWidth={2} />
        {on && raw.map((x, i) => <circle key={`g${i}`} cx={X(x)} cy={Y(sigmoid(x))} r={5} fill={G} fillOpacity={0.7} />)}
        {z.map((x, i) => (
          <circle key={`t${i}`} cx={X(x)} cy={Y(out[i])} r={5} fill={T} stroke={theme.bg.base} strokeWidth={1} />
        ))}
        <text x={W - R} y={263} textAnchor="end" style={caption}>
          시그모이드 입력
        </text>
        <text x={L} y={13} style={caption}>
          출력
        </text>
      </Figure>
      <Properties
        items={[
          { label: "원래 입력 평균 (예시)", value: f(s.m) },
          { label: "시그모이드 입력 평균 (예시)", value: f(mean(z)) },
          { label: "시그모이드 평균 기울기 (예시)", value: f(mean(d), 5) },
        ]}
      />
      <Formula>
        가운데 표본: 시그모이드 입력 {f(z[4])} → 출력 {f(out[4], 5)} → 기울기 = 출력 × (1 − 출력) = {f(d[4], 5)}
      </Formula>
    </div>
  );
}

/* ---------- 3. 평균을 빼고, 크기를 맞추기 ---------- */

const DATASETS = [
  [2, 4, 6, 8],
  [1, 2, 2, 3, 3, 3, 5, 8],
  [5, 5, 5, 5],
];

function binCounts(values: readonly number[], lo: number, hi: number, n = 12) {
  const counts = Array(n).fill(0) as number[];
  values.forEach((x) => counts[Math.min(n - 1, Math.max(0, Math.floor(((x - lo) / (hi - lo)) * n)))]++);
  return counts;
}

function Hist({
  values,
  lo,
  hi,
  countsMax,
  color,
  title,
}: {
  values: readonly number[];
  lo: number;
  hi: number;
  countsMax: number;
  color: string;
  title: string;
}) {
  const theme = useGrokTheme();
  const W = 440;
  const H = 208;
  const L = 35;
  const R = 12;
  const top = 20;
  const bottom = 168;
  const n = 12;
  const counts = binCounts(values, lo, hi, n);
  const dx = (W - L - R) / n;
  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ ...theme.font.subtext, color: theme.text.primary, fontWeight: theme.weight.medium }}>{title}</div>
      <Figure viewBox={`0 0 ${W} ${H}`} title={`${title}: 같은 구간에 속하는 값의 개수`} desc="가로축은 값, 세로축은 그 구간에 든 값의 개수입니다.">
        {[0, 1, 2].map((j) => {
          const c = (countsMax * j) / 2;
          const y = bottom - ((bottom - top) * j) / 2;
          return (
            <g key={j}>
              <line x1={L} y1={y} x2={W - R} y2={y} stroke={theme.border.default} />
              <text x={L - 6} y={y + 4} textAnchor="end" style={caption}>
                {f(c, c % 1 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        {counts.map((c, i) => {
          const hh = (c / countsMax) * (bottom - top);
          return (
            <g key={i}>
              <rect x={L + i * dx + 1} y={bottom - hh} width={dx - 2} height={hh} rx={2} fill={color} />
              {c ? (
                <text x={L + (i + 0.5) * dx} y={bottom - hh - 5} textAnchor="middle" style={caption}>
                  {c}
                </text>
              ) : null}
            </g>
          );
        })}
        {[0, 1, 2, 3, 4].map((j) => (
          <text key={j} x={L + ((W - L - R) * j) / 4} y={188} textAnchor="middle" style={caption}>
            {f(lo + ((hi - lo) * j) / 4, 1)}
          </text>
        ))}
        <text x={12} y={12} style={caption}>
          개수
        </text>
        <text x={W - 12} y={204} textAnchor="end" style={caption}>
          값
        </text>
      </Figure>
    </div>
  );
}

type AffineKey = "z" | "y";

function ComputeLab() {
  const theme = useGrokTheme();
  const [di, setDi] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [beta, setBeta] = useState(0);
  const [view, setView] = useState<AffineKey>("y");
  const affine = view === "y";

  const x = DATASETS[di];
  const s = stat(x);
  const z = x.map((v) => (v - s.m) / Math.sqrt(s.v + EPS));
  const y = z.map((v) => gamma * v + beta);
  const a = affine ? y : z;
  const as = stat(a);
  const all = [...x, ...a];
  const lo = Math.floor(Math.min(...all)) - 1;
  const hi = Math.ceil(Math.max(...all)) + 1;
  const maxC = Math.max(...[x, a].map((q) => Math.max(...binCounts(q, lo, hi))));

  const note =
    s.v === 0
      ? "모든 입력이 같아 분산은 0입니다. ε 덕분에 나눗셈이 가능하며, 모든 표준화 값은 0, 최종 출력은 β가 됩니다."
      : `표준화 값의 평균은 0이고, 분산은 ${f(stat(z).v, 6)}입니다. ε 때문에 정확히 1이 아닌 1에 가까운 값입니다. γ·β를 적용한 최종 출력은 평균 0·분산 1일 필요가 없습니다.`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row>
        <Segmented
          options={[
            { value: "z" as const, label: "표준화 x̂까지" },
            { value: "y" as const, label: "γ·β 적용 y까지" },
          ]}
          value={view}
          onChange={setView}
        />
        <Btn onClick={() => setDi((i) => (i + 1) % DATASETS.length)}>다음 예시 묶음</Btn>
        <Btn
          onClick={() => {
            setDi(0);
            setGamma(1);
            setBeta(0);
            setView("y");
          }}
        >
          초기화
        </Btn>
      </Row>
      <Controls>
        <Slider id="bn-gamma" label="γ 크기 조절" value={gamma} min={-3} max={3} step={0.1} show={f(gamma, 1)} onChange={setGamma} />
        <Slider id="bn-beta" label="β 위치 이동" value={beta} min={-6} max={6} step={0.1} show={f(beta, 1)} onChange={setBeta} />
      </Controls>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <Hist values={x} lo={lo} hi={hi} countsMax={maxC} color={theme.dataviz.categorical[1]} title="입력 x" />
        <Hist
          values={a}
          lo={lo}
          hi={hi}
          countsMax={maxC}
          color={theme.dataviz.categorical[0]}
          title={affine ? "최종 출력 y = γ × x̂ + β" : "표준화 값 x̂"}
        />
      </div>
      <Note>두 그림은 같은 가로축과 세로축을 씁니다. 가로축은 값, 세로축은 그 구간에 든 개수입니다.</Note>
      <Properties
        items={[
          { label: "입력 평균 (예시)", value: f(s.m) },
          { label: "입력 분산 (예시)", value: f(s.v) },
          { label: affine ? "최종 출력 평균 / 분산" : "표준화 평균 / 분산", value: `${f(as.m)} / ${f(as.v)}` },
        ]}
      />
      <Formula>
        표준화 x̂ = (x − {f(s.m)}) ÷ √({f(s.v)} + {EPS}) → 최종 출력 y = {f(gamma, 1)} × x̂ + {f(beta, 1)}
      </Formula>
      <Table
        columns={["표본", "입력 x", "표준화 x̂", "최종 출력 y"]}
        align={["start", "end", "end", "end"]}
        rows={x.map((v, i) => [String(i + 1), String(v), f(z[i]), f(y[i])])}
      />
      <Callout lead="계산 결과" tone="info">
        {note}
      </Callout>
    </div>
  );
}

/* ---------- 4. 배치 크기와 흔들림 ---------- */

const POPULATION = Array.from(
  { length: 512 },
  (_, i) => 5 + 3 * Math.sin(i * 0.31) + 1.5 * Math.cos(i * 0.113) + 0.7 * Math.sin(i * 1.21),
);
const POP_STAT = stat(POPULATION);
const PMIN = Math.min(...POPULATION);
const PMAX = Math.max(...POPULATION);

interface Draw {
  trials: { m: number; v: number }[];
  first: number[];
  seed: number;
}

// 선형 합동 생성기. 같은 시드에서 늘 같은 배치 40개를 뽑는다(복원추출).
function drawBatches(size: number, seed0: number): Draw {
  let seed = seed0;
  const rnd = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const trials: { m: number; v: number }[] = [];
  let first: number[] = [];
  for (let j = 0; j < 40; j++) {
    const a = Array.from({ length: size }, () => POPULATION[Math.floor(rnd() * POPULATION.length)]);
    if (j === 0) first = a;
    trials.push(stat(a));
  }
  return { trials, first, seed };
}

type StatKey = "m" | "v";

function BatchSizeLab() {
  const theme = useGrokTheme();
  const [n, setN] = useState(8);
  const [k, setK] = useState<StatKey>("m");
  const [draw, setDraw] = useState<Draw>(() => drawBatches(8, 2025));
  const isv = k === "v";

  const target = POP_STAT[k];
  const a = draw.trials.map((s) => s[k]);
  const lo = isv ? 0 : PMIN - 0.2;
  const hi = isv ? (PMAX - PMIN) ** 2 / 4 + 0.2 : PMAX + 0.2;
  const W = 440;
  const H = 236;
  const L = 48;
  const R = 18;
  const top = 20;
  const B = 192;
  const X = (i: number) => L + ((W - L - R) * i) / 39;
  const Y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - top);
  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  const T = theme.dataviz.categorical[0];
  const O = theme.dataviz.categorical[1];
  const rmse = Math.sqrt(mean(a.map((v) => (v - target) ** 2)));
  const name = isv ? "분산" : "평균";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row>
        <Segmented
          options={[
            { value: "m" as const, label: "평균 보기" },
            { value: "v" as const, label: "분산 보기" },
          ]}
          value={k}
          onChange={setK}
        />
        <Btn onClick={() => setDraw((d) => drawBatches(n, d.seed))}>새 배치 뽑기</Btn>
        <Btn
          onClick={() => {
            setN(8);
            setK("m");
            setDraw(drawBatches(8, 2025));
          }}
        >
          초기화
        </Btn>
      </Row>
      <Slider
        id="bn-batch-size"
        label="미니배치 크기 m"
        value={n}
        min={2}
        max={256}
        step={1}
        show={`${n}개`}
        onChange={(v) => {
          const size = Math.round(v);
          setN(size);
          setDraw((d) => drawBatches(size, d.seed));
        }}
      />
      <Figure
        viewBox={`0 0 ${W} ${H}`}
        title={`배치 40개의 ${name} (각 배치 ${n}개, 예시)`}
        desc="점 하나가 배치 하나의 통계입니다. 점선은 전체 값 512개의 통계입니다."
        caption="파란 큰 점 = 이번에 뽑은 첫 배치. 노란 점 = 함께 뽑은 나머지 배치 39개. 점선 = 전체 값의 통계."
      >
        <text x={L} y={12} style={{ ...theme.font.subtext, fill: theme.text.primary }}>
          배치 40개의 {name} · 각 배치 {n}개
        </text>
        {[0, 1, 2, 3, 4].map((j) => {
          const v = lo + ((hi - lo) * j) / 4;
          return (
            <g key={j}>
              <line x1={L} y1={Y(v)} x2={W - R} y2={Y(v)} stroke={theme.border.default} />
              <text x={L - 8} y={Y(v) + 4} textAnchor="end" style={caption}>
                {f(v, 1)}
              </text>
            </g>
          );
        })}
        <line x1={L} y1={Y(target)} x2={W - R} y2={Y(target)} stroke={theme.text.tertiary} strokeDasharray="5 4" />
        <text x={W - R} y={Y(target) - 7} textAnchor="end" style={caption}>
          전체 기준 {f(target)}
        </text>
        {a.map((v, i) => (
          <circle key={i} cx={X(i)} cy={Y(v)} r={i === 0 ? 6 : 4} fill={i === 0 ? T : O} fillOpacity={i === 0 ? 1 : 0.75} />
        ))}
        {[0, 9, 19, 29, 39].map((i) => (
          <text key={i} x={X(i)} y={213} textAnchor="middle" style={caption}>
            {i + 1}
          </text>
        ))}
        <text x={W - R} y={231} textAnchor="end" style={caption}>
          배치 번호
        </text>
      </Figure>
      <Properties
        items={[
          { label: `전체 값의 ${name}`, value: f(target) },
          { label: "첫 배치의 값 (예시)", value: f(a[0]) },
          { label: "40개 배치의 오차 크기 (예시)", value: f(rmse) },
        ]}
      />
      <Note>
        이번 첫 배치: [{draw.first.slice(0, 10).map((v) => f(v, 2)).join(", ")}
        {draw.first.length > 10 ? ", …" : ""}] · 40개 배치 {name}의 평균: {f(mean(a))}. 오차 크기는 각 배치 값과 전체 기준의
        차이를 제곱해 평균 낸 뒤 제곱근을 구한 값입니다.
      </Note>
    </div>
  );
}

/* ---------- 5. 학습과 추론 ---------- */

const REFERENCE = [
  [2, 4, 6, 8],
  [0, 4, 8, 12],
  [1, 3, 5, 7],
  [4, 6, 8, 10],
];
const REF_STATS = REFERENCE.map(stat);
const REF_MEAN = mean(REF_STATS.map((s) => s.m));
// 알고리즘 2: 배치 분산들의 평균에 m/(m−1)을 곱한다. 여기서 m = 4.
const REF_VAR = (4 / 3) * mean(REF_STATS.map((s) => s.v));
const PEERS = [
  [2, 4, 8],
  [-4, 0, 1],
  [10, 12, 14],
  [-8, 7, 20],
];

type ModeKey = "train" | "infer";

function InferenceLab() {
  const theme = useGrokTheme();
  const [mode, setMode] = useState<ModeKey>("train");
  const [probe, setProbe] = useState(6);
  const [pi, setPi] = useState(0);
  const infer = mode === "infer";

  const p = PEERS[pi];
  const s = stat([probe, ...p]);
  const train = (probe - s.m) / Math.sqrt(s.v + EPS);
  const test = (probe - REF_MEAN) / Math.sqrt(REF_VAR + EPS);
  const used = infer ? { m: REF_MEAN, v: REF_VAR } : s;
  const result = infer ? test : train;

  const W = 440;
  const H = 176;
  const L = 86;
  const R = 30;
  const X = (v: number) => L + ((v + 3) / 6) * (W - L - R);
  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  const T = theme.dataviz.categorical[0];
  const G = theme.dataviz.other;
  const rows: [string, number, number, boolean][] = [
    ["학습", train, 54, !infer],
    ["추론", test, 108, infer],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row>
        <Segmented
          options={[
            { value: "train" as const, label: "학습" },
            { value: "infer" as const, label: "추론" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <Btn onClick={() => setPi((i) => (i + 1) % PEERS.length)}>함께 들어온 값 바꾸기</Btn>
        <Btn
          onClick={() => {
            setPi(0);
            setMode("train");
            setProbe(6);
          }}
        >
          초기화
        </Btn>
      </Row>
      <Slider
        id="bn-probe"
        label="계속 관찰할 입력 x (예시)"
        value={probe}
        min={-2}
        max={12}
        step={0.1}
        show={f(probe, 1)}
        onChange={setProbe}
      />
      <Note>함께 들어온 다른 값: [{p.join(", ")}]</Note>
      <Figure
        viewBox={`0 0 ${W} ${H}`}
        title="같은 입력의 학습 출력과 추론 출력 (예시)"
        desc="윗줄은 학습 모드 출력, 아랫줄은 추론 모드 출력입니다. 지금 고른 모드의 점이 크게 칠해집니다."
      >
        {[-3, -2, -1, 0, 1, 2, 3].map((v) => (
          <g key={v}>
            <line x1={X(v)} y1={20} x2={X(v)} y2={126} stroke={theme.border.weak} />
            <text x={X(v)} y={148} textAnchor="middle" style={caption}>
              {v}
            </text>
          </g>
        ))}
        {rows.map(([label, yv, row, active]) => (
          <g key={label}>
            <text x={L - 16} y={row + 4} textAnchor="end" style={{ ...theme.font.subtext, fill: theme.text.primary }}>
              {label}
            </text>
            <line x1={L} y1={row} x2={W - R} y2={row} stroke={theme.border.strong} />
            <circle cx={X(yv)} cy={row} r={active ? 8 : 6} fill={active ? T : G} />
            <text
              x={X(yv)}
              y={row - 13}
              textAnchor="middle"
              style={{ ...theme.font.subtext, fill: active ? theme.text.primary : theme.text.secondary, fontWeight: 600 }}
            >
              {f(yv)}
            </text>
          </g>
        ))}
        <text x={W - R} y={169} textAnchor="end" style={caption}>
          BN 출력 값
        </text>
      </Figure>
      <Properties
        items={[
          { label: "지금 쓰는 평균 (예시)", value: f(used.m) },
          { label: "지금 쓰는 분산 (예시)", value: f(used.v) },
          { label: `${infer ? "추론" : "학습"} 모드의 출력 (예시)`, value: f(result) },
        ]}
      />
      <Formula>
        현재 묶음 = [{f(probe, 1)}, {p.join(", ")}] → {infer ? "고정한 추정 통계" : "현재 배치 통계"} 사용 → ({f(probe, 1)} −{" "}
        {f(used.m)}) ÷ √({f(used.v)} + {EPS}) = {f(result)}
      </Formula>
      <Callout lead="지금 보고 있는 것" tone="info">
        {infer
          ? "추론에서는 미리 추정해 고정한 평균과 분산을 씁니다. 입력 x를 그대로 두면, 함께 들어온 다른 값만 바꾸어도 추론 출력은 같습니다."
          : "학습에서는 현재 배치의 평균과 분산을 씁니다. 입력 x가 같아도, 함께 들어온 다른 값이 바뀌면 출력이 달라질 수 있습니다."}
      </Callout>
      <Text>
        추론 통계는 이렇게 만들었습니다. 알고리즘 2는 학습을 마친 네트워크의 매개변수를 고정합니다. 그다음 여러 학습 미니배치의 평균들을 평균 내고,
        배치 분산들의 평균에 m/(m−1)을 곱합니다 (p.4, §3.1). 아래는 그 절차를 따른 예시 배치 4개입니다.
      </Text>
      <Table
        columns={["예시 학습 배치", "평균", "분산 (m으로 나눔)"]}
        align={["start", "end", "end"]}
        rows={REFERENCE.map((b, i) => [`[${b.join(", ")}]`, f(REF_STATS[i].m), f(REF_STATS[i].v)])}
      />
      <Formula>
        고정 평균 = 배치 평균들의 평균 = {f(REF_MEAN)} / 고정 분산 = (4 ÷ 3) × 배치 분산들의 평균 = {f(REF_VAR)} (알고리즘 2, 예시 값)
      </Formula>
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
      <Btn onClick={() => setAnswers(items.map(() => null))}>퀴즈 다시 풀기</Btn>
    </div>
  );
}

const QUIZ: QuizItem[] = [
  {
    q: "BN의 γ와 β는 어떤 값인가요?",
    choices: ["입력마다 사람이 정답을 보고 지정하는 값", "다른 모델 매개변수와 함께 학습하는 값", "배치의 평균과 분산을 그대로 복사한 값"],
    correct: 1,
    why: "γ와 β는 학습되는 크기·위치 조절 값입니다. 배치 통계와 구별합니다. (p.3, §3)",
  },
  {
    q: "이 글의 실험에서 정규화가 작동하는 것을 보면 무엇을 확인한 건가요?",
    choices: ["BN의 효과는 오직 내부 공변량 이동 감소 때문입니다.", "BN은 모든 모델의 정확도를 높입니다.", "예시 값에 BN 계산 규칙을 적용한 결과입니다."],
    correct: 2,
    why: "계산 규칙의 작동은 효과의 원인까지 증명하지 않습니다. 논문도 기울기에 대한 정확한 효과를 추가 연구 과제로 둡니다. (p.5, §3.3)",
  },
];

/* ---------- 글 ---------- */

export default function App() {
  return (
    <Page
      title="배치 정규화 쉽게 보기 (Ioffe·Szegedy, 2015)"
      summary="배치 정규화는 층에 들어가는 값을 묶음마다 평균 0, 퍼짐 1로 다시 줄 세우고, γ와 β로 필요한 만큼 되돌릴 여지를 남깁니다. 학습 때는 지금 묶음의 통계를, 추론 때는 미리 고정한 통계를 씁니다. 그 덕분에 큰 학습률로도 빠르게 학습합니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "큰 그림: 학습이 진행되면", id: "lab" },
          { label: "왜 맞추나: 시그모이드의 평평한 끝", id: "saturation" },
          { label: "계산 한 단계씩: 빼고, 나누고, γ·β", id: "compute" },
          { label: "배치가 작으면 기준이 흔들립니다", id: "batch-size" },
          { label: "학습과 추론은 다른 기준", id: "inference" },
          { label: "기존 방법과 비교", id: "compare" },
          { label: "논문 근거 위치", id: "evidence" },
          { label: "주의: 왜 작동하는가", id: "caution" },
          { label: "확인 질문과 답", id: "quiz" },
          { label: "출처", id: "source" },
        ]}
      />

      <Section heading="한 장면 비유" id="analogy">
        <Text>
          반마다 시험 난이도가 다르면, 원점수로는 학생을 공정하게 비교할 수 없습니다. 그래서 반마다 표준점수로 바꿔 같은 잣대에 올립니다.
          배치 정규화(Batch Normalization, BN)는 층마다 들어오는 값을 이렇게 다시 맞춘 뒤, 다음 층에 넘깁니다.
        </Text>
        <Callout lead="비유의 한계" tone="warning">
          표준점수는 바꾼 뒤 그대로 씁니다. BN은 바꾼 뒤 γ, β로 다시 늘이고 옮길 수 있습니다. 또 BN의 기준은 반 전체가 아니라 지금 학습하는 묶음입니다.
        </Callout>
        <Table
          columns={["용어", "뜻"]}
          rows={[
            ["미니배치(mini-batch)", "한 번에 같이 학습하는 예제 묶음"],
            ["정규화(normalization)", "값들을 평균 0, 퍼짐 1로 다시 맞추는 일"],
            ["분산(variance)", "평균에서 떨어진 거리를 제곱해 평균 낸 값. 퍼짐(표준편차)은 그 제곱근"],
            ["γ (감마)", "학습되는 값. 퍼짐을 다시 늘이거나 줄임"],
            ["β (베타)", "학습되는 값. 중심을 다시 옮김"],
            ["ε (엡실론)", "0으로 나누는 일을 막으려고 분산에 더하는 작은 수"],
            ["학습률(learning rate)", "한 번 고칠 때 얼마나 크게 고칠지 정하는 값"],
            ["추론(inference)", "학습을 마친 모델로 결과를 계산하는 단계"],
          ]}
        />
        <Text>
          아래 실험은 다섯 단계로 이어집니다. 큰 그림을 먼저 보고, 왜 맞추는지, 어떻게 계산하는지, 배치 크기가 왜 중요한지, 추론 때는 무엇이
          달라지는지 차례로 봅니다. 모든 그래프는 예시 값을 실제로 계산합니다. 정확도나 학습 속도를 재현한 화면은 아닙니다.
        </Text>
      </Section>

      <Section heading="큰 그림: 학습이 진행되면" id="lab" caption="모든 점과 수치는 예시입니다">
        <Text>
          먼저 학습 진행 슬라이더를 오른쪽으로 미십시오. 앞 층 값이 오른쪽으로 밀리고 넓게 퍼집니다. 앞 층의 가중치가 바뀌면 뒤 층이 받는 값도
          바뀌기 때문입니다. 그다음 BN 켜기를 누르십시오.
        </Text>
        <BnLab />
        <Text>
          BN을 켜면 아래 칸의 점이 0 근처에 다시 모입니다. 묶음을 바꿔도 마찬가지입니다. 다음 절부터는 이 "다시 모으기"가 왜 필요한지, 정확히
          어떤 계산인지 하나씩 봅니다.
        </Text>
      </Section>

      <Section heading="왜 맞추나: 시그모이드의 평평한 끝" id="saturation" caption="예시 값 · γ = 1, β = 0 고정">
        <Text>
          시그모이드(sigmoid)는 입력을 0과 1 사이 값으로 바꾸는 함수입니다. 입력이 0에서 멀어지면 곡선이 평평해집니다. 평평한 곳에서는 기울기가
          0에 가까워 학습이 느려집니다. 이것을 포화(saturation)라고 부릅니다 (p.2, §1).
        </Text>
        <Text>
          이동량을 크게 하면 점들이 곡선의 평평한 끝으로 갑니다. 평균 기울기가 작아지는 것을 보십시오. 그다음 "시그모이드 앞에 BN"을 누르십시오.
        </Text>
        <SigmoidLab />
        <Callout lead="읽을 때 주의" tone="warning">
          여기서 기울기는 시그모이드 자체 입력에 대한 값입니다. BN 전체를 통과하는 미분은 아닙니다. γ와 β를 고정한 이 예시에서는 BN이 전체
          이동량을 없앱니다. 실제 모델에서는 학습된 γ와 β가 값을 다시 옮기거나 펼칩니다. 따라서 BN이 모든 포화를 막는다는 뜻은 아닙니다 (p.3, §3).
        </Callout>
      </Section>

      <Section heading="계산 한 단계씩: 빼고, 나누고, γ·β" id="compute" caption="예시 값 · ε = 0.00001은 예시 설정">
        <Text>
          BN의 계산은 두 단계입니다. 먼저 미니배치의 평균을 빼고, √(분산 + ε)로 나눕니다(표준화). 그다음 γ로 크기를, β로 위치를 조절합니다 (p.3,
          §3, 알고리즘 1). 여러 표본에서 같은 특징 하나를 모아 계산합니다.
        </Text>
        <ComputeLab />
        <Text>
          γ와 β가 있는 이유가 있습니다. 정규화만 하면 층이 표현할 수 있는 것이 줄어듭니다. 그래서 "아무것도 안 바꾸는 변환(항등 변환)"도 표현할
          수 있게 했습니다. γ를 원래 퍼짐으로, β를 원래 평균으로 학습하면 입력이 그대로 돌아옵니다 (p.3, §3). 위 실험에서 "다음 예시 묶음"을 두 번
          눌러 [5, 5, 5, 5]를 보십시오. 분산이 0이어도 ε 덕분에 계산이 멈추지 않습니다.
        </Text>
      </Section>

      <Section heading="배치가 작으면 기준이 흔들립니다" id="batch-size" caption="예시 값 · 고정된 전체 값 512개에서 복원추출">
        <Text>
          BN이 쓰는 평균과 분산은 지금 묶음에서 구한 값입니다. 즉 전체 데이터 통계의 추정값입니다 (pp.3–4, §3·§3.1). 같은 전체 값에서 배치 40개를
          뽑아, 배치 크기에 따라 이 추정이 얼마나 흔들리는지 보십시오. 복원추출은 하나를 뽑은 뒤 다시 넣는 방식이라 같은 값이 여러 번 뽑힐 수
          있습니다.
        </Text>
        <BatchSizeLab />
        <Text>
          배치 크기를 2~8로 줄이면 점들이 점선에서 멀리 흩어집니다. 256으로 늘리면 점선 근처에 모입니다. 큰 배치는 흔들림을 줄이는 데 도움이
          됩니다. 다만 한 번 뽑은 배치가 언제나 더 정확한 것은 아닙니다. 반복 추출 화면은 논문 실험이 아니라 설명용 실험입니다.
        </Text>
        <Callout lead="분산의 평균이 낮게 보이는 이유">
          알고리즘 1은 배치 크기 m으로 나누어 분산을 구합니다. 복원추출에서 이 분산의 기댓값은 전체 분산의 (m−1)/m배입니다. 작은 배치에서는
          흔들림뿐 아니라 이 치우침도 보입니다. 추론용 분산을 추정할 때의 m/(m−1) 보정은 알고리즘 2에 따로 나옵니다 (p.4, §3.1).
        </Callout>
      </Section>

      <Section heading="학습과 추론은 다른 기준" id="inference" caption="예시 값 · γ = 1, β = 0 고정">
        <Text>
          학습 때는 지금 묶음의 통계로 나눕니다. 그래서 같은 입력이라도 함께 들어온 값에 따라 출력이 조금씩 달라집니다. 추론 때는 미리 고정한
          통계를 씁니다 (p.4, §3.1, 알고리즘 2). "함께 들어온 값 바꾸기"를 눌러 두 모드를 비교해 보십시오.
        </Text>
        <InferenceLab />
        <Note>
          논문은 학습 중 모델 정확도를 추적할 대안으로 이동평균(moving averages)도 언급합니다 (p.4, §3.1). PyTorch 같은 라이브러리의 이동평균
          세부 규칙은 논문에 없어 미확인입니다 (논문 밖).
        </Note>
      </Section>

      <Section heading="기존 방법과 비교" id="compare">
        <Grid columns={2}>
          <Properties
            items={[
              { label: "기존 방법", value: "BN 없음" },
              { label: "학습률", value: "작게 둠" },
              { label: "초기화", value: "처음 가중치를 조심해서 고름" },
              { label: "Dropout", value: "과적합을 막으려고 씀" },
              { label: "층 입력", value: "앞 층이 바뀔 때마다 흔들림" },
            ]}
          />
          <Properties
            items={[
              { label: "이 논문 방법", value: "BN 사용" },
              { label: "학습률", value: "훨씬 크게 둘 수 있음" },
              { label: "초기화", value: "덜 조심해도 됨" },
              { label: "Dropout", value: "줄이거나 빼도 됨 (일부 경우)" },
              { label: "층 입력", value: "묶음마다 평균 0, 퍼짐 1로 다시 맞춤" },
            ]}
          />
        </Grid>
        <Text>
          Dropout(드롭아웃, 학습 중 일부 뉴런을 무작위로 끄는 과적합 방지 기법)을 줄일 수 있는 이유가 있습니다. BN은 한 예제의 결과가 같은 묶음의
          다른 예제에 따라 조금씩 달라집니다. "학습과 추론" 실험의 학습 모드에서 본 바로 그 현상입니다. 저자는 이 흔들림이 규제(regularization)
          효과를 낸다고 보았습니다 (p.5, §3.4).
        </Text>
        <Text>
          아래 막대는 Inception의 최고 정확도 72.2%에 닿기까지 필요한 학습 스텝 수입니다 (p.7, 그림 3). 시간이 아니라 스텝 수입니다.
        </Text>
        <Bars
          bars={[
            { label: "Inception (BN 없음)", value: 31.0, display: "3,100만 스텝", meta: "31.0·10^6" },
            { label: "BN-x5", value: 2.1, display: "210만 스텝", meta: "2.1·10^6" },
          ]}
        />
        <Text>
          논문은 이 차이를 "14배 적은 스텝"이라고 정리했습니다 (p.7, §4.2.2). BN 네트워크 여러 개를 합친 앙상블은 ImageNet top-5 검증 오류 4.9%를
          냈습니다 (p.1 초록, 그림 4).
        </Text>
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["시그모이드 포화와 기울기 소실", "p.2, §1"],
            ["정규화 뒤 γ, β로 늘이고 옮김", "p.3, 알고리즘 1"],
            ["γ, β로 항등 변환도 표현", "p.3, §3"],
            ["미니배치 통계는 전체 통계의 추정값", "pp.3–4, §3·§3.1"],
            ["추론 때 전체 통계 사용, 분산에 m/(m−1) 보정", "p.4, §3.1, 알고리즘 2"],
            ["이동평균으로 정확도 추적도 가능", "p.4, §3.1"],
            ["기울기에 대한 정확한 효과는 추가 연구 과제", "p.5, §3.3"],
            ["규제 효과", "p.5, §3.4"],
            ["큰 학습률, 덜 조심스러운 초기화, Dropout 감소", "p.1 초록, p.6 §4.2.1"],
            ["72.2%까지 스텝 수 14배 적음 (BN-x5)", "p.7, §4.2.2, 그림 3"],
            ["앙상블 top-5 검증 오류 4.9%", "p.1 초록, 그림 4"],
          ]}
        />
        <Callout lead="핵심 원문 문장 (p.1 초록)">
          "Batch Normalization allows us to use much higher learning rates and be less careful about initialization. It also acts as a
          regularizer, in some cases eliminating the need for Dropout."
        </Callout>
      </Section>

      <Section heading="주의: 왜 작동하는가" id="caution">
        <Text>
          논문은 효과의 이유를 내부 공변량 이동(internal covariate shift)을 줄였기 때문이라고 설명합니다. 이것은 앞 층이 바뀌어 뒤 층 입력 분포가
          계속 바뀌는 현상입니다. "큰 그림" 실험에서 학습 진행 슬라이더로 흉내 낸 것이 이 현상입니다.
        </Text>
        <Callout lead="이 설명은 나중에 반박되었습니다" tone="warning">
          Santurkar 외(2018)가 이 설명에 반론을 냈습니다 (논문 밖). 저자도 기울기 전달에 대한 정확한 효과는 더 연구해야 한다고 썼습니다 (p.5,
          §3.3).
        </Callout>
        <Text>
          정리하면 이렇습니다. "BN은 잘 작동한다"는 확인된 사실입니다. "왜 작동하는가"는 아직 열린 질문입니다. 이 글의 실험들도 계산 규칙을
          보여 줄 뿐, 원인 설명을 검증한 것은 아닙니다. 기법 자체는 지금도 널리 쓰입니다.
        </Text>
      </Section>

      <Section heading="확인 질문과 답" id="quiz">
        <Callout lead="질문" tone="info">
          학습이 끝난 모델에 사진 한 장만 넣어 예측한다고 생각해 보십시오. BN이 학습 때처럼 "지금 들어온 묶음의 평균"을 쓰면 어떤 문제가
          생길까요? 논문은 이 문제를 어떻게 해결했나요? 먼저 말로 답해 본 뒤 아래를 읽으십시오.
        </Callout>
        <Text>
          문제: 사진 한 장으로는 묶음 평균과 퍼짐을 제대로 구할 수 없습니다. 또 같은 사진이라도 함께 들어온 사진에 따라 결과가 달라집니다.
          "학습과 추론" 실험의 학습 모드가 이 상황입니다.
        </Text>
        <Callout lead="답" tone="success">
          추론 때는 미니배치 통계 대신 학습 데이터 전체 통계(population statistics)를 씁니다. 그래서 같은 입력이면 항상 같은 출력이 나옵니다
          (p.4, §3.1, 알고리즘 2).
        </Callout>
        <Text>이어서 두 문제를 더 풀어 보십시오. 답을 고르면 정답 여부와 이유가 나옵니다.</Text>
        <Quiz items={QUIZ} />
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Sergey Ioffe, Christian Szegedy. "Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift".
          2015. https://arxiv.org/abs/1502.03167 (arXiv v3)
        </Text>
      </Section>
    </Page>
  );
}
