import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Table,
  Properties,
  useGrokTheme,
  useState,
} from "@/components/canvas";
import type { ReactNode } from "@/components/canvas";
import { Tex } from "@/components/Tex";

// 분포 곡선과 판별값은 모두 예시 값이다(논문 밖). 진짜 분포는 평균 0, 표준편차 1인 정규분포로 고정한다.
// 계산식은 첨부 실험실(GAN.html)의 normal, optimal, 알고리즘 추적 로직을 그대로 옮겼다.
const normal = (x: number, m: number, s: number) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
const fmt = (n: number) => (Math.abs(n) > 0 && Math.abs(n) < 0.0001 ? n.toExponential(3) : n.toFixed(4));

const INIT_MEAN = 1.5;
const INIT_SIGMA = 0.8;

const W = 520;
const H = 256;
const LEFT = 56;
const RIGHT = W - 16;
const TOP = 31;
const BOTTOM = 208;
const XS = Array.from({ length: 351 }, (_, i) => -7 + (14 * i) / 350);
const X = (x: number) => LEFT + ((x + 7) / 14) * (RIGHT - LEFT);

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

function Btn({
  children,
  onClick,
  primary,
  disabled,
  pressed,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  pressed?: boolean;
}) {
  const theme = useGrokTheme();
  const on = primary || pressed;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      style={{
        font: "inherit",
        ...theme.font.subtext,
        minHeight: 40,
        padding: "8px 14px",
        borderRadius: theme.radius.md,
        border: `1px solid ${on ? theme.fill.primary : theme.border.default}`,
        background: on ? theme.fill.primary : theme.bg.base,
        color: on ? theme.text.onPrimary : theme.text.primary,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        textAlign: "left",
      }}
    >
      {children}
    </button>
  );
}

function Check({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const theme = useGrokTheme();
  return (
    <label htmlFor={id} style={{ ...theme.font.subtext, color: theme.text.primary, display: "inline-flex", alignItems: "center", gap: 8, minHeight: 40 }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        style={{ width: 17, height: 17, margin: 0, accentColor: theme.text.accent }}
      />
      {label}
    </label>
  );
}

const row = { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" } as const;
const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 } as const;

// 두 그림이 함께 쓰는 축과 곡선. kind에 따라 세로축 눈금이 다르다.
function Chart({
  title,
  desc,
  ymax,
  yname,
  kind,
  children,
}: {
  title: string;
  desc: string;
  ymax: number;
  yname: string;
  kind: "density" | "optimal";
  children: (Y: (y: number) => number, path: (f: (x: number) => number) => string) => ReactNode;
}) {
  const theme = useGrokTheme();
  const Y = (y: number) => BOTTOM - (y / ymax) * (BOTTOM - TOP);
  const path = (f: (x: number) => number) =>
    XS.map((x, i) => (i ? "L" : "M") + X(x).toFixed(2) + "," + Y(f(x)).toFixed(2)).join(" ");
  const yticks = kind === "density" ? [0, ymax / 3, (ymax * 2) / 3, ymax] : [0, 0.5, 1];
  const label = { ...theme.font.caption, fill: theme.text.secondary };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ display: "block", width: "100%", height: "auto" }}>
      <title>{title}</title>
      <desc>{desc}</desc>
      <rect x={LEFT} y={TOP} width={RIGHT - LEFT} height={BOTTOM - TOP} fill="none" stroke={theme.border.default} />
      {yticks.map((v) => (
        <g key={v}>
          <line x1={LEFT} x2={RIGHT} y1={Y(v)} y2={Y(v)} stroke={theme.border.weak} strokeWidth={0.7} />
          <text x={LEFT - 8} y={Y(v) + 4} textAnchor="end" style={label}>
            {kind === "density" ? v.toFixed(2) : v === 0.5 ? "1/2" : String(v)}
          </text>
        </g>
      ))}
      {[-6, -4, -2, 0, 2, 4, 6].map((v) => (
        <text key={v} x={X(v)} y={BOTTOM + 20} textAnchor="middle" style={label}>
          {v}
        </text>
      ))}
      <text x={LEFT} y={18} style={label}>
        {yname}
      </text>
      <text x={(LEFT + RIGHT) / 2} y={H - 5} textAnchor="middle" style={label}>
        위치 x (예시 값)
      </text>
      {children(Y, path)}
    </svg>
  );
}

