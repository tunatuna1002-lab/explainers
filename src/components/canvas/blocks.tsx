import { useContext, type CSSProperties, type ReactNode } from "react";
import { GridContext, KindContext } from "./context";
import { useGrokTheme } from "./theme";

export type Tone = "success" | "warning" | "danger";
export type CalloutTone = "info" | Tone;

export function Text({ children }: { children?: ReactNode }) {
  const theme = useGrokTheme();
  return (
    <p
      className="cv-text"
      style={{
        margin: 0,
        fontSize: theme.font.body1.fontSize,
        lineHeight: theme.font.body1.lineHeight,
        color: theme.text.primary,
      }}
    >
      {children}
    </p>
  );
}

export interface CalloutProps {
  lead?: string;
  tone?: CalloutTone;
  children?: ReactNode;
}

const ICONS: Record<CalloutTone, ReactNode> = {
  info: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5M10 6.2v.1" />
    </>
  ),
  success: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M6.5 10.2l2.4 2.4 4.6-5" />
    </>
  ),
  warning: (
    <>
      <path d="M10 2.8l7.6 13.4H2.4z" />
      <path d="M10 8v4M10 14.2v.1" />
    </>
  ),
  danger: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M7.2 7.2l5.6 5.6M12.8 7.2l-5.6 5.6" />
    </>
  ),
};

