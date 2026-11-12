import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Table,
  Bars,
  Properties,
  Segmented,
  useGrokTheme,
  useMemo,
  useState,
} from "@/components/canvas";

// 지형과 위젯 수치는 모두 예시 값이다(논문 밖). 같은 결과가 나오도록 고정 시드로 잡음을 만든다.
// 손실 = 0.5 * (가로^2 + 20 * 세로^2). 세로 방향이 가파르고 가로 방향이 완만한 골짜기다.
const STEPS = 60;
const KX = 1;
const KY = 20;
const X0 = -4;
const Y0 = 2;
const B1 = 0.9;
const B2 = 0.999;
const EPS = 1e-8;

function makeRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed: number): [number, number][] {
  const r = makeRandom(seed);
  const g = () => {
    const u = Math.max(r(), 1e-9);
    const v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const out: [number, number][] = [];
  for (let i = 0; i < STEPS; i++) out.push([g(), g()]);
  return out;
}

type NoiseKey = "a" | "b" | "c";
type BiasKey = "on" | "off";

const NOISES: Record<NoiseKey, [number, number][]> = {
  a: makeNoise(7),
  b: makeNoise(8),
  c: makeNoise(9),
};

const BIAS_OPTIONS = [
  { value: "on" as const, label: "편향 보정 켜기" },
  { value: "off" as const, label: "편향 보정 끄기" },
];

const NOISE_OPTIONS = [
  { value: "a" as const, label: "잡음 1" },
  { value: "b" as const, label: "잡음 2" },
  { value: "c" as const, label: "잡음 3" },
];

type Pt = [number, number];
const loss = (p: Pt) => 0.5 * (KX * p[0] * p[0] + KY * p[1] * p[1]);
const isOut = (p: Pt) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 8 || Math.abs(p[1]) > 5;

function runSgd(alpha: number, noise: number, z: [number, number][]) {
  let p: Pt = [X0, Y0];
  const path: Pt[] = [p];
  let diverged = false;
  for (let t = 0; t < STEPS; t++) {
    const gx = KX * p[0] + noise * z[t][0];
    const gy = KY * p[1] + noise * z[t][1];
    p = [p[0] - alpha * gx, p[1] - alpha * gy];
    path.push(p);
    if (isOut(p)) {
      diverged = true;
      break;
    }
  }
  return { path, diverged };
}

function runAdam(alpha: number, noise: number, z: [number, number][], correct: boolean) {
  let p: Pt = [X0, Y0];
  const m = [0, 0];
  const v = [0, 0];
  const path: Pt[] = [p];
  const steps: number[] = [];
  let diverged = false;
  for (let t = 1; t <= STEPS; t++) {
    const g = [KX * p[0] + noise * z[t - 1][0], KY * p[1] + noise * z[t - 1][1]];
    const d = [0, 0];
    for (let i = 0; i < 2; i++) {
      m[i] = B1 * m[i] + (1 - B1) * g[i];
      v[i] = B2 * v[i] + (1 - B2) * g[i] * g[i];
      const mh = correct ? m[i] / (1 - B1 ** t) : m[i];
      const vh = correct ? v[i] / (1 - B2 ** t) : v[i];
      d[i] = (alpha * mh) / (Math.sqrt(vh) + EPS);
    }
    p = [p[0] - d[0], p[1] - d[1]];
    // 한 걸음 크기 = 두 방향 중 큰 쪽의 이동량을 α로 나눈 값
    steps.push(Math.max(Math.abs(d[0]), Math.abs(d[1])) / alpha);
    path.push(p);
    if (isOut(p)) {
      diverged = true;
      break;
    }
  }
  return { path, steps, diverged };
}

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
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
        style={{ width: "100%", minWidth: 0, minHeight: 36, margin: 0, accentColor: theme.text.accent }}
      />
    </div>
  );
}

// 한 칸(가로 320) 안에서 좌표를 화면 위치로 바꾼다.
const PANEL_W = 320;
const toPx = (ox: number, p: Pt): Pt => [
  Math.min(ox + PANEL_W + 6, Math.max(ox - 6, ox + 160 + p[0] * 30)),
  Math.min(226, Math.max(34, 130 - p[1] * 32)),
];

