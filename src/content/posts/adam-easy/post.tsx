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
        style={{ ...theme.font.subtext, color: theme.text.secondary, display: "flex", justifyContent: "space-between" }}
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
    now = "α가 커서 SGD는 가파른 세로 방향에서 튕겨 나갑니다. Adam은 걸음이 α 근처로 묶여서 버팁니다.";
  } else if (noise >= 5) {
    now = "잡음이 커서 두 경로 모두 흔들립니다. 그래도 Adam의 걸음 크기는 α 근처에 머뭅니다.";
  } else {
    now = "SGD는 가파른 방향에서 크게, 완만한 방향에서 작게 걷습니다. Adam은 두 방향 모두 비슷한 보폭으로 걷습니다.";
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

export default function App() {
  return (
    <Page
      title="Adam 쉽게 보기 (Kingma·Ba, 2014)"
      summary="Adam은 기울기의 최근 평균(방향)을 기울기 제곱의 최근 평균의 제곱근(평소 크기)으로 나눠서, 파라미터마다 걸음 크기를 따로 정합니다. 그래서 한 걸음이 대략 α 이하로 묶입니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "직접 움직여 보기", id: "lab" },
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
          ]}
        />
        <Text>
          논문의 기본값은 학습률 α 0.001, β1 0.9, β2 0.999, ε 10^-8입니다 (p.2, 알고리즘 1 캡션). β1은 방향 기억이
          과거를 얼마나 오래 붙잡는지, β2는 크기 기억이 과거를 얼마나 오래 붙잡는지 정합니다.
        </Text>
      </Section>

      <Section heading="직접 움직여 보기" id="lab" caption="지형과 모든 수치는 예시입니다 (논문 밖)">
        <Text>
          아래 지형은 설명용으로 만든 장난감입니다 (논문 밖). 세로 방향은 가파르고 가로 방향은 완만한 길쭉한
          골짜기입니다. α 범위도 이 장난감 지형에 맞춘 예시라서 논문 기본값 0.001과 다릅니다.
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
          편향 보정을 끄면 첫 걸음이 약 3.16α가 됩니다. 기본값 β1 0.9, β2 0.999에서 기억이 0에서 출발하기 때문입니다.
          보정을 켜면 첫 걸음은 정확히 α입니다. 그래서 Adam은 (1 - β^t)로 나눠 기억을 바로잡습니다 (p.2 §2, p.3 §3).
        </Text>
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
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["파라미터마다 걸음 크기를 따로 정함", "p.1"],
            ["AdaGrad와 RMSProp의 장점을 합침", "p.1"],
            ["기본값 α 0.001, β1 0.9, β2 0.999, ε 10^-8", "p.2, 알고리즘 1 캡션"],
            ["한 걸음이 대략 α 이하, 신뢰 영역", "p.3, §2.1"],
            ["기울기 크기를 몇 배로 바꿔도 걸음 크기는 그대로", "p.3, §2.1"],
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
          편향 보정 실험은 VAE(변분 오토인코더)에서 했습니다. 보정이 없고 β2가 1에 가까우면 학습 초반이 불안정했습니다
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
        <Text>
          정리하면 이렇습니다. "학습 손실을 빠르고 안정적으로 줄인다"는 이 논문이 보여 준 것입니다. "모델이 새 데이터에서
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
          gradients"). 그리고 한 걸음은 대략 α 이하로 묶입니다 (p.3, §2.1).
        </Callout>
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Diederik P. Kingma, Jimmy Lei Ba. "Adam: A Method for Stochastic Optimization". 2014 (ICLR 2015).
          https://arxiv.org/abs/1412.6980 (arXiv v9)
        </Text>
      </Section>
    </Page>
  );
}
