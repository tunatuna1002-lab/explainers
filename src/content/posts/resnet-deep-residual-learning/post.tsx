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
  Diagram,
  useGrokTheme,
  useMemo,
  useState,
} from "@/components/canvas";
import { Tex } from "@/components/Tex";

// 개념 위젯용 예시 값. 논문 실험 재현이 아니다.
const X = [3, 7, 2, 8, 5];

// 고정된 작은 흔들림. 같은 층, 같은 칸이면 늘 같은 값이 나온다.
function jitter(layer: number, i: number) {
  const s = Math.sin(layer * 12.9898 + i * 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

function run(depth: number, shortcut: boolean) {
  let v = X.slice();
  for (let l = 1; l <= depth; l++) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    v = shortcut
      ? v.map((a, i) => a + 0.3 * jitter(l, i))
      : v.map((a, i) => 0.85 * a + 0.15 * m + 0.6 * jitter(l, i));
  }
  return v;
}

function corr(a: number[], b: number[]) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let n = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    n += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return db === 0 ? 0 : n / Math.sqrt(da * db);
}

type Mode = "plain" | "residual";
type Depth = "2" | "10" | "30" | "50";

const MODE_OPTIONS = [
  { value: "plain" as const, label: "지름길 끄기 (plain)" },
  { value: "residual" as const, label: "지름길 켜기 (ResNet)" },
];

const DEPTH_OPTIONS = [
  { value: "2" as const, label: "2층" },
  { value: "10" as const, label: "10층" },
  { value: "30" as const, label: "30층" },
  { value: "50" as const, label: "50층" },
];

function ShortcutLab() {
  const [mode, setMode] = useState<Mode>("plain");
  const [depth, setDepth] = useState<Depth>("10");
  const n = Number(depth);
  const on = mode === "residual";
  const out = useMemo(() => run(n, on), [n, on]);
  const sim = Math.max(0, Math.round(corr(X, out) * 100));
  const now = on
    ? `지름길 켜짐: 원래 신호 x가 ${n}층 끝까지 그대로 옵니다. 각 층은 작은 수정분만 더합니다.`
    : `지름길 꺼짐: ${n}개 층이 신호를 매번 새로 만듭니다. 층이 많을수록 원래 모양이 흐려집니다.`;
  return (
    <>
      <Callout lead="지금 보고 있는 것" tone="info">
        {now}
      </Callout>
      <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode} />
      <Segmented options={DEPTH_OPTIONS} value={depth} onChange={setDepth} />
      <Table
        columns={["칸", "원래 신호 x", `${n}층 뒤 출력`]}
        rows={X.map((x, i) => [`칸 ${i + 1}`, String(x), out[i].toFixed(1)])}
      />
      <Properties items={[{ label: "원래 모양과 닮은 정도 (상관계수)", value: `${sim}%` }]} />
      <Text>개념 그림입니다. 논문 실험 재현이 아닙니다. 모든 숫자는 예시입니다.</Text>
    </>
  );
}

// 덧셈 뒤 ReLU(v1)와 덧셈 뒤 항등(v2)을 같은 숫자로 비교한다. 숫자는 예시.
type Unit = "post" | "pre";
type Case = "neg" | "pos" | "zero";

const UNIT_OPTIONS = [
  { value: "post" as const, label: "v1: 덧셈 뒤 ReLU" },
  { value: "pre" as const, label: "v2: 덧셈 뒤 그대로" },
];

const CASES: Record<Case, { x: number; f: number; label: string }> = {
  neg: { x: 1, f: -3, label: "x = 1, F(x) = -3" },
  pos: { x: 1, f: 2, label: "x = 1, F(x) = 2" },
  zero: { x: 2, f: 0, label: "x = 2, F(x) = 0" },
};

const CASE_OPTIONS = (Object.keys(CASES) as Case[]).map((k) => ({ value: k, label: CASES[k].label }));

function ActivationLab() {
  const [unit, setUnit] = useState<Unit>("post");
  const [c, setC] = useState<Case>("neg");
  const { x, f } = CASES[c];
  const sum = x + f;
  const out = unit === "post" ? Math.max(0, sum) : sum;
  // 지름길 경로로 출력에서 x까지 돌아가는 기울기. ReLU는 입력이 양수일 때만 1을 통과시킨다.
  const grad = unit === "post" ? (sum > 0 ? 1 : 0) : 1;
  const now =
    unit === "post"
      ? sum > 0
        ? `합 ${sum}이 양수라 ReLU를 그대로 통과합니다. 출력은 ${out}, 지름길 기울기는 1입니다.`
        : `합 ${sum}이 0 이하라 ReLU가 0으로 바꿉니다. 지름길로 온 x도 잘리고, 지름길 기울기도 0이 됩니다.`
      : `덧셈 뒤에 아무 연산이 없습니다. 출력은 x + F(x) = ${out}이고, 지름길 기울기는 언제나 1입니다.`;
  return (
    <>
      <Callout lead="지금 보고 있는 것" tone="info">
        {now}
      </Callout>
      <Segmented options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
      <Segmented options={CASE_OPTIONS} value={c} onChange={setC} />
      <Table
        columns={["단계", "값"]}
        rows={[
          ["지름길로 온 x", String(x)],
          ["잔차 경로 F(x)", String(f)],
          ["더하기 x + F(x)", String(sum)],
          [unit === "post" ? "ReLU 적용 뒤 출력" : "출력 (추가 연산 없음)", String(out)],
          ["지름길 경로의 기울기", { text: String(grad), tone: grad === 1 ? "success" : "danger" }],
        ]}
      />
      <Text>개념 예시입니다. 숫자는 예시이며, 실제 망에서는 원소마다 이 계산이 따로 일어납니다.</Text>
    </>
  );
}

// ---- 복습실 위젯 (잔차 합산, 표 2 비교, 차원 맞추기, 확인 퀴즈) ----

const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const signed = (n: number) => (n > 0 ? "+" + fmtN(n) : n < 0 ? "−" + fmtN(-n) : "0");

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
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
        style={{ width: "100%", minWidth: 0, minHeight: 36, margin: 0, accentColor: theme.text.accent }}
      />
    </div>
  );
}