function AdamLab() {
  const theme = useGrokTheme();
  const [alpha, setAlpha] = useState(0.08);
  const [noise, setNoise] = useState(2);
  const [bias, setBias] = useState<BiasKey>("on");
  const [noiseKey, setNoiseKey] = useState<NoiseKey>("a");

  const sim = useMemo(() => {
    const z = NOISES[noiseKey];
    const sgd = runSgd(alpha, noise, z);
    const adam = runAdam(alpha, noise, z, bias === "on");
    return { sgd, adam };
  }, [alpha, noise, bias, noiseKey]);

  const first10 = sim.adam.steps.slice(0, 10);
  const maxFirst = Math.max(...first10);
  let now: string;
  if (bias === "off") {
    now = `편향 보정이 꺼져 있습니다. Adam의 첫 걸음이 α의 ${first10[0].toFixed(2)}배이고, 처음 10걸음 중 가장 큰 걸음은 α의 ${maxFirst.toFixed(2)}배입니다 (예시).`;
  } else if (sim.sgd.diverged && !sim.adam.diverged) {
    now = "α가 커서 SGD는 가파른 세로 방향에서 튕겨 나갑니다. Adam은 걸음이 α 근처로 묶여서 튕겨 나가지 않습니다.";
  } else if (noise >= 5) {
    now = "잡음이 커서 두 경로 모두 흔들립니다. 그래도 Adam의 걸음 크기는 α 근처에 머뭅니다.";
  } else {
    now = "SGD는 가파른 방향에서 크게, 완만한 방향에서 작게 걷습니다. Adam은 두 방향 모두 비슷한 걸음 크기로 걷습니다.";
  }

  const sgdColor = theme.dataviz.categorical[1];
  const adamColor = theme.dataviz.categorical[0];
  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  const panelLabel = { ...theme.font.subtext, fill: theme.text.primary };
  const levels = [1, 4, 9, 16, 25];

  const panel = (ox: number, title: string, path: Pt[], color: string, diverged: boolean) => {
    const pts = path.map((p) => toPx(ox, p));
    const start = toPx(ox, [X0, Y0]);
    return (
      <g>
        <text x={ox + 8} y={22} style={panelLabel}>
          {title}
        </text>
        <rect x={ox} y={30} width={PANEL_W} height={200} rx={8} fill="none" stroke={theme.border.weak} />
        {levels.map((c) => (
          <ellipse
            key={c}
            cx={ox + 160}
            cy={130}
            rx={Math.sqrt(2 * c / KX) * 30 / Math.SQRT2}
            ry={Math.sqrt(2 * c / KY) * 32 / Math.SQRT2}
            fill="none"
            stroke={theme.border.default}
          />
        ))}
        <path d={`M${ox + 155} 130H${ox + 165}M${ox + 160} 125V135`} stroke={theme.text.secondary} />
        <polyline
          points={pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {pts.slice(1).map((q, i) => (
          <circle key={i} cx={q[0]} cy={q[1]} r={2} fill={color} />
        ))}
        <circle cx={start[0]} cy={start[1]} r={4} fill={theme.text.tertiary} />
        {diverged ? (
          <text x={ox + 160} y={220} textAnchor="middle" style={{ ...theme.font.caption, fill: theme.text.danger }}>
            발산 (지형 밖으로 튕겨 나감)
          </text>
        ) : null}
      </g>
    );
  };

  const lastSgd = sim.sgd.path[sim.sgd.path.length - 1];
  const lastAdam = sim.adam.path[sim.adam.path.length - 1];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Callout lead="지금 보고 있는 것" tone="info">
        {now}
      </Callout>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Segmented options={BIAS_OPTIONS} value={bias} onChange={setBias} />
        <Segmented options={NOISE_OPTIONS} value={noiseKey} onChange={setNoiseKey} />
      </div>

      <figure style={{ margin: 0 }}>
        <svg
          viewBox="0 0 680 250"
          role="img"
          aria-labelledby="adam-lab-title adam-lab-desc"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <title id="adam-lab-title">골짜기 지형에서 SGD와 Adam의 이동 경로 (예시)</title>
          <desc id="adam-lab-desc">
            왼쪽은 SGD, 오른쪽은 Adam의 경로입니다. 타원은 같은 높이의 등고선이고, 가운데 십자가 골짜기 바닥입니다.
          </desc>
          {panel(10, "SGD (확률적 경사하강법)", sim.sgd.path, sgdColor, sim.sgd.diverged)}
          {panel(350, "Adam", sim.adam.path, adamColor, sim.adam.diverged)}
          <text x={340} y={246} textAnchor="middle" style={caption}>
            회색 점 = 출발점, 십자 = 골짜기 바닥, 점 하나 = 한 걸음 (최대 60걸음, 예시)
          </text>
        </svg>
      </figure>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Slider
          id="adam-alpha"
          label="학습률 α (예시 범위)"
          value={alpha}
          min={0.01}
          max={0.3}
          step={0.01}
          show={alpha.toFixed(2)}
          onChange={setAlpha}
        />
        <Slider
          id="adam-noise"
          label="기울기 잡음 크기 (예시)"
          value={noise}
          min={0}
          max={10}
          step={0.5}
          show={noise.toFixed(1)}
          onChange={setNoise}
        />
      </div>

      <Properties
        items={[
          { label: "SGD 마지막 손실 (예시)", value: sim.sgd.diverged ? "발산" : loss(lastSgd).toFixed(3) },
          { label: "Adam 마지막 손실 (예시)", value: sim.adam.diverged ? "발산" : loss(lastAdam).toFixed(3) },
          { label: "Adam 첫 걸음 크기 (예시)", value: `${first10[0].toFixed(2)}α` },
        ]}
      />

      <Text>Adam의 처음 10걸음 크기입니다. 값은 "α의 몇 배인가"입니다 (예시 계산값).</Text>
      <Bars
        bars={first10.map((s, i) => ({ label: `${i + 1}번째 걸음`, value: s, display: `${s.toFixed(2)}α` }))}
      />
    </div>
  );
}

// 각 방법이 과거 기울기를 얼마나 기억하는지 칸의 진하기로 그린다. 진하기는 과장한 예시다.
const CELLS = 10;
const fade = Array.from({ length: CELLS }, (_, k) => Math.max(0.12, 0.75 ** (CELLS - 1 - k)));
const flat = Array.from({ length: CELLS }, () => 0.85);
const nowOnly = Array.from({ length: CELLS }, (_, k) => (k === CELLS - 1 ? 1 : 0));

