import { Page, Section, Text, Callout, Table, Properties, TableOfContents } from "@/components/canvas";
import type { CalloutTone } from "@/components/canvas";

const SRC = {
  nature: "https://www.nature.com/articles/323533a0",
  pdf: "https://www.cs.utoronto.ca/~hinton/absps/naturebp.pdf",
  werbos: "https://ieeexplore.ieee.org/document/58337",
  torch: "https://docs.pytorch.org/docs/2.1/generated/torch.autograd.backward.html",
  c14: "https://www.britannica.com/science/carbon-14",
  oxford14: "https://radiocarbon.arch.ox.ac.uk/methods",
  saddle: "https://arxiv.org/abs/1406.2572",
};

type Verdict = "틀림" | "부분" | "보충" | "해석";
const TONE: Record<Verdict, CalloutTone> = { 틀림: "danger", 부분: "warning", 보충: "warning", 해석: "info" };

interface Note {
  verdict: Verdict;
  claim: string;
  body: string;
  links?: { label: string; href: string }[];
}

/** 검증 주석. 번호는 Obsidian 위키 페이지의 각주 번호와 같다. */
const NOTES: Record<string, Note> = {
  v1: {
    verdict: "보충",
    claim: '공유 가중치의 기울기를 "합쳐" 한 번에 업데이트한다. PyTorch는 "하나의 W.grad에 모은다"',
    body: '논문은 대응하는 가중치들의 기울기를 평균한다("we average ∂E/∂w for all the weights in each set of corresponding weights", Fig. 5 설명 글). 답변 본문도 뒤에서는 평균으로 설명하지만, 첫 요약은 "합쳐"라고 쓰고 PyTorch 코드는 합(sum)을 쓴다. 평균과 합은 복사본 수만큼의 배수 차이라 학습률로 맞출 수 있어 틀린 것은 아니다. 다만 한 답변 안에서 섞여 헷갈릴 수 있다.',
    links: [{ label: "PyTorch autograd.backward 문서", href: SRC.torch }],
  },
  v2: {
    verdict: "부분",
    claim: "가중치 감쇠는 가중치가 지나치게 커지는 것을 막기 위해 학습 중 조금씩 줄이는 방법이다",
    body: '논문이 가중치 감쇠를 넣은 이유는 가중치를 해석하기 쉽게 하려는 것이다("To make it easier to interpret the weights we introduced \'weight-decay\'"). 그 결과 최종 가중치 크기가 오차를 줄이는 데의 유용성을 나타낸다. 큰 가중치를 막는 장치는 바로 뒤 문장의 0.8/0.2 허용 범위다(3쪽, Fig. 4 설명 글).',
  },
  v3: {
    verdict: "부분",
    claim: "104개 삼중항 중 100개로 학습했다는 내용은 Fig. 4 설명 글에 있다",
    body: '내용은 맞다. 하지만 이 문장은 Fig. 4 설명 글이 아니라 3쪽 오른쪽 단 본문에 있다("after the network was trained on 100 of the 104 possible triples"). Fig. 4 설명 글에는 "학습하지 않은 4개 삼중항"만 나온다.',
  },
  v4: {
    verdict: "틀림",
    claim: "(추천 질문) 이 논문의 XOR·대칭 탐지 예제가 왜 은닉층을 필요로 하나요?",
    body: '이 논문에는 XOR 예제가 없다. 원문에서 "XOR", "exclusive"를 검색하면 0건이다. 논문의 예제는 대칭 탐지(Fig. 1), 가계도(Fig. 2–4), 반복망 대응(Fig. 5)이다.',
  },
};

interface QA {
  n: number;
  title: string;
  question: string;
  where: string;
  quote?: string;
  answer: string;
  verdict: string;
  notes: string[];
}

