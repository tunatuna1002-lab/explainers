import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Steps,
  Table,
  Bars,
  Properties,
  useGrokTheme,
  useState,
} from "@/components/canvas";
import type { ReactNode } from "@/components/canvas";
import { Tex } from "@/components/Tex";

// 실험 1~3의 점수, 표현, 가중치는 모두 예시 값이다(논문 밖). 실제 학습 결과가 아니다.
// 계산 규칙은 원본 실험실(bahdanau_attention_lab.html)과 같다. BLEU만 논문 표 1(p.7)의 값이다.

const PREV_POST = "/posts/seq2seq-sequence-to-sequence-learning/";

// ---------- 작은 부품 ----------

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  show: string;
  onChange: (v: number) => void;
}

function Slider({ id, label, value, min, max, step = 1, show, onChange }: SliderProps) {
  const theme = useGrokTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <label
        htmlFor={id}
        style={{ ...theme.font.subtext, color: theme.text.secondary, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}
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
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
        style={{ width: "100%", minWidth: 0, minHeight: 36, margin: 0, accentColor: theme.text.accent }}
      />
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  const theme = useGrokTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...theme.font.subtext,
        fontFamily: theme.font.family,
        color: theme.text.primary,
        background: theme.fill.secondary,
        border: `1px solid ${theme.border.default}`,
        borderRadius: theme.radius.md,
        padding: "8px 14px",
        minHeight: 36,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Check({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const theme = useGrokTheme();
  return (
    <label
      htmlFor={id}
      style={{ ...theme.font.subtext, color: theme.text.primary, display: "inline-flex", alignItems: "center", gap: 8, minHeight: 36, cursor: "pointer" }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        style={{ width: 18, height: 18, margin: 0, accentColor: theme.text.accent }}
      />
      {label}
    </label>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>{children}</div>;
}

function Lab({ children }: { children: ReactNode }) {
  const theme = useGrokTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 16,
        border: `1px solid ${theme.border.weak}`,
        borderRadius: theme.radius.xl,
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

function Small({ children }: { children: ReactNode }) {
  const theme = useGrokTheme();
  return <p style={{ margin: 0, ...theme.font.caption, color: theme.text.secondary }}>{children}</p>;
}

// ---------- 예시 계산 (원본 실험실과 같은 규칙) ----------

const SRC = ["European", "Economic", "Area"];
const TRG = ["zone", "économique", "européenne"];
const BASE = [
  [1, 2, 7],
  [2, 7, 1],
  [7, 2, 1],
].map((row) => row.map(Math.log));
const REPS: [number, number][] = [
  [2, 0],
  [0, 2],
  [2, 2],
];

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const fmt = (n: number, d = 4) => n.toFixed(d);

function softmax(scores: number[]) {
  const m = Math.max(...scores);
  const e = scores.map((x) => Math.exp(x - m));
  const z = sum(e);
  return e.map((x) => x / z);
}

interface AttnState {
  step: number;
  scale: number;
  uniform: boolean;
}

const raw = (s: AttnState, row: number) => BASE[row].map((x) => (s.uniform ? 0 : x * s.scale));
const weights = (s: AttnState, row: number) => softmax(raw(s, row));
const context = (w: number[]): [number, number] => [0, 1].map((k) => sum(w.map((v, j) => v * REPS[j][k]))) as [number, number];

// ---------- 실험 1: 정렬 가중치 지도 ----------

function HeatmapLab({ s, set }: { s: AttnState; set: (next: Partial<AttnState>) => void }) {
  const theme = useGrokTheme();
  const cat = theme.dataviz.categorical[0];
  const cell = (v: number, active: boolean, r: number, t: string, j: number) => (
    <button
      key={j}
      type="button"
      onClick={() => set({ step: r })}
      aria-pressed={active}
      aria-label={`출력 ${t}, 입력 ${SRC[j]}, 가중치 ${fmt(v)}`}
      style={{
        ...theme.font.label,
        fontFamily: theme.font.family,
        fontVariantNumeric: "tabular-nums",
        minHeight: 40,
        minWidth: 0,
        padding: "6px 2px",
        border: `1px solid ${active ? theme.text.accent : theme.border.weak}`,
        borderRadius: theme.radius.sm,
        background: `color-mix(in srgb, ${cat} ${Math.round(v * 100)}%, ${theme.bg.base})`,
        color: v > 0.5 ? theme.text.onColor : theme.text.primary,
        cursor: "pointer",
      }}
    >
      {fmt(v, 3)}
    </button>
  );
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        출력 단어마다 입력 위치의 참고 비중이 달라집니다. 행(출력 단어)을 누르면 아래 실험 2도 같이 바뀝니다.
      </Callout>
      <Slider
        id="att-sharp"
        label="예시 점수 차이 배율"
        value={s.scale}
        min={0.25}
        max={3}
        step={0.25}
        show={`${fmt(s.scale, 2)}배`}
        onChange={(x) => set({ scale: x })}
      />
      <Row>
        <Check id="att-uniform" label="모든 입력에 같은 점수 주기" checked={s.uniform} onChange={(x) => set({ uniform: x })} />
        <ActionButton label="다음 출력 단계" onClick={() => set({ step: (s.step + 1) % TRG.length })} />
        <ActionButton label="처음으로" onClick={() => set({ scale: 1, uniform: false, step: 0 })} />
      </Row>
      <Small>예시 문구: European Economic Area → zone économique européenne. 가로는 영어 입력, 세로는 프랑스어 출력입니다.</Small>
      <div className="cv-figure" style={{ overflowX: "auto" }}>
        <div
          role="table"
          aria-label="예시 정렬 가중치 지도"
          style={{ display: "grid", gridTemplateColumns: "minmax(78px, max-content) repeat(3, minmax(56px, 1fr))", gap: 4, minWidth: 0 }}
        >
          <span style={{ ...theme.font.caption, color: theme.text.secondary }}>출력 / 입력</span>
          {SRC.map((w) => (
            <span key={w} style={{ ...theme.font.caption, color: theme.text.secondary, textAlign: "center", overflowWrap: "anywhere" }}>
              {w}
            </span>
          ))}
          {TRG.map((t, r) => {
            const w = weights(s, r);
            const active = r === s.step;
            return [
              <button
                key={`h${r}`}
                type="button"
                onClick={() => set({ step: r })}
                aria-pressed={active}
                style={{
                  ...theme.font.label,
                  fontFamily: theme.font.family,
                  textAlign: "left",
                  padding: "4px 6px",
                  border: "none",
                  borderRadius: theme.radius.sm,
                  background: active ? theme.fill.accentSubtle : "transparent",
                  color: theme.text.primary,
                  cursor: "pointer",
                }}
              >
                {t}
                <span style={{ display: "block", ...theme.font.caption, color: theme.text.tertiary }}>합 {fmt(sum(w), 6)}</span>
              </button>,
              ...w.map((v, j) => cell(v, active, r, t, j)),
            ];
          })}
        </div>
      </div>
      <Small>
        각 행의 합은 1입니다. 열의 합이 1일 필요는 없습니다. 비중은 소프트맥스(점수를 0~1 비중으로 바꾸고 합을 1로 맞추는 계산)로 구하고,
        화면에서는 반올림합니다. 진할수록 큰 비중입니다.
      </Small>
      <Callout lead="실제 모델과의 차이" tone="warning">
        실제 모델은 이전 디코더 상태와 입력 위치별 표현으로 점수를 계산합니다. 이 화면은 그 점수를 가상 값으로 대신합니다. 슬라이더
        조작은 학습이 아닙니다.
      </Callout>
    </Lab>
  );
}

// ---------- 실험 2: 출력 단계와 문맥 벡터 ----------

function DecoderLab({ s, set }: { s: AttnState; set: (next: Partial<AttnState>) => void }) {
  const theme = useGrokTheme();
  const [showContext, setShowContext] = useState(true);
  const w = weights(s, s.step);
  const c = context(w);
  const max = Math.max(...w);
  const ties = w.filter((x) => Math.abs(x - max) < 1e-12).length;
  const px = (x: number) => 45 + x * 110;
  const py = (y: number) => 190 - y * 75;
  const axis = { ...theme.font.caption, fill: theme.text.secondary };
  const ctxColor = theme.dataviz.categorical[0];
  const repColor = theme.dataviz.categorical[2];
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        가중치가 바뀌면 문맥 벡터도 달라집니다. 위치별 표현은 그대로이고, 섞는 비중만 바뀝니다.
      </Callout>
      <Slider
        id="att-step"
        label="출력 단계"
        value={s.step}
        min={0}
        max={2}
        show={`${s.step + 1} / ${TRG.length} · ${TRG[s.step]}`}
        onChange={(x) => set({ step: x })}
      />
      <Row>
        <ActionButton label="이전" onClick={() => set({ step: (s.step + TRG.length - 1) % TRG.length })} />
        <ActionButton label="다음" onClick={() => set({ step: (s.step + 1) % TRG.length })} />
        <Check id="att-ctx" label="문맥 벡터 계산 보기" checked={showContext} onChange={setShowContext} />
      </Row>
      <Steps
        steps={[
          { title: "이전 디코더 상태" },
          { title: "입력 위치마다 점수" },
          { title: "소프트맥스로 비중" },
          { title: "비중만큼 섞어 문맥 벡터" },
          { title: "다음 단어 예측" },
        ]}
      />
      <Small>단계 이름은 비교용 출력 예시입니다. 정답 단어를 미리 넣어 점수를 계산한다는 뜻은 아닙니다.</Small>
      <Text>출력 예시: {TRG[s.step]}</Text>
      <Bars
        bars={w.map((v, j) => ({ label: SRC[j], value: v, display: fmt(v) }))}
        emphasis={ties === 1 ? w.indexOf(max) : "none"}
      />
      <Properties
        items={[
          { label: "가중치 합 (계산 후 반올림)", value: fmt(sum(w), 6) },
          { label: "가장 큰 가중치의 입력", value: ties > 1 ? "모두 같은 비중" : SRC[w.indexOf(max)] },
          { label: "소프트맥스에 넣은 예시 점수", value: raw(s, s.step).map((x) => fmt(x, 3)).join(" / ") },
        ]}
      />
      {showContext ? (
        <>
          <Text>위치별 표현을 비중만큼 섞기. 표현을 두 좌표로 줄인 예시이며, 좌표에 정해진 언어적 뜻은 없습니다.</Text>
          <Table
            columns={["입력 위치", "예시 표현", "가중치를 곱한 결과"]}
            rows={REPS.map((h, j) => [SRC[j], `[${h.join(", ")}]`, `[${h.map((v) => fmt(v * w[j], 3)).join(", ")}]`])}
          />
          <figure style={{ margin: 0 }}>
            <svg viewBox="0 0 320 235" role="img" aria-labelledby="att-plot-title" style={{ display: "block", width: "100%", maxWidth: 420, height: "auto" }}>
              <title id="att-plot-title">위치별 표현과 가중합으로 만든 문맥 벡터 (예시)</title>
              <path d="M45 25 V190 H290" fill="none" stroke={theme.border.strong} />
              <path d="M45 40 H265 M155 40 V190" fill="none" stroke={theme.border.weak} strokeDasharray="4 4" />
              <polygon points="265,190 45,40 265,40" fill={theme.fill.accentSubtle} />
              <text x={34} y={208} style={axis}>0</text>
              <text x={257} y={208} style={axis}>2</text>
              <text x={25} y={44} style={axis}>2</text>
              <text x={262} y={228} style={axis}>좌표 1</text>
              <text x={7} y={18} style={axis}>좌표 2</text>
              {REPS.map((h, j) => (
                <g key={j}>
                  <circle cx={px(h[0])} cy={py(h[1])} r={5} fill={repColor} />
                  <text
                    x={px(h[0]) + (j === 1 ? 8 : -8)}
                    y={py(h[1]) + (j === 0 ? -10 : 19)}
                    textAnchor={j === 1 ? "start" : "end"}
                    style={{ ...theme.font.caption, fill: theme.text.primary }}
                  >
                    {SRC[j]}
                  </text>
                </g>
              ))}
              <path d={`M${px(c[0])} 190 V${py(c[1])} H45`} fill="none" stroke={ctxColor} strokeDasharray="3 3" />
              <circle cx={px(c[0])} cy={py(c[1])} r={8} fill={ctxColor} stroke={theme.bg.base} strokeWidth={2} />
              <text x={px(c[0])} y={py(c[1]) - 14} textAnchor="middle" style={{ ...theme.font.caption, fill: ctxColor, fontWeight: 600 }}>
                문맥
              </text>
            </svg>
            <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
              세 점은 입력 위치별 표현, 큰 점은 문맥 벡터입니다. 비중의 합이 1이므로 문맥 벡터는 늘 세 점이 만드는 삼각형 안에 있습니다.
            </figcaption>
          </figure>
          <Text>문맥 벡터 [{c.map((v) => fmt(v)).join(", ")}]</Text>
        </>
      ) : null}
    </Lab>
  );
}

// ---------- 실험 3: 저장하는 표현의 개수 ----------

function Vec({ label, selected, inside }: { label: string; selected: boolean; inside: boolean }) {
  const theme = useGrokTheme();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 8px",
        borderRadius: theme.radius.sm,
        border: `1px solid ${selected ? theme.text.accent : theme.border.weak}`,
        background: selected ? theme.fill.accentSubtle : theme.bg.base,
        ...theme.font.label,
        color: theme.text.primary,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {inside ? (
        <span aria-hidden="true" style={{ display: "inline-flex", gap: 2 }}>
          {[0, 1, 2].map((k) => (
            <i key={k} style={{ display: "inline-block", width: 8, height: 12, borderRadius: 2, background: theme.dataviz.categorical[0] }} />
          ))}
        </span>
      ) : null}
    </span>
  );
}

function StorageLab() {
  const theme = useGrokTheme();
  const [n, setN] = useState(8);
  const [pos, setPos] = useState(0);
  const [inside, setInside] = useState(true);
  const p = pos % n;
  const tokens = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          style={{
            ...theme.font.caption,
            padding: "3px 7px",
            borderRadius: theme.radius.sm,
            background: i === p ? theme.dataviz.categorical[0] : theme.bg.subtle,
            color: i === p ? theme.text.onColor : theme.text.primary,
          }}
        >
          단어 {i + 1}
        </span>
      ))}
    </div>
  );
  const box = (title: string, children: ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: theme.bg.subtle, borderRadius: theme.radius.lg, minWidth: 0 }}>
      <div style={{ ...theme.font.body2, fontWeight: 600, color: theme.text.primary }}>{title}</div>
      {children}
    </div>
  );
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        문장이 길어질 때 디코더가 다시 참고할 입력 표현의 개수입니다. 한 표현의 크기는 그대로입니다.
      </Callout>
      <Slider id="att-len" label="예시 문장 길이" value={n} min={3} max={20} show={`${n}단어`} onChange={setN} />
      <Row>
        <ActionButton label="다른 입력 위치 가리키기" onClick={() => setPos((p + 1) % n)} />
        <ActionButton
          label="처음으로"
          onClick={() => {
            setN(8);
            setPos(0);
            setInside(true);
          }}
        />
        <Check id="att-inside" label="벡터 내부 펼치기" checked={inside} onChange={setInside} />
      </Row>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {box(
          "고정 벡터 방식 (앞 글의 Seq2Seq)",
          <>
            <Small>입력 단어</Small>
            {tokens}
            <Small>문장 전체를 하나의 입력 요약으로</Small>
            <div>
              <Vec label="문장 전체의 입력 요약" selected={false} inside={inside} />
            </div>
            <Text>다시 참고할 입력 요약: 1개</Text>
            <Small>출력마다 같은 입력 요약을 참고합니다. 디코더의 상태까지 고정된다는 뜻은 아닙니다.</Small>
          </>,
        )}
        {box(
          "어텐션 방식 (이 논문)",
          <>
            <Small>입력 단어</Small>
            {tokens}
            <Small>각 위치의 앞뒤 문맥을 표현으로</Small>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Array.from({ length: n }, (_, i) => (
                <Vec key={i} label={`위치 ${i + 1}`} selected={i === p} inside={inside} />
              ))}
            </div>
            <Text>다시 참고할 위치별 표현: {n}개</Text>
            <Small>지금 가리킨 곳: {p + 1}번째 입력 위치. 강조는 구조를 보이기 위한 표시이며, 학습된 중요도가 아닙니다.</Small>
          </>,
        )}
      </div>
      <Small>벡터 안의 세 칸은 모양을 보이는 예시입니다. 실제 모델의 차원이나 메모리량을 재현하지 않습니다.</Small>
      <Callout lead="매 출력 단계의 문맥 벡터는 여전히 고정된 크기입니다">
        차이는 입력 위치별 표현을 남겨 두고 다시 섞을 수 있다는 점입니다. 먼 위치도 참고 후보가 되지만, 정보 보존이나 올바른 정렬을
        항상 보장하지는 않습니다.
      </Callout>
    </Lab>
  );
}

