import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Table,
  Properties,
  Segmented,
  useGrokTheme,
  useState,
  useMemo,
} from "@/components/canvas";

// 이 글의 숫자는 두 논문 PDF(arXiv:2001.08361v1, arXiv:2203.15556v1)에서 다시 확인한 값이다.
// 슬라이더와 곡선의 값은 PDF에 적힌 지수와 상수로 계산한 것이고, 새로 지어낸 숫자는 없다.

const EXP = {
  kaplan: { model: 0.73, data: 0.27 },
  chinchilla: { model: 0.5, data: 0.5 },
};

const fmtTimes = (m: number) =>
  m >= 100 ? `${Math.round(m).toLocaleString("ko-KR")}배` : `${m.toFixed(1)}배`;

function ComputeSplit() {
  const theme = useGrokTheme();
  const [k, setK] = useState(3);
  const C = Math.pow(10, k);
  const groups = [
    { title: "Kaplan (2020) 처방", e: EXP.kaplan },
    { title: "Chinchilla (2022) 처방", e: EXP.chinchilla },
  ];
  const TRACK_X = 130;
  const TRACK_W = 380;
  const DECADES = 4;
  const ROW_H = 30;
  const rows: { y: number; label: string; m: number; color: string; title?: string }[] = [];
  let y = 0;
  groups.forEach((g) => {
    y += 26;
    rows.push({ y, label: "", m: 0, color: "", title: g.title });
    y += 10;
    rows.push({ y: (y += ROW_H) - ROW_H, label: "모델 크기", m: Math.pow(C, g.e.model), color: theme.dataviz.categorical[0] });
    rows.push({ y: (y += ROW_H) - ROW_H, label: "데이터(토큰)", m: Math.pow(C, g.e.data), color: theme.dataviz.categorical[1] });
    y += 8;
  });
  const H = y + 6;
  const small = { fontSize: theme.font.label.fontSize, fill: theme.text.secondary };
  const body = { fontSize: theme.font.body2.fontSize, fill: theme.text.primary };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        htmlFor="compute-k"
        style={{ ...theme.font.subtext, color: theme.text.secondary, display: "flex", justifyContent: "space-between" }}
      >
        <span>연산량(compute)을 몇 배로 늘릴까요?</span>
        <output htmlFor="compute-k" style={{ color: theme.text.primary, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(C).toLocaleString("ko-KR")}배
        </output>
      </label>
      <input
        id="compute-k"
        type="range"
        min={0}
        max={4}
        step={1}
        value={k}
        aria-valuetext={`${Math.round(C).toLocaleString("ko-KR")}배`}
        onChange={(e) => {
          const next = Number(e.currentTarget.value);
          if (Number.isFinite(next)) setK(Math.min(4, Math.max(0, Math.round(next))));
        }}
        style={{ width: "100%", minWidth: 0, minHeight: 36, margin: 0, accentColor: theme.text.accent }}
      />
      <svg
        viewBox={`0 0 640 ${H}`}
        width="100%"
        role="img"
        aria-label="연산을 늘릴 때 두 논문이 모델과 데이터를 각각 몇 배 늘리라고 하는지 보여 주는 막대 그림"
      >
        {rows.map((r, i) =>
          r.title ? (
            <text key={i} x={0} y={r.y} style={{ ...body, fontWeight: 600 }}>
              {r.title}
            </text>
          ) : (
            <g key={i}>
              <text x={0} y={r.y + 15} style={small}>
                {r.label}
              </text>
              <rect x={TRACK_X} y={r.y + 2} width={TRACK_W} height={18} rx={4} style={{ fill: theme.fill.secondary }} />
              <rect
                x={TRACK_X}
                y={r.y + 2}
                width={Math.max(3, (Math.log10(r.m) / DECADES) * TRACK_W)}
                height={18}
                rx={4}
                style={{ fill: r.color }}
              />
              <text x={TRACK_X + TRACK_W + 12} y={r.y + 16} style={{ ...body, fontWeight: 600 }}>
                {fmtTimes(r.m)}
              </text>
            </g>
          ),
        )}
      </svg>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", ...theme.font.label, color: theme.text.secondary }}>
        <span>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, marginRight: 6, background: theme.dataviz.categorical[0] }} />
          모델 크기
        </span>
        <span>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, marginRight: 6, background: theme.dataviz.categorical[1] }} />
          데이터
        </span>
        <span>막대 길이는 로그 눈금입니다. 전체 폭이 10,000배이고, 폭의 4분의 1마다 10배씩 커집니다.</span>
      </div>
    </div>
  );
}

type Scale = "linear" | "log";