function MemoryFigure() {
  const theme = useGrokTheme();
  const dir = theme.dataviz.categorical[0];
  const size = theme.dataviz.categorical[1];
  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  const name = { ...theme.font.subtext, fill: theme.text.primary, fontWeight: 600 };

  const rows: { name: string; note: string; tracks: { label: string; color: string; w: number[] }[] }[] = [
    { name: "SGD", note: "기억 없음", tracks: [{ label: "지금", color: dir, w: nowOnly }] },
    { name: "AdaGrad", note: "제곱을 전부 더함", tracks: [{ label: "크기", color: size, w: flat }] },
    { name: "RMSProp", note: "제곱의 최근 평균, 보정 없음", tracks: [{ label: "크기", color: size, w: fade }] },
    {
      name: "Adam",
      note: "평균 + 제곱 평균 + 보정",
      tracks: [
        { label: "방향", color: dir, w: fade },
        { label: "크기", color: size, w: fade },
      ],
    },
  ];

  let y = 40;
  const blocks = rows.map((r) => {
    const top = y;
    const h = 22 + r.tracks.length * 26;
    y += h + 10;
    return (
      <g key={r.name}>
        <rect x={20} y={top} width={640} height={h} rx={8} fill="none" stroke={theme.border.weak} />
        <text x={36} y={top + 22} style={name}>
          {r.name}
        </text>
        <text x={36} y={top + 40} style={caption}>
          {r.note}
        </text>
        {r.tracks.map((t, ti) => {
          const ty = top + 12 + ti * 26;
          return (
            <g key={t.label}>
              <text x={286} y={ty + 14} textAnchor="end" style={caption}>
                {t.label}
              </text>
              {t.w.map((o, k) => (
                <rect
                  key={k}
                  x={300 + k * 34}
                  y={ty}
                  width={28}
                  height={20}
                  rx={3}
                  fill={o > 0 ? t.color : "none"}
                  fillOpacity={o > 0 ? o : 1}
                  stroke={theme.border.default}
                />
              ))}
            </g>
          );
        })}
      </g>
    );
  });

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 680 ${y + 20}`}
        role="img"
        aria-labelledby="mem-title mem-desc"
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <title id="mem-title">SGD, AdaGrad, RMSProp, Adam이 기억하는 것</title>
        <desc id="mem-desc">
          칸 하나가 과거 한 걸음의 기울기입니다. 오른쪽 끝이 지금입니다. 진할수록 많이 반영합니다.
        </desc>
        <text x={300} y={24} style={caption}>
          과거
        </text>
        <text x={630} y={24} textAnchor="end" style={caption}>
          지금
        </text>
        {blocks}
      </svg>
      <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
        "방향" 줄 = 기울기의 최근 평균. "크기" 줄 = 기울기 제곱. 진하기는 개념을 보이려고 과장한 예시입니다.
      </figcaption>
    </figure>
  );
}

// ---- Adam 안을 들여다보는 세 실험 (Adam 복습 실험실과 같은 계산, 기울기 열과 결과는 모두 예시 값) ----
// 여기서는 논문 기본값 α 0.001, β2 0.999, ε 10^-8을 그대로 쓴다 (p.2, 알고리즘 1).
const LA = 0.001;
const LB2 = 0.999;
const LE = 1e-8;

interface Moment {
  t: number;
  g: number;
  m: number;
  v: number;
  mhat: number;
  vhat: number;
  rms: number;
  eta: number;
  step: number;
  rawStep: number;
}

function moments(gs: number[], beta1 = 0.9, beta2 = LB2, alpha = LA, epsilon = LE): Moment[] {
  let m = 0;
  let v = 0;
  return gs.map((g, i) => {
    const t = i + 1;
    m = beta1 * m + (1 - beta1) * g;
    v = beta2 * v + (1 - beta2) * g * g;
    const mhat = m / (1 - beta1 ** t);
    const vhat = v / (1 - beta2 ** t);
    const rms = Math.sqrt(vhat);
    const eta = alpha / (rms + epsilon);
    return { t, g, m, v, mhat, vhat, rms, eta, step: eta * mhat, rawStep: (alpha * m) / (Math.sqrt(v) + epsilon) };
  });
}

const fmt = (x: number): string => {
  if (!Number.isFinite(x)) return "계산 불가";
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a < 0.0001 || a >= 10000) return x.toExponential(3);
  return Number(x.toFixed(a < 0.01 ? 7 : a < 1 ? 6 : 4)).toString();
};

function LabButton({
  label,
  onClick,
  disabled = false,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const theme = useGrokTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...theme.font.subtext,
        fontFamily: theme.font.family,
        color: primary ? theme.text.onPrimary : theme.text.primary,
        background: primary ? theme.fill.primary : theme.fill.secondary,
        border: `1px solid ${theme.border.default}`,
        borderRadius: theme.radius.md,
        padding: "8px 14px",
        minHeight: 36,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Formula({ lines }: { lines: string[] }) {
  const theme = useGrokTheme();
  return (
    <div
      style={{
        ...theme.font.subtext,
        fontFamily: theme.font.mono,
        color: theme.text.primary,
        background: theme.bg.subtle,
        borderRadius: theme.radius.md,
        padding: "10px 14px",
        overflowWrap: "anywhere",
      }}
    >
      {lines.map((l) => (
        <div key={l}>{l}</div>
      ))}
    </div>
  );
}

function Note({ children }: { children: string }) {
  const theme = useGrokTheme();
  return <p style={{ ...theme.font.caption, color: theme.text.secondary, margin: 0 }}>{children}</p>;
}

const ON_OFF_BIAS = [
  { value: "on" as const, label: "편향 보정 켜기" },
  { value: "off" as const, label: "편향 보정 끄기" },
];

function BiasLab() {
  const theme = useGrokTheme();
  const [beta1, setBeta1] = useState(0.9);
  const [g, setG] = useState(2);
  const [t, setT] = useState(1);
  const [corr, setCorr] = useState<BiasKey>("on");
  const on = corr === "on";
  const data = useMemo(() => moments(Array(10).fill(g), beta1), [g, beta1]);
  const cur = data[t - 1];
  const chosen = on ? cur.step : cur.rawStep;

  const W = 640;
  const H = 230;
  const l = 64;
  const r = W - 16;
  const top = 30;
  const bottom = H - 42;
  const max = Math.max(...data.map((d) => d.mhat), ...data.map((d) => d.m)) * 1.15;
  const x = (s: number) => l + 8 + ((s - 1) / 9) * (r - l - 16);
  const y = (v: number) => bottom - 6 - (v / max) * (bottom - top - 12);
  const visible = data.filter((d) => d.t <= t);
  const one = theme.dataviz.categorical[0];
  const two = theme.dataviz.categorical[1];
  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  const series: { key: "m" | "mhat"; color: string; dash: string }[] = [
    { key: "m", color: one, dash: "" },
    ...(on ? [{ key: "mhat" as const, color: two, dash: "6 4" }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Slider
          id="bias-b1"
          label="과거 방향 보존 비율 β1"
          value={beta1}
          min={0}
          max={0.99}
          step={0.01}
          show={beta1.toFixed(2)}
          onChange={setBeta1}
        />
        <Slider id="bias-g" label="매번 들어오는 기울기 g (예시)" value={g} min={0.2} max={4} step={0.1} show={g.toFixed(1)} onChange={setG} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <LabButton label="한 걸음" primary disabled={t === 10} onClick={() => setT((s) => Math.min(10, s + 1))} />
        <LabButton label="10걸음 보기" onClick={() => setT(10)} />
        <LabButton
          label="처음"
          onClick={() => {
            setT(1);
            setBeta1(0.9);
            setG(2);
            setCorr("on");
          }}
        />
        <Segmented options={ON_OFF_BIAS} value={corr} onChange={setCorr} />
      </div>
      <Formula lines={["m ← β1 × 이전 m + (1 − β1) × g", "m̂ = m ÷ (1 − β1^t)   (β1^t는 β1의 t제곱)"]} />
      <figure style={{ margin: 0 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby="bias-chart-title bias-chart-desc"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <title id="bias-chart-title">원시 평균 m과 보정 평균 m̂ (예시)</title>
          <desc id="bias-chart-desc">매번 같은 기울기를 넣은 첫 열 걸음의 계산입니다. 아래 표에서 모든 수치를 볼 수 있습니다.</desc>
          <rect x={l} y={top} width={r - l} height={bottom - top} fill="none" stroke={theme.border.default} />
          {[0, 1, 2].map((j) => {
            const v = (max * j) / 2;
            const yy = y(v);
            return (
              <g key={j}>
                <line x1={l} y1={yy} x2={r} y2={yy} stroke={theme.border.weak} />
                <text x={l - 8} y={yy + 4} textAnchor="end" style={caption}>
                  {fmt(v)}
                </text>
              </g>
            );
          })}
          {[1, 4, 7, 10].map((s) => (
            <text key={s} x={x(s)} y={bottom + 18} textAnchor="middle" style={caption}>
              {s}
            </text>
          ))}
          <text x={l} y={16} style={caption}>
            방향 평균 (예시 값)
          </text>
          <text x={(l + r) / 2} y={H - 5} textAnchor="middle" style={caption}>
            걸음 t
          </text>
          <g>
            <line x1={r - 230} y1={12} x2={r - 206} y2={12} stroke={one} strokeWidth={2} />
            <text x={r - 200} y={16} style={caption}>
              원시 m (실선)
            </text>
            {on ? (
              <>
                <line x1={r - 110} y1={12} x2={r - 86} y2={12} stroke={two} strokeWidth={2} strokeDasharray="6 4" />
                <text x={r - 80} y={16} style={caption}>
                  보정 m̂ (점선)
                </text>
              </>
            ) : null}
          </g>
          {series.map((s) => (
            <g key={s.key}>
              <path
                d={visible.map((d, i) => `${i ? "L" : "M"}${x(d.t).toFixed(1)},${y(d[s.key]).toFixed(1)}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dash}
              />
              {visible.map((d) => (
                <circle key={d.t} cx={x(d.t)} cy={y(d[s.key])} r={3} fill={s.color} />
              ))}
            </g>
          ))}
        </svg>
      </figure>
      <Properties
        items={[
          { label: `${t}번째 걸음, 보정 ${on ? "켬" : "끔"}`, value: `m ${fmt(cur.m)} / m̂ ${fmt(cur.mhat)}` },
          { label: "원시 v / 보정 v̂", value: `${fmt(cur.v)} / ${fmt(cur.vhat)}` },
          { label: "선택한 실제 이동 크기 |Δθ|", value: fmt(chosen) },
          { label: "보정 켬 / 보정 끔", value: `${fmt(cur.step)} / ${fmt(cur.rawStep)}` },
        ]}
      />
      <Table
        columns={["걸음 t", "원시 m", "보정 m̂", "선택한 평균"]}
        rows={data.map((d) => [
          d.t === t ? `${d.t} ←` : String(d.t),
          fmt(d.m),
          fmt(d.mhat),
          fmt(on ? d.mhat : d.m),
        ])}
      />
      <Callout lead="지금 보고 있는 것" tone="info">
        {`현재 m이 받는 기울기의 누적 가중치 합은 ${fmt(1 - beta1 ** t)}입니다. 그 합으로 나누면 m̂ = ${fmt(cur.mhat)}가 됩니다. m이 작아도 v도 작아지므로, 보정 없는 실제 이동량이 더 커질 수 있습니다.`}
      </Callout>
      <Note>
        β2 = 0.999, α = 0.001, ε = 10^-8 고정. 토글을 켜면 m과 v를 함께 보정합니다. m과 v의 원시 기록 자체는 바꾸지 않습니다. 다른 종류의 통계적 편향까지 없애는 보정은 아닙니다.
      </Note>
    </div>
  );
}

