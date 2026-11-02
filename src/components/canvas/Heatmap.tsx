import { useContext } from "react";
import { PageContext } from "./context";
import { ChartCard } from "./blocks";
import { useGrokTheme } from "./theme";

export interface HeatmapProps {
  rows: readonly string[];
  columns: readonly string[];
  values: readonly number[][];
  max?: number;
}

/** 칸 27~54px. 0·음수·빠진 값은 회색 칸이다. 너무 좁으면 가로 스크롤한다. */
export function Heatmap({ rows, columns, values, max }: HeatmapProps) {
  const theme = useGrokTheme();
  const { lang } = useContext(PageContext);
  if (rows.length === 0 || columns.length === 0) return null;
  const flat = values.flat().filter((v) => Number.isFinite(v));
  const top = max ?? Math.max(...flat, 0);
  const ramp = theme.dataviz.sequential;
  const [low, high] = lang.startsWith("ko") ? ["낮음", "높음"] : ["Fewer", "More"];
  const step = (v: number) => {
    if (!Number.isFinite(v) || v <= 0 || top <= 0) return null;
    return Math.min(ramp.length - 1, Math.max(0, Math.ceil((v / top) * ramp.length) - 1));
  };
  return (
    <ChartCard>
      <div className="cv-heat-legend" style={{ color: theme.text.tertiary, fontSize: theme.font.label.fontSize, lineHeight: theme.font.label.lineHeight }}>
        <span>{low}</span>
        {ramp.map((c, i) => (
          <span key={i} className="cv-heat-swatch" style={{ background: c }} />
        ))}
        <span>{high}</span>
      </div>
      <div className="cv-heat-scroll">
        <div
          className="cv-heat"
          style={{ gridTemplateColumns: `max-content repeat(${columns.length}, minmax(27px, 54px))` }}
          role="table"
        >
          <span />
          {columns.map((c, i) => (
            <span
              key={i}
              className="cv-heat-col"
              style={{ color: theme.text.secondary, fontSize: theme.font.label.fontSize, lineHeight: theme.font.label.lineHeight }}
            >
              {c}
            </span>
          ))}
          {rows.map((r, ri) => (
            <HeatRow key={ri} label={r} cols={columns} data={values[ri] ?? []} step={step} ramp={ramp} />
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

function HeatRow({
  label, cols, data, step, ramp,
}: {
  label: string;
  cols: readonly string[];
  data: readonly number[];
  step: (v: number) => number | null;
  ramp: readonly string[];
}) {
  const theme = useGrokTheme();
  return (
    <>
      <span
        className="cv-heat-row"
        style={{ color: theme.text.secondary, fontSize: theme.font.label.fontSize, lineHeight: theme.font.label.lineHeight }}
      >
        {label}
      </span>
      {cols.map((c, ci) => {
        const v = data[ci];
        const s = step(v);
        return (
          <span
            key={ci}
            className="cv-heat-cell"
            title={`${label} → ${c}: ${Number.isFinite(v) ? v : "–"}`}
            style={{ background: s === null ? theme.fill.secondary : ramp[s] }}
          />
        );
      })}
    </>
  );
}