function LogScaleDemo() {
  const theme = useGrokTheme();
  const [scale, setScale] = useState<Scale>("log");
  const X0 = 64;
  const X1 = 610;
  const Y0 = 236;
  const Y1 = 16;
  const pts = useMemo(() => {
    const out: { n: number; l: number }[] = [];
    for (let i = 0; i <= 60; i++) {
      const n = Math.pow(10, 3 + (6 * i) / 60);
      out.push({ n, l: Math.pow(n / 8.8e13, -0.076) });
    }
    return out;
  }, []);
  const xOf = (n: number) =>
    scale === "log" ? X0 + ((Math.log10(n) - 3) / 6) * (X1 - X0) : X0 + (n / 1e9) * (X1 - X0);
  const yOf = (l: number) =>
    scale === "log"
      ? Y0 - ((Math.log10(l) - Math.log10(2)) / (Math.log10(7) - Math.log10(2))) * (Y0 - Y1)
      : Y0 - ((l - 2) / 5) * (Y0 - Y1);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.n).toFixed(1)},${yOf(p.l).toFixed(1)}`).join(" ");
  const xTicks =
    scale === "log"
      ? [
          { v: 1e3, t: "10³" },
          { v: 1e5, t: "10⁵" },
          { v: 1e7, t: "10⁷" },
          { v: 1e9, t: "10⁹" },
        ]
      : [
          { v: 1, t: "0" },
          { v: 2.5e8, t: "2.5억" },
          { v: 5e8, t: "5억" },
          { v: 7.5e8, t: "7.5억" },
          { v: 1e9, t: "10억" },
        ];
  const yTicks = [2, 3, 4, 5, 6, 7];
  const small = { fontSize: theme.font.label.fontSize, fill: theme.text.secondary };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Segmented<Scale>
        options={[
          { value: "linear", label: "보통 눈금" },
          { value: "log", label: "로그 눈금" },
        ]}
        value={scale}
        onChange={setScale}
      />
      <svg viewBox="0 0 640 280" width="100%" role="img" aria-label="Kaplan 식으로 그린 손실 곡선을 보통 눈금과 로그 눈금으로 바꿔 보는 그림">
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} style={{ stroke: theme.border.strong }} />
        <line x1={X0} y1={Y0} x2={X0} y2={Y1} style={{ stroke: theme.border.strong }} />
        {xTicks.map((t) => (
          <g key={t.t}>
            <line x1={xOf(t.v)} y1={Y0} x2={xOf(t.v)} y2={Y0 + 5} style={{ stroke: theme.border.strong }} />
            <text x={xOf(t.v)} y={Y0 + 20} textAnchor="middle" style={small}>
              {t.t}
            </text>
          </g>
        ))}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={X0} y1={yOf(v)} x2={X1} y2={yOf(v)} style={{ stroke: theme.border.subtle }} />
            <text x={X0 - 10} y={yOf(v) + 4} textAnchor="end" style={small}>
              {v}
            </text>
          </g>
        ))}
        <path d={path} style={{ fill: "none", stroke: theme.dataviz.categorical[0], strokeWidth: 2.5 }} />
        <text x={(X0 + X1) / 2} y={274} textAnchor="middle" style={small}>
          파라미터 수 (임베딩 제외)
        </text>
        <text x={14} y={(Y0 + Y1) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(Y0 + Y1) / 2})`} style={small}>
          시험 손실
        </text>
      </svg>
    </div>
  );
}

