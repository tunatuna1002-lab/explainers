import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useGrokTheme } from "./theme";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedProps<T extends string = string> {
  options: readonly (T | SegmentedOption<T>)[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Base UI ToggleGroup. 값은 하나만 고르고, 눌린 것을 다시 눌러 비우는 것은 무시한다.
 * d.ts는 2~5개를 권하지만 원본이 8개를 쓰므로 넘치면 줄바꿈한다.
 */
export function Segmented<T extends string = string>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useGrokTheme();
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <ToggleGroup<T>
      className="cv-seg"
      value={[value]}
      onValueChange={(next) => {
        if (next.length > 0) onChange(next[0]);
      }}
      style={{ background: theme.fill.secondary, borderRadius: theme.radius.md }}
    >
      {items.map((o) => (
        <Toggle
          key={o.value}
          value={o.value}
          className="cv-seg-item"
          style={{
            borderRadius: theme.radius.sm,
            fontSize: theme.font.subtext.fontSize,
            lineHeight: theme.font.subtext.lineHeight,
            color: theme.text.primary,
          }}
        >
          {o.label}
          {o.count !== undefined ? (
            <span style={{ marginLeft: 6, color: theme.text.tertiary, fontVariantNumeric: "tabular-nums" }}>{o.count}</span>
          ) : null}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