export function Callout({ lead, tone, children }: CalloutProps) {
  const theme = useGrokTheme();
  if (!lead && !children) return null;
  const palette = tone
    ? {
        info: { box: theme.fill.accentSubtle, head: theme.text.accent, body: theme.text.accentDeep },
        success: { box: theme.fill.successSubtle, head: theme.text.success, body: theme.text.successDeep },
        warning: { box: theme.fill.warningSubtle, head: theme.text.warning, body: theme.text.warningDeep },
        danger: { box: theme.fill.dangerSubtle, head: theme.text.danger, body: theme.text.dangerDeep },
      }[tone]
    : { box: theme.bg.subtle, head: theme.text.primary, body: theme.text.primary };
  // 가독성: 본문은 늘 먹색으로 두고, 판정 색은 왼쪽 선·아이콘·첫 줄에만 쓴다.
  const rule = tone ? palette.head : theme.border.strong;
  return (
    <div
      className="cv-callout"
      role="note"
      data-tone={tone ?? "neutral"}
      style={{
        background: palette.box,
        borderLeft: `3px solid ${rule}`,
        borderRadius: `0 ${theme.radius.md}px ${theme.radius.md}px 0`,
        color: theme.text.primary,
      }}
    >
      {tone ? (
        <svg
          className="cv-callout-icon"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke={palette.head}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {ICONS[tone]}
        </svg>
      ) : null}
      <div style={{ minWidth: 0 }}>
        {lead ? (
          <div className="cv-callout-lead" style={{ fontWeight: 600, color: palette.head, fontSize: theme.font.body1.fontSize, lineHeight: theme.font.body1.lineHeight }}>
            {lead}
          </div>
        ) : null}
        {children ? (
          <div style={{ fontSize: theme.font.body1.fontSize, lineHeight: theme.font.body1.lineHeight }}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}

export interface Step {
  title: ReactNode;
  detail?: ReactNode;
}

export function Steps({ steps }: { steps: readonly Step[] }) {
  const theme = useGrokTheme();
  if (steps.length === 0) return null;
  return (
    <ol className="cv-steps">
      {steps.map((s, i) => (
        <li key={i} className="cv-step">
          <span className="cv-step-rail" aria-hidden="true">
            <span
              className="cv-step-dot"
              style={{
                background: theme.fill.secondary,
                color: theme.text.primary,
                fontSize: theme.font.label.fontSize,
                fontWeight: 600,
              }}
            >
              {i + 1}
            </span>
            {i < steps.length - 1 ? <span className="cv-step-line" style={{ background: theme.border.default }} /> : null}
          </span>
          <div className="cv-step-text">
            <div style={{ fontWeight: 600, fontSize: theme.font.body1.fontSize, lineHeight: theme.font.body1.lineHeight, color: theme.text.primary }}>
              {s.title}
            </div>
            {s.detail ? (
              <div style={{ fontSize: theme.font.subtext.fontSize, lineHeight: theme.font.subtext.lineHeight, color: theme.text.secondary, marginTop: 2 }}>
                {s.detail}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export type TableCell = string | { text: string; tone?: Tone } | ReactNode;

export interface TableProps {
  columns: readonly string[];
  rows: readonly (readonly TableCell[])[];
  emphasis?: number;
  align?: readonly ("auto" | "start" | "end")[];
}

const isTonedCell = (c: unknown): c is { text: string; tone?: Tone } =>
  typeof c === "object" && c !== null && !Array.isArray(c) && "text" in c && typeof (c as { text: unknown }).text === "string" && !("props" in c);

const cellText = (c: TableCell): string | null =>
  typeof c === "string" ? c : typeof c === "number" ? String(c) : isTonedCell(c) ? c.text : null;

/** 숫자·날짜·한 단어로만 된 열은 오른쪽에 한 줄로, 구절이 든 열은 왼쪽에서 줄바꿈한다. 첫 열(라벨)은 늘 왼쪽이다. */
function autoEnd(rows: readonly (readonly TableCell[])[], col: number): boolean {
  if (col === 0) return false;
  let seen = false;
  for (const row of rows) {
    if (col >= row.length) continue;
    const t = cellText(row[col]);
    if (t === null) return false;
    if (/\s/.test(t.trim())) return false;
    seen = true;
  }
  return seen;
}

export function Table({ columns, rows, emphasis, align }: TableProps) {
  const theme = useGrokTheme();
  const width = Math.max(columns.length, ...rows.map((r) => r.length));
  const heads = Array.from({ length: width }, (_, i) => columns[i] ?? "");
  const ends = heads.map((_, i) => {
    const a = align?.[i] ?? "auto";
    return a === "end" || (a === "auto" && autoEnd(rows, i));
  });
  const wide = width >= 5;
  const toneColor = (t?: Tone) => (t ? theme.text[t] : undefined);
  // 가독성: 세로선과 바깥 상자를 빼고, 머리줄 아래 진한 선과 행 사이 가는 선만 둔다.
  const base = {
    padding: "11px 16px 11px 0",
    borderLeft: "none",
    borderTop: `1px solid ${theme.border.weak}`,
  } as const;
  return (
    <div
      className="cv-table-wrap cv-figure"
      style={{ borderTop: `1.5px solid ${theme.border.strong}`, borderBottom: `1.5px solid ${theme.border.strong}` }}
    >
      <table className="cv-table" style={{ minWidth: wide ? "max-content" : undefined }}>
        <thead>
          <tr>
            {heads.map((h, i) => (
              <th
                key={i}
                scope="col"
                style={{
                  ...base,
                  borderTop: "none",
                  borderBottom: `1px solid ${theme.border.strong}`,
                  textAlign: ends[i] ? "right" : "left",
                  fontSize: theme.font.subtext.fontSize,
                  lineHeight: theme.font.subtext.lineHeight,
                  fontWeight: 600,
                  color: theme.text.secondary,
                  whiteSpace: wide || ends[i] ? "nowrap" : undefined,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {heads.map((_, c) => {
                const cell = row[c];
                const toned = isTonedCell(cell);
                return (
                  <td
                    key={c}
                    style={{
                      ...base,
                      borderTop: r === 0 ? "none" : base.borderTop,
                      textAlign: ends[c] ? "right" : "left",
                      fontSize: theme.font.table.fontSize,
                      lineHeight: theme.font.table.lineHeight,
                      fontWeight: emphasis === c ? 500 : 400,
                      fontVariantNumeric: "tabular-nums",
                      color: toned ? toneColor((cell as { tone?: Tone }).tone) ?? theme.text.primary : theme.text.primary,
                      whiteSpace: wide || ends[c] ? "nowrap" : undefined,
                      verticalAlign: "top",
                    }}
                  >
                    {toned ? (cell as { text: string }).text : (cell as ReactNode)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 차트 한 장의 카드. Grid 칸 안에서는 이미 카드이므로 한 번 더 그리지 않는다. */
export function ChartCard({ children }: { children: ReactNode }) {
  const theme = useGrokTheme();
  const inGrid = useContext(GridContext);
  if (inGrid) return <div className="cv-figure">{children}</div>;
  return (
    <div
      className="cv-card cv-figure"
      style={{ border: `1px solid ${theme.border.weak}`, borderRadius: theme.radius.xl }}
    >
      {children}
    </div>
  );
}

export interface Bar {
  label: string;
  value: number;
  display: string;
  meta?: string;
}

export interface BarsProps {
  bars: readonly Bar[];
  emphasis?: number | "none";
}

export function Bars({ bars, emphasis }: BarsProps) {
  const theme = useGrokTheme();
  if (bars.length === 0) return null;
  const finite = bars.map((b) => (Number.isFinite(b.value) ? b.value : 0));
  const top = Math.max(...finite.map(Math.abs), 0) || 1;
  const strong =
    emphasis === "none" ? -1 : typeof emphasis === "number" ? emphasis : finite.indexOf(Math.max(...finite));
  return (
    <ChartCard>
      <div className="cv-bars">
        {bars.map((b, i) => {
          const ok = Number.isFinite(b.value);
          const negative = ok && b.value < 0;
          const color = negative
            ? theme.dataviz.negative
            : emphasis === "none" || i === strong
              ? theme.dataviz.categorical[0]
              : theme.dataviz.singleSeriesRest;
          return (
            <div key={i} className="cv-bar-row">
              <span
                className="cv-bar-label"
                title={b.label}
                style={{ fontSize: theme.font.body2.fontSize, lineHeight: theme.font.body2.lineHeight, color: theme.text.primary }}
              >
                {b.label}
              </span>
              <span className="cv-bar-track" style={{ background: theme.fill.secondary }}>
                {ok ? (
                  <span
                    className="cv-bar-fill"
                    style={{ width: `${(Math.abs(b.value) / top) * 100}%`, background: color }}
                  />
                ) : null}
              </span>
              <span
                className="cv-bar-value"
                style={{ fontSize: theme.font.body2.fontSize, lineHeight: theme.font.body2.lineHeight, color: theme.text.primary }}
              >
                {ok ? b.display : "–"}
                {b.meta ? (
                  <span style={{ marginLeft: 6, color: theme.text.tertiary, fontSize: theme.font.label.fontSize }}>{b.meta}</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

export function Grid({ columns = 2, children }: { columns?: 2 | 3 | 4 | 5 | 6 | 7; children?: ReactNode }) {
  const theme = useGrokTheme();
  if (!children) return null;
  return (
    <GridContext.Provider value>
      <KindContext.Provider value="grid">
        <div
          className="cv-grid cv-figure"
          style={
            {
              "--cv-cols": columns,
              "--cv-cell-border": `1px solid ${theme.border.weak}`,
              "--cv-cell-radius": `${theme.radius.xl}px`,
            } as CSSProperties
          }
        >
          {children}
        </div>
      </KindContext.Provider>
    </GridContext.Provider>
  );
}

export interface PropertyItem {
  label: string;
  value: ReactNode;
}

export function Properties({ items }: { items: readonly PropertyItem[] }) {
  const theme = useGrokTheme();
  if (items.length === 0) return null;
  return (
    <dl
      className="cv-props"
      style={{ fontSize: theme.font.subtext.fontSize, lineHeight: theme.font.subtext.lineHeight }}
    >
      {items.map((it, i) => (
        <div key={i} className="cv-prop">
          <dt style={{ color: theme.text.secondary }}>{it.label}</dt>
          <dd style={{ color: theme.text.primary }}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