// ---------- 확인 질문 ----------

const QUIZ_VEC = context([0.7, 0.2, 0.1]);

const QUIZ = [
  {
    q: "실제 모델은 무엇을 비교해 정렬 점수를 계산하나요?",
    pre: "다음 번역 단어를 만들기 직전의 계산을 떠올려 보세요.",
    options: ["이전 디코더 상태와 각 입력 위치의 표현", "입력 위치와 출력 위치 사이의 거리만", "아직 생성하지 않은 정답 단어와 입력 단어", "문장 전체에서 센 단어의 등장 횟수만"],
    correct: 0,
    why: [
      "학습된 점수 함수가 이전 디코더 상태와 각 입력 표현의 적합도를 계산합니다.",
      "고정 거리만으로 점수를 정하지 않고, 이전 디코더 상태와 각 입력 표현을 비교합니다.",
      "아직 생성하지 않은 정답 단어를 점수 함수의 입력으로 쓰지 않습니다.",
      "등장 횟수만이 아니라, 이전 디코더 상태와 입력의 문맥 표현을 이용합니다.",
    ],
    hint: "아직 출력하지 않은 정답 단어를 미리 보지는 않습니다.",
    source: "p.3, §3.1, 식 (6) 아래 설명",
  },
  {
    q: "이 예시의 문맥 벡터는 무엇인가요?",
    pre: "예시 값: 위치별 표현은 [2, 0], [0, 2], [2, 2]입니다. 가중치는 차례로 0.7, 0.2, 0.1입니다. 각 표현에 해당 비중을 곱해 더합니다.",
    options: ["[2, 0]", `[${QUIZ_VEC.map((x) => fmt(x, 1)).join(", ")}]`, "[4, 4]", "[0.7, 0.2]"],
    correct: 1,
    why: [
      "가장 큰 가중치의 표현 하나만 고르지 않고 모든 표현을 비중만큼 더합니다.",
      "첫 좌표는 1.4+0+0.2=1.6, 둘째 좌표는 0+0.4+0.2=0.6입니다.",
      "가중치 없이 더한 값입니다. 각 표현에 0.7, 0.2, 0.1을 먼저 곱해야 합니다.",
      "가중치 자체가 문맥 벡터는 아닙니다. 가중치로 입력 표현들을 섞어야 합니다.",
    ],
    hint: "첫 좌표끼리 계산한 뒤, 둘째 좌표끼리 계산해 보세요.",
    source: "p.3, §3.1, 식 (5) · 숫자는 예시 값",
  },
  {
    q: "입력이 6단어가 되면 무엇을 저장할까요?",
    pre: "예시 값: 입력 위치 하나의 표현을 2차원으로 정한 어텐션 모델입니다. 입력이 3단어에서 6단어로 늘었습니다.",
    options: ["6차원 표현 1개", "2차원 표현 1개", "2차원 표현 6개", "6차원 표현 6개"],
    correct: 2,
    why: [
      "문장 길이가 늘어도 각 위치별 표현의 차원을 함께 늘리지는 않습니다.",
      "어텐션 모델은 입력 위치마다 표현을 남기므로 하나만 저장하지 않습니다.",
      "각 표현의 차원은 고정되고, 입력 위치가 늘면 표현의 개수가 늘어납니다.",
      "늘어나는 것은 표현의 개수이며, 여기서 각 표현의 차원은 2로 고정입니다.",
    ],
    hint: "한 표현의 크기와, 표현이 몇 개인지를 나누어 생각해 보세요.",
    source: "pp.3~4, §3.1~3.2 · 숫자는 예시 값",
  },
];

