import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Table,
  Bars,
  Segmented,
  useState,
} from "@/components/canvas";
import { Tex } from "@/components/Tex";

type TempKey = "t05" | "t1" | "t2";

const WORDS = ["고양이", "강아지", "자동차"] as const;

// 점수 2.0, 1.0, 0.1에 softmax를 적용한 값(예시). 소수 셋째 자리 반올림, 합 1.000.
const PROBS: Record<TempKey, readonly number[]> = {
  t05: [0.864, 0.117, 0.019],
  t1: [0.659, 0.242, 0.099],
  t2: [0.502, 0.304, 0.194],
};

const TEMP_OPTIONS = [
  { value: "t05" as const, label: "T = 0.5" },
  { value: "t1" as const, label: "T = 1" },
  { value: "t2" as const, label: "T = 2" },
];

export default function App() {
  const [temp, setTemp] = useState<TempKey>("t1");
  const probs = PROBS[temp];

  return (
    <Page
      title="softmax와 온도: 점수를 확률로 바꾸기"
      summary="softmax는 점수를 합이 1인 확률로 바꿉니다. 온도가 낮으면 1등에 쏠리고, 높으면 고르게 퍼집니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "softmax의 정의", id: "def" },
          { label: "온도를 바꿔 보기", id: "temp" },
          { label: "정리", id: "summary" },
        ]}
      />

      <Section heading="softmax의 정의" id="def">
        <Text>
          softmax(소프트맥스, 점수 묶음을 확률 묶음으로 바꾸는 함수)는 각 점수에 지수(exponential, e를 밑으로 하는 거듭제곱)를 취합니다. 그다음 전체 합으로 나눕니다.
        </Text>
        <Tex display>{"p_i = \\frac{e^{z_i / T}}{\\sum_j e^{z_j / T}}"}</Tex>
        <Text>
          z는 점수, T는 온도(temperature, 분포의 뾰족함을 조절하는 값)입니다. 결과는 모두 0보다 크고, 합은 1입니다.
        </Text>
      </Section>

      <Section heading="온도를 바꿔 보기" id="temp" caption="점수 2.0, 1.0, 0.1 (예시)">
        <Segmented options={TEMP_OPTIONS} value={temp} onChange={setTemp} />
        <Bars
          bars={WORDS.map((w, i) => ({
            label: w,
            value: probs[i],
            display: probs[i].toFixed(3),
          }))}
        />
        <Text>
          T = 0.5이면 1등 확률이 0.864까지 올라갑니다. T = 2이면 1등 확률이 0.502로 내려갑니다. 순위는 바뀌지 않습니다.
        </Text>
        <Table
          columns={["온도", "고양이", "강아지", "자동차", "합"]}
          rows={[
            ["0.5", "0.864", "0.117", "0.019", "1.000"],
            ["1", "0.659", "0.242", "0.099", "1.000"],
            ["2", "0.502", "0.304", "0.194", "1.000"],
          ]}
        />
      </Section>

      <Section heading="정리" id="summary">
        <Callout lead="핵심" tone="info">
          온도는 순위를 바꾸지 않습니다. 온도는 1등과 나머지의 확률 차이만 키우거나 줄입니다.
        </Callout>
      </Section>
    </Page>
  );
}