function computeScale(scale: number, epsilon: number, steps = 5) {
  const b = [2, 0.2];
  const s = [2 * scale, 0.2];
  const base = b.map((gv) => moments(Array(steps).fill(gv), 0.9, LB2, LA, epsilon)[steps - 1]);
  const scaled = s.map((gv) => moments(Array(steps).fill(gv), 0.9, LB2, LA, epsilon)[steps - 1]);
  return {
    base,
    scaled,
    rows: [
      { label: "SGD · x", base: LA * b[0], scaled: LA * s[0] },
      { label: "Adam · x", base: base[0].step, scaled: scaled[0].step },
      { label: "SGD · y", base: LA * b[1], scaled: LA * s[1] },
      { label: "Adam · y", base: base[1].step, scaled: scaled[1].step },
    ],
  };
}

const EPS_MODE = [
  { value: "pos" as const, label: "ε > 0 (실제 설정)" },
  { value: "zero" as const, label: "ε = 0 (수학적 조건)" },
];

function ScaleLab() {
  const [c, setC] = useState(3);
  const [exp, setExp] = useState(-8);
  const [epsMode, setEpsMode] = useState<"pos" | "zero">("pos");
  const zero = epsMode === "zero";
  const eps = zero ? 0 : 10 ** exp;
  const res = useMemo(() => computeScale(c, eps), [c, eps]);
  const bars = res.rows.slice(0, 2).flatMap((row) => [
    { label: `${row.label} · 원본`, value: row.base, display: fmt(row.base) },
    { label: `${row.label} · 배율 적용`, value: row.scaled, display: fmt(row.scaled) },
  ]);
  const rx = res.rows[1];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Slider id="scale-c" label="x 기울기 배율 c" value={c} min={0.1} max={10} step={0.1} show={`×${c.toFixed(1)}`} onChange={setC} />
        <Slider
          id="scale-eps"
          label="ε 크기 (지수 조절, 예시 설정)"
          value={exp}
          min={-8}
          max={0}
          step={1}
          show={zero ? "0" : `10^${exp} = ${fmt(eps)}`}
          onChange={setExp}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Segmented options={EPS_MODE} value={epsMode} onChange={setEpsMode} />
        <LabButton
          label="처음 설정"
          onClick={() => {
            setC(3);
            setExp(-8);
            setEpsMode("pos");
          }}
        />
      </div>
      <Formula lines={["SGD 이동 크기 = α × |g|", "Adam 이동 크기 = α × |m̂| ÷ (√v̂ + ε)"]} />
      <Text>5번째 걸음의 실제 이동 크기 |Δθ|입니다. 모든 막대는 같은 축을 씁니다 (예시 계산값).</Text>
      <Bars bars={bars} emphasis="none" />
      <Table
        columns={["방법·좌표", "원본", "배율 적용", "이동량 비율"]}
        rows={res.rows.map((row) => [row.label, fmt(row.base), fmt(row.scaled), `×${fmt(row.scaled / row.base)}`])}
      />
      <Properties
        items={[
          {
            label: "x 이동량 비율",
            value: `SGD ×${fmt(res.rows[0].scaled / res.rows[0].base)} / Adam ×${fmt(rx.scaled / rx.base)}`,
          },
          { label: "Adam x의 m̂", value: `${fmt(res.base[0].mhat)} → ${fmt(res.scaled[0].mhat)}` },
          { label: "Adam x의 √v̂", value: `${fmt(res.base[0].rms)} → ${fmt(res.scaled[0].rms)}` },
        ]}
      />
      <Callout lead="지금 보고 있는 것" tone="info">
        {zero
          ? "ε = 0: 분자 m̂은 c배, 분모 √v̂도 c배가 되어 약분됩니다. 이 예시에서 Adam의 이동량은 수치 오차를 빼면 정확히 같습니다."
          : "ε > 0: ε는 배율을 따라 바뀌지 않아 정확한 불변성은 깨집니다. ε가 √v̂에 비해 작으면 거의 같습니다. 표시 자릿수 때문에 아주 작은 차이는 같아 보일 수 있습니다."}
      </Callout>
      <Note>
        대각(diagonal)은 좌표를 섞지 않고 좌표마다 배율만 바꾼다는 뜻입니다. 전체 기울기 이력에 고정된 양의 배율을 곱한 경우를 비교합니다. 좌표 회전이나 매 걸음 다른 배율에서는 불변성을 보장하지 않습니다. ε를 크게 바꾸는 것은 차이를 보려는 예시 설정입니다.
      </Note>
    </div>
  );
}

