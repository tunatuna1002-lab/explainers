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
} from "@/components/canvas";

const TITLE = "Word2Vec 시각화 학습실";
const SUMMARY =
  "CBOW와 Skip-gram의 예측 방향, 단어 벡터의 학습 직관, 계산 비용을 직접 조작하며 이해합니다.";

const MAX_RADIUS = 10;
const STEP_LABELS = ["입력 선택", "벡터 조회", "예측", "학습"] as const;

const TOC = [
  { label: "CBOW와 Skip-gram의 차이", id: "models" },
  { label: "단어 벡터와 의미", id: "vectors" },
  { label: "거리와 문맥 샘플링", id: "sampling" },
  { label: "계산 비용 비교", id: "cost" },
  { label: "실험 결과", id: "results" },
  { label: "이해 확인", id: "check" },
];

// 기존 예문의 단어를 유지합니다.
// 제공되지 않은 바깥 문맥은 실제 단어 대신 위치만 표시합니다.
const TOKENS = [
  { offset: -4, word: "앞 4칸", placeholder: true },
  { offset: -3, word: "앞 3칸", placeholder: true },
  { offset: -2, word: "아이가", placeholder: false },
  { offset: -1, word: "귀여운", placeholder: false },
  { offset: 0, word: "고양이를", placeholder: false },
  { offset: 1, word: "보고", placeholder: false },
  { offset: 2, word: "정말", placeholder: false },
  { offset: 3, word: "뒤 3칸", placeholder: true },
  { offset: 4, word: "뒤 4칸", placeholder: true },
];

// 논문의 실험값이 아니라 기존 설명에서 사용한 가상 벡터입니다.
const VECTOR_EXAMPLES = [
  { word: "고양이", x: 0.8, y: 0.7, labelX: 274, labelY: 90 },
  { word: "강아지", x: 0.7, y: 0.8, labelX: 257, labelY: 32 },
  { word: "자동차", x: -0.7, y: 0.1, labelX: 70, labelY: 102 },
];

// 원문 p.7, 표 3. 학습량 320M, 벡터 640차원.
const RESULTS = [
  { model: "RNNLM", semantic: 9, syntax: 36 },
  { model: "NNLM", semantic: 23, syntax: 53 },
  { model: "CBOW", semantic: 24, syntax: 64 },
  { model: "Skip-gram", semantic: 55, syntax: 59 },
];

const POSITIONS = Array.from(
  { length: 2 * MAX_RADIUS + 1 },
  (_, index) => index - MAX_RADIUS,
);

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

type Model = "cbow" | "skipgram";

type SliderSpec = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
};

