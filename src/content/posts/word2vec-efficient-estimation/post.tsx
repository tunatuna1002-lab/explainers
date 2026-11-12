import { Page, Section, Text, Callout, Table, Properties, TableOfContents } from "@/components/canvas";
import type { CalloutTone, ReactNode } from "@/components/canvas";

const SRC = {
  abs: "https://arxiv.org/abs/1301.3781",
  pdf: "https://arxiv.org/pdf/1301.3781v3",
  torch: "https://docs.pytorch.org/docs/stable/generated/torch.nn.Embedding.html",
  linTegmark: "https://arxiv.org/abs/1606.06737",
  levyDeps: "https://aclanthology.org/P14-2050.pdf",
  melamud: "https://aclanthology.org/N16-1118.pdf",
  tanaka: "https://aclanthology.org/J19-3003.pdf",
};

type Verdict = "틀림" | "부분" | "보충" | "해석";
const TONE: Record<Verdict, CalloutTone> = { 틀림: "danger", 부분: "warning", 보충: "warning", 해석: "info" };

interface Note {
  verdict: Verdict;
  claim: string;
  body: string;
  links?: { label: string; href: string }[];
}

/** Moonlight AI 자동 요약에 대한 검증 주석. 번호는 처음 나온 순서다. */
const NOTES: Record<string, Note> = {
  v1: {
    verdict: "틀림",
    claim: "결과 요약 (표 4 기준, 6B 단어 학습): Our NNLM 100차원 34.2 / 64.5, CBOW 300차원 15.5 / 53.1, Skip-gram 300차원 50.0 / 55.9",
    body: "6B 단어로 학습한 모델은 Our NNLM뿐이다. CBOW와 Skip-gram은 783M 단어로 학습했다(8쪽 표 4의 Training words 열). 7쪽 4.3절 끝에서 8쪽으로 이어지는 문장도 CBOW를 'subset of the Google News data'로 학습했다고 쓴다. 이 표기 때문에 NNLM이 더 좋아 보인다. 같은 6B 데이터로 학습한 9쪽 표 6에서는 CBOW 63.7%, Skip-gram 65.6%로 NNLM 50.8%보다 높다.",
    links: [{ label: "원문 PDF (arXiv v3)", href: SRC.pdf }],
  },
  v2: {
    verdict: "부분",
    claim: "텐서 모양: 입력층은 V × D (어휘 수 × 벡터 차원)",
    body: "입력은 길이 V인 원-핫 벡터(1-of-V coding) N개다. V × D 크기를 갖는 것은 입력을 D차원으로 바꾸는 공유 투영 행렬이다(3쪽 2.1절 'shared projection matrix', 4쪽 3.1절 마지막 문장). 'V × D'라는 표기는 원문에 없고, V를 D로 바꾸는 행렬이라는 점에서 나온 추론이다.",
  },
  v3: {
    verdict: "틀림",
    claim: "하드웨어: 단일 CPU 및 DistBelief(분산 학습 프레임워크)를 활용합니다 (p.4, §2.4)",
    body: "2장의 소절은 2.1, 2.2, 2.3뿐이다. DistBelief, 모델 복제본, 비동기 미니배치, Adagrad 설명은 4쪽 2.3절 'Parallel Training of Neural Networks'에 있다.",
  },
  v4: {
    verdict: "틀림",
    claim: "동음이의어(polysemy)와 같은 문맥적 다의성을 완벽하게 처리하기 어렵습니다 (p.2, §1.1)",
    body: "인용한 2쪽 1.1절에는 다의어 이야기가 없다. 그 자리의 'words can have multiple degrees of similarity'는 한 단어가 여러 방식으로 다른 단어와 비슷할 수 있다는 뜻이다(예: 어미가 비슷한 명사). 원문 전체에서 'polysem', 'ambigu'를 검색하면 0건이다. 단어 하나에 벡터 하나라 다의어에 약하다는 지적 자체는 맞지만, 이 논문의 내용은 아니다.",
  },
  v5: {
    verdict: "부분",
    claim: "현대의 PyTorch 구현에서는 nn.Embedding 층을 통해 행렬곱을 GPU에서 효율적으로 연산합니다",
    body: "PyTorch 문서는 nn.Embedding을 'A simple lookup table'로 설명한다. 입력은 인덱스이고 출력은 그 인덱스의 행이다. 원-핫 벡터와 행렬을 곱한 결과와 같지만, 실제로는 곱셈 없이 행을 꺼낸다. 이 부분은 논문 밖 내용이다.",
    links: [{ label: "PyTorch nn.Embedding 문서", href: SRC.torch }],
  },
  v6: {
    verdict: "보충",
    claim: "목적 함수: 계층적 소프트맥스 · 비교 대상: Collorbet-Weston · 이후 연구 흐름: word2vec → GloVe → FastText → BERT, GPT",
    body: "계층적 소프트맥스는 목적 함수가 아니라 출력 확률을 싸게 계산하는 방법이다(3쪽 2.1절). 'Collorbet'은 Collobert의 오타다(8쪽 표 4). 이후 연구 흐름에는 문맥에 따라 벡터가 바뀌는 ELMo(2018)가 빠졌다(배경 지식, 원문 밖).",
  },
};

