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
  useMemo,
  useState,
} from "@/components/canvas";

// 이 글의 숫자는 모두 논문 PDF(arXiv:2201.11903v6)에서 다시 확인한 값이다. 새로 만든 숫자는 없다.

type PromptKey = "standard" | "cot";

const PROMPT_OPTIONS = [
  { value: "standard" as const, label: "표준 프롬프팅" },
  { value: "cot" as const, label: "사고의 사슬 프롬프팅" },
];

const EXAMPLE_QUESTION =
  "로저는 테니스공 5개가 있습니다. 테니스공 캔 2개를 더 삽니다. 캔마다 공이 3개 들어 있습니다. 지금 공은 몇 개일까요?";
const NEW_QUESTION =
  "식당에 사과가 23개 있었습니다. 점심을 만드는 데 20개를 쓰고 6개를 더 샀습니다. 사과는 몇 개일까요?";

const PROMPTS: Record<PromptKey, { label: string; value: string }[]> = {
  standard: [
    { label: "예시 질문", value: EXAMPLE_QUESTION },
    { label: "예시 답", value: "답은 11입니다." },
    { label: "새 질문", value: NEW_QUESTION },
    { label: "모델 출력", value: "답은 27입니다. (오답)" },
  ],
  cot: [
    { label: "예시 질문", value: EXAMPLE_QUESTION },
    {
      label: "예시 답",
      value: "로저는 처음 공 5개가 있었습니다. 3개씩 든 캔 2개는 공 6개입니다. 5 더하기 6은 11입니다. 답은 11입니다.",
    },
    { label: "새 질문", value: NEW_QUESTION },
    {
      label: "모델 출력",
      value:
        "식당에는 처음 사과가 23개 있었습니다. 점심에 20개를 썼습니다. 그래서 23 빼기 20은 3입니다. 6개를 더 샀으므로 3 더하기 6은 9입니다. 답은 9입니다. (정답)",
    },
  ],
};

type FamilyKey = "lamda" | "gpt" | "palm";

const FAMILY_OPTIONS = [
  { value: "lamda" as const, label: "LaMDA" },
  { value: "gpt" as const, label: "GPT-3" },
  { value: "palm" as const, label: "PaLM" },
];

// 표 2 (p.21), GSM8K 정답률(%). [크기, 표준 프롬프팅, 사고의 사슬 프롬프팅]
const GSM8K: Record<FamilyKey, [string, number, number][]> = {
  lamda: [
    ["420M", 2.6, 0.4],
    ["2B", 3.6, 1.9],
    ["8B", 3.2, 1.6],
    ["68B", 5.7, 8.2],
    ["137B", 6.5, 14.3],
  ],
  gpt: [
    ["350M", 2.2, 0.5],
    ["1.3B", 2.4, 0.5],
    ["6.7B", 4.0, 2.4],
    ["175B", 15.6, 46.9],
  ],
  palm: [
    ["8B", 4.9, 4.1],
    ["62B", 9.6, 29.9],
    ["540B", 17.9, 56.9],
  ],
};

const FAMILY_NOTE: Record<FamilyKey, string> = {
  lamda: "LaMDA는 다섯 번(예시 순서를 바꿔서) 잰 값의 평균입니다 (p.4, §3.1).",
  gpt: "GPT-3 크기는 저자들도 \"아마(presumably)\"라고 적은 추정치입니다 (p.4, §3.1).",
  palm: "PaLM 540B는 이 논문에서 가장 큰 모델입니다.",
};

