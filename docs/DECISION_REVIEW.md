# 결정과 명령 기록

## 계획 단계 결정 (2026-11-02)

| # | 결정 | 이유 | 버린 대안 |
|---|---|---|---|
| D1 | 글 전체를 island 하나로 hydrate한다 (SSR + `client:load`) | 원본 `App` 최상위에 `useState`가 있다. SPEC의 "import 경로만 바꾼다"와 "React는 상호작용 부분만"이 충돌한다. 내용 보존 규칙을 우선한다. 상호작용 없는 글은 directive를 빼서 JS 0으로 낸다 | 단계 탐색 부분만 별도 island로 분리: 원본 수정이 필요하다 |
| D2 | 색은 임시값을 쓰고 임시임을 표시한다 | `tokens.d.ts`는 타입과 주석뿐이고 hex 값이 키트 전체에 없다. SPEC은 값이 있다고 전제한다. 잉크 비율·글자 크기·radius·간격은 주석에 있어 그대로 쓴다 | dust.html 색 사용: SPEC은 틀만 qlabs로 정했다 |
| D3 | `useGrokTheme()`는 CSS 변수 문자열을 돌려준다 | 밝음·어두움을 SSR에서 깜빡임과 hydration 불일치 없이 처리한다. 원본의 inline style이 그대로 동작한다 | `matchMedia` + JS hex: 서버와 클라이언트 값이 달라진다 |
| D4 | TableOfContents는 Page가 직계 자식을 훑어 왼쪽 열로 옮긴다. 모바일도 같은 DOM을 위에 놓는다 | 원본은 TOC를 Page 안 본문 위치에 둔다. React 포털은 SSR에서 동작하지 않는다. DOM 하나로 중복이 없다 | qlabs처럼 목차 2벌: 중복 |
| D5 | KaTeX는 `Tex` 부품(`katex.renderToString`)으로 넣는다. 첫 글의 Equation은 CSS 조판이다 | d.ts의 Equation은 문자열과 Frac·Pow·Sqrt의 HTML 조판이고, 원본 값은 LaTeX가 아니다. 본문이 `√d_k`로 쓰므로 `d_k` 그대로가 일관된다. Astro 7 기본 처리기는 Sätteri라서 remark-math·rehype-katex를 쓰려면 unified 전환이 필요하다. rehype-katex는 katex ^0.16에 묶여 CSS 버전도 어긋난다. `Tex`는 TSX 글과 MDX 양쪽에서 동작한다 | remark-math + rehype-katex: TSX 글에서 쓸 수 없고 설정이 는다. Equation을 KaTeX로 렌더: 원본 조판과 달라진다 |
| D6 | Page에 `lang` prop을 추가한다. `ko`이면 키트 고정 문구를 한국어로 낸다(목차 제목 "목차", Heatmap 범례 "낮음"·"높음") | 원본이 `lang="ko"`를 넘기지만 d.ts `PageProps`에 없다. 고정 문구는 글 내용이 아니고, 한국어 글에 "Fewer/More"는 어텐션 값에 맞지 않는다 | 영어 유지 |
| D7 | summary는 TL;DR 상자로, Page 직속 Section은 번호 절로 낸다. 번호는 렌더 중 카운터가 아니라 Page의 자식 순서로 정한다 | SPEC의 qlabs 틀. 전역 카운터는 hydration과 StrictMode에서 어긋난다 | Section 내부 카운터 |
| D8 | 원본이 안 쓰는 부품과 구현이 큰 prop은 만들지 않고 타입에서 뺀다 | 동작 없는 prop을 받으면 다음 글이 조용히 틀어진다. 컴파일 오류가 더 낫다. SPEC도 "원본이 쓰는 것 전부"로 범위를 정한다 | 키트 전체 구현 |
| D9 | Diagram은 자체 `computeDAGLayout`과 글자 수 기반 크기로 그린다 | 키트 API와 같고, DOM 측정이 없어 SSR과 일치한다 | dagre·elk: 의존성 추가, API 불일치 |
| D10 | Playwright는 `channel: "chrome"`로 설치된 Chrome을 쓴다 | `npx playwright install`은 사용자 전역 캐시에 받는다. SPEC이 전역 설치를 금지한다 | 브라우저 다운로드 |
| D11 | typescript는 6.0.3으로 고정한다 | 최신 7.0.2는 @astrojs/check 0.9.12의 피어(^5·^6) 밖이다 | 7.x + check 생략 |
| D12 | 웹폰트를 넣지 않고 시스템 글꼴을 쓴다 | 키트 규칙이 "XVF가 없으면 시스템 글꼴"이다. 외부 요청이 없다 | Pretendard, Space Grotesk |

