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
  useGrokTheme,
  useState,
} from "@/components/canvas";

// 은닉 뉴런 8개가 내보내는 값 (예시). 합은 4.4이고, 다음 층으로 가는 가중치는 모두 1로 둔다 (예시).
const ACTS = [0.8, 0.3, 0.6, 0.9, 0.2, 0.5, 0.7, 0.4];
const TOTAL = ACTS.reduce((a, c) => a + c, 0);

const IN_Y = [70, 130, 190, 250];
const HID_Y = ACTS.map((_, i) => 30 + i * 36);
const OUT_Y = [120, 200];
const IN_X = 110;
const HID_X = 340;
const OUT_X = 570;
const R = 15;
// 은닉 뉴런 하나가 쓰는 연결 수: 입력 4개 + 출력 2개.
const LINKS_PER_HIDDEN = IN_Y.length + OUT_Y.length;

type Mode = "train" | "test";
const MODE_OPTIONS = [
  { value: "train" as const, label: "학습 모드" },
  { value: "test" as const, label: "테스트 모드" },
];

const sum = (a: readonly number[]) => a.reduce((s, x) => s + x, 0);
const fmt = (x: number, d = 2) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: d }).format(Math.abs(x) < 1e-10 ? 0 : x);
const percent = (x: number) => `${fmt(x * 100, 3)}%`;

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  show: string;
  onChange: (v: number) => void;
}

