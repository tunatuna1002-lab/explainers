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
          style={{ ...theme.font.subtext, color: theme.text.secondary, display: "flex", justifyContent: "space-between" }}
        >
          <span>배치 크기 (학생 수)</span>
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

export default function App() {
  return (
    <Page
      title="레이어 정규화 쉽게 보기 (Ba·Kiros·Hinton, 2016)"
      summary="레이어 정규화는 평균을 내는 방향을 바꿉니다. 여러 샘플의 같은 뉴런이 아니라, 샘플 하나 안의 모든 뉴런으로 평균을 냅니다. 그래서 배치 크기와 상관없고, 학습 때와 테스트 때 계산이 똑같습니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "직접 움직여 보기", id: "lab" },
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
            ["뉴런(neuron, hidden unit)", "층 안의 계산 칸 하나. 비유에서는 과목 하나"],
            ["정규화(normalization)", "값들을 평균 0, 퍼짐 1로 다시 맞추는 일"],
            ["gain·bias", "정규화 뒤 다시 곱하고 더하는 조절값. 뉴런마다 하나씩, 학습으로 정함"],
            ["시점(time-step)", "RNN이 문장을 한 단어씩 읽을 때 몇 번째 단어인지"],
          ]}
        />
      </Section>

      <Section heading="직접 움직여 보기" id="lab" caption="모든 점수와 수치는 예시입니다">
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
          RNN(순환 신경망, recurrent neural network)에서 차이가 특히 큽니다. BatchNorm은 시점마다 통계를 따로 저장합니다.
          그래서 테스트 문장이 학습 때 본 어떤 문장보다 길면 쓸 통계가 없습니다. LayerNorm은 그 시점의 값만으로 계산하므로 이
          문제가 없습니다 (p.3 §3.1).
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
            ["샘플 하나 안의 모든 뉴런 값으로 평균·분산 계산", "p.1 초록"],
            ["학습 때와 테스트 때 계산이 똑같음", "p.1 초록"],
            ["BatchNorm은 미니배치로 통계를 추정해 배치 크기에 제약", "p.2 §2"],
            ["배치 크기 제약 없음, 배치 1로도 사용 가능", "p.2 §3"],
            ["RNN: 시점마다 따로 정규화, gain·bias는 모든 시점 공유", "p.3 §3.1"],
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
          배치 크기가 1일 때, BatchNorm은 왜 곤란하고 LayerNorm은 왜 괜찮을까요? 위젯에서 배치 크기를 1로 두고 두 방법을
          번갈아 본 뒤, 먼저 말로 답해 보십시오.
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