## 원본에서 발견한 점 (내용 규칙에 따라 고치지 않음)
- 8단계 설명이 엇갈린다. `llm-page.tsx:15`는 "4~7단계를 다시", `llm-page.tsx:238`은 "3~7단계를 다시"라고 쓴다. Diagram의 되돌림 선(`llm-page.tsx:139`)은 3단계 임베딩으로 간다.
- `Segmented`는 d.ts에서 2~5개인데 원본은 8개를 쓴다. `Page`의 `lang`도 d.ts에 없다. 부품을 원본에 맞춘다.

## 사용자 확인이 필요한 질문
- **Q1. 색 값:** 실제 Grok Page의 색 값이나 렌더 화면을 줄 수 있는가? 없으면 임시값으로 게시한다.
- **Q2. 8단계 문구:** "3~7"과 "4~7" 중 어느 쪽으로 고칠까? 답이 없으면 원문 그대로 둔다.
- **Q3. 배포 대상:** SPEC에 "테스트 배포"만 있고 대상이 없다. 배포는 외부 공개이므로 대상을 정한 뒤 진행한다. 권장은 GitHub Pages(공개 저장소 무료)다.
- **Q4. 공개 범위:** 키트 이름(`useGrokTheme` 등)과 원본 코드를 공개 저장소에 올려도 되는가? `handoff/`의 d.ts·dust.html·GIF는 커밋하지 않고, 타입은 새로 쓴다.

## 리뷰 기록
(설계 리뷰 후 작성)

## 명령 기록 (계획 단계)
- 읽기: `ls`, `find`, `wc`, `file`, `grep`, `sed`(handoff 조사)
- 버전: `npm view <패키지> version|peerDependencies|peerDependenciesMeta|engines|dependencies`
- GIF 첫 프레임 확인: `sips`(`/tmp/explainers-plan-gif/`에 출력)
- 문서 조회: Context7(Astro 업그레이드 안내, Base UI ToggleGroup)
- `npm install`과 코드 작성, 커밋은 하지 않았다.

---

# 구현 단계 기록 (2026-11-02)

## 사용한 명령
- 조사: `ls`, `find`, `wc`, `cat`/Read(SPEC·PLAN·handoff d.ts), `npm view <패키지> version`
- 설치(이 폴더 안에서만): `npm install astro@7.4.4 @astrojs/mdx@8.1.2 @astrojs/react@7.1.2 react@19.3.1 react-dom@19.3.1 @base-ui/react@1.9.0 katex@0.19.1 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3`, `npm install -D typescript@6.0.3 @astrojs/check@0.9.12 @types/react@19.3.0 @types/react-dom@19.3.0 @types/katex playwright@1.64.1`. 전역 설치 없음.
- 원본 이식: `cp handoff/llm-page.tsx src/content/posts/llm/post.tsx`, `sed`로 `"grok/canvas"` → `"@/components/canvas"`. `diff`로 import 줄 하나만 다름을 확인했다.
- 빌드: `npx astro sync`, `npm run build`(= `astro check && astro build`). 결과: 0 errors, 0 warnings, 2 페이지.
- 미리보기: `npx astro preview --port 4321`(= `npm run preview`). 끝난 뒤 `npx astro preview stop`으로 껐다(포트 4321 응답 없음 확인).
- 스크린샷·검사: `node scripts/screenshot.mjs <폴더> [--all]`, `node scripts/smoke.mjs`. Playwright `channel: "chrome"`(설치된 Google Chrome). `npx playwright install chromium`은 쓰지 않았다(D10).
- 크기: `gzip -9 -c`로 `dist/_astro/*.js` 측정.
- 리뷰: 이번 작업은 외부 리뷰어(agy·Grok)를 부르지 않았다. 구현 담당 지시에 리뷰 단계가 없다. 변경 후 리뷰는 별도로 받아야 한다.

## 결과
- `npm run build` 통과. 출력: `dist/index.html`, `dist/posts/llm/index.html`.
- 스크린샷: `explainers-ref/shots/desktop.png`(1440px 전체), `mobile.png`(390px 전체), `home.png`. 프로젝트 안 `screenshots/`(gitignore)에는 768px·어두움도 있다.
- `scripts/smoke.mjs` 11개 검사 모두 통과: 콘솔 오류·경고 0, 1440·375px 가로 넘침 0, 1↔8 클릭 시 Properties 변경, 눌린 항목 재클릭이 선택을 비우지 않음, 목차 링크 이동과 현재 절 강조, 스크롤 중 목차가 보임, 375px에서 목차가 본문 위.
- JS 크기(gzip, 글 페이지 전체): `client`(React 런타임 + Astro island) 65.7 KB, `post` 20.6 KB, `react` 3.3 KB. 합계 약 89.6 KB. 홈 페이지는 JS 0.

