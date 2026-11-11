import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Table,
  Properties,
  Bars,
  Segmented,
  Diagram,
  useGrokTheme,
  useState,
  useMemo,
  type CSSProperties,
  type PointerEvent,
} from "@/components/canvas";

const TITLE = "Word2Vec 시각화 학습실";
const SUMMARY =
  "CBOW와 Skip-gram이 학습 쌍을 만드는 방향, Skip-gram이 먼 단어를 덜 뽑는 규칙, 왕 − 남자 + 여자 같은 벡터 연산, NNLM과 비교한 계산 비용(논문 식 2·4·5)을 직접 조작하며 이해합니다. 조작 화면의 값은 모두 예시이며 실제 학습 결과가 아닙니다.";

const ARXIV = "https://arxiv.org/abs/1301.3781v3";
const QA_POST = "../word2vec-efficient-estimation/";

const STEP_LABELS = ["입력 선택", "벡터 조회", "예측", "학습"] as const;

const TOC = [
  { label: "CBOW와 Skip-gram의 차이", id: "models" },
  { label: "거리와 문맥 샘플링", id: "sampling" },
  { label: "단어 벡터와 의미", id: "vectors" },
  { label: "계산 비용 비교", id: "cost" },
  { label: "실험 결과", id: "results" },
  { label: "이해 확인", id: "check" },
];

// 설명용 예문. 공백으로 나눈 토큰이며 실제 형태소 분석 결과가 아닙니다.
const WORDS = "나는 오늘 친구와 작은 카페에서 따뜻한 커피를 마셨다".split(" ");
const START_CENTER = 4;

// 논문의 실험값이 아니라 설명에서 사용한 가상 벡터입니다.
const VECTOR_EXAMPLES = [
  { word: "고양이", x: 0.8, y: 0.7, labelX: 274, labelY: 90 },
  { word: "강아지", x: 0.7, y: 0.8, labelX: 257, labelY: 32 },
  { word: "자동차", x: -0.7, y: 0.1, labelX: 70, labelY: 102 },
];

// 벡터 연산 실험의 처음 좌표. 관계가 맞도록 만든 예시이며 학습된 벡터가 아닙니다.
type Point = { name: string; x: number; y: number };
const INITIAL_POINTS: Point[] = [
  { name: "왕", x: 3, y: 1 },
  { name: "남자", x: 1, y: 1 },
  { name: "여자", x: 1, y: 2 },
  { name: "여왕", x: 3, y: 2 },
  { name: "자동차", x: -2, y: 1 },
  { name: "책", x: -1, y: -2 },
];

// 원문 p.7, 표 3. 학습량 320M, 벡터 640차원.
const RESULTS = [
  { model: "RNNLM", semantic: 9, syntax: 36 },
  { model: "NNLM", semantic: 23, syntax: 53 },
  { model: "CBOW", semantic: 24, syntax: 64 },
  { model: "Skip-gram", semantic: 55, syntax: 59 },
];

const QUIZZES = [
  {
    q: "Skip-gram이 문장에서 멀리 있는 단어를 덜 뽑는 이유를 가장 정확하게 말한 것은 무엇인가요?",
    a: [
      "멀리 있는 단어는 언제나 의미가 없다.",
      "가까운 단어를 더 자주 학습하도록 가중한 것이다.",
      "두 단어의 벡터 거리를 미리 알고 있기 때문이다.",
    ],
    correct: 1,
    why: "문장 속 거리에 따른 표본 선택 규칙이며, 모든 문장의 관계를 판정하는 법칙은 아닙니다. (p.4~5, §3.2)",
  },
  {
    q: "NNLM에도 계층적 소프트맥스를 적용했습니다. CBOW가 추가로 줄이는 큰 계산은 무엇인가요?",
    a: [
      "단어 벡터를 읽는 N×D 계산",
      "비선형 은닉층으로 가는 N×D×H 계산",
      "모든 학습 데이터 읽기",
    ],
    correct: 1,
    why: "CBOW는 비선형 은닉층을 제거하므로 N×D×H 항이 없습니다. (p.3~4, §2.1·§3.1)",
  },
] as const;

const formatNumber = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })
    : "계산 불가";

type Model = "cbow" | "skipgram";

type SliderSpec = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  display?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

function contextsOf(center: number, radius: number) {
  return WORDS.map((word, index) => ({
    word,
    index,
    distance: Math.abs(index - center),
  })).filter((item) => item.distance > 0 && item.distance <= radius);
}

// 거리 d의 단어가 뽑히는 비율. R을 1~C에서 균등하게 뽑는다고 가정합니다.
function selectionRates(c: number, uniform: boolean) {
  return Array.from({ length: c }, (_, k) => (uniform ? (c - k) / c : 1));
}

// 원문 식 (2), (4), (5). hier가 참이면 NNLM 출력 항 H×V를 H×log₂(V)로 바꿉니다.
function costsOf(n: number, d: number, h: number, v: number, c: number, hier: boolean) {
  return [
    n * d + n * d * h + h * (hier ? Math.log2(v) : v),
    n * d + d * Math.log2(v),
    c * (d + d * Math.log2(v)),
  ];
}

function cosine(a: { x: number; y: number }, b: { x: number; y: number }) {
  const norm = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y);
  if (norm < 1e-12) return null;
  return Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / norm));
}