const QAS: QA[] = [
  {
    n: 1,
    title: "반복망에 역전파 적용하기",
    question: '따로 질문을 쓰지 않고, 아래 문장을 선택해 설명을 요청했다. ("반복망에 역전파 적용하기"는 Moonlight AI가 붙인 제목)',
    where: "3쪽, Fig. 5 설명 글 · 설명 스레드",
    quote: "A synchronous iterative net that is run for three iterations and the equivalent layered net. Each time-step in the recurrent net corresponds to a layer in the layered net. …",
    answer: "반복망의 시간 단계를 층으로 펼치면 역전파를 쓸 수 있다고 설명했다. 이때 과거 출력값을 저장해야 하고, 공유 가중치는 각 복사본의 기울기를 평균해 함께 바꿔야 한다는 두 조건을 짚었다. 숫자 예시와 PyTorch 코드를 들고, 이 방식이 이후 BPTT(시간에 따른 역전파)로 불린다고 덧붙였다.",
    verdict: "대체로 확인. 출력 이력 저장, 기울기 평균, 반복 탐색·순차 구조 학습은 원문과 같다. 합과 평균이 섞인 설명은 보충(v1)",
    notes: ["v1"],
  },
  {
    n: 2,
    title: "가계도 실험 해설",
    question: '따로 질문을 쓰지 않고, 아래 문장을 선택해 설명을 요청했다. ("가계도 실험 해설"은 Moonlight AI가 붙인 제목)',
    where: "3쪽, Fig. 4 설명 글 · 설명 스레드",
    quote: "The weights from the 24 input units that represent people to the 6 units in the second layer that learn distributed representations of people. …",
    answer: "은닉 유닛이 사람 이름을 외운 것이 아니라, 두 가계도의 공통 구조(1번 국적, 2번 세대, 6번 가계도 가지)를 나눠 표현했다고 설명했다. 그래서 학습하지 않은 4개 사례에도 맞게 답했다고 했다. 학습 설정, 가중치 감쇠, 0.8/0.2 허용 범위도 풀어 썼다.",
    verdict: "대체로 확인. 1,500회 학습, ε·α 값, 0.2% 감쇠, 0.8/0.2 기준은 원문과 같다. 가중치 감쇠의 목적(v2)과 인용 위치(v3)는 부분",
    notes: ["v2", "v3"],
  },
  {
    n: 3,
    title: "앞 논문 문단의 의미",
    question: '따로 질문을 쓰지 않고, 아래 문장을 선택해 설명을 요청했다. (Moonlight AI가 붙인 제목은 "선택된 문장의 의미")',
    where: "1쪽 맨 위. 역전파 논문이 아니라 같은 지면 앞에 실린 아미노산 논문의 끝부분 · 설명 스레드",
    quote: "delineating the absolute indigeneity of amino acids in fossils. As AMS techniques are refined to handle smaller samples, it may also become possible to date individual amino acid enantiomers by the ¹⁴C method. …",
    answer: "D형·L형 아미노산의 ¹⁴C 연대가 같으면 한쪽이 다른 쪽에서 왔다는 단서가 되지만, 그것만으로 화석 고유의 물질이라고 단정할 수 없다고 설명했다. 첫머리에서 이 문단이 역전파 논문과 무관한 앞 논문의 문단이라고 밝혔다.",
    verdict: "확인. 역전파 논문과 무관하다는 지적이 맞다",
    notes: [],
  },
  {
    n: 4,
    title: "¹⁴C 방법이란",
    question: "14c 방법이 뭐야 ?",
    where: "1쪽 (Q3 스레드에서 이어 물음)",
    answer: "방사성탄소 연대측정법이라고 답했다. 생물이 죽으면 탄소 교환이 멈추고 탄소-14가 일정한 속도로 줄어드는 것을 이용한다. 모래시계 비유를 들고, 논문 밖 내용으로 반감기 약 5,730년과 수만 년 규모의 측정 범위를 덧붙였다.",
    verdict: "확인. 반감기 5,730±40년, 측정 범위 약 5만 년",
    notes: [],
  },
  {
    n: 5,
    title: "역전파 논문과 무슨 상관인가",
    question: "이런 생물학적이야기랑 논문 본문 내용이랑 무슨 상관이야?",
    where: "1쪽 (Q3 스레드에서 이어 물음)",
    answer: '직접적인 관련이 없다고 답했다. 같은 Nature 지면에 앞 논문이 이어 실려 있어 텍스트가 섞인 것으로 보인다고 설명하고, 역전파 논문은 1쪽의 "We describe a new learning procedure, back-propagation..."부터 읽으라고 안내했다. 이어서 볼 질문 3개를 추천했다.',
    verdict: "확인. 추천 질문 하나는 틀림(v4)",
    notes: ["v4"],
  },
  {
    n: 6,
    title: "Letters to Nature와 가계도",
    question: "letters to nature 라고 써잇길래 뭔 상관이 있는 줄알았어. 본문은 또 가계도도 나와서",
    where: "1–3쪽 (Q3 스레드에서 이어 물음)",
    answer: '"Letters to Nature"는 Nature의 짧은 연구 논문을 모은 지면 이름이라 다른 분야 글이 이어 실린다고 설명했다. 가계도는 생물학 실험이 아니라 사람과 관계를 넣으면 다른 사람을 내놓는 신경망 학습 과제라고 했다. 예로 "Colin — has-aunt — ?"를 들었다.',
    verdict: '확인. 쪽마다 "LETTERS TO NATURE" 머리말이 있고, "Colin"과 "has-aunt" 예시는 Fig. 3 설명 글에 있다',
    notes: [],
  },
  {
    n: 7,
    title: "이 논문의 핵심",
    question: "이 논문의 핵심이 뭐야?",
    where: "논문 전체 · 토론",
    answer: "오차를 거꾸로 전파해 연결 가중치를 고치면 입력과 정답을 잇는 것뿐 아니라 은닉 유닛이 과제에 유용한 내부 표현을 스스로 학습한다는 것이 핵심이라고 답했다. 대칭 탐지와 가족 관계 과제로 이를 보였고, 저자들이 이 방법을 뇌의 학습 모델로 보지 않았다고 덧붙였다.",
    verdict: '확인. 뇌 학습 모델이 아니라는 부분은 4쪽 첫 문단 "is not a plausible model of learning in brains"와 같다',
    notes: [],
  },
  {
    n: 8,
    title: "방법론",
    question: "이 연구의 방법론알려줘",
    where: "논문 전체 · 토론",
    answer: "층 구성 → 순전파 → 오차 정의(모든 사례의 오차 합) → 연쇄법칙으로 역방향 기울기 계산 → 가중치 갱신(누적 갱신, momentum) 순서로 정리했다. 실험 두 개(대칭 탐지, 가계도)와 한계(전역 최솟값 보장 없음, 생물학적 타당성 없음)도 덧붙였다.",
    verdict: '확인. 식 (1)–(9)의 흐름과 같다. 용어 메모: 논문은 식 (9)를 momentum이 아니라 "acceleration method(가속 방법)"라고 부른다',
    notes: [],
  },
  {
    n: 9,
    title: "국소 최솟값 문제는 이후 어떻게 다뤘나",
    question: "그라디언트 디센트에 대해 이후 어떻게 해소했어? 국소에서 블랙홀마냥 빠져버리는 문제를 어떻게 접근했지?",
    where: "3쪽 마지막 문단 관련 · 토론",
    answer: '완전히 해소되지 않았다고 답했다. 논문 자체의 대응은 "경험상 나쁜 국소 최솟값에 잘 갇히지 않았다"는 관찰과 "연결을 더 넣으면 우회로가 생긴다"는 제안뿐이라고 했다. 이후에는 SGD, 적응형 최적화, 초기화, 정규화와 잔차 연결, 재시작을 조합해 왔고, 학습이 막히는 원인이 평탄 영역이나 안장점일 수도 있다고 짚었다.',
    verdict: "확인. 논문 부분은 3쪽 마지막 문단과 같다. 안장점 관점은 Dauphin 등(2014)과 맞다. 기법 목록은 일반론이고 AI가 출처를 달지 않았다",
    notes: [],
  },
];