function computeCoordinate(beta1: number, period: number, steps: number) {
  const ga = Array(steps).fill(4);
  const gb = Array.from({ length: steps }, (_, i) => ((i + 1) % period === 0 ? 1 : 0));
  const a = moments(ga, beta1);
  const b = moments(gb, beta1);
  return { a: a[steps - 1], b: b[steps - 1], historyB: b };
}

const SHOW_MODE = [
  { value: "step" as const, label: "실제 이동량 보기" },
  { value: "eta" as const, label: "보정계수 보기" },
];

function CoordLab() {
  const theme = useGrokTheme();
  const [beta1, setBeta1] = useState(0.9);
  const [period, setPeriod] = useState(5);
  const [t, setT] = useState(10);
  const [show, setShow] = useState<"step" | "eta">("step");
  const real = show === "step";
  const res = useMemo(() => computeCoordinate(beta1, period, t), [beta1, period, t]);
  const recent = res.historyB.slice(-10);
  const d = res.b;
  const note =
    d.vhat === 0
      ? "B는 아직 기울기가 한 번도 없습니다. η가 커도 m̂ = 0이므로 실제 이동량은 0입니다."
      : d.g === 0 && Math.abs(d.mhat) > 0
        ? "B의 현재 g는 0이지만 과거 방향 평균 m̂이 남아 있어 계속 이동합니다."
        : d.g === 0
          ? "β1 = 0이면 현재 기울기가 0일 때 방향 평균도 0이 됩니다."
          : "드문 기울기의 보정계수가 커도, 실제 이동량은 방향 평균 m̂을 함께 곱해 정해집니다.";
  const valueOf = (m: Moment) => (real ? Math.abs(m.step) : m.eta);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <Slider id="coord-b1" label="과거 방향 보존 비율 β1" value={beta1} min={0} max={0.95} step={0.05} show={beta1.toFixed(2)} onChange={setBeta1} />
        <Slider id="coord-period" label="B의 기울기가 나오는 간격" value={period} min={2} max={10} step={1} show={`${period}걸음마다`} onChange={setPeriod} />
        <Slider id="coord-t" label="현재 걸음 t" value={t} min={1} max={30} step={1} show={String(t)} onChange={setT} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <LabButton label="한 걸음" primary disabled={t === 30} onClick={() => setT((s) => Math.min(30, s + 1))} />
        <LabButton
          label="처음"
          onClick={() => {
            setBeta1(0.9);
            setPeriod(5);
            setT(1);
            setShow("step");
          }}
        />
        <Segmented options={SHOW_MODE} value={show} onChange={setShow} />
      </div>
      <Formula lines={["보정계수 η = α ÷ (√v̂ + ε)", "실제 이동 크기 |Δθ| = η × |m̂|"]} />
      <Note>{`B의 기울기 기록, ${recent[0].t}~${t}번째 걸음 (칸 윗줄: 걸음, 아랫줄: g)`}</Note>
      <div
        aria-label="B의 최근 기울기 기록"
        style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: 4 }}
      >
        {recent.map((h) => (
          <span
            key={h.t}
            aria-label={`${h.t}번째 기울기 ${h.g}`}
            style={{
              ...theme.font.caption,
              textAlign: "center",
              padding: "6px 0",
              minWidth: 0,
              borderRadius: theme.radius.sm,
              color: theme.text.primary,
              background: h.g ? theme.fill.accentSubtle : theme.bg.subtle,
              border: `1px solid ${h.g ? theme.border.strong : theme.border.weak}`,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {h.t}
            <br />
            {h.g}
          </span>
        ))}
      </div>
      <Text>{real ? "실제 이동 크기 |Δθ| (예시 계산값)" : "보정계수 η (예시 계산값)"}</Text>
      <Bars
        bars={[
          { label: "A · 매번 큰 기울기", value: valueOf(res.a), display: fmt(valueOf(res.a)) },
          { label: "B · 드문 기울기", value: valueOf(res.b), display: fmt(valueOf(res.b)) },
        ]}
        emphasis="none"
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {([
          ["파라미터 A", res.a],
          ["파라미터 B", res.b],
        ] as const).map(([name, m]) => (
          <div key={name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ ...theme.font.subtext, color: theme.text.primary, fontWeight: 600 }}>{name}</span>
            <Properties
              items={[
                { label: "현재 기울기 g", value: fmt(m.g) },
                { label: "보정 방향 평균 m̂", value: fmt(m.mhat) },
                { label: "평소 크기 √v̂", value: fmt(m.rms) },
                { label: "보정계수 η", value: fmt(m.eta) },
                { label: "실제 이동 크기 |Δθ|", value: fmt(Math.abs(m.step)) },
              ]}
            />
          </div>
        ))}
      </div>
      <Callout lead={real ? "지금 막대: 실제 이동 크기 |Δθ|" : "지금 막대: 보정계수 η"} tone="info">
        {note}
      </Callout>
      <Note>
        β2 = 0.999, α = 0.001, ε = 10^-8 고정. 아직 기울기가 한 번도 없으면 B의 실제 이동량은 0입니다. 이전 기울기가 있었다면 현재 g가 0이어도 방향 평균 m̂이 남을 수 있습니다.
      </Note>
    </div>
  );
}

