import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Table,
  Bars,
  Properties,
  useGrokTheme,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "@/components/canvas";

// 이 글의 실험 화면에 나오는 격자 값, 뉴런 값, 가중치는 모두 예시 값이다(논문 밖).
// 층 크기, 드롭아웃 확률 0.5, 오류율은 논문 값이다.

const sum = (a: readonly number[]) => a.reduce((s, x) => s + x, 0);
const fmt = (n: number, d = 2) => Number(n).toLocaleString("ko-KR", { maximumFractionDigits: d });

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
        style={{ ...theme.font.subtext, color: theme.text.secondary, display: "flex", justifyContent: "space-between" }}
      >
        <span>{label}</span>
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
        style={{ width: 17, height: 17, margin: 0, accentColor: theme.text.accent }}
      />
      {label}
    </label>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>{children}</div>;
}

/* ---------- 1. ReLU와 tanh ---------- */

const ACT_THRESHOLD = Math.acosh(Math.sqrt(10)); // tanh 기울기가 0.1보다 작아지는 입력 크기 (예시 기준)

function ActLab() {
  const theme = useGrokTheme();
  const [x, setX] = useState(2);
  const [shade, setShade] = useState(true);

  const t = Math.tanh(x);
  const r = Math.max(0, x);
  const s = 1 - t * t;
  const X = (v: number) => 46 + (v + 4) * 56;
  const Y = (v: number) => 258 - (v + 1.2) * 43;
  const path = (f: (z: number) => number) =>
    Array.from({ length: 161 }, (_, i) => {
      const z = -4 + i * 0.05;
      return `${i ? "L" : "M"}${X(z).toFixed(2)},${Y(f(z)).toFixed(2)}`;
    }).join(" ");
  const tick = { ...theme.font.caption, fill: theme.text.secondary };
  const relu = theme.dataviz.categorical[0];
  const tanhColor = theme.text.warning;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Slider id="ax-x" label="입력" value={x} min={-4} max={4} step={0.1} show={fmt(x)} onChange={setX} />
      <Row>
        <ActionButton
          label="입력 초기화"
          onClick={() => {
            setX(2);
            setShade(true);
          }}
        />
        <Check id="ax-shade" label="포화 구간 표시" checked={shade} onChange={setShade} />
      </Row>
      <figure style={{ margin: 0 }}>
        <svg viewBox="0 0 540 300" role="img" aria-labelledby="ax-act-title" style={{ display: "block", width: "100%", height: "auto" }}>
          <title id="ax-act-title">ReLU(실선)와 tanh(점선) 함수 그래프</title>
          {shade ? (
            <g>
              <rect x={X(-4)} y={20} width={X(-ACT_THRESHOLD) - X(-4)} height={238} fill={theme.fill.warningSubtle} />
              <rect x={X(ACT_THRESHOLD)} y={20} width={X(4) - X(ACT_THRESHOLD)} height={238} fill={theme.fill.warningSubtle} />
            </g>
          ) : null}
          {[-1, 0, 1, 2, 3, 4].map((v) => (
            <g key={`h${v}`}>
              <line x1={46} y1={Y(v)} x2={494} y2={Y(v)} stroke={theme.border.weak} />
              <text x={36} y={Y(v) + 4} textAnchor="end" style={tick}>
                {v}
              </text>
            </g>
          ))}
          <line x1={46} y1={Y(0)} x2={494} y2={Y(0)} stroke={theme.border.strong} />
          <line x1={X(0)} y1={20} x2={X(0)} y2={258} stroke={theme.border.strong} />
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((v) => (
            <text key={`v${v}`} x={X(v)} y={278} textAnchor="middle" style={tick}>
              {v}
            </text>
          ))}
          <path d={path((z) => Math.max(0, z))} fill="none" stroke={relu} strokeWidth={3} />
          <path d={path(Math.tanh)} fill="none" stroke={tanhColor} strokeWidth={3} strokeDasharray="6 4" />
          <line x1={X(x)} y1={20} x2={X(x)} y2={258} stroke={theme.text.tertiary} strokeDasharray="3 4" />
          <circle cx={X(x)} cy={Y(r)} r={5} fill={relu} stroke={theme.bg.base} strokeWidth={2} />
          <circle cx={X(x)} cy={Y(t)} r={5} fill={tanhColor} stroke={theme.bg.base} strokeWidth={2} />
          <text x={12} y={15} style={tick}>
            출력
          </text>
          <text x={500} y={278} style={tick}>
            입력
          </text>
        </svg>
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
          실선 = ReLU, 점선 = tanh(쌍곡탄젠트). 색칠한 곳 = tanh 기울기가 0.1보다 작은 구간 (예시 기준, 논문 밖).
        </figcaption>
      </figure>
      <Properties
        items={[
          { label: "ReLU 출력 · 계산값", value: fmt(r) },
          { label: "tanh 출력 · 계산값", value: fmt(t, 4) },
          { label: "ReLU 기울기 · 계산값", value: x === 0 ? "0에서 미정의" : x > 0 ? "1" : "0" },
          { label: "tanh 기울기 · 계산값", value: fmt(s, 4) },
        ]}
      />
    </div>
  );
}

