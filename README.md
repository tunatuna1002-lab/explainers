# explainers

> 새 글·디자인 작업 전에 [docs/DESIGN_FEEDBACK.md](docs/DESIGN_FEEDBACK.md)를 먼저 확인한다.

공부하며 질문한 내용을 그림과 예시로 풀어 쓴 설명글 사이트. Grok Bot이 만든 설명 Page(React/TSX, `grok/canvas` 키트)를 같은 디자인의 정적 사이트 글로 옮겨 싣는다.

- Astro 7 + MDX, React는 상호작용 부분만 island, Tailwind CSS 4, Base UI(`@base-ui/react`), KaTeX
- 완전 정적 출력(`dist/`), `lang="ko"`
- 배치는 qlabs 방식: 왼쪽 sticky 목차(좁은 화면에서는 본문 위), TL;DR 상자, 번호 붙은 절

## 명령

```sh
npm install
npm run dev        # 개발 서버
npm run build      # astro check + astro build → dist/
npm run preview    # dist/ 미리보기 (http://localhost:4321)
```

배포 대상은 아직 없다. 하위 경로나 도메인이 필요하면 환경 변수로 준다: `SITE_URL=https://example.com BASE_PATH=/explainers/ npm run build`.

## 글 추가 방법

Grok Page 원본 코드(`export default function App()` 하나짜리 TSX)를 받았다고 하자. slug를 `my-post`로 정한다.

1. `src/content/posts/my-post/post.tsx`에 원본을 붙여 넣는다. 고치는 곳은 import 줄 하나뿐이다.
   ```diff
   - } from "grok/canvas";
   + } from "@/components/canvas";
   ```
   내용·값·"예시" 문구는 바꾸지 않는다.
2. 같은 폴더에 `index.mdx`를 쓴다.
   ```mdx
   ---
   title: "…"      # Page title과 같게
   summary: "…"    # 한두 문장. 검색·미리보기 설명(meta description)에 쓰인다
   date: 2026-11-02
   category: basics # 홈 묶음: basics | vision | language | generative | context (없으면 "그 밖의 글")
   shortTitle: "Adam"        # 홈 목차에 보일 짧은 제목 (없으면 title)
   tagline: "파라미터마다 걸음 크기"  # 홈에서 "짧은 제목: 한마디"로 붙는다. 2~4단어로 짧게
   authors: "Kingma·Ba"      # 선택
   paperYear: 2014           # 선택. 홈 왼쪽 연도 칸, 묶음 안 정렬 기준
   kind: lab       # lab(실습) | qa(논문 Q&A) | concept(개념) | research(연구 소개)
   # order: 1      # 같은 연도끼리 순서 (작을수록 위)
   # draft: true   # 홈과 빌드에서 뺀다
   ---

   import Post from "./post.tsx";

   <Post client:load />
   ```
   상호작용(`useState` 등)이 없는 글은 `client:load`를 빼서 JS 없이 낸다.
3. `npm run build`를 돌린다. 키트에 없는 부품을 쓰면 `astro check`가 컴파일 오류로 알려 준다. 그 부품을 `src/components/canvas/`에 같은 이름·props로 추가한다. 아직 없는 부품: Rows, Metrics, LineChart, Columns, Pie, Checklist, Quote 등.
4. 홈(`/`)은 `draft`가 아닌 글을 `category`로 묶고, 묶음 안에서 `paperYear` → `order` → `date` 순으로 보여 준다. 홈 맨 위에는 최근 글 4편이 따로 나온다. 각 줄에는 "짧은 제목: 한마디"와 연도·저자·종류(실습이 아닐 때만)가 보인다. 글 주소는 `/posts/my-post/`다.

수식이 필요하면 `src/components/Tex.tsx`의 `<Tex display>…LaTeX…</Tex>`를 쓴다(KaTeX). 키트의 `Equation`·`Frac`·`Sqrt`·`Pow`는 CSS 조판이다.

## 구조

```
src/components/canvas/   키트와 같은 이름·props의 부품 (index.ts가 barrel)
  theme.ts               useGrokTheme(): var(--…) 문자열을 돌려준다
  dag.ts                 computeDAGLayout (순수 함수)
src/components/Tex.tsx   KaTeX 부품 (barrel 밖: 쓰는 글만 번들에 넣는다)
src/content/posts/<slug>/ index.mdx + post.tsx
src/styles/tokens.css    색·간격 등 디자인 토큰의 유일한 값 원본 (밝음/어두움)
src/layouts, src/pages   홈과 글 페이지
scripts/screenshot.mjs   전체 페이지 스크린샷 (설치된 Chrome 사용)
scripts/smoke.mjs        동작 검사 (콘솔 오류, 클릭, 목차, 모바일 넘침)
docs/                    계획과 결정 기록
```

색 hex 값은 원본 자료에 없어 임시값이다(`docs/DECISION_REVIEW.md` D2). 실제 값을 받으면 `tokens.css`만 고친다.

## 스크린샷과 동작 검사

미리보기를 띄운 뒤 실행한다. 설치된 Chrome을 쓰므로 브라우저를 따로 내려받지 않는다.

```sh
npm run preview &
node scripts/screenshot.mjs screenshots --all   # 1440·768·390px, 밝음·어두움
node scripts/smoke.mjs
```