function DistributionLab({
  mean,
  sigma,
  setMean,
  setSigma,
  showData,
  setShowData,
}: {
  mean: number;
  sigma: number;
  setMean: (v: number) => void;
  setSigma: (v: number) => void;
  showData: boolean;
  setShowData: (v: boolean) => void;
}) {
  const theme = useGrokTheme();
  const gen = theme.dataviz.categorical[0];
  const data = theme.dataviz.categorical[1];
  const ymax = Math.max(normal(0, 0, 1), normal(mean, mean, sigma)) * 1.16;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={grid2}>
        <Slider id="gan-mean" label="생성자 평균 (위치)" value={mean} min={-3} max={3} step={0.05} show={mean.toFixed(2)} onChange={setMean} />
        <Slider id="gan-sigma" label="생성자 표준편차 (폭)" value={sigma} min={0.45} max={2} step={0.05} show={sigma.toFixed(2)} onChange={setSigma} />
      </div>
      <div style={row}>
        <Btn primary onClick={() => { setMean(0); setSigma(1); }}>
          두 분포 같게 하기
        </Btn>
        <Btn onClick={() => { setMean(INIT_MEAN); setSigma(INIT_SIGMA); }}>초기 분포</Btn>
        <Check id="gan-show-data" label="진짜 분포 표시" checked={showData} onChange={setShowData} />
      </div>
      <figure style={{ margin: 0 }}>
        <Chart
          title="예시 진짜 분포와 생성자 분포"
          desc="점선은 진짜 데이터 분포, 실선은 생성자 분포의 확률밀도입니다."
          ymax={ymax}
          yname="확률밀도 (예시 값)"
          kind="density"
        >
          {(_, path) => (
            <>
              {showData ? (
                <path d={path((x) => normal(x, 0, 1))} fill="none" stroke={data} strokeWidth={2.5} strokeDasharray="5 4" />
              ) : null}
              <path d={path((x) => normal(x, mean, sigma))} fill="none" stroke={gen} strokeWidth={2.5} strokeLinejoin="round" />
            </>
          )}
        </Chart>
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
          {showData ? "점선 = 진짜 분포, " : ""}실선 = 생성자 분포. 예시 값: 진짜는 평균 0.00, 표준편차 1.00 / 생성자는 평균{" "}
          {mean.toFixed(2)}, 표준편차 {sigma.toFixed(2)}.
        </figcaption>
      </figure>
    </div>
  );
}

function OptimalLab({
  mean,
  sigma,
  x,
  setX,
  match,
}: {
  mean: number;
  sigma: number;
  x: number;
  setX: (v: number) => void;
  match: () => void;
}) {
  const theme = useGrokTheme();
  const [half, setHalf] = useState(true);
  const optimal = (t: number) => {
    const p = normal(t, 0, 1);
    const q = normal(t, mean, sigma);
    return p / (p + q);
  };
  const p = normal(x, 0, 1);
  const q = normal(x, mean, sigma);
  const d = p / (p + q);
  const same = Math.abs(mean) < 1e-12 && Math.abs(sigma - 1) < 1e-12;
  const line = theme.dataviz.categorical[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Slider id="gan-x" label="살펴볼 위치 x" value={x} min={-4} max={4} step={0.05} show={x.toFixed(2)} onChange={setX} />
      <div style={row}>
        <Btn onClick={match}>두 분포 같게 하기</Btn>
        <Check id="gan-half" label="1/2 기준선 표시" checked={half} onChange={setHalf} />
      </div>
      <figure style={{ margin: 0 }}>
        <Chart
          title="예시 분포로 계산한 최적 판별자"
          desc={`위치 ${x.toFixed(2)}에서 최적 판별값 ${d.toFixed(4)}. 위의 예시 분포로 계산했습니다.`}
          ymax={1}
          yname="최적 판별값 D*(x)"
          kind="optimal"
        >
          {(Y, path) => (
            <>
              {half ? (
                <line x1={LEFT} x2={RIGHT} y1={Y(0.5)} y2={Y(0.5)} stroke={theme.text.tertiary} strokeWidth={1.5} strokeDasharray="5 4" />
              ) : null}
              <path d={path(optimal)} fill="none" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
              <line x1={X(x)} x2={X(x)} y1={TOP} y2={BOTTOM} stroke={theme.text.tertiary} strokeWidth={1} />
              <circle cx={X(x)} cy={Y(d)} r={5} fill={line} />
            </>
          )}
        </Chart>
      </figure>
      <Properties
        items={[
          { label: "진짜 밀도 (예시)", value: fmt(p) },
          { label: "생성자 밀도 (예시)", value: fmt(q) },
          { label: "최적 판별값 (예시)", value: (same ? "1/2 = " : "") + d.toFixed(4) },
        ]}
      />
      <Callout lead="지금 보고 있는 것" tone="info">
        {same
          ? "두 분포가 같습니다. 두 밀도가 양수인 모든 위치에서 최적 판별값은 1/2입니다."
          : `선택 위치에서 진짜 밀도 ÷ 두 밀도의 합 = ${d.toFixed(4)}입니다.`}
      </Callout>
    </div>
  );
}

