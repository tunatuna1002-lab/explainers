import { useContext, type ReactNode } from "react";
import { KindContext, SectionInfoContext, slugify } from "./context";
import { useGrokTheme } from "./theme";

export interface SectionProps {
  heading?: string;
  id?: string;
  /** 제목 아래 조용한 한 줄(단위, 기간 등). */
  caption?: string;
  children?: ReactNode;
}

/**
 * Page 직속이면 번호 붙은 h2, 다른 Section 안이면 h3, Grid 칸이면 카드 제목이다.
 * `actions`·`collapsible`은 원본이 쓰지 않아 만들지 않았다(타입에서 뺌).
 */
export function Section({ heading, id, caption, children }: SectionProps) {
  const theme = useGrokTheme();
  const kind = useContext(KindContext);
  const info = useContext(SectionInfoContext);
  const anchor = kind === "page" ? (info?.id ?? id ?? (heading ? slugify(heading) : undefined)) : id;
  const headingId = anchor ? `${anchor}-heading` : undefined;

  const blocks = (
    <KindContext.Provider value="section">
      <SectionInfoContext.Provider value={null}>
        <div className="cv-blocks">{children}</div>
      </SectionInfoContext.Provider>
    </KindContext.Provider>
  );

  const captionEl = caption ? (
    <p
      style={{
        margin: 0,
        fontSize: theme.font.subtext.fontSize,
        lineHeight: theme.font.subtext.lineHeight,
        color: theme.text.secondary,
      }}
    >
      {caption}
    </p>
  ) : null;

  if (kind === "page") {
    return (
      <section id={anchor} className="cv-section" aria-labelledby={headingId}>
        {heading ? (
          <h2
            id={headingId}
            className="cv-h2"
            style={{
              fontSize: theme.font.heading2.fontSize,
              lineHeight: theme.font.heading2.lineHeight,
              fontWeight: 700,
              color: theme.text.primary,
            }}
          >
            {info ? (
              <span className="cv-num" aria-hidden="true" style={{ color: theme.text.tertiary }}>
                {String(info.num).padStart(2, "0")}
              </span>
            ) : null}
            <span>{heading}</span>
          </h2>
        ) : null}
        {captionEl}
        {blocks}
      </section>
    );
  }

  if (kind === "grid") {
    return (
      <section id={anchor} className="cv-cell">
        {heading ? (
          <h3
            id={headingId}
            style={{
              margin: 0,
              fontSize: theme.font.body1.fontSize,
              lineHeight: theme.font.body1.lineHeight,
              fontWeight: 600,
              color: theme.text.primary,
            }}
          >
            {heading}
          </h3>
        ) : null}
        {captionEl}
        {blocks}
      </section>
    );
  }

  return (
    <section id={anchor} className="cv-subsection" aria-labelledby={headingId}>
      {heading ? (
        <h3
          id={headingId}
          style={{
            margin: 0,
            fontSize: theme.font.heading3.fontSize,
            lineHeight: theme.font.heading3.lineHeight,
            fontWeight: 600,
            color: theme.text.primary,
          }}
        >
          {heading}
        </h3>
      ) : null}
      {captionEl}
      {blocks}
    </section>
  );
}