export default function App() {
  return (
    <Page
      title="스케일링 법칙 쉽게 보기 (Kaplan 외, 2020 · Hoffmann 외, 2022)"
      summary="Kaplan(2020)은 연산이 늘면 대부분 모델을 키우라고(모델 0.73, 데이터 0.27) 했고, Chinchilla(2022)는 학습률 일정을 학습 길이에 맞춰 더 큰 모델로 다시 재서 모델과 데이터를 같은 비율(약 0.5씩)로 키워야 한다고 고쳤습니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "먼저 볼 그림: 연산을 어디에 쓸까", id: "compute" },
          { label: "논문 1 Kaplan", id: "kaplan" },
          { label: "논문 2 Chinchilla", id: "chinchilla" },
          { label: "두 논문의 관계", id: "relation" },
          { label: "출처", id: "sources" },
        ]}
      />

      <Section heading="먼저 볼 그림: 연산을 어디에 쓸까" id="compute">
        <Text>
          아래 그림은 연산량을 늘릴 때 두 논문이 모델과 데이터를 각각 몇 배씩 키우라고 하는지 보여 줍니다. 슬라이더를
          1,000배에 두면 차이가 가장 잘 보입니다. 아래 Kaplan 5단계와 Chinchilla 5단계에서 이 숫자를 다시 씁니다.
        </Text>
        <ComputeSplit />
        <Callout lead="그림의 숫자" tone="info">
          연산 배수는 직접 고르는 값(예시)입니다. 모델과 데이터 배수는 PDF의 지수로 계산했습니다. Kaplan은 0.73과 0.27, Chinchilla는
          접근 1의 0.50과 0.50입니다 (Chinchilla p.8, 표 2).
        </Callout>
        <Text>
          두 PDF의 본문, 그림·표 캡션, 부록을 끝까지 읽었습니다. 본문에 쓴 숫자는 모두 원문에서 다시 찾아 확인했습니다. 배수 계산은
          코드로 검산했습니다.
        </Text>
      </Section>

      <Section heading="논문 1 Kaplan: Scaling Laws for Neural Language Models (2020)" id="kaplan">
        <Section heading="맨 앞: 한 줄 요약과 비유">
          <Callout lead="한 줄 요약" tone="info">
            저자들은 언어 모델의 손실이 모델 크기, 데이터, 연산량에 따라 일정한 비율로 줄어든다는 것을 실험으로 보이고, 연산이 늘면
            주로 모델을 키우라고 처방했습니다.
          </Callout>
          <Text>
            <strong>한 장면 비유.</strong> 한 학생이 문제집으로 공부해서 시험 오답을 줄여 가는 장면입니다. 머리가 클수록, 푼 문제가
            많을수록, 공부에 쓴 노력이 클수록 오답이 일정한 비율로 줄어듭니다. 저자들은 "노력을 더 쓸 수 있으면 대부분은 머리를
            키우는 데 쓰고, 문제집은 조금만 늘려라"라고 결론 냅니다.
          </Text>
          <Table
            columns={["비유", "실제 대응"]}
            rows={[
              ["학생", "언어 모델"],
              ["머리 크기", "파라미터 수 (N)"],
              ["푼 문제 수", "학습 토큰 수 (D)"],
              ["공부에 쓴 총 노력", "연산량 (C)"],
              ["오답", "시험 손실 (test loss)"],
            ]}
          />
          <Callout lead="비유의 한계" tone="warning">
            오답은 0까지 줄지 않습니다. 언어 자체에 예측할 수 없는 부분이 있기 때문입니다. 저자들도 언젠가는 줄어드는 속도가
            평평해져야 한다고 씁니다 (p.3, §1.1).
          </Callout>
        </Section>

        <Section heading="먼저 알아 둘 것">
          <Text>
            <strong>① 거듭제곱 법칙 (power law, 한 쪽을 몇 배 늘리면 다른 쪽이 정해진 비율로 줄어드는 관계).</strong> 1분 설명: 머리를
            2배로 키울 때마다 오답이 늘 같은 비율로 줄어드는 규칙입니다. 이 논문에서 쓰이는 곳: 저자들은 모델을 2배로 키우면 손실이 약
            0.95배가 된다고 씁니다 (p.5, §1.2). 손실이 약 5% 줄어든다는 뜻입니다.
          </Text>
          <Text>
            <strong>② 로그 눈금 그래프 (log scale, 눈금 한 칸이 "더하기 1"이 아니라 "곱하기 10"인 그래프).</strong> 1분 설명: 1, 10,
            100, 1000이 같은 간격으로 놓인 자입니다. 그래서 아주 작은 값과 아주 큰 값을 한 그림에 담을 수 있습니다.
          </Text>
          <Table
            columns={["읽는 순서", "무엇을 보나"]}
            rows={[
              ["1", "축 아래 작은 숫자(10⁶, 10⁹)를 먼저 봅니다. 한 칸 = 10배입니다."],
              ["2", "두 축이 모두 로그 눈금일 때 점들이 곧은 직선 위에 있으면 거듭제곱 법칙입니다."],
              ["3", "선이 가파를수록 한 쪽을 늘렸을 때 다른 쪽이 더 많이 변합니다. 기울기가 곧 지수(exponent, 몇 제곱인지 나타내는 수)입니다."],
            ]}
          />
          <Text>
            아래 그림에서 눈금을 바꿔 보십시오. 같은 곡선이 보통 눈금에서는 왼쪽에 꺾인 모양으로 몰리고, 로그 눈금에서는 곧은 직선이
            됩니다.
          </Text>
          <LogScaleDemo />
          <Callout lead="그림의 곡선" tone="info">
            Kaplan 식 (1.1)의 숫자(지수 0.076, 상수 8.8×10¹³)로 계산해 그린 곡선입니다 (p.4, §1.2). 실제 실험 점이 아닙니다.
          </Callout>
          <Text>
            이 논문에서 쓰이는 곳: 그림 1의 세 칸은 가로축이 로그 눈금입니다. 세로축(손실)도 로그 눈금으로 그려져 있습니다(눈금
            간격으로 판단). 세 칸 모두 점이 거의 직선 위에 있습니다. 저자들은 이것을 근거로 거듭제곱 법칙이라고 부릅니다 (p.3, 그림 1).
          </Text>
        </Section>

        <Section heading="7단계 1) 개관 (p.1~2, §1·§2)">
          <Text>
            경험 법칙을 찾는 실험 연구입니다. 저자들은 GPT 계열 트랜스포머(Transformer)를 WebText2라는 웹 글 데이터로
            학습시켰습니다. OpenAI(일부 Johns Hopkins 대학)의 Kaplan, McCandlish 등이 2020년 1월 arXiv에 냈습니다.
          </Text>
        </Section>

        <Section heading="7단계 2) 핵심 질문 (p.2, §1)">
          <Callout lead="핵심 질문" tone="info">
            언어 모델의 손실은 모델 크기, 데이터 양, 연산량, 모델 모양에 따라 어떻게 달라지고, 정해진 연산을 어디에 나눠 써야 하는가?
          </Callout>
        </Section>

        <Section heading="7단계 3) 지식 공백 (p.18, §7)">
          <Text>
            전에도 데이터 양과 성능 사이의 거듭제곱 관계는 일부 알려져 있었습니다. 그러나 모델 크기, 데이터, 연산량을 한꺼번에 바꾸며
            7자릿수가 넘는 넓은 범위에서 잰 연구는 없었습니다. 그래서 "돈을 더 쓸 수 있으면 무엇을 키울까"라는 질문에 숫자로 답할 수
            없었습니다. 이 논문이 채우는 빈칸이 바로 그 숫자입니다.
          </Text>
        </Section>

        <Section heading="7단계 4) 방법 평가 (p.7, §2.2·§3)">
          <Text>
            저자들은 768개에서 15억 개 파라미터까지의 모델, 2200만에서 230억 토큰까지의 데이터로 많은 모델을 학습시켰습니다 (p.7, §3).
            한 번에 한 가지만 바꾸며 재는 방식은 질문에 맞습니다. 하지만 비교가 공정하지 않은 곳이 있습니다. 모든 모델이 같은 학습
            길이(25만 걸음)와 같은 학습률 일정을 썼습니다 (p.7, §2.2). 짧게 학습한 결과는 "그 길이에 맞춰 계획을 세웠다면 나왔을
            손실"보다 나쁘게 기록됩니다. 이 점을 Chinchilla 저자들이 나중에 지적합니다.
          </Text>
          <Properties
            items={[
              {
                label: "학습 방법 (쉽게)",
                value:
                  "모델은 다음 단어를 맞히는 시험을 계속 봅니다. 손실 함수(loss function, 교차 엔트로피)는 얼마나 틀렸는지 매기는 채점표입니다. 최적화(optimization, Adam 방식)는 틀린 만큼 조금씩 고치는 방법입니다. 학습률 일정(learning rate schedule)은 처음엔 크게, 갈수록 작게 고치는 보폭 계획입니다.",
              },
              {
                label: "비용 (쉽게)",
                value:
                  "컴퓨터 몇 대로 며칠 걸렸는지는 논문에 안 나옴. 연산량 단위로는 PF-day(1초에 1000조 번 계산을 하루 동안 하는 양)를 씁니다. 그림 1 가로축은 10억분의 1 PF-day에서 10 PF-day까지입니다(그림 눈금 읽기).",
              },
            ]}
          />
        </Section>

        <Section heading="7단계 5) 결과만 보고 내린 결론 (p.3·4·16, 그림 1·3·14)">
          <Table
            columns={["가장 중요한 숫자", "무엇을 잰 숫자인가"]}
            rows={[
              [
                "그림 14: 연산량 10배 → 가장 좋은 모델 크기 약 5배, 처리하는 데이터 약 2배 (p.16)",
                "그 연산에서 시험 손실이 가장 낮은 모델의 크기",
              ],
              [
                "그림 3: 연산량 10억 배 → 모델 100만 배 넘게, 배치(batch, 한 번에 보는 문장 묶음) 약 100배, 순서대로 밟는 학습 걸음 10배 미만 (p.4)",
                "연산을 모델, 배치, 걸음 수에 어떻게 나누는지. 저자들의 지수로 다시 계산하면 각각 약 370만 배, 145배, 1.9배",
              ],
            ]}
          />
          <Callout lead="잠깐, 숫자만 보면 내 결론은?" tone="info">
            15억 파라미터 이하의 범위에서는 "연산이 늘면 모델을 데이터보다 훨씬 빨리 키우는 것이 손실을 가장 많이 줄인다"까지 말할 수
            있습니다. 그보다 큰 모델에서도 그런지는 이 숫자만으로는 말할 수 없습니다.
          </Callout>
        </Section>

        <Section heading="7단계 6) 저자 결론과 비교 (p.19, §8)">
          <Text>
            저자들은 "큰 모델이 큰 데이터보다 더 중요할 수 있다"라고 맺습니다. 측정 범위 안에서는 5단계 결론과 맞습니다. 과장으로 볼 수
            있는 곳은 두 군데입니다.
          </Text>
          <Callout lead="과장 의심 1: 범위 밖으로 늘려 쓰기" tone="warning">
            작은 모델에서 잰 기울기를 훨씬 큰 모델까지 그대로 늘려 씁니다. 저자들도 약 1조 파라미터 근처에서 자기 식끼리 모순이 생긴다고
            인정합니다 (p.17, §6.3). 다만 그 교차점에 "더 깊은 의미가 있다"는 부분은 추측(conjecture)이라고 밝혔습니다.
          </Callout>
          <Callout lead="과장 의심 2: 보정에 따라 바뀌는 기울기" tone="warning">
            0.73이라는 기울기는 배치 크기를 보정한 값입니다. 보정 전 그림에서는 0.88이었습니다 (p.16, 그림 14). 보정 방법에 따라 처방이
            바뀔 수 있다는 뜻입니다.
          </Callout>
        </Section>

        <Section heading="7단계 7) 다른 설명과 한계 (p.22~23, 부록 C)">
          <Table
            columns={["구분", "내용"]}
            rows={[
              [
                "다른 설명",
                "학습률 일정을 모든 모델에 똑같이 고정했기 때문에 \"적은 데이터로 짧게 학습\"한 결과가 실제보다 나빠 보였을 수 있습니다. 그러면 데이터를 덜 늘리라는 결론이 부풀려집니다. Chinchilla 저자들이 이 설명을 냅니다 (Chinchilla p.3, §2).",
              ],
              [
                "저자가 인정한 한계",
                "어떤 법칙에도 이론적 근거가 아직 없습니다. 아주 작은 데이터 범위는 거의 조사하지 않았습니다. 수렴까지 가지 않은 짧은 학습에서는 더 높은 학습률을 실험하지 않았습니다 (p.22~23, 부록 C).",
              ],
              [
                "(논문 밖) 이후 알려진 문제",
                "Pearce와 Song(2024)은 차이의 상당 부분이 Kaplan이 전체 파라미터 대신 임베딩을 뺀 파라미터를 센 것과, 분석을 작은 규모에서 한 것 때문이라고 보았습니다.",
              ],
            ]}
          />
        </Section>

        <Section heading="이후 연구 한 줄">
          <Text>
            (논문 밖) 2년 뒤 DeepMind의 Chinchilla 논문(2022)이 같은 질문을 더 큰 모델로 다시 재서, 데이터를 모델만큼 늘려야 한다고
            고쳤습니다.
          </Text>
        </Section>

        <Section heading="꼭 읽을 원문 문장">
          <Text>
            원문 문장을 그대로 옮기는 분량에는 제한이 있습니다. 그래서 위치와 검색어를 드리고 번역을 붙였습니다. PDF에서 검색어로
            찾으면 원문을 바로 확인할 수 있습니다.
          </Text>
          <Table
            columns={["역할", "위치 / 검색어", "번역", "왜 중요한가"]}
            rows={[
              [
                "핵심 질문",
                "p.2, §1 / \"empirically investigate the dependence\"",
                "저자들은 언어 모델 손실이 구조, 크기, 연산량, 데이터에 어떻게 달라지는지 트랜스포머(Transformer)를 중심으로 실험으로 조사하겠다고 씁니다.",
                "논문 전체가 무엇을 재는지 정하는 문장입니다.",
              ],
              [
                "핵심 아이디어",
                "p.3, §1.1 / \"power-law relationship with each of the three\"",
                "성능은 나머지 두 요인이 막지 않을 때 세 규모 요인 각각과 거듭제곱(power law) 관계를 가집니다.",
                "그림 1의 세 직선이 무엇을 뜻하는지 알려 줍니다.",
              ],
              [
                "핵심 결과",
                "p.5, §1.2 / \"spent primarily on larger models\"",
                "연산 예산이 늘면 주로 더 큰 모델에 쓰고, 학습 시간이나 데이터는 크게 늘리지 않아야 합니다.",
                "Chinchilla가 뒤집는 바로 그 처방입니다.",
              ],
              [
                "저자가 인정한 한계",
                "p.23, 부록 C / \"higher learning rates for training runs\"",
                "수렴까지 가지 않은 학습에서는 더 높은 학습률을 실험하지 않았습니다.",
                "짧은 학습을 불리하게 잰 약점이 여기서 드러납니다.",
              ],
            ]}
          />
        </Section>

        <Section heading="확인 질문과 답">
          <Callout lead="확인 질문" tone="info">
            연산량을 10배 늘릴 때 Kaplan 저자들은 모델과 데이터를 각각 대략 몇 배 늘리라고 했나요? 그리고 데이터는 조금만 늘려도 된다고
            본 이유를 "큰 모델"이라는 말을 넣어 설명해 보세요.
          </Callout>
          <Text>
            <strong>답과 근거.</strong> 모델은 약 5배, 처리하는 데이터는 약 2배입니다. 저자들은 그림 14 캡션에서 연산이 10배 늘 때 최적
            모델 크기는 5배 커지고 데이터는 2배 정도만 늘어난다고 적었습니다 (p.16, 그림 14). 데이터를 조금만 늘려도 되는 이유는 큰
            모델이 표본 효율(sample efficiency, 같은 성능에 이르는 데 필요한 데이터가 적은 정도)이 높기 때문입니다. 저자들은 큰 모델이
            작은 모델보다 더 적은 학습 걸음과 더 적은 데이터로 같은 성능에 이른다고 씁니다 (p.3, §1.1; 그림 2·4). 그래서 연산을
            효율적으로 쓰려면 아주 큰 모델을 수렴하기 훨씬 전에 멈추는 것이 좋다고 결론 냅니다 (p.3, §1.1; 그림 3, p.4).
          </Text>
        </Section>
      </Section>

      <Section heading="논문 2 Chinchilla: Training Compute-Optimal Large Language Models (2022)" id="chinchilla">
        <Section heading="맨 앞: 한 줄 요약과 비유">
          <Callout lead="한 줄 요약" tone="info">
            저자들은 정해진 연산량에서 모델 크기와 학습 데이터를 같은 비율로 늘려야 한다는 것을 400개 넘는 모델로 보이고, 4배 작은
            모델에 4배 많은 데이터를 준 Chinchilla로 확인했습니다.
          </Callout>
          <Text>
            <strong>한 장면 비유.</strong> 두 학생에게 똑같은 공부 시간이 주어진 장면입니다. 한 학생은 머리가 아주 크지만 문제집을
            조금만 풉니다(Gopher). 다른 학생은 머리가 4분의 1 크기지만 문제집을 4배 더 풉니다(Chinchilla). 시험에서는 두 번째 학생이
            이깁니다. 저자들은 "머리와 문제 양을 같은 비율로 늘려라"라고 결론 냅니다.
          </Text>
          <Table
            columns={["비유", "실제 대응"]}
            rows={[
              ["공부 시간", "연산 예산 (FLOPs)"],
              ["머리 크기", "파라미터 수"],
              ["문제 양", "학습 토큰 수"],
              ["시험", "MMLU 같은 평가 과제"],
              ["첫 번째 학생", "Gopher (2800억 파라미터, 3000억 토큰)"],
              ["두 번째 학생", "Chinchilla (700억 파라미터, 1.4조 토큰) (p.3, 표 1)"],
            ]}
          />
          <Callout lead="비유의 한계" tone="warning">
            두 모델은 크기와 데이터만 다른 것이 아닙니다. Chinchilla는 최적화 방식(AdamW), 토크나이저(tokenizer), 숫자 저장 정밀도도
            조금 다르게 썼습니다 (p.9, §4.1).
          </Callout>
        </Section>

        <Section heading="먼저 알아 둘 것">
          <Text>
            <strong>① 연산 예산 (compute budget, 학습에 쓸 수 있는 계산량의 한도, 단위 FLOPs).</strong> 1분 설명: 한 달 용돈이 정해져
            있으면, 큰 장난감 하나를 살지 작은 장난감과 책 여러 권을 살지 나눠야 합니다. 이 논문에서 쓰이는 곳: 저자들은 필요한 연산량이
            모델 크기와 학습 토큰 수를 곱한 값에 거의 비례한다고 봅니다 (p.7, §3.3; 부록 F). 그래서 같은 예산 안에서 한쪽을 키우면 다른
            쪽을 줄여야 합니다.
          </Text>
          <Text>
            <strong>② 같은 연산 곡선 (IsoFLOP curve, 연산량을 고정하고 모델 크기만 바꿔 가며 손실을 이은 곡선).</strong> 1분 설명: 같은
            용돈으로 장난감 크기를 바꿔 가며 사 보고 만족도를 점으로 찍으면, 너무 크지도 작지도 않은 곳에 가장 좋은 지점이 생깁니다. 이
            논문에서 쓰이는 곳: 그림 3 왼쪽입니다 (p.6, §3.2). 가로축(파라미터 수)은 로그 눈금입니다. 곡선마다 U자 모양의 골짜기가
            있습니다. 골짜기 바닥이 그 연산량에서 가장 좋은 모델 크기입니다. 가운데와 오른쪽 칸은 두 축이 모두 로그 눈금이고, 골짜기
            바닥들이 직선 위에 놓입니다. 앞에서 배운 대로 직선이면 거듭제곱 법칙입니다.
          </Text>
        </Section>

        <Section heading="7단계 1) 개관 (p.1, 초록; p.9, §4.1)">
          <Text>
            경험 법칙을 다시 재고, 그 예측을 실제 큰 모델로 검증한 실험 연구입니다. 저자들은 7000만에서 160억 파라미터 사이의 모델
            400개 이상을 TPUv3/TPUv4로 학습시켰습니다. DeepMind의 Hoffmann, Borgeaud, Mensch 등이 2022년 3월 arXiv에 냈습니다.
          </Text>
        </Section>

        <Section heading="7단계 2) 핵심 질문 (p.2, §1)">
          <Callout lead="핵심 질문" tone="info">
            연산 예산이 정해져 있을 때 모델 크기와 학습 토큰 수를 어떻게 나눠야 손실이 가장 낮아지는가?
          </Callout>
        </Section>

        <Section heading="7단계 3) 지식 공백 (p.1~3, §1·§2)">
          <Text>
            전에는 Kaplan 처방에 따라 연산 10배에 모델 5.5배, 토큰 1.8배를 늘리는 것이 정답으로 받아들여졌습니다 (p.1, §1). 그래서 당시
            큰 모델 대부분이 약 3000억 토큰만 학습했습니다 (p.3, 표 1). 그런데 Kaplan은 학습률 일정을 고정했고, 대부분 1억 파라미터보다
            작은 모델로 쟀습니다 (p.3, §2). 더 큰 모델에서 학습 길이에 맞춘 계획으로 다시 재면 처방이 같은지는 아무도 몰랐습니다.
          </Text>
        </Section>

        <Section heading="7단계 4) 방법 평가 (p.5~8, §3)">
          <Text>저자들은 서로 다른 세 가지 방법으로 같은 질문에 답했습니다.</Text>
          <Table
            columns={["방법", "하는 일", "근거"]}
            rows={[
              ["접근 1", "모델 크기를 고정하고 학습 길이를 4가지로 바꿈 → 각 연산량에서 가장 낮은 손실을 고름", "p.5, §3.1"],
              ["접근 2", "연산량 9가지를 고정하고 모델 크기를 바꿈 → U자 골짜기 바닥을 찾음", "p.5~6, §3.2"],
              ["접근 3", "모든 결과에 손실 공식 하나를 맞춤 → 공식에서 최적 지점을 계산함", "p.6~7, §3.3"],
            ]}
          />
          <Text>
            세 방법이 거의 같은 답을 내므로 질문에 잘 맞는 방법입니다. 학습률 일정을 각 학습 길이에 맞췄으므로 Kaplan보다 공정합니다.
            또 1e21 FLOPs라는 같은 예산에서 Kaplan 처방 모델(47.4억)과 자기 처방 모델(28억)을 직접 맞붙여 확인했습니다 (p.26, 부록
            D.4). 다만 마지막 큰 비교는 Chinchilla 대 Gopher 한 쌍뿐이고, 크기 말고 다른 차이도 섞여 있습니다.
          </Text>
          <Properties
            items={[
              {
                label: "학습 방법 (쉽게)",
                value:
                  "채점표(손실 함수)와 고치는 방법(최적화)은 Kaplan과 같은 원리입니다. 차이는 보폭 계획(학습률 일정)입니다. 저자들은 보폭을 줄이는 계획의 길이를 실제 공부 분량에 맞췄습니다. 계획이 실제보다 25% 넘게 길면 성능이 눈에 띄게 떨어졌습니다 (p.23, 그림 A1).",
              },
              {
                label: "비용 (쉽게)",
                value:
                  "TPU 몇 대로 며칠 걸렸는지는 논문에 안 나옴. Chinchilla 한 번의 학습에는 Gopher와 같은 연산(5.76×10²³ FLOPs)이 들었습니다 (p.5, 그림 2). PF-day로 바꾸면 약 6,700 PF-day입니다(PDF 숫자로 환산). Kaplan 그림 1 가로축 끝(10 PF-day)의 약 670배입니다.",
              },
            ]}
          />
        </Section>

        <Section heading="7단계 5) 결과만 보고 내린 결론 (p.8, 표 2; p.11, 표 6)">
          <Table
            columns={["방법", "모델 지수 a", "데이터 지수 b"]}
            rows={[
              ["접근 1", "0.50", "0.50"],
              ["접근 2", "0.49", "0.51"],
              ["접근 3", "0.46", "0.54"],
              ["Kaplan (2020)", "0.73", "0.27"],
            ]}
            emphasis={3}
          />
          <Text>
            표 2 (p.8): 연산량을 늘릴 때 모델 크기가 따라 커지는 정도(지수 a)와 데이터의 지수 b입니다. 맨 위 그림에서 연산 1,000배를
            고르면 Chinchilla 처방은 모델과 데이터가 각각 약 32배이고, Kaplan 처방은 모델 약 155배, 데이터 약 6.5배입니다.
          </Text>
          <Text>
            표 6 (p.11): MMLU(57개 과목 객관식 시험) 5-shot 평균 정확도에서 Chinchilla는 67.6%, Gopher는 60.0%입니다. 같은 연산량에서
            4배 작은 모델이 7.6%p 높습니다. 초록에는 67.5%로 적혀 있어 본문 표와 0.1%p 다릅니다 (p.1).
          </Text>
          <Text>참고로 Chinchilla는 파라미터 1개당 약 20토큰, Gopher는 약 1토큰을 학습했습니다(표 1 숫자로 계산).</Text>
          <Callout lead="잠깐, 숫자만 보면 내 결론은?" tone="info">
            연산이 늘면 모델과 데이터를 거의 반반씩 키워야 합니다. 또 같은 연산이면 작은 모델에 데이터를 더 준 쪽이 시험 정확도가
            높았습니다. 다만 큰 규모의 검증은 한 쌍뿐입니다.
          </Callout>
        </Section>

        <Section heading="7단계 6) 저자 결론과 비교 (p.1, 초록; p.15, §5)">
          <Text>
            저자들은 지금의 큰 모델들이 "상당히 덜 학습됐다(under-trained)"고 결론 냅니다. 5단계 결론과 맞습니다. 과장으로 볼 수 있는
            곳은 두 군데입니다.
          </Text>
          <Callout lead="과장 의심 1: 고르게 앞섰다?" tone="warning">
            초록은 Chinchilla가 Gopher를 "고르게(uniformly)" 앞섰다고 씁니다. 하지만 MMLU 57과목 중 4개, BIG-bench 62과제 중 4개에서는
            Gopher보다 낮았습니다 (p.11~12). PIQA는 81.8%로 같았습니다 (p.13, 표 8).
          </Callout>
          <Callout lead="과장 의심 2: 가설과 추측" tone="warning">
            "더 큰 모델 경쟁이 같은 예산으로 낼 수 있는 성능보다 낮은 모델을 만들고 있다"는 문장은 저자들이 스스로 가설(hypothesize)이라고
            밝힌 추측입니다 (p.15, §5). "데이터를 늘리는 것은 품질이 좋을 때만 이득"이라는 문장도 추측(speculatively)입니다 (p.16, §5).
          </Callout>
        </Section>

        <Section heading="7단계 7) 다른 설명과 한계 (p.15, §5; p.27, 부록 E; p.28, 부록 G)">
          <Table
            columns={["구분", "내용"]}
            rows={[
              [
                "다른 설명",
                "Chinchilla는 Adam 대신 AdamW를 썼습니다. 저자들의 부록 실험에서 AdamW가 Adam보다 좋았습니다 (p.28, 부록 G). 그래서 성능 차이의 일부는 크기와 데이터 배분이 아니라 이런 설정 차이에서 왔을 수 있습니다 (추정). 또 언어 모델링 점수는 데이터를 4배 더 봤기 때문에 시험 문제가 학습 데이터에 섞였을(train/test leakage) 수 있다고 저자들이 직접 주의를 줍니다 (p.10, §4.2.1).",
              ],
              [
                "저자가 인정한 한계",
                "큰 규모에서 비교할 수 있는 학습은 Chinchilla와 Gopher 두 번뿐입니다. 큰 연산에서 최적 모델 크기 곡선이 휘어 보여, 최적 크기를 아직도 크게 잡았을 수 있습니다. 분석에 쓴 학습은 모두 데이터를 한 바퀴(1 epoch)도 다 돌지 않았습니다 (p.15, §5). 한편 Chinchilla 본 학습에서는 Wikipedia 데이터를 약 3.4바퀴 돌았습니다 (p.22, 표 A1).",
              ],
              [
                "(논문 밖) 이후 알려진 문제",
                "Besiroglu 등(2024)은 Chinchilla의 접근 3 추정치에서 문제를 찾았고, 자기들이 다시 맞춘 값이 데이터에 더 잘 맞으며 접근 1·2와 일치한다고 보고했습니다.",
              ],
            ]}
          />
        </Section>

        <Section heading="이후 연구 한 줄">
          <Text>
            (논문 밖) 2024년에는 두 논문의 차이를 설명하는 연구들이 나왔습니다. Porian 등은 Pearce와 Song의 분석이 학습 초반
            워밍업(warmup) 길이 문제를 다루지 않았다고 지적하고, 학습률과 배치 크기를 세심하게 조정해 다시 쟀습니다.
          </Text>
        </Section>

        <Section heading="꼭 읽을 원문 문장">
          <Text>원문을 그대로 옮긴 것은 3번 문장 하나입니다. 나머지는 검색어로 PDF에서 확인하십시오.</Text>
          <Table
            columns={["역할", "위치 / 검색어", "원문 / 번역", "왜 중요한가"]}
            rows={[
              [
                "핵심 질문",
                "p.2, §1 / \"how should one trade-off model size\"",
                "번역: 정해진 FLOPs 예산에서 모델 크기와 학습 토큰 수를 어떻게 맞바꿔야 하는가?",
                "논문 전체가 이 질문 하나에 답합니다.",
              ],
              [
                "핵심 아이디어",
                "p.3, §2 / \"intermediate loss estimates\" \"130B tokens\"",
                "번역: 학습률 일정을 1300억 토큰에 고정하면, 더 짧은 학습의 중간 손실은 그 길이에 맞춘 학습보다 높게(나쁘게) 잡힙니다.",
                "Kaplan의 처방이 왜 모델 쪽으로 기울었는지 설명합니다.",
              ],
              [
                "핵심 결과",
                "p.1, 초록 / \"should be scaled equally\"",
                "원문: “the model size and the number of training tokens should be scaled equally” / 번역: 모델 크기와 학습 토큰 수는 같은 비율로 늘려야 합니다.",
                "이 논문이 남긴 처방 그 자체입니다.",
              ],
              [
                "핵심 결과",
                "p.11, §4.2.2 / \"67.6%\" \"Gopher by 7.6%\"",
                "번역: MMLU에서 Chinchilla는 훨씬 작은데도 평균 정확도 67.6%로 Gopher보다 7.6%p 높습니다.",
                "처방이 실제 시험 점수로 이어졌다는 증거입니다.",
              ],
              [
                "저자가 인정한 한계",
                "p.15, §5 / \"two comparable training runs\"",
                "번역: 큰 모델 학습 비용 때문에 큰 규모에서 비교할 수 있는 학습은 Chinchilla와 Gopher 두 번뿐입니다.",
                "큰 규모의 결론이 한 쌍의 비교에 기대고 있다는 뜻입니다.",
              ],
            ]}
          />
        </Section>

        <Section heading="확인 질문과 답">
          <Callout lead="확인 질문" tone="info">
            같은 연산량을 썼는데 왜 Gopher보다 4배 작은 Chinchilla가 MMLU 점수가 더 높았는지, "파라미터 수"와 "학습 토큰 수" 두 숫자를
            넣어 말로 설명해 보세요.
          </Callout>
          <Text>
            <strong>답과 근거.</strong> Gopher는 2800억 파라미터를 3000억 토큰으로 학습했고, Chinchilla는 700억 파라미터를 1.4조 토큰으로
            학습했습니다 (p.3, 표 1). 두 모델은 같은 연산량을 썼습니다 (p.9, §4). 저자들의 분석으로는 Gopher의 예산에서 가장 좋은 모델은
            4배 작고 4배 많은 토큰을 학습해야 합니다 (p.2, §1). 즉 Gopher는 크기에 비해 데이터를 너무 적게 본 덜 학습된(under-trained)
            모델이었습니다. 파라미터 1개당 토큰으로 보면 Gopher는 약 1개, Chinchilla는 약 20개입니다(표 1 숫자로 계산). 같은 연산을
            모델 크기와 데이터에 고르게 나눈 Chinchilla가 MMLU 5-shot 평균 정확도 67.6%로 Gopher의 60.0%보다 높았습니다 (p.11, 표 6). 다만
            AdamW 같은 설정 차이도 일부 기여했을 수 있습니다 (p.28, 부록 G; 추정).
          </Text>
        </Section>
      </Section>

      <Section heading="두 논문의 관계" id="relation">
        <Callout lead="한 줄로" tone="success">
          Kaplan은 연산이 늘면 대부분 모델을 키우라고(모델 0.73, 데이터 0.27) 했지만, Chinchilla는 학습률 일정을 학습 길이에 맞춰 더 큰
          모델로 다시 재서 모델과 데이터를 같은 비율(약 0.5씩)로 키워야 한다고 고쳤습니다.
        </Callout>
      </Section>

      <Section heading="출처" id="sources">
        <Table
          columns={["자료", "링크"]}
          rows={[
            [
              "Jared Kaplan 외, \"Scaling Laws for Neural Language Models\", 2020, arXiv:2001.08361",
              <a href="https://arxiv.org/abs/2001.08361">arxiv.org/abs/2001.08361</a>,
            ],
            [
              "Jordan Hoffmann 외, \"Training Compute-Optimal Large Language Models\", 2022, arXiv:2203.15556",
              <a href="https://arxiv.org/abs/2203.15556">arxiv.org/abs/2203.15556</a>,
            ],
            [
              "(논문 밖) Tim Pearce, Jinyeop Song, \"Reconciling Kaplan and Chinchilla Scaling Laws\", TMLR 2024",
              <a href="https://arxiv.org/abs/2406.12907">arxiv.org/abs/2406.12907</a>,
            ],
            [
              "(논문 밖) Tamay Besiroglu 외, \"Chinchilla Scaling: A replication attempt\", 2024",
              <a href="https://arxiv.org/abs/2404.10102">arxiv.org/abs/2404.10102</a>,
            ],
            [
              "(논문 밖) Porian 외, \"Resolving Discrepancies in Compute-Optimal Scaling of Language Models\", 2024",
              <a href="https://arxiv.org/abs/2406.19146">arxiv.org/abs/2406.19146</a>,
            ],
          ]}
        />
        <Callout lead="확인 방법">
          숫자(0.076, 0.95, 0.73, 0.27, 0.88, 5배와 2배, 768개~15억, 2200만~230억 토큰, 25만 걸음, 0.50·0.49·0.46, 5.76×10²³ FLOPs,
          67.6%와 60.0%, 81.8%, 47.4억과 28억, 약 3.4바퀴)는 두 PDF에서 추출한 본문과 대조했습니다. 쪽 번호도 PDF에서 다시
          확인했습니다. 그림 1 가로축 범위는 그림 눈금을 눈으로 읽은 값입니다. 배수와 환산 값은 코드로 계산했습니다. 그림 두 개는 논문
          그림을 옮기지 않고 새로 그렸습니다.
        </Callout>
      </Section>
    </Page>
  );
}
