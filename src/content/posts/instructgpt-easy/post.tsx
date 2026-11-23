import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Table,
  Bars,
  Properties,
  Segmented,
  Diagram,
  useState,
} from "@/components/canvas";

// 이 글의 숫자는 모두 논문 PDF(arXiv:2203.02155v1)에서 다시 확인한 값이다. 새로 만든 숫자는 없다.

type StepKey = "sft" | "rm" | "ppo";

const STEP_OPTIONS = [
  { value: "sft" as const, label: "1단계 SFT" },
  { value: "rm" as const, label: "2단계 보상 모델" },
  { value: "ppo" as const, label: "3단계 PPO" },
];

const STEP_INFO: Record<StepKey, { label: string; value: string }[]> = {
  sft: [
    { label: "무엇을 하나", value: "레이블러가 프롬프트에 모범 답을 쓰고, GPT-3가 그 답을 따라 쓰도록 배웁니다 (p.6, §3.1)." },
    { label: "사람이 하는 일", value: "모범 답 쓰기 (시연 데이터)" },
    { label: "만들어지는 것", value: "SFT 모델: 지시를 대략 따르는 출발점" },
    { label: "학습 프롬프트 수", value: "약 1만 3천 개, API와 레이블러 작성 (p.7, §3.2)" },
    { label: "왜 맨 앞인가", value: "PPO가 SFT 모델에서 출발하고 (p.9, §3.5), 보상 모델이 배우는 비교 데이터도 대부분 SFT 모델의 답입니다 (p.6, §3.1)." },
  ],
  rm: [
    { label: "무엇을 하나", value: "레이블러가 모델 답 4~9개에 순위를 매기고, 보상 모델은 사람이 더 좋아한 답에 더 높은 점수를 주도록 배웁니다 (p.8, §3.5)." },
    { label: "사람이 하는 일", value: "답 여러 개를 1등부터 줄 세우기 (비교 데이터)" },
    { label: "만들어지는 것", value: "답 하나에 점수 하나를 매기는 6B 보상 모델 (p.8, §3.5)" },
    { label: "학습 프롬프트 수", value: "약 3만 3천 개, API와 레이블러 작성 (p.7, §3.2)" },
    { label: "왜 가운데인가", value: "PPO는 점수를 보상 모델에게서 받습니다 (p.6, §3.1). 그래서 보상 모델이 PPO보다 먼저 준비되어야 합니다." },
  ],
  ppo: [
    { label: "무엇을 하나", value: "SFT 모델이 새 프롬프트에 답을 쓰고, 보상 모델 점수가 오르는 쪽으로 고칩니다. SFT 모델에서 너무 멀어지면 KL 벌점을 받습니다 (p.9, §3.5)." },
    { label: "사람이 하는 일", value: "없음. 이 단계의 프롬프트에는 사람 라벨이 없습니다 (p.7, §3.2)." },
    { label: "만들어지는 것", value: "InstructGPT (PPO, 사전학습 섞기를 더하면 PPO-ptx)" },
    { label: "학습 프롬프트 수", value: "약 3만 1천 개, API만 (p.7, §3.2). 학습은 25만 6천 에피소드 (부록 C.4, p.42)" },
    { label: "왜 맨 끝인가", value: "앞의 두 단계가 만든 출발점(SFT)과 채점기(보상 모델)를 모두 씁니다. 2단계와 3단계는 여러 번 되풀이할 수 있습니다 (p.6, §3.1)." },
  ],
};

type MetricKey = "pref" | "hall" | "cost";

const METRIC_OPTIONS = [
  { value: "pref" as const, label: "선호율" },
  { value: "hall" as const, label: "환각률" },
  { value: "cost" as const, label: "계산량" },
];

