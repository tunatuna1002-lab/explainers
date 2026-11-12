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
  Segmented,
  useGrokTheme,
  useMemo,
  useState,
} from "@/components/canvas";
import type { ReactNode } from "@/components/canvas";

// 실험 1~3의 숫자는 모두 구조를 보이기 위한 예시 값이다(논문 밖). 실험 4의 BLEU만 논문 표 1·2의 값이다.
// 계산 규칙은 원본 실험실(seq2seq.html)과 같다.

const NEXT_POST = "/posts/bahdanau-attention-align-translate/";

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

function ActionButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  const theme = useGrokTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...theme.font.subtext,
        fontFamily: theme.font.family,
        color: theme.text.primary,
        background: theme.fill.secondary,
        border: `1px solid ${theme.border.default}`,
        borderRadius: theme.radius.md,
        padding: "8px 14px",
        minHeight: 36,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
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

function Chip({ label, tone }: { label: string; tone: "plain" | "read" | "current" }) {
  const theme = useGrokTheme();
  const bg = tone === "current" ? theme.dataviz.categorical[0] : tone === "read" ? theme.fill.accentSubtle : theme.bg.subtle;
  const fg = tone === "current" ? theme.text.onColor : theme.text.primary;
  return (
    <span
      style={{
        ...theme.font.label,
        padding: "5px 10px",
        borderRadius: theme.radius.sm,
        border: `1px solid ${tone === "plain" ? theme.border.weak : "transparent"}`,
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
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

// ---------- 실험 1: 고정 길이 기억 ----------

const DIM = 4;

function memory(n: number, reverse: boolean, read: number) {
  const order = Array.from({ length: n }, (_, i) => i + 1);
  if (reverse) order.reverse();
  let v = Array(DIM).fill(0) as number[];
  for (const token of order.slice(0, read)) v = v.map((h, j) => (h + (((token * (j + 1)) % 5) - 2)) / 2);
  return { order, v };
}

function EncodeLab() {
  const theme = useGrokTheme();
  const [n, setN] = useState(6);
  const [reverse, setReverse] = useState(false);
  const [read, setRead] = useState(6);
  const { order, v } = memory(n, reverse, read);
  const done = read === n;
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        읽는 단어가 늘어도 최종 벡터의 칸 수는 같습니다. 단어를 하나 읽을 때마다 같은 4칸 메모를 덮어 고칩니다.
      </Callout>
      <Slider
        id="enc-n"
        label="입력 단어 수"
        value={n}
        min={2}
        max={12}
        show={`${n}개`}
        onChange={(x) => {
          setN(x);
          setRead(x);
        }}
      />
      <Row>
        <Check id="enc-rev" label="입력 역순" checked={reverse} onChange={setReverse} />
        <ActionButton label={done ? "처음부터 읽기" : "다음 단어 읽기"} onClick={() => setRead(done ? 0 : read + 1)} />
        <ActionButton label="모두 읽기" onClick={() => setRead(n)} />
      </Row>
      <Properties
        items={[
          { label: "읽은 단어 / 전체", value: `${read} / ${n}` },
          { label: "벡터 길이 (예시)", value: `${DIM}칸` },
          { label: "다 읽은 뒤 넘기는 벡터", value: "1개" },
        ]}
      />
      <div>
        <Small>인코더(읽는 부분)가 읽는 순서</Small>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {order.map((t, i) => (
            <Chip key={t} label={`단어 ${t}`} tone={i === read - 1 ? "current" : i < read ? "read" : "plain"} />
          ))}
        </div>
      </div>
      <div>
        <Small>{done ? "최종 벡터 (예시 값)" : "읽는 중의 메모 (예시 값)"}</Small>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 6 }}>
          {v.map((x, j) => (
            <div
              key={j}
              style={{ padding: "8px 6px", background: theme.bg.subtle, borderRadius: theme.radius.md, textAlign: "center", minWidth: 0 }}
            >
              <div style={{ ...theme.font.caption, color: theme.text.secondary }}>칸 {j + 1}</div>
              <div style={{ ...theme.font.body2, color: theme.text.primary, fontVariantNumeric: "tabular-nums" }}>{x.toFixed(3)}</div>
              <div style={{ position: "relative", height: 6, background: theme.fill.secondary, borderRadius: 3, marginTop: 4 }}>
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${x < 0 ? 50 + (x / 4) * 100 : 50}%`,
                    width: `${(Math.abs(x) / 4) * 100}%`,
                    background: theme.dataviz.categorical[0],
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Text>
        {done
          ? "입력 읽기 완료. 최종 벡터 1개를 디코더(쓰는 부분)에 넘깁니다."
          : "인코더가 읽는 중입니다. 디코더는 최종 벡터를 기다립니다."}
      </Text>
      <Small>
        예시 숫자 규칙: j번째 숫자는 (단어 번호 × j)를 5로 나눈 나머지에서 2를 뺀 값입니다. 새 메모는 이전 메모와 새 숫자의
        평균이고, 처음 메모는 모두 0입니다. 이 규칙은 논문 밖의 설명용 예시입니다. 실제 LSTM 계산값이 아니며, 칸을 단어 저장칸이나
        정보 보존율로 읽으면 안 됩니다.
      </Small>
    </Lab>
  );
}

// ---------- 실험 2: 입력 뒤집기 ----------

function distances(n: number, reverse: boolean) {
  return Array.from({ length: n }, (_, k) => {
    const i = k + 1;
    const read = reverse ? n + 1 - i : i;
    const predict = n + i;
    return { i, read, predict, d: predict - read };
  });
}

function ReverseLab() {
  const theme = useGrokTheme();
  const [n, setN] = useState(4);
  const [reverse, setReverse] = useState(true);
  const [pair, setPair] = useState(1);
  const rows = distances(n, reverse);
  const order = Array.from({ length: n }, (_, i) => i + 1);
  if (reverse) order.reverse();
  const avg = rows.reduce((s, r) => s + r.d, 0) / n;
  const max = 2 * n - 1;
  const sel = rows[Math.min(pair, n) - 1];
  const bar = (w: number, color: string) => (
    <span style={{ display: "block", height: 10, background: theme.fill.secondary, borderRadius: 3 }}>
      <span style={{ display: "block", height: "100%", width: `${(w / max) * 100}%`, background: color, borderRadius: 3 }} />
    </span>
  );
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        입력을 뒤집으면 첫 단어의 거리는 줄지만, 평균 거리는 그대로입니다.
      </Callout>
      <Slider
        id="rev-n"
        label="입력과 출력의 단어 수"
        value={n}
        min={2}
        max={8}
        show={`${n}개`}
        onChange={(x) => {
          setN(x);
          setPair(Math.min(pair, x));
        }}
      />
      <Row>
        <Check id="rev-on" label="입력 뒤집기" checked={reverse} onChange={setReverse} />
        <ActionButton label="다음 대응 단어" onClick={() => setPair((pair % n) + 1)} />
      </Row>
      <div>
        <Small>원문을 읽는 순서</Small>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {order.map((i) => (
            <Chip key={i} label={`원문 ${i}`} tone={i === sel.i ? "current" : "plain"} />
          ))}
          <Chip label="입력 종료" tone="read" />
        </div>
      </div>
      <div>
        <Small>번역을 예측하는 순서</Small>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {order
            .slice()
            .sort((a, b) => a - b)
            .map((i) => (
              <Chip key={i} label={`번역 ${i}`} tone={i === sel.i ? "current" : "plain"} />
            ))}
        </div>
      </div>
      <Properties
        items={[
          { label: "첫 단어의 거리", value: `${rows[0].d}칸` },
          { label: "현재 평균 거리", value: `${avg}칸` },
          { label: "정방향 평균 거리", value: `${n}칸` },
        ]}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div
            key={r.i}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(92px, 120px) minmax(0, 1fr)",
              gap: 10,
              alignItems: "center",
              padding: 6,
              borderRadius: theme.radius.md,
              background: r.i === sel.i ? theme.fill.accentSubtle : "transparent",
            }}
          >
            <span style={{ ...theme.font.label, color: theme.text.primary }}>
              원문 {r.i} → 번역 {r.i}
            </span>
            <span style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr) 36px", gap: 6, alignItems: "center", rowGap: 4 }}>
              <span style={{ ...theme.font.caption, color: theme.text.secondary }}>정방향</span>
              {bar(n, theme.dataviz.other)}
              <span style={{ ...theme.font.caption, color: theme.text.secondary, textAlign: "right" }}>{n}칸</span>
              <span style={{ ...theme.font.caption, color: theme.text.primary }}>현재</span>
              {bar(r.d, theme.dataviz.categorical[0])}
              <span style={{ ...theme.font.caption, color: theme.text.primary, textAlign: "right" }}>{r.d}칸</span>
            </span>
          </div>
        ))}
      </div>
      <Text>
        선택한 단어 {sel.i}: {sel.read}번째 칸에서 읽기 → {sel.predict}번째 칸에서 출력 예측. 거리 {sel.predict} − {sel.read} = {sel.d}칸
      </Text>
      <Small>
        가정(예시): 원문과 번역의 길이가 같고 같은 번호끼리 대응합니다. 거리는 "출력 단어를 예측하는 계산 칸 − 입력 단어를 읽은 계산
        칸"입니다. 입력 종료 기호를 처리하는 칸에서 첫 출력 단어를 예측합니다. 실측 시간이나 학습 속도가 아닙니다.
      </Small>
    </Lab>
  );
}

// ---------- 실험 3: 빔 탐색 ----------

const PROB = [
  { word: "저는", p: 0.6, next: [0.4, 0.35, 0.25] },
  { word: "나는", p: 0.3, next: [0.9, 0.06, 0.04] },
  { word: "우리는", p: 0.1, next: [0.5, 0.3, 0.2] },
];
const ENDINGS = ["갑니다", "봅니다", "쉽니다"];
const pct = (x: number) => (x * 100).toFixed(2).replace(/\.00$/, "") + "%";

interface Cand {
  words: string;
  p: number;
  parts: number[];
  index: number;
}

function search(width: number, stage: 1 | 2) {
  const first: Cand[] = PROB.map((r, i) => ({ words: r.word, p: r.p, parts: [r.p], index: i })).sort((a, b) => b.p - a.p);
  const candidates: Cand[] =
    stage === 1
      ? first
      : first.slice(0, width).flatMap((r) =>
          ENDINGS.map((w, j) => ({
            words: `${r.words} ${w}`,
            p: r.p * PROB[r.index].next[j],
            parts: [r.p, PROB[r.index].next[j]],
            index: r.index,
          })),
        );
  candidates.sort((a, b) => b.p - a.p || a.words.localeCompare(b.words, "ko"));
  return { candidates, kept: candidates.slice(0, width), first: first.slice(0, width) };
}

function BeamLab() {
  const theme = useGrokTheme();
  const [width, setWidth] = useState(1);
  const [stage, setStage] = useState<1 | 2>(2);
  const [showDropped, setShowDropped] = useState(true);
  const r = search(width, stage);
  const rows = showDropped ? r.candidates : r.kept;
  const best = r.kept[0];
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        처음에 덜 유망했던 후보가 나중에 앞설 수 있습니다. 빔 폭을 1에서 2로 바꿔 보십시오.
      </Callout>
      <Slider id="beam-w" label="빔 폭 (최대 후보 수)" value={width} min={1} max={5} show={`${width}개`} onChange={setWidth} />
      <Row>
        <ActionButton label={stage === 2 ? "처음 단어 보기" : "다음 단어 붙이기"} onClick={() => setStage(stage === 1 ? 2 : 1)} />
        <Check id="beam-drop" label="탈락 후보 보기" checked={showDropped} onChange={setShowDropped} />
      </Row>
      <Properties
        items={[
          { label: "현재 단계", value: `${stage} / 2` },
          { label: "평가한 후보", value: `${r.candidates.length}개` },
          { label: "남긴 후보", value: `${r.kept.length}개` },
        ]}
      />
      <Small>
        {stage === 1
          ? "첫 단어 후보를 확률 순으로 정렬하고, 빔 폭만큼 남깁니다."
          : `앞 단계에 남긴 ${r.first.length}개 후보에 다음 단어를 붙입니다. 그 밖의 첫 단어는 다시 검토하지 않습니다.`}
      </Small>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((c, i) => {
          const keep = i < width;
          return (
            <div key={c.words} style={{ opacity: keep ? 1 : 0.5, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ ...theme.font.body2, color: theme.text.primary, fontWeight: 600 }}>{c.words}</span>
                <span style={{ ...theme.font.body2, color: theme.text.primary, fontVariantNumeric: "tabular-nums" }}>{pct(c.p)}</span>
              </div>
              <div style={{ ...theme.font.caption, color: theme.text.secondary }}>
                {keep ? "남김" : "탈락"} · {c.parts.map(pct).join(" × ")}
                {c.parts.length > 1 ? ` = ${pct(c.p)}` : ""}
              </div>
              <span style={{ display: "block", height: 8, background: theme.fill.secondary, borderRadius: 3, marginTop: 4 }}>
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${c.p * 100}%`,
                    background: keep ? theme.dataviz.categorical[0] : theme.dataviz.other,
                    borderRadius: 3,
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>
      <Text>
        현재 1위: {best.words} · 누적 확률 {pct(best.p)}
        {stage === 2 ? " · 예시 문장 종료" : ""}
      </Text>
      <Table
        columns={["앞 단어", "첫 단어 확률", "갑니다", "봅니다", "쉽니다"]}
        rows={PROB.map((p) => [p.word, pct(p.p), ...p.next.map(pct)])}
      />
      <Small>
        모두 예시 확률입니다. 뒤의 세 열은 앞 단어가 주어졌을 때의 조건부 확률이고, 한 행의 합은 100%입니다. 문장의 누적 확률은 두 확률의
        곱입니다. 모든 예시 문장은 두 단어 뒤에 끝납니다. 저자들은 로그 확률로 비교했지만, 여기서는 같은 순위를 만드는 확률 곱을
        보여 줍니다. 막대 길이는 누적 확률(0~100%)이며 번역 정확도가 아닙니다.
      </Small>
    </Lab>
  );
}

// ---------- 실험 4: 논문 결과 ----------

const BASE = 33.3;
interface Res {
  reverse: boolean;
  models: number;
  beam?: number;
  score: number;
}
const DIRECT: Res[] = [
  { reverse: false, models: 1, beam: 12, score: 26.17 },
  { reverse: true, models: 1, beam: 12, score: 30.59 },
  { reverse: true, models: 5, beam: 1, score: 33.0 },
  { reverse: true, models: 2, beam: 12, score: 33.27 },
  { reverse: true, models: 5, beam: 2, score: 34.5 },
  { reverse: true, models: 5, beam: 12, score: 34.81 },
];
const RESCORE: Res[] = [
  { reverse: false, models: 1, score: 35.61 },
  { reverse: true, models: 1, score: 35.85 },
  { reverse: true, models: 5, score: 36.5 },
];
const score = (x: number) => (x === 36.5 ? "36.5" : x.toFixed(2));
const modelName = (m: number) => (m === 1 ? "단일 1개" : `${m}개 앙상블`);

type Mode = "direct" | "rescore";

function ResultLab() {
  const [mode, setMode] = useState<Mode>("direct");
  const [idx, setIdx] = useState(5);
  const rows = mode === "direct" ? DIRECT : RESCORE;
  const i = Math.min(idx, rows.length - 1);
  const cur = rows[i];
  const delta = cur.score - BASE;
  const cond =
    mode === "direct"
      ? `${cur.reverse ? "역순" : "정방향"} LSTM · ${modelName(cur.models)} · 빔 ${cur.beam} · 직접 번역`
      : `${cur.reverse ? "역순" : "정방향"} LSTM · ${modelName(cur.models)} · 기존 SMT 후보 1,000개 재순위`;
  const bars = useMemo(
    () => [
      { label: "기준선 (기존 SMT)", value: BASE, display: BASE.toFixed(2) },
      ...rows.map((r) => ({
        label: `${r.reverse ? "역순" : "정방향"} · ${modelName(r.models)}${mode === "direct" ? ` · 빔 ${r.beam}` : ""}`,
        value: r.score,
        display: score(r.score),
      })),
    ],
    [mode, rows],
  );
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        직접 번역과 재순위를 구분합니다. 직접 번역에서는 LSTM이 번역을 만들고, 재순위에서는 기존 통계 번역기(SMT)가 낸 후보의
        순위만 다시 매깁니다. 숫자는 논문 값입니다 (p.6, 표 1·2).
      </Callout>
      <Segmented
        options={[
          { value: "direct" as const, label: "직접 번역 (표 1)" },
          { value: "rescore" as const, label: "재순위 (표 2)" },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setIdx((m === "direct" ? DIRECT : RESCORE).length - 1);
        }}
      />
      <Slider id="res-i" label="표에 있는 조건 고르기" value={i} min={0} max={rows.length - 1} show={`${i + 1} / ${rows.length}`} onChange={setIdx} />
      <Text>선택 조건: {cond}</Text>
      <Bars bars={bars} emphasis={i + 1} />
      <Text>
        표의 값으로 계산한 차이: {cur.score.toFixed(2)} − {BASE.toFixed(2)} = {delta >= 0 ? "+" : ""}
        {delta.toFixed(2)} BLEU
      </Text>
      <Small>
        공통 평가: WMT'14 영어→프랑스어 시험 세트 ntst14, 대소문자를 구분하는 BLEU(정답 번역과 겹치는 표현으로 매기는 점수) (p.5,
        §3.6). 제안 모델의 행과 기준선만 옮겼습니다. 없는 조건의 점수는 추정하지 않습니다.{" "}
        {mode === "direct"
          ? "최고 직접 번역 결과도 당시 모든 시스템 중 최고는 아니었습니다 (p.5, §3.6)."
          : "재순위: 기존 SMT의 1,000개 후보마다 LSTM 로그 확률을 구하고, SMT 점수와 같은 비율로 평균해 순위를 다시 정합니다 (p.4, §3.2)."}
      </Small>
    </Lab>
  );
}

// ---------- 확인 질문 ----------

const QUIZ = [
  {
    q: "인코더가 문장을 다 읽은 뒤 디코더에 넘기는 것은 무엇입니까?",
    options: ["문장을 담은 고정된 크기의 숫자 묶음", "사람이 쓴 정답 번역문 전체", "입력 단어 수와 같은 길이의 출력 문장", "번역문의 최종 BLEU 점수"],
    correct: 0,
    hint: "실험 1에서 인코더와 디코더 사이에 무엇이 넘어가는지 확인하십시오.",
    why: "인코더의 마지막 상태로 디코더를 시작하고, <EOS>가 나올 때까지 출력합니다.",
    source: "p.3, §2",
  },
  {
    q: "이 논문에서 저자들이 번역 성능을 높이려고 쓴 순서 변경은 무엇입니까?",
    options: [
      "입력과 출력의 단어 순서를 모두 뒤집습니다.",
      "입력만 뒤집고 출력은 원래 순서를 유지합니다.",
      "출력만 뒤집고 입력은 원래 순서를 유지합니다.",
      "매번 입력과 출력의 단어를 무작위로 섞습니다.",
    ],
    correct: 1,
    hint: "원문을 읽는 순서와 번역문을 쓰는 순서를 구분하십시오.",
    why: "원문만 역순으로 읽으며, 정답 번역문의 순서는 뒤집지 않습니다.",
    source: "p.4, §3.3",
  },
  {
    q: "표 1의 BLEU 34.81은 어떤 조건의 결과입니까?",
    options: [
      "정방향 LSTM 1개 · 직접 번역 · 빔 12",
      "역순 LSTM 1개 · 직접 번역 · 빔 12",
      "역순 LSTM 5개 앙상블 · 직접 번역 · 빔 12",
      "역순 LSTM 5개 앙상블 · 기존 후보 1,000개 재순위",
    ],
    correct: 2,
    hint: "위의 결과 실험에서 직접 번역과 재순위의 조건을 확인하십시오.",
    why: "34.81은 역순 모델 5개 앙상블, 빔 12, 직접 번역 결과입니다. 재순위 최고 점수는 36.5입니다.",
    source: "p.6, 표 1",
  },
];

function Quiz() {
  const theme = useGrokTheme();
  const [answers, setAnswers] = useState<(number | null)[]>(QUIZ.map(() => null));
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === QUIZ[i].correct).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Row>
        <Small>
          {answered} / {QUIZ.length}문제 응답 · 현재 정답 {correct}개
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
                {"ABCD"[oi]}. {o}
              </button>
            ))}
            <details>
              <summary style={{ ...theme.font.caption, color: theme.text.secondary, cursor: "pointer" }}>힌트 보기</summary>
              <Small>{q.hint}</Small>
            </details>
            {a !== null ? (
              <Callout lead={a === q.correct ? "정답입니다" : "오답입니다"} tone={a === q.correct ? "success" : "warning"}>
                {q.why} ({q.source})
              </Callout>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ---------- 글 ----------

export default function App() {
  return (
    <Page
      title="Seq2Seq 쉽게 보기 (Sutskever·Vinyals·Le, 2014)"
      summary="읽는 LSTM(인코더)이 문장 전체를 고정 길이 벡터 하나로 요약하고, 쓰는 LSTM(디코더)이 그 벡터에서 번역을 한 단어씩 만듭니다. 입력 문장만 뒤집는 요령과 빔 탐색을 더해 영어→프랑스어 번역에서 BLEU 34.81을 얻었고, 기존 통계 번역기(33.30)를 넘었습니다. 다만 문장 전체를 고정 길이 벡터 하나에 담는 구조는 다음 논문(Bahdanau 어텐션)이 문제로 짚습니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "핵심 구조", id: "idea" },
          { label: "실험 1: 고정 길이 기억", id: "encode" },
          { label: "실험 2: 입력 뒤집기", id: "reverse" },
          { label: "실험 3: 빔 탐색", id: "beam" },
          { label: "실험 4: 논문 결과", id: "results" },
          { label: "고정 길이 벡터와 다음 글", id: "next" },
          { label: "논문 근거 위치", id: "evidence" },
          { label: "주의: 결과를 읽는 법", id: "caution" },
          { label: "확인 질문과 답", id: "quiz" },
          { label: "출처", id: "source" },
        ]}
      />

      <Section heading="한 장면 비유" id="analogy">
        <Text>
          통역사가 영어 문장을 끝까지 듣습니다. 듣는 동안 메모 한 장에 요약을 계속 고쳐 씁니다. 다 들으면 원문은 덮고, 그 메모
          한 장만 보며 프랑스어로 한 단어씩 말합니다. Seq2Seq는 이 통역사를 신경망 두 개로 만든 것입니다.
        </Text>
        <Callout lead="비유의 한계" tone="warning">
          실제 메모는 사람이 읽는 글이 아니라 숫자 8,000개입니다 (p.5, §3.4). 어떤 숫자가 어떤 단어를 담는지는 정해져 있지 않습니다.
        </Callout>
        <Table
          columns={["용어", "뜻"]}
          rows={[
            ["인코더(encoder)", "입력 문장을 읽어 벡터로 요약하는 신경망"],
            ["디코더(decoder)", "그 벡터에서 출력 문장을 한 단어씩 만드는 신경망"],
            ["LSTM", "앞에서 읽은 내용을 상태(기억)로 들고 다니는 순환 신경망의 한 종류"],
            ["고정 길이 벡터", "문장 길이와 상관없이 칸 수가 정해진 숫자 묶음"],
            ["<EOS>", "문장 끝 기호. 디코더가 이 기호를 내면 출력을 멈춥니다"],
            ["빔 탐색(beam search)", "매 단계 확률이 높은 후보 몇 개만 남기며 번역을 찾는 방법"],
            ["BLEU", "정답 번역과 겹치는 표현을 바탕으로 매기는 번역 점수"],
          ]}
        />
      </Section>

      <Section heading="핵심 구조" id="idea">
        <Text>
          논문의 그림 1은 입력 "A B C"를 읽고 출력 "W X Y Z"를 만든 뒤 멈추는 흐름입니다 (p.2, 그림 1). 순서는 다음과 같습니다.
        </Text>
        <Steps
          steps={[
            { title: "인코더 LSTM이 입력을 한 단어씩 읽습니다", detail: "단어를 읽을 때마다 상태(기억)를 고칩니다. 마지막은 <EOS>입니다 (p.3, §2)." },
            { title: "마지막 상태가 문장 전체의 고정 길이 벡터가 됩니다", detail: "실제 모델에서는 실수 8,000개입니다 (p.5, §3.4)." },
            { title: "디코더 LSTM이 그 벡터에서 출발합니다", detail: "번역 단어를 하나씩 예측하고, <EOS>를 내면 멈춥니다 (p.3, §2)." },
            { title: "학습에서는 정답 번역의 로그 확률을 키웁니다", detail: "번역할 때는 빔 탐색으로 확률이 가장 높은 문장을 찾습니다 (p.4, §3.2)." },
          ]}
        />
        <Text>기본 그림과 실제 모델은 세 가지가 다릅니다 (p.3, §2).</Text>
        <Table
          columns={["실제 모델의 선택", "이유 (논문 설명)"]}
          rows={[
            ["입력용과 출력용 LSTM을 따로 둠", "계산 비용은 거의 그대로이면서 파라미터 수가 늘어남"],
            ["4층 LSTM", "깊은 LSTM이 얕은 LSTM보다 훨씬 좋았음. 층을 하나 더할 때마다 퍼플렉시티가 약 10% 줄었음 (p.5, §3.4)"],
            ["입력 문장만 뒤집어 읽음", "입력과 출력의 앞쪽 단어가 가까워져 학습이 쉬워짐 (p.4, §3.3)"],
          ]}
        />
        <Text>
          규모: 층마다 1,000칸, 단어 벡터 1,000차원, 입력 어휘 160,000개, 출력 어휘 80,000개, 파라미터 3억 8,400만 개입니다 (p.5, §3.4).
          학습 데이터는 영어·프랑스어 문장 쌍 1,200만 개입니다 (p.4, §3.1).
        </Text>
      </Section>

      <Section heading="실험 1: 고정 길이 기억" id="encode" caption="벡터 4칸과 안의 숫자는 예시 값입니다 (논문 밖)">
        <Text>
          문장 길이를 바꾸고 "다음 단어 읽기"를 눌러 보십시오. 입력이 2단어든 12단어든 디코더가 받는 것은 같은 크기의 벡터 하나입니다.
        </Text>
        <EncodeLab />
        <Text>
          실제 논문 모델은 이 4칸 대신 실수 8,000개를 씁니다 (p.5, §3.4). 저자는 이 벡터가 문장의 뜻을 담도록 학습된다고 봅니다. 비슷한
          뜻의 문장은 가깝고, 다른 뜻의 문장은 멀리 놓인다는 것입니다 (p.2~3, §1).
        </Text>
      </Section>

      <Section heading="실험 2: 입력 뒤집기" id="reverse" caption="거리는 예시 계산입니다">
        <Text>
          보통 순서로 이어 붙이면 원문 단어와 그 번역 단어 사이가 멉니다. 저자는 이것을 큰 "최소 시간 간격(minimal time lag)"이라고
          부릅니다. 입력만 뒤집으면 원문 첫 단어가 번역 첫 단어 바로 앞에 옵니다 (p.4, §3.3).
        </Text>
        <ReverseLab />
        <Text>
          뒤집어도 평균 거리는 바뀌지 않습니다. 바뀌는 것은 가장 짧은 거리입니다. 저자는 앞쪽의 짧은 연결 덕분에 역전파가 원문과 번역
          사이에 "소통을 세우기" 쉬워진다고 해석합니다 (p.4, §3.3).
        </Text>
        <Callout lead="논문 값 (p.4, §3.3)">
          입력을 뒤집자 시험 퍼플렉시티(다음 단어를 얼마나 헷갈리는지 나타내는 값, 낮을수록 좋음)가 5.8에서 4.7로 내려갔고, 시험 BLEU는
          25.9에서 30.6으로 올랐습니다.
        </Callout>
        <Callout lead="논문 안의 작은 차이" tone="warning">
          같은 비교가 표 1에서는 정방향 26.17, 역순 30.59로 적혀 있습니다 (p.6, 표 1). §3.3의 25.9 → 30.6과 조금 다릅니다. 어떤 조건
          차이인지는 논문에 설명이 없습니다 (미확인).
        </Callout>
        <Text>
          저자도 "완전한 설명은 없다"고 썼습니다. 처음에는 번역 앞부분만 좋아질 것이라고 예상했지만, 실제로는 긴 문장에서도 훨씬
          좋아졌습니다 (p.4~5, §3.3).
        </Text>
      </Section>

      <Section heading="실험 3: 빔 탐색" id="beam" caption="문장과 확률은 예시 값입니다">
        <Text>
          번역할 때는 확률이 가장 높은 문장을 찾아야 합니다. 모든 문장을 다 볼 수는 없으므로, 매 단계 상위 B개 후보만 남깁니다 (p.4,
          §3.2). B를 빔 폭(beam size)이라고 합니다. 폭 1은 매번 1등만 따라가는 탐욕적 선택(greedy)입니다.
        </Text>
        <BeamLab />
        <Text>
          폭 1에서는 첫 단어 1등 "저는"만 남아서 "나는 갑니다"(27%)를 끝내 못 봅니다. 폭 2부터는 이 문장이 1등이 됩니다. 논문은 폭 1로도
          잘 되고, 폭 2가 빔 탐색 이득의 대부분을 준다고 보고합니다 (p.4, §3.2, 표 1).
        </Text>
      </Section>

      <Section heading="실험 4: 논문 결과" id="results" caption="BLEU는 논문 값입니다 (p.6, 표 1·2)">
        <ResultLab />
        <Text>
          역순 LSTM 5개 앙상블(여러 모델의 예측을 합치는 방법)이 빔 12로 34.81을 얻어 기준선 33.30을 넘었습니다. 저자는 순수 신경망
          번역이 큰 규모 번역 과제에서 통계 번역 기준선을 넘은 첫 사례라고 씁니다 (p.5, §3.6). 기존 SMT가 낸 후보 1,000개의 순위를
          다시 매긴 결과는 36.5입니다. 당시 최고 결과 37.0과의 차이는 0.5점 이내였습니다 (p.6, 표 2).
        </Text>
        <Text>
          표 1에는 비교 대상으로 "Bahdanau et al." 28.45도 있습니다 (p.6, 표 1). 이 숫자는{" "}
          <a href={NEXT_POST}>다음 글에서 다루는 어텐션 모델</a>이 같은 시험 세트에서 얻은 결과입니다.
        </Text>
      </Section>

      <Section heading="고정 길이 벡터와 다음 글" id="next">
        <Text>
          Seq2Seq에서 디코더가 받는 정보는 인코더의 마지막 상태 하나뿐입니다. 같은 해에 나온 Bahdanau·Cho·Bengio 논문은 바로 이 점을
          짚습니다. 이 논문은 Sutskever 외(2014)를 기존 인코더-디코더의 예로 들며, "LSTM을 쓰고 마지막 상태 h_T를 문장 벡터로 쓴다"고
          정리합니다 (Bahdanau 외, p.2, §2.1).
        </Text>
        <Callout lead="Bahdanau 외 초록 (p.1)">
          "we conjecture that the use of a fixed-length vector is a bottleneck in improving the performance of this basic encoder–decoder
          architecture"
        </Callout>
        <Text>
          두 논문의 관찰은 서로 다릅니다. Seq2Seq 저자는 입력을 뒤집은 LSTM이 긴 문장도 잘 번역했다고 씁니다. 35단어
          미만에서는 성능이 떨어지지 않았고, 가장 긴 문장에서만 조금 떨어졌습니다 (p.6, §3.7 · p.7, 그림 3). Bahdanau 외는 자신들이
          학습한 기본 인코더-디코더(RNNencdec)가 문장이 길어질수록 성능이 크게 떨어졌다고 보고합니다 (Bahdanau 외, p.5, 그림 2 · p.6,
          §5.1).
        </Text>
        <Callout lead="두 관찰을 함께 읽는 법" tone="warning">
          두 논문의 기본 모델은 같지 않습니다. Seq2Seq는 4층 LSTM, 실수 8,000개, 입력 뒤집기, 5개 앙상블을 썼습니다. Bahdanau 외의
          RNNencdec는 은닉 1,000칸 모델입니다 (Bahdanau 외, p.5, §4.2). 그래서 "고정 길이 벡터는 언제나 긴 문장에 실패한다"도, "언제나
          괜찮다"도 이 두 논문만으로는 말할 수 없습니다 (추정).
        </Callout>
        <Text>
          다음 글 <a href={NEXT_POST}>Bahdanau 어텐션 쉽게 보기</a>에서는 고정 길이 벡터 하나 대신 원문 위치마다 표현을 남겨 두고, 번역
          단어마다 참고할 곳을 새로 고르는 방법을 실험으로 봅니다. 이 글의 실험 1(고정 길이 기억)과 그 글의 실험 3(저장하는 표현의
          개수)을 나란히 보면 차이가 잘 보입니다.
        </Text>
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["입력을 읽고 출력을 만들며 <EOS>에서 멈추는 흐름", "p.2, 그림 1"],
            ["인코더의 마지막 상태로 디코더를 시작", "p.3, §2"],
            ["실제 모델의 세 가지 차이 (LSTM 2개, 4층, 입력 뒤집기)", "p.3, §2"],
            ["학습 데이터 1,200만 문장 쌍, 어휘 160,000 / 80,000", "p.4, §3.1"],
            ["빔 탐색, 폭 2가 이득의 대부분, 재순위 방법", "p.4, §3.2"],
            ["입력 뒤집기: 퍼플렉시티 5.8 → 4.7, BLEU 25.9 → 30.6", "p.4, §3.3"],
            ["4층, 1,000칸, 문장 표현 실수 8,000개, 파라미터 3억 8,400만", "p.5, §3.4"],
            ["대소문자 구분 BLEU, 최고 WMT'14 결과 37.0", "p.5, §3.6"],
            ["직접 번역 결과 (34.81 등)", "p.6, 표 1"],
            ["재순위 결과 (36.5 등)", "p.6, 표 2"],
            ["긴 문장에서의 성능 (35단어 미만은 하락 없음)", "p.6, §3.7 · p.7, 그림 3"],
          ]}
        />
        <Callout lead="핵심 원문 문장 (p.1, 초록)">
          "Our method uses a multilayered Long Short-Term Memory (LSTM) to map the input sequence to a vector of a fixed dimensionality, and
          then another deep LSTM to decode the target sequence from the vector."
        </Callout>
      </Section>

      <Section heading="주의: 결과를 읽는 법" id="caution">
        <Callout lead="이 논문만으로 말할 수 없는 것" tone="warning">
          34.81은 당시 최고 결과가 아닙니다. 같은 평가 방식으로 잰 최고 WMT'14 결과는 37.0이었습니다 (p.5, §3.6). 34.81은 "신경망만으로
          직접 번역해 통계 번역 기준선을 넘었다"는 뜻입니다.
        </Callout>
        <Text>
          어휘가 80,000개로 제한되어, 정답 번역에 그 밖의 단어가 있으면 점수가 깎였습니다 (p.2, §1). 36.5는 기존 SMT가 만든 후보의
          순위를 다시 매긴 결과이므로 신경망 단독 성능이 아닙니다 (p.4, §3.2).
        </Text>
        <Text>
          입력 뒤집기가 왜 좋은지는 저자의 해석("we believe")입니다 (p.4, §3.3). 실험 1~3의 숫자, 문장, 확률은 모두 구조를 보이기 위한
          예시이며 실제 LSTM을 학습하거나 실행한 값이 아닙니다.
        </Text>
      </Section>

      <Section heading="확인 질문과 답" id="quiz">
        <Text>보기를 고르면 정답 여부와 해설, 논문 위치가 나옵니다.</Text>
        <Quiz />
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Ilya Sutskever, Oriol Vinyals, Quoc V. Le. "Sequence to Sequence Learning with Neural Networks". 2014 (NIPS 2014).{" "}
          <a href="https://arxiv.org/abs/1409.3215">arxiv.org/abs/1409.3215</a> (arXiv v3, 2014-12-14). 쪽수는 이 PDF 기준입니다.
        </Text>
        <Text>
          이어 읽기: <a href={NEXT_POST}>Bahdanau 어텐션 쉽게 보기 (Bahdanau·Cho·Bengio, 2014)</a>
        </Text>
      </Section>
    </Page>
  );
}