interface QA {
  n: number;
  title: string;
  question: string;
  where: string;
  selected?: string;
  answer: string;
  verdict: ReactNode;
  notes: string[];
}

const QAS: QA[] = [
  {
    n: 1,
    title: "이 논문 이전의 신경망 언어모델",
    question: "이 논문 나왔을 때 기존의 신경망 언어모델은 어떤 모델이 있었나?",
    where: "2쪽 1.2절 Previous Work, 3쪽 2.1–2.2절",
    answer: "두 가지라고 답했다. Bengio(2003)의 피드포워드 NNLM은 앞 단어 N개로 다음 단어를 예측하고, 병목은 투영층에서 은닉층으로 가는 N×D×H다. Mikolov(2010)의 RNNLM은 문맥 길이를 고정해야 하는 문제를 풀려고 나왔고, 병목은 H×H다. 은닉층 하나로 단어 벡터를 먼저 배우는 두 단계 방식(Mikolov 2007, 2009)을 word2vec이 직접 확장했다고 덧붙였다.",
    verdict: "확인. 식 (2), (3), 1.2절, 3장 첫 문단과 같다",
    notes: [],
  },
  {
    n: 2,
    title: "다음 단어 예측은 오래된 문제인가",
    question: "앞 단어를 보고 다음단어를 만들려고 했던건 예전부터 했던거네? 트랜스포머나 어텐션 부터 있던게 아니라? 단지 그걸 어떻게 하면 비용을 더 줄일 수 있냐가 문제였네?",
    where: "논문 전체",
    answer: "맞다고 답했다. 섀넌(1948), n-gram, NNLM(2003), RNNLM(2010), Transformer(2017) 순서로 이어졌다. 다만 비용만 문제가 아니라 문맥 길이와 병렬 계산도 문제였다고 보충했다. word2vec은 앞뒤 문맥으로 단어 벡터를 얻는 모델이라 언어모델이 아니라고 짚었다.",
    verdict: "역사 부분은 배경 지식(원문 밖). word2vec이 언어모델 대신 단순한 모델을 택해 계산을 줄였다는 점은 4쪽 3장 첫 문단과 같다",
    notes: [],
  },
  {
    n: 3,
    title: "CBOW와 Skip-gram의 기하·통계 직관",
    question: "이것의 기하적 직관에 대해 설명해줘. 혹은 통계적 직관에 대해",
    where: "4쪽 3.1–3.2절",
    selected: "CBOW: 앞뒤 단어로 가운데 단어를 맞혀요. / Skip-gram: 가운데 단어로 주변 단어를 맞혀요.",
    answer: "기하로는 내적이 두 화살표의 방향 일치라고 설명했다. CBOW는 주변 단어 벡터의 평균(무게중심)에, Skip-gram은 각 주변 단어 쪽으로 단어 벡터를 맞춘다. 그래서 주변 단어가 많이 겹치는 단어끼리 가까워진다. 통계로는 분포 가설을 들고, 네거티브 샘플링 Skip-gram이 PMI 행렬 분해와 같다는 후속 연구(Levy & Goldberg 2014)를 소개했다. 표 3에서 Skip-gram은 의미 55%, CBOW는 문법 64%로 강점이 다르다고 덧붙였다.",
    verdict: "평균(3.1절)과 표 3 수치는 원문과 같다. PMI 해석은 후속 연구이고 그 논문은 이번에 열지 않았다(미확인). 이 논문은 네거티브 샘플링이 아니라 계층적 소프트맥스를 쓴다는 점은 답변이 직접 밝혔다",
    notes: [],
  },
  {
    n: 4,
    title: "Moonlight AI 요약을 쉽게 풀어 달라",
    question: "아래 내용에 대해 쉽고 자세하게 설명해줘. (Moonlight AI가 만든 9개 절짜리 요약을 붙여 넣음)",
    where: "논문 전체 · Moonlight 요약 패널",
    answer: "요약을 절마다 풀어 설명하면서 원문 PDF와 대조했다. 결과표의 학습 데이터 표기, 입력층 크기, 없는 절 번호, 원문에 없는 다의어 한계, nn.Embedding 설명에서 문제를 찾았다. 각 문제는 아래 상자에 적었다.",
    verdict: "Moonlight AI 요약에서 틀림 3개, 부분 2개, 보충 1개 (v1–v6)",
    notes: ["v1", "v2", "v3", "v4", "v5", "v6"],
  },
  {
    n: 5,
    title: "표 4 비교가 불공정한 이유",
    question: "(앞 답변의 확인 질문 '표 4만 보면 NNLM(50.8%)이 CBOW(36.1%)보다 좋아 보여요. 그런데 왜 이 비교를 공정하다고 볼 수 없을까요?'를 선택하고, '6B 단어로 학습한 건 NNLM뿐이에요. CBOW와 Skip-gram은 783M 단어로 학습했어요'를 답으로 붙임)",
    where: "8쪽 표 4",
    answer: "정답이라고 했다. 자원도 달랐다고 보충했다. CBOW와 Skip-gram은 CPU 하나로 학습했고, 표 4의 NNLM 수치는 표 6의 NNLM(14일 × CPU 코어 180개)과 같아 같은 모델로 보인다. 그런데도 Skip-gram의 전체 정확도 53.3%가 NNLM 50.8%보다 높다고 짚었다.",
    verdict: "확인. 표 4, 7쪽 4.3절 끝 'trained using one CPU only', 표 6. 두 NNLM이 같은 모델이라는 부분은 수치가 같다는 데서 나온 추정",
    notes: [],
  },
  {
    n: 6,
    title: "틀렸다는 근거의 논문 위치",
    question: "틀렸다는 근거 확인 가능하게 논문 상 위치 알려줘",
    where: "3쪽 2.1절, 4쪽 2.3절·3.1절, 7–9쪽 표 4–6",
    answer: "오류마다 쪽, 절, 표와 검색어를 주고 표 4 캡처를 붙였다. 다의어는 위치로 보여 줄 수 없어서 원문 전체 검색 결과 0건을 근거로 들었다. nn.Embedding은 논문이 아니라 PyTorch 공식 문서를 근거로 들었다.",
    verdict: "확인",
    notes: [],
  },
  {
    n: 7,
    title: "요약이 결론을 거꾸로 보이게 했나",
    question: "nnlm을 보여주려고 했지만 사실은 거꾸로인건가?",
    where: "8쪽 표 4, 9쪽 표 6",
    answer: "반은 맞다고 답했다. 논문은 NNLM을 큰 자원으로 만든 강한 기준선으로 두고, 굵은 글씨로 NNLM 문법 64.5%, Skip-gram 의미 50.0%와 전체 53.3%를 표시했다. Moonlight AI 요약이 학습 데이터 조건을 빼서 거꾸로 읽히게 했다. 같은 6B 데이터의 표 6에서는 word2vec이 모든 항목에서 앞서지만 차원(100 대 1000)이 다르다고 덧붙였다.",
    verdict: "확인. 표 4의 굵은 글씨, 표 6 설명 글 'training of NNLM with 1000-dimensional vectors would take too long to complete'",
    notes: [],
  },
  {
    n: 8,
    title: "비용과 시간 면에서 NNLM보다 나은가",
    question: "cbow, skip gram 을 이용해서 word2vec을 학습 시키는 것이고 이것이 nnlm보다 낫다는 것인가? 비용 측면에서? 시간 측면에서?",
    where: "식 (2), (4), (5), 표 3, 표 6, 표 7, 10쪽 6장",
    answer: "word2vec은 CBOW와 Skip-gram을 구현한 도구 이름이라고 용어를 먼저 바로잡았다. 단어 벡터를 얻는 용도로는 정확도(표 3), 예시당 계산량(식 2, 4, 5), 학습 시간(표 6) 모두 낫다고 답했다. 언어모델로는 아니라는 근거로 표 7(Skip-gram 48.0%, RNNLM 55.4%, 둘을 합치면 58.9%)을 들었다.",
    verdict: "확인. 코드 주소(code.google.com/p/word2vec)는 원문 끝에만 나오고, 결론의 'much lower computational complexity'와 같다. 예시당 계산량 숫자(D=300, V=100만)는 계산값",
    notes: [],
  },
  {
    n: 9,
    title: "CBOW는 무엇과 비슷한가",
    question: "skip gram이 ngram과 비슷해보여. 그럼 cbow는 뭐랑 비슷한지 모르겠어.",
    where: "4쪽 3.1–3.2절",
    answer: "CBOW는 NNLM과 빈칸 채우기 문제에 가깝다고 답했다. 원문 3.1절 첫 문장이 'similar to the feedforward NNLM'이다. Skip-gram은 이름과 '거리를 둔 단어 쌍' 통계가 n-gram 연구의 skip-gram과 비슷하지만, 방향은 단어에서 문맥으로 반대라고 했다. BERT의 masked LM과의 연결은 배경 지식이라고 밝혔다.",
    verdict: "확인. 3.1절과 3.2절 첫 문장. skip-gram이라는 이름의 유래는 원문 밖이라 미확인",
    notes: [],
  },
  {
    n: 10,
    title: "가운데 단어 예측 정리",
    question: "cbow는 가운데 단어를 예측하고 skip gram은 가운데 단어로 주변을 예측하는군?",
    where: "4–5쪽 3.1–3.2절, 8쪽 표 5",
    answer: "맞다고 했다. 둘 다 예측 자체보다 그 과정에서 생기는 단어 벡터가 목적이라고 덧붙였다. 학습에는 CBOW가 약 1일, Skip-gram이 약 3일 걸렸다.",
    verdict: "확인. 표 3, 표 5",
    notes: [],
  },
  {
    n: 11,
    title: "범위 R과 단어 벡터의 쓰임",
    question: "범위 r이 뭐야? 쉽고 자세하게 설명해 . 그리고 단어 벡터를 만들어서 뭐해? 임베딩에 쓰나?",
    where: "4–5쪽 3.2절, 9쪽 표 8, 10쪽 6장",
    answer: "R은 가운데 단어마다 1부터 C 사이에서 무작위로 고르는 창의 반지름이다(실험값 C=10). 그래서 거리 1인 단어는 항상, 거리 10인 단어는 10%만 학습에 쓰인다. 단어 벡터는 단어 임베딩과 같은 말이고, 다른 모델의 입력, 비슷한 단어 검색, 관계 계산(Paris − France + Italy = Rome)에 쓴다고 답했다.",
    verdict: "확인. R 설명은 3.2절, 관계 예시는 표 8, 응용 분야는 5쪽과 10쪽. 거리별 비율은 계산값",
    notes: [],
  },
  {
    n: 12,
    title: "거리가 멀면 정말 관련이 적은가",
    question: "거리가 멀다고 해서 정말 관련이 적다고 봐도 될까?",
    where: "4쪽 3.2절",
    selected: "먼 단어일수록 관련이 약하니까 덜 뽑는다는 뜻이에요.",
    answer: "평균으로는 맞고, 문장 하나에서는 자주 틀린다고 답했다. 원문도 'usually less related'라고 썼다. 반례로 한국어 주어와 동사 사이의 거리, 대명사, 글 전체의 주제어를 들었다. 창 크기는 맞고 틀림의 문제가 아니라 어떤 비슷함을 배울지 고르는 설계 선택이고, 어텐션이 이 문제를 데이터로 푼다고 연결했다.",
    verdict: (
      <>
        확인. 거리가 멀수록 상호정보량이 거듭제곱 꼴로 천천히 줄어든다(<a href={SRC.linTegmark}>Lin & Tegmark 2017</a>). 창이 클수록 주제적 비슷함이 커진다(<a href={SRC.levyDeps}>Levy & Goldberg 2014</a>, <a href={SRC.melamud}>Melamud 외 2016</a>). 글자 단위 측정의 한계를 지적한 반론도 있다(<a href={SRC.tanaka}>Takahashi & Tanaka-Ishii 2019</a>)
      </>
    ),
    notes: [],
  },
];