const METRICS: Record<MetricKey, { bars: { label: string; value: number; display: string; meta?: string }[]; note: string }> = {
  pref: {
    bars: [
      { label: "vs 175B GPT-3", value: 85, display: "85±3%", meta: "175B InstructGPT 답을 고른 비율" },
      { label: "vs few-shot 175B GPT-3", value: 71, display: "71±4%", meta: "예시를 붙여 다듬은 GPT-3와 비교" },
    ],
    note: "지표: 레이블러 선호율. 평가 자료: 학습에 쓰지 않은 고객의 API 프롬프트 (p.3, §1; p.11, §4.1).",
  },
  hall: {
    bars: [
      { label: "GPT-3", value: 41, display: "41%" },
      { label: "InstructGPT", value: 21, display: "21%" },
    ],
    note: "지표: 입력에 없는 내용을 지어낸 비율(환각률). 과제: 요약처럼 입력 안에서만 답해야 하는 closed-domain 과제 (p.3, §1). 어느 모델 크기의 값인지는 본문에 없어 미확인입니다.",
  },
  cost: {
    bars: [
      { label: "175B SFT 학습", value: 4.9, display: "4.9" },
      { label: "175B PPO-ptx 학습", value: 60, display: "60" },
      { label: "GPT-3 사전학습", value: 3640, display: "3,640" },
    ],
    note: "단위: petaflops/s-days (p.17, §5.1). 1 petaflops/s-day는 1초에 1000조 번 계산하는 컴퓨터를 하루 돌린 양입니다 (논문 밖).",
  },
};