/* ---------- 2. 합성곱 ---------- */

const N = 6;
const PIXELS = Array.from({ length: N * N }, (_, i) => {
  const r = Math.floor(i / N);
  const c = i % N;
  return c === 2 || c === 3 ? (r > 0 && r < 5 ? 8 : 2) : (r + c) % 3;
});

function Cell({ children, bg, mark, onClick, label }: { children: ReactNode; bg: string; mark?: "patch" | "selected"; onClick?: () => void; label?: string }) {
  const theme = useGrokTheme();
  const style: CSSProperties = {
    aspectRatio: "1",
    minWidth: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 5,
    padding: 0,
    background: bg,
    border: mark === "selected" ? `2px solid ${theme.text.warning}` : `1px solid ${theme.border.weak}`,
    outline: mark === "patch" ? `2px solid ${theme.text.warning}` : undefined,
    outlineOffset: mark === "patch" ? -2 : undefined,
    ...theme.font.caption,
    color: theme.text.primary,
    fontFamily: theme.font.family,
    fontVariantNumeric: "tabular-nums",
  };
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} aria-pressed={mark === "selected"} style={{ ...style, cursor: "pointer" }}>
        {children}
      </button>
    );
  }
  return <div style={style}>{children}</div>;
}

function ConvLab() {
  const theme = useGrokTheme();
  const [k, setK] = useState(3);
  const [s, setS] = useState(1);
  const [average, setAverage] = useState(false);
  const [rawPos, setPos] = useState(0);

  const o = Math.floor((N - k) / s) + 1;
  const pos = Math.min(rawPos, o * o - 1);
  const row = Math.floor(pos / o);
  const col = pos % o;
  const values: number[] = [];
  let selected: number[] = [];
  for (let r = 0; r < o; r++)
    for (let c = 0; c < o; c++) {
      const a: number[] = [];
      for (let dr = 0; dr < k; dr++) for (let dc = 0; dc < k; dc++) a.push(PIXELS[(r * s + dr) * N + c * s + dc]);
      values.push(sum(a) / (average ? k * k : 1));
      if (r === row && c === col) selected = a;
    }
  const vmax = Math.max(1, ...values);
  const tint = (alpha: number) => `color-mix(in srgb, ${theme.text.accent} ${Math.round(alpha * 100)}%, transparent)`;
  const gridTitle = { margin: "0 0 6px", textAlign: "center" as const, ...theme.font.subtext, fontWeight: theme.weight.medium, color: theme.text.primary };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Slider
          id="ax-k"
          label="필터 한 변"
          value={k}
          min={2}
          max={3}
          step={1}
          show={`${k} × ${k}`}
          onChange={(v) => {
            setK(v);
            setPos(0);
          }}
        />
        <Slider
          id="ax-s"
          label="이동 간격 (스트라이드)"
          value={s}
          min={1}
          max={3}
          step={1}
          show={`${s}칸`}
          onChange={(v) => {
            setS(v);
            setPos(0);
          }}
        />
      </div>
      <Row>
        <ActionButton label="다음 위치로" onClick={() => setPos((pos + 1) % (o * o))} />
        <ActionButton
          label="처음으로"
          onClick={() => {
            setK(3);
            setS(1);
            setAverage(false);
            setPos(0);
          }}
        />
        <Check id="ax-avg" label="필터를 평균내기로 변경" checked={average} onChange={setAverage} />
      </Row>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, alignItems: "start" }}>
        <div>
          <p style={gridTitle}>입력 6 × 6 (예시 값)</p>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`, gap: 4, maxWidth: 300, margin: "0 auto" }}>
            {PIXELS.map((v, i) => {
              const r = Math.floor(i / N);
              const c = i % N;
              const hit = r >= row * s && r < row * s + k && c >= col * s && c < col * s + k;
              return (
                <Cell key={i} bg={tint(0.04 + (v / 8) * 0.28)} mark={hit ? "patch" : undefined}>
                  {v}
                </Cell>
              );
            })}
          </div>
        </div>
        <div>
          <p style={gridTitle}>{`출력 ${o} × ${o} (예시 값)`}</p>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${o}, minmax(0, 1fr))`, gap: 4, maxWidth: 300, margin: "0 auto" }}>
            {values.map((v, i) => (
              <Cell
                key={i}
                bg={tint(0.05 + (v / vmax) * 0.22)}
                mark={i === pos ? "selected" : undefined}
                onClick={() => setPos(i)}
                label={`출력 ${Math.floor(i / o) + 1}행 ${(i % o) + 1}열, ${fmt(v)}`}
              >
                {fmt(v, 1)}
              </Cell>
            ))}
          </div>
          <p style={{ margin: "8px 0 0", ...theme.font.caption, color: theme.text.secondary }}>
            출력 칸을 누르면 그 칸을 만든 입력 영역이 표시됩니다. 소수는 반올림해 표시합니다.
          </p>
        </div>
      </div>
      <Properties
        items={[
          { label: "출력 한 변 · 실제 계산", value: `${o} × ${o}` },
          { label: "선택한 칸의 출력 · 예시 값", value: fmt(values[pos]) },
          { label: "현재 필터의 가중치", value: `${k} × ${k}칸 모두 ${average ? `1/${k * k}` : "1"}` },
        ]}
      />
      <Callout lead="계산 과정" tone="info">
        {`출력 한 변 = 내림((${N} - ${k}) ÷ ${s}) + 1 = ${o}. 선택 영역: ${selected.join(" + ")} = ${sum(selected)}${
          average ? `, 각 가중치가 1/${k * k}이므로 출력 = ${sum(selected)} ÷ ${k * k} = ${fmt(values[pos])}` : ", 각 가중치가 1이므로 이 합이 출력입니다."
        }`}
      </Callout>
    </div>
  );
}

