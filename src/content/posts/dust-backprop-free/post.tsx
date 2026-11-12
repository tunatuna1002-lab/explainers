import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Steps,
  Table,
  Properties,
  useGrokTheme,
  useState,
} from "@/components/canvas";

// 위젯 숫자는 모두 예시 값이다. 시퀀스 1개를 순전파 1번에 넣는 경우만 그린다.
const MIN_TOKENS = 1;
const MAX_TOKENS = 4096;
const AXIS_MAX_LOG = 4; // 로그 눈금 끝 = 10^4

// 후보 수 c를 로그 눈금 막대 끝 x 좌표로 바꾼다. c = 1이면 막대 길이 0이다.
const X0 = 180;
const X1 = 640;
const toX = (c: number) => X0 + (Math.log10(Math.max(c, 1)) / AXIS_MAX_LOG) * (X1 - X0);

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
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, Math.round(next))));
        }}
        style={{ width: "100%", minWidth: 0, minHeight: 36, margin: 0, accentColor: theme.text.accent }}
      />
    </div>
  );
}

function PopulationLab() {
  const theme = useGrokTheme();
  const [tokens, setTokens] = useState(2048);

  const esCount = 1; // 가중치 공간 ES: 후보 하나 = 시퀀스 하나
  const dustCount = tokens; // Dust: 토큰 하나 = 후보 하나
  const ratio = dustCount / esCount;

  const esColor = theme.dataviz.categorical[1];
  const dustColor = theme.dataviz.categorical[0];
  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  const rowLabel = { ...theme.font.subtext, fill: theme.text.primary };
  const valueLabel = { ...theme.font.subtext, fill: theme.text.primary, fontVariantNumeric: "tabular-nums" as const };
  const ticks = [1, 10, 100, 1000, 10000];
  const fmt = (n: number) => n.toLocaleString("ko-KR");

  const rows = [
    { y: 50, name: "가중치 공간 ES", sub: "(EGGROLL 등)", count: esCount, color: esColor },
    { y: 120, name: "Dust", sub: "(활성값 노이즈)", count: dustCount, color: dustColor },
  ];

  let now: string;
  if (tokens === 1) {
    now = "토큰이 1개면 두 방법 모두 후보 1개입니다. 슬라이더를 오른쪽으로 미십시오.";
  } else {
    now = `토큰 ${fmt(tokens)}개짜리 시퀀스 하나에서 Dust는 후보 ${fmt(dustCount)}개를 평가합니다. 가중치 공간 ES는 그대로 1개입니다. (예시)`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Callout lead="지금 보고 있는 것" tone="info">
        {now}
      </Callout>

      <figure style={{ margin: 0 }}>
        <svg
          viewBox="0 0 680 200"
          role="img"
          aria-labelledby="dust-lab-title dust-lab-desc"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <title id="dust-lab-title">순전파 1번에 평가하는 후보 수 비교 (예시)</title>
          <desc id="dust-lab-desc">
            위 막대는 가중치 공간 ES, 아래 막대는 Dust의 후보 수입니다. 가로축은 로그 눈금입니다.
          </desc>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={toX(t)} y1={24} x2={toX(t)} y2={160} stroke={theme.border.weak} />
              <text x={toX(t)} y={178} textAnchor="middle" style={caption}>
                {fmt(t)}
              </text>
            </g>
          ))}
          <line x1={X0} y1={160} x2={X1} y2={160} stroke={theme.border.strong} />
          {rows.map((r) => (
            <g key={r.name}>
              <text x={12} y={r.y + 4} style={rowLabel}>
                {r.name}
              </text>
              <text x={12} y={r.y + 22} style={caption}>
                {r.sub}
              </text>
              <rect
                x={X0}
                y={r.y - 12}
                width={Math.max(toX(r.count) - X0, 0)}
                height={28}
                rx={4}
                fill={r.color}
                fillOpacity={0.85}
              />
              <circle cx={toX(r.count)} cy={r.y + 2} r={5} fill={r.color} />
              <text
                x={Math.min(toX(r.count) + 10, X1 - 4)}
                y={r.y + 7}
                textAnchor={toX(r.count) + 10 > X1 - 60 ? "end" : "start"}
                style={valueLabel}
                dy={toX(r.count) + 10 > X1 - 60 ? -22 : 0}
              >
                {fmt(r.count)}개
              </text>
            </g>
          ))}
        </svg>
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
          가로축은 로그 눈금(1, 10, 100, ...)입니다. 시퀀스 1개를 순전파 1번에 넣는 경우만 그렸습니다. 모든 수치는 예시입니다.
        </figcaption>
      </figure>

      <Slider
        id="dust-tokens"
        label="시퀀스 길이 (토큰 수, 예시)"
        value={tokens}
        min={MIN_TOKENS}
        max={MAX_TOKENS}
        step={1}
        show={`${fmt(tokens)}개`}
        onChange={setTokens}
      />

      <Properties
        items={[
          { label: "시퀀스 길이 (예시)", value: `${fmt(tokens)} 토큰` },
          { label: "가중치 공간 ES 후보 수 (예시)", value: `${fmt(esCount)}개` },
          { label: "Dust 후보 수 (예시)", value: `${fmt(dustCount)}개` },
          { label: "Dust / ES (예시)", value: `${fmt(ratio)}배` },
        ]}
      />
    </div>
  );
}

