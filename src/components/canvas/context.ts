import { createContext } from "react";

/** Section이 어디에 놓였는지: Page 직속(번호 절), 다른 Section 안(소절), Grid 칸(카드 제목). */
export type SectionKind = "page" | "section" | "grid";
export const KindContext = createContext<SectionKind>("page");

/** Page가 직속 Section마다 정해 주는 최종 id와 번호. */
export interface SectionInfo { id: string; num: number }
export const SectionInfoContext = createContext<SectionInfo | null>(null);

export interface PageMeta { lang: string; numbers: ReadonlyMap<string, number> }
export const PageContext = createContext<PageMeta>({ lang: "en", numbers: new Map() });

/** Grid 칸 안의 차트는 카드를 한 번 더 그리지 않는다. */
export const GridContext = createContext(false);

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}
