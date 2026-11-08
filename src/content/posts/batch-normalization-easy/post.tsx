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

// 화면 숫자는 모두 예시 값이다. 같은 결과가 나오도록 고정 시드로 표준정규 값 64개를 만든다.
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

const BATCHES: Record<BatchKey, number[]> = {
  a: makeBatch(7),
  b: makeBatch(8),
  c: makeBatch(9),
};

type BatchKey = "a" | "b" | "c";
type BnKey = "off" | "on";

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

function BnLab() {
  const theme = useGrokTheme();
  const [bn, setBn] = useState<BnKey>("off");
  const [batchKey, setBatchKey] = useState<BatchKey>("a");
  const [progress, setProgress] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [beta, setBeta] = useState(0);
  const [size, setSize] = useState(32);

  const sim = useMemo(() => {
    const p = progress / 100;
    const mu = 3 * p;
    const sd = 1 + 1.5 * p;
    const raw = BATCHES[batchKey].slice(0, size).map((z) => mu + sd * z);
    const mb = mean(raw);
    const sb = Math.sqrt(spread(raw) ** 2 + 1e-5);
    const on = bn === "on";
    const out = on ? raw.map((x) => (gamma * (x - mb)) / sb + beta) : raw;
    const popCenter = on ? (gamma * (mu - mb)) / sb + beta : mu;
    const popSd = on ? (gamma * sd) / sb : sd;
    return { raw, out, mb, sbRaw: spread(raw), mo: mean(out), so: spread(out), popCenter, popSd, mu, sd, on };
  }, [bn, batchKey, progress, gamma, beta, size]);

  let now: string;
  if (!sim.on) {
    now =
      gamma !== 1 || beta !== 0
        ? "BN이 꺼져 있어 γ, β는 아직 작동하지 않습니다. 앞 층 값이 그대로 다음 층에 들어갑니다."
        : "BN이 꺼져 있습니다. 앞 층 값이 밀리고 퍼진 그대로 다음 층에 들어갑니다.";
  } else if (size <= 8) {
    now = "배치가 작아서 배치 평균이 전체 평균을 잘못 짚습니다. 점선 분포가 0에서 벗어나 흔들립니다 (논문 밖 직관).";
  } else if (Math.abs(gamma - 1) > 0.05 || Math.abs(beta) > 0.05) {
    now = "BN이 모은 값을 γ만큼 늘이고 β만큼 옮깁니다. 다음 층에 필요한 모양으로 다시 맞추는 단계입니다.";
  } else {
    now = "BN이 앞 층 값을 배치 평균 0, 배치 퍼짐 1로 다시 모아서 다음 층에 넘깁니다.";
  }

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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Segmented options={BN_OPTIONS} value={bn} onChange={setBn} />
        <Segmented options={BATCH_OPTIONS} value={batchKey} onChange={setBatchKey} />
      </div>

      <figure style={{ margin: 0 }}>
        <svg
          viewBox="0 0 680 300"
          role="img"
          aria-labelledby="bn-lab-title bn-lab-desc"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <title id="bn-lab-title">앞 층 값과 다음 층 입력 값의 분포 (예시)</title>
          <desc id="bn-lab-desc">
            위 칸은 앞 층이 내보낸 값입니다. 아래 칸은 다음 층에 들어가는 값입니다. 점 하나가 예제 하나입니다.
          </desc>
          <text x={40} y={22} style={panelLabel}>
            앞 층 출력 (BN 전)
          </text>
          {axis(120)}
          <path
            d={curvePath(sim.mu, sim.sd, 120)}
            fill="none"
            stroke={theme.text.tertiary}
            strokeDasharray="4 4"
          />
          {sim.raw.map((x, i) => (
            <circle key={`r${i}`} cx={toX(x)} cy={116 - (i % 6) * 6} r={3.5} fill={rawColor} fillOpacity={0.85} />
          ))}

          <text x={40} y={164} style={panelLabel}>
            {sim.on ? "다음 층 입력 (BN 뒤)" : "다음 층 입력 (BN 없음)"}
          </text>
          {axis(262)}
          <path
            d={curvePath(sim.popCenter, sim.popSd, 262)}
            fill="none"
            stroke={theme.text.tertiary}
            strokeDasharray="4 4"
          />
          {sim.out.map((x, i) => (
            <circle key={`o${i}`} cx={toX(x)} cy={258 - (i % 6) * 6} r={3.5} fill={outColor} fillOpacity={0.85} />
          ))}
        </svg>
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
          점 = 배치 안의 예제 하나. 점선 곡선 = 전체 데이터 분포. 세로 선 = 0. 모든 수치는 예시입니다.
        </figcaption>
      </figure>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
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
        <Slider
          id="bn-size"
          label="배치 크기 (논문 밖 직관)"
          value={size}
          min={2}
          max={64}
          step={1}
          show={String(size)}
          onChange={setSize}
        />
        <Slider
          id="bn-gamma"
          label="γ 크기 조절"
          value={gamma}
          min={0.2}
          max={3}
          step={0.1}
          show={gamma.toFixed(1)}
          onChange={setGamma}
        />
        <Slider
          id="bn-beta"
          label="β 위치 이동"
          value={beta}
          min={-3}
          max={3}
          step={0.1}
          show={beta.toFixed(1)}
          onChange={setBeta}
        />
      </div>

      <Properties
        items={[
          { label: "앞 층 배치 평균 (예시)", value: sim.mb.toFixed(2) },
          { label: "앞 층 배치 퍼짐 (예시)", value: sim.sbRaw.toFixed(2) },
          { label: "다음 층 배치 평균 (예시)", value: sim.mo.toFixed(2) },
          { label: "다음 층 배치 퍼짐 (예시)", value: sim.so.toFixed(2) },
          { label: "점선 곡선 중심, 전체 기준 (예시)", value: sim.popCenter.toFixed(2) },
        ]}
      />
    </div>
  );
}

