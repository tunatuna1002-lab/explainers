# explainers 구현 계획

목표: Grok Page 원본 `llm-page.tsx`를 import 경로만 바꿔 정적 사이트의 첫 글로 게시한다. 결정 근거와 미결 질문은 `DECISION_REVIEW.md`에 있다.

## 1. 폴더 구조
```
astro.config.mjs  package.json  tsconfig.json  .gitignore   # screenshots/ dist/ 제외
scripts/screenshot.mjs   scripts/smoke.mjs
src/components/canvas/   # index.ts(barrel), theme.ts, dag.ts, 부품별 .tsx
src/components/Tex.tsx   # KaTeX 부품. barrel 밖에 두어 쓰는 글만 번들에 넣는다
src/content.config.ts
src/content/posts/llm/   # index.mdx(frontmatter + 삽입), post.tsx(원본)
src/layouts/BaseLayout.astro   src/pages/index.astro   src/pages/posts/[slug].astro
src/styles/tokens.css    src/styles/global.css
```

## 2. 패키지 (2026-11-02 `npm view` 확인, Node 26.12 / astro는 Node 22.23.4 이상 요구)
- 런타임: astro 7.4.4, @astrojs/mdx 8.1.2, @astrojs/react 7.1.2, react·react-dom 19.3.1, @base-ui/react 1.9.0, katex 0.19.1, tailwindcss·@tailwindcss/vite 4.3.3
- 개발: typescript **6.0.3**, @astrojs/check 0.9.12, @types/react·@types/react-dom 19.3.0, playwright 1.64.1
- 주의: typescript 최신 7.0.2는 쓰지 않는다(@astrojs/check 피어가 ^5·^6). @base-ui-components/react는 @base-ui/react로 이름이 바뀌었다.
- 넣지 않음: remark-math, rehype-katex, @astrojs/markdown-remark(이유는 D5), 웹폰트.

## 3. 부품 (`src/components/canvas/`) — 원본이 쓰는 19개
굵게 쓴 props는 원본이 실제로 쓴다. 표에 없는 prop(Section `actions`·`collapsible`, Grid `joined`·`plain`, Diagram `person`·`horizontal`)은 타입에서 빼서 컴파일 오류로 드러나게 한다.

| 부품 | props | 구현 요점 |
|---|---|---|
| Page | **title, summary, width, lang**, sources(무시) | 제목 + summary는 TL;DR 상자. 직계 자식을 훑어 TableOfContents는 왼쪽 열로 옮기고, Section에 번호를 준다. d.ts에 없는 `lang`을 추가한다 |
| Section | **heading, id**, caption | 깊이를 context로 판별: Page 직속 h2+번호, 중첩 h3, Grid 칸은 카드 제목. id 기본값은 heading slug |
| TableOfContents | **items{label,id}**, depth, title | 데스크톱 sticky, 1040px 미만은 본문 위. 현재 절 강조(IntersectionObserver) |
| Text / Callout | children / **lead, tone**, children | Callout tone 4종 + 중립 |
| Diagram | **nodes{id,label,detail,kind}, edges{from,to,label,dashed}, direction** | box·terminal·decision, 뒤로 가는 선은 옆 통로. 측정 없이 글자 수로 크기를 계산해 SSR과 일치시킨다. 축소 없이 가로 스크롤 |
| computeDAGLayout | d.ts와 동일 | `dag.ts` 순수 함수. 외부 라이브러리 없음 |
| Steps | **steps{title,detail}** | 원 번호, 잇는 선 |
| Table | **columns, rows**, emphasis, align | 숫자·단어 열 자동 정렬, 5열부터 가로 스크롤 |
| Bars | **bars{label,value,display}, emphasis**, meta | 6px 트랙, 강조 외 `singleSeriesRest` |
| Heatmap | **rows, columns, values, max** | 칸 27~54px, 0은 회색, 범례 |
| Equation, Frac, Sqrt, Pow | **children / num,den / children / base,exp**, label | CSS 조판. 지수 75%. 문자열은 그대로 표시(`d_k` 포함) |
| Segmented | **options{value,label}, value, onChange** | Base UI ToggleGroup. `value=[v]`, 빈 배열은 무시. d.ts는 2~5개지만 원본이 8개이므로 줄바꿈 허용 |
| Properties | **items{label,value}** | 라벨 열 고정폭, 행 간격 8px |
| Grid | **columns**, children | 칸마다 카드, 좁으면 1열 |
| useGrokTheme, useState | 원본은 border·radius·font·text·dataviz 사용 | 4절 토큰 매핑을 따른다. useState는 react 재수출 |

다음 글에서 필요할 때 추가: Rows, Metrics, LineChart, Columns, Pie 등. 없는 부품은 컴파일 오류로 알 수 있다.

## 4. 디자인 토큰 매핑
`tokens.css`가 유일한 값 원본이다. 밝음은 `:root`, 어두움은 `prefers-color-scheme: dark`. Tailwind `@theme`와 `theme.ts`가 같은 변수를 참조하고, `useGrokTheme()`는 `var(--…)` 문자열을 돌려준다.