export default function App() {
  const [step, setStep] = useState<StepKey>("sft");
  const [metric, setMetric] = useState<MetricKey>("pref");

  const nodes = [
    { id: "gpt3", label: "사전학습 GPT-3", detail: "다음 단어 맞히기" },
    { id: "sft", label: "1단계 SFT", detail: step === "sft" ? "지금 보는 단계" : "모범 답 따라 쓰기" },
    { id: "rm", label: "2단계 보상 모델", detail: step === "rm" ? "지금 보는 단계" : "순위를 점수로" },
    { id: "ppo", label: "3단계 PPO", detail: step === "ppo" ? "지금 보는 단계" : "점수 오르게 고치기" },
    { id: "out", label: "InstructGPT", kind: "terminal" as const },
  ];
  const edges = [
    { from: "gpt3", to: "sft", label: "미세조정" },
    { from: "sft", to: "rm", label: "SFT 답을 줄 세움" },
    { from: "sft", to: "ppo", label: "출발점" },
    { from: "rm", to: "ppo", label: "보상 점수" },
    { from: "ppo", to: "out" },
  ];

  return (
    <Page
      title="InstructGPT 쉽게 보기 (Ouyang 외, 2022)"
      summary="저자들은 GPT-3를 사람의 모범 답, 사람의 순위 매기기, 그 순위를 배운 채점기 순서로 다시 가르쳤습니다. 그 결과 GPT-3는 크기가 100배 작아도 사람이 더 좋아하는 답을 쓰게 되었습니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "비유로 보는 논문 전체", id: "analogy" },
          { label: "먼저 알아 둘 것", id: "basics" },
          { label: "7단계로 읽기", id: "seven" },
          { label: "이후 연구 한 줄", id: "after" },
          { label: "꼭 읽을 원문 문장", id: "quotes" },
          { label: "확인 질문과 답", id: "check" },
          { label: "출처", id: "sources" },
        ]}
      />

      <Section heading="비유로 보는 논문 전체" id="analogy">
        <Text>
          식당에 신입 직원이 들어왔습니다. 먼저 선배가 손님 응대를 직접 보여 주고, 신입은 그대로 따라 합니다. 다음에는
          점장이 신입의 응대 여러 개를 보고 1등부터 꼴찌까지 줄을 세웁니다. 식당은 이 줄 세우기를 흉내 내는 자동 채점기를
          만듭니다. 마지막에 신입은 혼자 응대를 계속합니다. 신입은 채점기 점수가 오르도록 말투를 조금씩 고칩니다. 선배에게
          배운 방식에서 너무 멀어지면 감점을 받습니다.
        </Text>
        <Table
          columns={["비유", "논문에서"]}
          rows={[
            ["신입 직원", "GPT-3"],
            ["선배의 시범", "레이블러가 쓴 모범 답 (시연 데이터)"],
            ["점장의 줄 세우기", "레이블러의 순위 (비교 데이터)"],
            ["자동 채점기", "보상 모델"],
            ["혼자 고치기", "PPO"],
            ["감점", "KL 벌점"],
          ]}
        />
        <Callout lead="비유의 한계" tone="warning">
          신입은 왜 틀렸는지 말로 들을 수 있습니다. 모델은 숫자 점수 하나만 받습니다. 채점기도 사람을 흉내 낸 것이라 틀릴
          수 있습니다. 모델은 채점기의 그런 빈틈을 파고들 수 있습니다. 저자들이 감점 장치를 넣은 이유가 이것입니다 (p.9,
          §3.5).
        </Callout>
      </Section>

      <Section heading="먼저 알아 둘 것" id="basics">
        <Section heading="미세조정 (fine-tuning)">
          <Text>
            미세조정(fine-tuning)은 이미 학습한 모델을 새 자료로 조금 더 가르치는 일입니다. 요리를 다 배운 요리사에게 우리
            가게 메뉴만 따로 더 가르치는 일과 같습니다.
          </Text>
          <Text>
            이 논문에서: 저자들은 다음 단어 맞히기로 학습을 마친 GPT-3를 두 번 미세조정합니다. 한 번은 SFT이고, 한 번은
            PPO입니다 (p.8~9, §3.5).
          </Text>
        </Section>
        <Section heading="강화학습 (reinforcement learning, RL)">
          <Text>
            강화학습은 직접 해 보고 받은 점수로 행동을 고치는 학습입니다. 강아지가 앉을 때마다 간식을 주면, 강아지는 앉는
            행동을 점점 자주 합니다.
          </Text>
          <Text>
            이 논문에서: 답을 쓰는 모델을 정책(policy)이라고 부릅니다. 정책이 답을 쓰면 보상 모델이 점수(보상, reward)를
            줍니다. PPO는 그 점수가 오르는 쪽으로 정책을 고칩니다 (p.6, §3.1).
          </Text>
        </Section>
      </Section>

      <Section heading="7단계로 읽기" id="seven">
        <Section heading="1) 개관 (p.1, 초록; p.2~3, §1)">
          <Text>
            이 논문은 OpenAI 정렬(alignment, 모델이 사람의 의도대로 행동하게 맞추는 일) 팀이 2022년에 낸 실험 연구입니다.
            저자들은 GPT-3 구조 모델 세 크기(1.3B, 6B, 175B)를 썼습니다. B는 매개변수(parameter, 모델 안의 조절 손잡이)
            10억 개를 뜻합니다. 데이터는 OpenAI API 사용자가 보낸 프롬프트(prompt, 모델에게 주는 지시문)와 레이블러(labeler,
            돈을 받고 답을 쓰고 평가하는 사람) 약 40명이 만든 답과 순위입니다.
          </Text>
        </Section>

        <Section heading="2) 핵심 질문 (p.1, 초록; p.2, §1)">
          <Callout lead="핵심 질문" tone="info">
            사람의 피드백으로 미세조정하면 언어 모델이 사용자의 의도를 따르게 만들 수 있을까요?
          </Callout>
        </Section>

        <Section heading="3) 지식 공백 (p.1~2, §1; p.4~5, §2)">
          <Text>
            전에도 모델을 키운다고 지시를 잘 따르지는 않는다는 점이 알려져 있었습니다. 저자들은 그 원인을 목표의 차이로
            봅니다. "다음 단어 맞히기"는 "지시를 도움 되고 안전하게 따르기"와 다른 목표입니다 (p.2, §1). 사람 피드백
            강화학습(RLHF, reinforcement learning from human feedback)은 그전까지 요약 같은 좁은 과제에만 쓰였습니다. 이
            논문은 그 방법을 실제 사용자의 넓은 지시에 적용한 빈칸을 채웁니다 (p.4~5, §2).
          </Text>
        </Section>

        <Section heading="4) 방법 평가 (그림 2, p.3; §3.1, p.6; §3.5, p.8~9; §3.6, p.10)">
          <Text>
            질문의 목표가 "사람이 원하는 답"이므로, 사람의 선호를 점수로 쓰는 방법은 질문에 맞습니다. 저자들은 같은 구조의
            GPT-3, 예시를 붙여 다듬은 GPT-3(few-shot), 공개 데이터로 미세조정한 FLAN과 T0을 비교 대상으로 두었습니다
            (p.9, §3.5). 평가 프롬프트가 InstructGPT용이라 GPT-3에 불리할 수 있다는 점은 저자들도 인정합니다. 그래서
            저자들은 GPT-3용 프롬프트로도 다시 쟀습니다 (p.10, §3.6; 그림 3, p.11).
          </Text>
          <Text>
            <strong>3단계와 순서 (읽는 중점).</strong> 아래에서 단계를 고르면 흐름도의 그 단계에 "지금 보는 단계"가 표시되고, 단계의 내용과
            순서의 이유가 나옵니다. 흐름도는 그림 2를 참고해 새로 그린 것입니다.
          </Text>
          <Segmented options={STEP_OPTIONS} value={step} onChange={setStep} />
          <Diagram nodes={nodes} edges={edges} direction="vertical" />
          <Properties items={STEP_INFO[step]} />
          <Table
            columns={["용어", "뜻"]}
            rows={[
              ["SFT (지도 미세조정, supervised fine-tuning)", "사람이 쓴 모범 답을 따라 쓰게 가르치는 일"],
              ["RM (보상 모델, reward model)", "답 하나에 점수 하나를 매기는 채점 모델"],
              ["PPO (proximal policy optimization, 근접 정책 최적화)", "모델을 한 번에 크게 바꾸지 않고 조금씩 고치는 강화학습 방법 (논문 밖)"],
              ["KL 벌점 (KL penalty)", "원래 모델과 얼마나 달라졌는지 재서 깎는 점수"],
            ]}
          />
          <Text>
            사람이 PPO의 답에 일일이 점수를 매기기는 어렵습니다. 그래서 보상 모델이 사람 대신 점수를 매기는 구조로 보입니다
            (추정).
          </Text>
          <Properties
            items={[
              {
                label: "학습 방법 (쉽게)",
                value:
                  "SFT의 채점표는 \"모범 답과 얼마나 다르게 썼나\"입니다. 보상 모델의 채점표는 \"사람이 고른 답에 더 높은 점수를 줬나\"입니다. PPO는 채점기 점수가 오르는 쪽으로 조금씩 고칩니다. 원래 말투에서 멀어지면 감점을 받습니다.",
              },
              {
                label: "비용 (쉽게)",
                value:
                  "175B PPO-ptx 학습에는 60 petaflops/s-days가 들었고, GPT-3 사전학습(pretraining, 다음 단어 맞히기로 배우는 첫 단계)에는 3,640이 들었습니다 (p.17, §5.1). 정렬 학습에 든 계산은 GPT-3 사전학습의 약 60분의 1입니다 (3,640 ÷ 60 = 약 60.7). 컴퓨터 대수와 날짜는 논문에 안 나옵니다.",
              },
            ]}
          />
        </Section>

        <Section heading="5) 결과만 보고 내린 결론 (그림 1, p.1; p.3, §1; p.11, §4.1; 그림 4, p.12)">
          <Text>
            두 숫자가 가장 중요합니다. 첫째는 175B 크기끼리 직접 비교한 레이블러 선호율입니다. 둘째는 요약처럼 입력 안에서만
            답해야 하는 과제에서 지어낸 비율(환각률, hallucination rate)입니다. 아래에서 지표를 바꿔 보십시오. 지표마다
            막대를 따로 그려서 서로 다른 지표를 섞지 않았습니다. 계산량은 4)의 비용 숫자를 같은 방식으로 그린 것입니다.
          </Text>
          <Segmented options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
          <Bars bars={METRICS[metric].bars} />
          <Text>{METRICS[metric].note}</Text>
          <Callout lead="잠깐, 숫자만 보면 내 결론은?" tone="info">
            같은 크기라면 이 레이블러들은 이 API 프롬프트에서 InstructGPT 답을 100번 중 약 85번 골랐습니다. 지어내기 비율은
            약 절반으로 줄었습니다. 이 숫자는 특정 레이블러와 특정 프롬프트에서 나온 값입니다. 따라서 이 숫자만으로 "모든
            사람이 더 좋아한다"고 말할 수는 없습니다.
          </Callout>
        </Section>

        <Section heading="6) 저자 결론과 비교 (p.1, 초록; p.3, §1; p.13, §4.2; p.17, §5.1; p.21, 감사의 글)">
          <Text>
            저자 결론은 5)의 결론과 대체로 맞고, 초록에서도 "유망한 방향"이라고 조심스럽게 씁니다. 다만 §5.1의 "모델을 100배
            키우는 것보다 효과적"이라는 문장은 한 종류 프롬프트의 선호율에 기댄 주장입니다. 저자들도 "적어도 우리 고객의 과제
            분포에서"라는 조건을 붙였습니다.
          </Text>
          <Callout lead="과장 의심: 진실성 숫자" tone="warning">
            §1은 TruthfulQA에서 진실하고 유익한 답이 "약 두 배"라고 씁니다. 그런데 §4.2는 "작지만 유의미한 개선"이라고
            씁니다. 그림 6의 색 막대를 눈으로 읽으면 GPT는 약 20~25%, PPO는 약 25~30%입니다 (눈대중 값, 추정). 이 막대만으로는
            "두 배"가 나오지 않습니다. 감사의 글에도 자동 TruthfulQA 지표가 PPO의 개선을 부풀렸다는 지적을 받았다는 문장이
            있습니다.
          </Callout>
        </Section>

        <Section heading="7) 다른 설명과 한계 (p.8, §3.4; p.17, §4.3; p.18~19, §5.2~5.3)">
          <Table
            columns={["구분", "내용"]}
            rows={[
              [
                "다른 설명",
                "학습 데이터를 만든 레이블러 집단이 평가도 했습니다. 그래서 이긴 답이 객관적으로 좋은 답이 아니라 이 집단의 취향에 맞는 답일 수 있습니다. 저자들은 학습에 참여하지 않은 레이블러로도 쟀지만, 이 레이블러들도 같은 업체에서 뽑혔습니다 (p.8, §3.4).",
              ],
              [
                "저자의 추측",
                "모델이 간단한 질문에도 지나치게 얼버무리는 이유를 저자들은 이렇게 추측합니다. 레이블러에게 겸손한 답을 높게 평가하라고 지시했고, 보상 모델이 그 경향을 배웠을 것이라는 추측입니다 (p.17).",
              ],
              [
                "저자가 인정한 한계",
                "저자들이 맞춘 대상은 영어를 주로 쓰는 레이블러 약 40명의 선호입니다. 비교 대부분은 레이블러 1명만 했습니다. 모델은 해로운 지시도 대체로 따릅니다 (p.18~19, §5.2~5.3).",
              ],
              [
                "이후 알려진 문제 (논문 밖)",
                "보상 모델 점수만 오르고 실제 품질은 떨어지는 보상 과최적화(reward over-optimization)가 알려졌습니다. 사용자 의견에 맞장구치는 아첨(sycophancy)과 긴 답을 선호하는 길이 편향도 RLHF 모델의 문제로 보고되었습니다.",
              ],
            ]}
          />
        </Section>
      </Section>

      <Section heading="이후 연구 한 줄" id="after">
        <Text>
          (논문 밖) 같은 해 11월 OpenAI는 비슷한 방법으로 학습한 ChatGPT를 공개했습니다. 2023년에는 DPO(직접 선호 최적화,
          Direct Preference Optimization)가 나왔습니다. DPO는 보상 모델과 PPO 없이 비교 데이터로 모델을 바로 학습합니다.
        </Text>
      </Section>

      <Section heading="꼭 읽을 원문 문장" id="quotes">
        <Section heading="① 핵심 질문">
          <Properties
            items={[
              { label: "위치", value: "p.1, 초록 / 검색어: bigger, inherently, user's intent" },
              { label: "원문", value: "“Making language models bigger does not inherently make them better at following a user’s intent.”" },
              { label: "번역", value: "언어 모델(language model)을 더 크게 만든다고 사용자의 의도(intent)를 더 잘 따르게 되는 것은 아닙니다." },
              { label: "왜 중요한가", value: "크기만 키워서는 해결되지 않는 문제가 있다는 것이 이 논문의 출발점입니다." },
            ]}
          />
        </Section>
        <Section heading="② 핵심 아이디어 1">
          <Properties
            items={[
              { label: "위치", value: "p.2, §1 / 검색어: human preferences, reward signal" },
              { label: "원문", value: "“This technique uses human preferences as a reward signal to fine-tune our models.”" },
              { label: "번역", value: "이 기법은 사람의 선호(human preference)를 보상 신호(reward signal)로 써서 모델을 미세조정(fine-tune)합니다." },
              { label: "왜 중요한가", value: "사람이 좋아하는 정도를 점수로 바꾸는 것이 RLHF의 핵심입니다." },
            ]}
          />
        </Section>
        <Section heading="③ 핵심 아이디어 2">
          <Properties
            items={[
              { label: "위치", value: "p.9, §3.5 / 검색어: per-token KL penalty, over-optimization" },
              { label: "원문", value: "“In addition, we add a per-token KL penalty from the SFT model at each token to mitigate over-optimization of the reward model.”" },
              { label: "번역", value: "저자들은 보상 모델(reward model)의 과최적화(over-optimization)를 줄이기 위해, 토큰(token, 모델이 한 번에 쓰는 글자 조각)마다 SFT 모델 기준의 KL 벌점(KL penalty)을 더합니다." },
              { label: "왜 중요한가", value: "PPO가 SFT 모델을 기준으로 삼는다는 것이 SFT가 먼저 와야 하는 이유 중 하나입니다." },
            ]}
          />
        </Section>
        <Section heading="④ 핵심 결과">
          <Properties
            items={[
              { label: "위치", value: "p.3, §1 / 검색어: 175B InstructGPT, preferred, 85" },
              { label: "원문", value: "“Outputs from our 175B InstructGPT are preferred to 175B GPT-3 outputs 85 ± 3% of the time”" },
              { label: "번역", value: "175B InstructGPT의 출력은 175B GPT-3의 출력보다 85±3%의 비율로 선호(prefer)되었습니다." },
              { label: "왜 중요한가", value: "같은 크기에서 사람 피드백만 더했는데도 사람의 선택이 크게 갈렸습니다." },
            ]}
          />
        </Section>
        <Section heading="⑤ 저자가 인정한 한계">
          <Properties
            items={[
              { label: "위치", value: "p.19, §5.3 / 검색어: greatest limitation, follow, harm" },
              { label: "원문", value: "“Perhaps the greatest limitation of our models is that, in most cases, they follow the user’s instruction, even if that could lead to harm in the real world.”" },
              { label: "번역", value: "저자들이 꼽은 가장 큰 한계는, 모델이 실제 세계에 해를 끼칠 수 있는 지시라도 대부분 따른다는 점입니다." },
              { label: "왜 중요한가", value: "지시를 잘 따르는 능력이 안전함과 같은 뜻은 아닙니다." },
            ]}
          />
        </Section>
      </Section>

      <Section heading="확인 질문과 답" id="check">
        <Callout lead="확인 질문" tone="info">
          3단계 PPO에서 모델의 답에 점수를 매기는 것은 사람인가요, 보상 모델인가요? 그 답을 바탕으로, 2단계가 3단계보다 먼저
          와야 하는 이유를 말로 설명해 보십시오.
        </Callout>
        <Text>
          <strong>답과 근거.</strong> PPO에서 점수를 매기는 것은 사람이 아니라 보상 모델입니다. 저자들은 3단계에서 보상 모델의
          출력을 점수(보상) 하나로 쓴다고 적었습니다 (p.6, §3.1). 학습 환경은 프롬프트를 주고, 답이 나오면 보상 모델이 정한
          점수를 주고 끝납니다 (p.9, §3.5). 그래서 PPO를 시작하려면 보상 모델이 이미 학습되어 있어야 합니다. 보상 모델은 2단계에서
          레이블러가 모델 답 4~9개를 줄 세운 비교 데이터로 배웁니다 (p.6, §3.1; p.8, §3.5). PPO 단계의 프롬프트에는 사람 라벨이
          없습니다 (p.7, §3.2). PPO는 25만 6천 에피소드 동안 학습하므로 (부록 C.4, p.42), 사람 대신 보상 모델이 점수를 매기는
          편이 현실적이었을 것으로 보입니다 (추정).
        </Text>
      </Section>

      <Section heading="출처" id="sources">
        <Text>
          Long Ouyang 외, "Training language models to follow instructions with human feedback", 2022, arXiv:2203.02155.{" "}
          <a href="https://arxiv.org/abs/2203.02155">https://arxiv.org/abs/2203.02155</a>
        </Text>
        <Callout lead="확인 방법">
          인용문 5개와 숫자(85±3%, 71±4%, 21%와 41%, 4.9와 60과 3,640 petaflops/s-days, 약 1만 3천·3만 3천·3만 1천 프롬프트, 25만
          6천 에피소드)는 PDF에서 추출한 본문과 대조했습니다. 쪽 번호도 PDF에서 다시 확인했습니다. 그림 6의 값은 그림을 눈으로
          읽은 것입니다. 흐름도는 논문 그림을 옮기지 않고 새로 그렸습니다.
        </Callout>
      </Section>
    </Page>
  );
}