export default function App() {
  const [prompt, setPrompt] = useState<PromptKey>("cot");
  const [family, setFamily] = useState<FamilyKey>("palm");

  const gainBars = useMemo(
    () =>
      GSM8K[family].map(([size, std, cot]) => {
        const gain = Math.round((cot - std) * 10) / 10;
        return {
          label: size,
          value: gain,
          display: `${gain > 0 ? "+" : ""}${gain.toFixed(1)}포인트`,
          meta: `표준 ${std.toFixed(1)}% → 사고의 사슬 ${cot.toFixed(1)}%`,
        };
      }),
    [family],
  );

  return (
    <Page
      title="사고의 사슬 프롬프팅 쉽게 보기 (Wei 외, 2022)"
      summary="예시 문제마다 답 앞에 풀이 과정을 적어 보여 주면, 아주 큰 언어 모델은 새 문제도 단계별로 풀어 정답률이 크게 오릅니다."
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
          선생님이 칠판에 예제 8개를 적습니다. 예제마다 문제, 풀이 과정, 답이 있습니다. 고학년 학생은 같은 방식으로 풀이를
          적으며 새 문제를 맞힙니다. 저학년 학생은 풀이 모양만 흉내 내고 오히려 더 틀립니다.
        </Text>
        <Table
          columns={["비유", "논문에서"]}
          rows={[
            ["칠판 예제 8개", "프롬프트 속 예시"],
            ["문제, 풀이, 답", "입력, 사고의 사슬, 출력"],
            ["학생", "거대 언어 모델"],
            ["학년", "모델 크기 (매개변수 수)"],
            ["학생을 따로 가르치지 않음", "모델을 다시 훈련하지 않음"],
          ]}
        />
        <Callout lead="비유의 한계" tone="warning">
          학생은 예제를 보고 머릿속이 바뀝니다. 모델은 내부가 전혀 바뀌지 않고, 그 자리에서 글을 이어 쓸 뿐입니다. 모델이
          사람처럼 정말 "생각"하는지는 저자들도 답하지 않았습니다 (p.9, §6).
        </Callout>
      </Section>

      <Section heading="먼저 알아 둘 것" id="basics">
        <Section heading="거대 언어 모델 (large language model)">
          <Text>
            거대 언어 모델은 아주 많은 글을 읽고 다음 말을 이어 쓰도록 훈련한 프로그램입니다. 책을 엄청나게 많이 읽은 "이어
            쓰기 기계"라고 생각하면 됩니다. 크기는 매개변수(parameter, 모델 안에 있는 조절 손잡이의 개수)로 잽니다.
          </Text>
          <Text>
            이 논문에서: 저자들은 크기가 다른 모델 5종(GPT-3, LaMDA, PaLM, UL2, Codex)을 그대로 가져와 실험했습니다 (p.4,
            §3.1).
          </Text>
        </Section>
        <Section heading="퓨샷 프롬프팅 (few-shot prompting)">
          <Text>
            퓨샷 프롬프팅은 질문 앞에 풀어 놓은 예시 몇 개를 붙여서 모델에 주는 방법입니다. 처음 보는 게임을 규칙 설명 대신
            "이렇게 하는 거야" 하고 몇 판 보여 주는 것과 같습니다.
          </Text>
          <Text>
            이 논문에서: 비교 대상인 표준 프롬프팅(standard prompting, 예시에 질문과 답만 있는 방식)과 이 논문의 방법이 모두
            이 방식을 씁니다 (p.3, §3.1).
          </Text>
        </Section>
      </Section>

      <Section heading="7단계로 읽기" id="seven">
        <Section heading="1) 개관 (p.1; p.3~4, §3.1)">
          <Text>
            Google Research Brain Team의 저자들이 NeurIPS 2022에 낸 실험 연구입니다. 저자들은 모델을 새로 훈련하지 않았습니다.
            이미 만들어진 모델에 프롬프트만 바꿔 넣고 수학, 상식, 기호 문제를 풀게 했습니다.
          </Text>
        </Section>

        <Section heading="2) 핵심 질문 (p.2, §1)">
          <Callout lead="핵심 질문" tone="info">
            예시의 답 앞에 단계별 풀이를 넣기만 해도 거대 언어 모델이 여러 단계를 거쳐야 하는 문제를 더 잘 풀게 될까요, 그리고
            그 효과는 어느 크기의 모델부터 나타날까요?
          </Callout>
        </Section>

        <Section heading="3) 지식 공백 (p.2, §1)">
          <Text>
            전에는 모델이 풀이를 쓰게 하려면 풀이가 달린 데이터를 많이 만들어 미세 조정(finetuning, 이미 만든 모델을 특정 일에
            맞게 더 훈련하는 것)을 해야 했습니다. 풀이 없이 예시만 주는 표준 프롬프팅은 추론 문제에서 약했고, 모델을 키워도
            별로 나아지지 않았습니다. 이 논문은 "미세 조정 없이 예시 8개만으로 풀이를 끌어낼 수 있는가"라는 빈칸을 채웁니다.
          </Text>
        </Section>

        <Section heading="4) 방법 평가 (p.3~6, §3.1, §3.3)">
          <Text>
            사고의 사슬 프롬프팅(chain-of-thought prompting)은 예시 8개마다 질문과 답 사이에 풀이 문장을 넣는 방법입니다. 예를
            들면 "처음 공이 5개다. 3개씩 든 2캔은 6개다. 합치면 11개다. 답은 11이다."처럼 씁니다. 비교 대상은 같은 예시에서
            풀이만 뺀 표준 프롬프팅입니다. 저자들은 같은 모델과 같은 문제로 비교했으므로 공정한 편입니다.
          </Text>
          <Text>
            <strong>두 프롬프트 비교.</strong> 아래에서 방식을 바꿔 보십시오. 예시 답에 풀이가 있는지만 다르고, 질문은 같습니다.
            내용은 그림 1(p.1)의 글을 우리말로 옮겨 새로 짠 것입니다. 그림에는 어느 모델의 출력인지 적혀 있지 않아 모델 이름은
            미확인입니다.
          </Text>
          <Segmented options={PROMPT_OPTIONS} value={prompt} onChange={setPrompt} />
          <Properties items={PROMPTS[prompt]} />
          <Text>
            저자들은 절제 실험(ablation, 한 부분씩 바꿔 보며 무엇이 효과를 내는지 가리는 실험)으로 "식만 쓰기", "점만 찍기",
            "답 뒤에 풀이 쓰기"를 시험했습니다. 이 실험으로 효과의 원인이 풀이 문장 자체인지 확인했습니다.
          </Text>
          <Properties
            items={[
              {
                label: "학습 방법 (쉽게)",
                value:
                  "이 논문에는 학습 단계가 없습니다. 모델 머릿속은 그대로 두고 시험지 맨 앞에 풀이 예시 8장을 붙여 줄 뿐입니다. 답을 쓸 때는 매번 가장 그럴듯한 다음 말 하나를 고르는 방식(탐욕적 디코딩, greedy decoding)을 썼습니다 (p.4, §3.1).",
              },
              {
                label: "비용 (쉽게)",
                value:
                  "새로 훈련하는 비용은 없습니다. 큰 모델을 돌리는 데 구글 전용 칩(TPU) 64개(LaMDA 137B)와 192개(PaLM 540B)를 썼습니다. 전체 계산량이 전보다 몇 배인지는 논문에 안 나옴 (p.30, 부록 E.2).",
              },
            ]}
          />
        </Section>

        <Section heading="5) 결과만 보고 내린 결론 (p.4~5, §3.2, 그림 4; p.21, 표 2)">
          <Text>
            가장 중요한 숫자는 GSM8K(초등 수학 서술형 문제 1,319개)의 정답률(solve rate, 맞힌 문제의 비율)입니다. PaLM 540B에서
            표준 프롬프팅은 17.9%였고, 사고의 사슬 프롬프팅은 56.9%였습니다. 크기별로 보면 매개변수 100억 개 이하 모델 7개는
            모두 정답률이 오히려 떨어졌습니다 (예: PaLM 8B는 4.9%에서 4.1%로). 반면 PaLM 62B는 9.6%에서 29.9%로, GPT-3
            175B는 15.6%에서 46.9%로 올랐습니다.
          </Text>
          <Text>
            <strong>크기별 변화량.</strong> 아래에서 모델 가족을 고르십시오. 막대는 사고의 사슬 정답률에서 표준 정답률을 뺀
            값(포인트, 정답률 % 숫자끼리의 차이)입니다. 떨어진 경우는 다른 색으로 보입니다. 지표는 모두 GSM8K 정답률이고, 값은
            표 2(p.21)에서 옮겼습니다.
          </Text>
          <Segmented options={FAMILY_OPTIONS} value={family} onChange={setFamily} />
          <Bars bars={gainBars} />
          <Text>{FAMILY_NOTE[family]}</Text>
          <Callout lead="잠깐, 숫자만 보면 내 결론은?" tone="info">
            사고의 사슬은 작은 모델에는 해롭고 큰 모델에는 크게 도움이 됩니다. 효과가 커지는 지점은 수백억에서 천억 개
            사이입니다. 하지만 잰 크기가 띄엄띄엄 있어서 정확한 문턱은 숫자로 정할 수 없습니다.
          </Callout>
        </Section>

        <Section heading="6) 저자 결론과 비교 (p.4, §3.2; p.16, 부록 A.1; p.9, §6)">
          <Text>
            저자들은 효과가 "약 1,000억 개(∼100B)" 크기부터 나온다고 썼습니다. 5)의 결론과 대체로 맞습니다. 다만 PaLM 62B도
            20.3포인트나 올랐으므로 "100B"는 대략적인 눈금입니다.
          </Text>
          <Text>
            왜 큰 모델에서만 되는지에 대해 저자들은 "크기가 커지면서 뜻 이해와 논리 능력이 생긴다"는 가설(hypothesis)과 맞아
            보인다고만 썼습니다. 이것은 확인된 주장이 아니라 추측입니다.
          </Text>
          <Callout lead="과장 의심: 제목" tone="warning">
            제목은 "추론을 이끌어 낸다"지만, 저자들 스스로 정말 추론인지는 열린 질문으로 남겼습니다. 그래서 제목이 결과보다 조금
            앞서 갑니다 (추정).
          </Callout>
        </Section>

        <Section heading="7) 다른 설명과 한계 (p.16, 부록 A.1; p.9, §6; p.18, 부록 A.2)">
          <Table
            columns={["구분", "내용"]}
            rows={[
              [
                "다른 설명",
                "모델이 커질 때 훈련 계산량도 함께 커집니다. 그래서 효과의 원인이 크기 자체인지 가를 수 없고, 저자들도 이 점을 인정했습니다 (p.16, 부록 A.1).",
              ],
              [
                "저자가 인정한 한계",
                "정말 추론인지 모른다는 점, 풀이가 틀려도 답이 우연히 맞을 수 있다는 점, 큰 모델에서만 통해서 비용이 크다는 점 (p.9, §6). GPT-3에서는 CSQA와 StrategyQA에 효과가 없었다는 점 (p.18, 부록 A.2).",
              ],
              [
                "이후 알려진 문제 (논문 밖)",
                "모델이 쓴 풀이가 실제로 답을 정한 이유와 다를 수 있다는 연구가 나왔습니다 (Turpin 외, 2023). 갑자기 나타나는 것처럼 보이는 능력이 채점 방식 때문일 수 있다는 반론도 나왔습니다 (Schaeffer 외, 2023).",
              ],
            ]}
          />
        </Section>
      </Section>

      <Section heading="이후 연구 한 줄" id="after">
        <Text>
          (논문 밖) 같은 해에 두 방법이 나왔습니다. 하나는 예시 없이 "차근차근 생각해 보자" 한 문장만 붙이는 방법입니다
          (Kojima 외, 2022). 다른 하나는 풀이를 여러 번 뽑아 다수결로 답을 고르는 방법입니다 (Wang 외, 2022, 이 논문 p.4에도
          언급). 이후에는 긴 풀이를 쓰도록 아예 훈련한 추론 모델(OpenAI o1, DeepSeek-R1 등)로 이어졌습니다.
        </Text>
      </Section>

      <Section heading="꼭 읽을 원문 문장" id="quotes">
        <Text>
          긴 인용을 옮기지 않으려고 핵심 결과 한 곳만 짧게 인용했습니다. 나머지는 검색어로 PDF에서 바로 찾을 수 있습니다.
          검색어는 모두 논문 안에서 한 번만 나옵니다.
        </Text>
        <Section heading="① 핵심 질문">
          <Properties
            items={[
              { label: "위치", value: "p.2, §1 / 검색어: consists of triples" },
              { label: "원문", value: "PDF에서 검색어로 확인하십시오." },
              {
                label: "번역 요지",
                value:
                  "저자들은 ⟨입력, 사고의 사슬, 출력⟩ 세 묶음으로 된 프롬프트를 주었을 때 언어 모델이 추론 문제를 퓨샷 프롬프팅으로 풀 수 있는지 살펴봅니다.",
              },
              { label: "왜 중요한가", value: "이 논문이 바꾼 것이 예시의 모양 하나뿐이라는 점을 보여 줍니다." },
            ]}
          />
        </Section>
        <Section heading="② 핵심 아이디어 1">
          <Properties
            items={[
              { label: "위치", value: "p.3, §2 / 검색어: provided in the exemplars for few-shot" },
              { label: "원문", value: "PDF에서 검색어로 확인하십시오." },
              {
                label: "번역 요지",
                value: "퓨샷 예시에 사고의 사슬 시범이 들어 있으면, 충분히 큰 언어 모델은 스스로 사고의 사슬을 만들어 냅니다.",
              },
              { label: "왜 중요한가", value: "모델을 고치지 않고 예시만으로 풀이를 끌어낸다는 것이 이 논문의 핵심 주장입니다." },
            ]}
          />
        </Section>
        <Section heading="③ 핵심 아이디어 2">
          <Properties
            items={[
              { label: "위치", value: "p.6, §3.3 / 검색어: variable computation by itself" },
              { label: "원문", value: "PDF에서 검색어로 확인하십시오." },
              {
                label: "번역 요지",
                value:
                  "점만 찍게 해서 계산할 자리를 늘려 주는 것만으로는 효과가 없었습니다. 중간 단계를 자연어(natural language, 사람이 쓰는 말)로 쓰는 것에 쓸모가 있어 보입니다.",
              },
              {
                label: "왜 중요한가",
                value:
                  "효과의 원인이 \"글자 수가 늘어서\"가 아니라 \"풀이 내용\"이라는 근거입니다. 다만 저자들은 \"있어 보인다(appears)\"라고 조심스럽게 썼습니다.",
              },
            ]}
          />
        </Section>
        <Section heading="④ 핵심 결과">
          <Properties
            items={[
              { label: "위치", value: "p.4, §3.2 / 검색어: only yields performance gains" },
              { label: "원문", value: "“only yields performance gains when used with models of ∼100B parameters”" },
              { label: "번역", value: "매개변수가 약 1,000억 개인 모델에서 쓸 때만 성능이 오릅니다." },
              { label: "왜 중요한가", value: "\"어떤 크기부터 효과가 나는가\"에 대한 저자들의 답입니다." },
            ]}
          />
        </Section>
        <Section heading="⑤ 저자가 인정한 한계">
          <Properties
            items={[
              { label: "위치", value: "p.9, §6 / 검색어: leave as an open question" },
              { label: "원문", value: "PDF에서 검색어로 확인하십시오." },
              {
                label: "번역 요지",
                value:
                  "사고의 사슬이 사람의 생각 과정을 흉내 내더라도 신경망(neural network)이 정말 \"추론\"하는지는 답하지 못합니다. 저자들은 이것을 열린 질문으로 남깁니다.",
              },
              { label: "왜 중요한가", value: "정답률이 올랐다는 것과 모델이 생각한다는 것은 다른 이야기라는 점을 짚습니다." },
            ]}
          />
        </Section>
      </Section>

      <Section heading="확인 질문과 답" id="check">
        <Callout lead="확인 질문" tone="info">
          PaLM 8B와 PaLM 540B에 똑같은 풀이 예시 8개를 주었는데, 8B는 정답률이 떨어지고 540B는 세 배 넘게 올랐습니다. 저자들이
          작은 모델이 쓴 풀이를 보고 어떤 모습이었다고 적었는지(p.4, §3.2) 떠올려 보세요. 그 모습으로 "풀이 예시만 넣는다고 작은
          모델이 좋아지지 않는 이유"를 말로 설명해 보십시오.
        </Callout>
        <Text>
          <strong>답과 근거.</strong> 저자들은 작은 모델이 문장은 매끄럽지만 논리가 맞지 않는(fluent but illogical) 풀이를 써서
          표준 프롬프팅보다 성적이 낮았다고 적었습니다 (p.4, §3.2). 부록에서는 세 가지를 더 관찰했습니다. 작은 모델은 예시와 같은
          틀을 새 기호에 옮기는 쉬운 일도 못 했고, 셈 자체가 약했고, 같은 말을 되풀이하거나 끝내 답에 이르지 못해 최종 답을 읽어 낼
          수 없는 경우가 많았습니다 (p.16, 부록 A.1). 또 PaLM 62B가 틀린 45문제를 540B로 다시 풀었더니 뜻 이해 오류 20개 중 6개,
          한 단계 빠짐 오류 18개 중 12개, 기타 오류 7개 중 4개가 고쳐졌습니다 (p.16, 그림 9). 즉 풀이 예시는 "어떤 모양으로 쓰라"는
          틀만 알려 줍니다. 그 틀의 각 칸을 맞게 채우는 능력은 모델 크기에 따라 달라 보입니다. 다만 이 능력이 크기 때문에 생긴다는
          설명은 저자들의 가설이고 확인된 원인은 아닙니다 (p.16, 부록 A.1).
        </Text>
      </Section>

      <Section heading="출처" id="sources">
        <Text>
          Jason Wei 외, "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models", NeurIPS 2022,
          arXiv:2201.11903. <a href="https://arxiv.org/abs/2201.11903">https://arxiv.org/abs/2201.11903</a>
        </Text>
        <Text>
          (논문 밖) Takeshi Kojima 외, "Large Language Models are Zero-Shot Reasoners", 2022.{" "}
          <a href="https://arxiv.org/abs/2205.11916">https://arxiv.org/abs/2205.11916</a>
        </Text>
        <Text>
          (논문 밖) Xuezhi Wang 외, "Self-Consistency Improves Chain of Thought Reasoning in Language Models", 2022.{" "}
          <a href="https://arxiv.org/abs/2203.11171">https://arxiv.org/abs/2203.11171</a>
        </Text>
        <Text>
          (논문 밖) Miles Turpin 외, "Language Models Don't Always Say What They Think: Unfaithful Explanations in Chain-of-Thought
          Prompting", 2023. <a href="https://arxiv.org/abs/2305.04388">https://arxiv.org/abs/2305.04388</a>
        </Text>
        <Text>
          (논문 밖) Rylan Schaeffer 외, "Are Emergent Abilities of Large Language Models a Mirage?", 2023.{" "}
          <a href="https://arxiv.org/abs/2304.15004">https://arxiv.org/abs/2304.15004</a>
        </Text>
        <Callout lead="확인 방법">
          본문 1~8절, 그림·표 캡션, 부록 A~E를 PDF에서 추출해 읽었습니다. 숫자(GSM8K 정답률, TPU 칩 수, 그림 9의 오류 개수)와 쪽
          번호는 PDF 텍스트와 다시 대조했습니다. 막대의 변화량은 표 2의 두 값을 코드로 빼서 그렸습니다. 검색어 5개는 PDF에서 한
          번씩만 나오는 것을 확인했습니다. 논문 그림은 옮기지 않았습니다.
        </Callout>
      </Section>
    </Page>
  );
}
