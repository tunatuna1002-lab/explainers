import { Page, Section, Text, Callout, Table, Steps, Properties, TableOfContents } from "@/components/canvas";
import type { CalloutTone } from "@/components/canvas";
import { Tex } from "@/components/Tex";

const SRC = {
  lfm: "https://press.uchicago.edu/ucp/books/book/chicago/W/bo3616369.html",
  bridge: "https://www.tandfonline.com/doi/full/10.1080/09608788.2024.2373133",
  floydNwr: "https://www.nordicwittgensteinreview.com/article/view/3435/pdf",
  shanker: "https://projecteuclid.org/journals/notre-dame-journal-of-formal-logic/volume-28/issue-4/Wittgenstein-versus-Turing-on-the-nature-of-Churchs-thesis/10.1305/ndjfl/1093637650.pdf",
  pi: "https://philarchive.org/archive/RALWRO",
  floyd2016: "https://mdetlefsen.nd.edu/assets/201037/jf.turing.pdf",
  proudfoot: "https://philarchive.org/rec/PRORTT-3",
  proudfoot2020: "https://link.springer.com/article/10.1007/s11023-020-09534-7",
  myths: "https://sciforum.net/paper/22421",
  pnas: "https://pubmed.ncbi.nlm.nih.gov/42154549",
  arxivJB: "https://arxiv.org/abs/2503.23674",
  thought: "https://link.springer.com/article/10.1007/s11023-022-09616-8",
  facct: "https://dl.acm.org/doi/10.1145/3715275.3732108",
  contam: "https://aclanthology.org/2026.gem-main.50",
  matharena: "https://proceedings.neurips.cc/paper_files/paper/2025/file/1d27c01ebd3e3aebe226b44fc970d803-Paper-Datasets_and_Benchmarks_Track.pdf",
  holdout: "https://proceedings.neurips.cc/paper/2015/hash/bad5f33780c42f2588878a9d07405083-Abstract.html",
  evalAware: "https://arxiv.org/abs/2505.23836",
  hacking: "https://link.springer.com/article/10.1007/s44163-026-01980-z",
  oup: "https://academic.oup.com/mind/article-abstract/LIX/236/433/986238",
  pdf: "https://courses.cs.umbc.edu/471/papers/turing.pdf",
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
    verdict: "해석",
    claim: '튜링 테스트는 "행동주의(기능주의) 테스트"의 원형이다',
    body: '"행동주의 테스트"는 표준 해석 중 하나일 뿐이다. Proudfoot는 튜링의 기준을 반응 의존(response-dependence) 기준으로 읽는다. 사실로 외우지 말 것.',
    links: [{ label: "Proudfoot, Minds and Machines 2020", href: SRC.proudfoot2020 }],
  },
  v2: {
    verdict: "틀림",
    claim: '10⁹비트는 "약 1GB 수준"',
    body: '튜링의 "storage capacity"는 상태 수의 log2, 즉 비트 수다(§5). 10⁹비트는 1.25×10⁸바이트, 약 125MB(0.125GB)다. "약 1GB"는 8배 크게 잡았다.',
  },
  v3: {
    verdict: "틀림",
    claim: "5분·70% 기준을 엄밀하게 실험한 사례는 제한적이다(Eugene Goostman 논란)",
    body: "낡은 정보다. 사전등록된 3자 튜링 테스트(5분 대화)에서 페르소나 프롬프트를 쓴 GPT-4.5가 73% 비율로 인간으로 판정됐다. 질문자 정답률이 약 27%로, 튜링의 70% 기준보다 낮다. 다만 예측 시점(2000년경)보다 약 25년 늦었다.",
    links: [
      { label: "Jones & Bergen, arXiv 2025", href: SRC.arxivJB },
      { label: "PNAS 2026", href: SRC.pnas },
    ],
  },
  v4: {
    verdict: "틀림",
    claim: '튜링은 저장 용량만 충분하면 된다고 봤다("저장 용량 중심" 가정)',
    body: '튜링은 용량만 있으면 된다고 보지 않았다. §7에서 "the problem is mainly one of programming"이라고 쓰고, 프로그래밍 부담을 줄이려고 아이 기계(학습)를 제안했다. 용량에 대해서는 "10⁹보다 많이 필요하면 놀랄 것"이라고만 했다.',
  },
  v5: {
    verdict: "부분",
    claim: 'Conjectures are of great importance… 문장은 예측 "바로 앞"에 있다',
    body: "이 문장은 예측의 앞이 아니라 뒤에, 같은 문단 끝에 나온다(§6). 내용 해석은 맞다.",
  },
  v6: {
    verdict: "보충",
    claim: "70%는 인간 기준선에 가까운 값으로 해석할 수 있다",
    body: '튜링의 판정 질문은 §1에 있다. "Will the interrogator decide wrongly as often when the game is played like this as he does when the game is played between a man and a woman?" 즉 기준은 고정된 %가 아니라 남녀 게임의 오답률과의 비교다. 70%는 §6의 예측치이고, 둘의 관계는 논문에 없다(답변도 추정이라고 밝혔다).',
  },
  v7: {
    verdict: "보충",
    claim: "기계가 A 자리에 들어간 뒤 B는 여전히 사람이다",
    body: '§1에서는 기계가 A 자리에 들어가고 B는 여자 그대로다. §5에서는 "the part of B being taken by a man"이라고 다시 쓴다. 표의 "사람"은 두 판본을 합친 단순화다. 어느 판본이 진짜 튜링 테스트인지는 해석이 갈린다(추정. 이번에 문헌은 확인하지 않음).',
  },
  v8: {
    verdict: "틀림",
    claim: "게재 정보 Mind 49: 433–460",
    body: '게재 정보는 Mind 59권(LIX) 236호, 433–460쪽, DOI 10.1093/mind/LIX.236.433이다. "49"는 읽은 UMBC PDF 첫 줄의 오기를 그대로 옮긴 것으로 추정한다.',
    links: [{ label: "Oxford Academic", href: SRC.oup }],
  },
  v9: {
    verdict: "틀림",
    claim: "튜링이 비트겐슈타인의 강의를 들었는지는 논쟁적이다",
    body: '튜링의 청강은 기록된 사실이다. Diamond가 엮은 1939년 강의록의 청강자 명단에 튜링이 있고, 두 사람의 문답(모순이 있는 계산 체계로 만든 다리가 무너지는 예)도 실려 있다. 논쟁은 "들었는가"가 아니라 "영향을 받았는가"다.',
    links: [{ label: "University of Chicago Press", href: SRC.lfm }],
  },
  v10: {
    verdict: "틀림",
    claim: '비트겐슈타인은 1939년 강의에서 정확히 "기계가 생각할 수 있는가" 문제를 다뤘다',
    body: '1939년 강의 주제는 수학의 기초(모순, 증명, 수학 명제의 진리 등)였다. "기계가 생각할 수 있는가"는 『청색 책』(1933–34, 47쪽)과 『철학적 탐구』 §359–360에서 다뤘다. Hodges(1999)는 1939년 강의가 튜링의 마음·기계 관점을 "전혀 밝혀주지 않는다"고 본다.',
    links: [{ label: "Floyd 2016", href: SRC.floyd2016 }],
  },
  v11: {
    verdict: "부분",
    claim: "튜링이 인용하는 인물은 Babbage, Lovelace, Hartree, Jefferson, Gödel, Church 등뿐이다",
    body: "본문에는 Kleene(1935), Rosser, Turing(1937)도 나온다(§6 수학적 반론). 비엔나 학파·브리지먼 인용이 없다는 핵심 주장은 원문 검색 결과와 맞다. 단, 읽은 PDF에는 참고문헌 목록이 없어 목록 전체는 대조하지 못했다.",
  },
  v12: {
    verdict: "해석",
    claim: "튜링은 순수 검증주의보다 반증가능성 지향에 가깝다",
    body: '테스트는 충분조건으로 설계됐다. §1에서 튜링은 기계가 게임을 잘하면 반론에 "need not be troubled"라고 하지만, 실패가 "생각 못 함"을 뜻한다고 하지 않는다. 그래서 실패해도 반증되지 않는다. 반증 가능한 것은 §6의 예측이다. "반증가능성 지향"은 예측에만 맞는 말이다.',
  },
  v13: {
    verdict: "해석",
    claim: "아이 기계의 보상·처벌은 오늘날 RLHF/RLAIF와 놀랍게 겹친다",
    body: "튜링이 말한 것은 사람 교사의 보상·처벌이다(§7). RLHF의 구조(보상 모델, 정책 최적화)와 같지 않다. 유사성은 사후 해석이다.",
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
    title: "질문 재정의하기",
    question: '따로 질문을 쓰지 않고, 아래 문장을 선택해 설명을 요청했다. ("질문 재정의하기"는 Moonlight가 붙인 제목)',
    where: "1쪽, §1 The Imitation Game · 설명 스레드",
    quote: "Instead of attempting such a definition I shall replace the question by another, which is closely related to it and is expressed in relatively unambiguous words.",
    answer: '튜링은 "think"를 정의하지 않고, 관찰 가능한 게임으로 질문을 바꾼다. 일상 용법으로 정의하면 Gallup 여론조사 같은 결론이 되기 때문이다. Moonlight는 이를 조작적 정의(operational definition)로 설명하고, 이 문장을 "철학적 본질론 대신 행동주의적 테스트를 택하겠다"는 논문 전체의 방법론적 선언으로 봤다. 후속 질문 3개(중국어 방 반례, LLM 벤치마크의 편향, 의식 문제를 넘어간 것의 평가)를 제안했다.',
    verdict: '대체로 확인. "행동주의 테스트"라는 규정은 해석 문제(v1)',
    notes: ["v1"],
  },
  {
    n: 2,
    title: "실제로 이렇게 되었나?",
    question: "실제로 이렇게 되었나?",
    where: "8쪽, §6 Contrary Views on the Main Question (튜링의 자기 예측) · 설명 스레드",
    quote: "I believe that in about fifty years' time it will be possible, to programme computers, with a storage capacity of about 10⁹, to make them play the imitation game so well that an average interrogator will not have more than 70 per cent chance of making the right identification after five minutes of questioning.",
    answer: '예측을 시점(약 50년 뒤, 2000년경), 조건(저장 용량 약 10⁹), 목표(5분 질문 뒤 정답률 70% 이하)로 풀고 "부분적으로 맞았고, 부분적으로 빗나갔다"고 답했다. 맞은 것으로 용량이 크게 늘어난 점, "기계가 생각한다"는 표현이 대중화된 점을 들었다. 빗나간 것으로 70% 기준을 엄밀히 실험한 사례가 적다는 점(Eugene Goostman 논란), 용량보다 학습 방법·알고리즘·데이터가 결정적이었다는 점을 들었다.',
    verdict: "틀림 3곳: 용량 환산(v2), 70% 검증 현황(v3), 튜링의 용량 가정(v4)",
    notes: ["v2", "v3", "v4"],
  },
  {
    n: 3,
    title: "왜 70%인가",
    question: "튜링은 왜 70%를 기준으로 잡았지? 70% 정확도를 잡은 이유는 뭐야?",
    where: "8쪽, §6 (Q2 스레드에서 이어 물음)",
    answer: "논문에는 70%의 근거가 없다고 먼저 밝혔다. 70%는 기계의 정답률이 아니라 심문자의 판별 정확도이고, 기계가 적어도 30%는 속인다는 뜻이다. 그 위에 남녀 게임에서도 심문자가 100% 맞히지 못한다는 점(인간 기준선), 어림수라는 점, 철학 질문을 검증 가능한 예측으로 바꾸려는 목적으로 해석했다. 모두 추론이라고 표시했다.",
    verdict: "대체로 확인. 인용 문장의 위치 오류(v5), 튜링의 실제 판정 질문 보충(v6)",
    notes: ["v5", "v6"],
  },
  {
    n: 4,
    title: "원래 모방 게임은 남녀 게임인가",
    question: "이 이미테이션 게임(Imitation Game)이 본래 남자와 여자를 구별하는 게임이라는 게 무슨 말이지? 사람과 기계를 구별하는 게 아니고, 사람 중에서 남자와 여자를 구별하는 게임이라는 이야기야?",
    where: "1–2쪽, §1–2 (Q2 스레드에서 이어 물음)",
    answer: "맞다고 답했다. 원래 게임은 남자 A가 여자 흉내를 내고, 심문자 C가 누가 남자인지 맞히는 게임이다. 튜링은 A 자리에 기계를 넣어 질문을 바꾼다. 텔레프린터로만 대화해 외모·목소리 같은 몸의 단서를 막고, 지적 능력만으로 판별하게 한다. 원문 4곳(게임 목표, 머리카락 답변, 기계가 A를 맡는 질문, 몸과 지적 능력의 구분)을 인용했다.",
    verdict: "원문 인용 4개 모두 확인. B의 정체 보충(v7)",
    notes: ["v7"],
  },
  {
    n: 5,
    title: "기존 연구와 무엇이 다른가",
    question: '기존 연구랑 뭐가 달라? (첫 답이 중간에 끊겨 "왜 대답하다말아"로 다시 받음)',
    where: "논문 전체 · 토론",
    answer: '네 가지 차이를 들었다. (1) 정의할 수 없는 질문을 관찰 가능한 게임으로 바꿨다. (2) "기계"를 디지털 컴퓨터로 좁히고 범용성으로 논증했다. (3) 반론 9개를 하나씩 반박했다. (4) 아이 기계라는 학습 패러다임을 냈다. 이 논문을 인용한 논문들을 보여 주고, 연구 질문 3개(70% 예측의 성패, ESP 반론과 벤치마크 오염, 저장 용량과 파라미터 수)를 제안했다.',
    verdict: '원문 인용 확인. "행동주의 검증 기준의 원형"은 해석 문제(v1)',
    notes: ["v1"],
  },
  {
    n: 6,
    title: "공부한 내용 정리해서 다운받기",
    question: "혹시 여기서 공부한 내용들을 정리해서 다운받을 수 있어?",
    where: "논문 전체 · 토론",
    answer: "파일은 만들 수 없다고 답하고, 복사해 쓰는 Markdown 정리본을 줬다. 논문 개요, 모방 게임, 디지털 컴퓨터 구조, 범용성, 반론 9개, 아이 기계, 주요 수치, 인용 네트워크, 연구 질문을 담았다. 이 요청이 Q&A를 따로 기록하게 된 계기다.",
    verdict: "틀림 1곳: 게재 권호(v8). 수치(Manchester 기계 165,000, 뇌 10¹⁰–10¹⁵, 게임용 10⁹)는 확인",
    notes: ["v8"],
  },
  {
    n: 7,
    title: "검증가능성·당시 과학철학과의 관계",
    question: "검증가능성과 연결이 된다고 생각한다. 과학철학에서 이런 개념이 있는데, 혹시 당시 과학철학과 연관이 있는 것인가?",
    where: "논문 전체 · 토론",
    answer: '튜링의 질문 대체는 검증주의·브리지먼의 조작주의와 구조가 같다고 답했다. 하지만 논문에 비엔나 학파·브리지먼 인용이 없으므로 "직접 영향"이 아니라 "시대적 공명"으로 보자고 했다. 접점으로 케임브리지의 비트겐슈타인을 들고, ESP 대목은 반증가능성에 가깝다고 봤다. 마지막에 연구 질문 3개를 냈다. 이 글의 후속 조사 1–3이 그 질문이다.',
    verdict: "틀림 2곳: 1939년 강의 청강 여부(v9), 강의 주제(v10). 인용 목록은 부분(v11), 반증가능성 지향은 해석(v12)",
    notes: ["v9", "v10", "v11", "v12"],
  },
  {
    n: 8,
    title: "읽을 만한 대목 추리기",
    question: "이 논문에서 읽을 만한 내용 따로 추려줘",
    where: "논문 전체 · 토론",
    answer: '먼저 읽을 대목으로 §6의 50년 예측, 괴델 반론에 대한 응답("증명되지 않은 주장"), ESP 반론을 골랐다. 다음으로 범용 기계, 아이 기계, Lady Lovelace 반론("기계는 나를 자주 놀라게 한다")을 골랐다. 짧은 인용문 5개, "시간이 없으면 5곳만" 목록, 다시 읽는 렌즈 3개(검증주의, 평가 방법론, 학습 패러다임)를 줬다.',
    verdict: "원문 인용 모두 확인. 아이 기계와 RLHF 비교는 해석(v13)",
    notes: ["v13"],
  },
];