function AlgorithmLab() {
  const theme = useGrokTheme();
  const [k, setK] = useState(1);
  const [steps, setSteps] = useState(0);
  const cycle = k + 1;
  const full = Math.floor(steps / cycle);
  const rem = steps % cycle;
  const dCount = full * k + Math.min(rem, k);
  const gCount = full;
  const last = steps === 0 ? -1 : (steps - 1) % cycle;
  const kind: "ready" | "D" | "G" = last < 0 ? "ready" : last < k ? "D" : "G";

  const stage =
    kind === "ready"
      ? "시작 전입니다. 다음 단계에서 판별자 D를 먼저 갱신합니다."
      : `${steps}번째 갱신 단계: ${kind === "D" ? "판별자 D" : "생성자 G"}의 파라미터를 바꾸는 차례입니다.`;
  const reason =
    kind === "ready"
      ? "D는 진짜와 가짜를 구별하도록 배웁니다. G는 D의 판단을 통해 배웁니다."
      : kind === "D"
        ? "D의 목적: 진짜는 진짜로, 가짜는 가짜로 구별합니다. G의 출력은 사용하지만 G의 파라미터는 바꾸지 않습니다."
        : "G의 목적: D가 가짜를 진짜라고 판단하게 합니다. D의 파라미터는 고정하지만 D를 통과한 미분 신호를 G에 전달합니다.";
  const realInput =
    kind === "G"
      ? "새 난수로 만든 가짜를 D에 넣습니다. 이 단계는 진짜 데이터의 복원 오차를 구하지 않습니다."
      : "진짜 데이터 x와 가짜 G(z)를 모두 판별자 D에 넣습니다.";
  const gState = kind === "G" ? "파라미터 갱신" : kind === "D" ? "파라미터 고정" : "갱신 전";
  const dState = kind === "D" ? "파라미터 갱신" : kind === "G" ? "고정, 미분에 사용" : "갱신 전";

  const node = (name: string, sub: string, active: boolean) => (
    <div
      style={{
        padding: "10px 4px",
        textAlign: "center",
        minWidth: 0,
        borderRadius: theme.radius.md,
        border: `1px solid ${active ? theme.text.accent : theme.border.default}`,
        background: active ? theme.fill.accentSubtle : theme.bg.base,
        color: theme.text.primary,
        ...theme.font.subtext,
      }}
    >
      <div style={{ fontWeight: 600 }}>{name}</div>
      <div style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>{sub}</div>
    </div>
  );
  const arrow = <span aria-hidden="true" style={{ color: theme.text.secondary }}>→</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Slider
        id="gan-k"
        label="판별자 갱신 횟수 k"
        value={k}
        min={1}
        max={5}
        step={1}
        show={String(k)}
        onChange={(v) => {
          setK(v);
          setSteps(0);
        }}
      />
      <Text>
        {k === 1
          ? "논문 값: k = 1. 나머지 선택값은 순서 이해를 위한 예시 값입니다."
          : `예시 값: k = ${k}. 논문의 실제 실험은 k = 1입니다. k를 바꾸면 추적을 처음부터 시작합니다.`}
      </Text>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }} aria-label="한 주기의 갱신 순서">
        {Array.from({ length: cycle }, (_, i) => (
          <span
            key={i}
            aria-current={i === last ? "step" : undefined}
            style={{
              padding: "6px 10px",
              borderRadius: theme.radius.sm,
              background: i === last ? theme.fill.primary : theme.fill.secondary,
              color: i === last ? theme.text.onPrimary : theme.text.secondary,
              ...theme.font.subtext,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {i < k ? `D ${i + 1}` : "G 1"}
          </span>
        ))}
      </div>
      <div style={row}>
        <Btn disabled={steps === 0} onClick={() => setSteps(Math.max(0, steps - 1))}>
          이전 단계
        </Btn>
        <Btn primary onClick={() => setSteps(steps + 1)}>
          {rem < k ? `다음: 판별자 갱신 (${rem + 1}/${k})` : "다음: 생성자 갱신"}
        </Btn>
        <Btn onClick={() => setSteps(0)}>처음으로</Btn>
      </div>
      <Callout lead="지금 단계" tone="info">
        {stage}
      </Callout>
      <div
        role="group"
        aria-label="생성 결과가 판별자를 거쳐 평가되는 흐름"
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 6, alignItems: "center" }}
      >
        {node("난수 z", "입력", false)}
        {arrow}
        {node("생성자 G", gState, kind === "G")}
        {arrow}
        {node("판별자 D", dState, kind === "D")}
      </div>
      <Text>{realInput}</Text>
      {kind === "G" ? (
        <div
          aria-label="판별자의 미분 신호가 생성자로 돌아갑니다"
          style={{ ...theme.font.subtext, color: theme.text.primary, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}
        >
          <span>생성자 G</span>
          <span aria-hidden="true">←</span>
          <span>판별자를 통한 미분 신호</span>
        </div>
      ) : null}
      <Text>{reason}</Text>
      <Properties
        items={[
          { label: "살펴본 갱신", value: `${steps}회` },
          { label: "판별자", value: `${dCount}회` },
          { label: "생성자", value: `${gCount}회` },
        ]}
      />
    </div>
  );
}