/* ---------- 3. 그림 2 ---------- */

interface Layer {
  name: string;
  size: string;
  role: string;
  after: string;
  gpu: string;
}

const LAYERS: Layer[] = [
  { name: "합성곱 1", size: "96개 필터 · 11 × 11 × 3", role: "입력의 작은 영역에서 패턴을 찾습니다. 이동 간격은 4픽셀입니다.", after: "ReLU → LRN → 최대 풀링", gpu: "두 GPU에 필터를 나눕니다. 입력 영상에서 각자 필터 계산을 합니다." },
  { name: "합성곱 2", size: "256개 필터 · 5 × 5 × 48", role: "앞 층에서 나온 패턴을 다시 조합합니다.", after: "ReLU → LRN → 최대 풀링", gpu: "바로 앞 층에서 같은 GPU에 있는 특징 지도만 연결합니다." },
  { name: "합성곱 3", size: "384개 필터 · 3 × 3 × 256", role: "앞 층의 모든 특징 지도에서 패턴을 조합합니다.", after: "ReLU → 합성곱 4", gpu: "두 GPU에 있는 앞 층의 특징 지도를 모두 연결합니다." },
  { name: "합성곱 4", size: "384개 필터 · 3 × 3 × 192", role: "앞에서 추출한 특징을 더 조합합니다.", after: "ReLU → 합성곱 5", gpu: "같은 GPU의 앞 층 특징 지도만 연결합니다." },
  { name: "합성곱 5", size: "256개 필터 · 3 × 3 × 192", role: "분류에 사용할 마지막 합성곱 특징을 만듭니다.", after: "ReLU → 최대 풀링", gpu: "같은 GPU의 앞 층 특징 지도만 연결합니다." },
  { name: "완전연결 1", size: "4096개 뉴런", role: "앞 층의 모든 출력을 연결해 분류에 사용할 값을 만듭니다.", after: "ReLU · 드롭아웃 적용", gpu: "이전 층의 모든 뉴런과 연결합니다." },
  { name: "완전연결 2", size: "4096개 뉴런", role: "완전연결 1의 값들을 다시 조합합니다.", after: "ReLU · 드롭아웃 적용", gpu: "이전 층의 모든 뉴런과 연결합니다." },
  { name: "완전연결 3", size: "1000개 출력", role: "1000개 범주를 위한 값을 만듭니다. 소프트맥스가 범주별 확률로 바꿉니다.", after: "소프트맥스(softmax): 합이 1인 확률", gpu: "이전 층의 모든 뉴런과 연결합니다. 두 줄 그림은 독립된 두 모델을 뜻하지 않습니다." },
];

function NetLab() {
  const theme = useGrokTheme();
  const [index, setIndex] = useState(0);
  const [gpu, setGpu] = useState(false);
  const l = LAYERS[index];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Slider id="ax-layer" label="선택한 층" value={index + 1} min={1} max={8} step={1} show={`${index + 1} / 8`} onChange={(v) => setIndex(v - 1)} />
      <Row>
        <ActionButton label="다음 층" onClick={() => setIndex((index + 1) % LAYERS.length)} />
        <Check id="ax-gpu" label="GPU 연결 설명" checked={gpu} onChange={setGpu} />
      </Row>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {LAYERS.map((a, i) => {
          const on = i === index;
          return (
            <button
              key={a.name}
              type="button"
              aria-pressed={on}
              onClick={() => setIndex(i)}
              style={{
                ...theme.font.caption,
                fontFamily: theme.font.family,
                minWidth: 0,
                padding: "10px 4px",
                borderRadius: theme.radius.md,
                border: `1px ${i >= 5 ? "dashed" : "solid"} ${on ? theme.text.accent : theme.border.default}`,
                background: on ? theme.fill.accentSubtle : theme.bg.base,
                color: on ? theme.text.accentDeep : theme.text.primary,
                cursor: "pointer",
                overflowWrap: "anywhere",
              }}
            >
              {`${i + 1}층`}
              <span style={{ display: "block", ...theme.font.subtext, fontWeight: theme.weight.semibold }}>{a.name}</span>
            </button>
          );
        })}
      </div>
      <div style={{ background: theme.bg.subtle, borderRadius: theme.radius.lg, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, ...theme.font.body1, fontWeight: theme.weight.semibold, color: theme.text.accentDeep }}>{l.name}</p>
        <p style={{ margin: 0, ...theme.font.subtext, color: theme.text.primary }}>{l.role}</p>
        <Properties
          items={[
            { label: "크기 · 논문 값", value: l.size },
            { label: "이어지는 처리", value: l.after },
          ]}
        />
        <p style={{ margin: 0, ...theme.font.caption, color: theme.text.secondary }}>크기: pp.4-5, §3.5 / 전체 구조: p.5, 그림 2</p>
      </div>
      {gpu ? (
        <Callout lead="GPU 연결 · 가볍게 보기" tone="info">
          {`${l.gpu} 당시 GPU 메모리(GTX 580, 3GB)의 제약 때문에 망을 두 GPU에 나눈 것입니다 (p.3, §3.2 · pp.4-5, §3.5·그림 2).`}
        </Callout>
      ) : null}
    </div>
  );
}