export default function App() {
  const theme = useGrokTheme();

  // 1. 학습 쌍
  const [model, setModel] = useState<Model>("cbow");
  const [center, setCenter] = useState(START_CENTER);
  const [pairC, setPairC] = useState(2);
  const [sampled, setSampled] = useState(false);
  const [drawnR, setDrawnR] = useState(2);
  const [stage, setStage] = useState(0);

  // 2. 거리와 샘플링
  const [distC, setDistC] = useState(10);
  const [currentR, setCurrentR] = useState(5);
  const [focusK, setFocusK] = useState(5);
  const [uniform, setUniform] = useState(true);

  // 3. 벡터 연산
  const [points, setPoints] = useState<Point[]>(() => INITIAL_POINTS.map((p) => ({ ...p })));
  const [selected, setSelected] = useState(0);
  const [showArrow, setShowArrow] = useState(true);
  const [dragging, setDragging] = useState(false);

  // 4. 계산 비용
  const [costN, setCostN] = useState(8);
  const [costD, setCostD] = useState(300);
  const [costH, setCostH] = useState(500);
  const [costVExp, setCostVExp] = useState(20);
  const [costC, setCostC] = useState(10);
  const [hierarchical, setHierarchical] = useState(true);
  const [logScale, setLogScale] = useState(true);

  // 6. 확인
  const [showAnswer, setShowAnswer] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null]);

  const isCbow = model === "cbow";
  const useSampled = !isCbow && sampled;
  const pairRadius = useSampled ? Math.min(drawnR, pairC) : pairC;
  const context = useMemo(() => contextsOf(center, pairRadius), [center, pairRadius]);
  const centerWord = WORDS[center] ?? WORDS[0];
  const contextWords = context.map((item) => item.word).join(" · ");

  const sampleR = uniform ? Math.min(currentR, distC) : distC;
  const k = Math.min(focusK, distC);
  const rates = useMemo(() => selectionRates(distC, uniform), [distC, uniform]);
  const included = k <= sampleR;
  const expectedPairs = 2 * rates.reduce((sum, rate) => sum + rate, 0);

  const resultVector = {
    x: points[0].x - points[1].x + points[2].x,
    y: points[0].y - points[1].y + points[2].y,
  };
  const bound =
    Math.max(
      4,
      ...points.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)]),
      Math.abs(resultVector.x),
      Math.abs(resultVector.y),
    ) + 1;
  const plotScale = 130 / bound;
  const px = (x: number) => 220 + x * plotScale;
  const py = (y: number) => 170 - y * plotScale;
  const ranks = points
    .slice(3)
    .map((p) => ({ name: p.name, score: cosine(resultVector, p) }))
    .sort((a, b) => (b.score ?? -2) - (a.score ?? -2));
  const bestScore = ranks[0]?.score ?? null;
  const ties =
    bestScore === null
      ? []
      : ranks
          .filter((r) => r.score !== null && Math.abs(r.score - bestScore) < 1e-9)
          .map((r) => r.name);
  const coord = (p: { x: number; y: number }) => `(${formatNumber(p.x)}, ${formatNumber(p.y)})`;

  const costV = 2 ** costVExp;
  const costs = costsOf(costN, costD, costH, costV, costC, hierarchical);
  const costNames = [
    `NNLM · ${hierarchical ? "계층적 출력" : "일반 출력"}`,
    "CBOW",
    "Skip-gram",
  ];

  const styles = {
    stack: { display: "grid", gap: 16, minWidth: 0 },
    wrap: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", minWidth: 0 },
    small: { ...theme.font.subtext, color: theme.text.secondary, overflowWrap: "anywhere" },
    label: { ...theme.font.label, color: theme.text.primary, overflowWrap: "anywhere" },
    box: {
      padding: 16,
      minWidth: 0,
      maxWidth: "100%",
      border: `1px solid ${theme.border.default}`,
      borderRadius: theme.radius.lg,
      background: theme.bg.subtle,
      color: theme.text.primary,
    },
    scroll: { minWidth: 0, maxWidth: "100%", overflowX: "auto" },
    track: {
      height: 12,
      minWidth: 0,
      overflow: "hidden",
      borderRadius: theme.radius.full,
      background: theme.fill.secondary,
    },
    mono: {
      ...theme.font.code,
      fontFamily: theme.font.mono,
      color: theme.text.primary,
      overflowWrap: "anywhere",
    },
    check: {
      ...theme.font.label,
      display: "flex",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
      color: theme.text.primary,
      cursor: "pointer",
    },
  } satisfies Record<string, CSSProperties>;

  const checkboxStyle: CSSProperties = {
    width: 18,
    height: 18,
    margin: 0,
    flex: "none",
    accentColor: theme.text.accent,
  };

  const buttonStyle = (active = false, disabled = false): CSSProperties => ({
    ...theme.font.label,
    padding: "10px 12px",
    minHeight: 44,
    maxWidth: "100%",
    border: `1px solid ${active ? theme.border.focus : theme.border.default}`,
    borderRadius: theme.radius.md,
    background: active ? theme.fill.accentSubtle : theme.bg.elevated,
    color: active ? theme.text.accent : theme.text.primary,
    outlineColor: theme.border.focus,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    overflowWrap: "anywhere",
    textAlign: "left",
  });

  const chipStyle = (selectedChip: boolean, isCenter = false): CSSProperties => ({
    ...theme.font.label,
    padding: "8px 10px",
    maxWidth: "100%",
    border: `1px solid ${isCenter ? theme.border.focus : theme.border.default}`,
    borderRadius: theme.radius.md,
    background: isCenter
      ? theme.fill.accentSubtle
      : selectedChip
        ? theme.fill.successSubtle
        : theme.bg.subtle,
    color: isCenter ? theme.text.accent : selectedChip ? theme.text.success : theme.text.tertiary,
    overflowWrap: "anywhere",
  });

  const renderSlider = ({
    id,
    label,
    value,
    min,
    max,
    step = 1,
    unit = "",
    display,
    disabled = false,
    onChange,
  }: SliderSpec) => (
    <div style={{ ...styles.stack, gap: 8, opacity: disabled ? 0.5 : 1 }}>
      <label htmlFor={id} style={styles.label}>
        {label}: <output htmlFor={id}>{display ?? formatNumber(value)}</output>
        {display ? "" : unit}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={display ?? `${formatNumber(value)}${unit}`}
        onChange={(event) => {
          const next = Number(event.currentTarget.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
        style={{
          width: "100%",
          minWidth: 0,
          minHeight: 44,
          margin: 0,
          accentColor: theme.text.accent,
          outlineColor: theme.border.focus,
        }}
      />
      <div style={{ ...styles.small, display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span>
          {formatNumber(min)}
          {unit}
        </span>
        <span>
          {formatNumber(max)}
          {unit}
        </span>
      </div>
    </div>
  );

  const stages = [
    {
      current: isCbow ? `주변 단어: ${contextWords}` : `가운데 단어: ${centerWord}`,
      rule: isCbow ? "주변 단어를 입력으로 선택합니다." : "가운데 단어를 입력으로 선택합니다.",
      next: isCbow
        ? "선택한 주변 단어의 벡터를 조회합니다."
        : `‘${centerWord}’의 벡터를 조회합니다.`,
    },
    {
      current: isCbow ? "주변 단어마다 벡터를 꺼냅니다." : "가운데 단어의 벡터를 꺼냅니다.",
      rule: isCbow ? "주변 단어 벡터를 평균합니다." : "가운데 단어 벡터를 예측에 사용합니다.",
      next: isCbow
        ? "평균 벡터로 가운데 단어를 예측합니다."
        : "이 벡터로 주변 단어를 각각 예측합니다.",
    },
    {
      current: isCbow ? "입력은 문맥 벡터의 평균입니다." : "입력은 가운데 단어의 벡터입니다.",
      rule: isCbow ? "가운데 단어를 분류합니다." : "주변 단어를 하나씩 분류합니다.",
      next: isCbow
        ? `정답 ‘${centerWord}’와 예측을 비교합니다.`
        : `주변 정답과 각각 비교합니다: ${contextWords}`,
    },
    {
      current: "예측과 정답을 비교합니다.",
      rule: "비교 결과를 이용해 단어 벡터를 조정합니다.",
      next: "다음 학습 위치에서도 같은 과정을 반복합니다.",
    },
  ] as const;
  const activeStage = stages[stage] ?? stages[0];

  const drawRadius = (c = pairC) => setDrawnR(1 + Math.floor(Math.random() * c));

  const resetPairs = () => {
    setModel("cbow");
    setCenter(START_CENTER);
    setPairC(2);
    setSampled(false);
    setDrawnR(2);
    setStage(0);
  };

  const resetSampling = () => {
    setDistC(10);
    setCurrentR(5);
    setFocusK(5);
    setUniform(true);
  };

  const resetVectors = () => {
    setPoints(INITIAL_POINTS.map((p) => ({ ...p })));
    setSelected(0);
    setShowArrow(true);
  };

  const resetCost = () => {
    setCostN(8);
    setCostD(300);
    setCostH(500);
    setCostVExp(20);
    setCostC(10);
    setHierarchical(true);
    setLogScale(true);
  };

  const movePoint = (index: number, axis: "x" | "y", value: number) => {
    setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, [axis]: value } : p)));
  };

  const onPlotPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const target = (event.target as Element).closest("[data-point]");
    if (!target) return;
    setSelected(Number(target.getAttribute("data-point")));
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPlotPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) * 440) / rect.width;
    const y = ((event.clientY - rect.top) * 340) / rect.height;
    const nx = Math.round(Math.max(-4, Math.min(4, (x - 220) / plotScale)) * 10) / 10;
    const ny = Math.round(Math.max(-4, Math.min(4, (170 - y) / plotScale)) * 10) / 10;
    setPoints((prev) => prev.map((p, i) => (i === selected ? { ...p, x: nx, y: ny } : p)));
  };

  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === QUIZZES[i].correct).length;

  const gridLines: number[] = [];
  for (let t = -Math.floor(bound); t <= bound; t++) gridLines.push(t);

  return (
    <Page title={TITLE} summary={SUMMARY} lang="ko" width="column">
      <TableOfContents items={TOC} />

      <Text>
        Mikolov et al. (2013), Efficient Estimation of Word Representations in Vector Space.{" "}
        <a href={ARXIV}>arXiv:1301.3781v3</a>. 글 속 쪽수(p.)는 이 PDF의 인쇄 쪽수입니다.
      </Text>
      <Text>
        이 논문의 핵심은 단어의 의미적 관계를 숫자 벡터에 학습시키면서 계산 비용을 줄이는 것입니다.
        아래 조작 화면은 학습 데이터를 만드는 규칙과 논문 식을 직접 계산합니다. 단어 벡터를 실제로
        학습하거나 모델 성능을 측정하지는 않습니다.
      </Text>

      <Section id="models" heading="CBOW와 Skip-gram의 차이">
        <Text>
          CBOW는 주변 단어를 보고 가운데 단어를 맞힙니다. Skip-gram은 가운데 단어를 보고 주변 단어를
          맞힙니다. 두 모델은 학습할 때 정답으로 삼는 단어의 방향이 반대입니다. (p.4, §3.1~3.2 · p.5,
          그림 1)
        </Text>

        <div style={styles.stack}>
          <Segmented
            options={[
              { value: "cbow", label: "CBOW" },
              { value: "skipgram", label: "Skip-gram" },
            ]}
            value={model}
            onChange={(value) => {
              if (value === "cbow" || value === "skipgram") {
                setModel(value);
                setStage(0);
              }
            }}
          />

          {renderSlider({
            id: "w2v-context",
            label: "한쪽 최대 창 크기 C",
            value: pairC,
            min: 1,
            max: 5,
            unit: "단어",
            onChange: (value) => {
              setPairC(value);
              setDrawnR((r) => Math.min(r, value));
              setStage(0);
            },
          })}

          <Callout lead="예문 (예시)" tone="info">
            단어를 누르면 그 단어가 가운데(중심) 단어가 됩니다. 공백으로 나눈 설명용 토큰입니다.
          </Callout>

          <div style={styles.wrap} role="group" aria-label="중심 단어 고르기">
            {WORDS.map((word, index) => {
              const isCenter = index === center;
              const inContext = context.some((item) => item.index === index);
              return (
                <button
                  key={word}
                  type="button"
                  aria-pressed={isCenter}
                  aria-label={`${word}: ${isCenter ? "중심 단어" : inContext ? "선택한 주변 단어" : "제외"}`}
                  onClick={() => {
                    setCenter(index);
                    setStage(0);
                  }}
                  style={{ ...chipStyle(inContext, isCenter), minHeight: 44, cursor: "pointer" }}
                >
                  {word}
                  <span style={{ display: "block", ...theme.font.caption, opacity: 0.8 }}>
                    위치 {index + 1}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ ...styles.wrap, ...styles.small }}>
            <span style={{ color: theme.text.accent }}>중심 단어</span>
            <span style={{ color: theme.text.success }}>입력 또는 정답에 쓰이는 주변 단어</span>
            <span style={{ color: theme.text.tertiary }}>제외</span>
          </div>

          <div style={styles.wrap}>
            <button
              type="button"
              onClick={() => {
                setCenter((c) => (c + 1) % WORDS.length);
                setStage(0);
              }}
              style={buttonStyle()}
            >
              다음 중심 단어
            </button>
            <button type="button" onClick={resetPairs} style={buttonStyle()}>
              초기화
            </button>
          </div>

          {!isCbow ? (
            <div style={{ ...styles.box, ...styles.stack, gap: 8 }}>
              <label style={styles.check}>
                <input
                  type="checkbox"
                  checked={sampled}
                  onChange={(event) => {
                    const on = event.currentTarget.checked;
                    setSampled(on);
                    if (on) drawRadius();
                  }}
                  style={checkboxStyle}
                />
                무작위로 줄인 창 R 적용 (논문 Skip-gram 방식)
              </label>
              <div style={styles.wrap}>
                <button
                  type="button"
                  disabled={!sampled}
                  onClick={() => drawRadius()}
                  style={buttonStyle(false, !sampled)}
                >
                  R 다시 뽑기
                </button>
                <span style={styles.small}>
                  {sampled
                    ? `이번 R = ${pairRadius} (1~${pairC}에서 균등하게 뽑았다고 가정)`
                    : `최대 창 C = ${pairC}의 후보 전체`}
                </span>
              </div>
            </div>
          ) : null}

          <div style={{ ...styles.box, ...styles.stack, gap: 8 }} aria-live="polite">
            <div style={styles.label}>
              {isCbow ? "주변 벡터의 평균 → 중심 단어" : "중심 단어 → 주변 단어 각각"} (예시 · 학습 쌍
              생성)
            </div>
            <div style={styles.small}>
              중심: {centerWord} · 주변 {context.length}단어 · 학습 항목 {isCbow ? 1 : context.length}개
            </div>
            <div style={styles.scroll}>
              <Table
                columns={["입력", "→", "정답"]}
                rows={
                  isCbow
                    ? [
                        [
                          `${context.map((item) => item.word).join(" + ")} (벡터를 더해 ${context.length}로 나누기)`,
                          "→",
                          centerWord,
                        ],
                      ]
                    : context.map((item) => [centerWord, "→", `${item.word} (거리 ${item.distance})`])
                }
              />
            </div>
            <div style={styles.small}>
              {isCbow
                ? "CBOW는 주변 단어의 순서를 바꾸어도 같은 평균을 얻습니다. 그래서 이름이 Bag-of-Words(단어 주머니)입니다."
                : useSampled
                  ? "이번 창에 들어온 단어를 각각 정답으로 씁니다. 문장 밖의 단어는 만들지 않습니다."
                  : "무작위로 창을 줄이기 전의 후보 목록입니다. 위 토글을 켜면 뽑힌 R이 적용됩니다."}
            </div>
          </div>

          <div style={styles.scroll}>
            <Diagram
              direction="vertical"
              nodes={[
                {
                  id: "input",
                  label: isCbow ? "주변 단어 여러 개" : "가운데 단어",
                  detail: isCbow ? contextWords : centerWord,
                },
                { id: "vectors", label: isCbow ? "벡터 조회 → 벡터 평균" : "벡터 조회" },
                {
                  id: "output",
                  label: isCbow ? "가운데 단어 예측" : "주변 단어 각각 예측",
                  detail: isCbow ? centerWord : contextWords,
                },
              ]}
              edges={[
                { from: "input", to: "vectors" },
                { from: "vectors", to: "output" },
              ]}
            />
          </div>

          <div role="group" aria-label="학습 단계 선택" style={styles.wrap}>
            {STEP_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                aria-pressed={stage === index}
                onClick={() => setStage(index)}
                style={buttonStyle(stage === index)}
              >
                {index + 1}. {label}
              </button>
            ))}
          </div>

          <div style={styles.box} aria-live="polite" aria-atomic="true">
            <div style={{ ...styles.label, marginBottom: 12 }}>
              학습 과정 살펴보기: {stage + 1}/4 · {STEP_LABELS[stage]}
            </div>
            <div style={styles.scroll}>
              <Properties
                items={[
                  { label: "현재 상태", value: activeStage.current },
                  { label: "적용 규칙", value: activeStage.rule },
                  { label: "다음 상태", value: activeStage.next },
                ]}
              />
            </div>
          </div>

          <div style={styles.wrap}>
            <button
              type="button"
              disabled={stage === 0}
              onClick={() => setStage((value) => Math.max(0, value - 1))}
              style={buttonStyle(false, stage === 0)}
            >
              이전
            </button>
            <button
              type="button"
              disabled={stage === 3}
              onClick={() => setStage((value) => Math.min(3, value + 1))}
              style={buttonStyle(false, stage === 3)}
            >
              다음
            </button>
          </div>
        </div>

        <Text>
          창 크기 조절은 설명용입니다. 원문에서 CBOW가 가장 좋았던 설정은 앞 4단어와 뒤 4단어를 입력으로
          쓰는 것입니다. (p.4, §3.1) 이 화면은 학습 데이터를 만들 뿐이며 단어 벡터를 실제로 학습하지는
          않습니다.
        </Text>
      </Section>

      <Section id="sampling" heading="Skip-gram은 왜 먼 단어를 덜 학습할까요?">
        <Text>
          Skip-gram은 학습 위치마다 범위 R을 1부터 C 사이에서 무작위로 고릅니다. 그리고 앞 R단어와 뒤
          R단어를 정답으로 씁니다. 거리 k의 단어는 R이 k 이상일 때만 선택됩니다. 원문은 예로 C = 5를
          들고, 실험에서는 C = 10을 썼습니다. (p.4~5, §3.2)
        </Text>

        <div style={{ ...styles.box, ...theme.font.body1, overflowWrap: "anywhere" }}>
          P(거리 k 선택) = (C − k + 1) / C
        </div>

        <Callout lead="원문에 없는 가정" tone="warning">
          원문은 R을 ‘무작위로’ 고른다고만 씁니다. 균등분포(모든 R이 같은 확률)라고 명시하지 않습니다.
          위 식과 아래 막대는 각 R이 같은 확률로 나온다고 가정한 예시 계산입니다.
        </Callout>

        <div style={styles.stack}>
          {renderSlider({
            id: "w2v-dist-c",
            label: "한쪽 최대 거리 C",
            value: distC,
            min: 1,
            max: 10,
            onChange: setDistC,
          })}

          <label style={styles.check}>
            <input
              type="checkbox"
              checked={uniform}
              onChange={(event) => setUniform(event.currentTarget.checked)}
              style={checkboxStyle}
            />
            R을 1~C에서 균등하게 뽑기 (끄면 항상 R = C)
          </label>

          {renderSlider({
            id: "w2v-radius",
            label: "이번에 뽑힌 범위 R",
            value: sampleR,
            min: 1,
            max: distC,
            disabled: !uniform,
            onChange: setCurrentR,
          })}

          {renderSlider({
            id: "w2v-distance",
            label: "관찰할 단어의 거리 k",
            value: k,
            min: 1,
            max: distC,
            onChange: setFocusK,
          })}

          <div
            style={{ ...styles.wrap, justifyContent: "center" }}
            aria-label="중심에서의 거리와 이번 문맥 선택"
          >
            {Array.from({ length: 2 * distC + 1 }, (_, i) => i - distC).map((position) => {
              const isCenter = position === 0;
              const chosen = !isCenter && Math.abs(position) <= sampleR;
              const observed = !isCenter && Math.abs(position) === k;
              return (
                <span
                  key={position}
                  style={{
                    ...chipStyle(chosen, isCenter),
                    borderColor: observed || isCenter ? theme.border.focus : theme.border.default,
                  }}
                  aria-label={
                    isCenter
                      ? "중심 단어"
                      : `${position < 0 ? "앞쪽" : "뒤쪽"} 거리 ${Math.abs(position)}, ${
                          chosen ? "선택" : "제외"
                        }${observed ? ", 관찰 중" : ""}`
                  }
                >
                  {isCenter ? "중심" : `${Math.abs(position)}${observed ? " ●" : ""}`}
                </span>
              );
            })}
          </div>

          <div style={styles.small}>
            숫자는 문장 속 위치 차이(거리)입니다. ●는 관찰 중인 거리입니다. 벡터 사이의 거리나 문법적
            중요도가 아닙니다.
          </div>

          <div aria-live="polite" aria-atomic="true">
            <Callout lead="이번 뽑기에서의 선택 여부" tone={included ? "success" : "warning"}>
              {included
                ? `거리 ${k}의 단어가 포함됩니다. R = ${sampleR}가 k = ${k} 이상입니다.`
                : `거리 ${k}의 단어가 제외됩니다. R = ${sampleR}가 k = ${k}보다 작습니다.`}
            </Callout>
          </div>

          <div style={{ ...styles.box, ...styles.stack, gap: 8 }}>
            <div style={styles.label}>
              {uniform
                ? `거리 ${k}: 포함되는 R ${distC - k + 1}개 ÷ 전체 ${distC}개 = ${formatNumber(
                    (rates[k - 1] ?? 0) * 100,
                  )}%`
                : `항상 R = ${distC}: 거리 ${k}의 선택 비율 = 100%`}
            </div>
            <div style={styles.wrap} aria-label="거리 k를 포함하는 R 값">
              {Array.from({ length: distC }, (_, i) => i + 1).map((r) => {
                const active = uniform ? r >= k : r === distC;
                return (
                  <span key={r} style={{ ...chipStyle(active), padding: "4px 8px" }}>
                    R={r}
                    {uniform ? "" : r === distC ? " 사용" : " 미사용"}
                  </span>
                );
              })}
            </div>
            <div style={styles.small}>초록 칸은 거리 {k}의 단어를 포함하는 R입니다.</div>
          </div>

          <div style={{ ...styles.box, ...styles.stack, gap: 8 }}>
            <div style={styles.label}>거리별 선택 비율 (예시 · 가능한 R을 모두 세어 계산)</div>
            <div style={styles.scroll}>
              <Bars
                emphasis={k - 1}
                bars={rates.map((rate, i) => ({
                  label: `거리 ${i + 1}`,
                  value: rate * 100,
                  display: `${formatNumber(rate * 100)}%`,
                }))}
              />
            </div>
            <div style={styles.label}>
              중심 단어당 평균 학습 쌍 수: {formatNumber(expectedPairs)}개
            </div>
            <div style={styles.small}>
              문장 양쪽에 단어가 충분히 있을 때의 계산입니다. 같은 거리의 왼쪽·오른쪽 단어는 각각 이 비율로
              선택됩니다. 막대의 합은 100%가 아닙니다. 한 번에 여러 거리가 함께 선택되기 때문입니다.
            </div>
          </div>

          <div style={styles.wrap}>
            <button type="button" onClick={resetSampling} style={buttonStyle()}>
              C = 10으로 초기화
            </button>
          </div>
        </div>

        <Text>
          C = 10이면 거리 10의 단어는 R이 10일 때만 선택됩니다. 비율은 10%입니다. 거리 1의 단어는 모든
          R에 포함됩니다. 비율은 100%입니다.
        </Text>

        <Callout lead="이번 선택과 선택 비율은 다릅니다" tone="info">
          R을 바꾸면 이번 선택 여부가 바뀝니다. k를 고정하면 가능한 모든 R에서 계산한 선택 비율은
          그대로입니다.
        </Callout>

        <Text>
          이 비율은 ‘단어가 관련될 확률’이 아닙니다. 거리와 실제 의미적 관련성을 매번 계산한 결과도
          아닙니다. 원문은 먼 단어가 대체로 덜 관련되므로 덜 뽑아 가중치를 낮춘다고 설명합니다. 즉 거리별
          학습 빈도를 정한 설계 규칙입니다. 먼 단어가 중요한 문장도 있으므로 이 규칙에는 한계가 있습니다.
          (p.4, §3.2)
        </Text>
      </Section>

      <Section id="vectors" heading="단어 벡터는 어떻게 의미를 갖게 될까요?">
        <Text>
          처음부터 컴퓨터가 ‘고양이’의 뜻을 알고 있는 것은 아닙니다. 단어는 학습 과정에서 숫자
          벡터(숫자 목록)로 표현됩니다.
        </Text>

        <Callout lead="단어 임베딩 테이블 (예시)" tone="info">
          아래 숫자는 이해를 위한 가상 예시입니다. 논문의 실제 학습 결과가 아닙니다.
        </Callout>

        <div style={styles.scroll}>
          <Table
            columns={["단어", "차원 1", "차원 2"]}
            rows={VECTOR_EXAMPLES.map(({ word, x, y }) => [word, String(x), String(y)])}
          />
        </div>

        <figure style={{ ...styles.box, margin: 0 }}>
          <svg
            viewBox="0 0 360 250"
            role="img"
            aria-labelledby="w2v-vector-title w2v-vector-desc"
            style={{ display: "block", width: "100%", height: "auto", overflow: "hidden" }}
          >
            <title id="w2v-vector-title">가상 단어 벡터의 방향 (예시)</title>
            <desc id="w2v-vector-desc">
              고양이는 0.8, 0.7입니다. 강아지는 0.7, 0.8입니다. 자동차는 -0.7, 0.1입니다. 고양이와
              강아지는 비슷한 방향을 가리킵니다.
            </desc>
            <line x1="20" y1="132" x2="344" y2="132" stroke={theme.border.strong} />
            <line x1="180" y1="228" x2="180" y2="20" stroke={theme.border.strong} />
            <text
              x="342"
              y="158"
              textAnchor="end"
              style={{ ...theme.font.caption, fill: theme.text.secondary }}
            >
              차원 1
            </text>
            <text x="192" y="24" style={{ ...theme.font.caption, fill: theme.text.secondary }}>
              차원 2
            </text>
            {VECTOR_EXAMPLES.map((vector, index) => {
              const color =
                index === 0 ? theme.text.accent : index === 1 ? theme.text.success : theme.text.secondary;
              const x = 180 + 100 * vector.x;
              const y = 132 - 100 * vector.y;
              const markerId = `w2v-vector-arrow-${index}`;
              return (
                <g key={vector.word}>
                  <defs>
                    <marker
                      id={markerId}
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 Z" fill={color} />
                    </marker>
                  </defs>
                  <line
                    x1="180"
                    y1="132"
                    x2={x}
                    y2={y}
                    stroke={color}
                    strokeWidth="2"
                    markerEnd={`url(#${markerId})`}
                  />
                  <text
                    x={vector.labelX}
                    y={vector.labelY}
                    textAnchor="middle"
                    style={{ ...theme.font.label, fill: color }}
                  >
                    {vector.word}
                  </text>
                </g>
              );
            })}
          </svg>
          <figcaption style={styles.small}>
            방향이 비슷한 벡터끼리 코사인 유사도(cosine similarity, 원점에서 뻗는 두 화살표의 방향이 얼마나
            비슷한지)가 높습니다. 실제 모델은 2차원이 아니라 훨씬 많은 차원을 사용합니다.
          </figcaption>
        </figure>

        <Section heading="왜 고양이와 강아지가 가까워질 수 있을까요?">
          <Text>
            두 단어가 비슷한 문맥에서 자주 나타나면, 학습 과정에서 비슷한 관계를 표현하도록 벡터가 조정될
            수 있습니다.
          </Text>
          <Text>
            이 설명은 학습 결과를 이해하는 직관입니다. 벡터를 서로 당기는 규칙 하나로 학습한다는 뜻은
            아닙니다.
          </Text>
        </Section>

        <Section heading="왕 − 남자 + 여자: 숫자 목록을 화살표로 계산하기">
          <Text>
            원문은 벡터(‘왕’) − 벡터(‘남자’) + 벡터(‘여자’)에 가장 가까운 벡터가 ‘여왕’이라는 이전 연구
            결과를 소개합니다. (p.2, §1.1) 평가에서는 이렇게 계산한 벡터와 코사인 거리가 가장 가까운 단어를
            답으로 고르고, 질문에 쓴 단어는 후보에서 뺍니다. (p.5, §4)
          </Text>

          <Callout lead="논문 밖 · 예시 값 · 학습된 벡터 아님" tone="warning">
            처음 좌표는 관계가 맞도록 만든 예시입니다. 실제 word2vec에서 이 관계가 항상 성립한다는 뜻은
            아닙니다. 축에 ‘성별’ 같은 고정 의미가 있는 것도 아닙니다.
          </Callout>

          <figure style={{ ...styles.box, margin: 0, padding: 8 }}>
            <svg
              viewBox="0 0 440 340"
              role="img"
              aria-label="끌어서 옮길 수 있는 단어 벡터 좌표 (예시)"
              onPointerDown={onPlotPointerDown}
              onPointerMove={onPlotPointerMove}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                touchAction: "none",
                userSelect: "none",
              }}
            >
              <defs>
                <marker id="w2v-tip" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L7,3 Z" fill={theme.text.warning} />
                </marker>
              </defs>
              {gridLines.map((t) => (
                <path
                  key={t}
                  d={`M${px(t)},40 V300 M90,${py(t)} H350`}
                  stroke={theme.border.subtle}
                  strokeWidth="1"
                />
              ))}
              <path d="M55,170 H385 M220,24 V316" stroke={theme.border.strong} />
              <text x="390" y="175" style={{ ...theme.font.caption, fill: theme.text.secondary }}>
                x
              </text>
              <text x="224" y="22" style={{ ...theme.font.caption, fill: theme.text.secondary }}>
                y
              </text>
              <text x="225" y="184" style={{ ...theme.font.caption, fill: theme.text.secondary }}>
                0
              </text>
              <text x="225" y="43" style={{ ...theme.font.caption, fill: theme.text.secondary }}>
                {formatNumber(bound)}
              </text>
              <text x="346" y="185" style={{ ...theme.font.caption, fill: theme.text.secondary }}>
                {formatNumber(bound)}
              </text>
              {showArrow ? (
                <g>
                  <line
                    x1="220"
                    y1="170"
                    x2={px(resultVector.x)}
                    y2={py(resultVector.y)}
                    stroke={theme.text.warning}
                    strokeWidth="2.5"
                    markerEnd="url(#w2v-tip)"
                  />
                  <circle
                    cx={px(resultVector.x)}
                    cy={py(resultVector.y)}
                    r="12"
                    fill="none"
                    stroke={theme.text.warning}
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                  <text
                    x={px(resultVector.x) + 13}
                    y={py(resultVector.y) + 19}
                    style={{ ...theme.font.caption, fill: theme.text.warning }}
                  >
                    계산 결과
                  </text>
                </g>
              ) : null}
              {points.map((p, i) => (
                <g key={p.name} data-point={i} style={{ cursor: "grab" }}>
                  <circle
                    cx={px(p.x)}
                    cy={py(p.y)}
                    r={i === selected ? 9 : 7}
                    fill={i < 3 ? theme.text.accent : theme.text.success}
                    stroke={theme.bg.base}
                    strokeWidth="2"
                  />
                  <text
                    x={px(p.x) + 10}
                    y={py(p.y) - 9}
                    style={{ ...theme.font.caption, fill: theme.text.primary }}
                  >
                    {p.name}
                  </text>
                </g>
              ))}
            </svg>
            <figcaption style={styles.small}>
              점을 끌거나 아래 슬라이더를 움직이세요. 결과점까지 들어오도록 축 범위가 자동으로 바뀝니다. 파란
              점은 입력 단어, 초록 점은 후보 단어입니다.
            </figcaption>
          </figure>

          <div style={styles.stack}>
            <div style={styles.wrap}>
              <label htmlFor="w2v-word" style={styles.label}>
                움직일 단어
              </label>
              <select
                id="w2v-word"
                value={selected}
                onChange={(event) => setSelected(Number(event.currentTarget.value))}
                style={{
                  ...theme.font.label,
                  minHeight: 44,
                  padding: "8px 10px",
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: theme.radius.md,
                  background: theme.bg.elevated,
                  color: theme.text.primary,
                }}
              >
                {points.map((p, i) => (
                  <option key={p.name} value={i}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={resetVectors} style={buttonStyle()}>
                원래 좌표
              </button>
            </div>

            {renderSlider({
              id: "w2v-point-x",
              label: "가로 좌표 x",
              value: points[selected].x,
              min: -4,
              max: 4,
              step: 0.1,
              onChange: (value) => movePoint(selected, "x", value),
            })}
            {renderSlider({
              id: "w2v-point-y",
              label: "세로 좌표 y",
              value: points[selected].y,
              min: -4,
              max: 4,
              step: 0.1,
              onChange: (value) => movePoint(selected, "y", value),
            })}

            <label style={styles.check}>
              <input
                type="checkbox"
                checked={showArrow}
                onChange={(event) => setShowArrow(event.currentTarget.checked)}
                style={checkboxStyle}
              />
              계산 결과의 화살표 표시
            </label>

            <div style={{ ...styles.box, ...styles.stack, gap: 8 }} aria-live="polite">
              <div style={styles.label}>좌표끼리 빼고 더합니다</div>
              <div style={styles.mono}>
                {coord(points[0])} − {coord(points[1])} + {coord(points[2])} = {coord(resultVector)}
              </div>
              <div style={{ ...styles.label, color: theme.text.accent }}>
                {ties.length ? `가장 비슷한 방향: ${ties.join(" · ")}` : "코사인 유사도 계산 불가"}
              </div>
              <div style={styles.scroll}>
                <Table
                  columns={["후보 단어", "코사인 유사도"]}
                  rows={ranks.map((r) => [
                    ties.includes(r.name) ? { text: r.name, tone: "success" as const } : r.name,
                    r.score === null ? "계산 불가" : r.score.toFixed(3),
                  ])}
                />
              </div>
              <div style={styles.small}>
                입력에 쓴 왕·남자·여자는 정답 후보에서 뺍니다. (p.5, §4) 길이가 0인 벡터는 방향이 없어 코사인을
                계산하지 않습니다.
              </div>
            </div>
          </div>
        </Section>
      </Section>

      <Section id="cost" heading="비선형 은닉층을 제거하면 얼마나 저렴해질까요?">
        <Text>
          원문은 계산 복잡도를 모델 학습에 접근해야 하는 매개변수 수로 정의하고, 학습 단어 하나당 비용 Q로 모델을 비교합니다. (p.2, §2) 아래
          슬라이더 값은 예시이며, 논문 식에 직접 대입합니다. (p.3, 식 (2) · p.4, 식 (4)~(5))
        </Text>

        <div style={styles.stack}>
          {renderSlider({
            id: "w2v-cost-n",
            label: "N · 입력 문맥 단어 수",
            value: costN,
            min: 1,
            max: 12,
            onChange: setCostN,
          })}
          {renderSlider({
            id: "w2v-cost-d",
            label: "D · 단어 벡터 차원",
            value: costD,
            min: 10,
            max: 1000,
            step: 10,
            onChange: setCostD,
          })}
          {renderSlider({
            id: "w2v-cost-h",
            label: "H · NNLM 은닉층 크기",
            value: costH,
            min: 10,
            max: 1000,
            step: 10,
            onChange: setCostH,
          })}
          {renderSlider({
            id: "w2v-cost-v",
            label: "V · 어휘 수 (한 칸마다 두 배)",
            value: costVExp,
            min: 4,
            max: 20,
            display: formatNumber(costV),
            onChange: setCostVExp,
          })}
          {renderSlider({
            id: "w2v-cost-c",
            label: "C · Skip-gram 한쪽 최대 거리",
            value: costC,
            min: 1,
            max: 10,
            onChange: setCostC,
          })}

          <label style={styles.check}>
            <input
              type="checkbox"
              checked={hierarchical}
              onChange={(event) => setHierarchical(event.currentTarget.checked)}
              style={checkboxStyle}
            />
            NNLM에도 계층적 소프트맥스 적용
          </label>
          <label style={styles.check}>
            <input
              type="checkbox"
              checked={logScale}
              onChange={(event) => setLogScale(event.currentTarget.checked)}
              style={checkboxStyle}
            />
            막대를 로그 눈금으로 보기
          </label>

          <div style={{ ...styles.box, ...styles.stack, gap: 8 }}>
            <div style={styles.label}>예시 Q · 계산 비용의 대리 지표</div>
            <div style={styles.scroll}>
              <Bars
                emphasis="none"
                bars={costs.map((q, i) => ({
                  label: costNames[i],
                  value: logScale ? Math.log10(q + 1) : q,
                  display: `Q = ${formatNumber(q)}`,
                }))}
              />
            </div>
            <div style={styles.small}>
              {logScale
                ? "막대 길이 = log₁₀(Q+1)입니다. 가장 긴 막대를 기준으로 그립니다. 길이의 비율은 Q의 비율이 아닙니다."
                : "막대 길이는 Q에 비례합니다. 가장 큰 Q를 기준으로 그립니다."}
            </div>
          </div>

          <div style={styles.scroll}>
            <Table
              columns={["모델", "논문 식", "위치"]}
              rows={[
                ["NNLM", "N×D + N×D×H + H×V", "p.3, 식 (2)"],
                ["CBOW", "N×D + D×log₂(V)", "p.4, 식 (4)"],
                ["Skip-gram", "C×(D + D×log₂(V))", "p.4, 식 (5)"],
              ]}
            />
          </div>

          <div style={styles.small}>
            {hierarchical
              ? "현재 NNLM: N×D + N×D×H + H×log₂(V). 원문 식 (2)의 출력 항에 §2.1의 계층적 출력을 대입한 설명용 식입니다."
              : "현재 NNLM: 원문 식 (2)를 그대로 사용합니다. CBOW·Skip-gram 식은 계층적 출력을 포함합니다."}{" "}
            N은 NNLM에서는 앞쪽 입력 단어 수, CBOW에서는 양쪽 입력의 총수입니다. C는 한쪽 최대 거리이므로
            N과 따로 조절합니다.
          </div>

          <div style={styles.wrap}>
            <button type="button" onClick={resetCost} style={buttonStyle()}>
              초기화
            </button>
          </div>
        </div>

        <Callout lead="Q는 실제 실행시간이 아닙니다" tone="warning">
          Q는 접근할 매개변수 수를 바탕으로 한 비용식입니다. 실제 학습 시간, 정확도, 전체 매개변수 수가
          아닙니다.
        </Callout>

        <Section heading="식과 실제 구현의 차이">
          <Text>
            log₂(V)는 균형 이진 트리의 경로 길이를 근사합니다. 원문 모델은 허프먼 트리(자주 나오는 단어에
            짧은 코드를 주는 트리)를 쓰므로 단어 빈도에 따라 경로 길이가 다릅니다. (p.3, §2.1)
          </Text>
          <Text>
            식 (5)는 복잡도가 비례하는 형태입니다. 실제로 뽑힌 학습 쌍은 문장 경계가 없으면 R × 2개입니다.
            (p.5, §3.2) 위 식을 정확한 연산 횟수로 해석하면 안 됩니다.
          </Text>
          <Text>
            계층적 소프트맥스(hierarchical softmax)는 단어를 트리의 여러 갈림길로 나누어 찾는 방식입니다. 이
            비교는 모든 모델에서 같은 V를 사용합니다.
          </Text>
        </Section>

        <Text>
          기존 NNLM은 N×D×H에 해당하는 비선형 은닉층 계산이 큰 병목이었습니다. H는 은닉층 크기입니다.
          원문은 계층적 소프트맥스를 쓰면 복잡도 대부분이 N×D×H 항에서 나온다고 씁니다. CBOW와 Skip-gram은
          그 층을 제거했습니다. 덕분에 더 큰 학습 데이터와 벡터 차원을 사용할 수 있었습니다. (p.3~4, 식
          (2)·(4)·(5))
        </Text>
      </Section>

      <Section id="results" heading="실제 실험은 어떤 결과였을까요?">
        <Text>
          동일한 학습량과 벡터 차원의 정확도 비교입니다. 320M 학습 단어를 사용했습니다. 벡터는
          640차원입니다. 단위는 %입니다. (원문 p.7, 표 3)
        </Text>

        <figure style={{ ...styles.box, ...styles.stack, margin: 0 }}>
          <figcaption style={styles.small}>
            의미 정확도와 문법 정확도. 모든 막대의 비교 축은 0~70%입니다.
          </figcaption>
          {RESULTS.map((result) => (
            <div key={result.model} style={{ ...styles.stack, gap: 8 }}>
              <div style={styles.label}>{result.model}</div>
              {[
                { label: "의미", value: result.semantic, color: theme.fill.accent },
                { label: "문법", value: result.syntax, color: theme.text.success },
              ].map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <span style={styles.small}>{metric.label}</span>
                  <div style={styles.track} aria-hidden="true">
                    <div
                      style={{
                        width: `${(metric.value / 70) * 100}%`,
                        height: "100%",
                        borderRadius: theme.radius.full,
                        background: metric.color,
                      }}
                    />
                  </div>
                  <span style={styles.label}>{metric.value}%</span>
                </div>
              ))}
            </div>
          ))}
          <div style={styles.small}>각 지표에서는 높은 정확도가 좋은 결과입니다.</div>
        </figure>

        <Text>
          이 실험에서 CBOW는 문법 정확도 64%로 가장 높았습니다. Skip-gram은 의미 정확도 55%로 가장
          높았습니다. 어느 모델이 좋은지는 평가하는 관계에 따라 달라집니다.
        </Text>

        <Callout lead="표 4는 학습량이 같지 않습니다" tone="warning">
          NNLM은 6B 단어를 사용했습니다. CBOW와 Skip-gram은 783M 단어를 사용했습니다. Moonlight 요약에서는
          이 조건을 잘못 읽었습니다. 서로 다른 실험 조건을 동일 조건의 승부로 해석하면 안 됩니다. (원문
          p.8, 표 4)
        </Callout>
      </Section>

      <Section id="check" heading="이해 확인">
        <Text>
          문장에서 가운데 단어가 ‘고양이를’이라고 합시다. 주변 단어는 ‘아이가’, ‘귀여운’, ‘보고’,
          ‘정말’입니다.
        </Text>

        <Callout lead="문제 1" tone="info">
          어느 모델이 주변 단어 네 개로 ‘고양이를’ 예측할까요? 어느 모델이 ‘고양이를’ 하나로 주변 단어 네
          개를 예측할까요?
        </Callout>

        <button
          type="button"
          aria-expanded={showAnswer}
          aria-controls="w2v-answer"
          onClick={() => setShowAnswer((value) => !value)}
          style={buttonStyle(showAnswer)}
        >
          {showAnswer ? "정답 접기" : "정답 펼치기"}
        </button>

        <div id="w2v-answer" hidden={!showAnswer} style={{ marginTop: 12 }}>
          <Callout lead="정답" tone="success">
            CBOW는 주변 단어 네 개로 ‘고양이를’ 예측합니다. Skip-gram은 ‘고양이를’로 주변 단어 네 개를 각각
            예측합니다. (p.4, §3.1~3.2)
          </Callout>
        </div>

        {QUIZZES.map((quiz, qi) => {
          const answer = answers[qi];
          return (
            <div key={quiz.q} style={{ ...styles.stack, gap: 8, marginTop: 16 }}>
              <div style={styles.label}>
                문제 {qi + 2}. {quiz.q}
              </div>
              <div style={{ display: "grid", gap: 8 }} role="group" aria-label={`문제 ${qi + 2} 보기`}>
                {quiz.a.map((choice, ci) => (
                  <button
                    key={choice}
                    type="button"
                    aria-pressed={answer === ci}
                    onClick={() =>
                      setAnswers((prev) => prev.map((a, i) => (i === qi ? ci : a)))
                    }
                    style={buttonStyle(answer === ci)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              {answer === null ? null : (
                <div role="status">
                  <Callout
                    lead={answer === quiz.correct ? "정답입니다" : "다시 생각해 보세요"}
                    tone={answer === quiz.correct ? "success" : "warning"}
                  >
                    {quiz.why}
                  </Callout>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ ...styles.wrap, marginTop: 12 }}>
          <button
            type="button"
            onClick={() => {
              setAnswers([null, null]);
              setShowAnswer(false);
            }}
            style={buttonStyle()}
          >
            다시 풀기
          </button>
          <span style={styles.small}>
            객관식 {answered}문제 응답 · {correct}문제 정답
          </span>
        </div>

        <Text>
          다음 연결고리는 어텐션(Attention)입니다. CBOW는 문맥 벡터를 평균합니다. Skip-gram은 거리에 따라
          주변 단어의 학습 빈도를 다르게 만듭니다. 이후 어텐션 논문에서는 문맥의 각 단어가 얼마나 중요한지를
          입력에 따라 계산하는 방식을 살펴보면 됩니다.
        </Text>

        <Text>
          이 논문을 읽으며 물은 질문과 원문 대조 검증은{" "}
          <a href={QA_POST}>word2vec 논문 읽기 (Mikolov 외, 2013)</a> 글에 따로 정리했습니다.
        </Text>
      </Section>
    </Page>
  );
}