const QUESTIONS = [
  {
    q: "1. 두 분포가 같고 판별자가 최적일 때, 밀도가 양수인 곳의 판별값은?",
    options: ["1: 언제나 진짜라고 판단합니다.", "1/2: 어느 분포에서 왔는지 구별할 수 없습니다.", "0: 언제나 가짜라고 판단합니다."],
    answer: 1,
    why: "같은 두 밀도를 식 (2)에 넣으면 p / (p + p) = 1/2입니다. (p.4, §4.1; p.5, 정리 1)",
  },
  {
    q: "2. 생성자 G를 갱신하는 단계에서 무엇이 바뀝니까?",
    options: ["G와 D의 파라미터가 모두 바뀝니다.", "D를 쓰지 않고 G만 바꿉니다.", "D를 통한 미분 신호로 G의 파라미터만 바꿉니다."],
    answer: 2,
    why: "G를 갱신할 때도 D의 판단을 사용하지만, 갱신 대상은 G의 파라미터입니다. (p.4, 알고리즘 1)",
  },
  {
    q: "3. 논문의 수렴 설명을 정확히 읽은 것은?",
    options: [
      "충분한 용량과 최적 판별자 등의 조건이 필요합니다.",
      "어떤 실제 신경망이든 반드시 같은 분포에 도달합니다.",
      "k = 1이면 다른 조건 없이 수렴합니다.",
    ],
    answer: 0,
    why: "명제 2는 조건이 있는 결과이며, 실제 신경망의 학습에는 같은 보장을 주지 않습니다. (p.5, §4.2)",
  },
];