/* ---------- 4. 드롭아웃 ---------- */

const DROP_BASE = [2, 4, 6, 8];

function DropLab() {
  const theme = useGrokTheme();
  const [amp, setAmp] = useState(1);
  const [test, setTest] = useState(false);
  const [masks, setMasks] = useState<number[]>([1, 1, 1, 1]);
  const [samples, setSamples] = useState(0);
  const [total, setTotal] = useState(0);

  const sample = (n: number, a: number, fresh: boolean) => {
    const vals = DROP_BASE.map((v) => v * a);
    let m = masks;
    let add = 0;
    for (let i = 0; i < n; i++) {
      m = vals.map(() => (Math.random() < 0.5 ? 1 : 0));
      add += sum(vals.map((v, j) => v * m[j]));
    }
    setMasks(m);
    setSamples((s) => (fresh ? 0 : s) + n);
    setTotal((t) => (fresh ? 0 : t) + add);
  };

  // 처음 화면에서 학습 1회를 뽑는다(원본과 같음). 서버 렌더와 어긋나지 않게 마운트 뒤에 뽑는다.
  useEffect(() => {
    sample(1, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const a = DROP_BASE.map((v) => v * amp);
  const full = sum(a);
  const expected = 0.5 * full;
  const train = sum(a.map((v, i) => v * masks[i]));
  const shown = test ? expected : train;
  const mean = samples ? total / samples : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Slider
        id="ax-amp"
        label="예시 뉴런 값의 배율"
        value={amp}
        min={0.5}
        max={2}
        step={0.1}
        show={`${fmt(amp)}배`}
        onChange={(v) => {
          setAmp(v);
          sample(1, v, true);
        }}
      />
      <Row>
        <Check id="ax-test" label="테스트 모드: 모두 켜고 ×0.5" checked={test} onChange={setTest} />
      </Row>
      <p style={{ margin: 0, ...theme.font.subtext, fontWeight: theme.weight.semibold, color: theme.text.accentDeep }}>
        {test ? "테스트: 모든 뉴런의 출력을 절반으로" : "학습: 각 뉴런을 독립적으로 켜거나 끄기"}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {a.map((v, i) => {
          const off = !test && !masks[i];
          return (
            <div
              key={i}
              style={{
                textAlign: "center",
                padding: "12px 2px",
                borderRadius: theme.radius.lg,
                border: `2px solid ${off ? theme.border.default : theme.text.accent}`,
                background: off ? theme.bg.subtle : theme.fill.accentSubtle,
                color: off ? theme.text.tertiary : theme.text.primary,
                minWidth: 0,
              }}
            >
              <span style={{ display: "block", ...theme.font.caption }}>{`뉴런 ${i + 1} · 원래 ${fmt(v)}`}</span>
              <span style={{ display: "block", fontSize: theme.font.heading2.fontSize, lineHeight: theme.font.heading2.lineHeight, fontWeight: theme.weight.semibold, fontVariantNumeric: "tabular-nums" }}>
                {fmt(test ? 0.5 * v : v * masks[i])}
              </span>
              <span style={{ display: "block", ...theme.font.caption }}>{test ? "켜짐 · ×0.5" : masks[i] ? "켜짐" : "꺼짐 · 출력 0"}</span>
            </div>
          );
        })}
      </div>
      <p style={{ margin: 0, ...theme.font.caption, color: theme.text.secondary }}>
        예시 조건: 가중치(값에 곱하는 연결값)는 모두 1이고, 편향(합에 더하는 값)은 0입니다. 표시한 합은 다음 층의 활성화 함수에 들어가기
        전 값입니다.
      </p>
      <Row>
        <ActionButton
          label="학습 1회 뽑기"
          onClick={() => {
            setTest(false);
            sample(1, amp, false);
          }}
        />
        <ActionButton label="학습 1000회 추가" onClick={() => sample(1000, amp, false)} />
        <ActionButton label="표본 초기화" onClick={() => sample(1, amp, true)} />
      </Row>
      <Properties
        items={[
          { label: test ? "현재 테스트의 합" : "현재 학습 표본의 합", value: fmt(shown) },
          { label: `학습 ${fmt(samples, 0)}회 표본 평균`, value: samples ? fmt(mean, 3) : "표본 없음" },
          { label: "기댓값 (반복했을 때의 이론적 평균)", value: fmt(expected) },
          { label: "테스트 · 모두 켜고 각 출력 ×0.5", value: fmt(expected) },
        ]}
      />
      <Bars
        emphasis={1}
        bars={[
          { label: "현재 화면의 합", value: shown, display: fmt(shown, 3) },
          { label: "학습 표본 평균", value: mean, display: fmt(mean, 3) },
          { label: "테스트 합", value: expected, display: fmt(expected, 3) },
          { label: "전부 켬·보정 없음", value: full, display: fmt(full, 3) },
        ]}
      />
      <p style={{ margin: 0, ...theme.font.caption, color: theme.text.secondary }}>
        {`막대 공통 눈금: 0 ~ ${fmt(full)} · 예시 값. 학습 평균과 테스트 합의 차이: ${fmt(Math.abs(mean - expected), 3)}.`}
      </p>
      <Callout lead="계산 과정" tone="info">
        {`학습의 기댓값 = (${a.map((v) => fmt(v)).join(" + ")}) × 0.5 = ${fmt(expected)}. 테스트 합 = ${a.map((v) => fmt(v * 0.5)).join(" + ")} = ${fmt(expected)}.`}
      </Callout>
    </div>
  );
}

/* ---------- 확인 퀴즈 ---------- */

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
  const score = items.filter((it, i) => picked[i] === it.answer).length;
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
              style={{ margin: 0, minHeight: "1.5em", ...theme.font.subtext, color: chosen === null ? theme.text.tertiary : right ? theme.text.successDeep : theme.text.dangerDeep }}
            >
              {chosen === null ? "답을 고르면 해설이 나옵니다." : `${right ? "정답입니다. " : "다시 생각해 보세요. "}${it.why}`}
            </p>
          </div>
        );
      })}
      <Row>
        <span style={{ ...theme.font.subtext, fontWeight: theme.weight.semibold, color: theme.text.accentDeep }}>{`현재 ${score} / ${items.length} 정답`}</span>
        <ActionButton label="퀴즈 다시 풀기" onClick={() => setPicked(items.map(() => null))} />
      </Row>
    </div>
  );
}