function Slider({ id, label, value, min, max, step, show, onChange }: SliderProps) {
  const theme = useGrokTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        htmlFor={id}
        style={{ ...theme.font.subtext, color: theme.text.secondary, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
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
          if (!Number.isFinite(next)) return;
          const snapped = Math.round(Math.min(max, Math.max(min, next)) / step) * step;
          onChange(Number(snapped.toFixed(4)));
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
        opacity: disabled ? 0.45 : 1,
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
        style={{ width: 17, height: 17, margin: 0, accentColor: theme.text.accent }}
      />
      {label}
    </label>
  );
}

const ALL_ON = ACTS.map(() => true);

function DropoutLab() {
  const theme = useGrokTheme();
  const [p, setP] = useState(0.5);
  const [mode, setMode] = useState<Mode>("train");
  const [alive, setAlive] = useState<boolean[]>(ALL_ON);
  const [steps, setSteps] = useState(0);
  const [sumOut, setSumOut] = useState(0);
  const [last, setLast] = useState<number | null>(null);

  const reset = () => {
    setAlive(ALL_ON);
    setSteps(0);
    setSumOut(0);
    setLast(null);
  };

  const runSteps = (count: number) => {
    let add = 0;
    let mask = alive;
    let got = 0;
    for (let k = 0; k < count; k++) {
      mask = ACTS.map(() => Math.random() < p);
      got = ACTS.reduce((a, v, i) => a + (mask[i] ? v : 0), 0);
      add += got;
    }
    setMode("train");
    setAlive(mask);
    setSteps((s) => s + count);
    setSumOut((s) => s + add);
    setLast(got);
  };

  const test = mode === "test";
  const shown = test ? ALL_ON : alive;
  const kept = alive.filter(Boolean).length;
  const shownKept = shown.filter(Boolean).length;
  const baseW = 3;
  const outW = test ? baseW * p : baseW;

  let now: string;
  if (test) {
    now = `테스트 모드: 뉴런 8개를 모두 켜고, 출력으로 가는 연결선을 p = ${p.toFixed(1)}배로 얇게 했습니다.`;
  } else if (steps === 0) {
    now = `학습 모드: "다음 학습 단계"를 누르면 은닉 뉴런마다 p = ${p.toFixed(1)} 확률로 남깁니다. 평균 ${(p * 8).toFixed(1)}개가 남습니다.`;
  } else {
    now = `학습 ${steps}단계: 이번에는 은닉 뉴런 ${kept}개가 남고 ${8 - kept}개가 꺼졌습니다. 꺼진 뉴런의 연결선도 사라졌습니다.`;
  }

  const caption = { ...theme.font.caption, fill: theme.text.secondary };
  const nodeText = { ...theme.font.caption, fontVariantNumeric: "tabular-nums" as const };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Callout lead="지금 보고 있는 것" tone="info">
        {now}
      </Callout>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode} />
        <ActionButton label="다음 학습 단계" onClick={() => runSteps(1)} />
        <ActionButton label="학습 20번 더" onClick={() => runSteps(20)} />
        <ActionButton label="처음부터" onClick={reset} />
      </div>

      <figure style={{ margin: 0 }}>
        <svg
          viewBox="0 0 680 330"
          role="img"
          aria-labelledby="do-lab-title do-lab-desc"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <title id="do-lab-title">입력 4개, 은닉 8개, 출력 2개인 작은 신경망 (예시)</title>
          <desc id="do-lab-desc">
            학습 모드에서는 은닉 뉴런이 확률 p로 남고, 꺼진 뉴런은 회색 점선으로 바뀌며 연결선이 사라집니다. 테스트
            모드에서는 모든 뉴런이 켜지고 출력 쪽 연결선이 p배로 얇아집니다.
          </desc>

          {HID_Y.map((hy, i) =>
            shown[i] ? (
              <g key={`e${i}`}>
                {IN_Y.map((iy, j) => (
                  <line
                    key={`ei${i}-${j}`}
                    x1={IN_X + R}
                    y1={iy}
                    x2={HID_X - R}
                    y2={hy}
                    stroke={theme.border.default}
                    strokeWidth={1}
                  />
                ))}
                {OUT_Y.map((oy, j) => (
                  <line
                    key={`eo${i}-${j}`}
                    x1={HID_X + R}
                    y1={hy}
                    x2={OUT_X - R}
                    y2={oy}
                    stroke={j === 0 ? theme.dataviz.categorical[0] : theme.border.strong}
                    strokeWidth={outW}
                    strokeOpacity={j === 0 ? 0.9 : 0.5}
                  />
                ))}
              </g>
            ) : null,
          )}

          {IN_Y.map((y, i) => (
            <circle
              key={`in${i}`}
              cx={IN_X}
              cy={y}
              r={R}
              fill={theme.bg.subtle}
              stroke={theme.border.strong}
            />
          ))}

          {HID_Y.map((y, i) => {
            const on = shown[i];
            return (
              <g key={`h${i}`}>
                <circle
                  cx={HID_X}
                  cy={y}
                  r={R}
                  fill={on ? theme.fill.accentSubtle : theme.bg.subtle}
                  stroke={on ? theme.text.accent : theme.border.strong}
                  strokeDasharray={on ? undefined : "3 3"}
                />
                <text
                  x={HID_X}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ ...nodeText, fill: on ? theme.text.accentDeep : theme.text.tertiary }}
                >
                  {ACTS[i].toFixed(1)}
                </text>
              </g>
            );
          })}

          {OUT_Y.map((y, j) => (
            <g key={`o${j}`}>
              <circle
                cx={OUT_X}
                cy={y}
                r={R}
                fill={j === 0 ? theme.fill.successSubtle : theme.bg.subtle}
                stroke={j === 0 ? theme.text.success : theme.border.strong}
              />
              <text x={OUT_X + R + 8} y={y} dominantBaseline="central" style={caption}>
                {`출력 ${j + 1}`}
              </text>
            </g>
          ))}

          <text x={IN_X} y={316} textAnchor="middle" style={caption}>
            입력 4개
          </text>
          <text x={HID_X} y={316} textAnchor="middle" style={caption}>
            은닉 8개
          </text>
          <text x={OUT_X} y={316} textAnchor="middle" style={caption}>
            출력 2개
          </text>
        </svg>
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
          원 안 숫자 = 은닉 뉴런이 내보내는 값 (예시, 합 4.4). 출력 1로 가는 가중치는 모두 1 (예시). 회색 점선 원 = 이번
          단계에 꺼진 뉴런. 출력 쪽 선 굵기 = 가중치 크기.
        </figcaption>
      </figure>

      <Slider
        id="do-p"
        label="p (남길 확률)"
        value={p}
        min={0.1}
        max={1}
        step={0.1}
        show={p.toFixed(1)}
        onChange={(v) => {
          setP(v);
          reset();
        }}
      />

      <Properties
        items={[
          { label: "학습 단계 수", value: String(steps) },
          { label: "지금 남은 은닉 뉴런", value: `${shownKept} / 8` },
          { label: "지금 쓰는 연결", value: `${shownKept * LINKS_PER_HIDDEN} / ${8 * LINKS_PER_HIDDEN}` },
          { label: "여러 번 뽑을 때 남는 뉴런 수의 이론 평균", value: `${fmt(8 * p)}개` },
          { label: "이번 단계에 출력 1이 받은 합 (예시)", value: last === null || test ? "-" : last.toFixed(2) },
          { label: "학습 때 평균, 지금까지 (예시)", value: steps ? (sumOut / steps).toFixed(2) : "-" },
          { label: "테스트 때: 전부 켜고 가중치 × p (예시)", value: (TOTAL * p).toFixed(2) },
        ]}
      />
    </div>
  );
}

