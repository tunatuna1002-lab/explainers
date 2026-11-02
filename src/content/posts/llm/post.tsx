import {
  Page, Section, Text, Callout, Diagram, Steps, Table, Bars, Heatmap, Equation, Frac, Sqrt, Pow,
  Segmented, Properties, Grid, TableOfContents, useState, useGrokTheme,
} from "@/components/canvas";

type StepKey = "s1" | "s2" | "s3" | "s4" | "s5" | "s6" | "s7" | "s8";

const STEP_INFO: Record<StepKey, { name: string; input: string; work: string; output: string; analogy: string }> = {
  s1: { name: "1. 대화 포장", input: "사용자 질문 문장", work: "시스템 지시문, 이전 대화, 질문을 정해진 형식(채팅 템플릿)으로 한 줄의 긴 글로 붙입니다.", output: "모델이 읽을 전체 글(프롬프트)", analogy: "편지 봉투에 받는 사람, 이전 편지, 새 질문을 한꺼번에 넣는 일" },
  s2: { name: "2. 토큰화", input: "전체 글", work: "글을 토큰(token, 모델이 쓰는 글자 조각)으로 자르고, 조각마다 번호(ID)를 붙입니다.", output: "정수 번호의 줄", analogy: "문장을 레고 블록으로 나누고 블록마다 부품 번호를 붙이는 일" },
  s3: { name: "3. 임베딩", input: "토큰 번호의 줄", work: "번호마다 큰 표에서 숫자 벡터(embedding, 의미를 담은 숫자 묶음)를 꺼냅니다. 위치 정보(몇 번째 토큰인지)도 더합니다.", output: "토큰 수 × d 크기의 숫자 행렬", analogy: "부품 번호로 부품 설명서를 찾아 붙이는 일" },
  s4: { name: "4. 어텐션", input: "숫자 행렬", work: "토큰마다 앞의 어떤 토큰을 얼마나 참고할지 점수를 계산합니다. 점수만큼 다른 토큰의 정보를 섞습니다.", output: "문맥이 섞인 새 행렬", analogy: "회의에서 각자 관련 있는 사람의 말을 더 크게 듣는 일" },
  s5: { name: "5. FFN과 층 반복", input: "어텐션 결과", work: "토큰마다 작은 신경망(FFN, 피드포워드 신경망)을 통과시켜 지식을 꺼내 더합니다. 어텐션과 FFN 한 묶음(블록)을 수십 번 반복합니다.", output: "마지막 층의 숫자 행렬", analogy: "같은 원고를 여러 편집자가 차례로 고쳐 쓰는 일" },
  s6: { name: "6. 다음 토큰 확률", input: "마지막 토큰의 벡터", work: "벡터를 사전 크기(수만~수십만 개)의 점수(logit, 소프트맥스 전 원점수)로 바꿉니다. 소프트맥스로 합이 1인 확률로 바꿉니다.", output: "모든 토큰의 확률표", analogy: "다음에 올 단어 후보마다 가능성을 매기는 일" },
  s7: { name: "7. 샘플링", input: "확률표", work: "온도(temperature), top-p 같은 규칙으로 토큰 하나를 고릅니다.", output: "새 토큰 1개", analogy: "후보 중 하나를 주사위로 뽑되, 가능성 높은 후보에 눈을 더 많이 주는 일" },
  s8: { name: "8. 반복과 출력", input: "새 토큰", work: "새 토큰을 글 끝에 붙이고 4~7단계를 다시 합니다. 끝 토큰이 나오거나 길이 한도에 닿으면 멈춥니다. 토큰을 다시 글자로 바꿔 화면에 보냅니다.", output: "답변 문장(스트리밍)", analogy: "한 글자씩 타자를 치고, 친 글을 다시 읽고 다음 글자를 치는 일" },
};

const TOKENS = [
  { t: "고양", id: "18234" },
  { t: "이는", id: "5521" },
  { t: " 왜", id: "902" },
  { t: " 귀", id: "7710" },
  { t: "여워", id: "30417" },
  { t: "?", id: "30" },
];

