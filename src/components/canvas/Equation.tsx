import { Children, type ReactNode } from "react";
import { useGrokTheme } from "./theme";

export interface EquationProps {
  label?: string;
  children?: ReactNode;
}

/** 한 줄 가운데 정렬, 항 사이 10px, 위아래 16px. 문자열은 있는 그대로 표시한다. */
export function Equation({ label, children }: EquationProps) {
  const theme = useGrokTheme();
  const terms = Children.toArray(children);
  if (terms.length === 0) return null;
  return (
    <div
      className="cv-equation cv-figure"
      style={{ fontSize: theme.font.body1.fontSize, lineHeight: theme.font.body1.lineHeight, color: theme.text.primary }}
    >
      <div className="cv-eq-line">
        {terms.map((t, i) => (
          <span key={i} className="cv-eq-term">
            {t}
          </span>
        ))}
      </div>
      {label ? <span style={{ color: theme.text.secondary }}>{label}</span> : null}
    </div>
  );
}

export function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  const theme = useGrokTheme();
  return (
    <span className="cv-frac">
      <span className="cv-frac-num">{num}</span>
      <span className="cv-frac-den" style={{ borderTop: `1px solid ${theme.text.primary}` }}>
        {den}
      </span>
    </span>
  );
}

export function Pow({ base, exp }: { base: ReactNode; exp: ReactNode }) {
  const tall = typeof base !== "string" && typeof base !== "number";
  return (
    <span className="cv-pow" data-tall={tall ? "true" : undefined}>
      <span>{base}</span>
      <span className="cv-pow-exp">{exp}</span>
    </span>
  );
}

export function Sqrt({ children }: { children?: ReactNode }) {
  const theme = useGrokTheme();
  return (
    <span className="cv-sqrt">
      <span className="cv-sqrt-sign" aria-hidden="true">
        √
      </span>
      <span className="cv-sqrt-body" style={{ borderTop: `1px solid ${theme.text.primary}` }}>
        {children}
      </span>
    </span>
  );
}