- **d.ts에 값이 있음(그대로):** heading1 30/36 bold, heading2 24/30 bold, heading3 20/26 600, body1 16/24, table 15/22, subtext 14/20, body2 13/18, label 12/16, caption 11/16, code 13/20. radius 4·8·12·16·9999. weight 400·500·600.
- **간격(주석 값):** 절 64, 문단 16, 목록 24, 그림 32. 차트 카드 1px·r16·padding 20. Table 0.5px. Equation 간격 10·위아래 16.
- **잉크 비율(주석 값, 밝음/어두움):** text.secondary 60%, tertiary 40%. fill.secondary 9/17%, secondaryHover 15/28%, hover 6/8%, pressed 9/12%, 톤 subtle 9/17%. border 5·10·15·30·40%. areaAlpha 16/24%, bandAlpha 25%.
- **값 없음 → 임시값(D2):** 종이/잉크 밝음 `#FFFFFF`/`#111111`, 어두움 `#111111`/`#F5F5F5`. categorical `#2F6FED` `#E5B100` `#12A8C4`, other `#9AA0A6`, negative `#E5484D`. sequential `#DCE8FD` `#A9C6FA` `#6E9EF5` `#2F6FED` `#1B45A8`(어두움에서 뒤집음), singleSeriesRest는 1단계, blue5는 5단계. success `#1E8E3E`, warning `#B7791F`, danger `#D93025`. motion 120ms ease. letterSpacing 0.
- **글꼴:** XVF는 쓸 수 없다. `-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`. mono는 `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- **qlabs 틀:** 격자 `210px minmax(0,700px)`, 중단점 1040px, 절 번호는 흐린 두 자리(`01`). 틀의 색·글꼴도 위 토큰을 쓴다.

## 5. 글 추가 방법
1. `src/content/posts/<slug>/post.tsx`에 원본을 넣고 `"grok/canvas"`를 `"@/components/canvas"`로 바꾼다. 다른 줄은 고치지 않는다.
2. 같은 폴더 `index.mdx`를 쓴다. 상호작용이 없으면 `client:load`를 빼서 JS를 싣지 않는다.
   ```mdx
   ---
   title: "…"      # Page title과 같게
   summary: "…"
   date: 2026-11-02
   ---
   import Post from "./post.tsx";
   <Post client:load />
   ```
3. `content.config.ts`는 `**/index.mdx`만 읽고 폴더 이름을 slug로 쓴다. 홈은 `draft`가 아닌 글을 날짜 역순으로 보여 준다. 없는 부품은 `astro check`가 알려 준다.

## 6. 구현 순서와 검증
1. `npm install`(프로젝트 안) 후 빈 글로 MDX + island + Tailwind를 먼저 확인한다.
2. 토큰 → Page 틀 → 단순 부품 → 차트 → Diagram 순서로 만들고 원본을 옮긴다.
- 빌드: `npx astro check && npx astro build`. 미리보기: `npx astro preview`.
- 원본 대조: `diff <handoff>/llm-page.tsx src/content/posts/llm/post.tsx` 결과가 import 줄뿐이어야 한다.
- 스크린샷: `node scripts/screenshot.mjs`. Playwright `channel: "chrome"`로 설치된 Chrome을 쓴다(브라우저 다운로드 없음, 전역 캐시 안 씀). 1440·768·375px, 밝음·어두움, 전체 페이지, `screenshots/`에 저장.
- 동작 검사: `node scripts/smoke.mjs`. 콘솔 오류·hydration 경고 0, 1~8 클릭 시 Properties 변경, 목차 링크 이동, 375px에서 페이지 가로 넘침 0, 375px에서 목차가 본문 위.
- 빌드 후 JS 크기(gzip)를 `DECISION_REVIEW.md`에 적는다.

## 7. 위험 요소
| 위험 | 대응 |
|---|---|
| 색 값이 자료에 없다. 원본 렌더 화면도 없어 "같은 디자인"을 픽셀로 확인할 수 없다 | 임시값을 `tokens.css` 한 곳에 둔다. 사용자가 실제 값이나 원본 화면을 주면 교체한다(Q1) |
| 원본은 App 최상위에 `useState`가 있어 글 전체가 island가 된다 | SSR HTML + `client:load`. import만 바꾸는 규칙을 우선한다(D1). JS 크기를 잰다 |
| MDX 안 `client:load`가 Astro 7에서 예상과 다를 수 있다 | 1단계에서 확인. 실패하면 `src/pages/posts/<slug>.astro`로 정적 import한다 |
| `${색}${areaAlpha}` 이어 붙이기는 `var()`에서 깨진다(원본은 안 씀) | categorical·other·negative는 hex 상수로 둔다(양 모드 동일). 투명도는 `blueTint` 또는 `color-mix` |
| `theme.kind`는 서버에서 모른다(원본은 안 씀) | 서버는 `light`, hydration 뒤 실제 값 |
| 375px에서 Diagram 긴 라벨이 칸을 넘는다 | 키트 규칙대로 가로 스크롤. 스크린샷으로 확인 |
| 절 번호와 제목의 단계 번호가 겹친다(`03 1~2단계`) | 번호를 흐린 두 자리로 구분. 제목은 바꾸지 않는다 |
| 배포 대상이 사양에 없다 | `dist/`까지만 만든다. `site`·`base`는 환경 변수로 받고 내부 링크는 `BASE_URL`을 쓴다(Q3) |