function CountLab() {
  const theme = useGrokTheme();
  const [n, setN] = useState(4);
  const [index, setIndex] = useState(10);
  const [hide, setHide] = useState(false);

  const total = 2 ** n;
  const idx = index % total;
  const bits = idx.toString(2).padStart(n, "0").split("").map(Number);
  const on = sum(bits);
  const growth: number[] = [];
  for (let i = Math.max(1, n - 4); i <= n; i++) growth.push(i);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <ActionButton label="다음 조합" onClick={() => setIndex(idx + 1)} />
        <Check id="do-count-hide" label="꺼진 뉴런 숨기기" checked={hide} onChange={setHide} />
      </div>
      <Slider
        id="do-count-n"
        label="드롭아웃 대상 뉴런 수 n"
        value={n}
        min={1}
        max={20}
        step={1}
        show={`${n}개`}
        onChange={(v) => {
          setN(v);
          setIndex((i) => i % 2 ** v);
        }}
      />
      <div>
        <p
          style={{
            margin: 0,
            fontSize: theme.font.heading2.fontSize,
            lineHeight: theme.font.heading2.lineHeight,
            fontWeight: theme.weight.semibold,
            color: theme.text.accentDeep,
            fontVariantNumeric: "tabular-nums",
            overflowWrap: "anywhere",
          }}
        >
          {`2의 ${n}제곱 = ${fmt(total)}가지`}
        </p>
        <p style={{ margin: "4px 0 0", ...theme.font.body2, color: theme.text.secondary }}>
          {`지금 보는 조합 ${fmt(idx + 1)} / ${fmt(total)} · 남은 뉴런 ${on}개`}
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} aria-label="현재 조합의 켜짐과 꺼짐">
        {bits.map((b, i) => (
          <div
            key={i}
            aria-label={`뉴런 ${i + 1}: ${b ? "남음" : "꺼짐"}`}
            style={{ width: 48, textAlign: "center", ...theme.font.caption, color: theme.text.secondary }}
          >
            <span>{`${i + 1}번`}</span>
            <span
              style={{
                display: "grid",
                placeItems: "center",
                height: 34,
                marginTop: 2,
                borderRadius: theme.radius.md,
                border: `1px solid ${b ? theme.text.accent : theme.border.default}`,
                background: b ? theme.fill.accentSubtle : theme.bg.subtle,
                color: b ? theme.text.accentDeep : theme.text.tertiary,
                visibility: !b && hide ? "hidden" : "visible",
              }}
            >
              {b ? "켜짐" : "꺼짐"}
            </span>
          </div>
        ))}
      </div>
      <Bars
        emphasis={growth.length - 1}
        bars={growth.map((i) => ({ label: `n=${i}`, value: 2 ** i, display: `${fmt(2 ** i)}가지` }))}
      />
    </div>
  );
}

const SCALE_VALUES = [2, 4, 6];

interface MethodView {
  title: string;
  current: number;
  mean: number;
  test: number;
  values: number[];
  explain: string;
}

function ScaleBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const theme = useGrokTheme();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "72px minmax(0,1fr) 44px", alignItems: "center", gap: 6, ...theme.font.caption }}>
      <span style={{ color: theme.text.secondary }}>{label}</span>
      <span style={{ height: 10, background: theme.fill.secondary, borderRadius: 4, overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${(value / max) * 100}%`, background: color }} />
      </span>
      <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: theme.text.primary }}>{fmt(value)}</span>
    </div>
  );
}

function ScaleLab() {
  const theme = useGrokTheme();
  const [k, setK] = useState(0.8);
  const [mode, setMode] = useState<Mode>("train");
  const [mask, setMask] = useState<number[]>([1, 0, 1]);

  const draw = (p: number) => setMask(SCALE_VALUES.map(() => (Math.random() < p ? 1 : 0)));
  const isTrain = mode === "train";
  const base = sum(SCALE_VALUES);
  const raw = sum(SCALE_VALUES.map((v, i) => v * mask[i]));
  const max = base / k;

  let pMean = 0;
  let tMean = 0;
  let probTotal = 0;
  const rows: string[][] = [];
  for (let i = 0; i < 2 ** SCALE_VALUES.length; i++) {
    const m = i.toString(2).padStart(SCALE_VALUES.length, "0").split("").map(Number);
    const kept = sum(m);
    const prob = k ** kept * (1 - k) ** (m.length - kept);
    const a = sum(SCALE_VALUES.map((v, j) => v * m[j]));
    pMean += prob * a;
    tMean += (prob * a) / k;
    probTotal += prob;
    rows.push([m.join(" "), percent(prob), fmt(a), fmt(a / k)]);
  }
  rows.push(["확률 합 / 학습 평균", percent(probTotal), fmt(pMean), fmt(tMean)]);

  const methods: MethodView[] = [
    {
      title: "논문 기본 방식",
      current: isTrain ? raw : k * base,
      mean: pMean,
      test: k * base,
      values: SCALE_VALUES.map((v, i) => (isTrain ? v * mask[i] : v * k)),
      explain: isTrain ? "남은 값은 그대로, 꺼진 값은 0." : "모든 뉴런을 쓰고, 나가는 가중치에 남길 확률을 곱합니다.",
    },
    {
      title: "학습 때 1/p로 키우는 방식 (§10, PyTorch 기본)",
      current: isTrain ? raw / k : base,
      mean: tMean,
      test: base,
      values: SCALE_VALUES.map((v, i) => (isTrain ? (v * mask[i]) / k : v)),
      explain: isTrain ? `남은 값을 남길 확률 ${fmt(k)}로 나눕니다.` : "모든 뉴런의 값을 그대로 사용합니다.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Callout lead="p의 이름표 바꾸기 (논문 밖)" tone="info">
        {`논문 p: 남길 확률 ${fmt(k)} ↔ PyTorch p: 끌 확률 ${fmt(1 - k)}`}
      </Callout>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Segmented
          options={[
            { value: "train" as const, label: "학습" },
            { value: "test" as const, label: "테스트" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <ActionButton label="새 마스크" onClick={() => draw(k)} disabled={!isTrain} />
        <ActionButton
          label="처음으로"
          onClick={() => {
            setK(0.8);
            setMode("train");
            draw(0.8);
          }}
        />
      </div>
      <Slider
        id="do-scale-p"
        label="남길 확률 p"
        value={k}
        min={0.1}
        max={1}
        step={0.05}
        show={percent(k)}
        onChange={(v) => {
          setK(v);
          draw(v);
        }}
      />
      <Text>
        {`예시 값: 고정 활성값 ${SCALE_VALUES.join(", ")} · 모든 가중치 1 · 편향 0 · 끄기 전 합 ${fmt(base)}. 두 방식에 같은 마스크를 씁니다.`}
      </Text>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {methods.map((m, mi) => {
          const color = mi === 0 ? theme.dataviz.categorical[0] : theme.dataviz.categorical[1];
          return (
            <div
              key={m.title}
              style={{
                border: `1px solid ${theme.border.default}`,
                borderRadius: theme.radius.lg,
                padding: 14,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <p style={{ margin: 0, ...theme.font.subtext, fontWeight: theme.weight.semibold, color: theme.text.primary }}>{m.title}</p>
              <p style={{ margin: 0, ...theme.font.caption, color: theme.text.secondary }}>{`현재 ${isTrain ? "학습" : "테스트"} 모드의 입력 합`}</p>
              <p
                style={{
                  margin: 0,
                  fontSize: theme.font.heading2.fontSize,
                  lineHeight: theme.font.heading2.lineHeight,
                  fontWeight: theme.weight.semibold,
                  color: theme.text.accentDeep,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmt(m.current)}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {m.values.map((v, i) => {
                  const off = isTrain && !mask[i];
                  return (
                    <span
                      key={i}
                      aria-label={`${i + 1}번 기여값 ${fmt(v)}`}
                      style={{
                        minWidth: 48,
                        padding: "6px 8px",
                        borderRadius: theme.radius.md,
                        textAlign: "center",
                        ...theme.font.subtext,
                        fontVariantNumeric: "tabular-nums",
                        background: off ? theme.bg.subtle : theme.fill.accentSubtle,
                        color: off ? theme.text.tertiary : theme.text.accentDeep,
                        textDecoration: off ? "line-through" : "none",
                      }}
                    >
                      {fmt(v)}
                    </span>
                  );
                })}
              </div>
              <p style={{ margin: 0, ...theme.font.caption, color: theme.text.secondary }}>{m.explain}</p>
              <ScaleBar label="현재 합" value={m.current} max={max} color={color} />
              <ScaleBar label="학습 평균" value={m.mean} max={max} color={color} />
              <ScaleBar label="테스트 값" value={m.test} max={max} color={theme.text.tertiary} />
            </div>
          );
        })}
      </div>
      <Text>
        "학습 평균"은 모든 마스크의 결과에 각 마스크가 나올 확률을 곱해 더한 값입니다. 한 번 추첨한 값은 이 평균과 다를 수 있습니다.
        두 방식은 같은 활성값을 넣어도 절대 크기가 다를 수 있습니다. 각 방식 안에서 학습 평균과 테스트 값이 같은지 비교하십시오.
      </Text>
      <details>
        <summary style={{ ...theme.font.subtext, color: theme.text.primary, cursor: "pointer" }}>모든 마스크로 평균을 계산한 표 보기</summary>
        <div style={{ marginTop: 12 }}>
          <Table columns={["마스크", "확률", "논문식 학습 합", "1/p 확대식 학습 합"]} rows={rows} />
          <p style={{ margin: "8px 0 0", ...theme.font.caption, color: theme.text.secondary }}>
            마스크의 1은 남김, 0은 끔입니다. 표시는 반올림하지만 평균 계산에는 반올림 전 값을 사용합니다.
          </p>
        </div>
      </details>
    </div>
  );
}

interface QuizItem {
  q: string;
  choices: string[];
  answer: number;
  why: string;
  source: string;
}

function Quiz({ items, idPrefix }: { items: readonly QuizItem[]; idPrefix: string }) {
  const theme = useGrokTheme();
  const [picked, setPicked] = useState<(number | null)[]>(items.map(() => null));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {items.map((it, i) => {
        const chosen = picked[i];
        const right = chosen === it.answer;
        return (
          <div key={i} role="group" aria-labelledby={`${idPrefix}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p id={`${idPrefix}-${i}`} style={{ margin: 0, ...theme.font.body1, fontWeight: theme.weight.semibold, color: theme.text.primary }}>
              {`${i + 1}. ${it.q}`}
            </p>
            <p style={{ margin: 0, ...theme.font.caption, color: theme.text.secondary }}>{it.source}</p>
            {it.choices.map((c, j) => (
              <button
                key={j}
                type="button"
                aria-pressed={chosen === j}
                onClick={() => setPicked((prev) => prev.map((v, k) => (k === i ? j : v)))}
                style={{
                  ...theme.font.subtext,
                  fontFamily: theme.font.family,
                  textAlign: "left",
                  color: theme.text.primary,
                  background: chosen === j ? theme.fill.accentSubtle : theme.bg.base,
                  border: `1px solid ${chosen === j ? theme.text.accent : theme.border.default}`,
                  borderRadius: theme.radius.md,
                  padding: "8px 12px",
                  minHeight: 40,
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            ))}
            <p
              aria-live="polite"
              style={{ margin: 0, minHeight: "1.5em", ...theme.font.subtext, ...(chosen === null ? theme.font.body2 : {}), color: chosen === null ? theme.text.tertiary : right ? theme.text.successDeep : theme.text.dangerDeep }}
            >
              {chosen === null ? "답을 고르면 해설이 나옵니다." : `${right ? "정답입니다. " : "오답입니다. "}${it.why}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const QUIZ: QuizItem[] = [
  {
    q: "논문에서 남길 확률 p가 0.8이면, PyTorch nn.Dropout의 p에는 무엇을 넣습니까? (논문 밖)",
    choices: ["0.8", "0.2", "1.25"],
    answer: 1,
    why: "PyTorch의 p는 끌 확률이므로 1 - 0.8 = 0.2입니다. (논문 밖)",
    source: "논문의 p 정의: p.2, §1 · API 연결은 논문 밖",
  },
  {
    q: "켜고 끌 수 있는 뉴런이 4개라면, 가능한 마스크는 몇 가지입니까? (예시 값)",
    choices: ["4가지", "8가지", "16가지"],
    answer: 2,
    why: "뉴런마다 켜짐과 꺼짐 두 가지이므로 2 × 2 × 2 × 2 = 16가지입니다.",
    source: "p.3, §1",
  },
  {
    q: "논문 방식에서 테스트 때 가중치에 p를 곱하는 이유는 무엇입니까?",
    choices: [
      "고정된 활성값이 다음 층에 보내는 선형 입력의 평균 크기를 맞추려고",
      "모든 학습 실행의 결과를 똑같이 만들려고",
      "전체 비선형 망의 예측 평균과 항상 정확히 같게 만들려고",
    ],
    answer: 0,
    why: "평균적인 신호 크기를 맞춥니다. 비선형 층이 이어지는 전체 망의 모델 평균은 일반적으로 근사입니다.",
    source: "p.3, §1·그림 2 / pp.5-6, §4",
  },
];

function CompareFigure() {
  const theme = useGrokTheme();
  const head = { ...theme.font.subtext, fill: theme.text.primary, fontWeight: theme.weight.medium };
  const small = { ...theme.font.caption, fill: theme.text.secondary };

  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, tone: "old" | "new" | "cost") => {
    const fill = tone === "old" ? theme.fill.warningSubtle : tone === "new" ? theme.fill.accentSubtle : theme.bg.subtle;
    const stroke = tone === "old" ? theme.text.warning : tone === "new" ? theme.text.accent : theme.border.strong;
    const deep = tone === "old" ? theme.text.warningDeep : tone === "new" ? theme.text.accentDeep : theme.text.primary;
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={1} />
        <text x={x + w / 2} y={y + h / 2 - 9} textAnchor="middle" dominantBaseline="central" style={{ ...head, fill: deep }}>
          {title}
        </text>
        <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" dominantBaseline="central" style={small}>
          {sub}
        </text>
      </g>
    );
  };

  const arrow = (x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={theme.text.tertiary} strokeWidth={1.5} markerEnd="url(#do-arrow)" />
  );

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox="0 0 680 400"
        role="img"
        aria-labelledby="do-cmp-title do-cmp-desc"
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <title id="do-cmp-title">기존 방법과 드롭아웃 비교</title>
        <desc id="do-cmp-desc">
          왼쪽은 큰 망 여러 개를 따로 학습하고 테스트 때 모두 실행해 평균합니다. 오른쪽은 망 하나 안에서 얇아진 망을
          매번 바꿔 학습하고, 테스트 때 망 하나로 평균을 흉내 냅니다.
        </desc>
        <defs>
          <marker id="do-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke={theme.text.tertiary} strokeWidth={1.5} strokeLinecap="round" />
          </marker>
        </defs>

        <text x={170} y={28} textAnchor="middle" style={head}>
          기존: 큰 망 여러 개를 따로
        </text>
        <text x={510} y={28} textAnchor="middle" style={head}>
          드롭아웃: 망 하나 안에서
        </text>
        <line x1={340} y1={16} x2={340} y2={384} stroke={theme.border.default} />

        {box(36, 56, 84, 60, "망 A", "따로 학습", "old")}
        {box(128, 56, 84, 60, "망 B", "따로 학습", "old")}
        {box(220, 56, 84, 60, "망 C", "따로 학습", "old")}
        {arrow(78, 118, 150, 196)}
        {arrow(170, 118, 170, 196)}
        {arrow(262, 118, 190, 196)}
        {box(80, 200, 180, 60, "테스트: 전부 실행", "결과를 평균", "old")}
        {box(46, 296, 248, 68, "비용", "학습도 테스트도 망 개수만큼", "cost")}

        {box(376, 56, 84, 60, "1단계", "얇은 망", "new")}
        {box(468, 56, 84, 60, "2단계", "다른 얇은 망", "new")}
        {box(560, 56, 84, 60, "3단계", "또 다른 망", "new")}
        <text x={510} y={140} textAnchor="middle" style={small}>
          모두 같은 가중치를 함께 씀
        </text>
        {arrow(510, 152, 510, 196)}
        {box(410, 200, 200, 60, "테스트: 망 하나", "전부 켜고 가중치 × p", "new")}
        {box(386, 296, 248, 68, "비용", "학습 2~3배 느림, 테스트 1번", "cost")}
      </svg>
      <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
        주황 = 기존 방법, 파랑 = 드롭아웃, 회색 = 비용. "2~3배"는 논문 p.24, §11의 값입니다.
      </figcaption>
    </figure>
  );
}

export default function App() {
  return (
    <Page
      title="Dropout 쉽게 보기 (Srivastava 외, 2014)"
      summary="드롭아웃은 학습 때 뉴런을 무작위로 꺼서 매번 다른 얇은 망을 학습하는 방법입니다. 테스트 때는 뉴런을 모두 켠 채 가중치에 p(남길 확률)를 곱해, 그 많은 망의 평균을 한 번에 흉내 냅니다. 뉴런 n개에서 나오는 얇은 망 2^n개를 세어 보고, 학습 때 1/p로 키우는 방식(PyTorch 기본)과도 비교합니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "직접 움직여 보기", id: "lab" },
          { label: "얇아진 망은 몇 가지일까", id: "thinned" },
          { label: "기존 방법과 비교", id: "compare" },
          { label: "학습과 테스트의 크기 맞추기", id: "scale" },
          { label: "논문 근거 위치", id: "evidence" },
          { label: "주의", id: "caution" },
          { label: "확인 질문과 답", id: "quiz" },
          { label: "출처", id: "source" },
        ]}
      />

      <Section heading="한 장면 비유" id="analogy">
        <Text>
          축구팀 감독이 연습 때마다 선수 절반을 무작위로 벤치에 앉힙니다. 그러면 남은 선수는 특정 동료에게 기대지 못하고 혼자서도
          제 몫을 하게 됩니다. 시합 날에는 모두 뛰게 하되, 각자 힘을 조금 빼게 해서 연습 때와 같은 세기로 맞춥니다.
        </Text>
        <Callout lead="비유의 한계" tone="warning">
          "동료에게 기대지 않게 된다"는 논문이 가설(We hypothesize)로 쓴 설명입니다 (p.15, §7.1). 또 실제로 줄이는 것은 선수의
          힘이 아니라 연결선의 가중치입니다.
        </Callout>
        <Table
          columns={["용어", "뜻"]}
          rows={[
            ["뉴런, 유닛(unit)", "값 하나를 받아 다음 층으로 넘기는 작은 계산 단위"],
            ["드롭아웃(dropout)", "학습 때 뉴런을 무작위로 잠시 끄는 방법"],
            ["얇아진 망(thinned network)", "일부 뉴런이 꺼진 채 남은 망"],
            ["마스크(mask)", "이번 학습에서 어느 뉴런을 켜고 끌지 정한 표"],
            ["p", "뉴런을 남길 확률. 지울 확률이 아닙니다"],
            ["과적합(overfitting)", "학습 데이터만 외워서 새 데이터에서 틀리는 현상"],
          ]}
        />
      </Section>

      <Section heading="직접 움직여 보기" id="lab" caption="모든 뉴런 값과 합계는 예시입니다">
        <Text>
          먼저 "다음 학습 단계"를 여러 번 누르십시오. 누를 때마다 다른 은닉 뉴런이 꺼집니다. 꺼진 뉴런의 연결선도 함께 사라집니다.
          뉴런마다 따로 추첨하므로 남는 개수도 매번 달라집니다. 매번 정확히 절반을 끄는 규칙이 아닙니다 (p.2, 그림 1 · pp.5-6, §4).
        </Text>
        <DropoutLab />
        <Text>
          이어서 "학습 20번 더"를 몇 번 누르십시오. 학습 때 평균이 테스트 때 값에 가까워집니다. 두 값이 같아지도록 테스트 때 가중치에
          p를 곱합니다.
        </Text>
        <Text>
          p 슬라이더를 움직이면 평균적으로 남는 뉴런 수가 바뀝니다. p가 1.0이면 아무것도 끄지 않으므로 드롭아웃이 없는 망과 같습니다.
          이 그림에서는 은닉층만 끄고 입력과 출력은 고정합니다. 가중치를 실제로 학습하지는 않습니다.
        </Text>
      </Section>

      <Section heading="얇아진 망은 몇 가지일까" id="thinned" caption="뉴런 수와 조합은 예시입니다">
        <Text>
          위 그림에서 누를 때마다 나온 망 하나하나가 얇아진 망입니다. 끌 수 있는 뉴런이 n개면 얇아진 망은 2^n개(2를 n번 곱한 수)가
          나올 수 있습니다 (p.3, §1). 뉴런 하나가 늘 때마다 가능한 조합이 두 배가 됩니다.
        </Text>
        <CountLab />
        <Text>
          뉴런마다 켜짐과 꺼짐이 모두 나올 수 있다고 보고 센 조합입니다. 모두 꺼지는 조합도 포함합니다. 각 조합이 나올 확률이 모두 같은 것은 p가
          0.5일 때뿐입니다.
        </Text>
        <Callout lead="망이 2^n개 따로 있다는 뜻은 아닙니다" tone="info">
          이 망들은 모두 같은 가중치(연결의 세기)를 함께 씁니다. 그래서 매개변수 수는 그대로입니다. 원문은 각 얇은 망이 "아주 드물게,
          어쩌면 한 번도" 학습되지 않는다고 씁니다 (p.3, §1: "each thinned network gets trained very rarely, if at all").
        </Callout>
      </Section>

      <Section heading="기존 방법과 비교" id="compare">
        <Text>
          예측을 좋게 하는 오래된 방법은 서로 다른 큰 망 여러 개를 따로 학습해 결과를 평균하는 것입니다. 드롭아웃은 이 평균을 망 하나
          안에서 흉내 냅니다.
        </Text>
        <CompareFigure />
        <Table
          columns={["항목", "기존 (여러 망 평균)", "드롭아웃"]}
          rows={[
            ["망의 수", "실제로 여러 개", "하나 (그 안에 2^n개의 얇은 망)"],
            ["가중치", "망마다 따로", "모두 공유 (p.3)"],
            ["테스트", "망을 전부 실행해 평균", "망 하나로 근사 평균"],
            ["비용", "학습과 테스트 모두 큼", "학습이 보통 2~3배 느림 (p.24, §11)"],
          ]}
        />
        <Text>
          드롭아웃은 얇은 망들의 진짜 평균을 계산하지 않습니다. 가중치에 p를 곱한 망 하나로 그 평균을 근사합니다 (p.3).
        </Text>
        <Text>아래 막대는 MNIST 손글씨 숫자 테스트 오류율입니다 (p.9, §6.1.1, 표 2). 낮을수록 좋습니다.</Text>
        <Bars
          emphasis="none"
          bars={[
            { label: "드롭아웃 없음", value: 1.6, display: "1.60%" },
            { label: "드롭아웃", value: 1.35, display: "1.35%" },
            { label: "+ ReLU", value: 1.25, display: "1.25%" },
            { label: "+ max-norm", value: 1.06, display: "1.06%" },
            { label: "층당 8192 유닛 큰 망", value: 0.95, display: "0.95%" },
          ]}
        />
        <Text>
          0.95% 망은 매개변수가 6,500만 개 이상이고, 학습 데이터는 6만 장입니다. 데이터보다 훨씬 큰 망도 드롭아웃과 함께라면 과적합을 덜 했다고 볼 수 있습니다 (추정).
          CIFAR-10은 14.98%에서 12.61%로, CIFAR-100은 43.48%에서 37.20%로 오류율이 줄었습니다 (p.10, 표 4).
        </Text>
        <Text>
          큰 사진 분류에서도 같은 결과가 나옵니다. 이 논문은 ImageNet(ILSVRC-2010) 결과로 "Conv Net + dropout (Krizhevsky et al.,
          2012)"의 top-5 오류율 17.0%를 싣습니다 (p.12, §6.1.4, 표 5). 이 망이 AlexNet입니다. AlexNet은 완전연결층(fully-connected layer, 앞 층의 모든 뉴런과 이어진 층) 두 개에
          드롭아웃을 썼습니다. 자세한 구조와 드롭아웃을 쓴 위치는{" "}
          <a href="/posts/alexnet-imagenet-classification/">AlexNet 쉽게 보기</a>에서 직접 움직여 볼 수 있습니다.
        </Text>
      </Section>

      <Section heading="학습과 테스트의 크기 맞추기" id="scale" caption="활성값과 가중치는 예시입니다">
        <Text>
          02절 그림은 무작위로 여러 번 뽑은 평균이 테스트 값에 가까워지는 것을 보였습니다. 여기서는 뉴런을 3개로 줄여 가능한 마스크
          8개를 모두 세어 정확한 평균을 계산합니다 (p.3, 그림 2 · pp.5-6, §4).
        </Text>
        <Text>
          크기를 맞추는 방법은 두 가지입니다. 논문의 기본 방식은 학습 때 그대로 두고 테스트 때 가중치에 p를 곱합니다. 다른 방식은 학습
          때 남은 값을 1/p배로 키우고 테스트 때는 아무것도 바꾸지 않습니다. 원문 §10은 이 방식을 "같은 효과를 내는 다른 방법"으로
          소개합니다. 층마다 학습률과 초기 가중치를 알맞게 맞추면 두 방법이 같다고 씁니다 (p.23, §10).
        </Text>
        <ScaleLab />
        <Callout lead="코드의 p는 뜻이 반대입니다 (논문 밖)" tone="danger">
          PyTorch nn.Dropout(p)의 p는 "끌" 확률입니다. 논문의 p는 "남길" 확률입니다. PyTorch는 학습 때 남은 값을 1/(1-p)배로 키우므로
          테스트 때 곱하지 않습니다. 논문 기호로 쓰면 위의 1/p 확대 방식과 같습니다.
        </Callout>
        <Text>
          이 실험은 고정된 활성값이 다음 층에 보내는 선형 입력 합(활성화 함수에 들어가기 전 값)만 계산합니다. 비선형 처리가 이어지는
          전체 망의 최종 예측 평균은 일반적으로 근사입니다.
        </Text>
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["학습 때 뉴런을 무작위로 끔", "p.1, 초록"],
            ["표준 망과 얇아진 망 그림", "p.2, 그림 1"],
            ["p는 남길 확률, 은닉 0.5, 실수값 입력 0.8", "p.2 §1, p.25 부록 A.4"],
            ["입력 20%, 은닉 50%를 지우는 것이 자주 최적", "p.5, §3"],
            ["2^n개의 얇은 망, 가중치 공유, 각 망은 드물게 학습", "p.3, §1"],
            ["테스트 때 가중치 × p, 기댓값과 같게", "p.3, §1, 그림 2"],
            ["뉴런마다 Bernoulli(p)로 따로 추첨", "pp.5-6, §4"],
            ["MNIST 오류율 1.60% → 0.95%", "p.9, §6.1.1, 표 2"],
            ["CIFAR-10, CIFAR-100 오류율", "p.10, 표 4"],
            ["ImageNet: Conv Net + dropout (AlexNet) top-5 17.0%", "p.12, §6.1.4, 표 5"],
            ["데이터가 아주 적으면 효과 없음", "p.18, §7.4, 그림 10"],
            ["학습 때 1/p로 키우는 같은 효과의 방법", "p.23, §10"],
            ["학습이 보통 2~3배 느림", "p.24, §11"],
          ]}
        />
        <Callout lead="핵심 원문 문장 (p.1 초록)">
          "The key idea is to randomly drop units (along with their connections) from the neural network during training."
        </Callout>
        <Callout lead="핵심 원문 문장 (p.3 그림 2 캡션)">
          "The output at test time is same as the expected output at training time."
        </Callout>
        <Callout lead="핵심 원문 문장 (p.23 §10)">
          "Another way to achieve the same effect is to scale up the retained activations by multiplying by 1/p at training time and
          not modifying the weights at test time."
        </Callout>
      </Section>

      <Section heading="주의" id="caution">
        <Callout lead="왜 작동하는가는 가설입니다" tone="warning">
          "뉴런끼리 서로 기대는 현상(공적응, co-adaptation)을 막는다"는 설명은 원문이 "We hypothesize"로 쓴 가설입니다 (p.15, §7.1).
        </Callout>
        <Callout lead="데이터 크기에 따라 효과가 다릅니다" tone="info">
          MNIST에서 100장, 500장처럼 데이터가 아주 적으면 드롭아웃 효과가 없었습니다. 데이터가 늘면 효과가 커졌다가 다시 줄었습니다
          (p.18, §7.4, 그림 10).
        </Callout>
        <Callout lead="정확히 맞는 것은 다음 층 입력의 평균입니다" tone="info">
          테스트 때 × p는 한 층의 선형 입력 평균을 맞춥니다. 특정 학습 1회와 테스트가 같은 결과를 낸다는 뜻이 아닙니다. 비선형 층을
          여러 개 거친 최종 예측의 평균은 근사입니다 (p.3, §1).
        </Callout>
        <Callout lead="실험 화면은 학습을 하지 않습니다" tone="info">
          이 글의 그림은 마스크와 합만 계산합니다. 가중치 학습이나 정확도 측정은 하지 않습니다. 정확도 숫자는 모두 논문 표에서 가져왔습니다.
        </Callout>
      </Section>

      <Section heading="확인 질문과 답" id="quiz">
        <Text>앞의 그림에서 확인한 내용으로 답해 보십시오. 고르면 바로 해설이 나옵니다.</Text>
        <Quiz items={QUIZ} idPrefix="do-quiz" />
        <Callout lead="한 걸음 더: 말로 답하는 질문" tone="info">
          테스트 때 뉴런을 모두 켜면서 가중치에 p를 곱하지 않으면, 다음 층이 받는 값은 어떻게 됩니까? 그 결과 어떤 문제가 생깁니까?
          먼저 말로 답해 본 뒤 아래를 읽으십시오.
        </Callout>
        <Text>
          02절 그림으로 확인해 보십시오. p = 0.5일 때 학습 때 출력 1이 받는 합의 평균은 2.2 근처입니다 (예시). 테스트 때 모두 켜고
          곱하지 않으면 4.4를 받습니다 (예시). 1/p배, 여기서는 2배로 커집니다.
        </Text>
        <Callout lead="답" tone="success">
          다음 층은 학습 때 본 적 없는 큰 값을 받습니다. 다음 층은 학습 때의 평균 크기에 맞춰져 있으므로 예측이 틀어질 수 있습니다.
          논문은 그래서 테스트 때 각 뉴런의 나가는 가중치에 p를 곱합니다. 그러면 테스트 때 실제 출력이 학습 때 출력의 기댓값과
          같아집니다 (p.3, §1 본문과 그림 2 캡션).
        </Callout>
        <Text>
          "예측이 틀어질 수 있다"는 부분은 논문 문장을 풀어 쓴 해석입니다 (추정). 논문이 직접 쓴 것은 "기댓값과 같게 한다"는
          목적입니다 (p.3).
        </Text>
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Nitish Srivastava, Geoffrey Hinton, Alex Krizhevsky, Ilya Sutskever, Ruslan Salakhutdinov. "Dropout: A Simple Way to Prevent
          Neural Networks from Overfitting". Journal of Machine Learning Research 15, 1929-1958, 2014.
          https://jmlr.org/papers/v15/srivastava14a.html
        </Text>
        <Text>
          쪽 번호는 PDF의 첫 쪽을 1로 센 번호입니다. 함께 읽기: <a href="/posts/alexnet-imagenet-classification/">AlexNet 쉽게 보기</a>{" "}
          (드롭아웃을 완전연결층에 쓴 2012년 ImageNet 논문).
        </Text>
      </Section>
    </Page>
  );
}