const QUIZ: QuizItem[] = [
  {
    q: "예시 입력 -2가 ReLU에 들어가면 출력은 무엇인가요?",
    choices: ["-2", "0", "2"],
    answer: 1,
    why: "ReLU는 음수를 0으로 바꿉니다. (p.3, §3.1)",
    source: "p.3, §3.1",
  },
  {
    q: "그림 2의 \"가중치를 학습하는 8개 층\"은 어떤 구성인가요?",
    choices: ["합성곱 5개 + 완전연결 3개", "합성곱 3개 + 풀링 5개", "완전연결 8개"],
    answer: 0,
    why: "가중치를 학습하는 층을 셉니다. 풀링과 LRN은 이 8개에 더하지 않습니다. (pp.4-5, §3.5·그림 2)",
    source: "pp.4-5, §3.5·그림 2",
  },
  {
    q: "원문의 드롭아웃 설명으로 맞는 것은 무엇인가요?",
    choices: [
      "학습 때 매번 정확히 절반만 켭니다.",
      "테스트 때 최종 정답 확률을 절반으로 만듭니다.",
      "각 은닉 뉴런을 0.5 확률로 끄고, 테스트 때 은닉 뉴런 출력을 절반으로 만듭니다.",
    ],
    answer: 2,
    why: "맞추려는 것은 평균적 기여의 크기입니다. 매번 같은 결과를 만드는 규칙은 아닙니다. (p.6, §4.2)",
    source: "p.6, §4.2",
  },
];

/* ---------- 글 ---------- */