function Quiz() {
  const theme = useGrokTheme();
  const [answers, setAnswers] = useState<(number | null)[]>(QUIZ.map(() => null));
  const answered = answers.filter((a) => a !== null).length;
  const good = answers.filter((a, i) => a === QUIZ[i].correct).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Row>
        <Small>
          응답 {answered} / {QUIZ.length} · 현재 맞힌 문제 {good}개
        </Small>
        <ActionButton label="다시 풀기" onClick={() => setAnswers(QUIZ.map(() => null))} />
      </Row>
      {QUIZ.map((q, qi) => {
        const a = answers[qi];
        return (
          <div key={qi} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...theme.font.body1, color: theme.text.primary, fontWeight: 600 }}>
              {qi + 1}. {q.q}
            </div>
            <Small>{q.pre}</Small>
            {q.options.map((o, oi) => (
              <button
                key={oi}
                type="button"
                aria-pressed={a === oi}
                onClick={() => setAnswers(answers.map((x, k) => (k === qi ? oi : x)))}
                style={{
                  ...theme.font.subtext,
                  fontFamily: theme.font.family,
                  textAlign: "left",
                  color: theme.text.primary,
                  background: a === oi ? theme.fill.accentSubtle : theme.bg.base,
                  border: `1px solid ${a === oi ? theme.text.accent : theme.border.default}`,
                  borderRadius: theme.radius.md,
                  padding: "8px 12px",
                  minHeight: 40,
                  cursor: "pointer",
                }}
              >
                {oi + 1}. {o}
              </button>
            ))}
            <details>
              <summary style={{ ...theme.font.caption, color: theme.text.secondary, cursor: "pointer" }}>힌트 보기</summary>
              <Small>{q.hint}</Small>
            </details>
            {a !== null ? (
              <Callout lead={a === q.correct ? "정답입니다" : "다시 생각해 보세요"} tone={a === q.correct ? "success" : "warning"}>
                {q.why[a]} (근거: {q.source})
              </Callout>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ---------- 글 ----------

const TABLE1 = [
  { model: "RNNencdec-30", all: 13.93, noUnk: 24.19 },
  { model: "RNNsearch-30", all: 21.5, noUnk: 31.44 },
  { model: "RNNencdec-50", all: 17.82, noUnk: 26.71 },
  { model: "RNNsearch-50", all: 26.75, noUnk: 34.16 },
  { model: "RNNsearch-50*", all: 28.45, noUnk: 36.15 },
  { model: "Moses", all: 33.3, noUnk: 35.63 },
];

export default function App() {
  const [s, setS] = useState<AttnState>({ step: 0, scale: 1, uniform: false });
  const set = (next: Partial<AttnState>) => setS((prev) => ({ ...prev, ...next }));
  return (
    <Page
      title="Bahdanau 어텐션 쉽게 보기 (Bahdanau·Cho·Bengio, 2014)"
      summary="기존 인코더-디코더는 원문 전체를 고정 길이 벡터 하나에 담았습니다. 이 논문은 단어 위치마다 표현을 남겨 두고, 번역 단어를 하나 만들 때마다 어디를 얼마나 참고할지(정렬 가중치) 새로 계산해 섞습니다. 그래서 긴 문장에서 성능이 덜 떨어졌고, 같은 조건(최대 50단어 학습)의 BLEU가 17.82에서 26.75로 올랐습니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "앞 글에서 이어지는 문제", id: "problem" },
          { label: "한 장면 비유", id: "analogy" },
          { label: "핵심 구조", id: "idea" },
          { label: "실험 1: 정렬 가중치 지도", id: "heatmap" },
          { label: "실험 2: 출력 단계와 문맥 벡터", id: "decoder" },
          { label: "실험 3: 저장하는 표현의 개수", id: "storage" },
          { label: "논문 결과", id: "results" },
          { label: "논문 근거 위치", id: "evidence" },
          { label: "주의: 결과를 읽는 법", id: "caution" },
          { label: "확인 질문과 답", id: "quiz" },
          { label: "출처", id: "source" },
        ]}
      />

      <Section heading="앞 글에서 이어지는 문제" id="problem">
        <Text>
          <a href={PREV_POST}>Seq2Seq 쉽게 보기</a>에서 본 구조는 이렇습니다. 인코더가 문장을 다 읽고, 마지막 상태 하나(고정 길이
          벡터)를 디코더에 넘깁니다. 문장이 2단어든 50단어든 넘기는 벡터의 크기는 같습니다.
        </Text>
        <Text>
          이 논문은 그 구조를 "RNN 인코더-디코더"라고 부르고, Sutskever 외(2014)가 LSTM을 쓰고 마지막 상태 h_T를 문장 벡터로 썼다고
          정리합니다 (p.2, §2.1). 그리고 바로 이 고정 길이 벡터를 병목(좁은 통로)으로 의심합니다.
        </Text>
        <Callout lead="핵심 원문 문장 (p.1, 초록)">
          "we conjecture that the use of a fixed-length vector is a bottleneck in improving the performance of this basic encoder–decoder
          architecture"
        </Callout>
        <Text>
          저자의 걱정은 문장의 필요한 정보를 모두 고정 길이 벡터에 눌러 담아야 한다는 점입니다. 특히 학습 데이터보다 긴 문장에서
          어려울 수 있다고 봅니다 (p.1, §1). "conjecture"(추측)라는 단어처럼, 이것은 실험으로 확인하려는 가설입니다.
        </Text>
      </Section>

      <Section heading="한 장면 비유" id="analogy">
        <Text>
          앞 글의 통역사는 메모 한 장만 보고 말했습니다. 이 논문의 통역사는 원문을 덮지 않고 옆에 펼쳐 둡니다. 번역 단어를 하나 말할
          때마다 원문 여기저기에 손가락을 얹고, 지금 필요한 곳에 더 힘을 줍니다. 손가락의 힘 배분이 정렬 가중치입니다.
        </Text>
        <Callout lead="비유의 한계" tone="warning">
          사람의 손가락은 보통 한 곳을 가리킵니다. 이 모델은 모든 위치에 조금씩 비중을 나눠 줍니다(부드러운 정렬, soft alignment). 또
          원문의 각 위치는 단어 하나가 아니라 그 단어 주변 문맥까지 담은 표현입니다 (p.3, §3.1).
        </Callout>
        <Table
          columns={["용어", "뜻"]}
          rows={[
            ["주석(annotation, h_j)", "입력 j번째 위치의 표현. 그 단어 주변 문맥을 많이 담습니다"],
            ["양방향 RNN(BiRNN)", "문장을 앞에서 뒤로, 뒤에서 앞으로 두 번 읽어 위치마다 양쪽 문맥을 합칩니다"],
            ["정렬 점수(e_ij)", "출력 i번째 단어를 만들 때 입력 j번째 위치가 얼마나 맞는지 매긴 점수"],
            ["정렬 가중치(α_ij)", "점수를 소프트맥스로 바꾼 비중. 한 출력 단어에 대해 합이 1입니다"],
            ["문맥 벡터(c_i)", "주석들을 정렬 가중치만큼 섞은 벡터. 출력 단어마다 새로 만듭니다"],
            ["어텐션(attention)", "디코더가 원문 중 어디에 주의를 둘지 스스로 정하는 장치"],
          ]}
        />
      </Section>

      <Section heading="핵심 구조" id="idea">
        <Text>번역 단어 하나를 만들 때마다 다음 순서를 거칩니다 (p.3, §3.1, 그림 1).</Text>
        <Steps
          steps={[
            { title: "인코더가 위치마다 주석을 만듭니다", detail: "양방향 RNN의 앞쪽 상태와 뒤쪽 상태를 이어 붙여 h_j를 만듭니다 (p.4, §3.2)." },
            { title: "직전 디코더 상태와 각 주석의 점수를 매깁니다", detail: "작은 신경망 a가 점수 e_ij를 냅니다. 이 신경망도 번역과 함께 학습됩니다 (p.3, §3.1)." },
            { title: "소프트맥스로 비중을 만듭니다", detail: "점수가 높을수록 큰 비중이고, 합은 1입니다 (식 6)." },
            { title: "비중만큼 주석을 섞어 문맥 벡터를 만듭니다", detail: "출력 단어마다 다른 문맥 벡터가 나옵니다 (식 5)." },
            { title: "문맥 벡터로 다음 단어를 예측합니다", detail: "디코더 상태도 이 문맥 벡터를 받아 갱신됩니다 (p.3, 식 4와 그 아래 식)." },
          ]}
        />
        <Text>수식으로 쓰면 다음 세 줄입니다 (p.3, §3.1). 실험 1과 2가 이 계산을 숫자로 보여 줍니다.</Text>
        <Tex display>{"e_{ij} = a(s_{i-1}, h_j)"}</Tex>
        <Tex display>{"\\alpha_{ij} = \\frac{\\exp(e_{ij})}{\\sum_{k=1}^{T_x} \\exp(e_{ik})}"}</Tex>
        <Tex display>{"c_i = \\sum_{j=1}^{T_x} \\alpha_{ij} h_j"}</Tex>
        <Text>
          정렬이 숨은 변수가 아니라 부드러운 가중치라서, 기울기가 정렬 모델까지 역전파됩니다. 그래서 정렬과 번역을 한꺼번에 학습할 수
          있습니다. 논문 제목의 "jointly learning to align and translate"가 이 뜻입니다 (p.4, §3.1).
        </Text>
        <Callout lead="원문 (p.4, §3.1)">
          "By letting the decoder have an attention mechanism, we relieve the encoder from the burden of having to encode all information in
          the source sentence into a fixed-length vector."
        </Callout>
      </Section>

      <Section heading="실험 1: 정렬 가중치 지도" id="heatmap" caption="점수와 가중치는 예시 값입니다 (실제 학습 결과 아님)">
        <Text>
          예시 문구는 논문 그림 3 (a)에 나오는 구절입니다. 영어와 프랑스어는 형용사와 명사의 순서가 달라서, 첫 출력 "zone"은 마지막
          입력 "Area"를 봐야 합니다 (p.7, §5.2.1).
        </Text>
        <HeatmapLab s={s} set={set} />
        <Text>
          배율을 키우면 큰 점수와 작은 점수의 차이가 벌어져 한 칸에 비중이 몰립니다. "같은 점수 주기"를 켜면 모든 칸이 1/3이 됩니다. 이때
          문맥 벡터는 모든 위치의 평균이어서, 어느 위치도 특별히 고르지 않습니다.
        </Text>
        <Text>
          논문의 실제 지도에서는 대부분 대각선을 따라 비중이 큽니다(어순이 비슷함). 그런데 "zone"은 "European"과 "Economic"을 건너뛰어
          "Area"에 맞춰지고, 그 뒤 한 단어씩 되돌아가며 구절을 완성합니다 (p.7, §5.2.1; p.6, 그림 3).
        </Text>
      </Section>

      <Section heading="실험 2: 출력 단계와 문맥 벡터" id="decoder" caption="실험 1과 연결된 예시 값입니다">
        <DecoderLab s={s} set={set} />
        <Text>
          위치별 표현(세 점)은 출력 단계가 바뀌어도 움직이지 않습니다. 움직이는 것은 비중뿐이고, 그래서 문맥 벡터(큰 점)만 이동합니다.
          앞 글의 Seq2Seq에서는 디코더가 받는 입력 요약이 하나라서 이런 이동이 없습니다.
        </Text>
      </Section>

      <Section heading="실험 3: 저장하는 표현의 개수" id="storage" caption="표현 개수의 구조 비교 (예시)">
        <Text>
          <a href={PREV_POST}>앞 글의 실험 1</a>에서는 문장이 길어져도 넘기는 벡터가 하나였습니다. 여기서는 같은 문장 길이를 놓고 두
          방식을 나란히 봅니다.
        </Text>
        <StorageLab />
        <Text>
          저자의 말로는 "입력 문장을 벡터들의 열로 바꾸고, 번역하는 동안 그중 일부를 골라 쓴다"는 것이 기존 방식과의 가장 중요한
          차이입니다 (p.2, §1).
        </Text>
      </Section>

      <Section heading="논문 결과" id="results" caption="BLEU는 논문 값입니다 (p.7, 표 1)">
        <Text>
          두 모델을 비교했습니다. 기존 방식 RNNencdec와 제안 모델 RNNsearch입니다. 각각 최대 30단어 문장과 최대 50단어 문장으로 따로
          학습했습니다 (p.5, §4.2). 평가는 WMT'14 영어→프랑스어 시험 세트 news-test-2014(3,003문장)입니다 (p.5, §4.1).
        </Text>
        <Bars bars={TABLE1.map((r) => ({ label: r.model, value: r.all, display: r.all.toFixed(2) }))} emphasis={3} />
        <Table
          columns={["모델", "전체 문장", "미등록 단어 없는 문장"]}
          rows={TABLE1.map((r) => [r.model, r.all.toFixed(2), r.noUnk.toFixed(2)])}
        />
        <Small>
          RNNsearch-50*는 개발 세트 성능이 더 오르지 않을 때까지 훨씬 오래 학습한 모델입니다. Moses는 기존 구문 기반 통계 번역기입니다
          (p.7, 표 1 설명).
        </Small>
        <Text>
          같은 50단어 학습에서 BLEU가 17.82에서 26.75로 올랐습니다. 30단어로만 학습한 RNNsearch-30(21.50)도 50단어로 학습한
          RNNencdec-50(17.82)보다 높습니다 (p.6, §5.1). 미등록 단어가 없는 문장만 보면 RNNsearch-50*(36.15)가 Moses(35.63)와 비슷한
          수준입니다 (p.5, §5.1).
        </Text>
        <Text>
          문장 길이별로 보면(그림 2), RNNencdec는 문장이 길어질수록 성능이 크게 떨어집니다. RNNsearch-30도 긴 구간에서는 떨어집니다.
          RNNsearch-50은 50단어 이상의 문장에서도 성능이 떨어지지 않았다고 저자는 씁니다 (p.5, 그림 2; p.6, §5.1). 그림의 RNNenc는 표 1의
          RNNencdec입니다.
        </Text>
        <Callout lead="앞 글과 숫자를 맞춰 보기" tone="info">
          <a href={PREV_POST}>Seq2Seq 논문</a>의 표 1에도 "Bahdanau et al. 28.45"가 비교 대상으로 실려 있습니다. 이 글 표 1의 RNNsearch-50*
          값과 같습니다. 두 논문 모두 기준선 33.30을 씁니다. 다만 Seq2Seq의 34.81은 4층 LSTM 5개 앙상블, 출력 어휘 80,000개 조건이고, 이
          논문은 단일 모델, 어휘 30,000개입니다 (Seq2Seq p.5~6; 이 논문 p.5, §4.1). 조건이 달라 "어느 쪽 구조가 더 좋다"는 이 두 숫자만으로
          정할 수 없습니다 (추정).
        </Callout>
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["고정 길이 벡터가 병목이라는 추측", "p.1, 초록 · §1"],
            ["입력을 벡터들의 열로 바꾸고 일부를 골라 씀", "p.2, §1"],
            ["기존 RNN 인코더-디코더, Sutskever 외는 h_T를 씀", "p.2, §2.1"],
            ["문맥 벡터 식 (5), 정렬 가중치 식 (6), 그림 1", "p.3, §3.1"],
            ["부드러운 정렬, 함께 학습, 어텐션 메커니즘", "p.4, §3.1"],
            ["양방향 RNN으로 주석 만들기", "p.4, §3.2"],
            ["시험 세트, 어휘 30,000개", "p.5, §4.1"],
            ["모델 4종, 은닉 1,000칸, 최대 30/50단어 학습", "p.5, §4.2"],
            ["문장 길이별 BLEU", "p.5, 그림 2 · p.6, §5.1"],
            ["실제 정렬 지도 4개", "p.6, 그림 3"],
            ["BLEU 표", "p.7, 표 1"],
            ["European Economic Area 정렬 분석", "p.7, §5.2.1"],
          ]}
        />
      </Section>

      <Section heading="주의: 결과를 읽는 법" id="caution">
        <Callout lead="이 논문만으로 말할 수 없는 것" tone="warning">
          그림 2의 결과는 시험 세트 문장 길이 범위 안의 관찰입니다. 아무리 긴 문장에서도 성능이 유지된다는 보장은 아닙니다. 또 정렬
          가중치가 크다고 해서 그 위치가 번역의 "정답 이유"라고 단정할 수는 없습니다 (추정).
        </Callout>
        <Text>
          전체 문장 기준으로는 RNNsearch-50*(28.45)도 Moses(33.30)보다 낮습니다. "기존 번역기와 비슷하다"는 말은 미등록 단어가 없는
          문장만 볼 때의 이야기입니다. Moses는 4억 1,800만 단어의 별도 단일 언어 말뭉치도 썼습니다 (p.5, §5.1).
        </Text>
        <Text>
          실험 1~3의 점수, 표현, 가중치는 계산을 보이기 위한 예시입니다. 번역 모델을 학습하거나 실제 번역을 만들지 않습니다.
        </Text>
      </Section>

      <Section heading="확인 질문과 답" id="quiz">
        <Text>보기를 고르면 정답 여부와 해설, 논문 위치가 나옵니다.</Text>
        <Quiz />
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Dzmitry Bahdanau, KyungHyun Cho, Yoshua Bengio. "Neural Machine Translation by Jointly Learning to Align and Translate". 2014
          (ICLR 2015). <a href="https://arxiv.org/abs/1409.0473">arxiv.org/abs/1409.0473</a> (arXiv v7, 2016-05-19). 쪽수는 이 PDF 기준입니다.
        </Text>
        <Text>
          앞 글: <a href={PREV_POST}>Seq2Seq 쉽게 보기 (Sutskever·Vinyals·Le, 2014)</a>
        </Text>
      </Section>
    </Page>
  );
}