export default function App() {
  return (
    <Page
      title="Dust: 역전파 없이 트랜스포머를 사전학습하기 (Q Labs)"
      summary="Dust는 역전파 없이 순전파만으로 트랜스포머 언어모델을 처음부터 사전학습하는 Q Labs의 학습 방법입니다. 핵심은 토큰 하나하나를 실험 후보 하나로 쓰는 것입니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "먼저 알아둘 용어", id: "terms" },
          { label: "작동 방식 (4단계)", id: "how" },
          { label: "가중치 공간 ES와의 차이", id: "vs-es" },
          { label: "node perturbation과의 차이", id: "vs-node" },
          { label: "다른 0차·대안 연구와의 차이", id: "vs-others" },
          { label: "원문이 밝힌 결과", id: "results" },
          { label: "한계 (원문이 직접 밝힌 것)", id: "limits" },
          { label: "왜 의미가 있나 (연구진 주장)", id: "why" },
          { label: "AI타임스 기사와 연결해서 보기", id: "article" },
          { label: "한 줄 정리", id: "wrap" },
          { label: "출처", id: "source" },
        ]}
      />

      <Section heading="먼저 알아둘 용어" id="terms">
        <Text>
          Dust는 Q Labs가 공개한 학습 방법입니다. 저자는 Samip Dahal, Bishwas Mandal, Serdar Gülbahar, Akshay Vegesna입니다.
        </Text>
        <Table
          columns={["용어", "뜻"]}
          rows={[
            [
              "역전파(backprop)",
              "오차를 출력층에서 앞쪽 층으로 거꾸로 전달하며 미분(체인룰)으로 기울기를 계산하는 방식. 지금 딥러닝 학습의 표준입니다.",
            ],
            [
              "0차(zeroth-order) 방법",
              "미분을 쓰지 않습니다. 값을 조금 흔들어 보고 loss가 어떻게 변하는지 관찰해서 기울기를 추정합니다.",
            ],
            [
              "진화 전략(ES, evolution strategies)",
              "0차 방법의 한 종류. 무작위로 변형한 후보를 많이 만들어 시험하고, 좋은 후보 쪽으로 이동합니다.",
            ],
            ["population", "ES에서 후보 집합을 부르는 이름입니다."],
            [
              "활성값(activation)",
              "모델이 토큰을 처리할 때 각 층이 내놓는 중간 계산값. 가중치와는 다른 것입니다.",
            ],
          ]}
        />
      </Section>

      <Section heading="작동 방식 (4단계)" id="how">
        <Steps
          steps={[
            {
              title: "활성값에 노이즈 더하기",
              detail: "각 선형층의 출력(활성값)에 가우시안 노이즈를 더합니다. 노이즈는 토큰마다 독립적으로 넣습니다.",
            },
            { title: "순전파 한 번", detail: "순전파를 한 번 돌립니다." },
            {
              title: "토큰별 보상 매기기",
              detail: "토큰마다 loss가 얼마나 줄었는지를 그 노이즈의 보상으로 씁니다.",
            },
            {
              title: "기울기 만들기",
              detail:
                "보상으로 가중한 노이즈를 여러 번 평균하면 그 층 출력의 오차 추정값이 됩니다. 이 값을 층 입력과 외적(outer product)하면 가중치 기울기가 나옵니다.",
            },
          ]}
        />
        <Callout lead="중요한 점" tone="info">
          역전파도 똑같이 "출력 오차 × 입력" 외적으로 기울기를 계산합니다. 차이는 출력 오차를 어디서 얻느냐뿐입니다. 역전파는 체인룰로 계산하고, Dust는 population에서 추정합니다.
        </Callout>
      </Section>

      <Section heading="가중치 공간 ES와의 차이" id="vs-es">
        <Table
          columns={["구분", "가중치 공간 ES (EGGROLL 등)", "Dust"]}
          rows={[
            ["흔드는 곳", "가중치", "활성값"],
            [
              "후보 하나에 드는 것",
              "변형된 가중치 사본과 별도 순전파",
              "가중치 사본을 실제로 만들지 않음 (그 토큰에서는 가중치에 low-rank 변형을 준 것처럼 동작)",
            ],
            [
              "population의 제약",
              "EGGROLL은 low-rank 노이즈로 사본 비용을 줄였지만, 후보 하나가 여전히 배치의 시퀀스 하나. population이 순전파 횟수에 묶임",
              "원문 표현으로 virtual population. 토큰 하나가 후보 하나",
            ],
            ["순전파 한 번에 평가하는 후보", "1개", "수천 개 (한 시퀀스의 토큰이 수천 개이므로)"],
          ]}
        />
        <Text>
          아래 위젯은 이 차이를 숫자로 보여 줍니다. 시퀀스 길이 슬라이더를 움직여 보십시오. 가중치 공간 ES는 후보 1개로 그대로입니다. Dust는 토큰 수만큼 후보가 늘어납니다.
        </Text>
        <PopulationLab />
        <Callout lead="간섭 줄이기" tone="warning">
          여러 곳을 한 번에 흔들면 신호가 섞입니다. 그래서 Dust는 층 종류마다 순전파를 따로 돌립니다. 어텐션 내부(query, key, value 등)는 토큰 loss 대신 어텐션 출력의 추정 오차로 보상합니다.
        </Callout>
      </Section>

      <Section heading="node perturbation과의 차이" id="vs-node">
        <Text>
          활성값에 노이즈를 넣는 아이디어(node perturbation) 자체는 오래됐습니다(Widrow & Lehr 1990, Werfel 외 2003). 보통은 "활성값 차원이 가중치 차원보다 훨씬 작다"는 이유로 정당화합니다.
        </Text>
        <Text>
          원문은 토큰이 많은 트랜스포머에서는 이 차원 논리가 그대로 통하지 않는다고 봅니다. 그래서 연구진은 "토큰 축을 따라 population을 만든다"는 점을 Dust의 새 근거로 내세웁니다. 여기에 층 종류별 보상 규칙과 간섭 줄이기를 더했습니다.
        </Text>
      </Section>

      <Section heading="다른 0차·대안 연구와의 차이" id="vs-others">
        <Table
          columns={["연구", "그 연구의 특징", "Dust와의 차이"]}
          rows={[
            ["MeZO, Evolution Strategies at Scale", "이미 학습된 모델의 파인튜닝용", "Dust는 처음부터 하는 사전학습을 다룸"],
            ["KronZO (Allaire 외)", "사전학습을 다루지만 가중치에 노이즈를 줌", "Dust는 활성값에 노이즈를 줌"],
            [
              "PC-ALM (Sakana AI)",
              "국소 미분(local derivatives)을 씀. 이미지 분류에서 평가",
              "Dust는 트랜스포머 사전학습에서 순전파 노이즈만으로 credit을 추정",
            ],
          ]}
        />
      </Section>

      <Section heading="원문이 밝힌 결과" id="results">
        <Callout lead="원문의 주장">
          Dust는 "트랜스포머 언어모델 사전학습에서 역전파와 경쟁하는 첫 0차 방법"입니다.
        </Callout>
        <Table
          columns={["항목", "원문 내용"]}
          rows={[
            [
              "10만·100만 토큰 학습",
              "Dust가 역전파보다 낮은 loss로 끝남 (10만 토큰은 수백 draw부터, 100만 토큰은 1천 draw부터)",
            ],
            ["1000만·2000만 토큰 학습", "population이 클수록 역전파와의 차이가 줄어듦"],
            [
              "기존 ES 대비",
              "EGGROLL은 population을 256배(16k) 써도 Dust의 64 draw 결과에 못 미침. 연구진의 외삽(extrapolation)으로는 100만 토큰 이상에서 Dust가 10^3~10^4배 효율적",
            ],
            [
              "모델 크기",
              "0차 방법은 큰 모델에서 안 된다는 통념과 반대로, 243M 파라미터 모델이 120배 작은 모델보다 대부분의 population 크기에서 더 좋았음",
            ],
            [
              "기울기 정렬",
              "population이 커질수록 Dust의 기울기 방향이 역전파 기울기와 더 비슷해짐. 시험한 모든 규모(10억 토큰까지)에서 잘 정렬된 상태 유지",
            ],
            [
              "Adam 옵티마이저",
              "Adam에서도 동작. 100만 토큰 Adam 실험에서 Dust 곡선을 거듭제곱 법칙(power law)으로 맞춘 극한값은 5.248로, 역전파보다 낮음 (95% 구간 5.17~5.30)",
            ],
          ]}
        />
        <Callout lead="읽을 때 주의" tone="warning">
          5.248은 실측값이 아닙니다. 맞춤 곡선의 극한값입니다.
        </Callout>
      </Section>

      <Section heading="한계 (원문이 직접 밝힌 것)" id="limits">
        <Table
          columns={["한계", "내용"]}
          rows={[
            [
              "연산 효율",
              "이 논문의 초점이 아니었음. 원문은 Dust가 역전파의 실용적 대안이 되려면 연산 효율이 몇 자릿수 더 좋아져야 한다고 씀",
            ],
            ["\"역전파보다 낮은 loss\"의 조건", "population을 크게 써서, 즉 연산을 훨씬 많이 들여서 얻은 결과"],
            [
              "실험 규모",
              "모델은 최대 243M, 학습은 최대 2000만 토큰. 기울기 정렬 측정만 10억 토큰까지 함",
            ],
            [
              "EGGROLL 비교",
              "저자들이 만든 \"트랜스포머용 EGGROLL 구현\"과 비교한 것. 10^3~10^4배는 외삽 수치",
            ],
          ]}
        />
      </Section>

      <Section heading="왜 의미가 있나 (연구진 주장)" id="why">
        <Text>
          Dust는 모델이 끝까지 미분 가능할 필요가 없습니다. 그래서 역전파로 학습하기 어려운 구조도 학습할 수 있을 것으로 연구진은 기대합니다. 예를 들면 외부 프로그램이 들어간 네트워크나 여러 단계 반복(loop)하는 트랜스포머입니다.
        </Text>
        <Callout lead="아직 검증 전" tone="warning">
          원문은 이것을 후속 과제로 남겼습니다.
        </Callout>
      </Section>

      <Section heading="AI타임스 기사와 연결해서 보기" id="article">
        <Text>
          AI타임스 기사 "역전파 없는 AI 학습 실험, 열흘 만에 4000배 빨라져"에 나온 "1.76시간 → 1.6초"는 Dust 논문 자체의 결과가 아닙니다. Dust를 바탕으로 한 Q Labs 오픈소스 대회 '노이즈(Noise)'의 기록입니다.
        </Text>
        <Properties
          items={[
            { label: "모델", value: "3770만 파라미터 GPT" },
            { label: "데이터", value: "FineWeb 1000만 토큰" },
            { label: "목표 검증 loss", value: "4.2" },
            { label: "최저 loss 변화", value: "4.167 → 3.676 (Adam 역전파 기준치 3.769보다 낮음)" },
            { label: "10월 22일부터 바뀐 조건 (기사 기준)", value: "3000만 토큰, H100 8개 단일 노드, 목표 loss 3.5" },
          ]}
        />
        <Callout lead="읽을 때 주의" tone="warning">
          양쪽에 같은 옵티마이저를 쓴 비교에서는 역전파가 여전히 앞섰습니다. 또 1.6초와 3.676은 서로 다른 평가에서 나온 기록입니다.
        </Callout>
      </Section>

      <Section heading="한 줄 정리" id="wrap">
        <Callout lead="정리" tone="success">
          기존 ES는 가중치에 노이즈를 넣어 순전파 한 번에 후보 하나를 평가했습니다. Dust는 활성값에 토큰별로 노이즈를 넣어 같은 순전파 한 번에 수천 후보를 평가합니다. 이 차이로 population 비용이 크게 줄었다는 것이 원문의 핵심 주장입니다.
        </Callout>
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Samip Dahal, Bishwas Mandal, Serdar Gülbahar, Akshay Vegesna. "Dust: Pretraining Transformers Without Backpropagation". Q Labs, 2026. https://qlabs.sh/research/dust/
        </Text>
        <Text>
          AI타임스. "역전파 없는 AI 학습 실험, 열흘 만에 4000배 빨라져…1.76시간→1.6초". 2026-10-26. https://www.aitimes.com/news/articleView.html?idxno=216671
        </Text>
      </Section>
    </Page>
  );
}