function Quiz() {
  const theme = useGrokTheme();
  const [answers, setAnswers] = useState<(number | null)[]>(QUESTIONS.map(() => null));
  const done = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === QUESTIONS[i].answer).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {QUESTIONS.map((item, i) => {
        const a = answers[i];
        return (
          <fieldset key={i} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <legend style={{ ...theme.font.body1, fontWeight: 600, color: theme.text.primary, padding: 0, marginBottom: 8 }}>{item.q}</legend>
            <div style={{ display: "grid", gap: 8 }}>
              {item.options.map((label, j) => (
                <Btn
                  key={j}
                  pressed={a === j}
                  onClick={() => setAnswers(answers.map((x, n) => (n === i ? j : x)))}
                >
                  {label}
                </Btn>
              ))}
            </div>
            {a !== null ? (
              <div style={{ marginTop: 8 }} aria-live="polite">
                <Callout lead={a === item.answer ? "정답입니다" : "다시 생각해 보세요"} tone={a === item.answer ? "success" : "warning"}>
                  {item.why}
                </Callout>
              </div>
            ) : null}
          </fieldset>
        );
      })}
      <Text>
        응답 {done} / {QUESTIONS.length}
        {done > 0 ? `, 현재 정답 ${correct} / ${QUESTIONS.length}` : ""}
      </Text>
    </div>
  );
}