function NoteBox({ id }: { id: string }) {
  const note = NOTES[id];
  return (
    <Callout lead={`${id} · ${note.verdict}: Moonlight "${note.claim}"`} tone={TONE[note.verdict]}>
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
          { label: "Moonlight 답변 요약", value: qa.answer },
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
      title="튜링 이미테이션 게임"
      summary="요약: (1) Turing(1950)을 Moonlight로 읽으며 물은 8개 질문을 논문 위치, 질문, 답변 요약과 함께 정리하고 원문과 대조해 검증했습니다. (2) 틀린 곳은 6개입니다: 용량 환산, 70% 검증 현황, 튜링의 용량 가정, 게재 권호, 1939년 강의 청강 여부와 주제. (3) Q7에서 나온 연구 질문 3개(1939년 강의, 검증 vs 반증, ESP 반론)는 후속 조사로 따로 정리했습니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "읽은 논문과 Q&A 방식", id: "about" },
          { label: "Q&A 1: 문장을 짚어 물은 질문 (Q1–Q4)", id: "qa-thread" },
          { label: "Q&A 2: 논문 전체에 대해 물은 질문 (Q5–Q8)", id: "qa-discuss" },
          { label: "후속 조사 1: 1939년 강의", id: "wittgenstein" },
          { label: "후속 조사 2: 검증가능성 vs 반증가능성", id: "falsifiability" },
          { label: "후속 조사 3: ESP 반론의 현대적 재해석", id: "esp" },
          { label: "검증 결과 한눈에", id: "verify" },
        ]}
      />

      <Section heading="읽은 논문과 Q&A 방식" id="about">
        <Table
          columns={["항목", "내용"]}
          rows={[
            ["논문", "A. M. Turing, Computing Machinery and Intelligence (1950)"],
            ["게재", "Mind 59권(LIX) 236호, 433–460쪽, DOI 10.1093/mind/LIX.236.433"],
            ["읽은 PDF", <a key="pdf" href={SRC.pdf}>courses.cs.umbc.edu/471/papers/turing.pdf</a>],
            ["구성", "§1 모방 게임 · §2 새 질문 비판 · §3 게임 속 기계 · §4 디지털 컴퓨터 · §5 범용성 · §6 반대 견해 9개 · §7 학습 기계"],
            ["Q&A 출처", "Moonlight 설명 스레드 2개(문장을 선택해 질문, Q1–Q4), 토론 1개(논문 전체에 질문, Q5–Q8)"],
          ]}
        />
        <Text>
          Q&A마다 내 질문, 논문 위치, 선택한 원문, Moonlight 답변 요약, 검증 결과를 적었다. 검증은 튜링 원문(UMBC PDF), Oxford의 게재 정보, 웹 출처와 대조했다. 문제가 있는 주장은 바로 아래 상자에 판정과 함께 적었다.
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

      <Section heading="Q&A 1: 문장을 짚어 물은 질문 (Q1–Q4)" id="qa-thread">
        <Text>논문의 문장을 선택해 물은 질문이다. Q2–Q4는 한 스레드에서 이어서 물었다.</Text>
        {QAS.slice(0, 4).map((qa) => (
          <QABlock key={qa.n} qa={qa} />
        ))}
      </Section>

      <Section heading="Q&A 2: 논문 전체에 대해 물은 질문 (Q5–Q8)" id="qa-discuss">
        <Text>오른쪽 사이드바의 토론 창에서 논문 전체를 두고 물은 질문이다.</Text>
        {QAS.slice(4).map((qa) => (
          <QABlock key={qa.n} qa={qa} />
        ))}
      </Section>

      <Section heading="후속 조사 1: 튜링은 비트겐슈타인의 1939년 강의를 실제로 들었는가?" id="wittgenstein">
        <Text>Q7 답변 끝의 연구 질문 1: 튜링이 비트겐슈타인의 1939년 강의를 실제로 접했는가? 접했다면 "생각한다"의 언어 게임적 해석이 튜링 테스트 설계에 반영되었는가? (v9, v10과 관련)</Text>
        <Callout lead="결론">
          들었습니다. 다만 이 강의가 "모방 게임" 설계에 영향을 주었다는 직접 증거는 없습니다.
        </Callout>
        <Section heading="확인된 사실">
          <Text>
            1939년 케임브리지의 「수학 기초 강의(LFM)」 청강자 명단에 Alan Turing이 있습니다. 책으로 나온 31개 강의는 Bosanquet, Malcolm, Rhees, Smythies 네 사람의 필기를 바탕으로 합니다. (<a href={SRC.lfm}>University of Chicago Press</a>)
          </Text>
          <Text>
            튜링은 강의에서 실제로 토론했습니다. 비트겐슈타인이 계산 체계에 모순이 있으면 무엇이 해로운지 묻자, 튜링은 그 체계로 설계한 다리가 나중에 무너질 수 있다고 답했습니다. (<a href={SRC.bridge}>British Journal for the History of Philosophy, 2024</a>)
          </Text>
          <Text>두 사람의 만남은 1939년이 처음이 아닙니다. Floyd에 따르면 둘은 1937년에 Alister Watson의 소개로 만났습니다.</Text>
          <Text>
            튜링이 직접 영향을 인정한 글도 있습니다. 미발표 논문 「Reform of Mathematical Notation and Phraseology」(1944/5)에서 타입 이론을 정리하는 데 1939년 강의(LFM)에 빚졌다고 밝혔습니다. 다만 주제는 수학 표기이고, 기계의 사고가 아닙니다. (<a href={SRC.floydNwr}>Floyd, Nordic Wittgenstein Review</a>)
          </Text>
        </Section>
        <Section heading="언어 게임 해석과 닮은 부분 (정황 증거)">
          <Text>
            비트겐슈타인은 『청색 책』(1933–34)에서 "기계가 생각한다"는 문장이 어딘가 무의미해 보인다고 썼습니다(<a href={SRC.shanker}>Shanker, Notre Dame Journal of Formal Logic</a>). 『철학적 탐구』 §359–360에서는 우리는 인간과 인간을 닮은 것에 대해서만 "생각한다"고 말한다고 했습니다(<a href={SRC.pi}>PhilArchive</a>).
          </Text>
          <Text>
            튜링은 1950년 논문에서 이렇게 썼습니다. "기계가 생각할 수 있는가"라는 원래 질문은 "too meaningless to deserve discussion(논의할 가치가 없을 만큼 무의미하다)". 그러면서 세기말에는 "the use of words ... will have altered(단어 사용이 바뀔 것)"이라고 예측했습니다. 질문을 단어 사용의 문제로 본다는 점이 비트겐슈타인과 매우 닮았습니다.
          </Text>
        </Section>
        <Section heading="학계 견해는 갈립니다">
          <Text>
            Hodges(1999)는 비트겐슈타인이 튜링에게 영향을 주었다는 직접 증거가 없고, 1939년 강의는 튜링의 마음·기계 관점을 "전혀 밝혀주지 않는다"고 봅니다(<a href={SRC.floyd2016}>Floyd 2016</a>). Floyd도 직접 증거가 없다는 점은 인정합니다. 대신 "상식(common sense)"과 "어법(phraseology)"이라는 케임브리지 전통을 통한 정황적 재구성을 내놓습니다.
          </Text>
          <Text>
            Proudfoot는 튜링의 기준을 반응 의존적(response-dependence) 기준으로 해석합니다(<a href={SRC.proudfoot}>Proudfoot, Minds and Machines 2020</a>). 또 튜링과 비트겐슈타인의 마음 철학이 근본적으로 달랐다는 통념을 "신화"라고 비판합니다(<a href={SRC.myths}>Proudfoot 2025</a>).
          </Text>
        </Section>
        <Section heading="아직 확인하지 못한 것">
          <Text>
            King's College의 Turing Digital Archive(AMT 문서군)와 Bergen의 비트겐슈타인 유고(WAB)에서 1950년 논문 초안이 서로를 언급하는지는 직접 검색하지 않았습니다. 이 질문에 결정적인 1차 사료는 여기에 있습니다.
          </Text>
        </Section>
      </Section>

      <Section heading="후속 조사 2: 검증가능성 vs 반증가능성" id="falsifiability">
        <Text>Q7 답변 끝의 연구 질문 2: 튜링 테스트는 검증 기준인가 반증 기준인가? 기계가 실패해도 "더 큰 기계"를 상상할 수 있어 반증이 안 된다면, 이 테스트는 Popper적 의미에서 과학적인가? (v12와 관련)</Text>
        <Callout lead="결론">
          기준으로서의 튜링 테스트는 한 방향으로만 작동합니다(통과는 증거가 되지만 실패는 반증이 되지 않음). 반면 논문 속 튜링의 예측은 명확하게 반증 가능한 가설이었고, 실제로 시험을 거쳤습니다.
        </Callout>
        <Section heading="(1) 테스트는 충분조건일 뿐입니다 (튜링 본인의 주장)">
          <Text>
            원문 1절에 이런 반론이 나옵니다. 기계가 인간과 매우 다른 방식으로 생각할 수도 있지 않은가? 튜링은 이렇게 답합니다. 그래도 기계가 게임을 잘 해낸다면 "we need not be troubled by this objection(이 반론에 신경 쓸 필요가 없다)". 즉 통과는 사고의 증거가 됩니다. 하지만 실패는 "기계는 생각하지 못한다"를 반증하지 못합니다. 연구 질문 2가 말한 "더 큰 기계" 도피로가 여기서 생깁니다. Dennett과 Shieber도 이 테스트를 개념적 충분조건으로 읽습니다(<a href={SRC.thought}>Minds and Machines 2022</a>).
          </Text>
        </Section>
        <Section heading="(2) 그러나 튜링은 반증 가능한 예측을 따로 남겼습니다">
          <Text>
            원문 6절의 예측은 이렇습니다. 약 50년 뒤 저장 용량 10⁹ 수준의 컴퓨터를 상대로, 평균적인 질문자가 5분 대화 후 정답을 맞힐 확률은 70% 이하가 될 것이다. 시점, 시간, 임계값이 모두 정해진 Popper식 가설입니다.
          </Text>
          <Text>2000년 무렵에는 달성되지 않았습니다(예측 시점 기준 실패).</Text>
          <Text>
            2025–26년에는 사전등록된 3자 튜링 테스트에서 GPT-4.5가 73%의 비율로 인간으로 판정되었습니다(<a href={SRC.pnas}>Jones &amp; Bergen, PNAS 2026</a>). 질문자의 정답률이 약 27%라는 뜻이므로, 튜링의 70% 임계값을 크게 밑돕니다. 다시 말해 예측은 약 25년 늦게 충족되었습니다.
          </Text>
        </Section>
        <Section heading="(3) 통과도 결정적인 증거가 아닙니다 (구성 타당도 문제)">
          <Text>
            같은 연구에서 질문자들은 전통적인 지능보다 문체와 사회·정서적 측면에 주목했습니다(<a href={SRC.pnas}>PNAS 2026</a>). 테스트가 "지능"이 아니라 "인간다움"을 잰 것으로 추정됩니다.
          </Text>
          <Text>
            GPT-4를 다룬 FAccT 논문도 튜링 테스트가 필요조건도 충분조건도 아니며, 기껏해야 확률적 근거라고 결론 내립니다(<a href={SRC.facct}>ACM FAccT 2025</a>).
          </Text>
        </Section>
        <Section heading="벤치마크 과학에 주는 함의 (제 정리)">
          <Text>
            벤치마크 점수도 같은 비대칭을 가집니다. 점수가 높으면 능력의 증거로 쓰입니다. 점수가 낮으면 "프롬프트가 나빴다", "모델이 작았다" 같은 보조가설로 쉽게 구제됩니다. 이는 Popper보다 Lakatos의 연구 프로그램 모델에 가깝습니다.
          </Text>
          <Text>
            벤치마크 주장을 반증 가능하게 만드는 방법은 튜링이 이미 보여주었습니다. 모델, 프롬프트, 예산, 임계값, 시점을 미리 고정하는 것입니다. Jones &amp; Bergen의 사전등록은 이 방식을 따랐습니다.
          </Text>
        </Section>
      </Section>

      <Section heading="후속 조사 3: ESP 반론의 현대적 재해석" id="esp">
        <Text>Q7 답변 끝의 연구 질문 3: 튜링이 우려한 "게임 외부 요인에 의한 교란"은 오늘날 데이터 누출, 벤치마크 오염, prompt injection과 구조적으로 같은가? 이 유비를 형식화하면 "검증 조건의 무결성"이라는 평가 틀이 나올 수 있는가?</Text>
        <Callout lead="결론">
          유비는 성립하고, 상당 부분은 이미 형식화되어 있습니다. 새로 기여할 여지는 "통합된 위협 모델"에 있습니다.
        </Callout>
        <Text>튜링의 ESP 절을 다시 읽으면 유비가 생각보다 정밀합니다. 원문에는 세 가지 교란 경로가 나옵니다.</Text>
        <Steps
          steps={[
            { title: "증인이 텔레파시로 카드를 맞힘", detail: "400장 중 130장, 우연 기대치는 100장" },
            { title: "질문자가 염력으로 기계의 난수 생성기에 영향을 줌" },
            { title: "질문자가 질문 없이 투시로 정답을 앎" },
          ]}
        />
        <Text>
          튜링의 처방은 "telepathy-proof room(텔레파시 차단실)"이고, 그는 이 상황을 "벽에 귀를 대고 엿듣는 경쟁자"에 비유했습니다. 이는 사실상 부채널(side channel) 공격 모델입니다.
        </Text>
        <Table
          columns={["튜링의 교란 경로", "오늘날 대응 현상", "기존 형식화·대응"]}
          rows={[
            [
              "응시자가 정답을 미리 앎 (텔레파시)",
              "데이터 오염·누출",
              <span key="c1">
                55편을 검토한 체계적 리뷰는 어떤 탐지법도 오염 단계 전반에서 일관되게 신뢰할 수 없다고 결론 내림(<a href={SRC.contam}>GEM 2026</a>). AIME 2024는 대부분의 주요 LLM에 크게 오염됨(<a href={SRC.matharena}>MathArena</a>)
              </span>,
            ],
            [
              "평가자의 반복 조회가 결과를 바꿈 (염력)",
              "리더보드 과적합, 적응적 hill-climbing",
              <span key="c2">
                Dwork 등의 재사용 가능한 홀드아웃(reusable holdout): 증명 가능한 보장이 있음(<a href={SRC.holdout}>NeurIPS 2015</a>)
              </span>,
            ],
            [
              "응시자가 시험 상황임을 앎 (엿듣기)",
              "평가 인식(evaluation awareness)",
              <span key="c3">
                Gemini-2.5-Pro가 평가 대화와 실사용 대화를 AUC 0.83으로 구분(<a href={SRC.evalAware}>arXiv 2505.23836</a>)
              </span>,
            ],
            [
              "응시자가 채점자를 조작함",
              "프롬프트 인젝션, 보상 해킹",
              <span key="c4">
                보상 해킹 서베이의 "평가자 수준 공격(evaluator-level exploitation)" 범주(<a href={SRC.hacking}>Discover AI 2026</a>)
              </span>,
            ],
            ["텔레파시 차단실", "비공개 테스트셋, 샌드박스, 새 문제 사용", "공개 직후의 신규 대회 문제로 평가하는 MathArena, LiveBench 등"],
          ]}
        />
        <Section heading={'"검증 조건의 무결성"을 형식화하는 초안 (제 제안, 검증 안 됨)'}>
          <Text>기호 정의: C는 측정하려는 능력, K는 정답과 채점 기준, O는 모델 출력, S는 점수, E는 평가 중인지 여부입니다.</Text>
          <Properties
            items={[
              { label: "기밀성", value: "능력 C가 주어지면 출력 O는 K와 독립이어야 함 (누출 없음)" },
              { label: "채점 무결성", value: "점수 S는 정답 여부를 통해서만 O에 의존해야 함 (채점자 조작 없음)" },
              {
                label: "격리성",
                value: (
                  <span>
                    <Tex>{"P(O \\mid \\text{과제}, E=\\text{평가}) = P(O \\mid \\text{과제}, E=\\text{실사용})"}</Tex> (평가 인식으로 인한 차이 없음)
                  </span>
                ),
              },
              { label: "적응성 한계", value: "홀드아웃 조회 횟수가 일정 상한을 넘지 않아야 함 (Dwork식 보장)" },
            ]}
          />
          <Text>
            각 조건마다 부분적인 연구는 이미 있습니다. 하지만 보안 분야의 CIA 3요소처럼 하나의 위협 모델로 묶어 "어느 조건이 깨지면 어떤 결론이 무효가 되는가"를 정리한 틀은 이번 검색에서 찾지 못했습니다. 이 부분이 기여 지점이 될 수 있다고 봅니다. 다만 이번 검색이 빠짐없는 문헌 조사는 아니었습니다.
          </Text>
        </Section>
        <Callout lead="셋 중 하나를 더 판다면">
          3번은 논문 주제로 가장 구체적이고, 2번은 철학적으로 가장 깔끔합니다. 1번은 King's College 아카이브의 실제 문서를 봐야 결론이 바뀔 수 있습니다.
        </Callout>
      </Section>

      <Section heading="검증 결과 한눈에" id="verify">
        <Text>틀림 6개, 부분 2개, 보충 2개, 해석 3개. 번호는 위 Q&A 상자의 번호와 같다.</Text>
        <Table
          columns={["번호", "질문", "Moonlight 주장", "판정"]}
          rows={Object.entries(NOTES).map(([id, note]) => [
            id,
            QAS.filter((qa) => qa.notes.includes(id)).map((qa) => `Q${qa.n}`).join(", "),
            note.claim,
            note.verdict === "해석" ? note.verdict : { text: note.verdict, tone: note.verdict === "틀림" ? "danger" : "warning" },
          ])}
        />
        <Section heading="원문과 대조해 맞은 주장 (22개)">
          <Text>
            Gallup 여론조사와 "absurd"(§1) · 참가자 3명과 "either sex"(§1) · 머리카락 답변 인용(§1) · B의 최선 전략은 진실 말하기(§1) · 텔레프린터 사용(§1) · "sharp line between the physical and the intellectual"(§2) · 미인대회·비행기 경주 비유(§2) · "worthy one to investigate"(§2) · 저장 용량 = 상태 수의 log2(§5) · Manchester 기계 약 165,000(§5) · 범용성 논증(§5) · 예측 문장 내용(§6) · 반론 9개 목록(§6) · 괴델 반론 응답 "without any sort of proof"(§6) · "petty triumph"(§6) · 유아론과 "polite convention"(§6) · Lovelace 인용과 "Machines take me by surprise"(§6) · supercritical 비유(§6) · ESP "statistical evidence … overwhelming"과 "telepathy-proof room"(§6) · 뇌 용량 10¹⁰–10¹⁵, 맹인 상대 10⁹, 60명 50년(§7) · 아이 기계와 진화 유비 3줄(§7) · 마지막 문장(§7)
          </Text>
        </Section>
      </Section>
    </Page>
  );
}
