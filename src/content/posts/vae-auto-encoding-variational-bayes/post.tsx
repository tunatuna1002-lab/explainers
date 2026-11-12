import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Steps,
  Table,
  Segmented,
  useGrokTheme,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "@/components/canvas";
import { Tex } from "@/components/Tex";

/* ---------- 위젯: Claude 앱에서 만든 인터랙티브 그림을 그대로 띄운다 ---------- */

const WIDGET_DIR = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/widgets/vae-auto-encoding-variational-bayes`;

function Widget({ name, title, height, caption }: { name: string; title: string; height: number; caption?: string }) {
  const theme = useGrokTheme();
  const [h, setH] = useState(height);
  const ref = useRef<HTMLIFrameElement>(null);
  const ping = () => ref.current?.contentWindow?.postMessage({ type: "vae-widget-ping" }, "*");
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; name?: string; h?: number } | null;
      if (d && d.type === "vae-widget-height" && d.name === name && typeof d.h === "number" && d.h > 40) setH(d.h);
    };
    window.addEventListener("message", onMsg);
    ping();
    return () => window.removeEventListener("message", onMsg);
  }, [name]);
  return (
    <figure style={{ margin: 0 }}>
      <iframe
        ref={ref}
        onLoad={ping}
        src={`${WIDGET_DIR}/${name}.html`}
        title={title}
        loading="lazy"
        style={{ display: "block", width: "100%", height: h, border: 0, background: "transparent" }}
      />
      {caption ? (
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/* ---------- 실험실 공통: 숫자 표시, 슬라이더, 버튼 ---------- */

// 실험실 원본(VAE.html)의 계산식을 그대로 옮긴다. 모든 조작값은 예시 값이다.
const fx = (v: number, d = 2) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d);
const gaussian = (x: number, m: number, s: number) => Math.exp(-0.5 * Math.pow((x - m) / s, 2)) / (s * Math.sqrt(2 * Math.PI));
const klGauss = (m: number, s: number) => Math.max(0, 0.5 * (m * m + s * s - 1 - Math.log(s * s)));
function normal() {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

interface LabSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function LabSlider({ id, label, value, min, max, step, onChange }: LabSliderProps) {
  const theme = useGrokTheme();
  const show = fx(value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        htmlFor={id}
        style={{ ...theme.font.subtext, color: theme.text.secondary, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
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
          if (Number.isFinite(next)) onChange(Number((Math.round(Math.min(max, Math.max(min, next)) / step) * step).toFixed(4)));
        }}
        style={{ width: "100%", minWidth: 0, minHeight: 36, margin: 0, accentColor: theme.text.accent }}
      />
    </div>
  );
}

function LabButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  const theme = useGrokTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...theme.font.subtext,
        fontFamily: theme.font.family,
        color: primary ? theme.text.onPrimary : theme.text.primary,
        background: primary ? theme.fill.primary : theme.fill.secondary,
        border: `1px solid ${primary ? theme.fill.primary : theme.border.default}`,
        borderRadius: theme.radius.md,
        padding: "8px 14px",
        minHeight: 36,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function LabCheck({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const theme = useGrokTheme();
  return (
    <label htmlFor={id} style={{ ...theme.font.subtext, color: theme.text.primary, display: "inline-flex", alignItems: "center", gap: 8, minHeight: 36 }}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} style={{ width: 18, height: 18, accentColor: theme.text.accent }} />
      {label}
    </label>
  );
}

function LabBox({ children }: { children: ReactNode }) {
  const theme = useGrokTheme();
  return (
    <div
      style={{
        ...theme.font.subtext,
        fontVariantNumeric: "tabular-nums",
        background: theme.bg.subtle,
        border: `1px solid ${theme.border.weak}`,
        borderRadius: theme.radius.md,
        padding: "10px 14px",
        overflowWrap: "anywhere",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {children}
    </div>
  );
}

/* ---------- 분포 그림: 이론 곡선, 표본 막대, 기준 분포 ---------- */

const PW = 480;
const PH = 270;

function DistPlot({
  m,
  s,
  samples = [],
  show = true,
  current,
  reference = false,
  label,
}: {
  m: number;
  s: number;
  samples?: number[];
  show?: boolean;
  current?: number;
  reference?: boolean;
  label: string;
}) {
  const theme = useGrokTheme();
  const qColor = theme.dataviz.categorical[0];
  const pColor = theme.dataviz.categorical[1];
  const L = 48, R = 14, T = 31, B = 42, iw = PW - L - R, ih = PH - T - B;
  let low = reference ? Math.min(-4, m - 4 * s) : m - 4 * s;
  let high = reference ? Math.max(4, m + 4 * s) : m + 4 * s;
  for (const z of samples) {
    low = Math.min(low, z - 0.15 * s);
    high = Math.max(high, z + 0.15 * s);
  }
  if (current !== undefined) {
    low = Math.min(low, current - 0.15 * s);
    high = Math.max(high, current + 0.15 * s);
  }
  const nbin = 20, binw = (high - low) / nbin, counts = Array(nbin).fill(0) as number[];
  for (const z of samples) counts[Math.min(nbin - 1, Math.max(0, Math.floor((z - low) / binw)))]++;
  const densities = counts.map((n) => (samples.length ? n / (samples.length * binw) : 0));
  const max = Math.max(gaussian(m, m, s), reference ? gaussian(0, 0, 1) : 0, ...densities) * 1.12;
  const X = (z: number) => L + ((z - low) / (high - low)) * iw;
  const Y = (v: number) => T + ih - (v / max) * ih;
  const curve = (mm: number, ss: number) => {
    let d = "";
    for (let i = 0; i <= 220; i++) {
      const z = low + ((high - low) * i) / 220;
      d += (i ? " L" : "M") + X(z).toFixed(3) + " " + Y(gaussian(z, mm, ss)).toFixed(3);
    }
    return d;
  };
  const txt = { ...theme.font.caption, fill: theme.text.primary, fontSize: 12 };
  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} role="img" aria-label={label} style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}>
      <desc>
        {reference
          ? `정규분포 q의 평균 ${fx(m)} 표준편차 ${fx(s)}, 기준 분포 p의 평균 0 표준편차 1.`
          : `표본 ${samples.length}개. 정규분포의 평균 ${fx(m)} 표준편차 ${fx(s)}.`}
      </desc>
      <text x={0} y={15} style={txt}>
        확률밀도
      </text>
      {[0, 1, 2].map((i) => {
        const val = (max * i) / 2, y = Y(val);
        return (
          <g key={i}>
            <line x1={L} y1={y} x2={PW - R} y2={y} stroke={theme.border.default} />
            <text x={L - 7} y={y + 4} textAnchor="end" style={txt}>
              {fx(val, 2)}
            </text>
          </g>
        );
      })}
      <line x1={L} y1={T} x2={L} y2={T + ih} stroke={theme.border.default} />
      {[0, 1, 2, 3].map((i) => {
        const z = low + ((high - low) * i) / 3;
        return (
          <text key={i} x={X(z)} y={T + ih + 19} textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"} style={txt}>
            {fx(z, 1)}
          </text>
        );
      })}
      <text x={PW - R} y={PH - 3} textAnchor="end" style={txt}>
        잠재값 z (단위 없음)
      </text>
      {samples.length
        ? densities.map((d, i) =>
            d ? (
              <rect key={i} x={X(low + i * binw) + 0.5} y={Y(d)} width={Math.max(0, iw / nbin - 1)} height={Y(0) - Y(d)} fill={qColor} fillOpacity={0.24} />
            ) : null,
          )
        : null}
      {show ? <path d={curve(m, s)} fill="none" stroke={qColor} strokeWidth={2.5} /> : null}
      {reference ? <path d={curve(0, 1)} fill="none" stroke={pColor} strokeWidth={2} strokeDasharray="6 4" /> : null}
      {current !== undefined ? <circle cx={X(current)} cy={Y(0) - 4} r={4} fill={qColor} /> : null}
    </svg>
  );
}

function Legend({ items }: { items: { label: string; color: string; kind: "line" | "dash" | "bar" }[] }) {
  const theme = useGrokTheme();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", ...theme.font.caption, color: theme.text.secondary }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width={20} height={10} aria-hidden="true">
            {it.kind === "bar" ? (
              <rect x={0} y={0} width={20} height={10} fill={it.color} fillOpacity={0.3} />
            ) : (
              <line x1={0} y1={5} x2={20} y2={5} stroke={it.color} strokeWidth={2.5} strokeDasharray={it.kind === "dash" ? "5 3" : undefined} />
            )}
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  );
}

const stack = { display: "flex", flexDirection: "column" as const, gap: 12 };
const row = { display: "flex", flexWrap: "wrap" as const, gap: 8, alignItems: "center" };
const twoCol = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px 20px" };

/* ---------- 실험 1: 같은 난수, 달라지는 분포 (p.5, §2.4) ---------- */

function SamplingLab() {
  const theme = useGrokTheme();
  const [mu, setMu] = useState(1);
  const [sigma, setSigma] = useState(2);
  const [eps, setEps] = useState<number[]>([]);
  const [last, setLast] = useState(0.5);
  const [has, setHas] = useState(false);
  const [theory, setTheory] = useState(true);
  const z = mu + sigma * last;
  const draw = (n: number) => {
    const next: number[] = [];
    for (let i = 0; i < n; i++) next.push(normal());
    setEps((prev) => [...prev, ...next].slice(-600));
    setLast(next[next.length - 1]);
    setHas(true);
  };
  return (
    <div style={stack}>
      <div style={twoCol}>
        <LabSlider id="vae-s-mu" label="μ (평균)" value={mu} min={-3} max={3} step={0.05} onChange={setMu} />
        <LabSlider id="vae-s-sigma" label="σ (표준편차, 흩어짐)" value={sigma} min={0.2} max={3} step={0.05} onChange={setSigma} />
      </div>
      <div style={row}>
        <LabButton label="ε 뽑기" primary onClick={() => draw(1)} />
        <LabButton label="50개 뽑기" onClick={() => draw(50)} />
        <LabButton
          label="표본 비우기"
          onClick={() => {
            setEps([]);
            setLast(0.5);
            setHas(false);
          }}
        />
        <LabCheck id="vae-s-theory" label="이론 분포 곡선 보기" checked={theory} onChange={setTheory} />
      </div>
      <LabBox>
        <strong style={{ ...theme.font.body1 }}>z = μ + σ × ε</strong>
        <span>
          {fx(mu)} + {fx(sigma)} × ({fx(last, 4)}) ≈ {fx(z, 4)}
        </span>
        <span style={{ color: theme.text.secondary, fontSize: theme.font.body2.fontSize }}>ε는 평균 0, 표준편차 1인 정규분포 N(0, 1)에서 뽑은 난수입니다(p.5, §2.4).</span>
      </LabBox>
      <DistPlot m={mu} s={sigma} samples={eps.map((e) => mu + sigma * e)} show={theory} current={z} label="선택한 정규분포와 뽑은 표본의 밀도" />
      <Legend
        items={[
          { label: "이론 분포", color: theme.dataviz.categorical[0], kind: "line" },
          { label: "뽑은 표본의 밀도", color: theme.dataviz.categorical[0], kind: "bar" },
        ]}
      />
      <Text>
        저장한 표본 {eps.length}개(최근 최대 600개).{" "}
        {has ? `마지막 ε = ${fx(last, 4)}.` : "처음 ε = 0.5는 고정 예시이며 표본에 넣지 않습니다."} 슬라이더를 움직이면 이미 뽑은 ε는 그대로 두고 모든 z를 다시 계산합니다. 막대 높이 = 구간의 표본 수 ÷ 전체 표본 수 ÷ 구간 너비입니다. 점은 마지막으로 계산한 z입니다.
      </Text>
    </div>
  );
}

/* ---------- 실험 2: 기울기가 돌아가는 길 (pp.3-5, §2.2-2.4) ---------- */

type DrawMode = "direct" | "reparam";
const DRAW_OPTIONS = [
  { value: "direct" as const, label: "z를 바로 뽑기" },
  { value: "reparam" as const, label: "ε를 뽑고 z 계산" },
];

function GradientLab() {
  const theme = useGrokTheme();
  const [mode, setMode] = useState<DrawMode>("reparam");
  const [mu, setMu] = useState(1);
  const [sigma, setSigma] = useState(2);
  const [e, setE] = useState(0.5);
  const reparam = mode === "reparam";
  const z = mu + sigma * e;
  const good = theme.text.success;
  const bad = theme.text.danger;
  const W = 360, mid = W / 2, bw = 240, left = (W - bw) / 2;
  const ys = [31, 119, 207, 295];
  const rows: [string, string][] = [
    ["인코더가 계산한 분포", `μ = ${fx(mu)}   σ = ${fx(sigma)}`],
    reparam ? ["미분 가능한 계산", "z = μ + σ·ε"] : ["미분 규칙 없는 추출기", "z ~ N(μ, σ²)"],
    ["앞으로 계산한 잠재값", `z = ${fx(z, 4)}`],
    ["예시 함수", `f(z) = z² = ${fx(z * z, 4)}`],
  ];
  const caption = reparam
    ? "이어짐: z를 μ와 σ의 식으로 계산하므로 기울기가 전달됩니다. ε는 이번 계산에서 고정하지만, 다음 추출 때는 다시 바뀝니다."
    : "이 경로는 막힘: z와 f는 계산할 수 있습니다. 다만 미분 규칙 없는 추출기를 통과해 μ와 σ로 역전파할 수는 없습니다.";
  const txt = { ...theme.font.caption, fill: theme.text.primary, fontSize: 12 };
  const arrow = (x: number, from: number, to: number, color: string, dash: boolean, key: string) => {
    const sign = to > from ? 1 : -1;
    return (
      <g key={key}>
        <line x1={x} y1={from} x2={x} y2={to} stroke={color} strokeWidth={2} strokeDasharray={dash ? "4 4" : undefined} />
        <path d={`M ${x - 4} ${to - sign * 6} L ${x} ${to} L ${x + 4} ${to - sign * 6}`} fill="none" stroke={color} strokeWidth={2} />
      </g>
    );
  };
  return (
    <div style={stack}>
      <Segmented options={DRAW_OPTIONS} value={mode} onChange={setMode} />
      <div style={twoCol}>
        <LabSlider id="vae-g-mu" label="μ (평균)" value={mu} min={-3} max={3} step={0.05} onChange={setMu} />
        <LabSlider id="vae-g-sigma" label="σ (표준편차)" value={sigma} min={0.2} max={3} step={0.05} onChange={setSigma} />
      </div>
      <div style={row}>
        <LabButton label="ε 다시 뽑기" onClick={() => setE(normal())} />
        <LabButton label="ε = 0.5 예시" onClick={() => setE(0.5)} />
      </div>
      <LabBox>
        <span>
          ε = {fx(e, 4)} → z = {fx(z, 4)} → f(z) = z² = {fx(z * z, 4)}
        </span>
        <span style={{ color: theme.text.secondary, fontSize: theme.font.body2.fontSize }}>
          {reparam ? "ε를 고정한 미분: ∂z/∂μ = 1, ∂z/∂σ = ε" : "추출기를 미분 규칙이 없는 연산으로 취급합니다."}
        </span>
        <span style={{ color: reparam ? good : bad }}>
          f의 μ 기울기: {reparam ? `2z = ${fx(2 * z, 4)}` : "이 경로로 미정의"}
        </span>
        <span style={{ color: reparam ? good : bad }}>
          f의 σ 기울기: {reparam ? `2zε = ${fx(2 * z * e, 4)}` : "이 경로로 미정의"}
        </span>
      </LabBox>
      <figure style={{ margin: 0 }}>
        <svg viewBox={`0 0 ${W} 350`} role="img" aria-label="순전파와 역전파 계산 경로" style={{ display: "block", width: "100%", maxWidth: 420, height: "auto", margin: "0 auto" }}>
          <desc>{caption}</desc>
          <text x={13} y={15} style={txt}>
            순전파 ↓
          </text>
          <text x={W - 13} y={15} textAnchor="end" style={txt}>
            역전파 ↑
          </text>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              {arrow(mid - 22, ys[i] + 42, ys[i + 1] - 4, theme.text.tertiary, false, `f${i}`)}
              {arrow(mid + 22, ys[i + 1] - 4, ys[i] + 46, i === 0 && !reparam ? bad : good, i === 0 && !reparam, `b${i}`)}
            </g>
          ))}
          {!reparam ? (
            <text x={mid + 39} y={98} style={{ ...txt, fill: bad, fontSize: 16 }}>
              ×
            </text>
          ) : null}
          {rows.map((r, i) => (
            <g key={r[0]}>
              <rect x={left} y={ys[i]} width={bw} height={42} rx={8} fill={theme.bg.subtle} stroke={theme.border.default} />
              <text x={mid} y={ys[i] + 16} textAnchor="middle" style={txt}>
                {r[0]}
              </text>
              <text x={mid} y={ys[i] + 33} textAnchor="middle" style={txt}>
                {r[1]}
              </text>
            </g>
          ))}
        </svg>
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>{caption}</figcaption>
      </figure>
    </div>
  );
}

/* ---------- 실험 3: KL이 0이 되는 자리 (부록 B, pp.10-11) ---------- */

const KL_PRESETS = [
  { label: "μ = 0, σ = 1 맞추기", m: 0, s: 1, primary: true },
  { label: "μ = 1, σ = 0.5 예시", m: 1, s: 0.5 },
  { label: "μ = 1, σ = 2 예시", m: 1, s: 2 },
];

function GaussianKLLab() {
  const theme = useGrokTheme();
  const [mu, setMu] = useState(1);
  const [sigma, setSigma] = useState(2);
  const [neg, setNeg] = useState(false);
  const v = klGauss(mu, sigma);
  const m2 = mu * mu, s2 = sigma * sigma;
  return (
    <div style={stack}>
      <div style={twoCol}>
        <LabSlider id="vae-k-mu" label="μ (q의 평균)" value={mu} min={-3} max={3} step={0.05} onChange={setMu} />
        <LabSlider id="vae-k-sigma" label="σ (q의 표준편차)" value={sigma} min={0.2} max={3} step={0.05} onChange={setSigma} />
      </div>
      <div style={row}>
        {KL_PRESETS.map((p) => (
          <LabButton
            key={p.label}
            label={p.label}
            primary={p.primary}
            onClick={() => {
              setMu(p.m);
              setSigma(p.s);
            }}
          />
        ))}
        <LabCheck id="vae-k-neg" label="원문의 −KL 값도 보기" checked={neg} onChange={setNeg} />
      </div>
      <LabBox>
        <span>
          KL(q ‖ p) = <strong style={{ ...theme.font.body1 }}>{fx(v, 6)}</strong> nat (자연로그 기준)
        </span>
        {neg ? <span>원문의 −KL = {fx(-v, 6)} nat</span> : null}
        <span style={{ color: theme.text.secondary, fontSize: theme.font.body2.fontSize }}>
          KL = ½(μ² + σ² − 1 − ln σ²) = ½ × ({fx(m2, 4)} + {fx(s2, 4)} − 1 − ln {fx(s2, 4)}) ≈ {fx(v, 6)}
        </span>
      </LabBox>
      <DistPlot m={mu} s={sigma} reference label="근사 사후분포 q와 표준정규 기준 분포 p의 비교" />
      <Legend
        items={[
          { label: "q = N(μ, σ²)", color: theme.dataviz.categorical[0], kind: "line" },
          { label: "p = N(0, 1)", color: theme.dataviz.categorical[1], kind: "dash" },
        ]}
      />
      <Text>
        {mu === 0 && sigma === 1
          ? "두 분포가 정확히 같습니다. KL = 0입니다."
          : `μ = ${fx(mu)}, σ = ${fx(sigma)}일 때 KL은 ${fx(v, 6)} nat입니다.`}{" "}
        곡선의 세로축은 확률밀도입니다. 두 곡선 사이의 면적을 KL로 읽으면 안 됩니다.
      </Text>
    </div>
  );
}

/* ---------- 확인 퀴즈 ---------- */

const QUIZ = [
  {
    q: "1. 가우시안 인코더가 입력 x를 보고 계산하는 것은 무엇입니까?",
    a: ["항상 같은 잠재값 z 하나", "잠재 분포의 평균 μ와 표준편차 σ", "입력과 관계없는 고정 난수 ε"],
    correct: 1,
    why: "인코더는 입력별 분포의 μ와 σ를 계산하고, 그 분포에서 z를 뽑습니다(p.5, §3).",
  },
  {
    q: "2. 재매개변수화가 바꾸는 것은 무엇입니까?",
    a: ["같은 분포의 값을 만드는 계산 방식", "무작위 추출을 완전히 없애는 것", "모든 표본 z를 평균 μ로 고정하는 것"],
    correct: 0,
    why: "z의 분포는 그대로입니다. ε를 먼저 뽑은 뒤 μ + σ·ε를 계산합니다(p.5, §2.4).",
  },
  {
    q: "3. q = N(μ, σ²), p = N(0, 1)일 때 KL이 0이 되는 조건은 무엇입니까?",
    a: ["μ = 0, σ = 2", "μ = 0, σ = 1", "μ = 1, σ = 1"],
    correct: 1,
    why: "평균과 표준편차가 모두 같아져 두 분포가 일치합니다(p.11, 부록 B).",
  },
];

function Quiz() {
  const theme = useGrokTheme();
  const [picked, setPicked] = useState<(number | null)[]>(QUIZ.map(() => null));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {QUIZ.map((q, i) => {
        const p = picked[i];
        const ok = p === q.correct;
        return (
          <fieldset key={q.q} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <legend style={{ ...theme.font.body1, color: theme.text.primary, fontWeight: 600, padding: 0, marginBottom: 8 }}>{q.q}</legend>
            <div style={{ display: "grid", gap: 6 }}>
              {q.a.map((a, j) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={p === j}
                  onClick={() => setPicked((prev) => prev.map((v, k) => (k === i ? j : v)))}
                  style={{
                    ...theme.font.subtext,
                    fontFamily: theme.font.family,
                    textAlign: "left",
                    color: theme.text.primary,
                    background: p === j ? theme.fill.accentSubtle : theme.fill.secondary,
                    border: `1px solid ${p === j ? theme.text.accent : theme.border.default}`,
                    borderRadius: theme.radius.md,
                    padding: "8px 12px",
                    minHeight: 40,
                    cursor: "pointer",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            <p aria-live="polite" style={{ ...theme.font.subtext, ...(p === null ? theme.font.body2 : {}), margin: "8px 0 0", minHeight: 24, color: p === null ? theme.text.tertiary : ok ? theme.text.success : theme.text.danger }}>
              {p === null ? "아직 답을 고르지 않았습니다." : (ok ? "정답입니다. " : "다시 생각해 보십시오. ") + q.why}
            </p>
          </fieldset>
        );
      })}
    </div>
  );
}

/* ---------- 본문 ---------- */

export default function App() {
  return (
    <Page
      title="Auto-Encoding Variational Bayes 쉽게 보기: 재매개변수화, MCMC, 주변우도"
      summary="사후분포의 분모 p(x)는 계산할 수 없는 적분입니다. 그래서 저자들은 log p(x) 대신 그 아래에 있는 하한 L을 키우고, 노이즈를 모델 밖으로 빼는 재매개변수화(z = μ + σ × ε)로 L의 기울기를 구합니다. 인코더가 사진마다 한 번에 분포를 내므로, 데이터마다 MCMC를 돌리지 않고 미니배치로 학습합니다. 세 실험(같은 난수로 z 만들기, 기울기가 돌아가는 길, KL이 0이 되는 자리)과 확인 퀴즈로 직접 확인할 수 있습니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "논문의 핵심과 재매개변수화", id: "core" },
          { label: "기존 방법과 AEVB의 차이", id: "compare" },
          { label: "MCMC의 원리", id: "mcmc" },
          { label: "주변우도와 계산 불가 적분", id: "marginal" },
          { label: "차원의 저주와 정보", id: "curse" },
          { label: "베이즈 정리", id: "bayes" },
          { label: "경사상승법과 경사하강법", id: "ascent" },
          { label: "하한 L과 논문의 연결", id: "elbo" },
          { label: "기울기가 돌아가는 길", id: "gradient" },
          { label: "KL 발산", id: "kl" },
          { label: "한눈에 보기", id: "map" },
          { label: "확인 퀴즈", id: "quiz" },
          { label: "공부하며 바로잡은 내용", id: "fixes" },
          { label: "출처", id: "refs" },
        ]}
      />

      <Section heading="논문의 핵심과 재매개변수화" id="core">
        <Callout lead="한 장면 비유">
          사진마다 숨은 스케치가 있지만 직접 볼 수 없습니다. 맞히는 화가(인코더)가 사진을 보고 평균 스케치와 흩어짐을 말합니다. 스케치 후보는 "평균 + 흩어짐 × 표준 주사위"로 뽑고, 다시 그리는 화가(디코더)가 그 후보로 사진을 다시 그립니다.
        </Callout>
        <Table
          columns={["비유", "논문 용어", "근거"]}
          rows={[
            ["숨은 스케치", "잠재 변수(latent variable) z", "§2.1, p.2"],
            ["맞히는 화가", "인식 모델(recognition model), 확률적 인코더 q(z|x)", "§2.1, p.3"],
            ["다시 그리는 화가", "확률적 디코더 p(x|z)", "§2.1, p.3"],
            ["표준 주사위", "보조 노이즈 변수 ε", "§2.4, p.4"],
            ["평균 + 흩어짐 × 주사위", "재매개변수화(reparameterization)", "§2.4, p.4-5"],
            ["연습 점수", "변분 하한(variational lower bound) L", "§2.2, p.3"],
          ]}
        />
        <Callout lead="비유의 한계" tone="warning">
          실제 잠재 변수는 사람이 알아보는 스케치가 아니라 숫자 묶음입니다. 흩어짐도 사람이 정하지 않고 인코더가 사진마다 스스로 냅니다(§3, p.5).
        </Callout>
        <Text>
          "평균 + 흩어짐 × 표준 주사위"를 수식으로 쓰면 z = μ + σ × ε입니다. 논문은 1차원 가우시안 N(μ, σ²)을 예로 듭니다. ε는 N(0, 1)에서 뽑습니다(p.5, §2.4). μ는 분포의 위치를, σ는 흩어짐을 정합니다.
        </Text>
        <Callout lead="실험 1. 같은 난수, 달라지는 분포">
          "50개 뽑기"를 몇 번 누른 뒤 μ와 σ를 움직여 보십시오. 뽑아 둔 ε는 바뀌지 않고 계산만 다시 합니다. 그래도 표본 막대는 새 분포 모양을 따라갑니다. 무작위성은 ε에서 나오고, μ와 σ는 z를 계산하는 데만 쓰입니다. 모든 조작값은 예시입니다.
        </Callout>
        <SamplingLab />
        <Text>
          아래 위젯에서 흩어짐을 바꿔 가며 같은 뽑기를 사진에 적용해 보십시오. 흩어짐이 작으면 → 스케치 후보가 평균 근처에 모입니다 → 다시 그린 그림이 원본과 비슷합니다. 이 계산식을 쓰면 왜 기울기가 μ와 σ까지 전달되는지는 "기울기가 돌아가는 길" 절에서 봅니다.
        </Text>
        <Widget name="sigma" title="흩어짐과 재구성" height={760} caption="디코더는 학습된 신경망이 아니라 장난감 규칙입니다. 점수와 분포는 예시입니다." />
        <Table
          columns={["핵심 숫자", "값", "근거"]}
          rows={[
            ["미니배치 크기 M", "100", "알고리즘 1, p.4"],
            ["데이터당 샘플 수 L", "1", "알고리즘 1, p.4"],
            ["은닉 유닛", "MNIST 500개, Frey Face 200개", "§5, p.7"],
            ["학습 시간", "샘플 100만 개당 약 20~40분 (Intel Xeon, 실효 40 GFLOPS)", "그림 2 캡션, p.7"],
          ]}
        />
      </Section>

      <Section heading="기존 방법과 AEVB의 차이" id="compare">
        <Widget name="compare" title="기존 방법과 AEVB 비교" height={560} />
        <Text>
          온라인 알고리즘(online algorithm, 작은 묶음을 받을 때마다 모델을 바로 고치는 방법)이 핵심 차이입니다. 저자는 큰 데이터에서 미니배치로 갱신하고 싶다고 적습니다(§2.1, p.2). 몬테카를로 EM은 온라인 알고리즘이 아니어서 전체 MNIST에 효율적으로 쓸 수 없다고 적습니다(그림 3 캡션, p.8).
        </Text>
        <Steps
          steps={[
            { title: "예열(burn-in)", detail: "언덕에 도착하기 전 발자국은 버립니다(논문 밖)." },
            { title: "자기상관(autocorrelation)", detail: "이웃 발자국끼리 닮아서, 쓸 만한 샘플을 얻으려면 더 많이 걸어야 합니다(논문 밖)." },
            { title: "걸음 하나가 비쌈", detail: "HMC는 걸음마다 디코더의 기울기를 씁니다(부록 D, p.12). 몬테카를로 EM은 갱신 전에 리프프로그 10걸음을 걷습니다(부록 E, p.12)." },
            { title: "사진마다 처음부터", detail: "사후분포 p(z|x)는 사진마다 달라서, 한 사진의 발자국을 다른 사진에 쓸 수 없습니다." },
          ]}
        />
        <Text>아래 위젯에서 사진을 바꿔 가며 MCMC와 인코더를 비교해 보십시오(예시 분포).</Text>
        <Widget name="photo" title="사진마다 MCMC와 인코더" height={620} />
        <Text>
          인코더는 "사진 → 분포" 규칙 자체를 배워서 비용을 모든 사진이 나눠 씁니다. 이것을 분할 상환 추론(amortized inference)이라고 부릅니다(용어는 논문 밖). 대신 논문의 인코더는 대각 가우시안이라 봉우리가 둘인 사후분포는 정확히 따라가지 못합니다(§3, p.5).
        </Text>
        <Callout lead="결과와 한계">
          그림 2에서 AEVB는 wake-sleep보다 모든 실험에서 더 빨리 수렴하고 더 좋은 해에 도달했습니다(p.7). 이 방법은 연속 잠재 변수용입니다. wake-sleep은 이산 잠재 변수에도 쓸 수 있습니다(§4, p.6).
        </Callout>
      </Section>

      <Section heading="MCMC의 원리" id="mcmc">
        <Text>
          MCMC(마르코프 연쇄 몬테카를로)는 한 걸음씩 무작위로 걸으며 샘플을 모으는 방법입니다. 다음 걸음은 지금 위치에만 의존합니다(논문 밖).
        </Text>
        <Steps
          steps={[
            { title: "제안", detail: "현재 위치 근처의 새 위치를 무작위로 고릅니다." },
            { title: "비교", detail: "새 위치가 지금보다 몇 배 그럴듯한지 비율을 구합니다." },
            { title: "결정", detail: "더 그럴듯하면 옮깁니다. 덜 그럴듯하면 그 비율만큼의 확률로 옮깁니다. 예: 0.2 / 0.8 = 0.25이면 25% 확률로 옮깁니다(예시)." },
            { title: "기록", detail: "지금 위치를 발자국으로 남기고 반복합니다." },
          ]}
        />
        <Text>
          비교에 비율만 쓰기 때문에 → 정확한 확률 값(분모 p(x))을 몰라도 됩니다. 먼저 "100걸음"을 몇 번 눌러 보고, 걸음 크기를 아주 작게, 아주 크게 바꿔 보십시오.
        </Text>
        <Widget name="walker" title="MCMC 걸음" height={620} />
        <Text>같은 언덕에서 언덕 오르기(내려가는 걸음을 받지 않는 최적화)와 MCMC를 비교해 보십시오. 두 모드를 각각 1000걸음씩 돌리면 차이가 보입니다.</Text>
        <Widget name="hillvsmcmc" title="언덕 오르기와 MCMC" height={580} />
        <Text>
          저자들이 비교에 쓴 HMC는 기울기로 오르막을 향해 걸음을 제안합니다. 하지만 무작위성과 수락 규칙 때문에 정상에 멈추지 않습니다(HMC 작동 방식은 논문 밖).
        </Text>
      </Section>

      <Section heading="주변우도와 계산 불가 적분" id="marginal">
        <Tex display>{"p(\\mathbf{x}) = \\int p(\\mathbf{z})\\, p(\\mathbf{x} \\mid \\mathbf{z})\\, d\\mathbf{z}"}</Tex>
        <Text>
          주변우도(marginal likelihood)는 가능한 모든 스케치로 그려 봤을 때 이 사진이 나올 평균 가능성입니다(§2.1, p.2). 예: 사전 0.7·0.3, 우도 0.1·0.4이면 p(x) = 0.07 + 0.12 = 0.19입니다(예시). 이 값은 사후분포의 분모이자, 학습에서 원래 키우려는 값입니다.
        </Text>
        <Table
          columns={["계산 불가가 되는 경우", "내용", "1차원이면"]}
          rows={[
            ["닫힌 식 없음", "적분 결과를 익숙한 함수로 쓸 수 없음 (예: e^(−x²), 논문 밖)", "수치 적분으로 쉽게 풀림"],
            ["차원의 저주", "차원당 k개 점이면 격자점 k^d개", "해당 없음"],
            ["샘플이 빗나감", "사전분포에서 뽑은 z 대부분이 이 사진을 설명하지 못함", "비교적 덜 심함"],
          ]}
        />
        <Text>격자 적분의 비용을 직접 바꿔 보십시오. 10개 점, 20차원이면 10^20개이고, 초당 10억 회로 약 3,169년입니다(예시, 계산으로 확인).</Text>
        <Widget name="gridcost" title="격자 적분 비용" height={560} />
        <Text>무작위 샘플로 어림하면 대부분 빗나갑니다. 영역 반지름을 줄여 보십시오.</Text>
        <Widget name="priormiss" title="사전 샘플이 빗나감" height={520} />
        <Callout lead="VAE에서는 세 경우가 겹칩니다" tone="warning">
          디코더가 비선형 은닉층 신경망이라 적분이 계산 불가입니다(§2.1, p.2; 부록 C, p.11). 잠재 차원은 MNIST에서 3부터 200까지입니다(그림 2, p.7). 주변우도 추정은 잠재 3차원에서만 했고, 더 높은 차원에서는 추정을 믿을 수 없었습니다(§5, p.7; 부록 D, p.11).
        </Callout>
      </Section>

      <Section heading="차원의 저주와 정보" id="curse">
        <Text>
          차원의 저주(curse of dimensionality)는 정보를 없애지 않습니다. 잡음 차원이 늘면 → 신호 차원의 차이가 거리 계산 속에 묻힙니다 → 최근접 이웃이 무리를 구별하지 못합니다(논문 밖). 신호 2개 차원은 데이터 안에 그대로 남아 있습니다.
        </Text>
        <Widget name="noise" title="잡음 차원과 거리" height={520} />
        <Table
          columns={["관찰", "내용", "근거"]}
          rows={[
            ["학습은 버팀", "잠재 차원을 늘려도 과적합이 늘지 않음. 저자는 하한의 정규화 효과로 설명", "그림 2 캡션, p.7"],
            ["평가는 무너짐", "고차원에서 주변우도 추정을 믿을 수 없었음", "§5, p.7"],
          ]}
        />
        <Text>필요 없는 잠재 차원은 KL 항 때문에 사전분포와 같은 상태로 남아 디코더에 정보를 전하지 않는다고 해석합니다(추정).</Text>
      </Section>

      <Section heading="베이즈 정리" id="bayes">
        <Tex display>{"p(\\mathbf{z} \\mid \\mathbf{x}) = \\frac{p(\\mathbf{x} \\mid \\mathbf{z})\\, p(\\mathbf{z})}{p(\\mathbf{x})}"}</Tex>
        <Table
          columns={["부분", "이름", "묻는 것"]}
          align={["start", "start", "start"]}
          rows={[
            ["p(z|x)", "사후분포", "사진을 본 뒤, 스케치가 z였을 확률"],
            ["p(x|z)", "우도", "스케치가 z일 때, 이 사진이 나올 확률"],
            ["p(z)", "사전분포", "사진을 보기 전, 스케치가 z일 확률"],
            ["p(x)", "주변우도", "어떤 스케치든 상관없이, 이 사진이 나올 확률"],
          ]}
        />
        <Text>
          세로 막대 |는 시간 순서가 아니라 "~인 것들 중에서"라는 뜻입니다. 결합확률 p(x, z)를 두 길로 세면 같은 값이 나오고, 그 등식을 p(x)로 나누면 베이즈 정리가 됩니다. 세계의 인과 방향(스케치 → 사진)은 바뀌지 않습니다.
        </Text>
        <Widget name="routes" title="같은 칸 두 길" height={600} />
        <Text>
          넓이 그림으로도 확인해 보십시오. 두 우도를 같게 맞추면 → 사진 x는 어느 스케치였는지 단서가 되지 못합니다 → "스케치가 A일 확률"의 사후 p(A|x)가 사전 p(A)와 같아집니다.
        </Text>
        <Text>
          그림 읽는 법: 기둥 너비는 사전, 진한 칸 높이는 우도입니다. 사후는 진한 칸만 모았을 때 A와 B가 차지하는 비율입니다. 예: 사전 0.70에 두 우도를 0.46으로 맞추면, 1000장 중 진한 칸은 A 322장, B 138장입니다. p(A|x) = 322 ÷ 460 = 0.700이라 사전 0.70과 같습니다(예시, 계산으로 확인). 위젯은 A와 B의 사후를 두 줄로 나눠 쓰고 옆에 사전을 함께 보여 줍니다.
        </Text>
        <Widget name="bayesarea" title="베이즈 넓이 그림" height={560} />
        <Text>
          분자 p(x|z)p(z)는 디코더와 사전분포로 바로 계산됩니다. 분모 p(x)는 모든 스케치를 더해야 해서 계산할 수 없습니다. 그래서 저자는 p(z|x)를 인코더 q(z|x)로 근사합니다(§2.1, p.3).
        </Text>
      </Section>

      <Section heading="경사상승법과 경사하강법" id="ascent">
        <Text>
          선택 기준은 그래프 모양이나 부호가 아니라 목표입니다. 크게 만들 값이면 경사상승법, 작게 만들 값이면 경사하강법입니다. g = −f로 두면 두 갱신이 매 걸음 똑같은 θ를 만듭니다.
        </Text>
        <Tex display>{"\\theta - \\eta \\nabla(-f) = \\theta + \\eta \\nabla f"}</Tex>
        <Widget name="ascent" title="경사상승과 경사하강" height={720} />
        <Table
          columns={["경우", "예 (계산으로 확인)", "결과"]}
          rows={[
            ["상한 있음, 봉우리 있음", "−(x − 2)², η = 0.25", { text: "x = 2로 수렴", tone: "success" }],
            ["상한 있음, 봉우리 없음", "−e^(−x)", { text: "값은 0에 다가가지만 x는 끝없이 커짐", tone: "warning" }],
            ["상한 없음, 봉우리 있음", "x³ − 3x", { text: "x = −1 근처에서 출발하면 수렴", tone: "success" }],
            ["상한 있음, 학습률 과대", "−(x − 2)², η = 1.5", { text: "0 → 6 → −6 → 18, 발산", tone: "danger" }],
          ]}
        />
        <Callout lead="상한이 보장하는 것">
          상한이 있으면 → 값이 그 선에서 막힙니다 → 값이 무한히 커지지 않습니다. 수렴은 봉우리, 출발점, 학습률에 함께 달려 있습니다.
        </Callout>
        <Table
          columns={["분야", "원래 목표", "실제 구현 (논문 밖, 관행)"]}
          rows={[
            ["분류", "정답 확률을 크게", "교차 엔트로피 손실 최소화"],
            ["VAE", "하한(ELBO)을 크게 (§5, p.7)", "−ELBO 최소화"],
            ["강화학습", "기대 보상을 크게", "−보상 최소화"],
          ]}
        />
      </Section>

      <Section heading="하한 L과 논문의 연결" id="elbo">
        <Tex display>{"\\log p(\\mathbf{x}) = D_{KL}\\big(q(\\mathbf{z}\\mid\\mathbf{x}) \\,\\|\\, p(\\mathbf{z}\\mid\\mathbf{x})\\big) + \\mathcal{L}"}</Tex>
        <Text>
          KL은 인코더와 참 사후분포의 차이이고 0 이상입니다 → L은 log p(x)보다 클 수 없습니다(식 1·2, §2.2, p.3). 두 분포가 같으면 KL = 0이고 L = log p(x)입니다(부록 F, p.12).
        </Text>
        <Widget name="elboline" title="하한 L의 위치" height={260} />
        <Steps
          steps={[
            { title: "L ≤ log p(x) ≤ 0", detail: "MNIST(베르누이 디코더)는 확률이 1 이하라서 log p(x)가 0 이하입니다(도출)." },
            { title: "경사상승법으로 L을 키움", detail: "L은 0이라는 선에 막혀 무한히 커지지 않습니다." },
            { title: "실제로는 0보다 아래에서 멈춤", detail: "서로 다른 사진에 동시에 확률 1을 줄 수 없기 때문입니다(도출)." },
          ]}
        />
        <Table
          columns={["논문 위치", "이어지는 내용"]}
          rows={[
            ["식 1~3 (§2.2, p.3)", "하한의 정의. 학습 목표가 log p(x)에서 L로 바뀌는 출발점"],
            ["알고리즘 1 (§2.3, p.4)", "미니배치로 L의 기울기를 구해 θ와 φ를 갱신"],
            ["그림 2 (p.7)", "세로축이 데이터당 평균 L. MNIST는 음수, Frey Face(가우시안)는 양수 눈금"],
            ["그림 3 (p.8)", "L이 아니라 log p(x) 자체를 MCMC로 따로 추정해 비교"],
          ]}
        />
        <Text>
          L을 키우면 디코더가 사진을 잘 만들게 되고(log p(x)를 올림), 인코더가 참 사후분포를 잘 흉내 내게 됩니다(KL을 줄임)(해석, 추정). 다음에 볼 곳은 L을 "재구성 점수 − KL 벌점"으로 다시 쓴 식 3입니다.
        </Text>
      </Section>

      <Section heading="기울기가 돌아가는 길" id="gradient">
        <Text>
          알고리즘 1은 미니배치로 L의 기울기를 구해 인코더 값 φ와 디코더 값 θ를 고칩니다(§2.3, p.4). 그런데 L 안에는 "z를 뽑는다"는 무작위 단계가 있습니다. 뽑기에는 미분 규칙이 없습니다. 그래서 뽑은 값에서 인코더의 μ와 σ로 돌아가는 길이 끊길 수 있습니다.
        </Text>
        <Steps
          steps={[
            { title: "바로 뽑기", detail: "z ~ N(μ, σ²)에서 z를 바로 뽑습니다. z와 f(z)는 계산됩니다. 하지만 추출기를 거꾸로 지나 μ와 σ로 역전파할 수는 없습니다." },
            { title: "ε를 뽑고 z 계산", detail: "ε를 먼저 뽑고 z = μ + σ × ε를 계산합니다. z가 μ와 σ의 식이 되어 ∂z/∂μ = 1, ∂z/∂σ = ε가 됩니다(p.5, §2.4)." },
            { title: "분포는 그대로", detail: "두 방식은 같은 ε를 쓰면 같은 z를 만듭니다. 바뀌는 것은 계산 순서뿐입니다." },
          ]}
        />
        <Callout lead="실험 2. 기울기가 돌아가는 길">
          두 방식을 번갈아 눌러 보십시오. f(z) = z²는 미분을 보기 위한 예시 함수입니다(논문 밖). 실제 VAE에서는 이 자리에 디코더의 재구성 점수 log p(x|z)가 들어갑니다(식 10, p.5).
        </Callout>
        <GradientLab />
        <Callout lead="막힘의 범위" tone="warning">
          여기서 막히는 것은 미분 규칙이 없는 추출기를 거치는 이 역전파 경로뿐입니다. 기울기를 어림하는 다른 방법은 있습니다. 논문은 흔한 몬테카를로 기울기 추정량(∇log q를 쓰는 방법)이 분산이 매우 커서 쓰기 어렵다고 적습니다(§2.2, p.3). 재매개변수화는 그 대안입니다(§2.4, p.4-5).
        </Callout>
      </Section>

      <Section heading="KL 발산" id="kl">
        <Text>
          KL 발산(KL divergence)은 분포 q를 쓸 때, 참 분포 p와 비교해 평균적으로 얼마나 어긋나는지를 재는 값입니다. VAE에서는 인코더 q(z|x)가 참 사후분포를 얼마나 잘 흉내 내는지 재는 도구로 쓰입니다(§2.1·2.2, p.3).
        </Text>
        <Tex display>{"D_{KL}(q \\,\\|\\, p) = \\sum_{z} q(z) \\log \\frac{q(z)}{p(z)}"}</Tex>
        <Text>
          읽는 법은 "q의 확률로 가중한 log(q/p)의 평균"입니다. log(q/p)는 한 값에서 q가 p보다 확률을 몇 배 크게 주는지를 로그로 잰 값입니다. q가 자주 내놓는 값일수록 그 차이를 무겁게 셉니다. z가 연속이면 합 대신 적분을 씁니다.
        </Text>
        <Table
          columns={["스케치", "q (인코더 추측)", "p (참 사후분포)", "q × log(q/p)"]}
          rows={[
            ["A", "0.9", "0.368", "0.9 × log(2.446) = 0.805"],
            ["B", "0.1", "0.632", "0.1 × log(0.158) = −0.184"],
            ["합 = KL(q‖p)", "", "", "0.621"],
          ]}
        />
        <Text>「주변우도와 계산 불가 적분」 절의 스케치 A·B 예입니다(예시 값, 자연로그, 계산으로 확인). 한 칸이 음수여도 합은 0 이상입니다.</Text>
        <Table
          columns={["성질", "내용", "위 예에서"]}
          rows={[
            ["0 이상", "항상 KL ≥ 0입니다. 깁스 부등식(Gibbs' inequality)이라는 정리입니다(논문 밖).", "0.621 ≥ 0"],
            ["같으면 0", "q와 p가 모든 값에서 같으면 KL = 0입니다.", "q = (0.368, 0.632)이면 0"],
            ["비대칭", "KL(q‖p)와 KL(p‖q)는 보통 다릅니다. 가중치로 쓰는 분포가 다르기 때문입니다.", "0.621 대 0.836"],
          ]}
        />
        <Text>두 분포를 바꿔 보십시오. 슬라이더 단위 때문에 p(A)의 기본값은 0.37이라서, 표와 소수 셋째 자리가 조금 다를 수 있습니다.</Text>
        <Widget name="kl" title="KL 발산 탐색" height={520} />
        <Table
          columns={["위치", "두 분포", "역할"]}
          rows={[
            ["식 1 (§2.2, p.3)", "인코더 대 참 사후분포", "L과 log p(x) 사이의 간격. 참 사후분포가 들어 있어서 직접 계산할 수 없음"],
            ["식 3 (§2.2, p.3)", "인코더 대 사전분포 N(0, I)", "하한 안의 벌점. 인코더를 사전분포 쪽으로 당기는 정규화 항(§2.3, p.4)"],
          ]}
        />
        <Text>
          식 3의 KL은 두 분포가 모두 가우시안이라서 적분 없이 식 하나로 계산됩니다(부록 B, p.10-11). μ와 σ는 인코더가 차원 j마다 낸 평균과 흩어짐(표준편차)입니다. J는 잠재 변수의 차원 수입니다. 원문 식의 왼쪽은 KL이 아니라 −KL입니다.
        </Text>
        <Tex display>{"-D_{KL} = \\frac{1}{2} \\sum_{j=1}^{J} \\left( 1 + \\log \\sigma_j^2 - \\mu_j^2 - \\sigma_j^2 \\right)"}</Tex>
        <Text>
          한 차원(J = 1)이면 KL = ½(μ² + σ² − 1 − ln σ²)입니다. μ = 0, σ = 1이면 괄호 안이 1 + 0 − 0 − 1 = 0이라 KL = 0입니다. 인코더가 사전분포 N(0, 1)과 같아진 경우입니다. μ = 1, σ = 0.5이면 KL ≈ 0.818입니다(예시 값, 계산으로 확인). 평균이 0에서 멀수록, 흩어짐이 1에서 멀수록 벌점이 커집니다.
        </Text>
        <Callout lead="실험 3. KL이 0이 되는 자리">
          위 두 예시는 버튼으로 바로 불러올 수 있습니다. q는 입력을 보고 추측한 잠재 분포, p는 입력을 보기 전에 정한 사전분포 N(0, 1)입니다. 실선(q)이 점선(p)과 완전히 겹치는 자리에서만 KL이 0이 됩니다.
        </Callout>
        <GaussianKLLab />
        <Callout lead="정리" tone="info">
          계산할 수 없는 KL(식 1)은 하한의 간격이 되고, 계산할 수 있는 KL(식 3)은 인코더를 사전분포 쪽으로 당기는 벌점이 됩니다.
        </Callout>
      </Section>

      <Section heading="한눈에 보기" id="map">
        <Text>지금까지의 내용을 가로 마인드맵으로 정리했습니다. 가지를 눌러 접고 펼칠 수 있습니다.</Text>
        <Widget name="mindmap" title="AEVB 학습 노트 마인드맵" height={720} />
        <Callout lead="한 줄 흐름" tone="info">
          사후분포의 분모 p(x)를 계산할 수 없습니다 → log p(x) 대신 그 아래에 있는 하한 L을 키웁니다 → L의 기울기를 구하려고 노이즈를 밖으로 빼는 재매개변수화를 씁니다 → 인코더가 사진마다 한 번에 분포를 내므로, 데이터마다 MCMC를 돌리지 않고 미니배치로 학습합니다.
        </Callout>
      </Section>

      <Section heading="확인 퀴즈" id="quiz">
        <Text>보기를 고르면 정답 여부와 이유가 나옵니다. 위 실험의 가우시안 예시를 기준으로 답하십시오.</Text>
        <Quiz />
      </Section>

      <Section heading="공부하며 바로잡은 내용" id="fixes">
        <Table
          columns={["처음 표현 또는 이해", "바로잡은 내용"]}
          rows={[
            ["상한이 없으면 발산한다", "상한은 값이 무한히 커지는 것만 막습니다. 상한이 없어도 봉우리에서 멈출 수 있습니다."],
            ["베이즈 정리의 두 순서는 시간 순서가 다르다", "|는 \"~인 것들 중에서\"입니다. 두 순서는 같은 칸을 세는 두 길입니다."],
            ["차원을 늘리면 정보가 의미 없어진다", "정보는 남습니다. 잡음 차원이 신호를 거리 계산 속에 묻을 뿐입니다."],
            ["사후가 사전과 같아진다 (대상이 빠짐)", "\"스케치가 A일 확률\"의 사전 p(A)와 사후 p(A|x)가 같아진다는 뜻입니다."],
            ["MNIST L이 도달하는 최댓값은 0", "0은 넘을 수 없는 선이지, 실제로 도달하는 값이 아닙니다."],
            ["넓이 그림의 사후 표시 0.700 / 0.300이 사전과 다르다", "슬래시는 나눗셈이 아니라 A와 B의 사후를 나란히 쓴 것이었습니다. p(A|x) = 0.700은 사전 0.70과 같습니다. 위젯 표기를 두 줄로 바꿨습니다."],
          ]}
        />
      </Section>

      <Section heading="출처" id="refs">
        <Text>
          Diederik P. Kingma, Max Welling. Auto-Encoding Variational Bayes. 2013. arXiv:1312.6114 (v11, 2022). https://arxiv.org/abs/1312.6114
        </Text>
        <Text>쪽 번호와 절 번호는 arXiv v11 기준입니다. 위젯의 분포와 숫자는 설명을 위해 만든 예시이며 논문의 실험값이 아닙니다. 위젯은 Claude 앱에서 공부하며 만든 그림을 그대로 옮긴 것입니다. 세 실험(같은 난수, 기울기가 돌아가는 길, KL이 0이 되는 자리)과 확인 퀴즈는 ChatGPT에서 만든 복습 실험실을 이 사이트 부품으로 다시 만든 것입니다. 계산식은 원본과 같습니다. 실험의 조작값은 모두 예시이며 실제 모델을 학습하지 않습니다.</Text>
      </Section>
    </Page>
  );
}