function TokenChips() {
  const theme = useGrokTheme();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {TOKENS.map((k, i) => (
        <div
          key={i}
          style={{
            border: `1px solid ${theme.border.default}`,
            borderRadius: theme.radius.md,
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: 56,
          }}
        >
          <span style={{ fontFamily: theme.font.mono, fontSize: theme.font.body1.fontSize, color: theme.text.primary, whiteSpace: "pre" }}>
            {k.t === " 왜" || k.t === " 귀" ? "␣" + k.t.trim() : k.t}
          </span>
          <span style={{ fontFamily: theme.font.mono, fontSize: theme.font.label.fontSize, color: theme.text.tertiary }}>
            {k.id}
          </span>
          <span style={{ width: 24, height: 3, marginTop: 6, borderRadius: 2, background: theme.dataviz.categorical[i % 3] }} />
        </div>
      ))}
    </div>
  );
}

function LoopStrip() {
  const theme = useGrokTheme();
  const rounds = [
    { base: "…귀여워?", add: " 고양이가" },
    { base: "…귀여워? 고양이가", add: " 귀여운" },
    { base: "…고양이가 귀여운", add: " 이유는" },
    { base: "…귀여운 이유는", add: " 크게" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rounds.map((r, i) => (
        <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: theme.font.label.fontSize, color: theme.text.tertiary, minWidth: 44 }}>{`${i + 1}회차`}</span>
          <span style={{ fontFamily: theme.font.mono, color: theme.text.secondary }}>{r.base}</span>
          <span
            style={{
              fontFamily: theme.font.mono,
              color: theme.text.onColor,
              background: theme.dataviz.categorical[0],
              borderRadius: theme.radius.sm,
              padding: "2px 8px",
            }}
          >
            {r.add.trim()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState<StepKey>("s1");
  const info = STEP_INFO[step];
  const toks = ["고양", "이는", "왜", "귀", "여워", "?"];

  return (
    <Page
      title="LLM 작동 원리: 질문에서 답변까지"
      summary="질문 한 줄이 들어와서 답변이 나갈 때까지 LLM 안에서 일어나는 8단계를 순서대로 그림과 예시로 설명합니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "전체 흐름 한눈에", id: "flow" },
          { label: "단계별로 눌러 보기", id: "explore" },
          { label: "1~2단계: 포장과 토큰화", id: "tok" },
          { label: "3단계: 임베딩", id: "emb" },
          { label: "4~5단계: 트랜스포머 블록", id: "tf" },
          { label: "6~7단계: 확률과 샘플링", id: "prob" },
          { label: "8단계: 한 토큰씩 반복", id: "loop" },
          { label: "속도의 비밀: 프리필과 디코드", id: "speed" },
          { label: "자주 하는 오해", id: "myth" },
        ]}
      />

      <Section heading="전체 흐름 한눈에" id="flow">
        <Diagram
          direction="vertical"
          nodes={[
            { id: "q", label: "사용자 질문", detail: "고양이는 왜 귀여워?", kind: "terminal" },
            { id: "wrap", label: "1. 대화 포장", detail: "시스템 지시문 + 이전 대화 + 질문" },
            { id: "tok", label: "2. 토큰화", detail: "글 → 토큰 번호" },
            { id: "emb", label: "3. 임베딩", detail: "번호 → 숫자 벡터 + 위치" },
            { id: "att", label: "4. 어텐션", detail: "앞 토큰을 참고해 문맥 섞기" },
            { id: "ffn", label: "5. FFN × N층", detail: "지식 꺼내기, 블록 반복" },
            { id: "prob", label: "6. 다음 토큰 확률", detail: "logit → softmax" },
            { id: "samp", label: "7. 샘플링", detail: "토큰 1개 선택" },
            { id: "stop", label: "끝 토큰인가?", kind: "decision" },
            { id: "out", label: "8. 글자로 바꿔 출력", detail: "스트리밍 답변", kind: "terminal" },
          ]}
          edges={[
            { from: "q", to: "wrap" },
            { from: "wrap", to: "tok" },
            { from: "tok", to: "emb" },
            { from: "emb", to: "att" },
            { from: "att", to: "ffn" },
            { from: "ffn", to: "prob" },
            { from: "prob", to: "samp" },
            { from: "samp", to: "stop" },
            { from: "stop", to: "emb", label: "아니오: 글 끝에 붙이고 다시", dashed: true },
            { from: "stop", to: "out", label: "예" },
          ]}
        />
        <Callout lead="핵심 한 줄">
          LLM은 답 전체를 한 번에 만들지 않습니다. 다음 토큰 하나를 고르는 일을 끝 토큰이 나올 때까지 반복합니다.
        </Callout>
      </Section>

      <Section heading="단계별로 눌러 보기" id="explore">
        <Segmented<StepKey>
          options={(Object.keys(STEP_INFO) as StepKey[]).map((k) => ({ value: k, label: k.replace("s", "") }))}
          value={step}
          onChange={(v: StepKey) => setStep(v)}
        />
        <Properties
          items={[
            { label: "단계", value: info.name },
            { label: "들어오는 것", value: info.input },
            { label: "하는 일", value: info.work },
            { label: "나가는 것", value: info.output },
            { label: "직관", value: info.analogy },
          ]}
        />
      </Section>

      <Section heading="1~2단계: 포장과 토큰화" id="tok">
        <TokenChips />
        <Text>모델은 글자를 직접 읽지 못합니다. 토크나이저(tokenizer, 글을 조각내는 규칙)가 글을 자주 나오는 조각 단위로 자르고 번호를 붙입니다. 위 번호는 설명용 예시 값이며, 실제 번호와 자르는 위치는 모델마다 다릅니다.</Text>
        <Text>토큰화 전에 서비스는 질문을 채팅 템플릿으로 감쌉니다. 시스템 지시문, 이전 대화, 새 질문이 역할 표시와 함께 한 줄의 긴 글이 됩니다. 모델이 이전 대화를 기억하는 것처럼 보이는 이유는 매번 이전 대화를 다시 넣어 주기 때문입니다.</Text>
      </Section>

      <Section heading="3단계: 임베딩" id="emb">
        <Table
          columns={["토큰", "차원 1", "차원 2", "차원 3", "…", "차원 d"]}
          rows={[
            ["고양", "0.21", "-0.88", "0.05", "…", "0.47"],
            ["이는", "-0.13", "0.32", "0.71", "…", "-0.09"],
            ["귀", "0.66", "-0.41", "0.18", "…", "0.30"],
          ]}
        />
        <Text>번호마다 큰 표(임베딩 행렬)에서 숫자 벡터 한 줄을 꺼냅니다. 숫자는 설명용 예시 값입니다. 학습을 거치면 뜻이 비슷한 토큰의 벡터가 서로 가까워집니다. 여기에 몇 번째 토큰인지 알려 주는 위치 정보(예: RoPE, 회전 위치 인코딩)를 더합니다.</Text>
      </Section>

      <Section heading="4~5단계: 트랜스포머 블록" id="tf">
        <Heatmap
          rows={toks}
          columns={toks}
          max={1}
          values={[
            [1.0, 0, 0, 0, 0, 0],
            [0.62, 0.38, 0, 0, 0, 0],
            [0.18, 0.25, 0.57, 0, 0, 0],
            [0.30, 0.10, 0.15, 0.45, 0, 0],
            [0.12, 0.06, 0.08, 0.60, 0.14, 0],
            [0.20, 0.08, 0.30, 0.17, 0.20, 0.05],
          ]}
        />
        <Text>행은 지금 계산 중인 토큰이고, 열은 참고하는 토큰입니다. 값은 설명용 예시입니다. 오른쪽 위가 모두 0인 이유는 인과 마스크(causal mask) 때문입니다. 각 토큰은 자기보다 앞의 토큰만 볼 수 있습니다. 예를 들어 "여워"는 "귀"를 강하게 참고해 둘이 한 단어임을 알아챕니다.</Text>
        <Equation>
          {"Attention(Q, K, V) = softmax"}
          <Frac num={<Pow base="QK" exp="T" />} den={<Sqrt>{"d_k"}</Sqrt>} />
          {" V"}
        </Equation>
        <Steps
          steps={[
            { title: "Q, K, V 만들기", detail: "토큰마다 질문 벡터 Q(무엇을 찾나), 열쇠 벡터 K(나는 무엇인가), 값 벡터 V(내가 줄 정보)를 만듭니다." },
            { title: "점수 계산", detail: "Q와 앞 토큰들의 K를 곱해 관련도 점수를 냅니다. 크기를 맞추려고 √d_k로 나눕니다." },
            { title: "섞기", detail: "softmax로 점수를 비율로 바꾸고, 그 비율만큼 V를 더해 문맥을 섞습니다. 여러 헤드(head)가 동시에 다른 관점으로 이 일을 합니다." },
            { title: "FFN 통과", detail: "토큰마다 피드포워드 신경망을 지나며 학습된 지식을 꺼내 더합니다." },
            { title: "블록 반복", detail: "어텐션과 FFN 한 묶음을 수십 번 쌓습니다. 층이 깊어질수록 단어에서 문장, 의도 수준의 정보가 생긴다고 해석합니다." },
          ]}
        />
      </Section>

      <Section heading="6~7단계: 확률과 샘플링" id="prob">
        <Bars
          emphasis={0}
          bars={[
            { label: "고양이가", value: 0.41, display: "41%" },
            { label: "귀여움은", value: 0.22, display: "22%" },
            { label: "여러", value: 0.14, display: "14%" },
            { label: "그건", value: 0.09, display: "9%" },
            { label: "나머지 전부", value: 0.14, display: "14%" },
          ]}
        />
        <Text>질문 뒤 첫 답변 토큰의 확률표 예시입니다(설명용 값). 마지막 토큰의 벡터를 사전 전체 크기의 점수로 바꾸고, softmax로 합이 1인 확률로 만듭니다.</Text>
        <Grid columns={2}>
          <Section heading="온도(temperature)">
            <Text>낮으면 1등 후보만 고르는 쪽으로 쏠립니다. 높으면 낮은 후보도 자주 뽑혀 답이 다양해집니다.</Text>
          </Section>
          <Section heading="top-p">
            <Text>확률 합이 p가 될 때까지의 상위 후보만 남기고 그 안에서 뽑습니다. 엉뚱한 꼬리 후보를 잘라 냅니다.</Text>
          </Section>
        </Grid>
      </Section>

      <Section heading="8단계: 한 토큰씩 반복" id="loop">
        <LoopStrip />
        <Text>고른 토큰을 글 끝에 붙이고 3~7단계를 다시 합니다. 이 방식을 자기회귀(autoregressive, 자기가 낸 출력을 다음 입력으로 쓰는 방식) 생성이라고 합니다. 끝 토큰이 나오거나 길이 한도에 닿으면 멈춥니다. 토큰이 하나 나올 때마다 글자로 바꿔 보내므로 화면에 답이 흘러나오듯 보입니다(스트리밍).</Text>
      </Section>

      <Section heading="속도의 비밀: 프리필과 디코드" id="speed">
        <Table
          columns={["구분", "프리필(prefill)", "디코드(decode)"]}
          rows={[
            ["언제", "답 시작 전 1번", "답 토큰마다 1번"],
            ["처리량", "질문 전체를 한꺼번에", "새 토큰 1개씩"],
            ["병목", "계산량(GPU 연산)", "메모리 읽기 속도"],
            ["체감", "첫 글자까지 기다림", "글자가 나오는 속도"],
          ]}
        />
        <Text>디코드 때마다 앞 토큰의 K와 V를 다시 계산하면 느립니다. 그래서 한 번 계산한 K, V를 저장해 다시 씁니다. 이것을 KV 캐시(KV cache)라고 합니다. vLLM의 PagedAttention은 이 KV 캐시를 메모리 페이지 단위로 나눠 낭비를 줄이는 기술입니다.</Text>
      </Section>

      <Section heading="자주 하는 오해" id="myth">
        <Steps
          steps={[
            { title: "모델이 답을 미리 다 정해 두고 쓴다", detail: "아닙니다. 매번 다음 토큰 하나만 고릅니다. 다만 내부 벡터에는 앞으로의 방향 정보가 담긴다는 연구가 있습니다." },
            { title: "모델이 대화를 기억한다", detail: "모델 자체는 매 요청을 처음 봅니다. 서비스가 이전 대화를 프롬프트에 다시 넣어 줍니다." },
            { title: "답할 때 인터넷을 찾아본다", detail: "기본 모델은 학습된 숫자(가중치)만 씁니다. 검색은 서비스가 도구로 따로 붙인 기능입니다." },
            { title: "같은 질문에는 늘 같은 답이 나온다", detail: "샘플링에 무작위성이 있어 온도가 0이 아니면 답이 달라질 수 있습니다." },
          ]}
        />
        <Callout tone="info">
          이 페이지의 토큰 번호, 벡터 값, 어텐션 값, 확률은 모두 이해를 돕기 위한 예시 값입니다. 실제 값은 모델마다 다릅니다.
        </Callout>
      </Section>
    </Page>
  );
}