## 구현 중 결정
| # | 결정 | 이유 |
|---|---|---|
| I1 | 수동으로 프로젝트를 만들었다(`create-astro` 미사용) | PLAN의 패키지 버전을 그대로 고정하려고. 첫 `npm install`에서 버전 충돌 없음 |
| I2 | `@types/katex`를 devDependency에 추가했다 | `Tex.tsx`가 `katex`를 import한다. PLAN 목록에 없었다 |
| I3 | 글 id는 폴더 이름이다. `content.config.ts`에 `generateId`로 `…/index.mdx`의 접미사를 뗀다 | `glob` 기본 id는 `llm/index`가 된다 |
| I4 | Zod는 `astro/zod`에서 import한다 | `astro/zod`가 Astro 7 패키지 export에 있어 그대로 썼다(`astro:content`의 `z`는 확인하지 않았다) |
| I5 | Page가 Section마다 id·번호를 context로 준다. 자동 id는 한글 slug(`전체-흐름-한눈에`)이고 겹치면 `-2`를 붙인다 | 원본이 id를 직접 주므로 영향 없음. 키트 규칙(heading slug)을 따랐다 |
| I6 | 레이아웃: `.cv-page`는 격자 영역 `toc/head/body`. 1040px 미만에서는 `head → toc → body` 순서의 1열이다 | DOM이 하나라 목차 중복이 없다. 모바일 목차는 제목·TL;DR 아래, 본문 위에 놓았다 |
| I7 | `Diagram`: 노드는 HTML, 선은 SVG다. `computeDAGLayout`은 층·순서·되돌림 판정에만 쓰고, 노드 실제 크기(글자 수 추정)로 다시 배치한다 | `computeDAGLayout`은 노드 크기를 하나로 가정한다. DOM 측정이 없어 SSR과 일치한다. 되돌림 선은 노드 오른쪽 옆 통로로 간다 |
| I8 | `Heatmap` 칸에는 숫자를 쓰지 않고 `title`로만 보여 준다. 색은 5단계 구간이다 | d.ts가 칸 안 숫자를 말하지 않는다. 연속 보간은 하지 않았다 |
| I9 | `Section.caption`은 제목 아래 부제로만 그린다 | 원본이 쓰지 않는다. "첫 그림 아래" 규칙은 구현하지 않았다 |
| I10 | `Segmented`는 Base UI `ToggleGroup`+`Toggle`을 쓴다. 선택값을 다시 눌러 비우는 입력은 무시한다 | PLAN 3절 |
| I11 | favicon(`public/favicon.svg`)을 넣었다 | 없으면 콘솔에 404가 떠 smoke의 "콘솔 오류 0"이 실패했다 |
| I12 | 어두움의 순차 색은 단계를 뒤집었다(1단계 어두운 파랑, 5단계 밝은 파랑) | tokens.d.ts 주석 "the ramp flips in dark". Heatmap에서 값이 클수록 밝다 |

## 구현하지 않은 것 (알려진 한계)
- 원본이 쓰지 않는 부품: Rows, Metrics, LineChart, Columns, Pie, Checklist, Quote, Divider, Select, Button, Input, Toggle, Avatar, ProsCons, Status, Image, LinkCards, 달력류, Scatter, Matrix2x2, Venn, Paren, Sum, BulletList, NumberedList(D8). 다음 글에서 필요할 때 추가한다.
- `Diagram`: `person` 종류, 반대 방향 두 선의 합치기, 조직도식 버스 연결선, "좁으면 가로↔세로 전환"은 없다. `direction="horizontal"`은 코드만 있고 화면으로 확인하지 않았다.
- 390px에서 Diagram은 키트 규칙대로 축소하지 않고 가로 스크롤한다. 되돌림 선 라벨("아니오: 글 끝에 붙이고 다시")이 처음 화면에서 오른쪽이 잘려 보이고, 스크롤하면 보인다.
- 색 hex는 여전히 임시값이다(D2, Q1). 원본 렌더 화면이 없어 "같은 디자인"을 픽셀로 비교하지 못했다.
- 어두움 모드는 스크린샷을 찍어 일부(히트맵·막대·수식·단계)만 눈으로 확인했다. 어두움에서 낮은 값(진한 파랑)과 값 0(회색) 칸의 대비가 약하다.
- 8단계 문구 불일치(Q2), 배포 대상(Q3), 공개 범위(Q4)는 그대로 열려 있다. 배포·push는 하지 않았다.
- `astro check`는 `scripts/`를 제외한다(tsconfig `exclude`).
