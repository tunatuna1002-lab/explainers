import { useContext, useEffect, useState } from "react";
import { PageContext, slugify } from "./context";
import { useGrokTheme } from "./theme";

export interface TableOfContentsItem {
  label: string;
  id?: string;
  /** 0은 절(기본), 1은 소절. 한 단계마다 16px 들여쓴다. */
  depth?: number;
}

export interface TableOfContentsProps {
  items: readonly TableOfContentsItem[];
  title?: string;
}

const itemId = (item: TableOfContentsItem) => item.id ?? slugify(item.label);

/**
 * 데스크톱에서는 왼쪽 열에 붙는(sticky) 목차이고, 1040px 미만에서는 본문 위로 온다.
 * 위치는 Page가 정한다. 현재 절은 IntersectionObserver로 강조한다.
 */
export function TableOfContents({ items, title }: TableOfContentsProps) {
  const theme = useGrokTheme();
  const { lang, numbers } = useContext(PageContext);
  const [active, setActive] = useState<string | null>(null);
  const heading = title ?? (lang.startsWith("ko") ? "목차" : "On this page");

  useEffect(() => {
    const targets = items
      .map((it) => document.getElementById(itemId(it)))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;
    const pick = () => {
      const line = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const el of targets) if (el.getBoundingClientRect().top <= line) current = el.id;
      setActive(current);
    };
    const io = new IntersectionObserver(pick, { rootMargin: "0px 0px -65% 0px", threshold: [0, 1] });
    targets.forEach((el) => io.observe(el));
    window.addEventListener("scroll", pick, { passive: true });
    pick();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", pick);
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="cv-toc" aria-label={heading}>
      <div className="cv-toc-title" style={{ color: theme.text.secondary }}>
        {heading}
      </div>
      <ol>
        {items.map((it) => {
          const id = itemId(it);
          const num = numbers.get(id);
          const on = active === id;
          return (
            <li key={id} style={{ paddingLeft: (it.depth ?? 0) * 16 }}>
              <a href={`#${id}`} className="cv-toc-link" data-active={on ? "true" : undefined} aria-current={on ? "location" : undefined}>
                {num !== undefined ? <span className="cv-toc-num">{String(num).padStart(2, "0")}</span> : null}
                <span className="cv-toc-text">{it.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
