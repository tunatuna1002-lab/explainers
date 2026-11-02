import "./canvas.css";

export { Page, type PageProps, type PageWidth } from "./Page";
export { Section, type SectionProps } from "./Section";
export { TableOfContents, type TableOfContentsProps, type TableOfContentsItem } from "./TableOfContents";
export {
  Text, Callout, Steps, Table, Bars, Grid, Properties,
  type CalloutProps, type CalloutTone, type Tone, type Step, type TableProps, type TableCell,
  type Bar, type BarsProps, type PropertyItem,
} from "./blocks";
export { Heatmap, type HeatmapProps } from "./Heatmap";
export { Equation, Frac, Sqrt, Pow, type EquationProps } from "./Equation";
export { Segmented, type SegmentedProps, type SegmentedOption } from "./Segmented";
export { Diagram, type DiagramProps, type DiagramNode, type DiagramEdge, type DiagramNodeKind } from "./Diagram";
export { computeDAGLayout } from "./dag";
export type {
  DAGLayoutOptions, DAGLayoutNode, DAGLayoutEdge, DAGLayoutRank, DAGLayoutResult,
} from "./dag";
export { useGrokTheme } from "./theme";
export type { GrokTheme, GrokPalette, GrokDataViz, GrokTextStyle, GrokWeightScale } from "./theme";

// React 재수출(키트 reference.md와 같은 목록)
export { Fragment, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
export type {
  ChangeEvent, CSSProperties, FocusEvent, FormEvent, KeyboardEvent, MouseEvent, PointerEvent, ReactNode, RefObject, SyntheticEvent,
} from "react";
