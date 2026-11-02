import { Page, Section, Text, Callout, Table, Steps, Properties, TableOfContents } from "@/components/canvas";
import { Tex } from "@/components/Tex";

const SRC = {
  lfm: "https://press.uchicago.edu/ucp/books/book/chicago/W/bo3616369.html",
  bridge: "https://www.tandfonline.com/doi/full/10.1080/09608788.2024.2373133",
  floydNwr: "https://www.nordicwittgensteinreview.com/article/view/3435/pdf",
  shanker: "https://projecteuclid.org/journals/notre-dame-journal-of-formal-logic/volume-28/issue-4/Wittgenstein-versus-Turing-on-the-nature-of-Churchs-thesis/10.1305/ndjfl/1093637650.pdf",
  pi: "https://philarchive.org/archive/RALWRO",
  floyd2016: "https://mdetlefsen.nd.edu/assets/201037/jf.turing.pdf",
  proudfoot: "https://philarchive.org/rec/PRORTT-3",
  myths: "https://sciforum.net/paper/22421",
  pnas: "https://pubmed.ncbi.nlm.nih.gov/42154549",
  thought: "https://link.springer.com/article/10.1007/s11023-022-09616-8",
  facct: "https://dl.acm.org/doi/10.1145/3715275.3732108",
  contam: "https://aclanthology.org/2026.gem-main.50",
  matharena: "https://proceedings.neurips.cc/paper_files/paper/2025/file/1d27c01ebd3e3aebe226b44fc970d803-Paper-Datasets_and_Benchmarks_Track.pdf",
  holdout: "https://proceedings.neurips.cc/paper/2015/hash/bad5f33780c42f2588878a9d07405083-Abstract.html",
  evalAware: "https://arxiv.org/abs/2505.23836",
  hacking: "https://link.springer.com/article/10.1007/s44163-026-01980-z",
};

export default function App() {
  return (
    <Page
      title="튜링 이미테이션 게임"
      summary="요약: (1) 튜링은 비트겐슈타인의 1939년 강의를 들었지만, 모방 게임 설계에 영향을 주었다는 직접 증거는 없습니다. (2) 튜링 테스트는 통과는 증거가 되지만 실패는 반증이 되지 않는 기준이고, 논문 속 예측은 반증 가능한 가설로 2025–26년에 충족되었습니다. (3) ESP 반론은 오늘날 데이터 오염·평가 인식·채점자 조작과 대응합니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "튜링은 비트겐슈타인의 1939년 강의를 들었는가", id: "wittgenstein" },
          { label: "검증가능성 vs 반증가능성", id: "falsifiability" },
          { label: "ESP 반론의 현대적 재해석", id: "esp" },
          { label: "Moonlight 답변 검증: 틀린 곳 6개", id: "verify" },
        ]}
      />

      <Section heading="튜링은 비트겐슈타인의 1939년 강의를 실제로 들었는가?" id="wittgenstein">
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

      <Section heading="검증가능성 vs 반증가능성" id="falsifiability">
        <Callout lead="결론">
          기준으로서의 튜링 테스트는 한 방향으로만 작동합니다(통과는 증거가 되지만 실패는 반증이 되지 않음). 반면 논문 속 튜링의 예측은 명확하게 반증 가능한 가설이었고, 실제로 시험을 거쳤습니다.
        </Callout>
        <Section heading="(1) 테스트는 충분조건일 뿐입니다 (튜링 본인의 주장)">
          <Text>
            원문 1절에 이런 반론이 나옵니다. 기계가 인간과 매우 다른 방식으로 생각할 수도 있지 않은가? 튜링은 이렇게 답합니다. 그래도 기계가 게임을 잘 해낸다면 "we need not be troubled by this objection(이 반론에 신경 쓸 필요가 없다)". 즉 통과는 사고의 증거가 됩니다. 하지만 실패는 "기계는 생각하지 못한다"를 반증하지 못합니다. 질문에서 말씀하신 "더 큰 기계" 도피로가 여기서 생깁니다. Dennett과 Shieber도 이 테스트를 개념적 충분조건으로 읽습니다(<a href={SRC.thought}>Minds and Machines 2022</a>).
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

      <Section heading="ESP 반론의 현대적 재해석" id="esp">
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

      <Section heading="Moonlight 답변 검증: 틀린 곳 6개" id="verify">
        <Text>
          Moonlight 답변은 원문 그대로 두고, 틀린 문장 끝에만 각주를 달았어요. 판정은 확인, 틀림, 부분, 보충, 해석, 미확인 6가지예요. 각주는 "판정 → 무엇이 틀렸나 → 바른 내용 → 근거" 순서로 씁니다.
        </Text>
        <Table
          columns={["각주", "Moonlight 답변", "실제"]}
          rows={[
            ["v2", '10⁹비트는 "약 1GB"', "약 125MB예요. 8배 크게 잡았어요"],
            ["v3", "70% 기준을 엄밀히 실험한 사례가 적다", "2025–26년 실험에서 GPT-4.5가 73% 비율로 인간으로 판정됐어요"],
            ["v4", "튜링은 저장 용량만 있으면 된다고 봤다", '튜링은 핵심 문제를 "프로그래밍"으로 봤고, 그래서 학습하는 기계를 제안했어요(§7)'],
            ["v8", "게재 정보 Mind 49권", "Mind 59권이에요. 보고 계신 PDF 첫 줄의 오기를 그대로 옮긴 것으로 보여요"],
            ["v9", "튜링이 1939년 강의를 들었는지는 논쟁적이다", "청강 기록이 있어요. 논쟁이 되는 건 영향을 받았느냐예요"],
            ["v10", '1939년 강의에서 "기계가 생각할 수 있는가"를 다뤘다', "강의 주제는 수학의 기초였어요. 기계와 사고 문제는 『청색 책』에서 다뤘어요"],
          ]}
        />
      </Section>
    </Page>
  );
}