export default function App() {
  const [mean, setMean] = useState(INIT_MEAN);
  const [sigma, setSigma] = useState(INIT_SIGMA);
  const [showData, setShowData] = useState(true);
  const [x, setX] = useState(0);

  return (
    <Page
      title="GAN 쉽게 보기 (Goodfellow 외, 2014)"
      summary="GAN은 가짜를 만드는 생성자와 진짜·가짜를 가리는 판별자를 함께 학습시킵니다. 생성자의 분포가 진짜 분포와 같아지면, 가장 잘 가리는 판별자도 어디서나 1/2(반반)이라고 답할 수밖에 없습니다. 실제 학습은 판별자 k번, 생성자 1번을 번갈아 하며, 논문 실험은 k = 1입니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "핵심 아이디어: 두 모델의 게임", id: "idea" },
          { label: "생성자가 만드는 분포", id: "distribution" },
          { label: "최적 판별자는 어떻게 답할까", id: "optimal" },
          { label: "학습 순서: 판별자 k번, 생성자 1번", id: "algorithm" },
          { label: "VAE와 무엇이 다른가", id: "vae" },
          { label: "논문 근거 위치", id: "evidence" },
          { label: "주의: 이 논문이 보여 준 것", id: "caution" },
          { label: "확인 퀴즈 세 문제", id: "quiz" },
          { label: "출처", id: "source" },
        ]}
      />

      <Section heading="한 장면 비유" id="analogy">
        <Text>
          생성자는 위조지폐를 만들어 들키지 않고 쓰려는 위조범 팀입니다. 판별자는 위조지폐를 찾아내려는 경찰입니다. 둘이
          겨루면서 서로 실력이 늘고, 끝내 위조지폐가 진짜와 구별되지 않게 됩니다. 이 비유는 논문이 직접 듭니다 (p.1, §1).
        </Text>
        <Callout lead="원문 (p.1)">
          "The generative model can be thought of as analogous to a team of counterfeiters, trying to produce fake
          currency and use it without detection, while the discriminative model is analogous to the police"
        </Callout>
        <Callout lead="비유의 한계" tone="warning">
          위조범은 지폐 한 장을 흉내 냅니다. GAN의 생성자는 데이터 전체의 분포(어떤 값이 얼마나 자주 나오는지)를 흉내
          냅니다. 그래서 아래 실험실에서는 지폐 대신 분포 곡선을 움직입니다.
        </Callout>
        <Table
          columns={["용어", "뜻"]}
          rows={[
            ["생성자(generator, G)", "난수 z를 받아 가짜 데이터 G(z)를 만드는 신경망"],
            ["판별자(discriminator, D)", "입력이 진짜 데이터에서 왔을 확률을 0~1 사이 숫자 하나로 답하는 신경망"],
            ["분포(distribution)", "어떤 값이 얼마나 자주 나오는지를 나타낸 모양"],
            ["확률밀도(probability density)", "분포 곡선의 높이. 구간 아래의 넓이가 그 구간의 확률"],
            ["파라미터(parameter)", "모델 속에서 학습으로 바뀌는 조절값"],
            ["미분 신호(gradient)", "파라미터를 어느 쪽으로 바꿔야 목표에 가까워지는지 알려 주는 값"],
          ]}
        />
      </Section>

      <Section heading="핵심 아이디어: 두 모델의 게임" id="idea">
        <Text>
          D는 진짜에는 높은 값, 가짜에는 낮은 값을 주도록 배웁니다. G는 D가 자기 가짜를 진짜라고 착각하도록 배웁니다. 한쪽이
          점수를 올리면 다른 쪽 점수가 내려가는 게임입니다. 논문은 이것을 두 사람의 최소최대 게임(minimax game)이라고
          부릅니다 (p.3, 식 (1)).
        </Text>
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
          <Tex display>{String.raw`\begin{aligned}\min_G \max_D V(D, G) = \; & \mathbb{E}_{x\sim p_{data}}[\log D(x)] \\ & + \mathbb{E}_{z\sim p_z}[\log(1 - D(G(z)))]\end{aligned}`}</Tex>
        </div>
        <Text>
          읽는 법: 앞 항은 "진짜를 진짜라고 맞힌 정도", 뒤 항은 "가짜를 가짜라고 맞힌 정도"입니다. D는 두 항의 합을 키우고,
          G는 뒤 항을 줄입니다. 두 모델이 모두 다층 퍼셉트론(multilayer perceptron, 여러 층 신경망)이면 역전파(backpropagation,
          오차의 미분을 출력에서 입력 쪽으로 전해 구하는 방법) 하나로 전체를 학습할 수 있습니다. 마르코프 연쇄(Markov chain,
          표본을 한 걸음씩 바꿔 가며 뽑는 방법)는 학습에도 생성에도 필요 없습니다 (p.1, 초록).
        </Text>
        <Text>
          먼저 G가 만드는 분포를 움직입니다. 그다음 그 분포에서 최적 판별자(주어진 G에 대해 진짜와 가짜를 가장 잘 가리는 D)가
          어떻게 답하는지 봅니다. 첫 두 실험은 같은 분포를 씁니다. 마지막 실험은 실제 학습에서 G와 D를 어떤 순서로 바꾸는지 따라갑니다.
        </Text>
      </Section>

      <Section heading="생성자가 만드는 분포" id="distribution" caption="곡선과 수치는 모두 예시 값입니다 (논문 밖)">
        <Text>
          평균은 곡선의 위치를, 표준편차는 폭을 바꿉니다. 곡선은 p.3, §3, 그림 1을 종 모양 정규분포로 다시 그린 예시입니다.
        </Text>
        <DistributionLab
          mean={mean}
          sigma={sigma}
          setMean={setMean}
          setSigma={setSigma}
          showData={showData}
          setShowData={setShowData}
        />
        <Text>
          세로축은 확률밀도입니다. 구간 아래의 넓이가 그 구간의 확률입니다. 이 화면은 모양을 직접 바꾸는 예시이며, 신경망을
          훈련하지 않습니다. 논문 그림 1의 아래쪽 난수 변환 화살표(z가 G를 거쳐 x로 옮겨지는 모습)는 생략했습니다.
        </Text>
      </Section>

      <Section heading="최적 판별자는 어떻게 답할까" id="optimal" caption="위 절의 분포를 그대로 씁니다 (예시 값)">
        <Text>
          G를 고정하면 최적 판별자는 두 밀도의 비율로 답합니다 (p.4, §4.1, 명제 1, 식 (2)). 위 절에서 분포를 바꾸면 아래
          곡선도 함께 바뀝니다.
        </Text>
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
          <Tex display>{String.raw`D^*_G(x) = \frac{p_{data}(x)}{p_{data}(x) + p_g(x)}`}</Tex>
        </div>
        <Text>
          p_data는 진짜 밀도, p_g는 생성자 밀도, 별표(*)는 "주어진 생성자에 대한 최적값"이라는 뜻입니다. 최적 판별값은 진짜가 더
          자주 나오는 곳에서는 1에 가깝고, 가짜가 더 자주 나오는 곳에서는 0에 가깝습니다.
        </Text>
        <OptimalLab
          mean={mean}
          sigma={sigma}
          x={x}
          setX={setX}
          match={() => {
            setMean(0);
            setSigma(1);
          }}
        />
        <Text>
          논문 값: 두 분포가 같으면 최적 판별값은 1/2입니다 (p.5, 정리 1의 증명). 이때 게임의 값은 가장 낮은 -log 4가 되고,
          그 최소는 p_g = p_data일 때만 나옵니다 (p.5, 정리 1).
        </Text>
        <Callout lead="오해하기 쉬운 점" tone="warning">
          곡선과 표시값은 위의 예시 분포로 계산합니다. 실제로 학습 중인 판별자의 출력이 아닙니다. 한 지점에서만 1/2이라고 두 분포
          전체가 같지는 않습니다. 두 밀도가 모두 0인 곳에서는 이 비율을 정의하지 않습니다 (p.4, 명제 1의 증명).
        </Callout>
      </Section>

      <Section heading="학습 순서: 판별자 k번, 생성자 1번" id="algorithm" caption="절차 추적입니다. 신경망을 훈련하지 않습니다">
        <Text>
          D를 끝까지 최적화하는 것은 계산이 너무 비싸고, 데이터가 유한하면 과적합합니다. 그래서 D를 k번, G를 1번
          번갈아 갱신합니다. G가 천천히 변하면 D는 최적 근처에 머뭅니다 (p.3, §3; p.4, 알고리즘 1). 아래 화면에서는 단계마다
          누구의 파라미터를 바꾸는지 확인합니다.
        </Text>
        <AlgorithmLab />
        <Text>
          화면의 갱신 횟수는 누른 단계 수로 셉니다. 실제 손실, 정확도, 학습 속도는 계산하지 않습니다. 논문은 실험에서 가장 싼
          선택인 k = 1을 썼고, 갱신 규칙으로는 모멘텀(momentum, 직전 갱신 방향을 일부 이어 가는 방식)을 썼다고 밝힙니다 (p.4,
          알고리즘 1).
        </Text>
        <Callout lead="실제로 G가 배우는 식 (p.3, §3)">
          학습 초반에는 G가 서툴러서 D가 가짜를 쉽게 거부합니다. 그러면 log(1 - D(G(z)))가 포화해(saturate, 값이 거의 변하지
          않아) 미분 신호가 약합니다. 그래서 논문은 G가 log(1 - D(G(z)))를 줄이는 대신 log D(G(z))를 키우도록 학습할 수
          있다고 씁니다. 두 목표의 도달점은 같고, 바꾼 목표 쪽이 초반 미분 신호가 훨씬 강합니다.
        </Callout>
      </Section>

      <Section heading="VAE와 무엇이 다른가" id="vae">
        <Text>
          같은 생성 모델(generative model, 데이터를 새로 만들어 내는 모델)인 VAE는 <a href="/posts/vae-auto-encoding-variational-bayes/">VAE 쉽게 보기 글</a>에서 다뤘습니다. 두
          방법 모두 난수 z에서 데이터를 만듭니다. 차이는 "얼마나 진짜 같은지"를 무엇으로 재느냐입니다.
        </Text>
        <Table
          columns={["항목", "VAE", "GAN"]}
          rows={[
            ["학습 신호", "데이터를 복원하는 우도의 하한", "판별자의 판단을 거친 미분 신호"],
            ["추론 네트워크", "있음 (x에서 z를 추정하는 인코더)", "없음 (학습 중 추론이 필요 없음, p.7 §6)"],
            ["분포를 식으로 쓸 수 있나", "우도의 하한을 계산", "p_g(x)를 명시적으로 쓰지 않음 (p.7 §6)"],
            ["생성자가 데이터를 직접 보나", "복원 오차로 봄", "보지 않음, 판별자를 통한 미분만 받음 (p.7 §6)"],
          ]}
        />
        <Text>
          GAN의 생성자는 데이터 예시로 직접 갱신되지 않고, 판별자를 통한 미분으로만 갱신됩니다. GAN 논문 §6은 이 점이 통계적
          장점일 수 있다고 씁니다. 마르코프 연쇄 기반 방법보다 아주 날카로운 분포도 표현할 수 있다는 점도 장점으로 듭니다 (p.7,
          §6). 비교표의 VAE 쪽 설명은 GAN 논문이 아니라 VAE 글과 VAE 논문에 근거합니다.
        </Text>
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["위조범과 경찰 비유", "p.1, §1"],
            ["임의 함수 공간에서 G는 데이터 분포를 복원, D는 어디서나 1/2", "p.1, 초록"],
            ["최소최대 게임의 값 함수", "p.3, 식 (1)"],
            ["D를 k번, G를 1번 번갈아 최적화", "p.3, §3"],
            ["초반 포화를 피하려 log D(G(z))를 키움", "p.3, §3"],
            ["진짜(점선), 생성자(실선), D(파선)의 그림 설명", "p.3, 그림 1"],
            ["미니배치 학습 절차, 실험은 k = 1, 모멘텀 사용", "p.4, 알고리즘 1"],
            ["최적 판별자 D* = p_data / (p_data + p_g)", "p.4, §4.1, 명제 1, 식 (2)"],
            ["전역 최소는 p_g = p_data일 때만, 값은 -log 4", "p.5, 정리 1"],
            ["충분한 용량과 최적 D 등 조건 아래 p_g가 p_data로 수렴", "p.5, §4.2, 명제 2"],
            ["Parzen 창 로그우도 MNIST 225 ± 2, TFD 2057 ± 26", "p.6, 표 1"],
            ["단점: p_g(x)의 명시적 표현 없음, D와 G의 동기화 필요", "p.7, §6"],
          ]}
        />
        <Callout lead="핵심 원문 문장 (p.1, 초록)">
          "In the space of arbitrary functions G and D, a unique solution exists, with G recovering the training data
          distribution and D equal to 1/2 everywhere."
        </Callout>
      </Section>

      <Section heading="주의: 이 논문이 보여 준 것" id="caution">
        <Text>
          수렴 보장(명제 2)은 G와 D가 충분한 용량(capacity, 모델이 나타낼 수 있는 함수의 폭)을 갖고, 매 단계 D가 최적에
          도달하고, p_g 자체를 갱신한다는 조건 아래의 결과입니다. 실제로는 p_g가 아니라 신경망 파라미터를 최적화합니다. 그래서 여러
          임계점(critical point, 기울기가 0인 지점)이 생기고, 이론적 보장이 없다고 저자가 직접 씁니다 (p.5, §4.2).
        </Text>
        <Text>
          성능 숫자도 조심해서 읽어야 합니다. 표 1은 생성 표본에 Parzen 창(Gaussian Parzen window, 표본마다 작은 정규분포를
          씌워 밀도를 어림하는 방법)을 맞춰 구한 로그우도(log-likelihood, 데이터가 그 분포에서 나올 가능성의 로그값)입니다. 저자는 이 방법이 분산이 꽤 크고 고차원에서 잘 맞지 않는다고
          적습니다 (p.6, §5).
        </Text>
        <Table
          columns={["모델", "MNIST", "TFD"]}
          rows={[
            ["DBN", "138 ± 2", "1909 ± 66"],
            ["Stacked CAE", "121 ± 1.6", "2110 ± 50"],
            ["Deep GSN", "214 ± 1.1", "1890 ± 29"],
            ["Adversarial nets", "225 ± 2", "2057 ± 26"],
          ]}
        />
        <Callout lead="이 논문만으로 말할 수 없는 것" tone="warning">
          TFD(Toronto Face Database, 얼굴 사진 데이터)에서는 Stacked CAE(2110)가 GAN(2057)보다 높습니다. 저자도 생성 표본이 기존 방법보다 낫다고 주장하지 않고,
          "적어도 경쟁할 만하다"고만 씁니다 (p.6). 또 G를 D 갱신 없이 너무 많이 학습하면 많은 z가 같은 x로 몰리는
          "Helvetica 시나리오"가 생길 수 있다고 경고합니다 (p.7, §6). 이후 연구에서 모드 붕괴(mode collapse)라고 부르는
          현상입니다 (논문 밖 용어).
        </Callout>
      </Section>

      <Section heading="확인 퀴즈 세 문제" id="quiz">
        <Text>답을 고르면 정답 여부와 해설이 나옵니다. 근거는 위에서 본 정의와 조건입니다.</Text>
        <Quiz />
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Ian J. Goodfellow, Jean Pouget-Abadie, Mehdi Mirza, Bing Xu, David Warde-Farley, Sherjil Ozair, Aaron Courville,
          Yoshua Bengio. "Generative Adversarial Nets". 2014 (NIPS 2014). https://arxiv.org/abs/1406.2661 (arXiv v1, 2014-06-10).
          쪽수는 arXiv v1 PDF 인쇄 쪽 기준입니다.
        </Text>
      </Section>
    </Page>
  );
}