export default function App() {
  const theme = useGrokTheme();

  const [model, setModel] = useState<Model>("cbow");
  const [contextRadius, setContextRadius] = useState(2);
  const [stage, setStage] = useState(0);
  const [radius, setRadius] = useState(5);
  const [distance, setDistance] = useState(5);
  const [dimension, setDimension] = useState(300);
  const [showAnswer, setShowAnswer] = useState(false);

  const context = useMemo(
    () =>
      TOKENS.filter(
        (token) =>
          token.offset !== 0 && Math.abs(token.offset) <= contextRadius,
      ),
    [contextRadius],
  );

  const contextWords = context.map((token) => token.word).join(" · ");
  const isCbow = model === "cbow";
  const included = distance <= radius;
  const eligibleRadii = MAX_RADIUS - distance + 1;
  const probability = (eligibleRadii / MAX_RADIUS) * 100;

  const costs = useMemo(
    () => ({
      cbow: 8 * dimension + 20 * dimension,
      skipgram: 10 * (dimension + 20 * dimension),
    }),
    [dimension],
  );

  const styles = {
    stack: {
      display: "grid",
      gap: 16,
      minWidth: 0,
    },
    wrap: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
      minWidth: 0,
    },
    small: {
      ...theme.font.subtext,
      color: theme.text.secondary,
      overflowWrap: "anywhere",
    },
    label: {
      ...theme.font.label,
      color: theme.text.primary,
      overflowWrap: "anywhere",
    },
    box: {
      padding: 16,
      minWidth: 0,
      maxWidth: "100%",
      border: `1px solid ${theme.border.default}`,
      borderRadius: theme.radius.lg,
      background: theme.bg.subtle,
      color: theme.text.primary,
    },
    scroll: {
      minWidth: 0,
      maxWidth: "100%",
      overflowX: "auto",
    },
    track: {
      height: 12,
      minWidth: 0,
      overflow: "hidden",
      borderRadius: theme.radius.full,
      background: theme.fill.secondary,
    },
  } satisfies Record<string, CSSProperties>;

  const buttonStyle = (
    active = false,
    disabled = false,
  ): CSSProperties => ({
    ...theme.font.label,
    padding: "10px 12px",
    minHeight: 44,
    maxWidth: "100%",
    border: `1px solid ${
      active ? theme.border.focus : theme.border.default
    }`,
    borderRadius: theme.radius.md,
    background: active ? theme.fill.accentSubtle : theme.bg.elevated,
    color: active ? theme.text.accent : theme.text.primary,
    outlineColor: theme.border.focus,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    overflowWrap: "anywhere",
  });

  const chipStyle = (
    selected: boolean,
    center = false,
  ): CSSProperties => ({
    ...theme.font.label,
    padding: "8px 10px",
    maxWidth: "100%",
    border: `1px solid ${
      center ? theme.border.focus : theme.border.default
    }`,
    borderRadius: theme.radius.md,
    background: center
      ? theme.fill.accentSubtle
      : selected
        ? theme.fill.successSubtle
        : theme.bg.subtle,
    color: center
      ? theme.text.accent
      : selected
        ? theme.text.success
        : theme.text.tertiary,
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
    onChange,
  }: SliderSpec) => (
    <div style={{ ...styles.stack, gap: 8 }}>
      <label htmlFor={id} style={styles.label}>
        {label}: <output htmlFor={id}>{formatNumber(value)}</output>
        {unit}
      </label>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={`${formatNumber(value)}${unit}`}
        onChange={(event) => {
          const next = Number(event.currentTarget.value);

          if (Number.isFinite(next)) {
            onChange(Math.min(max, Math.max(min, next)));
          }
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

      <div
        style={{
          ...styles.small,
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
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
      current: isCbow
        ? `주변 단어: ${contextWords}`
        : "가운데 단어: 고양이를",
      rule: isCbow
        ? "주변 단어를 입력으로 선택합니다."
        : "가운데 단어를 입력으로 선택합니다.",
      next: isCbow
        ? "선택한 주변 단어의 벡터를 조회합니다."
        : "‘고양이를’의 벡터를 조회합니다.",
    },
    {
      current: isCbow
        ? "주변 단어마다 벡터를 꺼냅니다."
        : "가운데 단어의 벡터를 꺼냅니다.",
      rule: isCbow
        ? "주변 단어 벡터를 평균합니다."
        : "가운데 단어 벡터를 예측에 사용합니다.",
      next: isCbow
        ? "평균 벡터로 가운데 단어를 예측합니다."
        : "이 벡터로 주변 단어를 각각 예측합니다.",
    },
    {
      current: isCbow
        ? "입력은 문맥 벡터의 평균입니다."
        : "입력은 가운데 단어의 벡터입니다.",
      rule: isCbow
        ? "가운데 단어를 분류합니다."
        : "주변 단어를 하나씩 분류합니다.",
      next: isCbow
        ? "정답 ‘고양이를’과 예측을 비교합니다."
        : `주변 정답과 각각 비교합니다: ${contextWords}`,
    },
    {
      current: "예측과 정답을 비교합니다.",
      rule: "비교 결과를 이용해 단어 벡터를 조정합니다.",
      next: "다음 학습 위치에서도 같은 과정을 반복합니다.",
    },
  ] as const;

  const activeStage = stages[stage] ?? stages[0];

  const reset = () => {
    setModel("cbow");
    setContextRadius(2);
    setStage(0);
    setRadius(5);
    setDistance(5);
    setDimension(300);
    setShowAnswer(false);
  };

  return (
    <Page title={TITLE} summary={SUMMARY} lang="ko" width="column">
      <TableOfContents items={TOC} />

      <Text>
        Mikolov et al. (2013), Efficient Estimation of Word Representations
        in Vector Space.
      </Text>
      <Text>
        이 논문의 핵심은 단어의 의미적 관계를 숫자 벡터에 학습시키면서
        계산 비용을 줄이는 것입니다.
      </Text>

      <Section id="models" heading="CBOW와 Skip-gram의 차이">
        <Text>
          CBOW는 주변 단어를 보고 가운데 단어를 맞힙니다.
          Skip-gram은 가운데 단어를 보고 주변 단어를 맞힙니다.
          두 모델은 학습할 때 정답으로 삼는 단어의 방향이 반대입니다.
          (원문 §3.1~3.2)
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
            label: "문맥 범위: 양쪽",
            value: contextRadius,
            min: 1,
            max: 4,
            unit: "단어씩",
            onChange: (value) => {
              setContextRadius(value);
              setStage(0);
            },
          })}

          <div style={styles.small}>
            선택한 주변 문맥은 총 {context.length}개입니다.
          </div>

          <Callout lead="예문과 문맥 배치 (예시)" tone="info">
            아이가 · 귀여운 · 고양이를 · 보고 · 정말.
            바깥 문맥은 단어 대신 위치를 표시했습니다.
            점선 칩은 그 위치를 나타냅니다.
          </Callout>

          <div
            style={styles.wrap}
            aria-label="중심 단어와 선택한 주변 문맥"
          >
            {TOKENS.map((token) => {
              const center = token.offset === 0;
              const selected =
                !center && Math.abs(token.offset) <= contextRadius;

              return (
                <span
                  key={token.offset}
                  aria-label={`${token.word}: ${
                    center
                      ? "중심 단어"
                      : selected
                        ? "선택한 주변 문맥"
                        : "제외"
                  }`}
                  style={{
                    ...chipStyle(selected, center),
                    borderStyle: token.placeholder ? "dashed" : "solid",
                  }}
                >
                  {token.word}
                </span>
              );
            })}
          </div>

          <div style={{ ...styles.wrap, ...styles.small }}>
            <span style={{ color: theme.text.accent }}>중심 단어</span>
            <span style={{ color: theme.text.success }}>
              선택한 주변 단어
            </span>
            <span style={{ color: theme.text.tertiary }}>제외</span>
          </div>

          <div style={styles.scroll}>
            <Diagram
              direction="vertical"
              nodes={[
                {
                  id: "input",
                  label: isCbow ? "주변 단어 여러 개" : "가운데 단어",
                  detail: isCbow ? contextWords : "고양이를",
                },
                {
                  id: "vectors",
                  label: isCbow
                    ? "벡터 조회 → 벡터 평균"
                    : "벡터 조회",
                },
                {
                  id: "output",
                  label: isCbow
                    ? "가운데 단어 예측"
                    : "주변 단어 각각 예측",
                  detail: isCbow ? "고양이를" : contextWords,
                },
              ]}
              edges={[
                { from: "input", to: "vectors" },
                { from: "vectors", to: "output" },
              ]}
            />
          </div>

          <div
            role="group"
            aria-label="학습 단계 선택"
            style={styles.wrap}
          >
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

          <div
            style={styles.box}
            aria-live="polite"
            aria-atomic="true"
          >
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
              onClick={() =>
                setStage((value) => Math.max(0, value - 1))
              }
              style={buttonStyle(false, stage === 0)}
            >
              이전
            </button>

            <button
              type="button"
              onClick={reset}
              style={buttonStyle()}
            >
              전체 초기화
            </button>

            <button
              type="button"
              disabled={stage === 3}
              onClick={() =>
                setStage((value) => Math.min(3, value + 1))
              }
              style={buttonStyle(false, stage === 3)}
            >
              다음
            </button>
          </div>
        </div>

        <Text>
          실제 논문의 Skip-gram은 학습 위치마다 문맥 범위를 무작위로
          선택합니다. 위 실험은 입력과 정답을 비교하기 위해 범위를
          고정했습니다. 실제 단어 벡터 학습을 실행하는 실험은 아닙니다.
          (원문 §3.2)
        </Text>
      </Section>

      <Section
        id="vectors"
        heading="단어 벡터는 어떻게 의미를 갖게 될까요?"
      >
        <Text>
          처음부터 컴퓨터가 ‘고양이’의 뜻을 알고 있는 것은 아닙니다.
          단어는 학습 과정에서 숫자 벡터로 표현됩니다.
        </Text>

        <Callout lead="단어 임베딩 테이블 (예시)" tone="info">
          아래 숫자는 이해를 위한 가상 예시입니다.
          논문의 실제 학습 결과가 아닙니다.
        </Callout>

        <div style={styles.scroll}>
          <Table
            columns={["단어", "차원 1", "차원 2"]}
            rows={VECTOR_EXAMPLES.map(({ word, x, y }) => [
              word,
              String(x),
              String(y),
            ])}
          />
        </div>

        <figure style={{ ...styles.box, margin: 0 }}>
          <svg
            viewBox="0 0 360 250"
            role="img"
            aria-labelledby="w2v-vector-title w2v-vector-desc"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              overflow: "hidden",
            }}
          >
            <title id="w2v-vector-title">
              가상 단어 벡터의 방향 (예시)
            </title>
            <desc id="w2v-vector-desc">
              고양이는 0.8, 0.7입니다.
              강아지는 0.7, 0.8입니다.
              자동차는 -0.7, 0.1입니다.
              고양이와 강아지는 비슷한 방향을 가리킵니다.
            </desc>

            <line
              x1="20"
              y1="132"
              x2="344"
              y2="132"
              stroke={theme.border.strong}
            />
            <line
              x1="180"
              y1="228"
              x2="180"
              y2="20"
              stroke={theme.border.strong}
            />

            <text
              x="342"
              y="158"
              textAnchor="end"
              style={{
                ...theme.font.caption,
                fill: theme.text.secondary,
              }}
            >
              차원 1
            </text>
            <text
              x="192"
              y="24"
              style={{
                ...theme.font.caption,
                fill: theme.text.secondary,
              }}
            >
              차원 2
            </text>

            {VECTOR_EXAMPLES.map((vector, index) => {
              const color =
                index === 0
                  ? theme.text.accent
                  : index === 1
                    ? theme.text.success
                    : theme.text.secondary;

              // 두 축에 같은 배율을 사용합니다.
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
                      <path
                        d="M 0 0 L 10 5 L 0 10 Z"
                        fill={color}
                      />
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
                    style={{
                      ...theme.font.label,
                      fill: color,
                    }}
                  >
                    {vector.word}
                  </text>
                </g>
              );
            })}
          </svg>

          <figcaption style={styles.small}>
            방향이 비슷한 벡터끼리 코사인 유사도가 높습니다.
            실제 모델은 일반적으로 2차원이 아니라 훨씬 많은 차원을
            사용합니다.
          </figcaption>
        </figure>

        <Section heading="왜 고양이와 강아지가 가까워질 수 있을까요?">
          <Text>
            두 단어가 비슷한 문맥에서 자주 나타나면, 학습 과정에서
            비슷한 관계를 표현하도록 벡터가 조정될 수 있습니다.
          </Text>
          <Text>
            이 설명은 학습 결과를 이해하는 직관입니다.
            벡터를 서로 당기는 규칙 하나로 학습한다는 뜻은 아닙니다.
          </Text>
        </Section>
      </Section>

      <Section
        id="sampling"
        heading="Skip-gram은 왜 먼 단어를 덜 학습할까요?"
      >
        <Text>
          Skip-gram은 학습할 때마다 범위 R을 무작위로 선택합니다.
          최대 범위 C가 10이라면 R은 1부터 10까지의 정수 중 하나입니다.
          거리 k의 단어는 R이 k 이상일 때만 선택됩니다.
        </Text>

        <div
          style={{
            ...styles.box,
            ...theme.font.body1,
            overflowWrap: "anywhere",
          }}
        >
          P(거리 k 선택) = (C − k + 1) / C
        </div>

        <Text>
          C = 10으로 고정합니다.
          아래 R 값은 가능한 무작위 추출 결과 하나를 직접 설정한 것입니다.
        </Text>

        <div style={styles.stack}>
          {renderSlider({
            id: "w2v-radius",
            label: "선택된 범위 R",
            value: radius,
            min: 1,
            max: 10,
            onChange: setRadius,
          })}

          {renderSlider({
            id: "w2v-distance",
            label: "관찰할 단어의 거리 k",
            value: distance,
            min: 1,
            max: 10,
            onChange: setDistance,
          })}

          <div
            style={{
              ...styles.wrap,
              justifyContent: "center",
            }}
            aria-label="중심에서의 거리와 현재 문맥 선택"
          >
            {POSITIONS.map((position) => {
              const center = position === 0;
              const selected =
                !center && Math.abs(position) <= radius;
              const observed =
                !center && Math.abs(position) === distance;

              return (
                <span
                  key={position}
                  style={{
                    ...chipStyle(selected, center),
                    borderColor:
                      observed || center
                        ? theme.border.focus
                        : theme.border.default,
                  }}
                  aria-label={
                    center
                      ? "중심 단어"
                      : `${position < 0 ? "앞쪽" : "뒤쪽"} 거리 ${
                          Math.abs(position)
                        }, ${selected ? "선택" : "제외"}${
                          observed ? ", 관찰 중" : ""
                        }`
                  }
                >
                  {center
                    ? "중심"
                    : `${Math.abs(position)}${observed ? " ●" : ""}`}
                </span>
              );
            })}
          </div>

          <div style={styles.small}>
            숫자는 중심에서의 거리입니다.
            ●는 관찰 중인 거리입니다.
            선택한 문맥은 색으로 구분합니다.
          </div>

          <div aria-live="polite" aria-atomic="true">
            <Callout
              lead="현재 설정의 선택 여부"
              tone={included ? "success" : "warning"}
            >
              {included
                ? `거리 ${distance}의 단어가 포함됩니다. R = ${radius}가 k = ${distance} 이상입니다.`
                : `거리 ${distance}의 단어가 제외됩니다. R = ${radius}가 k = ${distance}보다 작습니다.`}
            </Callout>
          </div>

          <div style={{ ...styles.box, ...styles.stack }}>
            <div style={styles.label}>
              R을 1~10에서 균등하게 추출할 때 거리 {distance}가 포함될
              확률: {formatNumber(probability)}%
            </div>

            <div
              role="progressbar"
              aria-label={`거리 ${distance}의 선택 확률`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={probability}
              style={styles.track}
            >
              <div
                style={{
                  width: `${probability}%`,
                  height: "100%",
                  background: theme.fill.accent,
                  borderRadius: theme.radius.full,
                }}
              />
            </div>

            <div style={styles.small}>
              P = (10 − {distance} + 1) / 10 = {eligibleRadii}/10 ={" "}
              {formatNumber(probability)}%
            </div>
          </div>
        </div>

        <Text>
          거리 10의 단어는 R이 10일 때만 선택됩니다.
          확률은 10%입니다.
          거리 1의 단어는 모든 R에 포함됩니다.
          확률은 100%입니다.
        </Text>

        <Callout lead="현재 선택과 선택 확률은 다릅니다" tone="info">
          R을 바꾸면 이번 선택 여부가 바뀝니다.
          k를 고정하면 가능한 모든 R에서 계산한 선택 확률은 그대로입니다.
        </Callout>

        <Text>
          이는 거리와 실제 의미적 관련성을 매번 계산한 결과가 아닙니다.
          거리별 학습 빈도를 정한 설계 규칙입니다.
          먼 단어가 중요한 문장도 있으므로 이 규칙에는 한계가 있습니다.
          (원문 p.4, §3.2)
        </Text>
      </Section>

      <Section
        id="cost"
        heading="비선형 은닉층을 제거하면 얼마나 저렴해질까요?"
      >
        <div style={styles.stack}>
          {renderSlider({
            id: "w2v-dimension",
            label: "벡터 차원 D",
            value: dimension,
            min: 100,
            max: 1000,
            step: 100,
            onChange: setDimension,
          })}

          <Text>
            고정 조건: 어휘 V = 100만, CBOW 입력 단어 수 N = 8,
            Skip-gram 최대 범위 C = 10, log₂(V) ≈ 20.
          </Text>

          <div style={styles.scroll}>
            <Properties
              items={[
                {
                  label: "CBOW 계산량 Q",
                  value: `8D + 20D = ${formatNumber(costs.cbow)}`,
                },
                {
                  label: "Skip-gram 계산량 Q",
                  value: `10(D + 20D) = ${formatNumber(costs.skipgram)}`,
                },
              ]}
            />

            <Bars
              bars={[
                {
                  label: "CBOW",
                  value: costs.cbow,
                  display: formatNumber(costs.cbow),
                },
                {
                  label: "Skip-gram",
                  value: costs.skipgram,
                  display: formatNumber(costs.skipgram),
                },
              ]}
            />
          </div>
        </div>

        <Text>
          논문 식 4·5를 대입한 이론적 계산량입니다.
          실제 실행시간은 아닙니다.
          Skip-gram의 계산식은 문맥 단어별 분류 비용을 반영합니다.
        </Text>

        <Text>
          기존 NNLM은 N×D×H에 해당하는 비선형 은닉층 계산이 큰
          병목이었습니다. H는 은닉층 크기입니다.
          CBOW와 Skip-gram은 그 층을 제거했습니다.
          덕분에 더 큰 학습 데이터와 벡터 차원을 사용할 수 있었습니다.
          (원문 식 2·4·5, p.10)
        </Text>
      </Section>

      <Section id="results" heading="실제 실험은 어떤 결과였을까요?">
        <Text>
          동일한 학습량과 벡터 차원의 정확도 비교입니다.
          320M 학습 단어를 사용했습니다.
          벡터는 640차원입니다.
          단위는 %입니다.
          (원문 p.7, 표 3)
        </Text>

        <figure
          style={{
            ...styles.box,
            ...styles.stack,
            margin: 0,
          }}
        >
          <figcaption style={styles.small}>
            의미 정확도와 문법 정확도.
            모든 막대의 비교 축은 0~70%입니다.
          </figcaption>

          {RESULTS.map((result) => (
            <div
              key={result.model}
              style={{
                ...styles.stack,
                gap: 8,
              }}
            >
              <div style={styles.label}>{result.model}</div>

              {[
                {
                  label: "의미",
                  value: result.semantic,
                  color: theme.fill.accent,
                },
                {
                  label: "문법",
                  value: result.syntax,
                  color: theme.text.success,
                },
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

          <div style={styles.small}>
            각 지표에서는 높은 정확도가 좋은 결과입니다.
          </div>
        </figure>

        <Text>
          이 실험에서 CBOW는 문법 정확도 64%로 가장 높았습니다.
          Skip-gram은 의미 정확도 55%로 가장 높았습니다.
          어느 모델이 좋은지는 평가하는 관계에 따라 달라집니다.
        </Text>

        <Callout
          lead="표 4는 학습량이 같지 않습니다"
          tone="warning"
        >
          NNLM은 6B 단어를 사용했습니다.
          CBOW와 Skip-gram은 783M 단어를 사용했습니다.
          Moonlight 요약에서는 이 조건을 잘못 읽었습니다.
          서로 다른 실험 조건을 동일 조건의 승부로 해석하면 안 됩니다.
          (원문 p.8, 표 4)
        </Callout>
      </Section>

      <Section id="check" heading="이해 확인">
        <Text>
          문장에서 가운데 단어가 ‘고양이를’이라고 합시다.
          주변 단어는 ‘아이가’, ‘귀여운’, ‘보고’, ‘정말’입니다.
        </Text>

        <Callout lead="문제" tone="info">
          어느 모델이 주변 단어 네 개로 ‘고양이를’ 예측할까요?
          어느 모델이 ‘고양이를’ 하나로 주변 단어 네 개를 예측할까요?
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

        <div
          id="w2v-answer"
          hidden={!showAnswer}
          style={{ marginTop: 12 }}
        >
          <Callout lead="정답" tone="success">
            CBOW는 주변 단어 네 개로 ‘고양이를’ 예측합니다.
            Skip-gram은 ‘고양이를’로 주변 단어 네 개를 각각 예측합니다.
            (원문 §3.1~3.2)
          </Callout>
        </div>

        <Text>
          다음 연결고리는 어텐션(Attention)입니다.
          CBOW는 문맥 벡터를 평균합니다.
          Skip-gram은 거리에 따라 주변 단어의 학습 빈도를 다르게 만듭니다.
          이후 어텐션 논문에서는 문맥의 각 단어가 얼마나 중요한지를
          입력에 따라 계산하는 방식을 살펴보면 됩니다.
        </Text>
      </Section>
    </Page>
  );
}
