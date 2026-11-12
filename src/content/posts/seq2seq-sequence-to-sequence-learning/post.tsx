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
import { Tex } from "@/components/Tex";

// 실험 1~8의 숫자는 모두 구조를 보이기 위한 예시 값이다(논문 밖). 실험 9의 BLEU만 논문 표 1·2의 값이다.
// 실험 1·2·8·9의 계산 규칙은 원본 실험실(seq2seq.html)과 같다.
// 실험 3~7과 확률·학습·디코딩·BLEU 절은 2026-11-12 질문 정리 글(seq2seq_blog.html)을 원문과 대조해 옮겼다.

const NEXT_POST = "/posts/bahdanau-attention-align-translate/";
const APPENDIX = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/appendix/seq2seq-questions.html`;

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

// ---------- 공통: 수식, 확률 막대 ----------

// 긴 수식이 좁은 화면에서 본문 밖으로 나가지 않도록 가로 스크롤 상자에 담는다.
function Eq({ children }: { children: string }) {
  return (
    <div style={{ overflowX: "auto", maxWidth: "100%" }}>
      <Tex display>{children}</Tex>
    </div>
  );
}

function BarRow({ label, ratio, value, strong = true }: { label: string; ratio: number; value: string; strong?: boolean }) {
  const theme = useGrokTheme();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(64px, 96px) minmax(0, 1fr) 64px", gap: 8, alignItems: "center" }}>
      <span style={{ ...theme.font.body2, color: theme.text.primary, fontWeight: strong ? 600 : 400 }}>{label}</span>
      <span style={{ display: "block", height: 10, background: theme.fill.secondary, borderRadius: 3 }}>
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
            background: strong ? theme.dataviz.categorical[0] : theme.dataviz.other,
            borderRadius: 3,
          }}
        />
      </span>
      <span style={{ ...theme.font.body2, color: theme.text.primary, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ---------- 실험 3: 문장 확률 ----------

const PATH = ["나는", "너를", "사랑해", "<EOS>"];
const PATH_DEFAULT = [80, 60, 50, 90];

function ProbLab() {
  const [ps, setPs] = useState<number[]>(PATH_DEFAULT);
  const [eos, setEos] = useState(true);
  const used = ps.slice(0, eos ? 4 : 3).map((x) => x / 100);
  const prob = used.reduce((a, b) => a * b, 1);
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        단계마다 정답 단어가 받은 확률을 곱하면 문장 전체의 확률이 됩니다. 1보다 작은 수를 계속 곱하므로 문장이 길수록 값이 빨리
        작아집니다.
      </Callout>
      {PATH.map((w, i) => (
        <Slider
          key={w}
          id={`prob-${i}`}
          label={`${i + 1}단계 정답 "${w}"의 확률`}
          value={ps[i]}
          min={1}
          max={99}
          show={`${ps[i]}%`}
          onChange={(x) => setPs(ps.map((y, k) => (k === i ? x : y)))}
        />
      ))}
      <Row>
        <Check id="prob-eos" label="종료 기호 <EOS>까지 곱하기" checked={eos} onChange={setEos} />
        <ActionButton
          label="처음 값으로"
          onClick={() => {
            setPs(PATH_DEFAULT);
            setEos(true);
          }}
        />
      </Row>
      <Properties
        items={[
          { label: eos ? "완성 문장의 확률" : "앞 세 단어(접두사)의 확률", value: `${(prob * 100).toFixed(2)}%` },
          { label: "손실 −ln(확률)", value: (-Math.log(prob)).toFixed(4) },
        ]}
      />
      <Text>
        {used.map((p) => p.toFixed(2)).join(" × ")} = {prob.toFixed(4)}
      </Text>
      <Small>
        실제 모델을 실행하지 않습니다. 한 문장 경로에 정한 예시 확률을 곱할 뿐입니다. 각 단계에서 남은 확률은 다른 단어 후보의 몫입니다.
        이 값은 "번역이 맞을 확률"이 아닙니다.
      </Small>
    </Lab>
  );
}

// ---------- 실험 4: Teacher Forcing ----------

const TARGET = ["나는", "너를", "사랑해", "<EOS>"];
type Dist = [string, number][];
const TRAIN_DIST: Dist[] = [
  [
    ["그는", 0.6],
    ["나는", 0.4],
  ],
  [
    ["너를", 0.6],
    ["당신을", 0.3],
    ["그를", 0.1],
  ],
  [
    ["사랑해", 0.5],
    ["좋아해", 0.3],
    ["기억해", 0.2],
  ],
  [
    ["<EOS>", 0.9],
    ["정말", 0.1],
  ],
];
const INFER_DIST: Dist[] = [
  TRAIN_DIST[0],
  [
    ["그녀를", 0.7],
    ["너를", 0.2],
    ["나를", 0.1],
  ],
  [
    ["좋아해", 0.7],
    ["사랑해", 0.2],
    ["기억해", 0.1],
  ],
  TRAIN_DIST[3],
];
const topWord = (d: Dist) => d.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
type TfMode = "train" | "infer";

function TeacherLab() {
  const [mode, setMode] = useState<TfMode>("train");
  const [step, setStep] = useState(0);
  const train = mode === "train";
  const dist = (train ? TRAIN_DIST : INFER_DIST)[step];
  const tokens = train ? TARGET : INFER_DIST.map(topWord);
  const input = step === 0 ? "<BOS>" : tokens[step - 1];
  const best = topWord(dist);
  const mark = train ? TARGET[step] : best;
  const p = dist.find((x) => x[0] === TARGET[step])?.[1] ?? 0;
  const last = step === TARGET.length - 1;
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        1단계에서 모델은 "그는"에 더 높은 확률을 줍니다. 학습과 추론을 바꿔 가며, 2단계에 디코더로 들어가는 단어가 어떻게 다른지
        보십시오.
      </Callout>
      <Segmented
        options={[
          { value: "train" as const, label: "학습: 앞 정답을 넣음" },
          { value: "infer" as const, label: "추론: 앞에서 고른 단어를 넣음" },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setStep(0);
        }}
      />
      <Row>
        <ActionButton label="이전 단계" onClick={() => setStep(step - 1)} disabled={step === 0} />
        <ActionButton label="다음 단계" onClick={() => setStep(step + 1)} disabled={last} />
        <ActionButton label="처음으로" onClick={() => setStep(0)} />
      </Row>
      <Properties
        items={[
          { label: "현재 단계", value: `${step + 1} / ${TARGET.length}` },
          { label: "디코더에 넣는 단어", value: input },
          { label: "함께 쓰는 상태", value: `h${step}, c${step}` },
        ]}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Small>이번 단계의 다음 단어 확률 (예시)</Small>
        {dist.map(([w, q]) => (
          <BarRow key={w} label={w} ratio={q} value={`${Math.round(q * 100)}%`} strong={w === mark} />
        ))}
      </div>
      <Text>
        {train
          ? `이번 정답은 "${TARGET[step]}"입니다. 정답 확률 ${Math.round(p * 100)}%로 손실 −ln(p) = ${(-Math.log(p)).toFixed(4)}를 구합니다. 1등 단어 "${best}"를 골라 다음 입력으로 넣지는 않습니다.`
          : `탐욕적 선택(greedy)은 "${best}"를 고릅니다. 추론에는 정답이 없으므로 손실도 구하지 않습니다.`}
      </Text>
      <Text>
        {last
          ? train
            ? "마지막 정답의 손실까지 구하면 이 문장 쌍의 순전파가 끝납니다. 손실을 모두 더한 뒤 역전파합니다."
            : "고른 단어가 <EOS>이므로 출력을 멈춥니다."
          : train
            ? `다음 단계의 입력은 정답 "${TARGET[step]}"입니다. 지금 맞힐 단어를 미리 넣은 것이 아니라, 다음 단계의 앞 단어로 넣습니다.`
            : `다음 단계의 입력은 방금 고른 "${best}"입니다. 새 상태 h${step + 1}, c${step + 1}도 함께 넘어갑니다.`}
      </Text>
      <div>
        <Small>{train ? "디코더 입력이 되는 정답 문장" : "모델이 고른 단어로 만든 문장"}</Small>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {tokens.map((t, i) => (
            <Chip key={`${t}-${i}`} label={`${i + 1}. ${t}`} tone={i === step ? "current" : i < step ? "read" : "plain"} />
          ))}
        </div>
      </div>
      <Small>
        예시 분포로 입력 경로만 흉내 냅니다. 추론은 탐욕적 선택으로 보여 주며, 저자들이 쓴 빔 탐색과는 다릅니다. 학습 쪽의 1등 단어는
        관찰용이고 다음 입력으로 쓰지 않습니다.
      </Small>
    </Lab>
  );
}

// ---------- 실험 5: LSTM 한 칸 ----------

const LSTM_DEFAULT = { c0: 0.8, f: 0.9, i: 0.2, g: 0.5, o: 0.7 };

function LstmLab() {
  const [v, setV] = useState(LSTM_DEFAULT);
  const keep = v.f * v.c0;
  const add = v.i * v.g;
  const c = keep + add;
  const h = v.o * Math.tanh(c);
  const set = (k: keyof typeof LSTM_DEFAULT) => (x: number) => setV({ ...v, [k]: x });
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        LSTM 벡터의 숫자 한 칸만 봅니다. 유지 비율 f를 1에 가깝게 두면 이전 기억 c가 거의 그대로 남습니다.
      </Callout>
      <Slider id="lstm-c0" label="이전 셀 상태 c" value={v.c0} min={-2} max={2} step={0.01} show={v.c0.toFixed(2)} onChange={set("c0")} />
      <Slider id="lstm-f" label="유지 비율 f (망각 게이트)" value={v.f} min={0} max={1} step={0.01} show={v.f.toFixed(2)} onChange={set("f")} />
      <Slider id="lstm-i" label="추가 비율 i (입력 게이트)" value={v.i} min={0} max={1} step={0.01} show={v.i.toFixed(2)} onChange={set("i")} />
      <Slider id="lstm-g" label="새 정보 후보 g" value={v.g} min={-1} max={1} step={0.01} show={v.g.toFixed(2)} onChange={set("g")} />
      <Slider id="lstm-o" label="출력 비율 o (출력 게이트)" value={v.o} min={0} max={1} step={0.01} show={v.o.toFixed(2)} onChange={set("o")} />
      <Row>
        <ActionButton label="처음 값으로" onClick={() => setV(LSTM_DEFAULT)} />
      </Row>
      <Properties
        items={[
          { label: "새 셀 상태 c", value: c.toFixed(4) },
          { label: "새 은닉 상태 h", value: h.toFixed(4) },
        ]}
      />
      <Text>
        유지한 기억 {v.f.toFixed(2)} × {v.c0.toFixed(2)} = {keep.toFixed(4)} · 더한 정보 {v.i.toFixed(2)} × {v.g.toFixed(2)} = {add.toFixed(4)}
      </Text>
      <Text>
        새 c = {keep.toFixed(4)} + {add.toFixed(4)} = {c.toFixed(4)} · 새 h = {v.o.toFixed(2)} × tanh({c.toFixed(4)}) = {h.toFixed(4)}
      </Text>
      <Small>
        게이트 값을 손으로 정하는 교육용 실험입니다. 실제 LSTM에서는 게이트도 입력, 이전 은닉 상태, 학습한 가중치로 계산합니다.
      </Small>
    </Lab>
  );
}

// ---------- 실험 6: 기울기 계산과 가중치 갱신 ----------

const sigmoid = (w: number) => (w >= 0 ? 1 / (1 + Math.exp(-w)) : Math.exp(w) / (1 + Math.exp(w)));

function GradientLab() {
  const [w, setW] = useState(0);
  const [eta, setEta] = useState(0.1);
  const [grad, setGrad] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [msg, setMsg] = useState("① 기울기 계산 → ② 가중치 갱신 순서로 누르십시오.");
  const p = sigmoid(w);
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        ① 역전파 버튼은 기울기만 구합니다. ② 갱신 버튼을 눌러야 가중치와 정답 확률이 바뀝니다.
      </Callout>
      <Slider
        id="grad-w"
        label="가중치 w"
        value={w}
        min={Math.min(-4, Math.floor(w))}
        max={Math.max(4, Math.ceil(w))}
        step={0.01}
        show={w.toFixed(4)}
        onChange={(x) => {
          setW(x);
          setGrad(null);
          setMsg("가중치를 바꿨습니다. 기울기를 다시 구하십시오.");
        }}
      />
      <Slider
        id="grad-eta"
        label="학습률 η"
        value={eta}
        min={0.01}
        max={2}
        step={0.01}
        show={eta.toFixed(2)}
        onChange={(x) => {
          setEta(x);
          setGrad(null);
          setMsg("학습률을 바꿨습니다. ① 기울기 계산 뒤 ② 갱신을 누르십시오.");
        }}
      />
      <Row>
        <ActionButton
          label="① 역전파: 기울기 계산"
          onClick={() => {
            setGrad(p - 1);
            setMsg("기울기만 구했습니다. 정답 확률과 손실은 아직 그대로입니다.");
          }}
        />
        <ActionButton
          label="② 경사하강법: 가중치 갱신"
          disabled={grad === null}
          onClick={() => {
            if (grad === null) return;
            const next = w - eta * grad;
            setMsg(`갱신 ${count + 1}회: w = ${w.toFixed(4)} − ${eta.toFixed(2)} × (${grad.toFixed(4)}) = ${next.toFixed(4)}. 새 가중치로 확률과 손실을 다시 계산했습니다.`);
            setW(next);
            setGrad(null);
            setCount(count + 1);
          }}
        />
        <ActionButton
          label="처음으로"
          onClick={() => {
            setW(0);
            setEta(0.1);
            setGrad(null);
            setCount(0);
            setMsg("① 기울기 계산 → ② 가중치 갱신 순서로 누르십시오.");
          }}
        />
      </Row>
      <Properties
        items={[
          { label: "정답 확률 σ(w)", value: p.toFixed(4) },
          { label: "손실 −ln(p)", value: (-Math.log(p)).toFixed(4) },
          { label: "구한 기울기 p − 1", value: grad === null ? "아직 없음" : grad.toFixed(4) },
        ]}
      />
      <Text>{msg}</Text>
      <Small>
        정답이 1인, 가중치 하나짜리 예시 모델입니다. 미분식 dL/dw = p − 1을 씁니다. 실제 번역 모델의 학습이 아닙니다.
      </Small>
    </Lab>
  );
}

// ---------- 실험 7: 고르는 방법 ----------

const SAMPLE_WORDS = ["너를", "당신을", "그를"];
type SampleMode = "sampling" | "greedy";

function SamplingLab() {
  const [mode, setMode] = useState<SampleMode>("sampling");
  const [a, setA] = useState(60);
  const [counts, setCounts] = useState([0, 0, 0]);
  const [last, setLast] = useState<number | null>(null);
  const ps = [a / 100, ((100 - a) / 100) * 0.75, ((100 - a) / 100) * 0.25];
  const total = counts.reduce((s, x) => s + x, 0);
  const entropy = -ps.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
  const clear = () => {
    setCounts([0, 0, 0]);
    setLast(null);
  };
  const draw = (n: number) => {
    const next = counts.slice();
    let pick = 0;
    for (let k = 0; k < n; k++) {
      if (mode === "greedy") pick = ps.indexOf(Math.max(...ps));
      else {
        const u = Math.random();
        pick = u < ps[0] ? 0 : u < ps[0] + ps[1] ? 1 : 2;
      }
      next[pick]++;
    }
    setCounts(next);
    setLast(pick);
  };
  return (
    <Lab>
      <Callout lead="이 화면에서 볼 것" tone="info">
        모델 확률과 실제로 뽑힌 비율을 비교하십시오. 1,000번 뽑아도 비율이 확률과 정확히 같아지지는 않습니다.
      </Callout>
      <Segmented
        options={[
          { value: "sampling" as const, label: "샘플링: 확률대로 뽑음" },
          { value: "greedy" as const, label: "탐욕적 선택: 1등만" },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          clear();
        }}
      />
      <Slider
        id="samp-a"
        label='"너를"의 모델 확률'
        value={a}
        min={10}
        max={90}
        show={`${a}%`}
        onChange={(x) => {
          setA(x);
          clear();
        }}
      />
      <Row>
        <ActionButton label="1번 뽑기" onClick={() => draw(1)} />
        <ActionButton label="1,000번 뽑기" onClick={() => draw(1000)} />
        <ActionButton label="초기화" onClick={clear} />
      </Row>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Small>막대는 뽑힌 비율, 오른쪽은 뽑힌 횟수입니다</Small>
        {SAMPLE_WORDS.map((w, i) => (
          <BarRow
            key={w}
            label={`${w} ${(ps[i] * 100).toFixed(0)}%`}
            ratio={total ? counts[i] / total : 0}
            value={`${counts[i].toLocaleString()}회`}
            strong={i === 0}
          />
        ))}
      </div>
      <Properties
        items={[
          { label: "모두 뽑은 횟수", value: `${total.toLocaleString()}회` },
          { label: "엔트로피 (확률이 퍼진 정도)", value: `${entropy.toFixed(3)} bit` },
          { label: "가장 최근 선택", value: last === null ? "아직 없음" : SAMPLE_WORDS[last] },
        ]}
      />
      <Small>
        남은 확률은 "당신을 : 그를 = 3 : 1"로 나눕니다. 브라우저 난수로 뽑는 예시이며, 확률은 모델이 맞을 확률이 아닙니다.
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
  {
    q: "Teacher Forcing으로 학습할 때, 3단계에서 디코더에 넣는 단어는 무엇입니까? (정답 번역: 나는 너를 사랑해)",
    options: [
      "이번에 맞힐 단어 \"사랑해\"",
      "바로 앞의 정답 단어 \"너를\"",
      "모델이 2단계에서 1등으로 고른 단어",
      "인코더가 마지막으로 읽은 단어",
    ],
    correct: 1,
    hint: "실험 4의 표에서 디코더 입력과 정답 라벨이 한 칸씩 어긋난 것을 보십시오.",
    why: "디코더에는 바로 앞의 정답 단어를 넣고, 이번 정답은 손실을 구할 때만 씁니다. 모델이 고른 단어를 넣는 것은 추론입니다.",
    source: "논문 밖, 실험 4 절",
  },
  {
    q: "loss.backward()로 역전파만 실행하고 optimizer.step()은 부르지 않았습니다. 무엇이 바뀝니까?",
    options: [
      "가중치가 바뀌고 정답 확률도 올라갑니다.",
      "각 가중치의 기울기만 계산되고 가중치는 그대로입니다.",
      "손실이 0이 됩니다.",
      "학습률이 절반으로 줄어듭니다.",
    ],
    correct: 1,
    hint: "실험 6에서 ① 버튼만 눌렀을 때 무엇이 바뀌는지 보십시오.",
    why: "역전파는 기울기를 구하는 계산입니다. 가중치를 바꾸는 것은 경사하강법(최적화기)의 갱신 단계입니다.",
    source: "논문 밖, PyTorch 문서",
  },
  {
    q: "BLEU 34.81은 무엇을 뜻합니까?",
    options: [
      "시험 문장의 34.81%를 정확히 번역했다.",
      "모델이 정답 번역에 평균 34.81% 확률을 줬다.",
      "생성한 번역이 참조 번역과 단어 묶음을 얼마나 공유하는지로 매긴 점수다.",
      "번역 한 문장을 만드는 데 걸린 시간이다.",
    ],
    correct: 2,
    hint: "BLEU 절에서 모델 확률과 BLEU의 관계를 보십시오.",
    why: "BLEU는 생성 번역과 참조 번역의 n-gram 일치로 매깁니다. 모델 확률을 BLEU로 바꾸는 계산은 없습니다.",
    source: "Papineni 외, 2002, §2",
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
      summary="읽는 LSTM(인코더)이 문장 전체를 고정 길이 벡터 하나로 요약하고, 쓰는 LSTM(디코더)이 그 벡터에서 번역을 한 단어씩 만듭니다. 문장 확률은 단어 확률의 곱이고, 학습은 정답 번역의 로그 확률을 키우도록 가중치를 고치며, 추론은 고정된 가중치로 빔 탐색을 해 번역을 고릅니다. 저자들은 입력 문장만 뒤집는 요령과 빔 탐색으로 영어→프랑스어 번역 BLEU 34.81을 얻어 기존 통계 번역기(33.30)를 넘었습니다. 문장 전체를 고정 길이 벡터 하나에 담는 구조는 다음 논문(Bahdanau 어텐션)이 문제로 짚습니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "핵심 구조", id: "idea" },
          { label: "실험 1: 고정 길이 기억", id: "encode" },
          { label: "실험 2: 입력 뒤집기", id: "reverse" },
          { label: "실험 3: 문장 확률", id: "prob" },
          { label: "학습, 추론, 평가", id: "phases" },
          { label: "실험 4: Teacher Forcing", id: "teacher" },
          { label: "실험 5: LSTM 한 칸", id: "lstm" },
          { label: "실험 6: 기울기와 갱신", id: "gradient" },
          { label: "실험 7: 단어를 고르는 방법", id: "decode" },
          { label: "실험 8: 빔 탐색", id: "beam" },
          { label: "BLEU 읽는 법", id: "bleu" },
          { label: "실험 9: 논문 결과", id: "results" },
          { label: "고정 길이 벡터와 다음 글", id: "next" },
          { label: "헷갈리기 쉬운 것", id: "confusions" },
          { label: "논문 근거 위치", id: "evidence" },
          { label: "주의: 결과를 읽는 법", id: "caution" },
          { label: "확인 질문과 답", id: "quiz" },
          { label: "부록: 질문 정리 원본", id: "appendix" },
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
        <Text>
          저자들은 번역만이 아니라 일반적인 시퀀스 학습 방법을 목표로 했습니다 (p.1, 초록). 영어→프랑스어 번역은 그 방법을 시험한
          과제입니다. 저자들은 토큰화된 학습·시험 세트와 기존 번역기의 후보 1,000개 목록이 공개되어 있어서 이 과제를 골랐다고
          적었습니다 (p.4, §3.1).
        </Text>
        <Table
          columns={["작업", "입력 시퀀스", "출력 시퀀스"]}
          rows={[
            ["번역", "출발어 문장", "도착어 문장"],
            ["요약", "긴 문서", "짧은 요약"],
            ["질의응답", "질문과 관련 문맥", "답변"],
            ["코드 생성", "요구사항", "코드"],
          ]}
        />
        <Text>
          위 표는 여러 작업을 "시퀀스 입력 → 시퀀스 출력"으로 쓸 수 있다는 예입니다(논문 밖). 이 형식으로 쓸 수 있다고 그 문제를
          잘 푼다는 뜻은 아닙니다. 데이터, 학습 목표, 검증 방법이 따로 필요합니다.
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

      <Section heading="실험 3: 문장 확률" id="prob" caption="확률은 예시 값입니다">
        <Text>
          디코더는 문장 전체를 한 번에 내지 않습니다. 단계마다 다음 단어의 확률을 냅니다. 논문의 식 (1)은 이것을 다음처럼 씁니다 (p.3,
          §2).
        </Text>
        <Eq>{"p(y_1,\\ldots,y_{T'} \\mid x_1,\\ldots,x_T) = \\prod_{t=1}^{T'} p(y_t \\mid v, y_1,\\ldots,y_{t-1})"}</Eq>
        <Table
          columns={["기호", "뜻"]}
          rows={[
            ["x1, …, xT", "순서가 있는 입력 단어들. 쉼표는 곱셈이 아닙니다"],
            ["y1, …, yT'", "순서가 있는 출력 단어들"],
            ["T, T'", "입력 길이와 출력 길이. 서로 달라도 됩니다"],
            ["v", "인코더가 입력에서 계산한 고정 길이 벡터"],
            ["p(A | B)", "B가 주어졌을 때 A의 확률 (조건부 확률)"],
            ["∏", "범위 안의 값을 모두 곱하라는 기호"],
          ]}
        />
        <Text>
          좌변은 출력 문장 전체의 조건부 확률입니다. 우변의 각 항은 한 단계에서 그 단어가 받은 확률입니다. 우변을 모두 곱하면 다시 문장
          전체의 확률이 됩니다.
        </Text>
        <Text>
          곱하는 근거는 확률의 연쇄법칙(chain rule, 조건부 확률의 정의를 되풀이해 쓰는 규칙)입니다. 단어들이 서로 독립이라서 곱하는 것이
          아닙니다. 앞 단어를 조건에 넣으므로, 앞 단어가 바뀌면 다음 단어의 확률도 바뀔 수 있습니다.
        </Text>
        <Text>
          각 단계의 확률은 어휘 전체에 대한 소프트맥스(softmax, 점수를 합이 1인 확률로 바꾸는 함수)로 만듭니다 (p.3, §2). 실제 모델의
          출력 어휘는 80,000개입니다 (p.4, §3.1). 점수를 z, 출력 어휘를 V라고 하면 다음과 같습니다.
        </Text>
        <Eq>{"p(y_t = k \\mid v, y_{<t}) = \\frac{\\exp(z_{t,k})}{\\sum_{j \\in \\mathcal{V}} \\exp(z_{t,j})}"}</Eq>
        <Text>
          분모는 다음 단어 후보 전체의 지수 점수 합입니다. 입력 문장이 나올 확률 P(X)로 나누는 것이 아닙니다. 조건부 모델은 P(X)를
          배우지 않고도 "입력이 주어졌을 때의 출력 분포"를 바로 정의합니다. 저자들은 모든 문장 끝에 {"<EOS>"}를 붙여, 길이가 다른
          문장 모두에 확률을 줄 수 있게 했습니다 (p.3, §2).
        </Text>
        <ProbLab />
        <Text>
          처음 값에서 0.8 × 0.6 × 0.5 × 0.9 = 0.216입니다. 이 값은 "이 문장을 만들고 바로 끝낼 확률"입니다. "번역이 맞을 확률
          21.6%"가 아닙니다. {"<EOS>"}를 빼고 곱한 0.24는 "나는 너를 사랑해"로 시작하는 모든 문장의 확률(접두사 확률)입니다.
        </Text>
        <Callout lead="v에 대한 두 가지 질문" tone="warning">
          모델 안에서는 디코더가 입력을 보는 통로가 v 하나뿐이므로, 식 (1)은 정의로 성립합니다. 실제 언어에서 v가 번역에 필요한 정보를
          다 담았는지는 다른 문제입니다. "어제 갔다"와 "내일 간다"가 같은 v로 뭉개지면 디코더는 시제를 구별할 수 없습니다. 이 문제는
          아래 "고정 길이 벡터와 다음 글" 절로 이어집니다.
        </Callout>
      </Section>

      <Section heading="학습, 추론, 평가" id="phases">
        <Text>이 세 가지는 서로 다른 일입니다. 아래 개념들이 어느 쪽에 속하는지 먼저 나눠 둡니다.</Text>
        <Table
          columns={["구분", "알고 있는 것", "하는 일", "바뀌는 것"]}
          rows={[
            ["학습", "입력과 정답 번역", "정답에 높은 확률을 주도록 모델을 고침", "가중치"],
            ["추론", "입력과 학습된 모델", "번역문을 만들고 후보를 찾음", "출력 단어, h와 c, 후보 목록"],
            ["평가", "생성한 번역과 참조 번역", "번역 품질을 잴", "점수(BLEU)"],
          ]}
        />
        <Text>
          학습 목표는 학습 데이터 S에서 정답 번역 T의 로그 확률 평균을 키우는 것입니다. 번역할 때는 확률이 가장 높은 번역 T를
          찾습니다. 논문은 두 식을 이렇게 적습니다 (p.4, §3.2, 식 (2)).
        </Text>
        <Eq>{"\\frac{1}{|\\mathcal{S}|} \\sum_{(T,S) \\in \\mathcal{S}} \\log p(T \\mid S), \\qquad \\hat{T} = \\arg\\max_{T}\\, p(T \\mid S)"}</Eq>
        <Text>
          로그를 쓰면 단어 확률의 곱이 합으로 바뀝니다. 작은 확률을 여러 번 곱해 생기는 아주 작은 수를 피할 수 있습니다. 로그는 커지는
          함수라서 후보의 순위도 그대로입니다. 부호를 바꾸면 줄여야 할 손실이 됩니다. 이 손실을 음의 로그우도(NLL, negative
          log-likelihood)라고 합니다.
        </Text>
        <Eq>{"\\mathcal{L} = -\\sum_{t=1}^{T'} \\log p(y_t^{*} \\mid v, y_{<t}^{*})"}</Eq>
        <Text>
          별표(*)는 정답 단어라는 표시입니다. 실험 3의 예시 문장이면 손실은 −ln 0.216 ≈ 1.5325입니다. 구현에 따라 손실을 합이 아니라
          평균으로 쓰기도 하므로, 손실 숫자를 비교할 때는 기준을 확인해야 합니다. 이 목표는 BLEU를 직접 키우는 것과 다릅니다.
        </Text>
      </Section>

      <Section heading="실험 4: Teacher Forcing" id="teacher" caption="단어와 확률은 예시 값입니다">
        <Text>
          학습 때 디코더의 각 단계에는 정답 번역의 앞 단어를 넣습니다. 이 방식을 Teacher Forcing(교사 강요)이라고 합니다. 이
          이름은 논문에 나오지 않습니다(원문 검색 0건). 식 (1)의 조건 y1, …, y(t−1)에 정답 단어를 넣는 일반적인 학습 방식을
          부르는 이름입니다.
        </Text>
        <Text>
          인코더에는 출발어 문장을 넣습니다. 정답 번역은 디코더 학습에서 두 가지로 쓰입니다. 앞 단어는 다음 단계의 입력이
          되고, 이번 단어는 손실을 구하는 정답 라벨이 됩니다. 두 줄이 한 칸씩 어긋납니다.
        </Text>
        <Table
          columns={["단계", "디코더에 넣는 단어", "이번에 맞힐 정답"]}
          rows={[
            ["1", "<BOS>", "나는"],
            ["2", "나는", "너를"],
            ["3", "너를", "사랑해"],
            ["4", "사랑해", "<EOS>"],
          ]}
        />
        <Text>
          2단계에 넣는 단어는 "너를"이 아니라 그 앞의 "나는"입니다. "너를"은 확률을 계산한 뒤 손실을 매길 때만 씁니다. 그래서
          답을 미리 보고 맞히는 것이 아닙니다. LSTM 디코더는 앞 단어 하나만 보지도 않습니다. 이전 상태 h와 c에 그동안의 문맥이
          담겨 있습니다.
        </Text>
        <Callout lead="시작 기호" tone="warning">
          이 글은 시작 기호를 {"<BOS>"}로 적습니다. 논문 그림 1에는 {"<BOS>"}가 없고, 입력 끝의 {"<EOS>"}를 읽은 바로 다음부터
          출력을 냅니다 (p.2, 그림 1). 시작 기호의 이름과 처리는 구현마다 다릅니다.
        </Callout>
        <TeacherLab />
        <Text>
          학습에서는 모델이 1단계에서 "그는"에 더 높은 확률을 줘도 2단계 입력은 정답 "나는"입니다. 추론에서는 모델이 고른
          "그는"이 다음 입력이 되고, 그 뒤 문장도 달라집니다. 학습 때는 정답 문맥만 보고 추론 때는 자기 출력을 본다는 이 차이는
          노출 편향(exposure bias) 논의로 이어집니다. Bengio 외(2015)가 이 문제를 다뤘습니다(논문 밖).
        </Text>
        <Text>
          표준 최대우도 학습에서는 단어를 실제로 고를 필요가 없습니다. 정답 앞 단어를 넣고, 나온 분포에서 정답 단어의 확률만 읽으면
          됩니다. PyTorch 공식 튜토리얼에 구현 예가 있습니다. 다만 그 튜토리얼은 LSTM이 아니라 GRU를 씁니다.
        </Text>
      </Section>

      <Section heading="실험 5: LSTM 한 칸" id="lstm" caption="게이트 값은 예시 값입니다">
        <Text>
          인코더와 디코더의 상자 안은 LSTM입니다. LSTM은 단계마다 두 상태를 고칩니다. 은닉 상태 h(hidden state)는 다음 계산과
          출력층에 넘기는 값입니다. 셀 상태 c(cell state)는 정보를 유지하고 고치는 내부 기억입니다. 둘 다 숫자 벡터입니다.
        </Text>
        <Table
          columns={["종류", "예", "언제 바뀌는가"]}
          rows={[
            ["학습하는 가중치", "W, U, b, 단어 벡터", "학습의 갱신 단계에서만"],
            ["계산 중의 상태", "h, c", "학습과 추론 모두, 단어를 하나 처리할 때마다"],
          ]}
        />
        <Text>
          한 단계의 입력은 현재 단어 벡터 e, 이전 h, 이전 c입니다. 인코더의 e는 입력 단어의 벡터이고, 디코더의 e는 앞 출력 단어의
          벡터입니다. 저자들은 두 쪽에 가중치가 다른 LSTM을 따로 두었습니다 (p.3, §2). 게이트 네 개는 다음과 같이 계산합니다.
        </Text>
        <Eq>{"\\begin{aligned} f_t &= \\sigma(W_f e_t + U_f h_{t-1} + b_f) \\\\ i_t &= \\sigma(W_i e_t + U_i h_{t-1} + b_i) \\\\ g_t &= \\tanh(W_g e_t + U_g h_{t-1} + b_g) \\\\ o_t &= \\sigma(W_o e_t + U_o h_{t-1} + b_o) \\end{aligned}"}</Eq>
        <Table
          columns={["기호", "역할"]}
          rows={[
            ["f (망각 게이트)", "이전 c를 얼마나 유지할지"],
            ["i (입력 게이트)", "새 정보 후보를 얼마나 더할지"],
            ["g", "새로 적을 정보 후보 (−1~1)"],
            ["o (출력 게이트)", "고친 c에서 얼마나 밖으로 낼지"],
            ["σ (시그모이드)", "값을 0과 1 사이로 바꾸는 함수"],
          ]}
        />
        <Eq>{"c_t = f_t \\odot c_{t-1} + i_t \\odot g_t, \\qquad h_t = o_t \\odot \\tanh(c_t)"}</Eq>
        <Text>
          ⊙는 같은 위치의 원소끼리 곱하는 연산입니다. 앞 식은 "유지한 옛 정보 + 더한 새 정보", 뒤 식은 "새 c에서 밖으로 낼 정보"입니다.
        </Text>
        <Callout lead="저자들이 쓴 LSTM과의 차이" tone="warning">
          위 식은 PyTorch 문서의 표준 LSTM입니다. 저자들은 Graves(2013)의 LSTM 식을 썼다고 적었습니다 (p.3, §2). Graves의
          식에는 셀 상태 c를 게이트 계산에 직접 넣는 연결(peephole)이 더 있습니다. 그래서 위 식은 논문 모델과 세부가 조금
          다릅니다. 게이트가 c를 지키고 고치는 원리는 같습니다.
        </Callout>
        <LstmLab />
        <Text>
          처음 값에서 c = 0.9 × 0.8 + 0.2 × 0.5 = 0.82이고, h = 0.7 × tanh(0.82) ≈ 0.4725입니다. 실제 LSTM에서는 이 계산이
          벡터의 모든 칸에서 동시에 일어납니다.
        </Text>
        <Text>
          인코더의 마지막 상태가 디코더의 처음 상태가 됩니다 (p.3, §2). 실제 모델은 4층이고 층마다 h와 c가 1,000개씩이라, 4 ×
          (1,000 + 1,000) = 8,000개입니다. 논문도 이 수를 "8000 real numbers"라고 적었습니다 (p.5, §3.4). v는 디코더의 처음 상태에
          한 번 들어가 뒤 계산으로 이어질 뿐이고, 단계마다 다시 넣지는 않습니다.
        </Text>
      </Section>

      <Section heading="실험 6: 기울기와 갱신" id="gradient" caption="가중치 하나짜리 예시 모델입니다">
        <Table
          columns={["단계", "하는 일", "가중치 변경"]}
          rows={[
            ["순전파", "인코더와 디코더로 확률 계산", "없음"],
            ["손실 계산", "정답 확률로 NLL 계산", "없음"],
            ["역전파", "각 가중치에 대한 손실의 기울기 계산", "없음"],
            ["경사하강법", "기울기로 가중치 수정", "있음"],
          ]}
        />
        <Text>
          역전파(backpropagation)는 손실에서 출발해 연쇄법칙으로 각 가중치의 기울기를 구하는 계산입니다. 가중치를 바꾸는 것은 그
          다음의 경사하강법(gradient descent)입니다. PyTorch 코드에서도 loss.backward()와 optimizer.step()은 따로 있습니다.
          학습률 η는 한 번에 움직이는 폭입니다.
        </Text>
        <Eq>{"\\theta_{\\text{new}} = \\theta_{\\text{old}} - \\eta \\, \\nabla_\\theta \\mathcal{L}"}</Eq>
        <Text>
          저자들은 모멘텀 없는 SGD(확률적 경사하강법, 문장 묶음 하나로 기울기를 구해 갱신하는 방법)를 썼습니다. 학습률은 0.7로
          시작해 5에폭 뒤부터 반 에폭마다 절반으로 줄였고, 모두 7.5에폭을 학습했습니다. 한 번에 문장 128개로 기울기를 구했고, 기울기
          크기가 5를 넘으면 5로 줄였습니다 (p.5, §3.4).
        </Text>
        <GradientLab />
        <Text>
          처음 값 w = 0, η = 0.1에서 기울기는 −0.5입니다. 한 번 갱신하면 w = 0.05가 되고, 정답 확률은 0.5000에서 0.5125로, 손실은
          0.6931에서 0.6685로 바뀝니다. 학습률이 너무 크거나 다른 문장과 방향이 충돌하면, 실제 모델에서는 한 번의 갱신이 모든 문장의 확률을
          올리지는 않습니다.
        </Text>
        <Text>
          Seq2Seq에서는 각 출력 단계의 손실이 출력층, 디코더, 디코더의 처음 상태, 인코더 순서로 거슬러 갑니다. 시간 순서로 펼친 순환
          신경망을 이렇게 미분하는 방법을 시간을 통한 역전파(BPTT)라고 합니다. 같은 LSTM 가중치를 여러 단계에서 다시 쓰므로, 그
          가중치의 기울기에는 모든 단계의 몫이 더해집니다.
        </Text>
        <Text>
          셀 상태의 직접 경로만 보면, 한 단계 거슬러 갈 때마다 기울기에 f가 곱해집니다. f가 1에 가까우면 이 경로로 기울기가 멀리
          갑니다. 다른 경로도 있으므로 전체 기울기가 f 하나로 정해지지는 않습니다. 저자들도 LSTM은 기울기 소실은 덜하지만 기울기
          폭발은 생길 수 있어서 위의 크기 제한을 두었다고 적었습니다 (p.5, §3.4).
        </Text>
        <Text>학습 한 번의 흐름을 순서대로 적으면 다음과 같습니다.</Text>
        <Steps
          steps={[
            { title: "인코더가 입력 문장을 읽습니다", detail: "저자들은 입력 단어 순서를 뒤집어 읽게 했습니다 (p.4, §3.3)." },
            { title: "마지막 상태로 디코더를 시작합니다", detail: "정답 단어를 인코더 입력에 섞지 않습니다." },
            { title: "디코더에 앞 정답 단어를 넣습니다", detail: "단계마다 다음 단어 분포를 소프트맥스로 냅니다." },
            { title: "정답 단어의 확률로 손실을 구해 모두 더합니다", detail: "마지막 <EOS> 하나가 아니라 모든 단계의 손실입니다." },
            { title: "역전파로 기울기를 구합니다", detail: "출력층, 디코더, 인코더 순서로 거슬러 갑니다." },
            { title: "SGD로 가중치를 고칩니다", detail: "인코더, 디코더, 단어 벡터, 출력층의 가중치가 모두 바뀝니다." },
          ]}
        />
      </Section>

      <Section heading="실험 7: 단어를 고르는 방법" id="decode" caption="확률은 예시 값입니다">
        <Text>
          추론에서는 정답이 없고 가중치도 바꾸지 않습니다. 그래도 h와 c는 단어마다 바뀝니다. 신경망 계산은 학습과 같고, 달라지는
          것은 세 가지입니다. 디코더 입력이 모델이 고른 단어이고, 단어를 고르는 절차가 있으며, 손실·역전파·갱신이 없습니다.
        </Text>
        <Text>모델은 분포를 계산하고, 디코딩 방법은 그 분포로 출력을 고릅니다. 대표적인 방법은 세 가지입니다.</Text>
        <Table
          columns={["방법", "고르는 방식", "보장하지 않는 것"]}
          rows={[
            ["탐욕적 선택(greedy)", "지금 단계에서 확률이 가장 큰 단어 하나", "문장 전체 확률의 최댓값"],
            ["샘플링(sampling)", "확률에 따라 무작위로 뽑음", "정확성과 다양성"],
            ["빔 탐색(beam search)", "누적 점수가 높은 부분 문장 여러 개를 유지", "전체 최적 문장, 최고의 실제 번역"],
          ]}
        />
        <Text>
          후보 "너를", "당신을", "그를"의 확률이 0.6, 0.3, 0.1이라고 하겠습니다. 0과 1 사이에서 난수 u를 골고루 뽑아, u가 0.6 미만이면
          "너를", 0.6 이상 0.9 미만이면 "당신을", 그 위면 "그를"을 고릅니다. 이것이 샘플링입니다.
        </Text>
        <SamplingLab />
        <Text>
          100번 뽑아도 정확히 60·30·10번이 나오지는 않습니다. 그 숫자는 기대 횟수입니다. 엔트로피(확률이 퍼진 정도)가 높으면
          "좋은 대안이 많다"일 수도, "모델이 잘 모른다"일 수도 있습니다. 엔트로피만으로 샘플링이 맞는지 정할 수는 없습니다.
        </Text>
        <Text>
          창작처럼 답이 여럿이거나, 여러 코드 후보를 만든 뒤 테스트로 걸러낼 수 있을 때는 샘플링이 쓸모 있습니다. 원문 뜻을
          안정적으로 지켜야 하는 번역에서는 무작위성을 늘리기 어렵습니다. 저자들은 빔 탐색을 썼고 (p.4, §3.2), 샘플링과 비교한 결과는
          논문에 없습니다. 확률을 최대로 하는 것과 좋은 글을 만드는 것이 어긋날 수 있다는 점은 Holtzman 외(2020)가 다뤘습니다(논문
          밖).
        </Text>
      </Section>

      <Section heading="실험 8: 빔 탐색" id="beam" caption="문장과 확률은 예시 값입니다">
        <Text>
          번역할 때는 확률이 가장 높은 문장을 찾아야 합니다. 모든 문장을 다 볼 수는 없으므로, 매 단계 상위 B개 후보만 남깁니다 (p.4,
          §3.2). B를 빔 폭(beam size)이라고 합니다. 폭 1은 매번 1등만 따라가는 탐욕적 선택(greedy)입니다.
        </Text>
        <BeamLab />
        <Text>
          폭 1에서는 첫 단어 1등 "저는"만 남아서 "나는 갑니다"(27%)를 끝내 못 봅니다. 폭 2부터는 이 문장이 1등이 됩니다. 논문은 폭 1로도
          잘 되고, 폭 2가 빔 탐색 이득의 대부분을 준다고 보고합니다 (p.4, §3.2, 표 1).
        </Text>
        <Text>
          빔 폭 B는 후보마다 B개씩 남긴다는 뜻이 아닙니다. 단어를 붙여 늘어난 후보 전체에서 상위 B개를 남깁니다 (p.4, §3.2). 빔 탐색은
          근사 탐색이라서, 폭을 키워도 확률이 가장 높은 문장을 찾는다는 보장은 없습니다. 각 후보는 자기 단어 이력, 누적 점수, 디코더
          상태를 따로 들고 있습니다.
        </Text>
        <Text>
          폭을 키우면 단계마다 계산할 후보가 늘어 계산량과 메모리가 느는 것이 보통입니다. 이 논문의 4층 LSTM이면 후보마다 h와 c 상태
          8,000개를 들고 있어야 합니다. 모델 가중치를 후보마다 복사하지는 않습니다. 폭 2에서 12로 늘리면 후보 수는 6배가 되지만, GPU 병렬
          처리와 구현 방식에 따라 실행 시간은 6배가 아닐 수 있습니다 (추정). 저자들은 "모델 5개 앙상블 + 빔 2"가 "모델 1개 + 빔
          12"보다 계산이 싸다고 적었습니다 (p.6, 표 1 설명).
        </Text>
      </Section>

      <Section heading="BLEU 읽는 법" id="bleu">
        <Text>
          BLEU는 생성한 번역과 참조 번역(사람이 쓴 정답 번역)을 비교하는 점수입니다. 모델의 확률을 BLEU로 바꾸는 계산은 없습니다.
          참조 번역은 비교 대상일 뿐이고, 같은 뜻의 좋은 번역은 여러 개일 수 있습니다.
        </Text>
        <Text>
          BLEU는 연속한 단어 묶음(n-gram)이 참조 번역과 몇 개 겹치는지 솅니다. 같은 묶음을 반복해 점수를 부풀리지 못하게 겹친 횟수에
          상한을 둡니다. 이렇게 구한 수정 정밀도들의 기하평균에, 너무 짧은 번역에 주는 벌점(BP, brevity penalty)을 곱합니다 (Papineni
          외, 2002, §2.1~2.3).
        </Text>
        <Eq>{"\\mathrm{BLEU} = \\mathrm{BP} \\cdot \\exp\\Big(\\sum_{k=1}^{N} w_k \\log r_k\\Big)"}</Eq>
        <Text>
          r_k는 k개 단어 묶음의 수정 정밀도이고, 신경망의 다음 단어 확률과 다른 값입니다. w_k는 합이 1인 가중치입니다. BLEU 논문의 기본
          설정은 N = 4, 같은 가중치입니다 (Papineni 외, §2.3).
        </Text>
        <Text>
          BLEU 34.81은 "문장 34.81%가 맞았다"나 "정답에 34.81% 확률을 줬다"는 뜻이 아닙니다. 뜻이 맞아도 표현이 참조 번역과 다르면
          점수가 낮을 수 있습니다. 토큰화와 대소문자 처리에 따라서도 점수가 바뀝니다. 저자들은 대소문자를 구분하는 BLEU를 토큰화한
          번역과 정답에 multi-bleu.pl로 계산했습니다 (p.5, §3.6).
        </Text>
      </Section>

      <Section heading="실험 9: 논문 결과" id="results" caption="BLEU는 논문 값입니다 (p.6, 표 1·2)">
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
        <Table
          columns={["빔 폭", "BLEU", "앞 행과의 차이"]}
          rows={[
            ["1", "33.00", "없음"],
            ["2", "34.50", "+1.50"],
            ["12", "34.81", "+0.31"],
          ]}
        />
        <Text>
          위 세 행은 모두 역순 LSTM 5개 앙상블입니다 (p.6, 표 1). 빔 1에서 2로 바꾼 차이가 2에서 12로 바꾼 차이보다 큽니다. 이 표만으로
          실행 시간 배율을 구하거나 모든 모델에서 빔 12가 가장 좋다고 말할 수는 없습니다. 앙상블의 모델 5개와 빔의 후보 B개는 서로 다른
          설정입니다.
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
          더 뒤의 연구도 있습니다(논문 밖). Transformer(Vaswani 외, 2017)는 순환 계산 없이 어텐션을 중심으로 문장을 처리했고,
          T5(Raffel 외, 2020)는 여러 언어 과제를 "텍스트 입력 → 텍스트 출력" 형식 하나로 묶었습니다. 이 흐름을 한 줄의 발명 순서로 읽으면
          안 됩니다. Bahdanau 논문과 이 논문은 같은 2014년에 나왔습니다.
        </Text>
        <Text>
          다음 글 <a href={NEXT_POST}>Bahdanau 어텐션 쉽게 보기</a>에서는 고정 길이 벡터 하나 대신 원문 위치마다 표현을 남겨 두고, 번역
          단어마다 참고할 곳을 새로 고르는 방법을 실험으로 봅니다. 이 글의 실험 1(고정 길이 기억)과 그 글의 실험 3(저장하는 표현의
          개수)을 나란히 보면 차이가 잘 보입니다.
        </Text>
      </Section>

      <Section heading="헷갈리기 쉬운 것" id="confusions">
        <Table
          columns={["헷갈리기 쉬운 이해", "바른 이해"]}
          rows={[
            ["입력 단어들을 곱하면 v가 된다", "인코더가 입력을 차례로 읽어 v를 계산합니다"],
            ["v가 정보를 다 못 담으면 식 (1)의 등호가 틀린다", "식 (1)은 모델의 정의입니다. 실제 언어를 잘 담는지는 따로 따져야 합니다"],
            ["문장 확률은 번역이 맞을 확률이다", "모델이 그 단어 열에 준 확률입니다"],
            ["우변은 단어 하나의 확률이다", "각 항은 단어 하나의 확률이고, 곱 전체는 문장 확률입니다"],
            ["정답을 다음 입력으로 넣는 곳은 인코더다", "Teacher Forcing은 디코더에 앞 정답 단어를 넣습니다"],
            ["학습 때도 매번 단어를 골라야 한다", "정답 단어의 확률만 읽어 손실을 구하면 됩니다"],
            ["역전파가 가중치를 바꾼다", "역전파는 기울기를 구하고, 최적화기가 가중치를 바꿉니다"],
            ["추론 때는 모델 안의 모든 숫자가 고정된다", "가중치는 고정이지만 h, c와 후보 목록은 계속 바뀝니다"],
            ["지금 1등 단어를 고르면 문장 전체도 1등이다", "단계별 1등과 문장 전체 1등은 다를 수 있습니다 (실험 8)"],
            ["빔을 늘리면 번역은 항상 좋아지고 시간은 정확히 비례한다", "품질, 실행 시간, 메모리를 실제 조건에서 재야 합니다"],
            ["문장 확률에서 BLEU를 계산한다", "BLEU는 생성 번역과 참조 번역의 일치로 계산합니다"],
          ]}
        />
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["입력을 읽고 출력을 만들며 <EOS>에서 멈추는 흐름", "p.2, 그림 1"],
            ["인코더의 마지막 상태로 디코더를 시작", "p.3, §2"],
            ["식 (1) 문장 확률의 단어별 분해, 어휘 전체 소프트맥스, <EOS>", "p.3, §2"],
            ["Graves(2013)의 LSTM 식을 씁", "p.3, §2"],
            ["학습 목표(로그 확률 평균)와 식 (2) 디코딩 목표", "p.4, §3.2"],
            ["실제 모델의 세 가지 차이 (LSTM 2개, 4층, 입력 뒤집기)", "p.3, §2"],
            ["학습 데이터 1,200만 문장 쌍, 어휘 160,000 / 80,000", "p.4, §3.1"],
            ["빔 탐색, 폭 2가 이득의 대부분, 재순위 방법", "p.4, §3.2"],
            ["입력 뒤집기: 퍼플렉시티 5.8 → 4.7, BLEU 25.9 → 30.6", "p.4, §3.3"],
            ["4층, 1,000칸, 문장 표현 실수 8,000개, 파라미터 3억 8,400만", "p.5, §3.4"],
            ["모멘텀 없는 SGD, 학습률 0.7과 줄이는 일정, 배치 128, 기울기 크기 5 제한", "p.5, §3.4"],
            ["대소문자 구분 BLEU, 최고 WMT'14 결과 37.0", "p.5, §3.6"],
            ["직접 번역 결과 (34.81 등)", "p.6, 표 1"],
            ["5개 앙상블 + 빔 2가 단일 모델 + 빔 12보다 싸다", "p.6, 표 1 설명"],
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
          입력 뒤집기가 왜 좋은지는 저자의 해석("we believe")입니다 (p.4, §3.3). 실험 1~8의 숫자, 문장, 확률은 모두 구조를 보이기 위한
          예시이며 실제 LSTM을 학습하거나 실행한 값이 아닙니다.
        </Text>
      </Section>

      <Section heading="확인 질문과 답" id="quiz">
        <Text>보기를 고르면 정답 여부와 해설, 논문 위치가 나옵니다.</Text>
        <Quiz />
      </Section>

      <Section heading="부록: 질문 정리 원본" id="appendix">
        <Text>
          이 글의 실험 3~7과 학습·디코딩·BLEU 절은 한 편의 질문 정리 글을 원문과 대조해 옮긴 것입니다. 그 원본 HTML을 고치지 않고
          그대로 올렸습니다. 원본에는 17개 절과 위젯 6개, 이 글에서 줄인 계산 예시가 모두 들어 있습니다.
        </Text>
        <Text>
          <a href={APPENDIX}>Seq2Seq를 이해하는 질문들 (원본 HTML)</a>
        </Text>
        <Callout lead="원본과 이 글이 다른 곳" tone="warning">
          원본은 고치지 않았으므로 아래 네 곳은 이 글을 기준으로 읽으십시오. (1) LSTM 식: 저자들은 peephole 연결이 있는 Graves(2013)의 식을
          썼습니다 (p.3, §2). (2) 시작 기호: 논문 그림 1에는 {"<BOS>"}가 없고 입력 끝 {"<EOS>"}가 그 역할을 합니다 (p.2). (3) 학습률:
          0.7에서 시작해 5에폭 뒤부터 반 에폭마다 절반으로 줄였습니다 (p.5, §3.4). (4) 원본 14절의 "원논문의 기본 설정 N = 4"는
          Seq2Seq 논문이 아니라 BLEU 논문(Papineni 외, §2.3)의 설정입니다.
        </Callout>
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Ilya Sutskever, Oriol Vinyals, Quoc V. Le. "Sequence to Sequence Learning with Neural Networks". 2014 (NIPS 2014).{" "}
          <a href="https://arxiv.org/abs/1409.3215">arxiv.org/abs/1409.3215</a> (arXiv v3, 2014-12-14). 쪽수는 이 PDF 기준입니다.
        </Text>
        <Text>
          함께 확인한 자료(논문 밖 내용의 근거):
        </Text>
        <Table
          columns={["자료", "이 글에서 쓴 곳"]}
          rows={[
            [
              <a key="bleu" href="https://aclanthology.org/P02-1040/">Papineni 외. BLEU. ACL 2002, §2.1~2.3</a>,
              "BLEU 읽는 법",
            ],
            [
              <a key="tut" href="https://docs.pytorch.org/tutorials/intermediate/seq2seq_translation_tutorial.html">PyTorch. NLP From Scratch: Translation with a Sequence to Sequence Network and Attention</a>,
              "Teacher Forcing 구현 예 (GRU 기반)",
            ],
            [<a key="lstm" href="https://docs.pytorch.org/docs/2.15/generated/torch.nn.LSTM.html">PyTorch. torch.nn.LSTM</a>, "표준 LSTM 게이트 식"],
            [
              <a key="opt" href="https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html">PyTorch. Optimizing Model Parameters</a>,
              "backward()와 step()의 구분",
            ],
            [<a key="graves" href="https://arxiv.org/abs/1308.0850">Graves. Generating Sequences With Recurrent Neural Networks. 2013</a>, "논문이 따른 LSTM 식"],
            [<a key="ss" href="https://arxiv.org/abs/1506.03099">Bengio 외. Scheduled Sampling. 2015</a>, "노출 편향"],
            [<a key="deg" href="https://arxiv.org/abs/1904.09751">Holtzman 외. The Curious Case of Neural Text Degeneration. ICLR 2020</a>, "확률 최대화와 생성 품질"],
            [<a key="tf" href="https://arxiv.org/abs/1706.03762">Vaswani 외. Attention Is All You Need. 2017</a>, "더 뒤의 연구"],
            [<a key="t5" href="https://jmlr.org/papers/v21/20-074.html">Raffel 외. T5. JMLR 21(140), 2020</a>, "더 뒤의 연구"],
          ]}
        />
        <Text>
          이어 읽기: <a href={NEXT_POST}>Bahdanau 어텐션 쉽게 보기 (Bahdanau·Cho·Bengio, 2014)</a>
        </Text>
      </Section>
    </Page>
  );
}
