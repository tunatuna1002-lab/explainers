import katex from "katex";
import "katex/dist/katex.min.css";

export interface TexProps {
  /** LaTeX 식. */
  children: string;
  /** 한 줄 가운데 정렬 식이면 true. */
  display?: boolean;
}

/**
 * KaTeX 조판. canvas 키트 barrel 밖에 두어, 쓰는 글만 KaTeX를 번들에 넣는다.
 * TSX 글과 MDX 양쪽에서 `<Tex>x^2</Tex>`로 쓴다.
 */
export function Tex({ children, display = false }: TexProps) {
  const html = katex.renderToString(children, { displayMode: display, throwOnError: false });
  const Tag = display ? "div" : "span";
  return <Tag dangerouslySetInnerHTML={{ __html: html }} />;
}