export default function App() {
  return (
    <Page
      title="AlexNet 쉽게 보기 (Krizhevsky·Sutskever·Hinton, 2012)"
      summary="AlexNet은 합성곱층 5개와 완전연결층 3개로 된 큰 신경망을 GPU 두 개로 학습해, ImageNet 사진 1000종 분류에서 top-5 오류율을 이전 최고 25.7%에서 17.0%로 낮춘 논문입니다. ReLU, 합성곱, 그림 2의 층 구조, 드롭아웃을 직접 움직여 보며 이해합니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "한 장면 비유", id: "analogy" },
          { label: "핵심 아이디어", id: "idea" },
          { label: "ReLU와 tanh", id: "relu" },
          { label: "합성곱", id: "conv" },
          { label: "그림 2를 한 층씩", id: "arch" },
          { label: "드롭아웃", id: "dropout" },
          { label: "결과", id: "results" },
          { label: "논문 근거 위치", id: "evidence" },
          { label: "주의", id: "caution" },
          { label: "확인 질문과 답", id: "quiz" },
          { label: "출처", id: "source" },
        ]}
      />

      <Section heading="한 장면 비유" id="analogy">
        <Text>
          사진 감식반이 사진 한 장을 받습니다. 처음 조원들은 작은 돋보기로 사진 여기저기를 훑으며 선과 색 같은 작은 단서를 찾습니다.
          다음 조원들은 그 단서를 모아 눈, 바퀴 같은 더 큰 모양을 찾습니다. 마지막 반장들은 모든 단서를 한데 모아 1000개 이름 가운데
          하나를 고릅니다. 반장들이 특정 동료 말에만 기대지 않도록 연습 때마다 절반쯤을 무작위로 쉬게 합니다.
        </Text>
        <Callout lead="비유의 한계" tone="warning">
          돋보기에 무엇을 볼지 사람이 정하지 않습니다. 필터 값은 학습으로 정해집니다. "눈, 바퀴 같은 모양"은 이해를 돕는 예시이며 논문이
          층마다 그렇게 정해 둔 것이 아닙니다.
        </Callout>
        <Table
          columns={["용어", "뜻"]}
          rows={[
            ["합성곱(convolution)", "작은 숫자판(필터)과 겹친 값들을 곱한 뒤 더하는 계산"],
            ["필터(filter, kernel)", "합성곱에 쓰는 작은 숫자판. 값은 학습으로 정해짐"],
            ["스트라이드(stride)", "필터가 한 번에 움직이는 간격"],
            ["활성화 함수(activation function)", "뉴런이 받은 값을 다음에 보낼 값으로 바꾸는 함수"],
            ["ReLU", "음수는 0으로, 양수는 그대로 보내는 활성화 함수"],
            ["포화(saturation)", "입력이 커져도 출력이 거의 변하지 않는 상태. tanh의 양 끝"],
            ["완전연결층(fully-connected layer)", "이전 층의 모든 출력과 연결된 층"],
            ["드롭아웃(dropout)", "학습 때 일부 뉴런 출력을 무작위로 0으로 만드는 방법"],
            ["top-5 오류율", "모델이 가장 그럴듯하다고 본 5개 안에 정답이 없는 사진의 비율 (p.2, §2)"],
          ]}
        />
      </Section>

      <Section heading="핵심 아이디어" id="idea">
        <Text>
          AlexNet은 ImageNet 대회(ILSVRC-2010) 사진 120만 장을 1000종으로 나누는 큰 합성곱 신경망입니다. 매개변수(학습하는 숫자)는
          6천만 개, 뉴런은 65만 개입니다. 합성곱층 5개 뒤에 완전연결층 3개가 오고, 마지막에 1000개 범주의 소프트맥스가 붙습니다 (p.1,
          초록).
        </Text>
        <Text>
          이렇게 큰 망을 빨리, 그리고 과적합(학습 데이터만 외우는 현상) 없이 학습하려고 논문은 아래 방법들을 씁니다. 각 방법의 효과는
          논문이 직접 잰 값입니다.
        </Text>
        <Table
          columns={["방법", "무엇을 하나", "논문이 보고한 효과", "위치"]}
          rows={[
            ["ReLU", "tanh 대신 음수만 0으로 자르는 함수", "4층 망이 CIFAR-10 학습 오류 25%에 tanh보다 6배 빨리 도달", "p.3, §3.1, 그림 1"],
            ["GPU 2개", "필터를 반씩 나누고 특정 층에서만 주고받음", "top-1·top-5 오류율 1.7%, 1.2% 감소", "p.3, §3.2"],
            ["국소 반응 정규화(LRN)", "같은 위치의 이웃 필터 반응으로 크기 조정", "top-1·top-5 오류율 1.4%, 1.2% 감소", "p.4, §3.3"],
            ["겹치는 풀링", "3 × 3 영역을 2칸씩 옮기며 최댓값", "top-1·top-5 오류율 0.4%, 0.3% 감소", "p.4, §3.4"],
            ["데이터 늘리기", "224 × 224 무작위 조각과 좌우 뒤집기, 색 바꾸기", "학습 세트 2048배, 색 바꾸기로 top-1 1% 이상 감소", "pp.5-6, §4.1"],
            ["드롭아웃", "완전연결층 2개에서 뉴런을 0.5 확률로 끔", "심한 과적합을 막음, 수렴 반복 수는 약 2배", "p.6, §4.2"],
          ]}
        />
        <Text>
          학습은 확률적 경사 하강법(묶음 128장, 모멘텀 0.9, 가중치 감쇠 0.0005)으로 했습니다. 사진 120만 장을 약 90번 돌렸고, GTX 580
          3GB GPU 두 개로 5~6일이 걸렸습니다 (pp.6-7, §5).
        </Text>
      </Section>

      <Section heading="ReLU와 tanh" id="relu" caption="그래프와 기울기는 정의에서 계산한 값입니다 (논문 밖)">
        <Text>
          입력이 커지면 출력도 계속 변할까요? 입력 슬라이더를 움직여 두 함수의 출력과 기울기(입력을 조금 바꿀 때 출력이 변하는 정도)를
          함께 보십시오. 쌍곡탄젠트(tanh)는 입력을 -1과 1 사이로 부드럽게 누릅니다. 그래서 양 끝에서 기울기가 0에 가까워집니다
          (포화). ReLU는 양수 쪽에서 기울기가 늘 1입니다 (p.3, §3.1).
        </Text>
        <ActLab />
        <Text>
          ReLU는 입력 0에서 꺾이므로 그 점의 미분값은 정의되지 않습니다. 논문은 이 차이 때문에 ReLU 망이 tanh 망보다 여러 배 빨리
          학습한다고 보고합니다. 그림 1의 4층 망에서는 6배였습니다 (p.3, 그림 1). 이 화면은 학습 시간이나 정확도를 계산하지 않습니다.
        </Text>
      </Section>

      <Section heading="합성곱" id="conv" caption="격자와 가중치는 모두 예시 값입니다 (논문 밖)">
        <Text>
          작은 필터가 한 칸씩 지나갑니다. 필터 크기와 이동 간격을 바꾸면 출력 격자의 크기가 달라집니다. 가운데 세로줄이 밝은 입력을
          넣었으니, 필터가 그 줄을 덮을 때 출력이 커지는지 보십시오 (pp.4-5, §3.5).
        </Text>
        <ConvLab />
        <Text>
          패딩(바깥에 칸을 덧붙이기)은 없습니다. 여기서는 가중치를 직접 정했지만, 논문의 필터 가중치는 학습으로 바뀝니다. AlexNet의
          첫 합성곱층은 11 × 11 × 3 필터 96개를 4픽셀 간격으로 움직입니다 (p.4, §3.5). 이 예시는 AlexNet 전체를 재현한 것이 아닙니다.
        </Text>
      </Section>

      <Section heading="그림 2를 한 층씩" id="arch" caption="층 크기는 논문 값입니다">
        <Text>
          앞의 합성곱층은 작은 영역의 패턴을 찾습니다. 뒤의 완전연결층은 이전 층의 모든 출력을 연결해 분류에 씁니다. 합성곱 5개와
          완전연결 3개의 역할을 구분해 보십시오. 점선 칸이 완전연결층입니다 (pp.4-5, §3.5·그림 2).
        </Text>
        <NetLab />
        <Text>
          입력은 224 × 224 × 3입니다 (p.4, §3.5). 원래 256 × 256 사진에서 224 × 224 조각을 무작위로 잘라 쓰기 때문입니다 (p.5, §4.1).
          중간 층의 공간 크기를 다시 계산하려면 패딩 설정이 필요한데, 이 PDF에서는 미확인입니다.
        </Text>
        <Text>
          최대 풀링(max-pooling)은 작은 영역의 최댓값만 남깁니다. 국소 반응 정규화(LRN)는 같은 위치에 있는 다른 필터의 반응을 함께 보고
          크기를 조정합니다. 두 연산은 "가중치를 학습하는 8개 층"에 따로 세지 않습니다.
        </Text>
      </Section>

      <Section heading="드롭아웃" id="dropout" caption="유지 확률 0.5는 논문 값, 뉴런 값과 가중치는 예시 값입니다">
        <Text>
          AlexNet은 완전연결층 1, 2에 드롭아웃을 씁니다. 학습 때 각 은닉 뉴런의 출력을 0.5 확률로 0으로 만듭니다. 매번 정확히 절반을
          끄는 규칙은 아닙니다. 테스트 때는 모든 뉴런을 쓰고 출력에 0.5를 곱합니다 (p.6, §4.2). 학습을 여러 번 뽑은 평균이 테스트의
          합에 가까워지는지 보십시오. 특히 "한 번의 결과"와 "여러 번의 평균"을 구분해 보십시오.
        </Text>
        <DropLab />
        <Callout lead={'"똑같이"의 뜻을 더 정확하게'}>
          맞추려는 것은 다음 층에 전달되는 값의 평균적 크기입니다. 특정 학습 1회와 테스트가 같은 결과를 낸다는 뜻은 아닙니다 (논문 밖:
          원문의 규칙을 풀어 쓴 계산). 유한한 표본 평균에는 흔들림이 남습니다. 뉴런 값 배율을 바꾸면 비교 조건이 달라지므로 표본을 새로
          시작합니다.
        </Callout>
        <Text>
          원문은 이 방법을 여러 드롭아웃 망의 예측 분포를 기하평균(곱셈을 바탕으로 구하는 평균)으로 합치는 것의 "합리적인 근사"라고
          설명합니다. 합의 평균이 맞는다고 최종 예측까지 정확히 같아지는 것은 아닙니다. 드롭아웃이 없으면 망이 심하게 과적합했고,
          드롭아웃을 쓰면 수렴까지 반복 수가 약 2배로 늘었습니다 (p.6, §4.2).
        </Text>
        <Text>
          AlexNet은 드롭아웃을 Hinton 외(2012, arXiv)의 "최근 기법"으로 인용합니다 (p.6, §4.2, 참고문헌 [10]). 드롭아웃은 2014년
          JMLR 논문(AlexNet 저자 세 명이 모두 공저)에서 자세히 정리됩니다. 그 논문은 테스트 때 출력이 아니라 나가는 가중치에 p를
          곱한다고 쓰는데, 다음 층이 받는 값은 같습니다. 얇아진 망 2^n개, 학습 때 1/p로 키우는 방식, PyTorch의 p 차이는{" "}
          <a href="/posts/dropout-easy/">Dropout 쉽게 보기</a>에서 직접 움직여 볼 수 있습니다.
        </Text>
      </Section>

      <Section heading="결과" id="results">
        <Text>아래 막대는 ILSVRC-2010 테스트 세트의 top-5 오류율입니다 (p.7, §6, 표 1). 낮을수록 좋습니다.</Text>
        <Bars
          emphasis={2}
          bars={[
            { label: "희소 부호화 (대회 당시 최고)", value: 28.2, display: "28.2%" },
            { label: "SIFT + FVs (이후 최고)", value: 25.7, display: "25.7%" },
            { label: "AlexNet (CNN)", value: 17.0, display: "17.0%" },
          ]}
        />
        <Table
          columns={["대회와 모델", "top-1", "top-5", "위치"]}
          rows={[
            ["ILSVRC-2010, 희소 부호화", "47.1%", "28.2%", "p.7, 표 1"],
            ["ILSVRC-2010, SIFT + FVs", "45.7%", "25.7%", "p.7, 표 1"],
            ["ILSVRC-2010, AlexNet", "37.5%", "17.0%", "p.7, 표 1"],
            ["ILSVRC-2012, 2위 (테스트)", "-", "26.2%", "p.7, 표 2"],
            ["ILSVRC-2012, AlexNet 1개 (검증)", "40.7%", "18.2%", "p.7, 표 2"],
            ["ILSVRC-2012, 7개 평균, 사전학습 포함 (테스트)", "-", "15.3%", "p.7, 표 2"],
          ]}
        />
        <Text>
          ILSVRC-2012의 15.3%는 망 하나가 아니라 비슷한 망 5개와 더 큰 데이터로 미리 학습한 망 2개의 예측을 평균한 값입니다 (p.7, §6).
          망 하나의 검증 top-5 오류율은 18.2%입니다.
        </Text>
      </Section>

      <Section heading="논문 근거 위치" id="evidence">
        <Table
          columns={["내용", "위치"]}
          rows={[
            ["120만 장, 1000종, 6천만 매개변수, 65만 뉴런, 합성곱 5개 + 완전연결 3개", "p.1, 초록"],
            ["top-1, top-5 오류율의 뜻, 256 × 256으로 줄이기", "p.2, §2"],
            ["ReLU 정의, tanh 대비 6배 빠른 학습", "p.3, §3.1, 그림 1"],
            ["GPU 2개 분할, 3GB 메모리 제약", "p.3, §3.2"],
            ["LRN, 겹치는 풀링", "p.4, §3.3, §3.4"],
            ["8개 층 구성과 필터 크기, 224 × 224 × 3 입력", "pp.4-5, §3.5, 그림 2"],
            ["데이터 늘리기", "pp.5-6, §4.1"],
            ["드롭아웃 0.5, 테스트 때 × 0.5, 완전연결층 2개, 수렴 약 2배", "p.6, §4.2"],
            ["학습 설정과 기간", "pp.6-7, §5"],
            ["ILSVRC-2010, 2012 결과", "p.7, §6, 표 1, 표 2"],
          ]}
        />
        <Callout lead="핵심 원문 문장 (p.6 §4.2)">
          "At test time, we use all the neurons but multiply their outputs by 0.5, which is a reasonable approximation to taking the
          geometric mean of the predictive distributions produced by the exponentially-many dropout networks."
        </Callout>
        <Callout lead="핵심 원문 문장 (p.6 §4.2)">
          "We use dropout in the first two fully-connected layers of Figure 2. Without dropout, our network exhibits substantial
          overfitting. Dropout roughly doubles the number of iterations required to converge."
        </Callout>
      </Section>

      <Section heading="주의" id="caution">
        <Callout lead="실험 화면은 AlexNet을 재현하지 않습니다" tone="warning">
          격자, 필터 가중치, 뉴런 값은 모두 예시 값입니다. 학습이나 정확도 측정은 하지 않습니다. 정확도 숫자는 모두 논문 표에서
          가져왔습니다.
        </Callout>
        <Callout lead={'"6배 빠름"은 특정 망의 값입니다'} tone="info">
          그림 1 캡션은 효과의 크기가 망 구조에 따라 다르다고 씁니다. 다만 ReLU 망은 늘 여러 배 빨랐다고 덧붙입니다 (p.3, 그림 1).
        </Callout>
        <Callout lead="포화 구간의 경계는 예시 기준입니다" tone="info">
          tanh 기울기 0.1 미만을 색칠한 기준은 이 글이 정한 것입니다 (논문 밖). 논문의 공식 경계가 아닙니다.
        </Callout>
        <Callout lead="중간 층의 크기는 미확인입니다" tone="info">
          중간 층의 공간 크기를 다시 계산하는 데 필요한 패딩 설정은 이 PDF에서 확인하지 못했습니다. 그래서 이 글은 필터 수와 크기만
          보여 줍니다.
        </Callout>
      </Section>

      <Section heading="확인 질문과 답" id="quiz">
        <Text>답을 누르면 바로 해설이 나옵니다. 정답을 본 뒤 선택을 바꿔 복습할 수 있습니다.</Text>
        <Quiz items={QUIZ} idPrefix="ax-quiz" />
      </Section>

      <Section heading="출처" id="source">
        <Text>
          Alex Krizhevsky, Ilya Sutskever, Geoffrey E. Hinton. "ImageNet Classification with Deep Convolutional Neural Networks".
          Advances in Neural Information Processing Systems 25 (NIPS 2012).
          https://proceedings.neurips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html
        </Text>
        <Text>
          쪽 번호는 PDF에 인쇄된 쪽 번호입니다. 함께 읽기: <a href="/posts/dropout-easy/">Dropout 쉽게 보기</a> (드롭아웃을 자세히 정리한
          2014년 JMLR 논문).
        </Text>
      </Section>
    </Page>
  );
}
