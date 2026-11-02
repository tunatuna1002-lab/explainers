import { useMemo, useSyncExternalStore } from "react";

/** 값은 모두 `var(--…)` 문자열이다. 실제 색은 src/styles/tokens.css 한 곳에 있다. */
export interface GrokTextStyle {
  readonly fontSize: string;
  readonly lineHeight: string;
  readonly letterSpacing: string;
  readonly fontVariationSettings?: string;
}

export interface GrokPalette {
  bg: { base: string; subtle: string; elevated: string };
  text: {
    primary: string; secondary: string; tertiary: string; onColor: string; onPrimary: string;
    accent: string; success: string; warning: string; danger: string;
    accentDeep: string; successDeep: string; warningDeep: string; dangerDeep: string;
  };
  fill: {
    primary: string; primaryHover: string; secondary: string; secondaryHover: string; hover: string; pressed: string;
    accent: string; controlChecked: string;
    accentSubtle: string; successSubtle: string; warningSubtle: string; dangerSubtle: string;
  };
  border: { subtle: string; weak: string; default: string; strong: string; focus: string };
}

export interface GrokDataViz {
  categorical: string[];
  other: string;
  negative: string;
  singleSeriesRest: string;
  areaAlpha: string;
  bandAlpha: string;
  blueTint: string;
  blue5: string;
  sequential: string[];
  diverging: string[];
}

export type GrokWeightScale = { regular: 400 | 425; medium: 500; semibold: 600 };

export interface GrokTheme extends GrokPalette {
  kind: "light" | "dark";
  font: {
    family: string;
    mono: string;
    heading1: GrokTextStyle;
    heading2: GrokTextStyle;
    heading3: GrokTextStyle;
    body1: GrokTextStyle;
    subtext: GrokTextStyle;
    table: GrokTextStyle;
    metric: GrokTextStyle;
    body2: GrokTextStyle;
    label: GrokTextStyle;
    caption: GrokTextStyle;
    code: GrokTextStyle;
  };
  weight: GrokWeightScale;
  radius: { sm: 4; md: 8; lg: 12; xl: 16; full: 9999 };
  motion: { hover: string; easing: string };
  dataviz: GrokDataViz;
  chart: [string, string, string, string];
}

const ts = (size: number, line: number): GrokTextStyle => ({
  fontSize: `${size}px`,
  lineHeight: `${line}px`,
  letterSpacing: "0",
});

const v = (name: string) => `var(--${name})`;

const base: Omit<GrokTheme, "kind"> = {
  bg: { base: v("bg-base"), subtle: v("bg-subtle"), elevated: v("bg-elevated") },
  text: {
    primary: v("text-primary"), secondary: v("text-secondary"), tertiary: v("text-tertiary"),
    onColor: v("text-on-color"), onPrimary: v("text-on-primary"),
    accent: v("text-accent"), success: v("text-success"), warning: v("text-warning"), danger: v("text-danger"),
    accentDeep: v("text-accent-deep"), successDeep: v("text-success-deep"),
    warningDeep: v("text-warning-deep"), dangerDeep: v("text-danger-deep"),
  },
  fill: {
    primary: v("fill-primary"), primaryHover: v("fill-primary-hover"),
    secondary: v("fill-secondary"), secondaryHover: v("fill-secondary-hover"),
    hover: v("fill-hover"), pressed: v("fill-pressed"),
    accent: v("fill-accent"), controlChecked: v("fill-control-checked"),
    accentSubtle: v("fill-accent-subtle"), successSubtle: v("fill-success-subtle"),
    warningSubtle: v("fill-warning-subtle"), dangerSubtle: v("fill-danger-subtle"),
  },
  border: {
    subtle: v("border-subtle"), weak: v("border-weak"), default: v("border-default"),
    strong: v("border-strong"), focus: v("border-focus"),
  },
  font: {
    family: v("font-sans"),
    mono: v("font-mono"),
    heading1: ts(30, 36),
    heading2: ts(24, 30),
    heading3: ts(20, 26),
    body1: ts(16, 24),
    subtext: ts(14, 20),
    table: ts(15, 22),
    metric: ts(24, 30),
    body2: ts(13, 18),
    label: ts(12, 16),
    caption: ts(11, 16),
    code: ts(13, 20),
  },
  weight: { regular: 400, medium: 500, semibold: 600 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  motion: { hover: v("motion-hover"), easing: v("motion-easing") },
  dataviz: {
    categorical: [v("dv-cat-0"), v("dv-cat-1"), v("dv-cat-2")],
    other: v("dv-other"),
    negative: v("dv-negative"),
    singleSeriesRest: v("dv-seq-1"),
    // 변수 문자열에는 `${색}${areaAlpha}`를 이어 붙일 수 없다. 투명도가 필요하면 blueTint나 color-mix를 쓴다.
    areaAlpha: v("dv-area-alpha"),
    bandAlpha: v("dv-band-alpha"),
    blueTint: v("dv-blue-tint"),
    blue5: v("dv-blue-5"),
    sequential: [v("dv-seq-1"), v("dv-seq-2"), v("dv-seq-3"), v("dv-seq-4"), v("dv-seq-5")],
    diverging: [v("dv-negative"), v("dv-other"), v("dv-cat-0")],
  },
  chart: [v("text-primary"), v("text-tertiary"), v("border-default"), v("fill-secondary")],
};

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getKind = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const getServerKind = () => "light" as const;

/** 서버는 `light`, hydration 뒤에 실제 값이다. 색 값은 CSS 변수라서 깜빡임이 없다. */
export function useGrokTheme(): GrokTheme {
  const kind = useSyncExternalStore(subscribe, getKind, getServerKind);
  return useMemo(() => ({ ...base, kind }), [kind]);
}

/** 서버·클라이언트 모두에서 쓰는 정적 테마(훅을 못 쓰는 곳용). */
export const staticTheme: GrokTheme = { ...base, kind: "light" };