function NoteBox({ id }: { id: string }) {
  const note = NOTES[id];
  return (
    <Callout lead={`${id} · ${note.verdict}`} tone={TONE[note.verdict]}>
      <span style={{ display: "block", color: "var(--text-secondary)", marginBottom: 4 }}>
        Moonlight AI 요약: “{note.claim}”
      </span>
      {note.body}
      {note.links ? (
        <>
          {" "}근거:{" "}
          {note.links.map((l, i) => (
            <span key={l.href}>
              {i > 0 ? ", " : ""}
              <a href={l.href}>{l.label}</a>
            </span>
          ))}
        </>
      ) : null}
    </Callout>
  );
}

function QABlock({ qa }: { qa: QA }) {
  return (
    <Section heading={`Q${qa.n}. ${qa.title}`} id={`q${qa.n}`}>
      <Properties
        items={[
          { label: "내 질문", value: qa.question },
          { label: "논문 위치", value: qa.where },
          ...(qa.selected ? [{ label: "선택한 앞 답변", value: qa.selected }] : []),
          { label: "AI 답변 요약", value: qa.answer },
          { label: "검증", value: qa.verdict },
        ]}
      />
      {qa.notes.map((id) => (
        <NoteBox key={`${qa.n}-${id}`} id={id} />
      ))}
    </Section>
  );
}