export default function App() {
  return (
    <Page
      title="배치 정규화 쉽게 보기 (Ioffe·Szegedy, 2015)"
      summary="배치 정규화는 층에 들어가는 값을 묶음마다 평균 0, 퍼짐 1로 다시 줄 세우고, γ와 β로 필요한 만큼 되돌릴 여지를 남깁니다. 그 덕분에 큰 학습률로도 빠르게 학습합니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "직접 움직여 보기", id: "lab" },
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
            ["γ (감마)", "학습되는 값. 퍼짐을 다시 늘이거나 줄임"],
            ["β (베타)", "학습되는 값. 중심을 다시 옮김"],
            ["학습률(learning rate)", "한 번 고칠 때 얼마나 크게 고칠지 정하는 값"],
          ]}
        />
        <Text>
          γ와 β가 있는 이유가 있습니다. 정규화만 하면 층이 표현할 수 있는 것이 줄어듭니다. 그래서 "아무것도 안 바꾸는 변환(항등 변환)"도 표현할 수 있게 했습니다 (p.3, §3).
        </Text>
      </Section>

      <Section heading="직접 움직여 보기" id="lab" caption="모든 점과 수치는 예시입니다">
        <Text>
          먼저 학습 진행 슬라이더를 오른쪽으로 미십시오. 앞 층 값이 오른쪽으로 밀리고 넓게 퍼집니다. 그다음 BN 켜기를 누르십시오.
        </Text>
        <BnLab />
        <Text>
          BN을 켜면 아래 칸의 점이 0 근처에 다시 모입니다. 이어서 γ, β 슬라이더를 움직이십시오. 모인 분포가 다시 늘어나고 옮겨집니다.
        </Text>
        <Text>
          마지막으로 배치 크기를 2~8로 줄이고 묶음을 바꿔 보십시오. 배치 평균이 전체 평균을 잘못 짚어 점선 곡선이 흔들립니다. 이 부분은 논문에 직접 나온 실험이 아니라 직관 설명입니다 (논문 밖).
        </Text>
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
          Dropout(드롭아웃, 학습 중 일부 뉴런을 무작위로 끄는 과적합 방지 기법)을 줄일 수 있는 이유가 있습니다. BN은 한 예제의 결과가 같은 묶음의 다른 예제에 따라 조금씩 달라집니다. 저자는 이 흔들림이 규제(regularization) 효과를 낸다고 보았습니다 (p.5, §3.4).
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
          논문은 이 차이를 "14배 적은 스텝"이라고 정리했습니다 (p.7, §4.2.2). BN 네트워크 여러 개를 합친 앙상블은 ImageNet top-5 검증 오류 4.9%를 냈습니다 (p.1 초록, 그림 4).
        </Text>
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["정규화 뒤 γ, β로 늘이고 옮김", "p.3, 알고리즘 1"],
            ["γ, β로 항등 변환도 표현", "p.3, §3"],
            ["추론 때 전체 통계 사용", "p.4, §3.1, 알고리즘 2"],
            ["큰 학습률, 덜 조심스러운 초기화, Dropout 감소", "p.1 초록, p.6 §4.2.1"],
            ["72.2%까지 스텝 수 14배 적음 (BN-x5)", "p.7, §4.2.2, 그림 3"],
            ["앙상블 top-5 검증 오류 4.9%", "p.1 초록, 그림 4"],
          ]}
        />
        <Callout lead="핵심 원문 문장 (p.1 초록)">
          "Batch Normalization allows us to use much higher learning rates and be less careful about initialization. It also acts as a regularizer, in some cases eliminating the need for Dropout."
        </Callout>
      </Section>

      <Section heading="주의: 왜 작동하는가" id="caution">
        <Text>
          논문은 효과의 이유를 내부 공변량 이동(internal covariate shift)을 줄였기 때문이라고 설명합니다. 이것은 앞 층이 바뀌어 뒤 층 입력 분포가 계속 바뀌는 현상입니다.
        </Text>
        <Callout lead="이 설명은 나중에 반박되었습니다" tone="warning">
          Santurkar 외(2018)가 이 설명에 반론을 냈습니다 (논문 밖). 저자도 기울기 전달에 대한 정확한 효과는 더 연구해야 한다고 썼습니다 (p.5, §3.3).
        </Callout>
        <Text>
          정리하면 이렇습니다. "BN은 잘 작동한다"는 확인된 사실입니다. "왜 작동하는가"는 아직 열린 질문입니다. 기법 자체는 지금도 널리 쓰입니다.
        </Text>
      </Section>

      <Section heading="확인 질문과 답" id="quiz">
        <Callout lead="질문" tone="info">
          학습이 끝난 모델에 사진 한 장만 넣어 예측한다고 생각해 보십시오. BN이 학습 때처럼 "지금 들어온 묶음의 평균"을 쓰면 어떤 문제가 생길까요? 논문은 이 문제를 어떻게 해결했나요? 먼저 말로 답해 본 뒤 아래를 읽으십시오.
        </Callout>
        <Text>
          문제: 사진 한 장으로는 묶음 평균과 퍼짐을 제대로 구할 수 없습니다. 또 같은 사진이라도 함께 들어온 사진에 따라 결과가 달라집니다.
        </Text>
        <Callout lead="답" tone="success">
          추론 때는 미니배치 통계 대신 학습 데이터 전체 통계(population statistics)를 씁니다. 그래서 같은 입력이면 항상 같은 출력이 나옵니다 (p.4, §3.1, 알고리즘 2).
        </Callout>
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Sergey Ioffe, Christian Szegedy. "Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift". 2015. https://arxiv.org/abs/1502.03167 (arXiv v3)
        </Text>
      </Section>
    </Page>
  );
}