const QUIZ: { id: string; q: string; options: [string, string][]; correct: string; explain: string }[] = [
  {
    id: "q1",
    q: "1. Adam의 v는 무엇을 모은 값입니까?",
    options: [
      ["a", "손실의 2차 미분"],
      ["b", "기울기를 제곱한 값의 이동평균"],
      ["c", "파라미터 값의 이동평균"],
    ],
    correct: "b",
    explain: "v는 g²의 이동평균이며, 헤세 행렬(2차 미분을 모은 행렬)이나 2차 미분이 아닙니다. (p.2, 알고리즘 1)",
  },
  {
    id: "q2",
    q: "2. 편향 보정이 직접 다루는 원인은 무엇입니까?",
    options: [
      ["a", "m과 v를 0으로 시작한 영향"],
      ["b", "데이터에 있는 모든 종류의 편향"],
      ["c", "학습 데이터가 부족한 문제 전체"],
    ],
    correct: "a",
    explain: "0으로 시작한 이동평균의 초기화 편향을 보정합니다. (p.2, §2 / p.3, §3)",
  },
  {
    id: "q3",
    q: "3. 여기서 확인한 정확한 배율 불변성의 조건은 무엇입니까?",
    options: [
      ["a", "좌표를 어떤 방향으로 회전해도 같습니다."],
      ["b", "현재 기울기만 임의로 바꿔도 같습니다."],
      ["c", "ε = 0이고, 각 좌표의 전체 이력에 고정된 양의 배율을 곱합니다."],
    ],
    correct: "c",
    explain: "ε = 0에서 고정된 양의 좌표별 배율은 분자와 분모에서 약분됩니다. (p.3, §2.1)",
  },
];

