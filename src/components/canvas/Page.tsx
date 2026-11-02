import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { KindContext, PageContext, SectionInfoContext, slugify } from "./context";
import { Section, type SectionProps } from "./Section";
import { TableOfContents } from "./TableOfContents";
import { useGrokTheme } from "./theme";

export type PageWidth = "column" | "wide" | "full";

export interface PageProps {
  title: string;
  summary?: string;
  /** @deprecated 아무것도 그리지 않는다. 옛 페이지가 컴파일되도록 받기만 한다. */
  sources?: readonly string[];
  width?: PageWidth;
  /** 키트 고정 문구(목차 제목, Heatmap 범례)의 언어. d.ts에는 없고 원본이 넘긴다. */
  lang?: string;
  children?: ReactNode;
}

/**
 * 제목 + TL;DR 상자 + 왼쪽 목차 + 번호 절. 직계 자식을 훑어
 * TableOfContents는 왼쪽 열로 옮기고, Section에는 id와 번호를 준다.
 * 번호는 렌더 중 카운터가 아니라 자식 순서로 정하므로 SSR·hydration에서 어긋나지 않는다.
 */
export function Page({ title, summary, width = "column", lang = "en", children }: PageProps) {
  const theme = useGrokTheme();
  let toc: ReactElement | null = null;
  const used = new Set<string>();
  const numbers = new Map<string, number>();
  let count = 0;
  const body: ReactNode[] = [];

  Children.toArray(children).forEach((child, i) => {
    if (isValidElement(child) && child.type === TableOfContents) {
      toc = child;
      return;
    }
    if (isValidElement<SectionProps>(child) && child.type === Section) {
      const { id: given, heading = "" } = child.props;
      let id = given ?? (slugify(heading) || "section");
      if (!given) {
        const root = id;
        for (let n = 2; used.has(id); n++) id = `${root}-${n}`;
      }
      used.add(id);
      const num = ++count;
      numbers.set(id, num);
      body.push(
        <SectionInfoContext.Provider key={child.key ?? i} value={{ id, num }}>
          {child}
        </SectionInfoContext.Provider>,
      );
      return;
    }
    body.push(child);
  });

  return (
    <PageContext.Provider value={{ lang, numbers }}>
      <KindContext.Provider value="page">
        <article className="cv-page" data-width={width} lang={lang}>
          <header className="cv-head">
            <h1
              className="cv-title"
              style={{
                fontSize: theme.font.heading1.fontSize,
                lineHeight: theme.font.heading1.lineHeight,
                fontWeight: 650,
                color: theme.text.primary,
              }}
            >
              {title}
            </h1>
            {summary ? (
              <aside
                className="cv-tldr"
                style={{
                  background: theme.bg.subtle,
                  borderLeft: `2px solid ${theme.text.accent}`,
                  borderRadius: `0 ${theme.radius.md}px ${theme.radius.md}px 0`,
                }}
              >
                <div className="cv-tldr-label" style={{ color: theme.text.accent }}>
                  TL;DR
                </div>
                <p style={{ margin: 0, color: theme.text.primary }}>{summary}</p>
              </aside>
            ) : null}
          </header>
          {toc ? <div className="cv-toc-slot">{toc}</div> : null}
          <div className="cv-body">{body}</div>
        </article>
      </KindContext.Provider>
    </PageContext.Provider>
  );
}