function SmallButton({ onClick, children }: { onClick: () => void; children: string }) {
  const theme = useGrokTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        font: "inherit",
        ...theme.font.subtext,
        color: theme.text.primary,
        background: theme.bg.base,
        border: `1px solid ${theme.border.default}`,
        borderRadius: theme.radius.md,
        padding: "8px 12px",
        minHeight: 40,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

type OnOff = "on" | "off";
const SHORTCUT_OPTIONS = [
  { value: "on" as const, label: "지름길 켜기" },
  { value: "off" as const, label: "지름길 끄기" },
];

// 원 복습실 ① 잔차 합산. x는 앞 블록 ReLU 출력이라 0 이상으로 둔다. 모든 숫자는 예시.
function ResidualSumLab() {
  const theme = useGrokTheme();
  const [x, setX] = useState(5);
  const [f, setF] = useState(2);
  const [sc, setSc] = useState<OnOff>("on");
  const on = sc === "on";
  const s = on ? x : 0;
  const y = f + s;
  const z = Math.max(0, y);
  const formula =
    (on ? `y = F(x) + x = ${fmtN(f)} + ${fmtN(x)}` : `지름길 없음: y = F(x) = ${fmtN(f)}`) +
    ` = ${fmtN(y)}, ReLU 뒤 출력 = max(0, ${fmtN(y)}) = ${fmtN(z)}`;
  const note =
    on && f === 0
      ? `F(x) = 0입니다. 지름길이 입력을 그대로 보냅니다. y = x = ${fmtN(x)}이고 ReLU 뒤에도 같습니다. 이것이 항등 매핑입니다.`
      : on
        ? `지름길은 입력 ${fmtN(x)}을 보존하고, 잔차 ${signed(f)}를 더합니다. "F(x)를 0으로"를 눌러 비교해 보십시오.`
        : "지름길을 끄면 합산 직후 값은 F(x)뿐입니다. 입력을 그대로 보내는 경로가 없습니다. 항등 매핑을 만들려면 층들이 F(x) = x를 직접 배워야 합니다.";
  const arrow = theme.text.tertiary;
  const skip = theme.text.accent;
  const ink = theme.text.primary;
  return (
    <>
      <Callout lead="지금 보고 있는 것" tone={on ? "info" : "warning"}>
        {note}
      </Callout>
      <Slider id="rn-x" label="입력 x (예시)" value={x} min={0} max={10} step={1} show={fmtN(x)} onChange={setX} />
      <Slider id="rn-f" label="잔차 F(x), 곧 더할 변화량 (예시)" value={f} min={-5} max={5} step={1} show={signed(f)} onChange={setF} />
      <Segmented options={SHORTCUT_OPTIONS} value={sc} onChange={setSc} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <SmallButton onClick={() => setF(0)}>F(x)를 0으로</SmallButton>
        <SmallButton
          onClick={() => {
            setX(5);
            setF(2);
            setSc("on");
          }}
        >
          처음으로
        </SmallButton>
      </div>
      <div style={{ border: `1px solid ${theme.border.weak}`, borderRadius: theme.radius.lg, background: theme.bg.subtle }}>
        <svg viewBox="0 0 560 245" width="100%" role="img" aria-label={`입력 ${x}, 잔차 ${f}, 지름길 값 ${s}, 합 ${y}, ReLU 뒤 ${z}`} style={{ display: "block" }}>
          <defs>
            <marker id="rn-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={arrow} />
            </marker>
            <marker id="rn-arrow-skip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={skip} />
            </marker>
          </defs>
          <path d="M140 124 H175 V55 H220" fill="none" stroke={arrow} strokeWidth={3} markerEnd="url(#rn-arrow)" />
          <path d="M380 55 H470 V97" fill="none" stroke={arrow} strokeWidth={3} markerEnd="url(#rn-arrow)" />
          <path
            d="M140 124 H175 V202 H470 V149"
            fill="none"
            stroke={skip}
            strokeWidth={4}
            markerEnd="url(#rn-arrow-skip)"
            opacity={on ? 1 : 0.2}
            strokeDasharray={on ? undefined : "7 6"}
          />
          <rect x="35" y="91" width="105" height="66" rx="12" fill={theme.bg.base} stroke={theme.border.strong} />
          <text x="87.5" y="115" fontSize="16" textAnchor="middle" fill={ink}>입력 x</text>
          <text x="87.5" y="145" fontSize="24" fontWeight="700" textAnchor="middle" fill={ink}>{fmtN(x)}</text>
          <rect x="220" y="22" width="160" height="66" rx="12" fill={theme.fill.accentSubtle} stroke={theme.border.default} />
          <text x="300" y="47" fontSize="16" textAnchor="middle" fill={ink}>잔차 경로 F(x)</text>
          <text x="300" y="76" fontSize="24" fontWeight="700" textAnchor="middle" fill={ink}>{signed(f)}</text>
          <circle cx="470" cy="123" r="26" fill={theme.bg.base} stroke={theme.border.strong} strokeWidth={2} />
          <text x="470" y="132" fontSize="28" textAnchor="middle" fill={ink}>+</text>
          <text x="470" y="184" fontSize="18" fontWeight="700" textAnchor="middle" fill={ink}>{`y = ${fmtN(y)}`}</text>
          <text x="308" y="190" fontSize="17" textAnchor="middle" fill={on ? skip : theme.text.tertiary}>
            {on ? `입력 그대로: ${fmtN(x)}` : "지름길 꺼짐: 0"}
          </text>
          <text x="309" y="234" fontSize="14" textAnchor="middle" fill={theme.text.secondary}>지름길은 입력을 합산 위치로 보냅니다</text>
        </svg>
      </div>
      <Properties
        items={[
          { label: "지름길이 보내는 값", value: fmtN(s) },
          { label: "합산 직후 y", value: fmtN(y) },
          { label: "ReLU 뒤 출력", value: fmtN(z) },
        ]}
      />
      <Text>{formula}</Text>
      <Text>
        원논문 블록은 합산 뒤에 ReLU(음수를 0으로 바꾸는 함수)를 둡니다. 그래서 x가 작고 F(x)가 크게 음수이면 합이 0 아래로 내려가 출력이 0이 됩니다.
        이 점은 아래 "이후 연구 흐름"의 v2 위젯에서 이어 봅니다. F(x)는 원래 학습으로 정해지는 값인데, 여기서는 계산을 보려고 직접 조절합니다. 학습
        과정이나 정확도를 흉내 낸 화면이 아닙니다. 근거: p.2 그림 2, p.3 §3.1~3.2, 식 (1).
      </Text>
    </>
  );
}

// 원 복습실 ② 표 2 비교. 값은 논문 표 2 그대로, 차이는 계산값.
const T2 = [
  { name: "일반망 18층 (plain-18)", depth: 18, error: 27.94, res: false },
  { name: "일반망 34층 (plain-34)", depth: 34, error: 28.54, res: false },
  { name: "ResNet 18층", depth: 18, error: 27.88, res: true },
  { name: "ResNet 34층", depth: 34, error: 25.03, res: true },
];

type DepthPick = "18" | "34";
type View = "both" | "one";
const PICK_OPTIONS = [
  { value: "18" as const, label: "18층 강조" },
  { value: "34" as const, label: "34층 강조" },
];
const VIEW_OPTIONS = [
  { value: "both" as const, label: "두 깊이 함께 보기" },
  { value: "one" as const, label: "선택한 깊이만" },
];

function Table2Lab() {
  const [pick, setPick] = useState<DepthPick>("34");
  const [view, setView] = useState<View>("both");
  const d = Number(pick);
  const visible = view === "both" ? T2 : T2.filter((r) => r.depth === d);
  const emphasis = visible.findIndex((r) => r.depth === d && r.res);
  const p = T2.find((r) => r.depth === d && !r.res)!.error;
  const r = T2.find((r2) => r2.depth === d && r2.res)!.error;
  return (
    <>
      <Callout lead={`${d}층끼리 비교 (계산값)`} tone="info">
        {`일반망 ${p.toFixed(2)} − ResNet ${r.toFixed(2)} = ${(p - r).toFixed(2)}%p 낮아졌습니다. ${
          d === 18 ? "18층에서는 거의 같습니다. 깊이를 34층으로 바꿔 보십시오." : "34층에서는 차이가 커집니다."
        }`}
      </Callout>
      <Segmented options={PICK_OPTIONS} value={pick} onChange={setPick} />
      <Segmented options={VIEW_OPTIONS} value={view} onChange={setView} />
      <Bars
        emphasis={emphasis}
        bars={visible.map((b) => ({
          label: b.name,
          value: b.error,
          display: `${b.error.toFixed(2)}%`,
          meta: b.depth === d && b.res ? "낮을수록 좋음" : undefined,
        }))}
      />
      <Table
        columns={["비교", "계산", "차이 (계산값)"]}
        rows={[
          ["plain 18 → 34층", "28.54 − 27.94", { text: "0.60%p 나빠짐", tone: "danger" }],
          ["ResNet 18 → 34층", "27.88 − 25.03", { text: "2.85%p 좋아짐 (논문 2.8%)", tone: "success" }],
          ["18층 plain vs ResNet", "27.94 − 27.88", "0.06%p 차이"],
          ["34층 plain vs ResNet", "28.54 − 25.03", { text: "3.51%p 차이 (논문 3.5%)", tone: "success" }],
        ]}
      />
      <Text>
        조건: ImageNet 검증 데이터, top-1 오류율(가장 높은 점수의 답이 틀린 비율), 10-crop(잘라낸 이미지 10개로 평가), 각 단일 모델입니다. ResNet은
        차원이 늘 때 0으로 채우는 옵션 A를 써서 평범한 망과 파라미터 수가 같습니다 (p.5 §4.1, 표 2). 표 2는 검증 오류입니다. 학습 오류 곡선은 그림 4에서
        따로 봅니다. 그림 4의 검증 곡선은 가운데 한 조각(center crop) 기준이므로 표 2의 10-crop 수치와 같은 조건으로 읽으면 안 됩니다.
      </Text>
    </>
  );
}

// 원 복습실 ③ 차원 맞추기. 가중치와 잔차 값은 설명용 예시.
const WS = [
  [1, 0],
  [0, 1],
  [1, 1],
];
const FV = [1, -1, 2];
type Opt = "A" | "B";
const OPT_OPTIONS = [
  { value: "A" as const, label: "옵션 A: 0 채우기" },
  { value: "B" as const, label: "옵션 B: 사영(1×1 합성곱)" },
];

function DimensionLab() {
  const [a, setA] = useState(2);
  const [opt, setOpt] = useState<Opt>("A");
  const xv = [a, 1];
  const proj = opt === "B";
  const sv = proj ? WS.map((row) => row.reduce((acc, w, j) => acc + w * xv[j], 0)) : [...xv, 0];
  const yv = FV.map((f, i) => f + sv[i]);
  const cells = (v: number[]) => v.map((n) => fmtN(n));
  return (
    <>
      <Callout lead={proj ? "B: 가중치를 곱해 세 칸으로 바꿉니다" : "A: 입력 뒤에 0 한 칸을 붙입니다"} tone="info">
        {proj
          ? `예시 가중치 Ws = [[1, 0], [0, 1], [1, 1]]. 셋째 값은 1×${a} + 1×1 = ${sv[2]}입니다. 이 3×2 예시에는 학습할 가중치가 6개 있습니다(편향 제외).`
          : `입력 [${xv.join(", ")}]을 [${sv.join(", ")}]으로 바꿉니다. 새 칸은 0이고, 더 학습할 가중치는 0개입니다.`}
      </Callout>
      <Slider id="rn-a" label="입력 첫째 값 a (예시)" value={a} min={0} max={6} step={1} show={fmtN(a)} onChange={setA} />
      <Segmented options={OPT_OPTIONS} value={opt} onChange={setOpt} />
      <Table
        columns={["벡터", "1번째", "2번째", "3번째"]}
        rows={[
          ["입력 x (두 칸)", ...cells(xv), "없음"],
          ["잔차 F(x) (세 칸)", ...cells(FV)],
          [proj ? "지름길 Ws·x" : "지름길 [x, 0]", ...cells(sv)],
          ["합산 직후 y", ...cells(yv)],
        ]}
      />
      <Text>{`[${FV.join(", ")}] + [${sv.join(", ")}] = [${yv.join(", ")}] (예시 계산)`}</Text>
      <Text>
        잔차와 지름길은 같은 위치의 숫자끼리 더하므로 칸 수(채널 수, 특징을 담는 칸의 개수)가 같아야 합니다. 사영(projection)은 입력에 가중치를 곱해 크기를
        맞추는 계산이고, 논문은 1×1 합성곱을 씁니다. 화면의 가중치는 고정한 예시이며 실제 모델에서는 학습합니다. 이미지의 가로·세로 크기까지 줄어드는
        곳에서는 A, B 모두 보폭(stride) 2를 씁니다. 이 화면은 그 공간 축소는 계산하지 않습니다 (p.3~4 §3.3).
      </Text>
    </>
  );
}

const QUIZ = [
  {
    q: "지름길을 켰습니다. 입력 x = 5, 잔차 F(x) = 0이면 합산 직후 y는 얼마인가요?",
    source: "p.3 §3.2 식 (1), 예시 값",
    opts: ["0", "5", "10", "입력만으로 계산할 수 없다"],
    answer: 1,
    why: [
      "잔차는 0이지만 지름길에서 입력 5를 더합니다.",
      "y = F(x) + x = 0 + 5 = 5입니다.",
      "입력 5를 한 번만 더하므로 y는 5입니다.",
      "잔차와 입력이 모두 주어졌으므로 0 + 5를 계산할 수 있습니다.",
    ],
  },
  {
    q: "§3.3의 옵션 A에서 채널 수를 늘리는 방법은 무엇인가요?",
    source: "p.3~4 §3.3",
    opts: ["늘어난 칸을 0으로 채운다", "늘어난 칸을 1로 채운다", "지름길에 학습할 가중치를 반드시 추가한다", "잔차 경로를 없애고 입력만 쓴다"],
    answer: 0,
    why: [
      "옵션 A는 늘어난 칸을 0으로 채우며 학습할 가중치를 더하지 않습니다.",
      "옵션 A는 늘어난 칸을 0으로 채웁니다.",
      "가중치로 바꾸는 사영은 옵션 B입니다.",
      "옵션 A도 잔차 경로와 지름길을 더합니다.",
    ],
  },
  {
    q: "결과 절의 표 2 막대그래프가 나타내는 값은 무엇인가요?",
    source: "p.5 표 2, 10-crop, 각 단일 모델",
    opts: ["ImageNet 학습 데이터의 top-1 오류", "ImageNet 테스트 데이터의 top-5 오류", "ImageNet 검증 데이터의 top-1 오류", "ImageNet 검증 데이터의 top-5 오류"],
    answer: 2,
    why: [
      "표 2는 검증 데이터의 오류입니다. 학습 오류 곡선은 그림 4에 있습니다.",
      "표 2는 테스트가 아니라 검증 데이터이고, 지표도 top-1입니다.",
      "표 2는 ImageNet 검증 데이터의 top-1 오류를 10-crop으로 평가합니다.",
      "표 2의 지표는 top-5가 아니라 top-1 오류입니다.",
    ],
  },
];

function QuizLab() {
  const theme = useGrokTheme();
  const [ans, setAns] = useState<(number | null)[]>(QUIZ.map(() => null));
  const done = ans.filter((a) => a !== null).length;
  const correct = ans.reduce<number>((n, a, i) => n + (a === QUIZ[i].answer ? 1 : 0), 0);
  return (
    <>
      <Text>{`${done} / ${QUIZ.length}문제 선택${done ? `, ${correct}개 정답` : ""}`}</Text>
      {QUIZ.map((item, i) => {
        const pickd = ans[i];
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text>
              <strong>{`${i + 1}. ${item.q}`}</strong> ({item.source})
            </Text>
            <div role="radiogroup" aria-label={`${i + 1}번 문제 선택지`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {item.opts.map((o, j) => (
                <button
                  key={j}
                  type="button"
                  role="radio"
                  aria-checked={pickd === j}
                  onClick={() => setAns((prev) => prev.map((v, k) => (k === i ? j : v)))}
                  style={{
                    font: "inherit",
                    ...theme.font.body2,
                    textAlign: "left",
                    color: theme.text.primary,
                    background: pickd === j ? theme.fill.accentSubtle : theme.bg.base,
                    border: `1px solid ${pickd === j ? theme.text.accent : theme.border.default}`,
                    borderRadius: theme.radius.md,
                    padding: "8px 12px",
                    minHeight: 44,
                    cursor: "pointer",
                  }}
                >
                  {`${String.fromCharCode(65 + j)}. ${o}`}
                </button>
              ))}
            </div>
            {pickd !== null && (
              <Callout lead={pickd === item.answer ? "정답입니다" : "다시 생각해 보십시오"} tone={pickd === item.answer ? "success" : "warning"}>
                {item.why[pickd]}
              </Callout>
            )}
          </div>
        );
      })}
      <div>
        <SmallButton onClick={() => setAns(QUIZ.map(() => null))}>퀴즈 다시 풀기</SmallButton>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Page
      title="ResNet 쉽게 보기: 잔차 학습"
      summary="층을 더 쌓았더니 학습 오차까지 커졌습니다. ResNet은 층이 결과 전체 H(x)가 아니라 입력에 더할 수정분 F(x)만 배우게 하고, 출력을 F(x) + x로 바꿔서 152층까지 깊이의 이득을 얻었습니다. 1년 뒤 후속 논문은 덧셈 뒤 ReLU까지 없애 지름길을 완전히 깨끗하게 만들었습니다. 잔차 합산, 표 2 비교, 차원 맞추기는 위젯으로 직접 계산해 보고, 끝의 확인 퀴즈로 점검합니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "문제와 기존 방법의 한계", id: "problem" },
          { label: "핵심 아이디어와 모델 구조", id: "idea" },
          { label: "학습 방법", id: "training" },
          { label: "실험 설정", id: "setup" },
          { label: "결과", id: "results" },
          { label: "계산 비용과 구현", id: "cost" },
          { label: "한계", id: "limits" },
          { label: "이후 연구 흐름", id: "after" },
          { label: "선행 개념", id: "prereq" },
          { label: "공부하며 짚은 질문", id: "qa" },
          { label: "확인 퀴즈", id: "quiz" },
          { label: "개념 관계와 꼭 지킬 구분", id: "distinctions" },
          { label: "처음 이해한 것과 정정", id: "corrections" },
          { label: "다음에 공부할 질문", id: "next" },
          { label: "참고 문헌", id: "refs" },
        ]}
      />

      <Section heading="문제와 기존 방법의 한계" id="problem">
        <Text>
          논문: Deep Residual Learning for Image Recognition (He, Zhang, Ren, Sun, 2015, CVPR 2016). 아래 쪽 번호는 arXiv v1 기준입니다.
        </Text>
        <Steps
          steps={[
            { title: "깊이는 중요합니다", detail: "당시 ImageNet 최고 결과는 16층(VGG)에서 30층(BN-Inception) 깊이의 모델이었습니다 (p.1 §1)." },
            { title: "기울기 소실은 대부분 해결됐습니다", detail: "기울기 소실·폭발(vanishing/exploding gradients)은 정규화된 초기화와 배치 정규화(BN)로 대부분 해결됐다고 씁니다 (p.1 §1)." },
            { title: "그런데 깊을수록 나빠졌습니다", detail: "층을 더 쌓자 정확도가 포화된 뒤 빠르게 떨어졌습니다. 이것을 성능 저하 문제(degradation problem)라고 부릅니다." },
            { title: "과적합이 아닙니다", detail: "과적합이면 학습 오차는 낮고 테스트 오차만 높아야 합니다. 여기서는 학습 오차(training error)도 커졌습니다 (그림 1, 그림 4). 학습을 3배 더 해도 같았습니다 (p.5 각주 3)." },
            { title: "표현 능력이 아니라 최적화 문제입니다", detail: "깊은 망은 얕은 망의 해를 표현할 수 있습니다. 문제는 학습이 그 해를 찾지 못한다는 점입니다. 저자는 수렴 속도가 매우 느릴 수 있다고 추측만 합니다 (p.5 §4.1)." },
          ]}
        />
        <Callout lead="구성된 해 논증 (p.1 §1)" tone="info">
          20층 망을 학습한 뒤 10층을 더 붙여 30층으로 만든다고 합시다. 붙인 10층이 입력을 그대로 내보내면, 30층 망은 20층 망과 똑같은 함수가 됩니다.
          따라서 깊은 망이 더 나쁠 이유가 없습니다. 그런데 학습 알고리즘(solver)은 이 해조차 찾지 못했습니다.
        </Callout>
        <Table
          columns={["방법", "지름길", "차이 (p.2 §2)"]}
          rows={[
            ["하이웨이 네트워크 (highway network)", "학습되는 문(gate)이 있어 닫힐 수 있음", "100층 넘는 깊이에서 정확도 향상을 보이지 못함"],
            ["ResNet", "가중치 없는 항등 지름길, 항상 열림", "늘 잔차를 배우고 x가 늘 통과함"],
          ]}
        />
      </Section>

      <Section heading="핵심 아이디어와 모델 구조" id="idea">
        <Section heading="항등 매핑">
          <Text>
            항등 매핑(identity mapping)은 입력을 바꾸지 않고 그대로 내보내는 함수입니다. 입력이 5면 출력도 5입니다. 입력이 벡터 [1, 2, 3]이면 출력도
            [1, 2, 3]입니다. 새로 붙인 층이 아직 쓸모 있는 변환을 찾지 못했다면, 입력을 그대로 넘기는 것이 합리적인 기본값입니다.
          </Text>
        </Section>
        <Section heading="잔차 학습">
          <Tex display>{"\\mathcal{H}(x) = \\mathcal{F}(x) + x"}</Tex>
          <Tex display>{"\\mathcal{F}(x) = \\mathcal{H}(x) - x"}</Tex>
          <Text>
            층 묶음이 목표 매핑 H(x) 대신 잔차 함수(residual function) F(x)를 배웁니다 (p.2 §1). 잔차는 "목표 출력과 입력의 차이"입니다.
          </Text>
          <Table
            columns={["상황 (예시)", "입력 x", "목표 H(x)", "배울 잔차 F(x)"]}
            rows={[
              ["바꿀 것이 있음", "5", "8", "3"],
              ["바꿀 것이 없음", "5", "5", "0"],
            ]}
          />
          <Text>
            저자의 가설은 이렇습니다. 최적 매핑이 항등 매핑에 가깝다면, 잔차를 0 쪽으로 보내는 편이 비선형 층 여러 개로 항등 매핑을 맞추는 것보다
            쉽습니다 (p.3 §3.1). 다만 0은 목표가 아니라 기본 선택지입니다. 바꿀 것이 있으면 층은 그만큼의 수정분을 배웁니다.
          </Text>
        </Section>
        <Section heading="직접 계산: 지름길에 잔차 더하기">
          <Text>위 표를 손으로 계산해 봅니다. 지름길을 켠 채 F(x)를 0으로 바꾸면 블록이 저절로 항등 매핑이 됩니다.</Text>
          <ResidualSumLab />
        </Section>
        <Section heading="잔차 블록 (그림 2를 다시 그림)">
          <Diagram
            direction="vertical"
            nodes={[
              { id: "x", label: "입력 x", kind: "terminal" },
              { id: "w1", label: "합성곱 → BN → ReLU", series: 0 },
              { id: "w2", label: "합성곱 → BN", detail: "출력: 잔차 F(x)", series: 0 },
              { id: "add", label: "더하기 F(x) + x", series: 1 },
              { id: "r2", label: "ReLU" },
              { id: "y", label: "출력 y", kind: "terminal" },
            ]}
            edges={[
              { from: "x", to: "w1", label: "잔차 경로" },
              { from: "w1", to: "w2" },
              { from: "w2", to: "add" },
              { from: "x", to: "add", label: "지름길: x 그대로", dashed: true },
              { from: "add", to: "r2" },
              { from: "r2", to: "y" },
            ]}
          />
          <Text>
            입력 x는 두 경로로 나뉩니다. 잔차 경로(residual branch)는 F(x)를 계산합니다. 지름길(shortcut connection)은 x를 그대로 전달합니다. 두 결과를
            원소별로 더한 뒤 ReLU를 한 번 더 씁니다 (p.3 §3.2). 지름길에는 가중치가 없어서 파라미터와 계산량이 늘지 않습니다. 차원이 달라지는 곳에서는
            세 방법을 비교했습니다 (p.4 §3.3, 표 3).
          </Text>
          <Table
            columns={["옵션", "방법", "결과"]}
            rows={[
              ["A", "늘어난 차원을 0으로 채움, 모두 가중치 없음", "평범한 망보다 크게 좋음"],
              ["B", "차원이 늘 때만 1×1 합성곱 사영(projection)", "A보다 조금 좋음"],
              ["C", "모든 지름길을 사영", "B보다 아주 조금 좋음, 차이가 작아 이후 쓰지 않음"],
            ]}
          />
        </Section>
        <Section heading="직접 계산: 칸 수가 다를 때 (옵션 A와 B)">
          <Text>입력은 두 칸, 잔차는 세 칸인 경우를 예로 듭니다. 옵션 A와 B로 지름길을 세 칸으로 맞춘 뒤 더해 봅니다.</Text>
          <DimensionLab />
        </Section>
        <Section heading="전체 망 (표 1)">
          <Text>
            34층 평범한 망은 VGG 방식을 따릅니다. 3×3 합성곱을 쓰고, 특징 맵 크기가 반이 되면 필터 수를 두 배로 합니다 (p.3 §3.3). 다운샘플링은
            conv3_1, conv4_1, conv5_1에서 stride 2로 합니다. 끝은 전역 평균 풀링, 1000-way 완전연결층, softmax입니다. 50층 이상은 병목
            블록(bottleneck block)을 씁니다. 1×1(차원 축소), 3×3, 1×1(차원 복원) 세 층입니다 (그림 5).
          </Text>
          <Table
            columns={["모델", "블록", "단계별 블록 수 (conv2~5)"]}
            rows={[
              ["ResNet-18", "3×3 두 층", "2, 2, 2, 2"],
              ["ResNet-34", "3×3 두 층", "3, 4, 6, 3"],
              ["ResNet-50", "병목 세 층", "3, 4, 6, 3"],
              ["ResNet-101", "병목 세 층", "3, 4, 23, 3"],
              ["ResNet-152", "병목 세 층", "3, 8, 36, 3"],
            ]}
          />
        </Section>
        <Section heading="직접 보기: 지름길이 원래 신호를 지키는 모습">
          <ShortcutLab />
        </Section>
      </Section>

      <Section heading="학습 방법" id="training">
        <Section heading="ImageNet (p.4 §3.4)">
          <Table
            columns={["항목", "값"]}
            rows={[
              ["초기화", "He 초기화 [13], 처음부터 학습"],
              ["정규화", "각 합성곱 바로 뒤, 활성화 앞에 BN"],
              ["최적화", "SGD, 미니배치 256, 모멘텀 0.9"],
              ["학습률", "0.1에서 시작, 오차가 정체되면 10으로 나눔"],
              ["반복 수", "최대 60만 회 (60 × 10^4)"],
              ["가중치 감쇠", "0.0001"],
              ["드롭아웃", "쓰지 않음"],
            ]}
          />
        </Section>
        <Section heading="CIFAR-10 (p.7 §4.2)">
          <Table
            columns={["항목", "값"]}
            rows={[
              ["최적화", "SGD, 미니배치 128 (GPU 2개), 모멘텀 0.9, 가중치 감쇠 0.0001"],
              ["학습률", "0.1, 3.2만과 4.8만 반복에서 10으로 나눔, 6.4만에서 종료"],
              ["110층 예외", "학습 오차가 80% 아래가 될 때까지(약 400 반복) 0.01로 예열, 그 뒤 0.1"],
              ["기타", "He 초기화, BN, 드롭아웃 없음"],
            ]}
          />
          <Text>평범한 망과 잔차 망은 같은 방법으로 학습합니다. 지름길 말고는 차이가 없습니다.</Text>
        </Section>
      </Section>

      <Section heading="실험 설정" id="setup">
        <Table
          columns={["데이터", "규모", "평가 지표"]}
          rows={[
            ["ImageNet 2012 분류", "1000 클래스, 학습 128만, 검증 5만, 테스트 10만", "top-1, top-5 오류율"],
            ["CIFAR-10", "10 클래스, 학습 5만, 테스트 1만 (설정은 4.5만/0.5만 분할로 정함)", "분류 오류율"],
            ["PASCAL VOC, MS COCO", "물체 검출", "mAP"],
          ]}
        />
        <Steps
          steps={[
            { title: "ImageNet 학습 증강", detail: "짧은 변을 256~480에서 무작위로 정해 크기 조정, 224×224 무작위 자르기와 좌우 뒤집기, 픽셀 평균 빼기, 표준 색 증강 (p.4 §3.4)." },
            { title: "ImageNet 테스트", detail: "비교 실험은 10-crop 테스트, 최고 성능은 여러 크기(짧은 변 224, 256, 384, 480, 640)에서 점수를 평균." },
            { title: "CIFAR-10", detail: "4픽셀 패딩 뒤 32×32 무작위 자르기와 좌우 뒤집기. 테스트는 원본 한 장." },
            { title: "공정한 비교", detail: "평범한 망과 ResNet의 깊이, 너비, 파라미터 수를 같게 맞춥니다. 차이는 지름길 하나입니다." },
            { title: "검출 실험", detail: "Faster R-CNN은 그대로 두고 VGG-16만 ResNet-101로 바꿉니다 (p.8 §4.3)." },
          ]}
        />
      </Section>

      <Section heading="결과" id="results">
        <Section heading="같은 조건 비교 (표 2, ImageNet 검증 top-1 오류율 %, 10-crop)">
          <Text>같은 깊이끼리 먼저 비교한 뒤, 깊이를 바꿔 비교해 보십시오. 막대는 논문 표 2의 값이고 짧을수록 좋습니다.</Text>
          <Table2Lab />
          <Text>18층은 정확도가 비슷하지만 ResNet이 초반에 더 빨리 수렴합니다 (그림 4).</Text>
        </Section>
        <Section heading="더 깊은 망과 대회 결과">
          <Steps
            steps={[
              { title: "ResNet-152 단일 모델", detail: "top-5 검증 오류율 4.49%로, 이전의 모든 앙상블 결과보다 좋습니다 (표 4)." },
              { title: "앙상블", detail: "top-5 테스트 오류율 3.57%로 ILSVRC 2015 분류 1위입니다 (표 5)." },
              { title: "깊이의 이득", detail: "50/101/152층은 34층보다 확실히 좋고, 성능 저하가 보이지 않습니다 (p.6)." },
              { title: "다른 과제", detail: "COCO 검출 mAP@[.5, .95]가 6.0%p 올라 상대 28% 향상입니다. ImageNet 검출·위치 찾기, COCO 검출·분할도 1위입니다 (p.8)." },
            ]}
          />
        </Section>
        <Section heading="CIFAR-10 (표 6, 테스트 오류율 %)">
          <Table
            columns={["층 수", "파라미터", "오류율"]}
            rows={[
              ["20", "0.27M", "8.75"],
              ["32", "0.46M", "7.51"],
              ["44", "0.66M", "7.17"],
              ["56", "0.85M", "6.97"],
              ["110", "1.7M", "6.43 (5회 중 최고, 평균 6.61)"],
              ["1202", "19.4M", "7.93"],
            ]}
          />
          <Text>
            ResNet 층 응답의 표준편차가 평범한 망보다 대체로 작습니다. 깊은 ResNet일수록 각 층이 신호를 덜 바꿉니다 (그림 7). 잔차가 실제로 0 근처라는
            관찰입니다.
          </Text>
        </Section>
      </Section>

      <Section heading="계산 비용과 구현" id="cost">
        <Bars
          emphasis="none"
          bars={[
            { label: "VGG-19", value: 19.6, display: "19.6 billion FLOPs" },
            { label: "VGG-16", value: 15.3, display: "15.3 billion FLOPs" },
            { label: "ResNet-18", value: 1.8, display: "1.8 billion FLOPs" },
            { label: "ResNet-34", value: 3.6, display: "3.6 billion FLOPs", meta: "VGG-19의 18%" },
            { label: "ResNet-50", value: 3.8, display: "3.8 billion FLOPs" },
            { label: "ResNet-101", value: 7.6, display: "7.6 billion FLOPs" },
            { label: "ResNet-152", value: 11.3, display: "11.3 billion FLOPs" },
          ]}
        />
        <Steps
          steps={[
            { title: "지름길은 거의 공짜입니다", detail: "항등 지름길은 원소별 덧셈만 더합니다 (p.3 §3.2)." },
            { title: "병목 블록은 실용적 선택입니다", detail: "학습 시간을 감당하려고 병목 블록을 썼다고 밝힙니다 (p.6 각주 4)." },
            { title: "병목에는 항등 지름길이 중요합니다", detail: "사영으로 바꾸면 시간 복잡도와 모델 크기가 두 배가 됩니다. 지름길이 고차원 양 끝에 연결되기 때문입니다 (p.6)." },
            { title: "미확인", detail: "ImageNet 학습에 쓴 GPU 수와 학습 시간은 본문에 없습니다. CIFAR-10은 GPU 2개, COCO 검출은 GPU 8개를 썼습니다." },
          ]}
        />
      </Section>

      <Section heading="한계" id="limits">
        <Table
          columns={["한계", "근거"]}
          rows={[
            ["성능 저하의 원인을 밝히지 못함, 앞으로 연구로 남김", "p.5 §4.1"],
            ["잔차가 왜 최적화하기 쉬운지는 가설이며, 실험으로만 뒷받침", "p.3 §3.1"],
            ["1202층은 학습 오차 0.1% 미만인데 테스트 7.93%로 110층(6.43%)보다 나쁨. 저자는 과적합으로 봄", "p.8, 표 6"],
            ["드롭아웃 같은 강한 규제는 일부러 쓰지 않음", "p.8"],
            ["비선형 층이 복잡한 함수를 근사한다는 전제 자체가 열린 문제", "p.3 각주 2"],
            ["덧셈 뒤 ReLU가 지름길로 온 x를 자를 수 있음. 이 점은 후속 논문이 고침", "다음 절 참고"],
          ]}
        />
      </Section>

      <Section heading="이후 연구 흐름" id="after">
        <Callout lead="원논문 밖 내용" tone="warning">
          이 절은 2015년 원논문이 아니라 후속 연구의 내용입니다. 원논문의 주장과 섞지 않도록 구분해 읽으십시오.
        </Callout>
        <Section heading="ResNet v2: 지름길을 완전히 깨끗하게 (He 외, 2016)">
          <Text>
            후속 논문 Identity Mappings in Deep Residual Networks는 블록 안의 연산 순서를 바꿨습니다. 원래 블록은 덧셈 뒤에 ReLU가 있습니다. 이것을
            사후 활성화(post-activation)라고 부릅니다. 새 블록은 BN과 ReLU를 합성곱 앞으로 옮기고, 덧셈 뒤에는 아무 연산도 두지 않습니다. 이것을 완전
            사전 활성화(full pre-activation)라고 부릅니다.
          </Text>
          <Table
            columns={["구분", "연산 순서", "블록 출력"]}
            rows={[
              ["v1 사후 활성화", "합성곱 → BN → ReLU → 합성곱 → BN → 더하기 → ReLU", "ReLU(x + F(x))"],
              ["v2 완전 사전 활성화", "BN → ReLU → 합성곱 → BN → ReLU → 합성곱 → 더하기", "x + F(x)"],
            ]}
          />
          <Text>
            v1에서는 합이 음수면 ReLU가 0으로 바꿉니다. 그러면 지름길로 온 x도 잘리고, 그 위치의 기울기도 0이 됩니다. v2에서는 덧셈 뒤가 비어 있어
            x가 그대로 남습니다. 앞의 "직접 계산: 지름길에 잔차 더하기" 위젯에서 x를 1, F(x)를 −3으로 두면 v1에서 출력이 0이 되는 것을 볼 수 있습니다. 아래에서는
            같은 숫자로 v1과 v2를 나란히 비교하고, 지름길 기울기까지 봅니다.
          </Text>
          <ActivationLab />
        </Section>
        <Section heading="역전파로 본 지름길 (v2 논문의 분석)">
          <Text>덧셈 뒤가 항등이면, 블록을 여러 개 이어도 앞 블록의 입력이 뒤 블록 출력에 그대로 더해집니다.</Text>
          <Tex display>{"x_{L} = x_{l} + \\sum_{i=l}^{L-1} \\mathcal{F}(x_i, W_i)"}</Tex>
          <Text>이를 연쇄법칙(chain rule)으로 미분하면 다음과 같습니다.</Text>
          <Tex display>{"\\frac{\\partial E}{\\partial x_{l}} = \\frac{\\partial E}{\\partial x_{L}} \\left( 1 + \\frac{\\partial}{\\partial x_{l}} \\sum_{i=l}^{L-1} \\mathcal{F}(x_i, W_i) \\right)"}</Tex>
          <Steps
            steps={[
              { title: "1이 핵심입니다", detail: "뒤쪽 기울기가 잔차 경로를 거치지 않고 앞쪽으로 그대로 전달되는 몫입니다. 벡터라면 1은 단위 행렬입니다." },
              { title: "기울기가 지워지기 어렵습니다", detail: "괄호 안의 둘째 항이 미니배치의 모든 샘플에서 정확히 -1이 될 수는 없으므로, 기울기가 상쇄되어 사라질 가능성이 낮다고 씁니다 (v2 논문)." },
              { title: "조건이 있습니다", detail: "이 식은 덧셈 뒤가 항등일 때 정확합니다. v1처럼 덧셈 뒤에 ReLU가 있으면 그대로 성립하지 않습니다." },
              { title: "완전한 보장은 아닙니다", detail: "직접 경로가 있다고 기울기 소실이나 폭발이 수학적으로 불가능해지는 것은 아닙니다." },
            ]}
          />
        </Section>
        <Section heading="v2 실험 결과 (CIFAR-10 테스트 오류율 %, 5회 중앙값)">
          <Table
            columns={["블록 구조", "ResNet-110", "ResNet-164"]}
            rows={[
              ["v1 원래 블록", "6.61", "5.93"],
              ["덧셈 뒤 BN", { text: "8.17", tone: "danger" }, "6.50"],
              ["덧셈 앞 ReLU", "7.84", "6.14"],
              ["ReLU만 사전 활성화", "6.71", "5.91"],
              ["완전 사전 활성화", { text: "6.37", tone: "success" }, { text: "5.46", tone: "success" }],
            ]}
          />
          <Steps
            steps={[
              { title: "더 깊은 망", detail: "ResNet-1001에서 CIFAR-10 오류율이 7.61%에서 4.92%로, CIFAR-100은 27.82%에서 22.71%로 줄었습니다." },
              { title: "ImageNet", detail: "ResNet-200 top-1 오류율이 21.8%에서 20.7%로 줄었습니다 (단일 크롭)." },
              { title: "지름길을 건드리면 나빠집니다", detail: "지름길에 상수 곱, 문(gate), 1×1 합성곱, 드롭아웃을 넣은 변형은 모두 원래 항등 지름길(6.61%)보다 나빴습니다. 일부는 학습에 실패했습니다." },
              { title: "주의", detail: "특정 구조, 데이터, 학습 조건에서 나온 실험 결과입니다. 모든 문제에서 사전 활성화가 낫다는 증명은 아닙니다." },
            ]}
          />
          <Text>
            참고: 원논문 표 6의 ResNet-110 6.43%는 5회 중 최고값이고, 평균은 6.61%입니다. v2 논문은 5회 중앙값 6.61%를 기준으로 씁니다. 두 숫자는
            충돌하지 않습니다.
          </Text>
        </Section>
        <Section heading="배치 정규화 해석의 변화">
          <Tex display>{"\\hat{x} = \\frac{x - \\mu_B}{\\sqrt{\\sigma_B^2 + \\epsilon}}, \\qquad y = \\gamma \\hat{x} + \\beta"}</Tex>
          <Text>
            μB는 미니배치 평균, σB²는 미니배치 분산입니다. ε은 0으로 나누는 것을 막는 작은 수입니다. γ와 β는 학습되는 크기와 이동입니다. 그래서 BN 출력이
            늘 평균 0, 분산 1인 것은 아닙니다.
          </Text>
          <Table
            columns={["구분", "내용"]}
            rows={[
              ["원래 동기 (Ioffe·Szegedy, 2015)", "앞 층 가중치가 바뀌면 뒤 층 입력 분포가 바뀐다는 내부 공변량 이동(internal covariate shift)을 줄이려 함"],
              ["보고된 효과", "학습 안정화, 더 큰 학습률 사용, 초기화에 덜 민감, 빠른 수렴, 일부 규제 효과"],
              ["후속 해석 (Santurkar 외, 2018)", "효과의 주된 이유가 손실 지형과 기울기를 더 매끄럽게 만드는 데 있다는 설명"],
            ]}
          />
          <Text>원래 제안 동기와 후속 연구가 찾은 작동 원리는 구분해야 합니다.</Text>
        </Section>
        <Section heading="손실 지형과 지름길 (Li 외, 2018)">
          <Text>
            손실 지형(loss landscape)은 파라미터를 바꿀 때 손실이 어떻게 변하는지 보여 주는 지형입니다. 파라미터는 너무 많아서, 기준점 θ*에서 두 방향
            δ, η만 골라 2차원으로 봅니다.
          </Text>
          <Tex display>{"L(\\theta^{*} + \\alpha\\,\\delta + \\beta\\,\\eta)"}</Tex>
          <Text>
            이 연구에서는 지름길이 있는 깊은 망의 지형이 더 매끄럽게 보였습니다. 다만 고차원에서 고른 두 방향만으로 최적화 전체를 설명할 수는 없습니다.
            또한 이 설명은 원논문의 제안 동기가 아니라 나중에 나온 해석입니다.
          </Text>
        </Section>
        <Section heading="그 밖의 흐름">
          <Table
            columns={["연도", "연구", "이어진 점"]}
            rows={[
              ["2016", "Wide ResNet", "깊이 대신 너비를 늘려도 효과적임"],
              ["2016", "Stochastic Depth", "학습 중 잔차 블록을 무작위로 건너뜀"],
              ["2016", "Veit 외, 앙상블 해석", "잔차 망이 비교적 얕은 경로들의 앙상블처럼 동작한다는 해석"],
              ["2017", "ResNeXt, DenseNet", "블록 안을 여러 갈래로 나누거나, 덧셈 대신 이어 붙이기로 연결"],
              ["2017", "Transformer", "층마다 잔차 연결과 레이어 정규화(LN)를 씀"],
            ]}
          />
          <Text>이 표의 내용은 원문을 다시 확인하지 않은 배경 지식입니다.</Text>
        </Section>
      </Section>

      <Section heading="이 논문을 읽기 전에 알아야 할 선행 개념" id="prereq">
        <Table
          columns={["개념", "짧은 정의", "이 논문에서 쓰는 곳"]}
          rows={[
            ["층, 가중치 (layer, weight)", "입력에 가중치를 곱하고 더하는 단위와 그 숫자", "잔차 블록"],
            ["합성곱 (convolution)", "작은 필터를 이미지 위로 밀며 특징을 뽑는 층", "3×3, 1×1 층"],
            ["ReLU", "음수는 0, 양수는 그대로. 비선형성을 만듦", "블록 안과 덧셈 뒤"],
            ["순전파, 역전파", "출력 계산과 각 가중치의 기울기 계산", "학습 전체"],
            ["연쇄법칙 (chain rule)", "합성 함수의 미분을 각 단계 미분의 곱으로 구함", "역전파 분석"],
            ["SGD, 모멘텀, 가중치 감쇠", "기울기로 가중치를 조금씩 바꾸는 방법과 보조 장치", "학습 방법"],
            ["배치 정규화 (BN)", "같은 특징을 배치에 걸쳐 표준점수로 맞춘 뒤 γ, β로 조정", "모든 합성곱 뒤"],
            ["He 초기화", "ReLU 망에 맞게 가중치 시작 크기를 정함", "초기화"],
            ["학습 오차와 테스트 오차", "학습 데이터 오차와 처음 보는 데이터 오차", "과적합과 성능 저하 구분"],
            ["top-1, top-5 오류율", "1순위 또는 5순위 안에 정답이 없는 비율", "결과 표"],
            ["10-crop 테스트", "한 이미지에서 조각 10개를 잘라 점수를 평균", "비교 실험"],
            ["FLOPs", "곱셈-덧셈 횟수, 곧 계산량", "계산 비용"],
            ["VGG", "3×3 합성곱을 깊게 쌓은 이전 대표 모델", "기준 모델"],
            ["항등 매핑 (identity mapping)", "출력이 입력과 같은 함수", "핵심 아이디어"],
          ]}
        />
      </Section>

      <Section heading="공부하며 짚은 질문" id="qa">
        <Section heading="Q1. 잔차 블록 그림은 순전파인가요?">
          <Text>
            답 요약: 그렇습니다. 블록 그림은 순전파(forward pass) 계산 순서입니다. 학습 중 바뀌는 것은 잔차 경로의 가중치뿐입니다. 지름길에는 가중치가
            없어 갱신할 것이 없습니다.
          </Text>
          <Text>논문 근거: 그림 2, p.3 §3.2.</Text>
        </Section>
        <Section heading="Q2. ReLU는 왜 비선형인가요?">
          <Text>
            답 요약: 선형 함수는 "더한 뒤 넣기 = 넣은 뒤 더하기"가 성립합니다. ReLU는 이를 깹니다. ReLU(−3) + ReLU(3) = 3이지만 ReLU(−3 + 3) = 0입니다.
            ReLU는 0에서 한 번 꺾이는 조각별 선형(piecewise linear) 함수입니다. 선형 층만 쌓으면 하나로 합쳐집니다(×2 다음 ×3은 ×6). 꺾임을 많이 이으면
            곡선을 근사할 수 있습니다.
          </Text>
          <Text>논문 근거: 근사 능력은 열린 문제라고 씀 (p.3 각주 2). 예시 계산은 논문 밖입니다.</Text>
        </Section>
        <Section heading="Q3. 왜 F(x) = 0이 쉬운가요?">
          <Text>
            답 요약: 최적 매핑이 항등 매핑이면, 평범한 블록은 층 묶음 전체가 H(x) = x를 근사해야 합니다. 잔차 블록은 F(x) = 0, 곧 가중치를 0 쪽으로
            보내면 됩니다. 예를 들어 ReLU 층 하나는 음수를 지우므로 혼자 항등 매핑이 될 수 없습니다. ReLU(x) − ReLU(−x) = x처럼 가중치를 +1과 −1로 정확히
            짝지어야 합니다 (논문 밖, 직접 계산). 저자는 잔차 구조를 사전 조건화(preconditioning)라고 부릅니다.
          </Text>
          <Text>논문 근거: p.2 §1, p.3 §3.1.</Text>
        </Section>
        <Section heading="Q4. ResNet은 기울기 소실을 풀었나요?">
          <Text>
            답 요약: 원논문 기준으로는 아닙니다. 기울기 소실은 초기화와 BN으로 대부분 해결된 상태였고, 원논문이 푼 문제는 성능 저하 문제입니다. 지름길이
            기울기를 직접 전달한다는 분석은 2016년 v2 논문의 것입니다. 그것도 기울기 문제가 완전히 사라진다는 뜻은 아닙니다.
          </Text>
          <Text>논문 근거: p.1 §1, p.5 §4.1, v2 논문 식 (5).</Text>
        </Section>
        <Section heading="Q5. BN과 LN은 무엇이 다른가요?">
          <Table
            columns={["구분", "배치 정규화 (BN)", "레이어 정규화 (LN)"]}
            rows={[
              ["계산", "표준점수, 그다음 γ 곱하고 β 더함", "같음"],
              ["묶는 방향", "같은 특징을 여러 샘플에 걸쳐 (세로)", "한 샘플의 여러 특징을 (가로)"],
              ["주 사용처", "합성곱 망, ResNet", "RNN, 트랜스포머"],
              ["발표", "2015", "2016 (ResNet 이후)"],
            ]}
          />
          <Text>논문 근거: ResNet은 합성곱 바로 뒤, 활성화 앞에 BN을 둠 (p.4 §3.4). LN 내용은 논문 밖입니다.</Text>
        </Section>
        <Section heading="Q6. ResNet v2는 BN을 빼서 좋아졌나요?">
          <Text>
            답 요약: 아닙니다. v2는 BN을 없애지 않았습니다. BN과 ReLU를 합성곱 앞으로 옮기고, 덧셈 뒤를 비워 지름길을 보존했습니다. v2 논문은 BN을
            완전히 뺀 구조를 실험하지 않았습니다. 오히려 덧셈 뒤에 BN을 두면 F(x) = 0이어도 출력이 x와 같지 않아 결과가 나빠졌습니다 (8.17%).
          </Text>
          <Text>
            참고한 블로그의 "BN까지 빼는 것이 가장 효과가 좋았다"는 문장은 무엇에서 뺐는지가 불분명합니다. 덧셈 뒤나 지름길 위에서 BN을 뺐다는 뜻으로
            읽어야 맞습니다 (추정).
          </Text>
        </Section>
        <Section heading="Q7. 이 논문은 수학 증명 논문인가요?">
          <Text>
            답 요약: 아닙니다. 실험 중심 논문입니다. 관찰, 논증, 가설, 설계, 실험 검증, 미해결 순서로 읽으면 구조가 보입니다. 문장마다 실험 사실인지,
            가설인지, 증명인지 구분하며 읽습니다.
          </Text>
          <Text>논문 근거: "We hypothesize" (p.2 §1), "will be studied in the future" (p.5 §4.1).</Text>
        </Section>
      </Section>

      <Section heading="확인 퀴즈" id="quiz" caption="답을 고르면 바로 설명이 나옵니다">
        <QuizLab />
      </Section>

      <Section heading="개념 관계와 꼭 지킬 구분" id="distinctions">
        <Table
          columns={["개념", "해결하려는 문제", "핵심 역할"]}
          rows={[
            ["배치 정규화", "학습 불안정과 최적화의 어려움", "활성화 값을 정규화"],
            ["항등 매핑", "바꿀 필요 없는 정보까지 변환하는 부담", "입력을 그대로 전달"],
            ["지름길 연결", "깊은 망의 최적화 문제", "직접 전달 경로 제공"],
            ["잔차 학습", "목표 함수를 통째로 배우는 부담", "입력 대비 변경량만 학습"],
            ["ReLU", "선형 층만으로는 표현이 부족함", "비선형성 제공"],
            ["사전 활성화", "덧셈 뒤 활성화가 직접 경로를 바꿈", "BN·ReLU를 잔차 경로 앞으로 이동"],
            ["손실 지형", "최적화가 얼마나 어려운지 보기 어려움", "파라미터 변화에 따른 손실 관찰"],
          ]}
        />
        <Steps
          steps={[
            { title: "항등 매핑과 잔차 학습은 다릅니다", detail: "항등 매핑은 H(x) = x입니다. 잔차 학습은 H(x)를 x + F(x)로 만드는 방식입니다." },
            { title: "모든 잔차를 0으로 만드는 것이 목표가 아닙니다", detail: "필요하면 항등 매핑을 쉽게 고를 수 있게 하고, 필요한 변환은 계속 배웁니다." },
            { title: "성능 저하는 과적합과 다릅니다", detail: "깊은 망의 학습 오차까지 높아지는 것이 핵심입니다." },
            { title: "BN의 원래 동기와 후속 해석을 나눕니다", detail: "내부 공변량 이동은 처음 제시된 설명이고, 손실 지형을 매끄럽게 한다는 것은 후속 해석입니다." },
            { title: "v2는 BN을 없앤 모델이 아닙니다", detail: "BN과 ReLU를 잔차 경로 앞으로 옮기고 덧셈 뒤를 비운 모델입니다." },
            { title: "지름길이 기울기 문제를 완전히 없애지는 않습니다", detail: "직접 경로가 생겨 최적화에 유리해질 뿐입니다." },
            { title: "원논문 동기와 후속 해석을 섞지 않습니다", detail: "원논문의 가설은 잔차가 최적화하기 쉽다는 것입니다. 역전파 분석과 손실 지형은 그 뒤에 나온 설명입니다." },
          ]}
        />
      </Section>

      <Section heading="처음 이해한 것과 정정" id="corrections">
        <Table
          columns={["처음 이해", "정정"]}
          rows={[
            ["ResNet은 기울기 소실을 문제로 지적했다", "성능 저하 문제를 지적했습니다. 기울기 소실은 원인일 가능성이 낮다고 썼습니다."],
            ["BN은 표준점수, LN은 평균을 낸다", "둘 다 표준점수를 냅니다. 묶는 방향만 다릅니다."],
            ["평범한 블록의 각 층이 H(x) = x를 근사한다", "층 하나가 아니라 쌓인 층 묶음 전체가 근사합니다."],
            ["ReLU 때문에 항등 매핑이 어렵다", "논문은 비선형 층 여러 개로 쓰며, 가설입니다."],
            ["가중치를 0으로 만들어 오차를 줄인다", "0은 출발점입니다. 층은 필요한 만큼 작은 수정분을 배웁니다."],
            ["꺾임을 많이 이으면 곡선이 된다", "맞습니다. 정확히는 곡선을 근사합니다."],
          ]}
        />
      </Section>

      <Section heading="다음에 공부할 질문" id="next">
        <Steps
          steps={[
            { title: "연쇄법칙으로 비교하기", detail: "같은 숫자 예제에서 사후 활성화와 사전 활성화의 미분 결과를 직접 계산해 비교합니다." },
            { title: "트랜스포머로 넓히기", detail: "트랜스포머의 Post-LN과 Pre-LN 구조에 같은 원리가 어떻게 적용되는지 봅니다." },
          ]}
        />
      </Section>

      <Section heading="참고 문헌" id="refs">
        <Table
          columns={["논문", "저자, 연도", "링크"]}
          rows={[
            ["Deep Residual Learning for Image Recognition", "He 외, 2015", "https://arxiv.org/abs/1512.03385"],
            ["Identity Mappings in Deep Residual Networks", "He 외, 2016", "https://arxiv.org/abs/1603.05027"],
            ["Residual Networks Behave Like Ensembles of Relatively Shallow Networks", "Veit 외, 2016", "https://arxiv.org/abs/1605.06431"],
            ["Batch Normalization", "Ioffe, Szegedy, 2015", "https://arxiv.org/abs/1502.03167"],
            ["How Does Batch Normalization Help Optimization?", "Santurkar 외, 2018", "https://arxiv.org/abs/1805.11604"],
            ["Visualizing the Loss Landscape of Neural Nets", "Li 외, 2018", "https://arxiv.org/abs/1712.09913"],
          ]}
        />
      </Section>
    </Page>
  );
}