function NoteBox({ id }: { id: string }) {
  const note = NOTES[id];
  return (
    <Callout lead={`${id} · ${note.verdict}`} tone={TONE[note.verdict]}>
      <span style={{ display: "block", color: "var(--text-secondary)", marginBottom: 4 }}>
        Moonlight AI 답변: “{note.claim}”
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
          ...(qa.quote ? [{ label: "선택한 원문", value: qa.quote }] : []),
          { label: "Moonlight AI 답변 요약", value: qa.answer },
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
      title="역전파 논문 읽기 (Rumelhart 외, 1986)"
      summary="요약: (1) Rumelhart·Hinton·Williams(1986) 역전파 논문을 Moonlight로 읽으며 물은 9개 질문을 논문 위치, 질문, 답변 요약과 함께 정리하고 원문과 대조해 검증했습니다. (2) Moonlight AI 답변에서 틀린 곳은 1개(논문에 없는 XOR 예제)이고, 부분 2개(가중치 감쇠의 목적, 인용 위치)와 보충 1개(기울기 합과 평균의 혼용)가 있습니다. (3) 스캔본 1쪽에 앞 논문이 함께 실려 있어, 그 문단을 역전파 논문으로 알고 물은 질문(Q3–Q6)도 그대로 남겼습니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "읽은 논문과 Q&A 방식", id: "about" },
          { label: "Q&A 1: 문장을 짚어 물은 질문 (Q1–Q6)", id: "qa-thread" },
          { label: "Q&A 2: 논문 전체에 대해 물은 질문 (Q7–Q9)", id: "qa-discuss" },
          { label: "Moonlight AI 답변 검토 결과", id: "verify" },
        ]}
      />

      <Section heading="읽은 논문과 Q&A 방식" id="about">
        <Table
          columns={["항목", "내용"]}
          rows={[
            ["논문", "David E. Rumelhart, Geoffrey E. Hinton, Ronald J. Williams, Learning representations by back-propagating errors (1986)"],
            ["게재", <a key="nature" href={SRC.nature}>Nature 323권, 533–536쪽 (1986-10-09), DOI 10.1038/323533a0</a>],
            ["읽은 PDF", <span key="pdf"><a href={SRC.pdf}>cs.utoronto.ca/~hinton/absps/naturebp.pdf</a> 스캔본에 OCR 글자 층을 넣어 Moonlight에 올린 파일</span>],
            ["쪽 표기", "1–4쪽은 PDF 쪽이다(= Nature 533–536쪽). 1쪽 위에는 앞 논문(화석 아미노산), 4쪽 아래에는 다음 논문(새끼 고양이 약시)이 함께 실려 있다"],
            ["구성", "초록 · 층 구조와 식 (1)(2) · 오차와 역방향 계산 식 (3)–(7) · 갱신 식 (8)(9) · 대칭 탐지(Fig. 1) · 가계도(Fig. 2–4) · 반복망(Fig. 5) · 국소 최솟값과 한계"],
            ["Q&A 출처", "Moonlight 설명 스레드 3개(문장을 선택해 질문, Q1–Q6), 토론 1개(논문 전체에 질문, Q7–Q9)"],
          ]}
        />
        <Text>
          Q&A마다 내 질문, 논문 위치, 선택한 원문, Moonlight AI 답변 요약, 검증 결과를 적었다. 검증은 OCR한 원문, Nature 게재 정보, 웹 출처와 대조했다. AI 답변 중 문제가 있는 문장은 바로 아래 상자에 판정과 함께 적었다.
        </Text>
        <Table
          columns={["판정", "뜻"]}
          rows={[
            ["확인", "원문이나 신뢰할 출처와 맞다"],
            [{ text: "틀림", tone: "danger" }, "사실과 다르다 (낡은 정보 포함)"],
            [{ text: "부분", tone: "warning" }, "핵심은 맞지만 세부가 틀리다"],
            [{ text: "보충", tone: "warning" }, "틀리지 않지만 빠진 내용 때문에 오해할 수 있다"],
            ["해석", "사실이 아니라 해석이고, 다른 해석이 있다"],
          ]}
        />
      </Section>

      <Section heading="Q&A 1: 문장을 짚어 물은 질문 (Q1–Q6)" id="qa-thread">
        <Text>논문의 문장을 선택해 물은 질문이다. Q4–Q6은 Q3 스레드에서 이어서 물었다.</Text>
        {QAS.slice(0, 6).map((qa) => (
          <QABlock key={qa.n} qa={qa} />
        ))}
      </Section>

      <Section heading="Q&A 2: 논문 전체에 대해 물은 질문 (Q7–Q9)" id="qa-discuss">
        <Text>오른쪽 사이드바의 토론 창에서 논문 전체를 두고 물은 질문이다.</Text>
        {QAS.slice(6).map((qa) => (
          <QABlock key={qa.n} qa={qa} />
        ))}
      </Section>

      <Section heading="Moonlight AI 답변 검토 결과" id="verify">
        <Text>틀림 1개, 부분 2개, 보충 1개. 번호는 위 Q&A 상자의 번호와 같다.</Text>
        <Table
          columns={["번호", "질문", "Moonlight AI 답변 내용", "판정"]}
          rows={Object.entries(NOTES).map(([id, note]) => [
            id,
            QAS.filter((qa) => qa.notes.includes(id)).map((qa) => `Q${qa.n}`).join(", "),
            note.claim,
            note.verdict === "해석" ? note.verdict : { text: note.verdict, tone: note.verdict === "틀림" ? "danger" : "warning" },
          ])}
        />
        <Section heading="원문과 대조해 맞은 AI 답변 내용 (21개)">
          <Table
            columns={["#", "AI 답변 내용", "원문 위치"]}
            rows={[
              ["1", "반복망은 출력 이력을 저장해야 한다", "Fig. 5 설명 글"],
              ["2", "대응하는 가중치의 기울기를 평균해 함께 바꾼다", "Fig. 5 설명 글"],
              ["3", "반복망은 반복 탐색이나 순차 구조를 학습할 수 있다", "Fig. 5 설명 글"],
              ["4", "이 방식은 이후 BPTT로 불린다", <a key="w" href={SRC.werbos}>Werbos 1990</a>],
              ["5", "은닉 유닛 1은 국적, 2는 세대, 6은 가계도 가지", "Fig. 4 설명 글"],
              ["6", "1,500회 학습, 처음 20회 ε=0.005·α=0.5, 이후 ε=0.01·α=0.9", "Fig. 4 설명 글"],
              ["7", "매 갱신 뒤 가중치 0.2% 감쇠", "Fig. 4 설명 글"],
              ["8", "0.8/0.2 허용 범위와 그 목적(큰 가중치 방지)", "Fig. 4 설명 글"],
              ["9", "흰 사각형은 흥분성, 검은 사각형은 억제성, 면적은 크기", "Fig. 4 설명 글"],
              ["10", "학습하지 않은 4개 삼중항에 올바르게 일반화", "Fig. 4 설명 글"],
              ["11", "두 가계도는 동형", "Fig. 2 설명 글"],
              ["12", "선택한 아미노산 문단은 앞 논문", "1쪽"],
              ["13", "¹⁴C 반감기 약 5,730년, 측정 범위 수만 년", <span key="c"><a href={SRC.c14}>Britannica</a>, <a href={SRC.oxford14}>Oxford</a></span>],
              ["14", '쪽마다 "LETTERS TO NATURE" 머리말', "1–4쪽"],
              ["15", '"Colin"과 "has-aunt" 예시', "Fig. 3 설명 글"],
              ["16", "오차는 모든 사례·출력 유닛의 제곱 오차 합", "식 (3)"],
              ["17", "연쇄법칙으로 역방향 기울기 계산", "식 (4)–(7)"],
              ["18", "누적 갱신과 이전 변화량을 반영하는 갱신", "식 (8), (9)"],
              ["19", "대칭 탐지와 가계도 두 과제", "2–3쪽"],
              ["20", '뇌의 학습 모델로는 타당하지 않다("is not a plausible model of learning in brains")', "4쪽"],
              ["21", "나쁜 국소 최솟값은 드물고 연결 추가가 우회로를 만든다. 국소 최솟값보다 안장점이 근본 문제라는 관점", <span key="s">3쪽 마지막 문단, <a href={SRC.saddle}>Dauphin 등 2014</a></span>],
            ]}
          />
        </Section>
      </Section>
    </Page>
  );
}