export default function App() {
  return (
    <Page
      title="word2vec 논문 읽기 (Mikolov 외, 2013)"
      summary="요약: (1) Mikolov 외(2013) word2vec 논문을 Moonlight로 읽으며 물은 12개 질문을 논문 위치, 답변 요약과 함께 정리하고 원문과 대조해 검증했습니다. (2) Moonlight AI 자동 요약에서 틀림 3개, 부분 2개, 보충 1개를 찾았습니다. 가장 큰 문제는 학습 데이터 조건을 빼서 NNLM(신경망 언어모델)이 더 좋아 보이게 만든 결과표입니다. (3) 원문은 은닉층을 없애 계산을 크게 줄였고, 그래서 더 큰 데이터와 벡터로 NNLM보다 정확한 단어 벡터를 얻었다고 결론짓습니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "읽은 논문과 Q&A 방식", id: "about" },
          { label: "Q&A 1: 이전 모델과 직관 (Q1–Q3)", id: "qa-basics" },
          { label: "Q&A 2: Moonlight AI 요약 검토 (Q4–Q7)", id: "qa-summary" },
          { label: "Q&A 3: CBOW와 Skip-gram 깊이 보기 (Q8–Q12)", id: "qa-models" },
          { label: "Moonlight AI 요약 검토 결과", id: "verify" },
        ]}
      />

      <Section heading="읽은 논문과 Q&A 방식" id="about">
        <Table
          columns={["항목", "내용"]}
          rows={[
            ["논문", "Tomas Mikolov, Kai Chen, Greg Corrado, Jeffrey Dean, Efficient Estimation of Word Representations in Vector Space (2013)"],
            ["게재", <a key="abs" href={SRC.abs}>arXiv:1301.3781 (v3, 2013-09-07)</a>],
            ["읽은 PDF", <span key="pdf"><a href={SRC.pdf}>arxiv.org/pdf/1301.3781v3</a> 12쪽, Moonlight 라이브러리에 올린 파일</span>],
            ["쪽 표기", "PDF 쪽(1–12)이다. 논문 아래에 찍힌 번호와 같다"],
            ["구성", "1장 서론과 이전 연구 · 2장 기존 모델(NNLM, RNNLM, 병렬 학습) · 3장 CBOW와 Skip-gram · 4장 결과(표 1–7) · 5장 학습된 관계 예(표 8) · 6장 결론"],
            ["Q&A 출처", "Moonlight AI 자동 요약 1개(9개 절)와, Moonlight로 읽으면서 AI 브라우저 Aside에게 물은 질문 12개"],
          ]}
        />
        <Text>
          Q&A마다 내 질문, 논문 위치, AI 답변 요약, 검증 결과를 적었습니다. 질문은 친 그대로 옮겼습니다. 원문 PDF와 출처 링크로 검증했습니다. Moonlight AI 요약에서 문제가 있는 문장은 Q4 아래 상자에 판정과 함께 적었습니다. 숫자 중 '계산값'은 대화 중 직접 계산한 값입니다.
        </Text>
        <Table
          columns={["판정", "뜻"]}
          rows={[
            ["확인", "원문이나 신뢰할 출처와 맞다"],
            [{ text: "틀림", tone: "danger" }, "사실과 다르다 (원문에 없는 내용 포함)"],
            [{ text: "부분", tone: "warning" }, "핵심은 맞지만 세부가 틀리다"],
            [{ text: "보충", tone: "warning" }, "틀리지 않지만 빠진 내용 때문에 오해할 수 있다"],
            ["해석", "사실이 아니라 해석이고, 다른 해석이 있다"],
          ]}
        />
      </Section>

      <Section heading="Q&A 1: 이전 모델과 직관 (Q1–Q3)" id="qa-basics">
        <Text>논문을 처음 읽으며 이 논문 이전에 어떤 모델이 있었는지, 두 모델을 어떻게 이해할지 물었습니다.</Text>
        {QAS.slice(0, 3).map((qa) => (
          <QABlock key={qa.n} qa={qa} />
        ))}
      </Section>

      <Section heading="Q&A 2: Moonlight AI 요약 검토 (Q4–Q7)" id="qa-summary">
        <Text>Moonlight AI가 만든 자동 요약을 붙여 넣고 풀어 달라고 한 뒤, 원문과 대조하며 이어 물었습니다.</Text>
        {QAS.slice(3, 7).map((qa) => (
          <QABlock key={qa.n} qa={qa} />
        ))}
      </Section>

      <Section heading="Q&A 3: CBOW와 Skip-gram 깊이 보기 (Q8–Q12)" id="qa-models">
        <Text>두 모델이 NNLM보다 나은 점, 서로의 차이, Skip-gram의 범위 R을 물었습니다.</Text>
        {QAS.slice(7).map((qa) => (
          <QABlock key={qa.n} qa={qa} />
        ))}
      </Section>

      <Section heading="Moonlight AI 요약 검토 결과" id="verify">
        <Text>판정은 틀림 3개, 부분 2개, 보충 1개입니다. 번호는 Q4 아래 상자의 번호와 같습니다.</Text>
        <Table
          columns={["번호", "Moonlight AI 요약 내용", "판정"]}
          rows={Object.entries(NOTES).map(([id, note]) => [
            id,
            note.claim,
            note.verdict === "해석" ? note.verdict : { text: note.verdict, tone: note.verdict === "틀림" ? "danger" : "warning" },
          ])}
        />
        <Section heading="원문과 대조해 맞은 Moonlight AI 요약 내용 (16개)">
          <Table
            columns={["#", "Moonlight AI 요약 내용", "원문 위치"]}
            rows={[
              ["1", "기존 시스템은 단어를 어휘 인덱스(원자적 단위)로 다뤄 단어 간 비슷함을 모른다", "1쪽 1장"],
              ["2", "이전 구조는 수억 단어보다 큰 데이터로 학습하지 못했다", "1–2쪽 1.1절"],
              ["3", "CBOW는 문맥 단어로 현재 단어를 예측하고, 투영층에서 벡터를 평균한다", "4쪽 3.1절"],
              ["4", "Skip-gram은 현재 단어로 범위 C 안의 주변 단어를 분류한다", "4쪽 3.2절"],
              ["5", "Skip-gram 계산량 Q = C × (D + D × log₂V)", "식 (5)"],
              ["6", "계층적 소프트맥스로 V에 비례하던 출력 계산을 log₂V 수준으로 줄인다", "3쪽 2.1절"],
              ["7", "허프만 트리는 자주 나오는 단어에 짧은 경로를 준다", "3쪽 2.1절"],
              ["8", "확률적 경사 하강법과 역전파로 학습한다", "3쪽 2장, 식 (1) 아래"],
              ["9", "Google News 말뭉치 약 6B 토큰", "6쪽 4.2절"],
              ["10", "의미·문법 유추 테스트셋 19,544문항 (8,869 + 10,675)", "6쪽 4.1절"],
              ["11", "표 4의 각 수치 (34.2 / 64.5, 15.5 / 53.1, 50.0 / 55.9)", "8쪽 표 4"],
              ["12", "벡터 차원이 클수록 정확도가 오르지만 계산도 늘어난다", "6–7쪽 4.2절, 표 2"],
              ["13", "미니배치 비동기 SGD, 모델 복제본과 파라미터 서버", "4쪽 2.3절"],
              ["14", "은닉층이 없으면 소프트맥스 정규화가 주요 계산 지점이 된다", "3쪽 2.1절 끝"],
              ["15", "단어의 형태 정보(morphology)를 쓰지 않는 한계", "6쪽 4.1절"],
              ["16", "테스트셋은 단일 토큰 단어만 쓴다 (New York 제외)", "6쪽 4.1절"],
            ]}
          />
        </Section>
      </Section>
    </Page>
  );
}