function Quiz() {
  const theme = useGrokTheme();
  const [picked, setPicked] = useState<Record<string, string>>({});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {QUIZ.map((item) => {
        const choice = picked[item.id];
        const ok = choice === item.correct;
        return (
          <fieldset key={item.id} style={{ border: 0, padding: "8px 0", margin: 0, minWidth: 0 }}>
            <legend style={{ ...theme.font.body1, color: theme.text.primary, fontWeight: 600, padding: 0, marginBottom: 4 }}>
              {item.q}
            </legend>
            {item.options.map(([value, label]) => (
              <label
                key={value}
                style={{
                  ...theme.font.body1,
                  color: theme.text.primary,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "6px 0",
                  minHeight: 40,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name={`adam-${item.id}`}
                  value={value}
                  checked={choice === value}
                  onChange={() => setPicked((p) => ({ ...p, [item.id]: value }))}
                  style={{ accentColor: theme.text.accent, width: 18, height: 18, flex: "none", marginTop: 3 }}
                />
                <span>{label}</span>
              </label>
            ))}
            <p
              aria-live="polite"
              style={{
                ...theme.font.subtext,
                margin: "4px 0 0",
                color: choice ? (ok ? theme.text.success : theme.text.danger) : theme.text.secondary,
              }}
            >
              {choice ? `${ok ? "정답입니다." : "오답입니다."} ${item.explain}` : "아직 답을 고르지 않았습니다."}
            </p>
          </fieldset>
        );
      })}
    </div>
  );
}

export default function App() {
  return (
    <Page
      title="Adam 쉽게 보기 (Kingma·Ba, 2014)"
      summary="Adam은 기울기의 최근 평균(방향)을 그 파라미터의 평소 크기로 나눠서, 파라미터마다 걸음 크기를 따로 정합니다. 평소 크기는 기울기 제곱의 최근 평균에 제곱근을 씌운 값입니다. 그래서 한 걸음이 대략 α 이하로 묶입니다. 골짜기 경로 실험으로 전체 모습을 보고, 세 실험(편향 보정, 기울기 배율, 드문 기울기)으로 그 안의 계산을 하나씩 확인합니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "직접 움직여 보기", id: "lab" },
          { label: "Adam 안을 들여다보기", id: "inside" },
          { label: "기존 방법과 비교", id: "compare" },
          { label: "논문 근거 위치", id: "evidence" },
          { label: "주의: 실험이 보여 주는 것", id: "caution" },
          { label: "확인 질문과 답", id: "quiz" },
          { label: "출처", id: "source" },
        ]}
      />

      <Section heading="한 장면 비유" id="analogy">
        <Text>
          안개 낀 산에서 발밑 기울기만 보고 골짜기로 내려간다고 상상해 보십시오. Adam은 방향마다 "최근에 어느 쪽으로
          기울었나"와 "평소 얼마나 가팔랐나"를 따로 기억합니다. 그래서 늘 가파른 방향에서는 조심스럽게, 늘 완만한
          방향에서는 과감하게 걸어서, 어느 방향이든 보폭이 비슷해집니다.
        </Text>
        <Callout lead="비유의 한계" tone="warning">
          사람은 산 전체 모양을 짐작합니다. Adam은 각 방향을 따로따로만 봅니다. 저자는 Adam의 크기 기억이 "대각선 성분만
          담은 근사"라고 설명합니다 (p.5, §5). 그래서 방향 사이의 관계는 모릅니다.
        </Callout>
        <Table
          columns={["용어", "뜻"]}
          rows={[
            ["파라미터(parameter)", "모델이 조정하는 숫자 하나"],
            ["기울기(gradient)", "발밑이 어느 쪽으로 얼마나 기울었는지 알려 주는 값"],
            ["학습률(learning rate, α)", "한 걸음의 기본 크기"],
            ["잡음(noise)", "데이터 일부(미니배치)만 보고 기울기를 구해서 생기는 흔들림"],
            ["편향 보정(bias correction)", "0에서 시작한 기억이 처음에 작게 나오는 것을 바로잡는 일"],
            ["이동평균(moving average)", "최근 값에 더 큰 비중을 주는 평균"],
            ["m (방향 기억)", "기울기의 이동평균. 어느 쪽으로 기울었는지 담습니다"],
            ["v (크기 기억)", "기울기 제곱의 이동평균. 2차 미분이 아닙니다"],
          ]}
        />
        <Text>
          논문의 기본값은 학습률 α 0.001, β1 0.9, β2 0.999, ε 10^-8입니다 (p.2, 알고리즘 1 캡션). α는 한 걸음의 기본
          크기입니다. β1은 방향 기억(m)에, β2는 크기 기억(v)에 과거 기울기가 얼마나 오래 남는지 정합니다.
          ε는 0으로 나누지 않도록 분모에 더하는 아주 작은 수입니다.
        </Text>
      </Section>

      <Section heading="직접 움직여 보기" id="lab" caption="지형과 모든 수치는 예시입니다 (논문 밖)">
        <Text>
          아래 지형은 설명용으로 만든 예시입니다 (논문 밖). 세로 방향은 가파르고 가로 방향은 완만한 길쭉한
          골짜기입니다. α 범위도 이 지형에 맞춘 예시라서 논문 기본값 0.001과 다릅니다.
        </Text>
        <Text>
          먼저 α 슬라이더를 오른쪽 끝까지 미십시오. 그다음 잡음 슬라이더를 올리십시오. 마지막으로 "편향 보정 끄기"를
          누르고 아래 막대를 보십시오.
        </Text>
        <AdamLab />
        <Text>
          α를 키우면 SGD는 가파른 세로 방향에서 너무 크게 걸어 튕겨 나갑니다. Adam은 한 걸음이 대략 α 이하로 묶입니다.
          저자는 이것을 "신뢰 영역(trust region)"이라고 부릅니다 (p.3, §2.1).
        </Text>
        <Text>
          편향 보정을 끄면 첫 걸음이 약 3.16α가 됩니다. 기본값 β1 0.9, β2 0.999에서 기억이 0에서 시작하기 때문입니다.
        </Text>
        <Text>
          Adam은 0에서 시작한 기억을 (1 - β^t)로 나눠 바로잡습니다 (p.2 §2, p.3 §3). 보정을 켜면 첫 걸음은 정확히 α입니다.
        </Text>
      </Section>

      <Section heading="Adam 안을 들여다보기" id="inside" caption="정해 둔 기울기 열로 계산한 예시 값입니다 (논문 기본값 α, β2, ε 사용)">
        <Text>
          Adam은 기울기의 방향을 모으고(m), 기울기의 평소 크기(√v)로 나누어 이동합니다. 아래 세 실험은 정해 둔 기울기
          열을 그대로 계산합니다. 실제 모델의 학습 성능을 측정하지 않습니다. 골짜기 실험과 달리 α는 논문 기본값
          0.001입니다. 슬라이더로 바꾼 설정은 예시 값입니다.
        </Text>
        <Section heading="처음의 0은 평균을 끌어내립니다" id="inside-bias">
          <Text>
            골짜기 실험에서 편향 보정을 끄면 첫 걸음이 약 3.16α였습니다. 그 이유를 여기서 봅니다. 같은 기울기가 계속
            들어와도 0에서 시작한 평균 m은 처음에 작습니다. 편향 보정은 0에서 시작한 영향을 지웁니다 (p.2, 알고리즘
            1·§2 / p.3, §3).
          </Text>
          <Text>"한 걸음"을 몇 번 누르고, 편향 보정을 껐다 켜며 실선과 점선의 차이를 보십시오.</Text>
          <BiasLab />
        </Section>
        <Section heading="기울기를 키워도 이동량은 비슷합니다" id="inside-scale">
          <Text>
            예시 기울기는 매번 (x = 2, y = 0.2)입니다. 1번째부터 5번째 걸음까지 x에만 같은 배율 c를 곱합니다. y의
            배율은 1입니다. SGD와 Adam의 실제 한 걸음이 어떻게 달라지는지 봅니다 (p.1, 초록 / p.3, §2.1).
          </Text>
          <ScaleLab />
          <Text>
            SGD의 x 이동량은 c배로 커집니다. Adam의 x 이동량은 거의 그대로입니다. "확인 질문과 답" 절의 첫 질문이 이
            성질을 묻습니다.
          </Text>
        </Section>
        <Section heading="보정계수와 실제 이동량은 다릅니다" id="inside-coord">
          <Text>
            자주 큰 기울기를 받는 A와 드물게 기울기를 받는 B를 비교합니다. A의 기울기는 매번 4입니다. B의 기울기는
            지정한 간격마다 1이고, 나머지 때에는 0입니다. 두 값은 설명용 예시입니다 (p.2, 알고리즘 1 / p.3, §2.1).
          </Text>
          <Text>
            보정계수 η(파라미터별로 α를 나눠 주는 비율)가 커도, 실제 이동량은 작을 수 있습니다. "보정계수 보기"와
            "실제 이동량 보기"를 번갈아 눌러 보십시오.
          </Text>
          <CoordLab />
        </Section>
      </Section>

      <Section heading="기존 방법과 비교" id="compare">
        <Text>
          네 방법은 "과거 기울기를 무엇으로, 얼마나 오래 기억하는가"가 다릅니다. 칸 하나가 과거 한 걸음입니다.
        </Text>
        <MemoryFigure />
        <Table
          columns={["방법", "기억하는 것", "특징", "근거"]}
          rows={[
            ["SGD", "없음 (지금 기울기만)", "걸음이 기울기 크기에 비례 (논문 밖)", "논문 밖"],
            ["AdaGrad", "기울기 제곱 합 전체", "드문 기울기(sparse gradient)에 강함", "p.1, p.5 §5"],
            ["RMSProp", "기울기 제곱의 최근 평균", "변하는 문제(non-stationary)에 강함, 편향 보정 없음", "p.1, p.5 §5"],
            ["Adam", "평균 + 제곱 평균 + 보정", "두 방법의 장점을 합치려고 설계", "p.1, p.2 알고리즘 1"],
          ]}
        />
        <Text>
          AdaGrad는 제곱을 계속 더하므로 걸음이 점점 작아집니다 (논문 밖 설명). 여기서 SGD는 모멘텀(momentum) 없는
          기본형입니다.
        </Text>
        <Text>
          AdaGrad가 강한 "드문 기울기"를 Adam이 어떻게 다루는지는 앞 절의 "보정계수와 실제 이동량은 다릅니다" 실험에서
          파라미터 B로 볼 수 있습니다. B는 기울기가 드물게 와서 √v̂가 작고 보정계수 η가 큽니다. 그래도 실제 이동량은
          방향 평균 m̂이 함께 정합니다.
        </Text>
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["파라미터마다 걸음 크기를 따로 정함", "p.1"],
            ["AdaGrad와 RMSProp의 장점을 합침", "p.1"],
            ["기본값 α 0.001, β1 0.9, β2 0.999, ε 10^-8", "p.2, 알고리즘 1 캡션"],
            ["m은 기울기의 이동평균, v는 기울기 제곱의 이동평균 (2차 미분 아님)", "p.2, 알고리즘 1"],
            ["한 걸음이 대략 α 이하, 신뢰 영역", "p.3, §2.1"],
            ["기울기 크기를 몇 배로 바꿔도 걸음 크기는 그대로 (ε = 0 가정에서 약분)", "p.1 초록, p.3 §2.1"],
            ["0에서 시작한 기억을 (1 - β^t)로 나눠 보정", "p.2 §2, p.3 §3"],
            ["크기 기억은 대각선 성분만 담은 근사", "p.5, §5"],
            ["보정 없이 β2가 1에 가까우면 학습 초반 불안정", "p.8, 그림 4 (VAE)"],
          ]}
        />
        <Callout lead="핵심 원문 문장 (p.1)">
          "The method computes individual adaptive learning rates for different parameters from estimates of first and
          second moments of the gradients"
        </Callout>
        <Callout lead="핵심 원문 문장 (p.1)">
          "Our method is designed to combine the advantages of two recently popular methods: AdaGrad ..., which works
          well with sparse gradients, and RMSProp ..., which works well in on-line and non-stationary settings"
        </Callout>
      </Section>

      <Section heading="주의: 실험이 보여 주는 것" id="caution">
        <Text>
          논문의 편향 보정 실험은 VAE(변분 오토인코더)에서 했습니다. 보정이 없고 β2가 1에 가까우면 학습 초반이 불안정했습니다
          (p.8, 그림 4).
        </Text>
        <Callout lead="원문 (p.8)">
          "values β2 close to 1 indeed lead to instabilities in training when no bias correction term was present,
          especially at first few epochs of the training."
        </Callout>
        <Callout lead="이 논문만으로 말할 수 없는 것" tone="warning">
          논문의 실험 그림(그림 1~3)은 모두 학습 손실(training cost)만 비교합니다. 테스트 정확도 비교는 없습니다. CNN에서
          SGD 대비 개선은 저자도 "marginal"(작음)이라고 썼습니다 (p.7).
        </Callout>
        <Callout lead="이 글의 실험이 말하지 않는 것" tone="warning">
          골짜기 경로와 세 실험의 그림·표는 모두 예시 값으로 계산한 결과입니다. Adam이 언제나 더 빠르거나 더
          정확하다는 비교가 아닙니다. 편향 보정은 0에서 시작한 영향만 지우고, 데이터의 다른 편향까지 없애지는
          않습니다. 배율 불변성은 ε = 0이고 좌표마다 고정된 양의 배율을 곱할 때 정확히 성립합니다. ε {">"} 0이면
          거의 같을 뿐이고, 좌표를 회전하거나 매 걸음 다른 배율을 쓰는 경우는 보장하지 않습니다.
        </Callout>
        <Text>
          "학습 손실을 빠르고 안정적으로 줄인다"는 이 논문이 보여 준 것입니다. "모델이 새 데이터에서
          더 잘 맞힌다"는 이 논문이 확인한 것이 아닙니다.
        </Text>
      </Section>

      <Section heading="확인 질문과 답" id="quiz">
        <Callout lead="질문" tone="info">
          어떤 파라미터는 기울기가 늘 크고, 다른 파라미터는 늘 작습니다. SGD와 Adam에서 두 파라미터의 걸음 크기는 각각
          어떻게 됩니까? 그 이유는 무엇입니까? 먼저 말로 답해 본 뒤 아래를 읽으십시오.
        </Callout>
        <Text>
          SGD: 걸음 크기가 기울기 크기에 비례합니다. 기울기가 큰 파라미터는 크게, 작은 파라미터는 아주 작게 걷습니다
          (논문 밖, SGD의 기본 성질).
        </Text>
        <Text>
          Adam: 두 파라미터 모두 대략 α 크기로 걷습니다. Adam은 기울기의 최근 평균을 그 파라미터의 평소 크기로 나눕니다.
          기울기가 늘 크면 나누는 값도 큽니다. 그래서 크기 차이가 서로 지워집니다.
        </Text>
        <Callout lead="답의 근거" tone="success">
          기울기를 몇 배로 바꿔도 평균과 평소 크기가 같은 비율로 바뀌어 지워지므로, 걸음 크기는 기울기 크기에 영향을 받지
          않습니다 (p.3, §2.1). 이 성질은 파라미터마다 따로 성립합니다 (p.1, 초록 "invariant to diagonal rescaling of the
          gradients"). 그리고 한 걸음은 대략 α 이하로 묶입니다 (p.3, §2.1). "기울기를 키워도 이동량은 비슷합니다"
          실험에서 c를 바꿔 보면 숫자로 확인할 수 있습니다.
        </Callout>
        <Text>세 문제를 더 풀어 보십시오. 답을 고르면 정답 여부와 근거가 바로 나옵니다.</Text>
        <Quiz />
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Diederik P. Kingma, Jimmy Lei Ba. "Adam: A Method for Stochastic Optimization". 2014 (ICLR 2015).
          https://arxiv.org/abs/1412.6980 (arXiv v9, 2017-01-30)
        </Text>
        <Text>
          쪽·절 표기는 arXiv v9 PDF 기준입니다. "Adam 안을 들여다보기"의 세 실험과 마지막 세 문제는 같은 PDF를 근거로
          만든 복습 실험실을 이 글에 합친 것입니다.
        </Text>
      </Section>
    </Page>
  );
}
